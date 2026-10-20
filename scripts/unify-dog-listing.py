"""Unify dog listings and publish only these pages, preserving remote backups."""
import ftplib
import getpass
import re
import ssl
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
PAGES = ['hr/nasi-psi.html', 'en/our-dogs.html']


def transform(source, hr):
    start = source.index('        <!-- CAVALIER')
    end = source.index('\n      </div>\n    </section>', start)
    original = source[start:end]
    cards = re.findall(r'<a\b[^>]*class="dog-card"[^>]*>.*?</a>', original, re.S)
    assert len(cards) == 15, len(cards)
    cleaned = []
    for card in cards:
        card = card.replace('ribbon-wrapper memoriam', 'ribbon-wrapper')
        card = re.sub(r'<p class="dog-card-note">.*?</p>', '', card, flags=re.S)
        card = re.sub(r'<span(?: style="[^"]*")?>(\d{4})\. – \d{4}\.</span>',
                      lambda m: '<span>' + ('r. ' if hr else 'b. ') + m[1] + '.</span>', card)
        card = card.replace('In Memoriam', 'Naši psi' if hr else 'Our dogs')
        if re.search(r'href="(?:psi|dogs)/(quara|cashmir)"', card):
            name = 'Quara' if '/quara"' in card else 'Cashmir'
            card = card.replace('</h4>', '</h4><p class="dog-card-call">"' + name + '"</p>')
        cleaned.append(card)
    replacement = '        <div class="breed-section" data-anim>\n          <div class="cards-grid">\n\n'
    replacement += '\n\n'.join('            ' + card for card in cleaned)
    replacement += '\n\n          </div>\n        </div>\n'
    result = source[:start] + replacement + source[end:]
    result = result.replace(' and our beloved In Memoriam dogs', ' and all our beloved dogs')
    assert len(re.findall(r'class="dog-card"', result)) == 15
    remaining = re.search(r'.{0,80}(?:memoriam|zaboravljeni|Forever in our hearts|remembered|2011\. –|2019\. –|2003\. –|2008\. –).{0,80}', result, re.I)
    assert not remaining, remaining.group(0) if remaining else ''
    assert re.findall(r'<a\b[^>]*href="([^"]+)"[^>]*class="dog-card"', source) == re.findall(r'<a\b[^>]*href="([^"]+)"[^>]*class="dog-card"', result)
    return result


def main():
    password = getpass.getpass('FTP password (hidden): ')
    ftp = ftplib.FTP_TLS(context=ssl.create_default_context(), timeout=45)
    ftp.connect('lin180.mojsite.com', 21)
    ftp.login('matejsangelscom', password)
    ftp.prot_p()
    updates = {}
    originals = {}
    for page in PAGES:
        buf = BytesIO()
        ftp.retrbinary('RETR /public_html/' + page, buf.write)
        originals[page] = buf.getvalue()
        updates[page] = transform(buf.getvalue().decode('utf-8'), page.startswith('hr/')).encode('utf-8')
    backup = '/dog-listing-backup-' + datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')
    ftp.mkd(backup)
    for page, data in updates.items():
        ftp.storbinary('STOR ' + backup + '/' + page.replace('/', '-'), BytesIO(originals[page]))
        remote = '/public_html/' + page
        ftp.storbinary('STOR ' + remote + '.upload', BytesIO(data))
        check = BytesIO()
        ftp.retrbinary('RETR ' + remote + '.upload', check.write)
        assert check.getvalue() == data
        ftp.rename(remote + '.upload', remote)
        for base in [ROOT, ROOT / 'hosting-ready']:
            local = base / page
            # Apply the same focused transformation to preserve local differences.
            local.write_text(transform(local.read_text(encoding='utf-8'), page.startswith('hr/')), encoding='utf-8', newline='\n')
        print('Published and FTP-verified: ' + page, flush=True)
    ftp.quit()
    for page, data in updates.items():
        url = 'https://matejsangels.com/' + page.removesuffix('.html') + '?verify=equal-dogs-' + datetime.now(timezone.utc).strftime('%H%M%S')
        with urllib.request.urlopen(url, timeout=45) as response:
            live = response.read()
        assert live == data, 'Public content differs: ' + page
        print('HTTPS verified: ' + page, flush=True)


if __name__ == '__main__':
    main()
