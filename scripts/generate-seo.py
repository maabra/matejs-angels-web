"""Regenerate production metadata, excluding deployment copies."""
from pathlib import Path
import re, html, json, shutil
import xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent
BASE='https://matejsangels.com'
pages=[ROOT/'index.html',*sorted((ROOT/'en').rglob('*.html')),*sorted((ROOT/'hr').rglob('*.html'))]
def url(p):
 r=p.relative_to(ROOT).as_posix()
 if r in ('index.html','hr/o-nama.html'): return BASE+'/'
 if r=='hr/blog.html': return BASE+'/hr/vijesti'
 return BASE+'/'+r.removesuffix('.html')
def esc(s): return html.escape(s,quote=True)
def plain(s): return html.unescape(re.sub('<[^>]*>','',s)).strip()
for p in pages:
 raw=p.read_bytes(); s=raw.decode('utf-8'); rel=p.relative_to(ROOT).as_posix(); en=rel.startswith('en/'); lang='en' if en else 'hr'
 title=plain(re.search(r'<title>(.*?)</title>',s,re.S)[1])
 descriptions=re.findall(r'<meta\s+name="description"\s+content="([^"]*)"[^>]*>',s)
 desc=plain(descriptions[0]) if descriptions else title
 if rel in ('index.html','hr/o-nama.html'):
  title='Uzgoj kavalira i pomeranaca | Matej’s Angels, Hrvatska'
  desc='Obiteljska uzgajivačnica Cavalier King Charles španijela i pomeranaca u Premanturi. Upoznajte naše pse, legla, zdravstvene testove i savjete za njegu.'
 elif rel=='en/about.html':
  title='Cavalier & Pomeranian Breeder in Croatia | Matej’s Angels'
  desc='Meet Matej’s Angels, a family Cavalier King Charles Spaniel and Pomeranian kennel in Premantura, Croatia. Explore our dogs, litters and breeding philosophy.'
 elif '/dogs/' in rel or '/psi/' in rel:
  name=title.split(' - ')[0]
  desc=(f'Meet {name} at Matej’s Angels kennel in Premantura, Croatia. View pedigree, health information, photos and show results.' if en else f'Upoznajte psa {name} iz uzgajivačnice Matej’s Angels u Premanturi. Pogledajte rodovnik, zdravstvene podatke, fotografije i izložbene rezultate.')
 elif len(descriptions)>1:
  label=title.split(' - ')[0]
  desc=(f'{label} at Matej’s Angels in Premantura, Croatia. Explore our Cavalier King Charles Spaniels, Pomeranians and kennel updates.' if en else f'{label} uzgajivačnice Matej’s Angels u Premanturi. Saznajte više o našim kavalirima, pomerancima i životu uzgajivačnice.')
 alts=dict(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"[^>]*>',s))
 alts={k:v.replace(BASE+'/hr/o-nama',BASE+'/') for k,v in alts.items() if k in ('en','hr')}
 if rel in ('index.html','hr/o-nama.html','en/about.html'): alts={'en':BASE+'/en/about','hr':BASE+'/'}
 if rel=='hr/blog.html': alts={'en':BASE+'/en/news','hr':BASE+'/hr/vijesti'}
 if alts: alts['x-default']=alts.get('en',url(p))
 s=re.sub(r'<title>.*?</title>','',s,flags=re.S)
 s=re.sub(r'<link\s+rel="(?:canonical|alternate)"[^>]*>\s*','',s)
 s=re.sub(r'<meta\s+(?:name="(?:description|robots|twitter:[^"]+)"|property="og:[^"]+")[^>]*>\s*','',s)
 s=re.sub(r'<script type="application/ld\+json" id="site-seo">.*?</script>\s*','',s,flags=re.S)
 image=BASE+'/images/index/logotransparent.png'
 tags=[f'<title>{esc(title)}</title>',f'<meta name="description" content="{esc(desc)}">',f'<link rel="canonical" href="{url(p)}">']
 tags += [f'<link rel="alternate" hreflang="{k}" href="{v}">' for k,v in alts.items()]
 tags += ['<meta name="robots" content="index, follow, max-image-preview:large">']
 social={'og:type':'website','og:site_name':'Matej’s Angels','og:title':title,'og:description':desc,'og:url':url(p),'og:image':image,'og:image:alt':'Matej’s Angels kennel logo','og:locale':'en_GB' if en else 'hr_HR'}
 tags += [f'<meta property="{k}" content="{esc(v)}">' for k,v in social.items()]
 tags += [f'<meta name="twitter:{k}" content="{esc(v)}">' for k,v in {'card':'summary','title':title,'description':desc,'image':image}.items()]
 graph=[{'@type':'Organization','@id':BASE+'/#organization','name':'Matej’s Angels','url':BASE+'/','logo':image,'email':'sanjaimatej@gmail.com','telephone':'+385955152150','address':{'@type':'PostalAddress','streetAddress':'Selo Varoš 70 D','addressLocality':'Premantura','postalCode':'52100','addressCountry':'HR'},'sameAs':['https://www.facebook.com/matejsangels/']},{'@type':'WebSite','@id':BASE+'/#website','url':BASE+'/','name':'Matej’s Angels','inLanguage':['en','hr'],'publisher':{'@id':BASE+'/#organization'}},{'@type':'WebPage','@id':url(p)+'#webpage','url':url(p),'name':title,'description':desc,'inLanguage':lang,'isPartOf':{'@id':BASE+'/#website'}}]
 tags += ['<script type="application/ld+json" id="site-seo">'+json.dumps({'@context':'https://schema.org','@graph':graph},ensure_ascii=False).replace('<','\\u003c')+'</script>']
 s=s.replace('</head>','  '+'\n  '.join(tags)+'\n</head>')
 if b'\r\n' in raw: s=s.replace('\r\n','\n').replace('\n','\r\n')
 p.write_bytes(s.encode('utf-8'))
ns='http://www.sitemaps.org/schemas/sitemap/0.9'; ET.register_namespace('',ns)
tree=ET.Element('{'+ns+'}urlset')
for address in sorted({url(p) for p in pages}):
 entry=ET.SubElement(tree,'{'+ns+'}url'); ET.SubElement(entry,'{'+ns+'}loc').text=address
ET.indent(tree); ET.ElementTree(tree).write(ROOT/'sitemap.xml',encoding='utf-8',xml_declaration=True)
(ROOT/'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n',encoding='utf-8')
for p in [*pages,ROOT/'robots.txt',ROOT/'sitemap.xml']:
 target=ROOT/'hosting-ready'/p.relative_to(ROOT)
 if target.parent.exists(): shutil.copyfile(p,target)
print(f'Generated SEO for {len(pages)} pages and {len(tree)} canonical sitemap URLs.')
