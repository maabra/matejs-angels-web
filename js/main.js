/* ================================================================
  MATEJ'S ANGELS KENNEL. Main JavaScript
   ================================================================ */

const siteIsCroatian = document.documentElement.lang.toLowerCase().startsWith('hr');
const siteLabel = (hr, en) => siteIsCroatian ? hr : en;

/* ---- DIAGONAL BACKGROUND PATTERN ---- */
(function () {
  const el = document.createElement('div');
  el.className = 'bg-kennel-pattern';
  el.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(el, document.body.firstChild);
})();

/* ---- NAVBAR: scroll effect + mobile toggle ---- */
(function () {
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');

  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  if (hamburger && navLinks) {
    const compact = window.matchMedia('(max-width: 1200px)');
    const links = [...navLinks.querySelectorAll('a')];
    hamburger.type = 'button';
    hamburger.setAttribute('aria-controls', navLinks.id);
    navLinks.dataset.menuLabel = siteLabel('Istražite uzgajivačnicu', 'Explore the kennel');
    function setMenu(open, focusFirst = false) {
      open = open && compact.matches;
      hamburger.classList.toggle('open', open);
      navLinks.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      hamburger.setAttribute('aria-label', open ? siteLabel('Zatvori izbornik', 'Close menu') : siteLabel('Otvori izbornik', 'Open menu'));
      navLinks.inert = compact.matches && !open;
      if (open && focusFirst && links[0]) links[0].focus();
    }
    function closeMenu(restoreFocus = false) {
      const wasOpen = navLinks.classList.contains('open');
      setMenu(false);
      if (wasOpen && restoreFocus) hamburger.focus();
    }

    hamburger.addEventListener('click', () => {
      setMenu(!navLinks.classList.contains('open'));
    });
    hamburger.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setMenu(true, true);
      }
    });
    navLinks.addEventListener('keydown', event => {
      if (!compact.matches || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const index = links.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? links.length - 1 :
        (index + (event.key === 'ArrowUp' ? -1 : 1) + links.length) % links.length;
      links[next]?.focus();
    });

    // close on link click
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        closeMenu();
      });
    });

    // close on outside click
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target)) {
        closeMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu(true);
    });
    navbar.addEventListener('focusout', event => {
      if (event.relatedTarget && !navbar.contains(event.relatedTarget)) closeMenu();
    });
    // Do not resurrect an open mobile menu after rotating or resizing the screen.
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1200) closeMenu();
    }, { passive: true });
    compact.addEventListener('change', () => closeMenu());
    window.addEventListener('pageshow', () => closeMenu());
    window.addEventListener('pagehide', () => closeMenu());
    closeMenu();
  }
})();

/* ---- KEEP TALL PROFILE SIDEBARS REACHABLE ---- */
(function () {
  const sidebars = document.querySelectorAll('.dog-profile-sidebar');
  if (!sidebars.length) return;

  function updateOffsets() {
    const viewportHeight = document.documentElement.clientHeight;
    sidebars.forEach(sidebar => {
      // Use normal page scrolling to reveal the entire sidebar, then pin its bottom.
      const top = Math.min(88, viewportHeight - sidebar.offsetHeight - 24);
      sidebar.style.setProperty('--sidebar-top', `${top}px`);
    });
  }

  updateOffsets();
  window.addEventListener('resize', updateOffsets, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(updateOffsets);
    sidebars.forEach(sidebar => observer.observe(sidebar));
  }
})();

/* ---- SKIP LINK ---- */
(function () {
  const content = document.querySelector('.page-content');
  if (!content) return;

  content.id = 'main-content';
  content.setAttribute('tabindex', '-1');

  const skipLink = document.createElement('a');
  skipLink.className = 'skip-link';
  skipLink.href = '#main-content';
  skipLink.textContent = siteLabel('Preskoči na sadržaj', 'Skip to content');
  document.body.insertBefore(skipLink, document.body.firstChild);
})();

/* ---- ACTIVE NAV LINK ---- */
(function () {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href && path.endsWith(href.replace(/^.*\//, ''))) {
      a.classList.add('active');
    }
  });
})();

/* ---- LIGHTBOX ---- */
(function () {
  const lb = document.getElementById('lightbox');
  if (!lb) return;

  const lbImg     = lb.querySelector('#lb-img');
  const lbCaption = lb.querySelector('#lb-caption');
  const lbClose   = lb.querySelector('#lb-close');
  const lbPrev    = lb.querySelector('#lb-prev');
  const lbNext    = lb.querySelector('#lb-next');
  if (!lbImg) return;
  const status = document.createElement('p');
  status.id = 'lb-status';
  status.className = 'lightbox-status';
  status.setAttribute('role', 'status');
  lb.querySelector('.lightbox-inner').appendChild(status);
  lb.setAttribute('aria-modal', 'true');

  lb.setAttribute('aria-label', siteLabel('Pregled fotografija', 'Photo viewer'));
  if (lbClose) lbClose.setAttribute('aria-label', siteLabel('Zatvori', 'Close'));
  if (lbPrev) lbPrev.setAttribute('aria-label', siteLabel('Prethodna fotografija', 'Previous photo'));
  if (lbNext) lbNext.setAttribute('aria-label', siteLabel('Sljedeća fotografija', 'Next photo'));

  let items = [];
  let current = 0;
  let returnFocus;
  let previousOverflow = '';

  lbImg.addEventListener('load', () => {
    if (!lb.classList.contains('active')) return;
    lbImg.style.visibility = '';
    status.textContent = '';
    lb.removeAttribute('aria-busy');
  });
  lbImg.addEventListener('error', () => {
    if (!lb.classList.contains('active')) return;
    lbImg.style.visibility = 'hidden';
    status.textContent = siteLabel('Fotografiju nije moguće učitati. Pokušajte drugu fotografiju ili ponovno otvorite ovu.', 'This photo could not be loaded. Try another photo or reopen this one.');
    lb.removeAttribute('aria-busy');
  });

  function open(index) {
    if (!items[index]) return;
    if (!lb.classList.contains('active')) {
      returnFocus = document.activeElement;
      previousOverflow = document.body.style.overflow;
    }
    current = index;
    const item = items[current];
    lbImg.style.visibility = 'hidden';
    status.textContent = siteLabel('Učitavanje fotografije…', 'Loading photo…');
    lb.setAttribute('aria-busy', 'true');
    lbImg.src = item.src;
    lbImg.alt = item.alt || '';
    if (lbCaption) lbCaption.textContent = item.caption || item.alt || '';
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (!lb.contains(document.activeElement) && lbClose) lbClose.focus();
  }

  function close() {
    if (!lb.classList.contains('active')) return;
    lb.classList.remove('active');
    document.body.style.overflow = previousOverflow;
    lbImg.removeAttribute('src');
    lb.removeAttribute('aria-busy');
    status.textContent = '';
    if (returnFocus && returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
  }

  function navigate(dir) {
    if (!items.length || !lb.classList.contains('active')) return;
    current = (current + dir + items.length) % items.length;
    open(current);
  }

  // Collect all gallery items
  document.querySelectorAll('.gallery-item').forEach(el => {
    const img = el.querySelector('img');
    if (!img) return;
    const index = items.length;
    items.push({
      src: img.src,
      alt: img.alt,
      caption: el.dataset.caption || img.alt
    });
    el.addEventListener('click', event => { event.preventDefault(); el.focus({ preventScroll: true }); open(index); });
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${siteLabel('Otvori fotografiju', 'Open image')}: ${img.alt || siteLabel('fotografija iz galerije', 'gallery image')}`);
    el.setAttribute('tabindex', '0');
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open(index);
      }
    });
  });

  if (lbClose) lbClose.addEventListener('click', close);
  if (lbPrev)  lbPrev.addEventListener('click',  () => navigate(-1));
  if (lbNext)  lbNext.addEventListener('click',  () => navigate(1));

  lb.addEventListener('click', e => { if (e.target === lb) close(); });

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('active')) return;
    if (['Escape', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) e.preventDefault();
    if (e.key === 'Tab') {
      const controls = [lbClose, lbPrev, lbNext].filter(Boolean);
      const index = controls.indexOf(document.activeElement);
      controls[(index + (e.shiftKey ? -1 : 1) + controls.length) % controls.length].focus();
    }
    if (e.key === 'Escape')    close();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight')navigate(1);
  });
  window.addEventListener('pagehide', close);
})();

/* ---- FAQ ACCORDION ---- */
(function () {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.setAttribute('aria-expanded', String(btn.classList.contains('open')));
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-a');
      const isOpen = btn.classList.contains('open');

      // close all
      document.querySelectorAll('.faq-q.open').forEach(b => {
        b.classList.remove('open');
        b.setAttribute('aria-expanded', 'false');
        b.closest('.faq-item').querySelector('.faq-a').classList.remove('open');
      });

      // open clicked if it was closed
      if (!isOpen) {
        btn.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
        answer.classList.add('open');
      }
    });
  });
})();

/* ---- TAB PANELS (dog profile) ---- */
(function () {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const group = btn.closest('.dog-tabs') || document.querySelector('.dog-tabs');
      const target = btn.dataset.tab;
      if (!group) return;
      const panel = group.querySelector(`#tab-${target}`);
      if (!panel) return;

      group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      group.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      if (panel) {
        panel.classList.add('active');
        requestAnimationFrame(() => panel.querySelectorAll('.ped-outer').forEach(setupPedHint));
      }
    });
  });
})();

/* ---- PEDIGREE SCROLL HINT ---- */
/* Drag with a mouse; touch devices retain native scrolling. */
document.querySelectorAll('.ped-outer, .pedigree-wrapper').forEach(el => {
  let drag = null;
  el.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse' || e.button !== 0 ||
        el.scrollWidth <= el.clientWidth ||
        e.target.closest('a, button, input, select, textarea')) return;
    drag = { id: e.pointerId, x: e.clientX, scroll: el.scrollLeft, active: false };
  });
  el.addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    if (!(e.buttons & 1)) { endDrag(); return; }
    const distance = e.clientX - drag.x;
    if (!drag.active && Math.abs(distance) < 5) return;
    if (!drag.active) {
      drag.active = true;
      el.setPointerCapture(e.pointerId);
      el.classList.add('ped-dragging');
      window.getSelection()?.removeAllRanges();
    }
    e.preventDefault();
    el.scrollLeft = drag.scroll - distance;
  });
  function endDrag() {
    const previous = drag;
    drag = null;
    el.classList.remove('ped-dragging');
    if (previous && el.hasPointerCapture(previous.id)) el.releasePointerCapture(previous.id);
  }
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', endDrag);
  window.addEventListener('blur', endDrag);
  el.addEventListener('lostpointercapture', endDrag);
});

function setupPedHint(el) {
  if (el.parentNode.classList.contains('ped-scroll-wrap')) return;
  if (el.scrollWidth <= el.clientWidth + 1) return;

  const wrap = document.createElement('div');
  wrap.className = 'ped-scroll-wrap';
  el.parentNode.insertBefore(wrap, el);
  wrap.appendChild(el);

  const hint = document.createElement('div');
  hint.className = 'ped-scroll-hint';
  hint.setAttribute('aria-hidden', 'true');
  wrap.appendChild(hint);

  const leftHint = document.createElement('div');
  leftHint.className = 'ped-scroll-hint ped-scroll-hint-left';
  leftHint.setAttribute('aria-hidden', 'true');
  wrap.appendChild(leftHint);

  function updateHints() {
    leftHint.style.opacity = el.scrollLeft > 4 ? '1' : '0';
    hint.style.opacity = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 ? '0' : '1';
  }
  el.addEventListener('scroll', updateHints, { passive: true });
  window.addEventListener('resize', updateHints, { passive: true });
  updateHints();
}

(function () {
  requestAnimationFrame(() => document.querySelectorAll('.ped-outer').forEach(setupPedHint));
})();

/* ---- SCROLL ANIMATIONS ---- */
(function () {
  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        entry.target.classList.remove('anim-pending');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0, rootMargin: '0px' });

  document.querySelectorAll('[data-anim]').forEach(el => {
    // Content already on screen stays visible on first paint.
    if (el.getBoundingClientRect().top >= window.innerHeight) {
      el.classList.add('anim-pending');
    }
    observer.observe(el);
  });
})();

/* ---- LOGO IMG FALLBACK ---- */
document.querySelectorAll('.nav-logo img, .index-logo-wrap img').forEach(img => {
  function showFallback() {
    img.style.display = 'none';
    const fallback = img.nextElementSibling;
    if (fallback) fallback.style.display = 'flex';
  }
  img.addEventListener('error', showFallback);
  // A cached failure may have fired before this script finished loading.
  if (img.complete && img.naturalWidth === 0) showFallback();
});

/* ---- BACK TO TOP ---- */
(function () {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', siteLabel('Povratak na vrh', 'Back to top'));
  btn.innerHTML = '&#8593;';
  document.body.appendChild(btn);
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 500);
  }, { passive: true });
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

/* ---- KONAMI CODE: SECRET ZYWOO EASTER EGG ---- */
(function () {
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let idx = 0;
  let activated = false;

  document.addEventListener('keydown', function (e) {
    if (e.key === KONAMI[idx]) {
      idx++;
      if (idx === KONAMI.length) {
        idx = 0;
        if (!activated) {
          activated = true;
          activateZywoo();
        }
      }
    } else {
      idx = (e.key === KONAMI[0]) ? 1 : 0;
    }
  });

  function activateZywoo() {
    launchConfetti();

    const card = document.getElementById('zywoo-card');
    if (card) {
      card.style.display = '';
      card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      card.style.opacity = '0';
      card.style.transform = 'scale(0.8) rotate(-3deg)';
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          card.style.opacity = '1';
          card.style.transform = 'scale(1) rotate(0deg)';
          setTimeout(function () {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 200);
        });
      });
    }

    const toast = document.createElement('div');
    toast.style.cssText = [
      'position:fixed',
      'top:50%',
      'left:50%',
      'transform:translate(-50%,-60%) scale(0.8)',
      'z-index:99999',
      'background:#0D1B2A',
      'border:2px solid #FFE500',
      'border-radius:14px',
      'padding:1.75rem 2.25rem',
      'text-align:center',
      'color:#FFE500',
      'font-family:Georgia,serif',
      'box-shadow:0 0 60px rgba(255,229,0,0.25),0 20px 60px rgba(0,0,0,0.5)',
      'pointer-events:none',
      'transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1),opacity 0.4s ease',
      'opacity:0',
      'min-width:260px',
    ].join(';');
    toast.innerHTML = [
      '<div style="font-size:1.5rem;font-weight:bold;margin:0.5rem 0;letter-spacing:0.03em">WOOF!</div>',
      '<div style="font-size:1rem;color:#fff">You found the secret dog!</div>',
      '<div style="font-size:0.78rem;color:rgba(255,229,0,0.6);margin-top:0.5rem">ZywOo has joined the kennel</div>',
    ].join('');
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        toast.style.transform = 'translate(-50%,-50%) scale(1)';
        toast.style.opacity = '1';
      });
    });

    setTimeout(function () {
      toast.style.transform = 'translate(-50%,-50%) scale(0.9)';
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); }, 400);
    }, 3200);
  }

  function launchConfetti() {
    var canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:99998';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    var colors = ['#FFE500','#D4AF37','#00A3E0','#FFFFFF','#FF6B35','#A8D8EA','#69f0ae','#ce93d8'];
    var particles = [];

    for (var i = 0; i < 180; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height * 0.5 - canvas.height * 0.3,
        w: Math.random() * 11 + 5,
        h: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.18,
        vx: (Math.random() - 0.5) * 2.5,
        vy: Math.random() * 3.5 + 1.5,
        alpha: 1,
      });
    }

    var start = Date.now();
    var duration = 2500;
    var frame;

    function draw() {
      var elapsed = Date.now() - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach(function (p) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        if (elapsed > duration * 0.6) {
          p.alpha = Math.max(0, p.alpha - 0.012);
        }
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
          p.alpha = 1;
        }
      });

      if (elapsed < duration) {
        frame = requestAnimationFrame(draw);
      } else {
        canvas.style.transition = 'opacity 0.8s';
        canvas.style.opacity = '0';
        setTimeout(function () { canvas.remove(); }, 800);
      }
    }
    draw();
  }
})();

/* ---- COPYRIGHT YEAR AUTO-UPDATE ---- */
(function () {
  const year = new Date().getFullYear();
  document.querySelectorAll('.footer-bottom p').forEach(p => {
    if (p.textContent.includes('©')) {
      p.innerHTML = p.innerHTML.replace(/\b20\d{2}\b/, year);
    }
  });
})();

/* ---- PRIVACY AND OPTIONAL THIRD-PARTY CONTENT ---- */
(function () {
  const storageKey = 'matejs-angels-privacy-consent-v2';
  const consentDuration = 183 * 24 * 60 * 60 * 1000;
  const privacyUrl = document.querySelector('.footer-bottom a')?.getAttribute('href') || (siteIsCroatian ? '/hr/privatnost' : '/en/privacy');
  const text = siteIsCroatian ? {
    title: 'Postavke privatnosti',
    intro: 'Koristimo samo nužnu pohranu za pamćenje vaših odabira. Uz vašu suglasnost možemo učitati brojač posjeta Flag Counter (analitika) te Google karte, Google Fonts i YouTube videozapise (vanjski sadržaj).',
    privacy: 'Politika privatnosti',
    accept: 'Prihvati sve',
    reject: 'Odbij neobavezno',
    manage: 'Postavke',
    save: 'Spremi odabir',
    analytics: 'Analitika (Flag Counter)',
    media: 'Vanjski sadržaj (Google karte, Google Fonts i YouTube)',
    unavailable: 'Postavke se ne mogu spremiti u ovom pregledniku; odabir vrijedi samo na ovoj stranici.',
    mapBlocked: 'Karta je blokirana dok ne dopustite vanjski sadržaj.',
    allowMap: 'Upravljaj suglasnošću za vanjski sadržaj',
    videoBlocked: 'Videozapis se ne učitava dok ne dopustite vanjski sadržaj.',
    allowVideo: 'Upravljaj suglasnošću za vanjski sadržaj',
    settings: 'Postavke kolačića i privatnosti',
    saved: 'Postavke privatnosti su spremljene.'
  } : {
    title: 'Privacy preferences',
    intro: 'We use only essential browser storage to remember your choices. With your permission, we may load the Flag Counter visitor counter (analytics) and Google Maps, Google Fonts and YouTube videos (external content).',
    privacy: 'Privacy policy',
    accept: 'Accept all',
    reject: 'Reject optional',
    manage: 'Settings',
    save: 'Save choices',
    analytics: 'Analytics (Flag Counter)',
    media: 'External content (Google Maps, Google Fonts and YouTube)',
    unavailable: 'Preferences cannot be saved in this browser; your choice applies to this page only.',
    mapBlocked: 'The map is blocked until you allow external content.',
    allowMap: 'Manage external-content consent',
    videoBlocked: 'The video is not loaded until you allow external content.',
    allowVideo: 'Manage external-content consent',
    settings: 'Cookie and privacy settings',
    saved: 'Privacy preferences saved.'
  };
  let consent = { analytics: false, media: false };
  let storageAvailable = true;
  let hasStoredConsent = false;
  let statusMessage = '';
  let expiresAt = 0;
  let expiryTimer;
  let returnFocus;

  function readConsent() {
    consent = { analytics: false, media: false };
    hasStoredConsent = false;
    expiresAt = 0;
    try {
      const saved = localStorage.getItem(storageKey);
      if (!saved) return;
      let value;
      try {
        value = JSON.parse(saved);
      } catch (error) {
        // A damaged record is not a browser-storage failure. Allow a fresh choice.
        localStorage.removeItem(storageKey);
        return;
      }
      if (value && Number.isFinite(value.expiresAt) && value.expiresAt > Date.now() &&
          value.expiresAt <= Date.now() + consentDuration &&
          typeof value.analytics === 'boolean' && typeof value.media === 'boolean') {
        consent = { analytics: value.analytics === true, media: value.media === true };
        hasStoredConsent = true;
        expiresAt = value.expiresAt;
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (error) {
      storageAvailable = false;
      console.error('Unable to read privacy preferences from browser storage.', error);
      statusMessage = text.unavailable;
    }
  }

  function saveConsent(next) {
    consent = { analytics: next.analytics === true, media: next.media === true };
    expiresAt = Date.now() + consentDuration;
    hasStoredConsent = true;
    if (!storageAvailable) { statusMessage = text.unavailable; return; }
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        ...consent,
        expiresAt
      }));
      statusMessage = text.saved;
    } catch (error) {
      storageAvailable = false;
      console.error('Unable to save privacy preferences to browser storage.', error);
      statusMessage = text.unavailable;
    }
  }

  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    if (!expiresAt) return;
    // Browser timers cannot represent the full 183-day interval.
    expiryTimer = setTimeout(() => {
      if (Date.now() >= expiresAt) {
        // A suspended tab may have missed a newer choice made in another tab.
        if (storageAvailable) readConsent();
        else {
          consent = { analytics: false, media: false };
          hasStoredConsent = false;
          expiresAt = 0;
        }
        syncOptionalServices();
        if (!hasStoredConsent) setPanelVisible(true);
        analyticsToggle.checked = consent.analytics;
        mediaToggle.checked = consent.media;
      }
      scheduleExpiry();
    }, Math.min(Math.max(expiresAt - Date.now(), 1), 2147483647));
  }

  function syncOptionalServices() {
    const fonts = document.getElementById('optional-google-fonts');
    if (consent.media && !fonts) {
      const link = document.createElement('link');
      link.id = 'optional-google-fonts';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;0,900;1,400;1,600&family=Inter:wght@300;400;500;600;700&display=swap';
      link.referrerPolicy = 'no-referrer';
      document.head.appendChild(link);
    } else if (!consent.media && fonts) {
      fonts.remove();
    }

    document.querySelectorAll('.google-map-consent').forEach(container => {
      const frame = container.querySelector('iframe');
      if (consent.media && !frame) {
        const map = document.createElement('iframe');
        map.src = container.dataset.mapSrc;
        map.width = '100%';
        map.height = '400';
        map.loading = 'lazy';
        map.title = container.dataset.mapTitle;
        map.referrerPolicy = 'no-referrer';
        map.allowFullscreen = true;
        map.style.cssText = 'border:0;border-radius:10px;display:block';
        container.replaceChildren(map);
      } else if (!consent.media && frame) {
        showMapPlaceholder(container);
      } else if (!consent.media) {
        showMapPlaceholder(container);
      }
    });

    document.querySelectorAll('iframe[data-optional-src]').forEach(frame => {
      const wrapper = frame.parentElement;
      let placeholder = wrapper.querySelector('.privacy-video-placeholder');
      if (consent.media) {
        if (!frame.hasAttribute('src')) {
          frame.referrerPolicy = 'no-referrer';
          frame.src = frame.dataset.optionalSrc;
        }
        frame.removeAttribute('aria-hidden');
        frame.removeAttribute('tabindex');
        if (placeholder) placeholder.remove();
      } else {
        frame.removeAttribute('src');
        frame.setAttribute('aria-hidden', 'true');
        frame.setAttribute('tabindex', '-1');
        if (!placeholder) {
          placeholder = document.createElement('div');
          placeholder.className = 'privacy-video-placeholder';
          const message = document.createElement('p');
          message.textContent = text.videoBlocked;
          const button = document.createElement('button');
          button.className = 'btn btn-outline btn-sm';
          button.type = 'button';
          button.textContent = text.allowVideo;
          button.addEventListener('click', openMediaPreferences);
          placeholder.append(message, button);
          wrapper.appendChild(placeholder);
        }
      }
    });

    document.querySelectorAll('.footer-counter').forEach(container => {
      const image = container.querySelector('img');
      if (consent.analytics && !image) {
        const link = document.createElement('a');
        link.href = 'https://info.flagcounter.com/fMiv';
        link.rel = 'noopener noreferrer';
        link.target = '_blank';
        const counter = document.createElement('img');
        counter.src = 'https://s01.flagcounter.com/count2/fMiv/bg_FFFFFF/txt_000000/border_FFFFFF/columns_4/maxflags_16/viewers_0/labels_0/pageviews_1/flags_0/percent_0/';
        counter.alt = siteLabel('Brojač posjeta', 'Visitor counter');
        counter.referrerPolicy = 'no-referrer';
        link.appendChild(counter);
        container.replaceChildren(link);
      } else if (!consent.analytics && image) {
        container.replaceChildren();
      }
    });
  }

  function showMapPlaceholder(container) {
    const message = document.createElement('p');
    message.className = 'privacy-map-message';
    message.textContent = text.mapBlocked;
    const button = document.createElement('button');
    button.className = 'btn btn-outline btn-sm';
    button.type = 'button';
    button.textContent = text.allowMap;
    button.addEventListener('click', openMediaPreferences);
    container.replaceChildren(message, button);
  }

  function openMediaPreferences() {
    returnFocus = document.activeElement;
    setPanelVisible(true);
    settings.hidden = false;
    analyticsToggle.checked = consent.analytics;
    mediaToggle.checked = consent.media;
    mediaToggle.focus();
  }

  function updateStatus() {
    const status = panel.querySelector('.privacy-consent-status');
    if (status) status.textContent = statusMessage;
  }

  readConsent();
  const panel = document.createElement('dialog');
  panel.className = 'privacy-consent';
  panel.setAttribute('aria-label', text.title);
  panel.setAttribute('tabindex', '-1');
  panel.hidden = true;
  panel.addEventListener('cancel', event => {
    event.preventDefault();
    setPanelVisible(false);
  });

  function setPanelVisible(visible) {
    panel.hidden = !visible;
    if (visible && !panel.open) {
      returnFocus = document.activeElement;
      panel.showModal();
      panel.focus({ preventScroll: true });
    } else if (!visible && panel.open) {
      panel.close();
      if (returnFocus && returnFocus.isConnected) returnFocus.focus();
    }
  }

  const title = document.createElement('h2');
  title.textContent = text.title;
  const languageSwitch = document.createElement('nav');
  languageSwitch.className = 'privacy-language-switch';
  languageSwitch.setAttribute('aria-label', siteLabel('Jezik stranice', 'Site language'));
  [
    { lang: 'en', label: 'English', href: document.querySelector('.lang-switch a[lang="en"]')?.getAttribute('href') || '/en/about', active: !siteIsCroatian,
      flag: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><path fill="#153575" d="M0 0h60v40H0z"/><path stroke="#fff" stroke-width="9" d="m0 0 60 40M60 0 0 40"/><path stroke="#cf2035" stroke-width="4" d="m0 0 60 40M60 0 0 40"/><path stroke="#fff" stroke-width="13" d="M30 0v40M0 20h60"/><path stroke="#cf2035" stroke-width="7" d="M30 0v40M0 20h60"/></svg>' },
    { lang: 'hr', label: 'Hrvatski', href: document.querySelector('.lang-switch a[lang="hr"]')?.getAttribute('href') || '/', active: siteIsCroatian,
      flag: '<svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg"><path fill="#ef3340" d="M0 0h60v14H0z"/><path fill="#fff" d="M0 13h60v14H0z"/><path fill="#17449b" d="M0 26h60v14H0z"/><path fill="#fff" stroke="#ef3340" d="M22 12h16v13q0 7-8 10-8-3-8-10z"/><path fill="#ef3340" d="M22 12h3v4h-3zm6 0h4v4h-4zm7 0h3v4h-3zm-10 4h3v4h-3zm7 0h3v4h-3zm-10 4h3v4h-3zm6 0h4v4h-4zm7 0h3v4h-3zm-10 4h3v4h-3zm7 0h3v4h-3zm-5 4h6v4h-6z"/><path fill="#4ca8d8" stroke="#17449b" d="m22 11 1-5 4 1 3-2 3 2 4-1 1 5z"/></svg>' }
  ].forEach(language => {
    const link = document.createElement('a');
    const flag = document.createElement('span');
    flag.className = 'privacy-language-flag';
    flag.setAttribute('aria-hidden', 'true');
    flag.innerHTML = language.flag;
    const label = document.createElement('span');
    label.textContent = language.label;
    link.append(flag, label);
    link.href = language.href;
    link.lang = language.lang;
    link.hreflang = language.lang;
    link.className = 'privacy-language-option';
    if (language.active) {
      link.setAttribute('aria-current', 'true');
      const selected = document.createElement('span');
      selected.className = 'privacy-language-selected';
      selected.setAttribute('aria-hidden', 'true');
      selected.textContent = '✓';
      link.appendChild(selected);
    }
    languageSwitch.appendChild(link);
  });
  const intro = document.createElement('p');
  intro.textContent = text.intro;
  const privacyLink = document.createElement('a');
  privacyLink.href = privacyUrl;
  privacyLink.textContent = text.privacy;
  const actions = document.createElement('div');
  actions.className = 'privacy-consent-actions';
  const settings = document.createElement('div');
  settings.className = 'privacy-consent-settings';
  settings.hidden = true;
  const status = document.createElement('p');
  status.className = 'privacy-consent-status';
  status.setAttribute('aria-live', 'polite');
  status.textContent = statusMessage;

  function makeButton(label, callback, className) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = className;
    button.textContent = label;
    button.addEventListener('click', callback);
    return button;
  }

  function setChoice(next) {
    saveConsent(next);
    syncOptionalServices();
    scheduleExpiry();
    setPanelVisible(false);
    if (returnFocus && returnFocus.isConnected) returnFocus.focus();
    updateStatus();
  }

  const analyticsLabel = document.createElement('label');
  const analyticsToggle = document.createElement('input');
  analyticsToggle.type = 'checkbox';
  analyticsToggle.checked = consent.analytics;
  analyticsLabel.append(analyticsToggle, document.createTextNode(text.analytics));
  const mediaLabel = document.createElement('label');
  const mediaToggle = document.createElement('input');
  mediaToggle.type = 'checkbox';
  mediaToggle.checked = consent.media;
  mediaLabel.append(mediaToggle, document.createTextNode(text.media));
  settings.append(analyticsLabel, mediaLabel, makeButton(
    text.save,
    () => setChoice({ analytics: analyticsToggle.checked, media: mediaToggle.checked }),
    'btn btn-primary btn-sm'
  ));
  actions.append(
    makeButton(text.accept, () => setChoice({ analytics: true, media: true }), 'btn btn-outline btn-sm'),
    makeButton(text.reject, () => setChoice({ analytics: false, media: false }), 'btn btn-outline btn-sm'),
    makeButton(text.manage, () => {
      settings.hidden = !settings.hidden;
      if (!settings.hidden) analyticsToggle.focus();
    }, 'btn btn-outline btn-sm')
  );
  panel.append(languageSwitch, title, intro, privacyLink, actions, settings, status);
  document.body.appendChild(panel);

  const footerBottom = document.querySelector('.footer-bottom');
  if (footerBottom) {
    const controls = document.createElement('div');
    controls.className = 'privacy-footer-controls';
    controls.append(makeButton(text.settings, () => {
      returnFocus = document.activeElement;
      setPanelVisible(true);
      settings.hidden = false;
      analyticsToggle.checked = consent.analytics;
      mediaToggle.checked = consent.media;
      analyticsToggle.focus();
    }, 'privacy-settings-link'));
    footerBottom.appendChild(controls);
  }

  // Reflect withdrawal/clearing storage in every open tab.
  window.addEventListener('storage', event => {
    if (event.key !== storageKey && event.key !== null) return;
    readConsent();
    syncOptionalServices();
    scheduleExpiry();
    analyticsToggle.checked = consent.analytics;
    mediaToggle.checked = consent.media;
    setPanelVisible(!hasStoredConsent);
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (storageAvailable || (expiresAt && Date.now() >= expiresAt))) {
      readConsent();
      syncOptionalServices();
      scheduleExpiry();
      if (!hasStoredConsent) setPanelVisible(true);
      analyticsToggle.checked = consent.analytics;
      mediaToggle.checked = consent.media;
    }
  });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    if (storageAvailable) readConsent();
    syncOptionalServices();
    scheduleExpiry();
    analyticsToggle.checked = consent.analytics;
    mediaToggle.checked = consent.media;
    if (!hasStoredConsent && !document.querySelector('.privacy-page')) setPanelVisible(true);
  });
  syncOptionalServices();
  scheduleExpiry();
  if (!hasStoredConsent && !document.querySelector('.privacy-page')) setPanelVisible(true);
})();

/* ---- COPY EMAIL TO CLIPBOARD ---- */
(function () {
  if (!navigator.clipboard) return;
  const toast = document.createElement('div');
  toast.className = 'copy-toast';
  document.body.appendChild(toast);
  let timer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(timer);
    timer = setTimeout(() => toast.classList.remove('visible'), 2500);
  }
  const clipSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
  document.querySelectorAll('a[href^="mailto:"]:not(.contact-email)').forEach(a => {
    const email = a.href.replace('mailto:', '').split('?')[0];
    const btn = document.createElement('button');
    btn.className = 'copy-email-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', siteLabel('Kopiraj e-adresu', 'Copy email address'));
    btn.title = siteLabel('Kopiraj u međuspremnik', 'Copy to clipboard');
    btn.innerHTML = clipSvg;
    let resetTimer;
    let copying = false;
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      if (copying) return;
      copying = true;
      Promise.resolve().then(() => navigator.clipboard.writeText(email)).then(() => {
        showToast(siteLabel('Kopirano: ', 'Copied: ') + email);
        btn.textContent = '✓';
        clearTimeout(resetTimer);
        resetTimer = setTimeout(() => { btn.innerHTML = clipSvg; }, 2000);
      }).catch(() => {
        showToast(siteLabel('Kopiranje nije uspjelo. Označite i kopirajte e-adresu.', 'Unable to copy. Select and copy the email address.'));
      }).finally(() => { copying = false; });
    });
    a.insertAdjacentElement('afterend', btn);
  });
})();

/* ---- WHATSAPP LINKS ---- */
(function () {
  const waNums = new Set(['+385955445102', '+385955152150']);
  const waSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>';
  document.querySelectorAll('a[href^="tel:"]:not([data-contact-action])').forEach(a => {
    const num = a.href.replace('tel:', '');
    if (!waNums.has(num)) return;
    const wa = document.createElement('a');
    wa.href = 'https://wa.me/' + num.replace('+', '');
    wa.target = '_blank';
    wa.rel = 'noopener noreferrer';
    wa.className = 'wa-link';
    wa.innerHTML = waSvg + ' WhatsApp';
    const parent = a.closest('.contact-info-text') || a.parentElement;
    parent.appendChild(wa);
  });
})();
