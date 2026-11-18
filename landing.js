/* AINEX landing page · vanilla JS, no dependencies */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  root.classList.remove('no-js');

  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  let RM = mq.matches;
  mq.addEventListener?.('change', e => { RM = e.matches; });

  /* ---------- Year ---------- */
  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  /* ---------- Header ---------- */
  const header = $('.site-header');
  const setHH = () => root.style.setProperty('--hh', header.offsetHeight + 'px');
  setHH(); addEventListener('resize', setHH);
  const onScroll = () => header.classList.toggle('is-scrolled', scrollY > 8);
  onScroll(); addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile nav ---------- */
  const toggle = $('.nav-toggle'), nav = $('#site-nav');
  const setNav = open => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.classList.toggle('nav-open', open);
  };
  toggle.addEventListener('click', () => setNav(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setNav(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('is-open')) { setNav(false); toggle.focus(); } });

  /* ---------- Active nav link ---------- */
  if ('IntersectionObserver' in window) {
    const links = $$('.nav a[href^="#"]');
    const byId = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
    const so = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      links.forEach(l => l.removeAttribute('aria-current'));
      byId.get(en.target.id)?.setAttribute('aria-current', 'true');
    }), { rootMargin: '-45% 0px -50% 0px' });
    byId.forEach((_, id) => { const s = document.getElementById(id); if (s) so.observe(s); });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !RM) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    reveals.forEach(el => io.observe(el));
  } else reveals.forEach(el => el.classList.add('is-in'));

  /* ---------- Marquees: clone children once for a seamless loop ---------- */
  $$('[data-marquee]').forEach(track => {
    [...track.children].forEach(node => {
      const c = node.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      $$('a,button', c).forEach(x => { x.tabIndex = -1; });
      track.appendChild(c);
    });
  });

  /* ---------- Hero character background ---------- */
  const fillCharBg = () => $$('.char-bg').forEach(el => {
    const r = el.getBoundingClientRect();
    const cols = Math.ceil(r.width / 12), rows = Math.ceil(r.height / 19);
    const set = '$%#x01+-';
    let out = '';
    for (let y = 0; y < rows; y++) {
      let line = '';
      for (let x = 0; x < cols; x++) line += set[(Math.random() * set.length) | 0];
      out += line + '\n';
    }
    el.textContent = out;
  });
  fillCharBg();

  /* ---------- Hero feed highlight loop ---------- */
  const cards = $$('.feed-card');
  if (cards.length) {
    let i = 0;
    const step = () => { cards.forEach((c, j) => c.classList.toggle('is-active', j === i)); i = (i + 1) % cards.length; };
    step();
    setInterval(() => { if (!RM && !document.hidden) step(); }, 2200);
  }

  /* ---------- Counters ---------- */
  const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const counters = $$('[data-count]');
  const runCounter = el => {
    const end = parseFloat(el.dataset.count), d = +(el.dataset.decimals || 0);
    const pre = el.dataset.prefix || '', suf = el.dataset.suffix || '';
    if (RM) { el.textContent = pre + fmt(end, d) + suf; return; }
    const t0 = performance.now(), dur = 1700;
    const tick = t => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + fmt(end * e, d) + suf;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ('IntersectionObserver' in window && !RM) {
    counters.forEach(el => { el.textContent = (el.dataset.prefix || '') + fmt(0, +(el.dataset.decimals || 0)) + (el.dataset.suffix || ''); });
    const co = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { runCounter(en.target); co.unobserve(en.target); }
    }), { threshold: .5 });
    counters.forEach(el => co.observe(el));
  }

  /* ---------- Persona prompts ---------- */
  const PERSONAS = {
    clinic: {
      ask: 'I need every new-patient enquiry booked, even after hours.',
      leak: 'Calls during procedures go to voicemail, and web forms wait until morning.',
      stack: ['AI voice agent that answers and books into your calendar', 'Missed-call text-back within seconds', 'Automated reminders to cut no-shows', 'Google review requests after each visit']
    },
    roofer: {
      ask: 'I need storm leads answered before the next roofer calls them.',
      leak: 'Website, Yelp and ad leads land in different places and go cold.',
      stack: ['Booking-first estimate form', 'Yelp and web leads synced into one GHL pipeline', 'AI intake call for urgent repairs', 'Qualified jobs pushed to JobNimbus or your job system']
    },
    trades: {
      ask: 'I need new leads in my job software the second they come in.',
      leak: 'Leads sit in the CRM until someone remembers to check.',
      stack: ['CRM → ServiceM8 (or your job software) automation', 'Instant owner push notifications', 'A dedicated new-lead queue', 'Duplicate-proof client records']
    },
    agency: {
      ask: 'I need a build team I can white-label.',
      leak: 'You sell GoHighLevel, but delivery eats your whole week.',
      stack: ['White-label snapshot builds', 'Workflow and A2P setup per client', 'AI agents configured under your brand', 'Documented handover for your team']
    },
    ecommerce: {
      ask: 'I need abandoned carts and repeat buyers on autopilot.',
      leak: 'Traffic is paid for, then left without any follow-up.',
      stack: ['Meta & Google Ads with pixel + Conversions API', 'Abandoned-cart SMS and email flows', 'Post-purchase review and upsell sequences', 'Store webhooks into your CRM']
    },
    coach: {
      ask: 'I need booked discovery calls, not more DMs.',
      leak: 'Leads ask the same questions, then ghost before booking.',
      stack: ['Lead-magnet funnel and booking page', 'Appointwise agent that qualifies and books', 'Email + SMS nurture sequences', 'Pipeline stages that show who is ready']
    },
    restaurant: {
      ask: 'I need reservations confirmed without phone tag.',
      leak: 'No-shows and unconfirmed bookings cost covers every night.',
      stack: ['OpenTable → Make → GHL reservation sync', '7-day, 24-hour and same-day reminders', 'WhatsApp, SMS and email confirmations', 'Team alerts the moment a guest replies']
    }
  };
  const chips = $$('.chip[data-persona]');
  const out = $('.persona-out');
  const showPersona = key => {
    const p = PERSONAS[key]; if (!p || !out) return;
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.persona === key)));
    const apply = () => {
      $('[data-p="ask"]', out).textContent = p.ask;
      $('[data-p="leak"]', out).textContent = p.leak;
      const ul = $('[data-p="stack"]', out);
      ul.replaceChildren(...p.stack.map(t => Object.assign(document.createElement('li'), { textContent: t })));
      out.classList.remove('is-swapping');
    };
    if (RM) return apply();
    out.classList.add('is-swapping');
    setTimeout(apply, 200);
  };
  chips.forEach(c => c.addEventListener('click', () => showPersona(c.dataset.persona)));

  /* ---------- Tabs (ARIA + arrow keys) ---------- */
  $$('[role="tablist"]').forEach(list => {
    const tabs = $$('[role="tab"]', list);
    const select = (tab, focus) => {
      tabs.forEach(t => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', e => {
        const map = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 };
        if (e.key in map) { e.preventDefault(); select(tabs[map[e.key]], true); }
      });
    });
  });

  /* ---------- FAQ: one open at a time + FAQPage schema ---------- */
  const faqs = $$('.faq details');
  faqs.forEach(d => d.addEventListener('toggle', () => {
    if (d.open) faqs.forEach(o => { if (o !== d) o.open = false; });
  }));
  if (faqs.length) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'FAQPage',
      mainEntity: faqs.map(d => ({
        '@type': 'Question', name: $('summary', d).textContent.trim(),
        acceptedAnswer: { '@type': 'Answer', text: $('.faq-a', d).textContent.trim() }
      }))
    });
    document.head.appendChild(s);
  }

  /* ---------- Missed-lead calculator ---------- */
  const calc = $('#calc');
  if (calc) {
    const money = n => '$' + Math.round(n).toLocaleString('en-US');
    const upd = () => {
      const missed = +$('#c-missed').value, rate = +$('#c-rate').value, val = +$('#c-value').value;
      $('#c-missed-v').textContent = missed;
      $('#c-rate-v').textContent = rate + '%';
      $('#c-value-v').textContent = money(val);
      const month = missed * 4.33 * (rate / 100) * val;
      $('#c-month').textContent = money(month);
      $('#c-year').textContent = money(month * 12);
    };
    calc.addEventListener('input', upd);
    upd();
  }

  /* ---------- Lead form (GHL webhook, mailto fallback) ---------- */
  const form = $('#lead-form');
  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const status = $('.form-status', form);
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.website) return; // honeypot
      delete data.website;
      const btn = $('[type="submit"]', form);
      btn.disabled = true;
      status.textContent = 'Sending…';
      try {
        const endpoint = form.dataset.endpoint;
        if (!endpoint) throw new Error('No endpoint set');
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...data, source: 'ainex-landing', page: location.href })
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        form.reset();
        status.textContent = 'Thanks! We read every message and usually reply within 24 hours.';
      } catch (err) {
        const body = encodeURIComponent(Object.entries(data).map(([k, v]) => `${k}: ${v}`).join('\n'));
        status.innerHTML = '';
        const a = document.createElement('a');
        a.href = `mailto:${form.dataset.fallback}?subject=${encodeURIComponent('Project enquiry')}&body=${body}`;
        a.textContent = 'email it to us instead';
        status.append("Couldn't send automatically. Please ", a, '.');
      } finally {
        btn.disabled = false;
      }
    });
  }
  /* ---------- Infinite review wall ---------- */
  const wallPanel = $('#wallPanel'), wallSource = $('#wallSource');
  if (wallPanel && wallSource) {
    const cardsSrc = $$('.rcard', wallSource);
    const mqOne = matchMedia('(max-width: 760px)');
    const SPEED = 28; // px per second

    const buildWall = () => {
      $('.wall-cols', wallPanel)?.remove();
      const colCount = mqOne.matches ? 1 : 2;
      const wrap = document.createElement('div');
      wrap.className = 'wall-cols';
      wrap.style.gridTemplateColumns = `repeat(${colCount}, 1fr)`;
      wrap.setAttribute('aria-hidden', 'true'); // originals in #wallSource stay readable for screen readers

      const cols = Array.from({ length: colCount }, (_, i) => {
        const col = document.createElement('div');
        col.className = 'wall-col' + (i % 2 ? ' wall-col--down' : '');
        const track = document.createElement('div');
        track.className = 'wall-track';
        col.appendChild(track);
        wrap.appendChild(col);
        return track;
      });

      // Deal cards across columns (staggered so columns don't mirror each other)
      cardsSrc.forEach((card, i) => cols[i % colCount].appendChild(card.cloneNode(true)));
      if (colCount > 1 && cardsSrc.length > 1) {
        // give each column every card at least once, offset by one
        cardsSrc.forEach((card, i) => cols[(i + 1) % colCount].appendChild(card.cloneNode(true)));
      }

      wallPanel.appendChild(wrap);
      wallPanel.classList.add('is-live');

      if (RM) { wallPanel.classList.add('is-static'); return; }

      // Fill each track until one half is taller than the panel, then duplicate for a seamless loop
      const panelH = wallPanel.clientHeight;
      cols.forEach(track => {
        const base = [...track.children];
        let guard = 0;
        while (track.scrollHeight < panelH + 40 && guard++ < 12) {
          base.forEach(n => track.appendChild(n.cloneNode(true)));
        }
        [...track.children].forEach(n => track.appendChild(n.cloneNode(true)));
        track.style.setProperty('--dur', (track.scrollHeight / 2 / SPEED).toFixed(1) + 's');
      });

      $$('a,button', wrap).forEach(x => { x.tabIndex = -1; });
    };

    buildWall();
    mqOne.addEventListener?.('change', buildWall);

    // Tap to pause on touch screens
    wallPanel.addEventListener('click', () => wallPanel.classList.toggle('is-paused'));
  }

  /* ---------- Photos: fall back to initials if an image is missing ---------- */
  $$('.member-photo img, .t-avatar img, .stat-faces img, .rcard-av img, .agent-av img').forEach(img => {
    const fallback = () => {
      const name = (img.alt.split(',')[0] || '').trim();
      const span = document.createElement('span');
      span.className = img.dataset.fallback || 'member-initials';
      span.setAttribute('aria-hidden', 'true');
      span.textContent = name.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
      img.replaceWith(span);
    };
    if (img.complete && img.naturalWidth === 0) fallback();
    else img.addEventListener('error', fallback);
  });

  // Hide review images that haven't been added yet
  $$('.rcard-img').forEach(img => img.addEventListener('error', () => img.remove()));

  // Hide the agent team photo until it exists (the placeholder shows instead)
  $$('.agents-photo img').forEach(img => {
    const kill = () => img.remove();
    if (img.complete && img.naturalWidth === 0) kill();
    else img.addEventListener('error', kill);
  });
  /* ---------- Agent Office: click to launch the live embed ---------- */
  const launch = $('.agents-launch');
  if (launch) {
    launch.addEventListener('click', () => {
      const screen = launch.closest('.agents-screen');
      const frame = document.createElement('iframe');
      frame.src = launch.dataset.src;
      frame.title = 'Ainex Agent Office live demo';
      frame.allow = 'fullscreen; clipboard-write';
      frame.setAttribute('allowfullscreen', '');
      screen.querySelector('video')?.pause();
      screen.replaceChildren(frame);
      screen.classList.add('is-live');
      screen.closest('.agents-video')?.classList.add('is-live');
      screen.closest('.agents-grid')?.classList.add('is-live');
      screen.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'center' });
      frame.focus();
    });
  }
  /* ---------- Reel videos: play only while visible ---------- */
  const reels = $$('video[data-autoplay]');
  if (reels.length) {
    if (RM || !('IntersectionObserver' in window)) {
      reels.forEach(v => { v.controls = true; v.preload = 'metadata'; });
    } else {
      const vo = new IntersectionObserver(entries => entries.forEach(en => {
        const v = en.target;
        if (en.isIntersecting) { v.play().catch(() => { v.controls = true; }); }
        else v.pause();
      }), { threshold: .35 });
      reels.forEach(v => vo.observe(v));
    }
  }

  /* ---------- Footer ASCII art: canvas text sampling ---------- */
  const ascii = $('#ascii-art');
  if (ascii) {
    const word = ascii.dataset.word || 'AINEX';
    const chars = (ascii.dataset.chars || 'x0').split('');
    const hot = '#@%&';
    const pick = set => set[(Math.random() * set.length) | 0];
    let grid = [], filled = [], cw = 8, lh = 14, lastW = 0, visible = false;

    const measure = () => {
      const s = document.createElement('span');
      s.textContent = 'x'.repeat(50);
      s.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
      ascii.appendChild(s);
      cw = s.getBoundingClientRect().width / 50;
      s.remove();
      lh = parseFloat(getComputedStyle(ascii).lineHeight) || cw * 1.8;
    };
    const render = () => { ascii.textContent = grid.map(r => r.join('')).join('\n'); };

    const build = () => {
      const w = ascii.clientWidth;
      if (!w) return;
      lastW = w;
      measure();
      const cols = Math.max(24, Math.floor(w / cw));
      const sy = cw / lh;
      const fam = getComputedStyle(root).getPropertyValue('--font-display').trim() || 'sans-serif';
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.font = `700 100px ${fam}`;
      const fs = 100 * (cols * 0.97) / ctx.measureText(word).width;
      ctx.font = `700 ${fs}px ${fam}`;
      const m = ctx.measureText(word);
      const asc = m.actualBoundingBoxAscent || fs * 0.72;
      const desc = m.actualBoundingBoxDescent || 0;
      const pad = 1;
      const rows = Math.ceil((asc + desc) * sy) + pad * 2;
      c.width = cols; c.height = rows;
      ctx.font = `700 ${fs}px ${fam}`;
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.setTransform(1, 0, 0, sy, 0, 0);
      ctx.fillText(word, cols / 2, (pad + asc * sy) / sy);
      const px = ctx.getImageData(0, 0, cols, rows).data;
      grid = []; filled = [];
      for (let y = 0; y < rows; y++) {
        const row = [];
        for (let x = 0; x < cols; x++) {
          if (px[(y * cols + x) * 4 + 3] > 110) { row.push(pick(chars)); filled.push([y, x]); }
          else row.push(' ');
        }
        grid.push(row);
      }
      render();
    };

    setInterval(() => {
      if (!visible || RM || !filled.length || document.hidden) return;
      for (let k = 0; k < Math.min(26, filled.length); k++) {
        const [y, x] = filled[(Math.random() * filled.length) | 0];
        grid[y][x] = pick(chars);
      }
      render();
    }, 120);

    ascii.parentElement.addEventListener('pointermove', e => {
      if (RM || !grid.length) return;
      const r = ascii.getBoundingClientRect();
      const padTop = parseFloat(getComputedStyle(ascii).paddingTop) || 0;
      const cx = Math.floor((e.clientX - r.left) / cw);
      const cy = Math.floor((e.clientY - r.top - padTop) / lh);
      for (let y = cy - 2; y <= cy + 2; y++) {
        for (let x = cx - 4; x <= cx + 4; x++) {
          if (grid[y]?.[x] && grid[y][x] !== ' ') grid[y][x] = pick(hot);
        }
      }
      render();
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(ascii);
    }

    const ready = document.fonts
      ? Promise.all([document.fonts.load('700 100px "Inria Sans"'), document.fonts.load('500 14px "JetBrains Mono"')]).catch(() => {})
      : Promise.resolve();
    ready.then(build);

    let t;
    const ro = new ResizeObserver(() => {
      clearTimeout(t);
      t = setTimeout(() => { if (Math.abs(ascii.clientWidth - lastW) > 4) build(); fillCharBg(); }, 200);
    });
    ro.observe(ascii);
  }
})();