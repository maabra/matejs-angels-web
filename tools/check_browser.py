"""Local browser regression suite. Baselines are explicitly reviewed per host platform."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from urllib.parse import urlsplit,unquote
import argparse,json,platform,re
from playwright.sync_api import sync_playwright,expect
from PIL import Image,ImageChops

ROOT=Path(__file__).resolve().parent.parent
class Handler(SimpleHTTPRequestHandler):
    mount_prefix=''
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def translate_path(self,path):
        if self.mount_prefix and path.startswith(self.mount_prefix):path=path[len(self.mount_prefix):] or '/'
        p=super().translate_path(path)
        return p+'.html' if not Path(p).exists() and Path(p+'.html').is_file() else p
    def log_message(self,*args):pass
    def handle(self):
        try:super().handle()
        except (ConnectionAbortedError,ConnectionResetError,BrokenPipeError):pass

def run(update=False,screenshots_only=False,visual_only=False,mount=''):
    Handler.mount_prefix=mount.rstrip('/')
    server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
    base=f'http://127.0.0.1:{server.server_port}'+Handler.mount_prefix;artifacts=ROOT/'tests/artifacts';artifacts.mkdir(parents=True,exist_ok=True)
    baselines=ROOT/'tests/visual'/platform.system().lower();baselines.mkdir(parents=True,exist_ok=True)
    routes=json.loads((ROOT/'content/routes.json').read_text('utf-8'))
    shots={'index.html':'home','en/about.html':'about','en/our-dogs.html':'dogs','en/dogs/archie.html':'profile','en/news.html':'news','en/contact.html':'contact','en/chronology.html':'history','en/litter-h.html':'litter','en/gallery.html':'gallery','en/litters.html':'litters'}
    if visual_only:routes=[r for r in routes if r['path'] in shots]
    missing=[];errors=[];count=0
    try:
        with sync_playwright() as pw:
            browser=pw.chromium.launch();page=browser.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            page.route('**/*',lambda r:r.continue_() if urlsplit(r.request.url).netloc==urlsplit(base).netloc else r.abort())
            page.add_init_script("localStorage.setItem('matejs-angels-privacy-consent-v2',JSON.stringify({analytics:false,media:false,expiresAt:Date.now()+86400000}))")
            for width in [390,1440]:
                page.set_viewport_size(dict(width=width,height=900))
                for route in routes:
                    page.goto(base+'/'+route['path'],wait_until='load')
                    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),(width,route['path'],'overflow')
                    assert page.locator('#navbar').count()==1 and page.locator('footer').count()==1
                    # The alternate language must point to its exact partner, not a generic home page.
                    alternate=page.locator('.lang-switch a:not(.active)')
                    expect(alternate).to_have_attribute('lang','hr' if route['lang']=='en' else 'en')
                    count+=1
                    if route['path'] in shots:
                        page.add_style_tag(content='*,*::before,*::after{animation:none!important;transition:none!important}[data-anim]{opacity:1!important;transform:none!important}.bg-kennel-pattern{background-position:0 0!important}')
                        page.locator('img[loading="lazy"]').evaluate_all("els=>els.forEach(e=>e.loading='eager')")
                        page.evaluate("Promise.all([...document.images].map(i=>i.decode().catch(()=>{})))")
                        name=f'{shots[route["path"]]}-{width}.png';out=artifacts/name;baseline=baselines/name
                        page.screenshot(path=str(out),full_page=True)
                        if update:baseline.write_bytes(out.read_bytes())
                        elif not screenshots_only:
                            if not baseline.exists():missing.append(str(baseline));continue
                            with Image.open(out) as current,Image.open(baseline) as before:
                                assert current.size==before.size,('screenshot size changed',name)
                                diff=ImageChops.difference(current.convert('RGB'),before.convert('RGB'))
                                # Tiny antialiasing differences are allowed; meaningful changes need review.
                                pixels=sum(1 for r,g,b in diff.getdata() if max(r,g,b)>24)
                                if pixels/(current.width*current.height)>.005:
                                    diff.save(artifacts/('diff-'+name));raise AssertionError(('visual change requires review',name))
            page.goto(base+'/en/dogs/archie',wait_until='load')
            tab=page.locator('.tab-btn').first;tab.focus();page.keyboard.press('ArrowRight');expect(page.locator('.tab-btn').nth(1)).to_have_attribute('aria-selected','true')
            page.goto(base+'/en/contact',wait_until='load');form=page.locator('#email-composer');form.locator('button[type=submit]').click();assert form.locator('[name=name]').evaluate('e=>!e.validity.valid')
            for field,value in dict(name='Browser check',email='check@example.test',subject='Test draft',message='A locally prepared test draft.').items():form.locator('[name='+field+']').fill(value)
            page.evaluate("() => { navigator.clipboard.writeText=()=>Promise.reject(new Error('Clipboard unavailable')); }")
            form.locator('[data-copy-draft]').click();expect(form.locator('[role=status]')).to_contain_text('copy it manually')
            page.goto(base+'/en/gallery',wait_until='load')
            page.route('**/images/gallery/*',lambda r:r.abort())
            image=page.locator('.gallery-item').first;image.focus();image.press('Enter')
            expect(page.locator('.lightbox')).to_have_class('lightbox active')
            expect(page.locator('#lb-status')).to_contain_text('could not be loaded')
            page.keyboard.press('Escape');expect(image).to_be_focused()
            page.goto(base+'/en/about',wait_until='load');page.locator('.lang-switch a[lang=hr]').click();assert page.url.endswith('/hr/o-nama')
            fresh=browser.new_page()
            fresh.route('**/*',lambda r:r.continue_() if urlsplit(r.request.url).netloc==urlsplit(base).netloc else r.abort())
            fresh.goto(base+'/en/contact',wait_until='load')
            expect(fresh.locator('.privacy-consent')).to_be_visible()
            fresh.locator('.privacy-language-option[lang=hr]').click()
            expect(fresh).to_have_url(base+'/hr/kontakt')
            expect(fresh.locator('.privacy-consent > a')).to_have_attribute('href',re.compile('privatnost$'))
            fresh.close()
            assert not errors,errors
            browser.close()
        assert not missing,'Missing visual baselines; review screenshots then run --update-baselines: '+str(missing)
        print(f'{count} desktop/mobile page views passed, plus profile tabs, contact validation/copy fallback, gallery error/focus recovery and language navigation.')
    finally:server.shutdown();server.server_close()

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--update-baselines',action='store_true');p.add_argument('--screenshots-only',action='store_true');p.add_argument('--visual-only',action='store_true');p.add_argument('--mount',default='');args=p.parse_args();run(args.update_baselines,args.screenshots_only,args.visual_only,args.mount)
