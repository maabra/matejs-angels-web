/* Keyboard-complete profile tabs and truthful email preparation. */
(() => {
  document.querySelectorAll('.tabs-nav').forEach((nav, groupIndex) => {
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', siteLabel('Podaci o psu', 'Dog records'));
    const tabs = [...nav.querySelectorAll('.tab-btn')];
    const sync = () => tabs.forEach(tab => {
      const active = tab.classList.contains('active');
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    tabs.forEach((tab, index) => {
      const panel = nav.closest('.dog-tabs')?.querySelector(`#tab-${tab.dataset.tab}`);
      if (!panel) return;
      tab.id = `profile-tab-${groupIndex}-${index}`;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.tabIndex = 0;
      tab.addEventListener('click', sync);
      tab.addEventListener('keydown', event => {
        let next;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== undefined) { event.preventDefault(); tabs[next].click(); tabs[next].focus(); }
      });
    });
    sync();
  });
  const form = document.querySelector('#email-composer');
  if (form) {
    const status = form.querySelector('[role="status"]');
    const draft = () => {
      const values = new FormData(form);
      return `Name: ${values.get('name')}\nEmail: ${values.get('email')}\n\n${values.get('message')}`;
    };
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const subject = form.querySelector('[name="subject"]').value.trim();
      window.location.href = `mailto:sanjaimatej@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft())}`;
      status.textContent = siteLabel('Otvara se vaš program za e-poštu. Pregledajte poruku i pošaljite je ondje. Ako se ništa ne otvori, kopirajte tekst i pošaljite ga na sanjaimatej@gmail.com. Poruka još nije poslana.', 'Your email app is opening. Review and send the message there. If nothing opens, copy the draft and email sanjaimatej@gmail.com. The message has not been sent yet.');
    });
    form.querySelector('[data-copy-draft]').addEventListener('click', async () => {
      if (!form.reportValidity()) return;
      try {
        await navigator.clipboard.writeText(draft());
        status.textContent = siteLabel('Tekst je kopiran. Zalijepite ga u svoju e-poštu i pošaljite na sanjaimatej@gmail.com.', 'Draft copied. Paste it into your email app and send it to sanjaimatej@gmail.com.');
      } catch {
        status.textContent = siteLabel('Kopiranje nije uspjelo. Označite tekst poruke i kopirajte ga ručno.', 'Copying was unavailable. Select your message and copy it manually.');
      }
    });
  }
  document.querySelectorAll('.home-carousel').forEach(carousel => {
    const slides = [...carousel.querySelectorAll('.home-carousel-slides img')];
    const count = carousel.querySelector('.home-carousel-count');
    const toggle = carousel.querySelector('[data-carousel-pause]');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let index = 0;
    let paused = motion.matches;
    let timer;
    const show = next => {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => { slide.hidden = i !== index; });
      count.textContent = `${index + 1} / ${slides.length}`;
    };
    const sync = () => {
      clearInterval(timer);
      toggle.setAttribute('aria-label', paused ? toggle.dataset.play : toggle.dataset.pause);
      toggle.textContent = paused ? '▶' : 'Ⅱ';
      if (!paused && !document.hidden && !carousel.matches(':hover') && !carousel.contains(document.activeElement)) {
        timer = setInterval(() => show(index + 1), 6000);
      }
    };
    carousel.querySelectorAll('[data-slide]').forEach(button => button.addEventListener('click', () => {
      show(index + Number(button.dataset.slide));
      sync();
    }));
    toggle.addEventListener('click', () => { paused = !paused; sync(); });
    ['mouseenter', 'mouseleave', 'focusin'].forEach(event => carousel.addEventListener(event, sync));
    carousel.addEventListener('focusout', () => setTimeout(sync, 0));
    document.addEventListener('visibilitychange', sync);
    motion.addEventListener('change', () => { paused = motion.matches; sync(); });
    sync();
  });
})();
