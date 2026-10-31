"""Static release checks: links, anchors, assets, IDs, translations and generated source."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit,unquote
import json,re,subprocess,sys
ROOT=Path(__file__).resolve().parent.parent

class Scan(HTMLParser):
    def __init__(self):super().__init__();self.ids=[];self.refs=[];self.images=[];self.navs=0;self.footers=0
    def handle_starttag(self,tag,attributes):
        a=dict(attributes)
        if a.get('id'):self.ids.append(a['id'])
        if tag=='nav' and a.get('id')=='navbar':self.navs+=1
        if tag=='footer':self.footers+=1
        for key in ['src','href']:
            if a.get(key):self.refs.append((tag,a[key]))
        if tag=='img':self.images.append(a)
        if a.get('srcset'):
            self.refs.extend(('img',v.strip().split()[0]) for v in a['srcset'].split(','))

def resolve(page,ref):
    url=urlsplit(ref)
    if url.scheme or url.netloc:return None
    path=page if not url.path else (ROOT/unquote(url.path).lstrip('/') if url.path.startswith('/') else page.parent/unquote(url.path))
    if path.is_dir():path=path/'index.html'
    if not path.exists() and Path(str(path)+'.html').exists():path=Path(str(path)+'.html')
    return path.resolve(),unquote(url.fragment)

def main():
    subprocess.run([sys.executable,str(ROOT/'tools/build_site.py'),'--check'],check=True,cwd=ROOT)
    routes=json.loads((ROOT/'content/routes.json').read_text('utf-8'));pages={}
    strings=json.loads((ROOT/'content/strings.json').read_text('utf-8'))
    assert strings['en'].keys()==strings['hr'].keys(),'Missing common translation'
    assert strings['en']['home_copy'].keys()==strings['hr']['home_copy'].keys(),'Missing homepage translation'
    for key,copy in json.loads((ROOT/'content/page-copy.json').read_text('utf-8')).items():
        assert set(copy)=={'en','hr'},('missing paired hero translation',key)
    for route in routes:
        path=ROOT/route['path'];scan=Scan();source=path.read_text('utf-8');scan.feed(source);pages[path.resolve()]=scan
        assert len(scan.ids)==len(set(scan.ids)),('duplicate IDs',path)
        assert scan.navs==1 and scan.footers==1,('shared shell',path)
        assert '{{' not in source,('unrendered template',path)
        assert route['pair'] in [r['path'] for r in routes],('missing language pair',path)
        reverse=next(r for r in routes if r['path']==route['pair'])
        assert reverse['pair']==route['path'] or route['path']=='hr/blog.html',('nonreciprocal language pair',route)
        for img in scan.images:
            assert 'alt' in img,('image alt',path,img.get('src'))
            if img.get('src'):assert img.get('width') and img.get('height'),('image dimensions',path,img.get('src'))
        text=re.sub(r'<(?:script|style)\b.*?</(?:script|style)>','',source,flags=re.S)
        text=re.sub(r'<[^>]+>',' ',text)
        assert not re.search(r'\w\?\w',text),('broken text encoding',path)
    for path,scan in pages.items():
        for tag,ref in scan.refs:
            result=resolve(path,ref)
            if not result:continue
            dest,fragment=result
            assert dest.is_file(),('missing local target',path,ref)
            if fragment and dest in pages:assert fragment in pages[dest].ids,('missing anchor',path,ref)
    print(f'Validated {len(pages)} pages: links, anchors, media, IDs, shells and paired translations.')
if __name__=='__main__':main()
