'use strict';

(() => {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const setupStatement = () => {
    const section = document.querySelector('.top-statement');
    const stage = section?.querySelector('.top-statement-stage');
    const content = stage?.querySelector('.top-container');
    if (!content) return;

    const lines = [...content.children];
    const header = document.querySelector('.header');
    let scheduled = 0;
    let distance = 0;
    let offset = 0;

    const render = () => {
      scheduled = 0;
      if (!section.classList.contains('top-statement-scroll')) return;
      const progress = Math.max(
        0,
        Math.min(1, (offset - section.getBoundingClientRect().top) / distance),
      );
      lines.forEach((line, index) => {
        // Leave a short pause after each reveal, and after the final sentence.
        const reveal = Math.max(0, Math.min(1, progress * (lines.length + 0.5) - index));
        line.style.setProperty('--statement-opacity', String(reveal));
        line.style.setProperty('--statement-shift', `${(1 - reveal) * 18}px`);
      });
    };
    const schedule = () => {
      if (!scheduled) scheduled = requestAnimationFrame(render);
    };
    const measure = () => {
      const headerHeight = header?.getBoundingClientRect().height || 0;
      offset = 0;
      const available = window.innerHeight;
      section.classList.toggle('top-statement-scroll', !preference.matches && available >= 420);
      const enabled = section.classList.contains('top-statement-scroll');
      stage.classList.toggle('top-dark', enabled);
      if (!enabled) return;
      // Reserve space for the shared header and the mobile controls below the copy.
      section.style.setProperty('--statement-offset', `${offset}px`);
      section.style.setProperty('--statement-header', `${headerHeight}px`);
      section.style.setProperty('--statement-height', `${available}px`);
      if (content.scrollHeight + headerHeight + 128 > available) {
        section.classList.remove('top-statement-scroll');
        stage.classList.remove('top-dark');
        return;
      }
      distance = Math.round(Math.max(240, available * 0.55) * (lines.length + 0.5));
      section.style.setProperty('--statement-distance', `${distance}px`);
      render();
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('pageshow', measure);
    preference.addEventListener('change', measure);
    document.fonts?.ready.then(measure);
    measure();
  };
  const startMotion = () => {
    setupStatement();
    if (!('IntersectionObserver' in window)) return;

    const pending = new Set();
    const counters = new Map();
    let frame = 0;

    // Prepare each element before observing it so visible content never flashes away.
    // Individual translate also leaves card hover transforms independent of entrances.
    const entrances = new IntersectionObserver(
      (entries) => {
        const groups = new Map();
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          const index = groups.get(target.parentElement) || 0;
          groups.set(target.parentElement, index + 1);
          const delay = target.matches('.top-hero-copy, .guide-hero-copy')
            ? 180
            : Math.min(index * 55, 165);
          target.style.setProperty('--reveal-delay', `${delay}ms`);
          target.classList.remove('top-reveal-pending');
          pending.delete(target);
          entrances.unobserve(target);
        });
      },
      { rootMargin: '0px 0px -24px 0px', threshold: 0 },
    );

    if (!preference.matches) {
      document
        .querySelectorAll(
          [
            '.top-hero-copy',
            '.top-hero-visual',
            'body:not(.sub-page) main > section:not(.top-hero, .top-statement) h2',
            'main > section .top-eyebrow',
            '.top-metric',
            '.top-solution-list > li',
            '.top-concern-grid > li',
            '.top-method-grid > li',
            '.top-benefit-grid > li',
            '.top-industry-card',
            '.top-steps > li',
            '.top-faq-list > details',
            '.top-future',
            '.sub-page .page-hero-copy',
            '.sub-page .page-hero-visual',
            '.sub-page main > .section > .container > h2',
            '.sub-page main > .section > .container > .eyebrow',
            '.sub-page main .card',
            '.sub-page main .news-item',
            '.sub-page main .faq',
            '.sub-page main .image-section-media',
            '.sub-page .shared-service-card',
            '.sub-page .shared-hero-media',
            '.sub-page main .image-section-copy',
            '.sub-page main .check',
            '.page-guide .guide-hero-copy',
            '.page-guide .guide-concern-grid > li',
            '.page-guide .guide-benefit',
            '.page-guide .guide-case',
            '.page-guide .guide-step-grid > li',
            '.page-guide .guide-service-card',
            '.page-guide .guide-preview figure',
          ].join(','),
        )
        .forEach((element) => {
          element.classList.add('top-reveal', 'top-reveal-pending');
          pending.add(element);
          entrances.observe(element);
        });
    }

    const atmosphere = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        target.classList.toggle('top-motion-visible', isIntersecting);
      });
    });
    document
      .querySelectorAll(
        '.top-hero, .top-dark, .top-results, .sub-page .page-hero, .sub-page .final-cta.navy, .page-guide .guide-preview',
      )
      .forEach((section) => atmosphere.observe(section));

    const tick = (now) => {
      counters.forEach((counter, target) => {
        if (counter.start === null) counter.start = now;
        const progress = Math.min((now - counter.start) / 1600, 1);
        const eased = 1 - (1 - progress) ** 3;
        counter.display.textContent = (counter.value * eased).toFixed(counter.decimals);
        if (progress === 1) {
          counter.display.textContent = counter.original;
          counters.delete(target);
        }
      });
      frame = counters.size ? requestAnimationFrame(tick) : 0;
    };
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(({ target, isIntersecting }) => {
          if (!isIntersecting) return;
          const counter = target._topCounter;
          if (!preference.matches && counter) {
            counter.display.textContent = (0).toFixed(counter.decimals);
            counters.set(target, counter);
            if (!frame) frame = requestAnimationFrame(tick);
          }
          countObserver.unobserve(target);
        });
      },
      { threshold: 0.6 },
    );

    document.querySelectorAll('.top-gradient-number').forEach((element) => {
      if (element.closest('.top-hero-copy')) return;
      const number = [...element.childNodes].find(
        (node) => node.nodeType === Node.TEXT_NODE && /^\s*\d+(\.\d+)?\s*$/.test(node.textContent),
      );
      if (!number) return;
      const original = number.textContent.trim();
      const visual = document.createElement('span');
      visual.className = 'top-counter';
      visual.setAttribute('aria-hidden', 'true');
      const measure = document.createElement('span');
      measure.className = 'top-counter-measure';
      measure.textContent = original;
      const display = document.createElement('span');
      display.textContent = original;
      visual.append(measure, display);
      const accessible = document.createElement('span');
      accessible.className = 'top-counter-accessible';
      accessible.textContent = original;
      number.replaceWith(visual, accessible);
      element._topCounter = {
        original,
        value: Number(original),
        decimals: (original.split('.')[1] || '').length,
        display,
        start: null,
      };
      countObserver.observe(element);
    });

    const finish = () => {
      pending.forEach((element) => element.classList.remove('top-reveal-pending'));
      pending.clear();
      entrances.disconnect();
      countObserver.disconnect();
      cancelAnimationFrame(frame);
      frame = 0;
      counters.forEach((counter) => (counter.display.textContent = counter.original));
      counters.clear();
    };
    preference.addEventListener('change', () => {
      if (preference.matches) finish();
    });
    // Restore final values when returning from the browser's back/forward cache.
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) finish();
    });
  };

  const loader = document.querySelector('.top-loader');
  if (!loader || preference.matches) {
    startMotion();
    return;
  }
  loader.hidden = false;
  const delay = (duration) => new Promise((resolve) => setTimeout(resolve, duration));
  const loaded =
    document.readyState === 'complete'
      ? Promise.resolve()
      : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }));
  const hero = document.querySelector('.top-hero-visual img');
  const ready = Promise.allSettled([loaded, document.fonts?.ready, hero?.decode?.()]);
  // A bounded wait prevents slow fonts or images from holding the page closed.
  Promise.all([Promise.race([ready, delay(3000)]), delay(2800)])
    .then(() => {
      loader.classList.add('top-loader-leaving');
      return delay(500);
    })
    .finally(() => {
      loader.hidden = true;
      startMotion();
    });
  preference.addEventListener('change', () => {
    if (preference.matches) loader.hidden = true;
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) loader.hidden = true;
  });
})();
