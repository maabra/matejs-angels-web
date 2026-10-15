# Pillow supports the JPEG, PNG and WebP sources used by the site.
# Install once if needed: python -m pip install Pillow
$ErrorActionPreference = 'Stop'
python (Join-Path $PSScriptRoot 'shrink-hosted-photos.py') --thumbnails-only
if ($LASTEXITCODE -ne 0) { throw 'Gallery image optimization failed.' }
