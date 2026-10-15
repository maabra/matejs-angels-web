"""Upload hosting-ready over verified FTPS; credentials are passed in memory."""
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
import ftplib
import ssl
import time
from io import BytesIO

ROOT = Path(__file__).resolve().parent.parent / "hosting-ready"


def deploy(host, username, password):
    def connect():
        ftp = ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=60)
        ftp.connect(host, 21)
        ftp.login(username, password)
        ftp.prot_p()
        return ftp

    ftp = connect()
    existing = BytesIO()
    try:
        ftp.retrbinary("RETR /public_html/.htaccess", existing.write)
    except ftplib.error_perm as error:
        if not str(error).startswith("550"):
            raise
    if existing.getvalue():
        backup = "/hosting-backup-" + datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
        ftp.mkd(backup)
        ftp.storbinary("STOR " + backup + "/.htaccess", BytesIO(existing.getvalue()))
        print("Existing hosting configuration backed up outside public_html.", flush=True)

    files = sorted(p for p in ROOT.rglob("*") if p.is_file() and p.name != ".htaccess")
    parents = {parent.relative_to(ROOT).as_posix() for p in files for parent in p.parents if parent == ROOT or ROOT in parent.parents}
    directories = sorted(parents, key=lambda s: (s.count("/"), s))
    for directory in directories:
        if directory == ".":
            continue
        current = "/public_html/" + directory
        try:
            ftp.mkd(current)
        except ftplib.error_perm:
            ftp.cwd(current)  # Fail if this is not an accessible directory.
    ftp.quit()

    def upload_batch(batch):
        connection = connect()
        try:
            for path in batch:
                remote = "/public_html/" + path.relative_to(ROOT).as_posix()
                for attempt in range(3):
                    try:
                        with path.open("rb") as source:
                            connection.storbinary("STOR " + remote + ".upload", source, blocksize=262144)
                        connection.voidcmd("TYPE I")
                        if connection.size(remote + ".upload") != path.stat().st_size:
                            raise RuntimeError("Upload size mismatch: " + remote)
                        connection.rename(remote + ".upload", remote)
                        break
                    except (OSError, EOFError, ftplib.Error):
                        if attempt == 2:
                            raise
                        connection.close()
                        time.sleep(1)
                        connection = connect()
            return len(batch)
        finally:
            connection.close()

    # Keep only four data connections open at once.
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(upload_batch, files[i:i+40]) for i in range(0, len(files), 40)]
        done = 0
        for result in as_completed(futures):
            done += result.result()
            print(f"Uploaded and size-verified {done}/{len(files)} files", flush=True)

    # Retain cPanel directives and activate clean URLs after all pages arrive.
    rules = (ROOT / ".htaccess").read_bytes()
    original = existing.getvalue().split(b"# BEGIN Matejs Angels clean URLs")[0].rstrip()
    combined = original + b"\n\n# BEGIN Matejs Angels clean URLs\n" + rules + b"\n# END Matejs Angels clean URLs\n"
    ftp = connect()
    try:
        ftp.storbinary("STOR /public_html/.htaccess.upload", BytesIO(combined))
        ftp.voidcmd("TYPE I")
        assert ftp.size("/public_html/.htaccess.upload") == len(combined)
        ftp.rename("/public_html/.htaccess.upload", "/public_html/.htaccess")
    finally:
        ftp.close()
    print("Deployment complete, including clean URL rules and preserved cPanel settings.", flush=True)
