"""Record intrinsic sizes and prepare local responsive WebP images. Run when adding photos."""
from pathlib import Path
from urllib.parse import unquote,urlsplit
from PIL import Image,ImageOps
import hashlib,json,posixpath,re

ROOT=Path(__file__).resolve().parent.parent
def main():
    manifest={};original_bytes=0;responsive_bytes=0;count=0
    output=ROOT/'images/responsive';output.mkdir(exist_ok=True)
    routes={r['path']:r for r in json.loads((ROOT/'content/routes.json').read_text('utf-8'))}
    copy_file=ROOT/'content/page-copy.json'
    copy=json.loads(copy_file.read_text('utf-8')) if copy_file.exists() else {}
    for page in (ROOT/'templates/pages').rglob('*.html'):
        page_path=page.relative_to(ROOT/'templates/pages').as_posix()
        source=re.sub(r'<!--.*?-->','',page.read_text('utf-8'),flags=re.S)
        route=routes.get(page_path,{})
        if route.get('copy_key'):
            source=source.replace('{{page_hero}}',copy[route['copy_key']][route['lang']]['hero'])
        for src in re.findall(r'<img\b[^>]*\bsrc="([^"]+)"',source):
            url=urlsplit(src)
            if url.scheme or url.netloc:continue
            key=posixpath.normpath(posixpath.join(posixpath.dirname(page_path),unquote(url.path)))
            if key in manifest:continue
            file=ROOT/key
            if not file.is_file():raise ValueError((page_path,key))
            try:
                with Image.open(file) as raw:
                    im=ImageOps.exif_transpose(raw)
                    width,height=im.size
                    item=dict(width=width,height=height)
                    # Logos and transparent cutouts retain their original pixel data.
                    if file.stat().st_size>180_000 and 'optimized' not in key and im.mode not in ['RGBA','LA','P']:
                        digest=hashlib.sha256(file.read_bytes()).hexdigest()[:16]
                        variants=[]
                        for size in [480,960,1440]:
                            if size>width:continue
                            target=output/f'{digest}-{size}.webp'
                            if not target.exists():im.convert('RGB').resize((size,round(height*size/width)),Image.Resampling.LANCZOS).save(target,'WEBP',quality=82,method=5)
                            variants.append(dict(path=target.relative_to(ROOT).as_posix(),width=size))
                        if variants:
                            item['variants']=variants;count+=1;original_bytes+=file.stat().st_size;responsive_bytes+=(ROOT/variants[-1]['path']).stat().st_size
                    manifest[key]=item
            except Image.UnidentifiedImageError:
                if file.suffix!='.svg':raise
    (ROOT/'content/media.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n','utf-8')
    print(f'{len(manifest)} image sizes recorded; {count} photos have responsive variants. Largest variants: {responsive_bytes/1e6:.1f}MB versus {original_bytes/1e6:.1f}MB originals.')
if __name__=='__main__':main()
