/* ================================================================
   MATEJ'S ANGELS KENNEL — Main JavaScript
   ================================================================ */

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
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      navLinks.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open);
    });

    // close on link click
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });

    // close on outside click
    document.addEventListener('click', (e) => {
      if (!navbar.contains(e.target)) {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
      }
    });
  }
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

  let items = [];
  let current = 0;

  function open(index) {
    current = index;
    const item = items[current];
    lbImg.src = item.src;
    lbImg.alt = item.alt || '';
    if (lbCaption) lbCaption.textContent = item.caption || item.alt || '';
    lb.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    lb.classList.remove('active');
    document.body.style.overflow = '';
    lbImg.src = '';
  }

  function navigate(dir) {
    current = (current + dir + items.length) % items.length;
    open(current);
  }

  // Collect all gallery items
  document.querySelectorAll('.gallery-item').forEach((el, i) => {
    const img = el.querySelector('img');
    if (!img) return;
    items.push({
      src: img.src,
      alt: img.alt,
      caption: el.dataset.caption || img.alt
    });
    el.addEventListener('click', () => open(i));
    el.setAttribute('tabindex', '0');
    el.addEventListener('keydown', e => { if (e.key === 'Enter') open(i); });
  });

  if (lbClose) lbClose.addEventListener('click', close);
  if (lbPrev)  lbPrev.addEventListener('click',  () => navigate(-1));
  if (lbNext)  lbNext.addEventListener('click',  () => navigate(1));

  lb.addEventListener('click', e => { if (e.target === lb) close(); });

  document.addEventListener('keydown', e => {
    if (!lb.classList.contains('active')) return;
    if (e.key === 'Escape')    close();
    if (e.key === 'ArrowLeft') navigate(-1);
    if (e.key === 'ArrowRight')navigate(1);
  });
})();

/* ---- FAQ ACCORDION ---- */
(function () {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.faq-item');
      const answer = item.querySelector('.faq-a');
      const isOpen = btn.classList.contains('open');

      // close all
      document.querySelectorAll('.faq-q.open').forEach(b => {
        b.classList.remove('open');
        b.closest('.faq-item').querySelector('.faq-a').classList.remove('open');
      });

      // open clicked if it was closed
      if (!isOpen) {
        btn.classList.add('open');
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

      group.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      group.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const panel = group.querySelector(`#tab-${target}`);
      if (panel) {
        panel.classList.add('active');
        requestAnimationFrame(() => panel.querySelectorAll('.ped-outer').forEach(setupPedHint));
      }
    });
  });
})();

/* ---- PEDIGREE SCROLL HINT ---- */
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

  el.addEventListener('scroll', () => {
    hint.style.opacity = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 ? '0' : '1';
  }, { passive: true });
}

(function () {
  requestAnimationFrame(() => document.querySelectorAll('.ped-outer').forEach(setupPedHint));
})();

/* ---- SCROLL ANIMATIONS ---- */
(function () {
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('[data-anim]').forEach(el => observer.observe(el));
})();

/* ---- CONTACT FORM (basic client-side validation) ---- */
(function () {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const name    = form.querySelector('[name="name"]');
    const email   = form.querySelector('[name="email"]');
    const message = form.querySelector('[name="message"]');
    let valid = true;

    [name, email, message].forEach(f => {
      if (f && !f.value.trim()) {
        f.style.borderColor = '#f44336';
        valid = false;
      } else if (f) {
        f.style.borderColor = '';
      }
    });

    if (valid) {
      const btn = form.querySelector('button[type="submit"]');
      if (btn) {
        btn.textContent = '✓ Message Sent!';
        btn.disabled = true;
        setTimeout(() => { btn.textContent = 'Send Message'; btn.disabled = false; }, 3000);
      }
    }
  });
})();

/* ---- LOGO IMG FALLBACK ---- */
document.querySelectorAll('.nav-logo img, .index-logo-wrap img').forEach(img => {
  img.addEventListener('error', function () {
    this.style.display = 'none';
    const fallback = this.nextElementSibling;
    if (fallback) fallback.style.display = 'flex';
  });
});

/* ---- BACK TO TOP ---- */
(function () {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Back to top');
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
      '<div style="font-size:2.8rem;line-height:1">🎮</div>',
      '<div style="font-size:1.5rem;font-weight:bold;margin:0.5rem 0;letter-spacing:0.03em">🐕 WOOF! 🐕</div>',
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
  document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
    const email = a.href.replace('mailto:', '').split('?')[0];
    const btn = document.createElement('button');
    btn.className = 'copy-email-btn';
    btn.setAttribute('aria-label', 'Copy email address');
    btn.title = 'Copy to clipboard';
    btn.innerHTML = clipSvg;
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      navigator.clipboard.writeText(email).then(() => {
        showToast('✓ Copied: ' + email);
        btn.textContent = '✓';
        setTimeout(() => { btn.innerHTML = clipSvg; }, 2000);
      });
    });
    a.insertAdjacentElement('afterend', btn);
  });
})();

/* ---- WHATSAPP LINKS ---- */
(function () {
  const waNums = new Set(['+385955445102', '+385955152150']);
  const waSvg = '<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>';
  document.querySelectorAll('a[href^="tel:"]').forEach(a => {
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
