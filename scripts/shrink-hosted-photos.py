"""Shrink hosted photos in place. Requires Pillow; originals remain in Git history.

Photographic PNGs become WebP; their HTML/CSS/JS references are updated.
Only replace files when the encoded result is smaller. Small assets and logos
are left alone. Run from any directory with: python scripts/shrink-hosted-photos.py
"""
from io import BytesIO
from pathlib import Path
from urllib.parse import quote
import argparse

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
IMAGES = ROOT / "images"


def main():
    before = sum(p.stat().st_size for p in IMAGES.rglob("*") if p.is_file())
    replacements = {}
    changed = 0
    for path in sorted(IMAGES.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
            continue
        if "optimized" in path.parts or path.parent == IMAGES / "index" or path.stat().st_size < 250_000:
            continue
        with Image.open(path) as source:
            photo = ImageOps.exif_transpose(source)
            photo.thumbnail((2048, 2048), Image.Resampling.LANCZOS)
            options = {}
            if source.info.get("icc_profile"):
                options["icc_profile"] = source.info["icc_profile"]
            output = BytesIO()
            if path.suffix.lower() in (".png", ".webp"):
                destination = path.with_suffix(".webp")
                if destination != path and destination.exists():
                    raise RuntimeError(f"Destination already exists: {destination}")
                photo.save(output, format="WEBP", quality=90, method=6, **options)
            else:
                destination = path
                photo.convert("RGB").save(output, format="JPEG", quality=90, optimize=True, progressive=True, **options)
            data = output.getvalue()
        if len(data) >= path.stat().st_size:
            continue
        destination.write_bytes(data)
        if destination != path:
            old = path.relative_to(ROOT).as_posix()
            new = destination.relative_to(ROOT).as_posix()
            replacements[old] = new
            replacements[quote(old, safe="/")] = quote(new, safe="/")
            path.unlink()
        changed += 1

    for path in ROOT.rglob("*"):
        if path.suffix.lower() not in (".html", ".css", ".js") or ".git" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        updated = text
        for old, new in replacements.items():
            updated = updated.replace(old, new)
        if updated != text:
            with path.open("w", encoding="utf-8", newline="") as output:
                output.write(updated)
    after = sum(p.stat().st_size for p in IMAGES.rglob("*") if p.is_file())
    print(f"Changed {changed} photos. Images: {before / 1048576:.2f} -> {after / 1048576:.2f} MiB ({100 * (1-after/before):.1f}% smaller).")


def thumbnails():
    for directory in (IMAGES / "litters", IMAGES / "gallery"):
        for path in sorted(directory.rglob("*")):
            if path.suffix.lower() not in (".jpg", ".jpeg", ".png", ".webp"):
                continue
            with Image.open(path) as source:
                photo = ImageOps.exif_transpose(source).convert("RGB")
                for width in (480, 960):
                    height = max(1, round(photo.height * width / photo.width))
                    destination = IMAGES / "optimized" / path.relative_to(IMAGES).parent / f"{path.stem}-{width}.jpg"
                    destination.parent.mkdir(parents=True, exist_ok=True)
                    photo.resize((width, height), Image.Resampling.LANCZOS).save(destination, quality=82, optimize=True, progressive=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--thumbnails-only", action="store_true")
    args = parser.parse_args()
    thumbnails() if args.thumbnails_only else main()
