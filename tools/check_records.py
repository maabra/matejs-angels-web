"""Guard recorded dog identifiers and litter content during presentation changes."""
from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,re

ROOT=Path(__file__).resolve().parent.parent
class Text(HTMLParser):
    def __init__(self):super().__init__();self.data=[];self.skip=0
    def handle_starttag(self,tag,attrs):
        if tag in ['script','style']:self.skip+=1
    def handle_endtag(self,tag):
        if tag in ['script','style']:self.skip-=1
    def handle_data(self,value):
        if not self.skip:self.data.append(value)

def fingerprint(name,source):
    if '/dogs/' in name or '/psi/' in name:
        rows=re.findall(r'<div class="stat-row">.*?</div>',source,re.S)
        return [re.sub(r'\s+',' ',row).strip() for row in rows]
    start=source.index('<div class="page-content">');end=source.index('<footer',start)
    scan=Text();scan.feed(source[start:end])
    text=re.sub(r'\s+',' ',' '.join(scan.data)).strip()
    return hashlib.sha256(text.encode('utf-8')).hexdigest()

def main():
    records=json.loads((ROOT/'content/records-lock.json').read_text('utf-8'))
    for name,value in records.items():assert fingerprint(name,(ROOT/name).read_text('utf-8'))==value,('recorded content changed; review required',name)
    print(f'Preserved recorded identifiers and litter content on {len(records)} pages.')
if __name__=='__main__':main()
