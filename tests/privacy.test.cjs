// Run with node --test tests/privacy.test.cjs; no dependencies or network needed.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/main.js', 'utf8').split('/* ---- PRIVACY AND OPTIONAL THIRD-PARTY CONTENT ---- */')[1].split('/* ---- COPY EMAIL')[0];
const key = 'matejs-angels-privacy-consent-v2';
const duration = 183 * 86400000;

function page(saved, blocked = false) {
  let now = 1000000000000;
  const events = {}, timers = new Map(), data = new Map(saved === undefined ? [] : [[key, saved]]);
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.events = {}; this.style = {}; }
    append(...nodes) { for (const node of nodes) { node.parentElement = this; this.children.push(node); } }
    appendChild(node) { this.append(node); return node; }
    replaceChildren(...nodes) { this.children.forEach(n => { n.parentElement = null; }); this.children = []; this.append(...nodes); }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(n => n !== this); this.parentElement = null; }
    setAttribute(k, v) { this.attrs[k] = v; }
    removeAttribute(k) { delete this.attrs[k]; if (k === 'src') delete this.src; }
    hasAttribute(k) { return k === 'src' ? !!this.src : k in this.attrs; }
    addEventListener(k, fn) { this.events[k] = fn; }
    focus() { document.activeElement = this; }
    showModal() { this.open = true; }
    close() { this.open = false; }
    get isConnected() { return !!this.parentElement; }
    querySelectorAll(selector) {
      const match = n => selector[0] === '.' ? (n.className || '').split(' ').includes(selector.slice(1)) : selector[0] === '#' ? n.id === selector.slice(1) : selector === 'iframe[data-optional-src]' ? n.tag === 'iframe' && n.dataset?.optionalSrc : n.tag === selector;
      return this.children.flatMap(n => [...(match(n) ? [n] : []), ...n.querySelectorAll(selector)]);
    }
    querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  }
  const root = new Element('html'), head = new Element('head'), body = new Element('body');
  root.append(head, body);
  const footer = new Element('div'); footer.className = 'footer-bottom'; body.append(footer);
  const counter = new Element('div'); counter.className = 'footer-counter'; body.append(counter);
  const map = new Element('div'); map.className = 'google-map-consent'; map.dataset = { mapSrc: 'https://maps.google.com/', mapTitle: 'Map' }; body.append(map);
  const wrapper = new Element('div'), frame = new Element('iframe'); frame.dataset = { optionalSrc: 'https://www.youtube.com/embed/test' }; wrapper.append(frame); body.append(wrapper);
  const document = {
    head, body, activeElement: body, createElement: tag => new Element(tag), createTextNode: text => Object.assign(new Element('text'), { textContent: text }),
    querySelector: s => root.querySelector(s), querySelectorAll: s => root.querySelectorAll(s), getElementById: id => root.querySelector('#' + id),
    addEventListener: (k, fn) => { events[k] = fn; }
  };
  const localStorage = {
    getItem: k => { if (blocked) throw Error('blocked'); return data.get(k) ?? null; },
    setItem: (k, v) => { if (blocked) throw Error('blocked'); data.set(k, v); }, removeItem: k => data.delete(k)
  };
  vm.runInNewContext(source, { document, localStorage, siteIsCroatian: false, siteLabel: (hr, en) => en,
    window: { addEventListener: (k, fn) => { events[k] = fn; } }, Date: { now: () => now }, console: { error() {} },
    setTimeout: (fn, delay) => { const id = {}; timers.set(id, { fn, delay }); return id; }, clearTimeout: id => timers.delete(id)
  });
  const click = label => { const b = root.querySelectorAll('button').find(n => n.textContent === label); assert.ok(b, label); b.events.click(); };
  const loaded = () => !!counter.querySelector('img');
  return { root, events, timers, data, click, loaded, frame, map, advance: ms => { now += ms; for (const { fn } of [...timers.values()]) fn(); } };
}

test('fresh visit and rejection keep third-party services blocked', () => {
  const p = page(); assert.equal(p.loaded(), false); assert.equal(p.frame.src, undefined); assert.equal(p.map.querySelector('iframe'), null);
  p.click('Reject optional'); assert.equal(p.loaded(), false); assert.equal(JSON.parse(p.data.get(key)).media, false);
});
test('accept and withdraw remove third-party content', () => {
  const p = page(); p.click('Accept all'); assert.ok(p.loaded()); assert.ok(p.frame.src); assert.ok(p.map.querySelector('iframe'));
  p.click('Cookie and privacy settings'); p.click('Reject optional'); assert.equal(p.loaded(), false); assert.equal(p.map.querySelector('iframe'), null);
  assert.equal(p.frame.src, undefined);
  assert.equal(p.frame.attrs['aria-hidden'], 'true'); assert.equal(p.frame.attrs.tabindex, '-1');
});
test('valid saved choices load only the selected category', () => {
  const p = page(JSON.stringify({ analytics: true, media: false, expiresAt: 1000000001000 })); assert.ok(p.loaded()); assert.equal(p.frame.src, undefined);
});
test('expired, malformed and unbounded consent fail closed', () => {
  for (const saved of ['bad json', JSON.stringify({ analytics: true, media: true, expiresAt: 1 }), JSON.stringify({ analytics: true, media: true, expiresAt: 1000000000000 + duration + 10000 }), JSON.stringify({ analytics: 'true', media: true, expiresAt: 1000000001000 })]) assert.equal(page(saved).loaded(), false);
});
test('withdrawal and storage clearing propagate across tabs', () => {
  const p = page(); p.click('Accept all'); p.data.set(key, JSON.stringify({ analytics: false, media: false, expiresAt: 1000000001000 })); p.events.storage({ key }); assert.equal(p.loaded(), false);
  p.click('Accept all'); p.data.clear(); p.events.storage({ key: null }); assert.equal(p.loaded(), false);
});
test('consent expires while the page stays open, with bounded timers', () => {
  const p = page(); p.click('Accept all'); assert.ok([...p.timers.values()].every(t => t.delay <= 2147483647)); p.advance(duration + 1); assert.equal(p.loaded(), false); assert.equal(p.root.querySelector('.privacy-consent').hidden, false);
});
test('blocked storage allows an in-page choice without automatic opt-in', () => {
  const p = page(undefined, true); assert.equal(p.loaded(), false); p.click('Accept all'); assert.ok(p.loaded()); p.click('Reject optional'); assert.equal(p.loaded(), false);
});

test('damaged consent can be replaced with a persisted fresh choice', () => {
  const p = page('invalid json');
  p.click('Accept all');
  const saved = p.data.get(key);
  assert.equal(JSON.parse(saved).analytics, true);
  assert.ok(page(saved).loaded());
});

test('restored pages reconcile choices changed while away', () => {
  const p = page(); p.click('Accept all');
  p.data.set(key, JSON.stringify({ analytics: false, media: false, expiresAt: 1000000001000 }));
  p.events.pageshow({ persisted: true });
  assert.equal(p.loaded(), false);
  assert.equal(p.map.querySelector('iframe'), null);
});

test('a delayed expiry timer preserves a newer choice from another tab', () => {
  const p = page(JSON.stringify({ analytics: false, media: false, expiresAt: 1000000000100 }));
  const newer = JSON.stringify({ analytics: true, media: false, expiresAt: 1000000005000 });
  p.data.set(key, newer);
  p.advance(200);
  assert.equal(p.data.get(key), newer);
  assert.ok(p.loaded());
});

test('returning to a visible tab reconciles withdrawal before expiry', () => {
  const p = page(); p.click('Accept all'); p.data.clear();
  p.events.visibilitychange();
  assert.equal(p.loaded(), false);
  assert.equal(p.frame.src, undefined);
});
