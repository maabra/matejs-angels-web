"""Set canonical URLs, language alternatives, sitemap and robots for hosting.

Usage: python scripts/set-site-url.py https://www.your-domain.com
"""
import sys
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent
OLD = "https://maabra.github.io/matejs-angels-example"

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    base = sys.argv[1].rstrip("/")
    parsed = urlsplit(base)
    if parsed.scheme != "https" or not parsed.netloc or parsed.path or parsed.query or parsed.fragment:
        raise SystemExit("Supply the HTTPS domain only; deploy the site at the domain root.")
    count = 0
    for path in [*ROOT.rglob("*.html"), ROOT / "sitemap.xml", ROOT / "robots.txt"]:
        original = path.read_text(encoding="utf-8")
        updated = original.replace(OLD, base)
        if updated != original:
            with path.open("w", encoding="utf-8", newline="") as output:
                output.write(updated)
            count += 1
    print(f"Updated {count} files for {base}.")
