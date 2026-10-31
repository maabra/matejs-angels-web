"""Render the static site. Python standard library only; no runtime framework."""
from pathlib import Path
import argparse
import hashlib
import html
import json
import posixpath
import re
import xml.etree.ElementTree as ET
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent.parent
CONTENT = ROOT / 'content'

def read_json(name):
    return json.loads((CONTENT / name).read_text('utf-8'))

def url_for(path):
    if path == 'index.html': return ''
    if path.endswith('/index.html'): return path[:-10]
    return path.removesuffix('.html')

def relative(current, target):
    raw = posixpath.relpath(url_for(target) or '.', posixpath.dirname(current) or '.')
    if target.endswith('/index.html') and not raw.endswith('/'): raw += '/'
    return raw

def render(template, values):
    return re.sub(r'\{\{([\w]+)\}\}', lambda m: str(values[m[1]]), template)

def build(check=False):
    strings, routes, media = read_json('strings.json'), read_json('routes.json'), read_json('media.json')
    paired_copy = read_json('page-copy.json')
    partials = {p.stem: p.read_text('utf-8') for p in (ROOT / 'templates').glob('*.html')}
    changed = []
    for page in routes:
        path, lang = page['path'], page['lang']
        c = strings[lang]
        other = 'hr' if lang == 'en' else 'en'
        home = 'index.html' if lang == 'hr' else 'en/index.html'
        prefix = 'hr/' if lang == 'hr' else 'en/'
        def link(target): return html.escape(relative(path, target), quote=True)
        nav = []
        for key in ['about', 'dogs', 'litters', 'gallery', 'news', 'care', 'contact']:
            target = prefix + c['routes'][key] + '.html'
            active = ' class="active" aria-current="page"' if path == target else ''
            nav.append(f'<li><a href="{link(target)}"{active}>{c[key]}</a></li>')
        values = {
            'home': link(home), 'logo': posixpath.relpath('images/index/logotransparent.png', posixpath.dirname(path) or '.'),
            'kennel': c['kennel'], 'nav_links': '\n'.join(nav), 'menu': c['menu'],
            'language_links': ''.join(f'<a href="{link(path if code == lang else page["pair"])}" lang="{code}" hreflang="{code}"' + (' class="active" aria-current="page"' if code == lang else '') + f'>{code.upper()}</a>' for code in ['en','hr']),
            'pages': c['pages'], 'more': c['more'], 'contact': c['contact'], 'footer_intro': c['footer_intro'],
            'footer_pages': ''.join(f'<li><a href="{link(prefix+c["routes"][key]+".html")}">{c[key]}</a></li>' for key in ['about','dogs','litters','gallery']),
            'footer_more': ''.join(f'<li><a href="{link(prefix+c["routes"][key]+".html")}">{c[key]}</a></li>' for key in ['news','history','care','faq']) + f'<li><a href="{link(page["pair"])}" lang="{other}">{strings[other]["language"]}</a></li>',
            'privacy': c['privacy'], 'privacy_url': link(prefix+c['routes']['privacy']+'.html'),
            'copyright': c['copyright'], 'made': c['made'], 'counter': c['counter'], 'country': c['country'],
        }
        source = (ROOT / 'templates/pages' / path).read_text('utf-8')
        if page.get('copy_key'):
            source = source.replace('{{page_hero}}',paired_copy[page['copy_key']][lang]['hero'])
        if '{{litter_albums}}' in source:
            albums=[]
            for album in read_json('litter-albums.json'):
                copy=album['copy'][lang]
                album_values={
                    'album_url':relative(path,prefix+('litter-' if lang=='en' else 'leglo-')+album['letter'].lower()+'.html'),
                    'album_photo':posixpath.relpath(album['cover'],posixpath.dirname(path)),
                    'album_alt':copy['alt'], 'album_title':('Litter ' if lang=='en' else 'Leglo ')+album['letter'],
                    'album_breed':copy['breed'],'album_date':copy['date'],'album_count':copy['count'],
                    'album_names':album['names'],'album_action':c['album_action'],
                }
                albums.append(render(partials['litter-album'],{k:html.escape(v,quote=True) for k,v in album_values.items()}))
            source=source.replace('{{litter_albums}}','\n'.join(albums))
        source = source.replace('{{header}}', render(partials['header'], values)).replace('{{footer}}', render(partials['footer'], values))
        copy_values = {key: html.escape(value) for key,value in c.get('home_copy',{}).items()}
        # Dog cards use the recorded profile dates, rather than separate copies.
        for slug in re.findall(r'\{\{birthdate_(\w+)\}\}', source):
            folder = 'dogs' if lang == 'en' else 'psi'
            profile = (ROOT / 'templates/pages' / lang / folder / (slug + '.html')).read_text('utf-8')
            rows = re.findall(r'<span class="stat-key">(.*?)</span>\s*<span class="stat-val">(.*?)</span>', profile, re.S)
            date = next(value for key,value in rows if 'birth' in key.lower() or key.startswith('Datum'))
            copy_values['birthdate_' + slug] = html.escape(html.unescape(date))
        source = render(source, copy_values)
        # Keep messaging and social links consistent in every generated page.
        def social_link(match):
            attrs,body = match[1],match[2]
            href = re.search(r'\bhref="([^"]+)"', attrs)
            if not href: return match[0]
            brand = 'facebook' if 'facebook.com/' in href[1] else 'whatsapp' if href[1].startswith('https://wa.me/') else None
            if not brand: return match[0]
            class_name = brand + '-link'
            if 'class="' in attrs:
                attrs = re.sub(r'class="([^"]*)"',lambda m:'class="'+m[1]+' '+class_name+'"',attrs,count=1)
            else: attrs += ' class="'+class_name+'"'
            return '<a'+attrs+'><span class="'+brand+'-icon" aria-hidden="true"></span>'+body+'</a>'
        source = re.sub(r'<a(\s[^>]*?)>(.*?)</a>',social_link,source,flags=re.S)
        # Keep canonical and language alternates paired with the actual generated route.
        canonical = 'https://matejsangels.com/' + url_for(page.get('canonical_path',path))
        pair_url = 'https://matejsangels.com/' + url_for(page['pair'])
        source = re.sub(r'(<link rel="canonical" href=")[^"]+', lambda m:m[1]+canonical, source)
        for code, url in [(lang,canonical),(other,pair_url),('x-default',canonical if lang=='en' else pair_url)]:
            pattern=r'(<link rel="alternate" hreflang="'+code+r'" href=")[^"]+'
            if re.search(pattern,source):source=re.sub(pattern,lambda m:m[1]+url,source)
            else:source=source.replace('</head>',f'<link rel="alternate" hreflang="{code}" href="{url}">\n</head>')
        source = re.sub(r'(<meta property="og:url" content=")[^"]+',lambda m:m[1]+canonical,source)
        def schema(m):
            data = json.loads(m[2])
            page_title=re.search(r'<title>(.*?)</title>',source,re.S)
            for node in data.get('@graph',[]):
                if node.get('@type') == 'WebPage':
                    node.update({'@id':canonical+'#webpage','url':canonical})
                    if page_title:node['name']=html.unescape(page_title[1])
            return m[1]+json.dumps(data,ensure_ascii=False)+m[3]
        source = re.sub(r'(<script type="application/ld\+json" id="site-seo">)(.*?)(</script>)',schema,source,flags=re.S)
        def image_tag(m):
            tag = m[0]
            src = re.search(r'\bsrc="([^"]+)"',tag)
            if not src: return tag
            image_path = posixpath.normpath(posixpath.join(posixpath.dirname(path),unquote(urlsplit(src[1]).path)))
            info = media.get(image_path)
            if not info: return tag
            tag = re.sub(r'\s(?:width|height|decoding)="[^"]*"','',tag)
            tag = tag[:-1]+f' width="{info["width"]}" height="{info["height"]}" decoding="async">'
            if 'dog-img-frame' in source[max(0,m.start()-120):m.start()]:
                tag=re.sub(r'\sloading="[^"]*"','',tag)
                tag=tag[:-1]+' loading="eager" fetchpriority="high">'
            if 'loading=' not in tag and 'hero-logo' not in tag and 'home-photo' not in tag and 'nav-logo' not in tag and 'logotransparent' not in tag:
                tag = tag[:-1]+' loading="lazy">'
            if info.get('variants') and 'srcset=' not in tag:
                variants = ', '.join(posixpath.relpath(v['path'],posixpath.dirname(path) or '.')+f' {v["width"]}w' for v in info['variants'])
                sizes='(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 800px'
                if 'litter-album-photo' in source[max(0,m.start()-100):m.start()]:sizes='(max-width: 560px) 100vw, (max-width: 1100px) 50vw, 300px'
                tag = tag[:-1]+f' srcset="{variants}" sizes="{sizes}">'
            return tag
        source = re.sub(r'<img\b[^>]*>', image_tag, source)
        title=re.search(r'<title>(.*?)</title>',source,re.S)
        if title:
            for attribute in ['property="og:title"','name="twitter:title"']:
                source=re.sub(r'(<meta '+attribute+r' content=")[^"]*',lambda m:m[1]+html.escape(html.unescape(title[1]),quote=True),source)
        if 'css/editorial.css' not in source:
            asset = posixpath.relpath('css/editorial.css',posixpath.dirname(path) or '.')
            source = source.replace('</head>',f'<link rel="stylesheet" href="{asset}?v=initial">\n</head>')
        for asset in ['css/style.css','css/editorial.css','js/main.js','js/refinements.js']:
            version = hashlib.sha256((ROOT/asset).read_bytes()).hexdigest()[:12]
            source = re.sub(r'('+re.escape(asset)+r'\?v=)[a-z0-9]+',lambda m:m[1]+version,source)
        if 'js/refinements.js' not in source:
            asset = posixpath.relpath('js/refinements.js',posixpath.dirname(path) or '.')
            version = hashlib.sha256((ROOT/'js/refinements.js').read_bytes()).hexdigest()[:12]
            source = source.replace('</body>',f'<script src="{asset}?v={version}" defer></script>\n</body>')
        source=re.sub(r'(?m)^[ \t]+$','',source)
        dest = ROOT / path
        if not dest.exists() or dest.read_text('utf-8') != source:
            changed.append(path)
            if not check: dest.write_text(source,'utf-8',newline='\n')
    # Sitemap entries follow the same canonical route definitions as the pages.
    namespace='http://www.sitemaps.org/schemas/sitemap/0.9'
    ET.register_namespace('',namespace)
    sitemap=ET.Element('{'+namespace+'}urlset')
    for page in sorted(routes,key=lambda r:url_for(r['path'])):
        if page.get('canonical_path',page['path'])!=page['path']:continue
        text=(ROOT/'templates/pages'/page['path']).read_text('utf-8')
        if re.search(r'<meta name="robots" content="[^"]*noindex',text):continue
        entry=ET.SubElement(sitemap,'{'+namespace+'}url')
        ET.SubElement(entry,'{'+namespace+'}loc').text='https://matejsangels.com/'+url_for(page['path'])
    ET.indent(sitemap,space='  ')
    sitemap_text=ET.tostring(sitemap,encoding='unicode',xml_declaration=True)+'\n'
    sitemap_path=ROOT/'sitemap.xml'
    if not sitemap_path.exists() or sitemap_path.read_text('utf-8')!=sitemap_text:
        changed.append('sitemap.xml')
        if not check:sitemap_path.write_text(sitemap_text,'utf-8',newline='\n')
    if check and changed: raise SystemExit('Generated pages out of date: '+', '.join(changed))
    print(f'{len(routes)} pages checked; {len(changed)} '+('need rebuilding.' if check else 'rendered.'))

if __name__ == '__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');build(parser.parse_args().check)
