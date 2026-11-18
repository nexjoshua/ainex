/* =====================================================================
   site.js — renders data.js, theme toggle, animations, lightbox.
===================================================================== */
(() => {
  'use strict';
  const S = window.SITE;
  if (!S || !window.gsap || !window.ScrollTrigger) { document.documentElement.classList.remove('js'); return; }

  /* Fix any old "../" paths in data.js so everything loads from this folder */
  (function fixPaths(o) {
    for (const k in o) {
      const v = o[k];
      if (typeof v === 'string' && v.startsWith('../')) o[k] = './' + v.slice(3);
      else if (v && typeof v === 'object') fixPaths(v);
    }
  })(S);

  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const pad = n => String(n).padStart(2, '0');
  const ext = u => /^https?:/.test(u) ? ' target="_blank" rel="noopener"' : '';
  const tags = (a = []) => a.length ? `<ul class="tags">${a.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '';
  const steps = (a = [], numbered = true) => `<ol class="steps">${a.map((s, i) => `<li><span>${numbered ? pad(i + 1) : '—'}</span><p>${md(s)}</p></li>`).join('')}</ol>`;
  const fill = (sel, html) => { const el = $(sel); if (el) el.innerHTML = html; return el; };
  const num = o => o.n != null
    ? `<strong data-count="${o.n}" data-dec="${o.dec || 0}" data-pre="${o.pre || ''}" data-suf="${o.suf || ''}">${o.pre || ''}${o.n}${o.suf || ''}</strong>`
    : `<strong>${esc(o.t)}</strong>`;

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* =========================================================
     1. RENDER
  ========================================================= */
  $$('[data-socials]').forEach(el => { el.innerHTML = S.socials.map(s => `<a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.name}">${s.svg}</a>`).join(''); });

  const LOGOS = S.logos || {};
  $$('[data-tools]').forEach(el => {
    const row = S.tools.map(t => LOGOS[t]
      ? `<span class="mq-item"><img src="./images/logos/${LOGOS[t]}.png" alt="${esc(t)}" onerror="this.replaceWith(this.alt)"></span>`
      : `<span class="mq-item">${esc(t)}</span>`).join('');
    el.innerHTML = `<div class="marquee-track"><div>${row}</div><div aria-hidden="true">${row}</div></div>`;
  });

  /* hero: 3D MacBook playing the website videos (from S.recent) */
  const HERO = [
    { src: S.recent.feature.desktop, label: 'nexjoshua.github.io/demo-stove', cap: S.recent.feature.t, poster: '' },
    ...S.recent.items.map(r => ({ src: r.video, label: r.domain, cap: r.t, poster: r.poster || '' })),
  ];
  fill('#heroSlider', `
    <div class="hm-scene"><div class="hm-mac" id="hmMac">
      <div class="hm-lid">
        <span class="hm-cam"></span>
        <div class="hm-screen">
          <span class="hm-bar"><i></i><i></i><i></i><em id="heroUrl">${esc(HERO[0].label)}</em></span>
          <div class="hm-view">
            ${HERO.map((h, i) => `<video class="hm-vid${i ? '' : ' is-on'}" data-src="${h.src}"${h.poster ? ` poster="${h.poster}"` : ''} muted playsinline preload="none"></video>`).join('')}
            <span class="hm-glare"></span>
          </div>
        </div>
      </div>
      <div class="hm-deck"><i class="hm-kb"></i><i class="hm-tp"></i><i class="hm-lip"></i></div>
    </div></div>
    <i class="hm-shadow"></i>
    <div class="hm-dots" id="hmDots">${HERO.map((h, i) => `<button type="button" aria-label="Show ${esc(h.cap)}"${i ? '' : ' class="is-on"'}><i></i></button>`).join('')}</div>`);

  fill('#results-list', S.results.map(o => `<li class="result rv">${num(o)}<span>${esc(o.l)}</span><small>${esc(o.sub)}</small></li>`).join(''));
  fill('#stats', S.stats.map(o => `<li class="rv">${num(o)}<span>${esc(o.l)}</span></li>`).join(''));
  fill('#skills', S.skills.map(k => `<li class="card rv"><span class="code">${esc(k.code)}</span><h4>${esc(k.t)}</h4><p>${esc(k.d)}</p>${tags(k.tags)}</li>`).join(''));

  fill('#servicesList', S.services.map((s, i) => `
    <details class="svc" id="svc-${s.id}"${i === 0 ? ' open' : ''}>
      <summary><span class="svc-num">${pad(i + 1)} / ${esc(s.code)}</span><h3>${esc(s.t)}${s.live ? '<span class="live-pill"><i></i>Live 24/7</span>' : ''}</h3><span class="svc-plus" aria-hidden="true"></span></summary>
      <div class="svc-body"><p>${esc(s.d)}</p><div><ul class="ticks">${s.items.map(x => `<li>${md(x)}</li>`).join('')}</ul>${tags(s.tags)}${s.link ? `<a class="link" href="${s.link.u}">${esc(s.link.t)}</a>` : ''}</div></div>
    </details>`).join(''));
  const sel = $('#f-service');
  if (sel) S.services.forEach(s => sel.insertAdjacentHTML('beforeend', `<option>${esc(s.t)}</option>`));

  fill('#ncRail', S.ncScreens.map(s => `<figure class="nc-screen" data-lb="${s.img}" data-lb-cap="${esc(s.t + ' — ' + s.d)}" data-cursor="View"><div class="phone"><img src="${s.img}" alt="${esc(s.t)}" loading="lazy" draggable="false"></div><figcaption><strong>${esc(s.t)}</strong><span>${esc(s.d)}</span></figcaption></figure>`).join(''));
  fill('#apps', S.apps.map(a => `<figure class="app" data-lb="${a.img}" data-lb-cap="${esc(a.t)}" data-cursor="View"><div class="phone"><img src="${a.img}" alt="Custom app — ${esc(a.t)}" loading="lazy"></div><figcaption>${esc(a.t)}</figcaption></figure>`).join(''));

  const L = S.legacy;
  fill('#legacy', `
    <div class="head"><p class="kicker">Where it started</p><h3 class="split">The first funnel &amp; the internal dashboard.</h3><p>End-to-end inbound lead automation (custom HTML form, webhook architecture, CRM pipeline strategy, GHL workflow automation) plus Google &amp; Meta Ads with custom creatives. Then a password-protected internal tool with Supabase auth and a completely different view for owners versus inspectors.</p></div>
    ${steps(L.steps)}
    <div class="grid-4" data-lb-group>${L.shots.map(s => `<figure class="shot wipe" data-lb="${s.img}" data-lb-cap="${esc(s.t)}" data-cursor="View"><img src="${s.img}" alt="${esc(s.t)}" loading="lazy"><figcaption><strong>${esc(s.t)}</strong></figcaption></figure>`).join('')}</div>
    <div class="grid-3" data-lb-group>${L.dash.map(c => `<figure class="mini rv" data-lb="${c.img}" data-lb-cap="${esc(c.t)}" data-cursor="View"><img src="${c.img}" alt="North City Roofing ${esc(c.t)}" loading="lazy"><figcaption><strong>${esc(c.t)}</strong><span>${esc(c.d)}</span></figcaption>${tags(c.tags)}</figure>`).join('')}</div>
    <p class="note">${md(L.note)}</p>${tags(L.tags)}`);

  const NARR = ['It all started with|*one client*.', 'Then I *build* it|and *ship* it.', 'Even the posting|runs *itself*.', 'And the phone|answers *itself*.'];
  fill('#chapters', S.chapters.map((c, i) => `
    <article class="chapter${i % 2 ? ' flip' : ''}" id="${c.id}" data-narrate="${NARR[i] || NARR[0]}">
      <div class="chapter-media"><span class="chapter-num">${pad(i + 1)}</span><figure class="frame wipe" data-lb="${c.img}" data-lb-cap="${esc(c.t)}" data-cursor="View"><img src="${c.img}" alt="${esc(c.alt)}" loading="lazy"></figure></div>
      <div class="chapter-copy">
        <p class="kicker">${esc(c.kicker)}</p><h3 class="split">${esc(c.t)}</h3><p class="lead">${esc(c.d)}</p>${tags(c.tags)}${steps(c.steps, c.numbered !== false)}
        ${c.cards ? `<div class="mini-cards" data-lb-group>${c.cards.map(k => `<figure class="mini" data-lb="${k.img}" data-lb-cap="${esc(k.t)}" data-cursor="View"><img src="${k.img}" alt="${esc(k.t)}" loading="lazy"><figcaption><strong>${esc(k.t)}</strong><span>${esc(k.d)}</span></figcaption></figure>`).join('')}</div>` : ''}
        ${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
        <div class="actions">${c.links.map(l => `<a class="link" href="${l.u === '#contact' ? '#' : l.u}"${ext(l.u)}${l.u === '#contact' ? ' data-hire' : ''}>${esc(l.t)}</a>`).join('')}</div>
      </div>
    </article>`).join(''));

  fill('#teamOps', S.teamOps.map((t, i) => `<li class="card rv"><span class="code">${pad(i + 1)}</span><h4>${esc(t.t)}</h4><p>${esc(t.d)}</p></li>`).join(''));

  const gal = S.gallery || [];
  if (gal.length) fill('#galleryGrid', gal.map(g => `<figure class="rv" data-lb="${encodeURI(g.img)}" data-lb-cap="${esc(g.t)}" data-cursor="View"><img src="${encodeURI(g.img)}" alt="${esc(g.t)}" loading="lazy"><figcaption>${esc(g.t)}</figcaption></figure>`).join(''));
  else { const lib = $('#automation-library'); if (lib) lib.remove(); }

  fill('#w3dScreen', S.web3d.map((v, i) => `<video class="w3d-video${i ? '' : ' is-on'}" data-src3d="${v.src}" muted playsinline preload="none"></video>`).join('') + `<span class="w3d-badge"><i></i><b id="w3dBadge">${esc(S.web3d[0].name)}</b></span>`);
  fill('#w3dTabs', S.web3d.map((v, i) => `<button class="w3d-tab${i ? '' : ' is-on'}" role="tab" aria-selected="${!i}"><span>${pad(i + 1)}</span><strong>${esc(v.name)}</strong><small>${esc(v.sub)}</small><i><b></b></i></button>`).join(''));

  const F = S.recent.feature;
  fill('#hTrack', `
    <article class="h-card h-feature">
      <div class="h-devices">
        <figure class="mac" data-lb="${F.desktop}" data-lb-type="video" data-lb-cap="${esc(F.t)} — desktop" data-cursor="Play"><div class="mac-lid"><div class="mac-screen"><video data-src="${F.desktop}" muted loop playsinline preload="none"></video></div></div><div class="mac-base"></div></figure>
        <div class="phone h-phone" data-lb="${F.mobile}" data-lb-type="video" data-lb-cap="${esc(F.t)} — mobile" data-cursor="Play"><video data-src="${F.mobile}" muted loop playsinline preload="none"></video></div>
      </div>
      <div class="h-copy"><p class="kicker">${esc(F.kind)}</p><h3>${esc(F.t)}</h3><p>${esc(F.d)}</p>${tags(F.tags)}<a class="link" href="${F.url}" target="_blank" rel="noopener">Visit live demo →</a></div>
    </article>` + S.recent.items.map(r => `
    <article class="h-card">
      <div class="browser" data-lb="${r.video}" data-lb-type="video" data-lb-cap="${esc(r.t)}" data-cursor="Play"><div class="browser-bar"><i></i><i></i><i></i><em>${esc(r.domain)}</em></div><div class="browser-screen"><video data-src="${r.video}"${r.poster ? ` poster="${r.poster}"` : ''} muted loop playsinline preload="none"></video></div></div>
      <div class="h-copy"><p class="kicker">${esc(r.kind)}</p><h3>${esc(r.t)}</h3><p>${esc(r.d)}</p><a class="link" href="${r.url}" target="_blank" rel="noopener">Visit live site →</a></div>
    </article>`).join(''));

  const CATS = { client: 'Client website', funnel: 'Sales funnel', personal: 'Personal & agency', demo: 'Demo build' };
  fill('#siteRail', S.sites.map(s => `
    <article class="site" data-cat="${s.cat}">
      <a class="site-thumb" href="${s.url}" target="_blank" rel="noopener" data-cursor="Open" draggable="false">${s.video ? `<video data-src="${s.video}" muted loop playsinline preload="none"></video>` : `<img src="${s.img}" alt="${esc(s.t)} website" loading="lazy" draggable="false">`}</a>
      <div class="site-body"><p class="kicker">${CATS[s.cat]}</p><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p>${tags(s.tags)}<a class="link" href="${s.url}" target="_blank" rel="noopener">Visit →</a></div>
    </article>`).join(''));

  fill('#timeline', S.timeline.map(t => `<li class="tl-item rv"><h3>${t.u ? `<a href="${t.u}" target="_blank" rel="noopener">${esc(t.t)}</a>` : esc(t.t)}</h3><span class="tl-meta">${esc(t.m)}</span><p>${esc(t.d)}</p></li>`).join(''));
  fill('#regasList', S.regas.map((r, i) => `<li class="card rv"><span class="code">${pad(i + 1)}</span><h4>${esc(r.t)}</h4><p>${esc(r.d)}</p></li>`).join(''));
  fill('#faqList', S.faq.map((f, i) => `<details class="faq-item rv"${i === 0 ? ' open' : ''}><summary><span class="faq-n">${pad(i + 1)}</span><h3>${esc(f.q)}</h3><span class="svc-plus" aria-hidden="true"></span></summary><p>${esc(f.a)}</p></details>`).join(''));
  fill('#media', S.media.map(m => `<figure class="media rv" data-lb="${m.src}" data-lb-cap="${esc(m.t)}" data-cursor="${m.video ? 'Play' : 'View'}"><div class="media-frame">${m.video ? `<video data-src="${m.src}" muted loop playsinline preload="none"></video>` : `<img src="${m.src}" alt="Ainex X mark">`}</div><figcaption><strong>${esc(m.t)}</strong>${esc(m.d)}</figcaption></figure>`).join(''));

  /* make every "view" target keyboard-accessible */
  $$('[data-lb]').forEach(el => { if (!el.matches('a, button')) { el.tabIndex = 0; el.setAttribute('role', 'button'); } });

  /* =========================================================
     2. SMOOTH SCROLL
  ========================================================= */
  const lenis = RM ? null : new Lenis({ duration: 1.1, smoothWheel: true });
  if (lenis) {
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const goTo = (target, tries = 0) => {
    const el = typeof target === 'string' ? $(target) : target;
    if (!el) return;
    if (tries === 0) {
      // load every lazy image above the target first, so the page stops growing mid-scroll
      $$('img[loading="lazy"]').forEach(im => {
        if (im.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) im.loading = 'eager';
      });
    }
    if (!lenis) { el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' }); return; }
    lenis.scrollTo(el, {
      offset: -10,
      duration: tries ? .6 : 1.4,
      onComplete: () => {
        // if anything above it changed height on the way, land exactly on it
        const miss = el.getBoundingClientRect().top - 10;
        if (Math.abs(miss) > 6 && tries < 3) goTo(el, tries + 1);
      },
    });
  };
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute('data-hire')) return;
    const id = a.getAttribute('href');
    if (id.length > 1 && $(id)) { e.preventDefault(); goTo(id); }
  });

  /* =========================================================
     3. LOADER
  ========================================================= */
  (() => {
    const el = $('#loader'), n = $('#loaderCount');
    if (!el) { document.body.classList.add('is-ready'); return; }
    const vid = RM ? null : $('video.loader-logo', el);
    document.body.classList.add('is-loading');
    lenis && lenis.stop();
    const t0 = performance.now(), D = RM ? 300 : 2000, MAX = 7000;
    let done = false, useVid = !!vid;
    const finish = () => {
      if (done) return; done = true;
      n.textContent = '100';
      el.classList.add('is-done');
      document.body.classList.remove('is-loading');
      document.body.classList.add('is-ready');
      lenis && lenis.start();
      setTimeout(() => { vid && vid.pause(); el.remove(); ScrollTrigger.refresh(); }, 1100);
    };
    if (vid) {
      vid.addEventListener('ended', finish);
      vid.addEventListener('error', () => { useVid = false; });
      vid.play().catch(() => { useVid = false; });
      setTimeout(finish, MAX);
    }
    const tick = now => {
      if (done) return;
      const p = useVid
        ? (vid.duration ? Math.min(vid.currentTime / vid.duration, 1) : 0)
        : Math.min((now - t0) / D, 1);
      n.textContent = Math.round((useVid ? p : 1 - Math.pow(1 - p, 3)) * 100);
      if (!useVid && p >= 1) return finish();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    el.addEventListener('click', finish);
  })();

  /* =========================================================
     4. CURSOR
  ========================================================= */
  if (FINE) {
    const c = $('#cursor'), lab = $('#cursorLabel');
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; c.classList.add('on'); }, { passive: true });
    document.addEventListener('mouseleave', () => c.classList.remove('on'));
    gsap.ticker.add(() => { cx += (x - cx) * .2; cy += (y - cy) * .2; c.style.transform = `translate(${cx}px,${cy}px)`; });
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('[data-cursor], a, button, summary');
      const holder = t && t.closest('[data-cursor]');
      const k = holder ? holder.dataset.cursor : '';
      c.classList.toggle('is-label', !!k);
      c.classList.toggle('is-link', !!t && !k);
      lab.textContent = k;
    });
  }

  /* =========================================================
     5. THEME TOGGLE (light / dark, remembered)
  ========================================================= */
  const syncToggles = () => {
    const dark = root.dataset.theme === 'dark';
    $$('[data-theme-toggle]').forEach(b => {
      b.setAttribute('aria-pressed', String(dark));
      b.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
      const l = $('.tt-label', b); if (l) l.textContent = dark ? 'Light mode' : 'Dark mode';
    });
  };
  const setTheme = (t, btn) => {
    const apply = () => { root.dataset.theme = t; try { localStorage.setItem('theme', t); } catch (e) {} syncToggles(); };
    if (!document.startViewTransition || RM || !btn) { apply(); return; }
    const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add('theming');
    const vt = document.startViewTransition(apply);
    vt.ready.then(() => root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${R}px at ${x}px ${y}px)`] },
      { duration: 750, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }
    )).catch(() => {});
    vt.finished.finally(() => root.classList.remove('theming'));
  };
  $$('[data-theme-toggle]').forEach(b => b.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark', b)));
  syncToggles();

  /* =========================================================
     6. NAV, PROGRESS, INVERT SECTIONS, NARRATOR
  ========================================================= */
  const bar = $('#progressBar');
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => bar && bar.style.setProperty('--p', s.progress.toFixed(4)) });

  const setNav = g => $$('[data-nav]').forEach(a => a.classList.toggle('is-active', a.dataset.nav === g));
  $$('main > section[id]').forEach(sec => ScrollTrigger.create({
    trigger: sec, start: 'top 55%', end: 'bottom 55%',
    onToggle: s => s.isActive && setNav(sec.dataset.group || sec.id),
  }));

  const invOn = new Set();
  $$('[data-invert]').forEach(sec => ScrollTrigger.create({
    trigger: sec, start: 'top 55%', end: 'bottom 45%',
    onToggle: s => { s.isActive ? invOn.add(sec) : invOn.delete(sec); document.body.classList.toggle('is-invert', invOn.size > 0); },
  }));

  const nar = $('#narrator'), narLines = $('#narratorLines');
  let narCurrent = '', lineNo = 0;
  const narStart = new Map();
  $$('[data-narrate]').forEach(el => { narStart.set(el, lineNo); lineNo += el.dataset.narrate.split('|').length; });
  const narrate = el => {
    const txt = el.dataset.narrate;
    if (txt === narCurrent) return;
    narCurrent = txt;
    const start = narStart.get(el) || 0;
    narLines.innerHTML = txt.split('|').map((l, i) => `<div class="nl" style="--d:${i * .45}s"><b>${pad(start + i + 1)}</b><span class="nl-text">${esc(l).replace(/\*(.+?)\*/g, '<em>$1</em>')}<i class="nl-mask"></i></span></div>`).join('');
  };
  $$('[data-narrate]').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 55%', end: 'bottom 45%', onToggle: s => s.isActive && narrate(el) }));
  ScrollTrigger.create({ trigger: '#home', start: 'bottom 65%', onEnter: () => nar.classList.add('is-on'), onLeaveBack: () => nar.classList.remove('is-on') });
  ScrollTrigger.create({ trigger: '.footer', start: 'top 80%', onEnter: () => nar.classList.remove('is-on'), onLeaveBack: () => nar.classList.add('is-on') });
  ScrollTrigger.create({ trigger: '#recent-builds', start: 'top 60%', end: 'bottom 40%', onToggle: s => nar.classList.toggle('is-on', !s.isActive) });
  ScrollTrigger.create({ trigger: '#shatterScroll', start: 'top 60%', end: 'bottom 40%', onToggle: s => nar.classList.toggle('is-on', !s.isActive) });

  /* the hire button pulses as a final invitation in About */
  ScrollTrigger.create({ trigger: '#about', start: 'top 60%', end: 'bottom top', toggleClass: { targets: '#hireBtn', className: 'at-about' } });

  /* =========================================================
     7. LIGHTBOX (with arrows inside groups)
  ========================================================= */
  const lb = $('#lb'), lbBody = $('#lbBody'), lbCap = $('#lbCap'), lbCount = $('#lbCount');
  let lbList = [], lbIdx = 0, lastFocus = null;
  const isVideo = it => it.type === 'video' || /\.(mp4|mov|webm)(\?|$)/i.test(it.src);
  const renderLb = dir => {
    const it = lbList[lbIdx];
    lbBody.innerHTML = isVideo(it)
      ? `<video src="${it.src}" controls autoplay playsinline loop></video>`
      : `<img src="${it.src}" alt="${esc(it.cap)}">`;
    lbCap.textContent = it.cap || '';
    lbCount.textContent = lbList.length > 1 ? `${lbIdx + 1} / ${lbList.length}` : '';
    if (dir && !RM) gsap.fromTo(lbBody, { opacity: 0, x: dir * 50 }, { opacity: 1, x: 0, duration: .5, ease: 'power3.out' });
  };
  const openLb = (list, i = 0) => {
    if (!list.length) return;
    lbList = list; lbIdx = i; lastFocus = document.activeElement;
    renderLb(0);
    lb.classList.toggle('has-nav', list.length > 1);
    lb.classList.add('is-open');
    lenis && lenis.stop();
    $('#lbClose').focus();
  };
  const closeLb = () => {
    lb.classList.remove('is-open'); lbBody.innerHTML = '';
    lenis && lenis.start();
    lastFocus && lastFocus.focus && lastFocus.focus();
  };
  const stepLb = d => { if (lbList.length < 2) return; lbIdx = (lbIdx + d + lbList.length) % lbList.length; renderLb(d); };
  const toItem = el => ({ src: el.dataset.lb, cap: el.dataset.lbCap || el.getAttribute('aria-label') || '', type: el.dataset.lbType });

  document.addEventListener('click', e => {
    const t = e.target.closest('[data-lb]');
    if (!t) return;
    const a = e.target.closest('a[href]');
    if (a && a !== t && t.contains(a)) return; // real links inside a card still work
    e.preventDefault();
    const g = t.closest('[data-lb-group]');
    const els = g ? $$('[data-lb]', g).filter(el => !el.closest('.is-hidden')) : [t];
    openLb(els.map(toItem), Math.max(0, els.indexOf(t)));
  });
  $('#lbClose').addEventListener('click', closeLb);
  $('#lbPrev').addEventListener('click', () => stepLb(-1));
  $('#lbNext').addEventListener('click', () => stepLb(1));
  lb.addEventListener('click', e => { if (e.target === lb) closeLb(); });

  /* swipe inside the lightbox on phones */
  let sx0 = null;
  lb.addEventListener('touchstart', e => { sx0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => { if (sx0 == null) return; const dx = e.changedTouches[0].clientX - sx0; if (Math.abs(dx) > 50) stepLb(dx < 0 ? 1 : -1); sx0 = null; });

  /* =========================================================
     8. HERO — 3D MacBook video player
  ========================================================= */
  (() => {
    const slider = $('#heroSlider'), vids = $$('.hm-vid', slider), dots = $$('#hmDots button'), url = $('#heroUrl'), mac = $('#hmMac');
    const MAX = 12000; // longest a site stays on screen (ms)
    let i = 0, live = false, timer = 0;
    const load = v => { if (!v.getAttribute('src')) { v.preload = 'auto'; v.src = v.dataset.src; } v.muted = true; };
    const fillDot = (k, p) => { const b = dots[k] && $('i', dots[k]); if (b) b.style.width = (p * 100) + '%'; };
    const play = () => {
      clearTimeout(timer);
      const v = vids[i];
      load(v);
      if (!live || RM) { v.pause(); return; }
      v.play().catch(() => {});
      timer = setTimeout(() => show(i + 1), MAX);
    };
    const show = n => {
      vids[i].pause(); fillDot(i, 0);
      i = (n + vids.length) % vids.length;
      vids.forEach((v, k) => v.classList.toggle('is-on', k === i));
      dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
      url.textContent = HERO[i].label;
      try { vids[i].currentTime = 0; } catch (e) {}
      play();
      load(vids[(i + 1) % vids.length]); // warm up the next one
    };
    vids.forEach((v, k) => {
      v.addEventListener('ended', () => { if (k === i) show(i + 1); });
      v.addEventListener('error', () => { if (k === i) setTimeout(() => show(i + 1), 1500); });
      v.addEventListener('timeupdate', () => { if (k === i && v.duration) fillDot(k, Math.min(v.currentTime / Math.min(v.duration, MAX / 1000), 1)); });
    });
    dots.forEach((d, k) => d.addEventListener('click', e => { e.stopPropagation(); show(k); }));
    ScrollTrigger.create({ trigger: '#home', start: 'top bottom', end: 'bottom top', onToggle: s => { live = s.isActive; play(); } });
    load(vids[0]);

    if (FINE && !RM) {
      slider.addEventListener('pointermove', e => {
        const r = slider.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        mac.style.setProperty('--ry', `${-20 + px * 16}deg`);
        mac.style.setProperty('--rx', `${16 - py * 10}deg`);
      });
      slider.addEventListener('pointerleave', () => { mac.style.removeProperty('--ry'); mac.style.removeProperty('--rx'); });
    }

    const open = () => openLb(HERO.map(h => ({ src: h.src, cap: h.cap, type: 'video' })), i);
    slider.addEventListener('click', open);
    slider.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });

    const floats = $$('#heroFloats .float'), hero = $('#home');
    if (FINE && !RM) hero.addEventListener('pointermove', e => {
      const r = hero.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      floats.forEach(f => { const d = +f.dataset.depth; f.style.transform = `translate(${px * d}px,${py * d}px)`; });
    });

    $('#copyEmail')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText('shuakai15@gmail.com'); toast('Email copied ✓'); } catch (e) { location.href = 'mailto:shuakai15@gmail.com'; }
    });
  })();

  /* =========================================================
     9. SCROLL ANIMATIONS
  ========================================================= */
  if (!RM) {
    $$('.split').forEach(h => {
      h.innerHTML = h.innerHTML.split(/(<[^>]+>|\s+)/).map(t => (!t || /^\s+$/.test(t) || t[0] === '<') ? t : `<span class="w"><span>${t}</span></span>`).join('');
      gsap.from($$('.w > span', h), { yPercent: 115, rotate: 5, duration: 1.1, ease: 'power4.out', stagger: .045, scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
    });

    ScrollTrigger.batch('.rv', { start: 'top 90%', once: true,
      onEnter: b => gsap.fromTo(b, { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: .08, overwrite: true }) });

    $$('.wipe').forEach(el => {
      gsap.fromTo(el, { clipPath: 'inset(100% 0% 0% 0% round 18px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.4, ease: 'power4.inOut', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      const im = $('img', el); if (im) gsap.fromTo(im, { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });

    gsap.fromTo('.solution-word', { scale: 3, opacity: 0, filter: 'blur(14px)' }, { scale: 1, opacity: 1, filter: 'blur(0px)', ease: 'none', scrollTrigger: { trigger: '.solution', start: 'top 95%', end: 'top 35%', scrub: true } });
    gsap.utils.toArray('.chapter-num').forEach(n => gsap.fromTo(n, { yPercent: 30 }, { yPercent: -30, ease: 'none', scrollTrigger: { trigger: n.closest('.chapter'), scrub: true } }));
    gsap.from('#collage .cshot', { y: 80, opacity: 0, duration: 1.1, stagger: .12, ease: 'power3.out', scrollTrigger: { trigger: '#collage', start: 'top 85%', once: true } });
  } else {
    $$('.rv').forEach(el => { el.style.opacity = 1; });
  }

  $$('[data-count]').forEach(el => {
    const to = +el.dataset.count, dec = +el.dataset.dec || 0, pre = el.dataset.pre || '', suf = el.dataset.suf || '';
    const fmt = v => pre + v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
    el.textContent = fmt(to);
    if (RM) return;
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => { const o = { v: 0 }; gsap.to(o, { v: to, duration: 2, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } }); } });
  });

  (() => {
    const msgs = $$('#chat .msg');
    if (!msgs.length) return;
    const play = () => {
      let t = 0;
      msgs.forEach(m => {
        setTimeout(() => m.classList.add('is-typing'), t); t += RM ? 0 : 1000;
        setTimeout(() => { m.classList.remove('is-typing'); m.classList.add('is-in'); }, t); t += RM ? 0 : 450;
      });
    };
    ScrollTrigger.create({ trigger: '#chat', start: 'top 70%', once: true, onEnter: play });
  })();

  const lightUp = (sel, items) => { const host = $(sel); if (!host) return; ScrollTrigger.create({ trigger: host, start: 'top 75%', once: true,
    onEnter: () => $$(items, host).forEach((n, i) => setTimeout(() => n.classList.add('is-lit'), RM ? 0 : i * 180)) }); };
  lightUp('#map', '.node, .link');
  lightUp('#spotFlow', '.fnode, .flink, .fbranch span');

  ScrollTrigger.create({ trigger: '.tl', start: 'top 70%', end: 'bottom 60%', scrub: true, onUpdate: s => $('#tlFill').style.setProperty('--p', s.progress) });
  ScrollTrigger.create({ trigger: '#pwa', start: 'top 75%', toggleClass: 'is-in' });

  /* =========================================================
     10. INTERACTIONS
  ========================================================= */
  if (FINE && !RM) {
    $$('[data-tilt]').forEach(el => {
      const max = el.classList.contains('stage') ? 12 : 7;
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(1200px) rotateY(${px * max}deg) rotateX(${-py * max}deg)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });

    $$('.mag').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * .25, y: (e.clientY - r.top - r.height / 2) * .35, duration: .4, ease: 'power3.out' });
      });
      el.addEventListener('pointerleave', () => gsap.to(el, { x: 0, y: 0, duration: .7, ease: 'elastic.out(1,.4)' }));
    });

    const GLYPHS = 'abcdefghijklmnopqrstuvwxyz';
    const navLabels = [];
    $$('.side-nav a span').forEach(el => {
      const final = el.textContent;
      let raf = 0;
      const stop = () => { cancelAnimationFrame(raf); el.textContent = final; };
      navLabels.push(stop);
      el.parentElement.addEventListener('mouseenter', () => {
        cancelAnimationFrame(raf);
        const t0 = performance.now(), D = 280;
        const tick = now => {
          const p = Math.min((now - t0) / D, 1), shown = Math.floor(p * final.length);
          el.textContent = final.split('').map((ch, i) => {
            if (i < shown || ch === ' ') return ch;
            const g = GLYPHS[Math.random() * GLYPHS.length | 0];
            return ch === ch.toUpperCase() ? g.toUpperCase() : g;
          }).join('');
          if (p < 1) raf = requestAnimationFrame(tick); else el.textContent = final;
        };
        raf = requestAnimationFrame(tick);
      });
      el.parentElement.addEventListener('mouseleave', stop);
    });
    const resetLabels = () => navLabels.forEach(fn => fn());
    document.addEventListener('visibilitychange', resetLabels);
    addEventListener('blur', resetLabels);
  }

  $$('.rail').forEach(rail => {
    let down = false, sx = 0, sl = 0, moved = false;
    rail.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; sx = e.clientX; sl = rail.scrollLeft; });
    addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - sx; if (Math.abs(dx) > 5) { moved = true; rail.classList.add('is-drag'); } if (moved) rail.scrollLeft = sl - dx; });
    addEventListener('pointerup', () => { if (!down) return; down = false; setTimeout(() => rail.classList.remove('is-drag'), 0); });
    rail.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
    const wrap = rail.closest('.rail-wrap');
    $$('.rail-btn', wrap).forEach(b => b.addEventListener('click', () => rail.scrollBy({ left: (b.dataset.dir === 'next' ? 1 : -1) * rail.clientWidth * .8, behavior: 'smooth' })));
    $$('.rail-edge', wrap).forEach(edge => {
      const dir = edge.dataset.dir === 'next' ? 1 : -1; let raf = 0;
      const glide = () => { rail.scrollLeft += dir * 8; raf = requestAnimationFrame(glide); };
      edge.addEventListener('mouseenter', () => { if (FINE) raf = requestAnimationFrame(glide); });
      edge.addEventListener('mouseleave', () => cancelAnimationFrame(raf));
    });
  });

  $$('#siteFilters button').forEach(b => b.addEventListener('click', () => {
    $$('#siteFilters button').forEach(x => x.classList.toggle('is-on', x === b));
    const f = b.dataset.f;
    $$('#siteRail .site').forEach(c => c.classList.toggle('is-hidden', f !== 'all' && c.dataset.cat !== f));
    $('#siteRail').scrollTo({ left: 0, behavior: 'smooth' });
    if (!RM) gsap.fromTo('#siteRail .site:not(.is-hidden)', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: .6, stagger: .05, ease: 'power3.out' });
  }));

  const vio = new IntersectionObserver(entries => entries.forEach(({ target: v, isIntersecting }) => {
    if (isIntersecting) { if (!v.getAttribute('src')) v.src = v.dataset.src; v.muted = true; if (!RM) v.play().catch(() => {}); }
    else if (!v.paused) v.pause();
  }), { rootMargin: '250px 0px', threshold: .1 });
  // .cn-vid (3D showcase) and .hm-vid (hero MacBook) manage their own playback
  $$('video[data-src]:not(.cn-vid):not(.hm-vid)').forEach(v => vio.observe(v));

  /* =========================================================
     11. 3D WEBSITE PLAYER
  ========================================================= */
  (() => {
    const vids = $$('.w3d-video'), tabs = $$('.w3d-tab'), badge = $('#w3dBadge');
    if (!vids.length) return;
    let cur = 0, inView = false;
    const ensure = v => { if (!v.getAttribute('src')) v.src = v.dataset.src3d; v.muted = true; };
    const setBar = (i, p) => { const b = $('i b', tabs[i]); if (b) b.style.width = Math.min(p, 1) * 100 + '%'; };
    const show = (i, restart) => {
      cur = i;
      vids.forEach((v, k) => { v.classList.toggle('is-on', k === i); if (k !== i) { v.pause(); setBar(k, 0); } });
      tabs.forEach((t, k) => { t.classList.toggle('is-on', k === i); t.setAttribute('aria-selected', k === i); });
      badge.textContent = S.web3d[i].name;
      if (inView) { ensure(vids[i]); if (restart) vids[i].currentTime = 0; vids[i].play().catch(() => {}); }
    };
    vids.forEach((v, k) => {
      v.addEventListener('timeupdate', () => { if (k === cur && v.duration) setBar(k, v.currentTime / v.duration); });
      v.addEventListener('ended', () => { if (k === cur) show((k + 1) % vids.length, true); });
    });
    tabs.forEach((t, k) => t.addEventListener('click', () => show(k, true)));
    ScrollTrigger.create({ trigger: '#w3dMac', start: 'top 85%', end: 'bottom 15%', onToggle: s => { inView = s.isActive; inView ? show(cur, false) : vids[cur].pause(); } });
    const open = () => openLb(S.web3d.map(w => ({ src: w.src, cap: w.name, type: 'video' })), cur);
    $('#w3dMac').addEventListener('click', open);
    $('#w3dMac').addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  })();

  /* =========================================================
     12. HORIZONTAL SCROLL (recent builds) — desktop only, CSS sticky
  ========================================================= */
  gsap.matchMedia().add('(min-width: 1025px)', () => {
    if (RM) return;
    const sec = $('#recent-builds'), track = $('#hTrack'), pin = $('#hPin');
    const dist = () => Math.max(0, track.scrollWidth - pin.clientWidth);
    const setH = () => { sec.style.height = (pin.offsetHeight + dist()) + 'px'; };
    setH();
    ScrollTrigger.addEventListener('refreshInit', setH);
    gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom bottom', scrub: .6, invalidateOnRefresh: true },
    });
    return () => { ScrollTrigger.removeEventListener('refreshInit', setH); sec.style.height = ''; gsap.set(track, { x: 0 }); };
  });

  /* =========================================================
     13. SKILLS SPHERE
  ========================================================= */
  (() => {
    const scene = $('#sphereScene'), world = $('#sphere');
    if (!scene) return;
    const words = ['GoHighLevel', 'Web Development', 'AI Automation', 'Zapier', 'Make', 'n8n', 'Webhooks', 'REST APIs', 'Appointwise', 'Claude Code', 'Anthropic API', 'Google Ads', 'Meta Ads', 'SEO', 'CapCut', 'Canva', 'WordPress', 'Framer', 'monday.com', 'Slack', 'Blotato', 'Postiz', 'Fal.ai', 'GitHub', 'CRM Systems', 'EmailJS', 'A2P Compliance', 'Rank & Rent'];
    const R = innerWidth < 640 ? 140 : 260, golden = Math.PI * (3 - Math.sqrt(5));
    words.forEach((w, i) => {
      const y = 1 - (i / (words.length - 1)) * 2, rad = Math.sqrt(1 - y * y), th = golden * i;
      const lat = Math.asin(y) * 180 / Math.PI, lon = Math.atan2(Math.cos(th) * rad, Math.sin(th) * rad) * 180 / Math.PI;
      world.insertAdjacentHTML('beforeend', `<span style="transform:translate(-50%,-50%) rotateY(${lon}deg) rotateX(${-lat}deg) translateZ(${R}px)">${esc(w)}</span>`);
    });
    let ry = 0, rx = 12, auto = true, dragging = false, lx = 0, ly = 0, t;
    const render = () => { world.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
    scene.addEventListener('pointerdown', e => { dragging = true; auto = false; clearTimeout(t); lx = e.clientX; ly = e.clientY; scene.setPointerCapture(e.pointerId); });
    scene.addEventListener('pointermove', e => { if (!dragging) return; ry += (e.clientX - lx) * .4; rx = Math.max(-80, Math.min(80, rx - (e.clientY - ly) * .4)); lx = e.clientX; ly = e.clientY; render(); });
    scene.addEventListener('pointerup', () => { dragging = false; t = setTimeout(() => { auto = true; }, 700); });
    gsap.ticker.add(() => { if (auto && !RM) { ry += .18; render(); } });
    render();
  })();

  /* =========================================================
     14. LOGO SHATTER SEQUENCE (frames/frame_001.jpg … 193)
  ========================================================= */
  (() => {
    const cv = $('#shatter'); if (!cv) return;
    const ctx = cv.getContext('2d'), N = 193, imgs = [];
    const pinEl = $('#shatterPin'), lines = $$('.shatter-line'), pct = $('#shatterPct'), vid = $('#shatterVideo'), hint = $('.shatter-hint');
    let loaded = false, cur = -1, failed = false;

    const useFallback = () => {
      if (failed || !vid) return; failed = true;
      cv.style.display = 'none';
      vid.src = vid.dataset.fallback;
      vid.classList.add('is-on');
      vid.play().catch(() => {});
    };
    const draw = (i, force) => {
      const im = imgs[i]; if (!im || !im.complete || !im.naturalWidth || (i === cur && !force)) return;
      cur = i;
      const w = cv.clientWidth, h = cv.clientHeight, s = Math.max(w / im.naturalWidth, h / im.naturalHeight);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(im, (w - im.naturalWidth * s) / 2, (h - im.naturalHeight * s) / 2, im.naturalWidth * s, im.naturalHeight * s);
    };
    const load = () => {
      if (loaded) return; loaded = true;
      for (let i = 0; i < N; i++) {
        const im = new Image();
        im.src = `./frames/frame_${String(i + 1).padStart(3, '0')}.jpg`;
        if (i === 0) { im.onload = () => draw(0, true); im.onerror = useFallback; }
        imgs[i] = im;
      }
    };
    const size = () => { const d = Math.min(devicePixelRatio || 1, 2); cv.width = cv.clientWidth * d; cv.height = cv.clientHeight * d; ctx.setTransform(d, 0, 0, d, 0, 0); draw(Math.max(cur, 0), true); };
    addEventListener('resize', size); size();
    ScrollTrigger.create({ trigger: '#brand', start: 'top 250%', once: true, onEnter: load });

    let stage = 0;
    const setStage = n => { if (n === stage) return; stage = n; lines.forEach((l, k) => l.classList.toggle('is-on', k === n)); };
    if (RM) return;

    ScrollTrigger.create({
      trigger: '#shatterScroll', start: 'top top', end: 'bottom bottom', scrub: 0,
      onUpdate: s => {
        const p = s.progress;
        draw(Math.round(p * (N - 1)));
        pinEl.style.setProperty('--p', p.toFixed(3));
        pct.textContent = String(Math.round(p * 100)).padStart(2, '0');
        setStage(Math.min(lines.length - 1, Math.floor(p * lines.length)));
        if (hint) hint.style.opacity = p > .85 ? 0 : 1;
      },
    });
  })();
  /* =========================================================
     15. CONTACT DRAWER + EMAILJS
  ========================================================= */
  const drawer = $('#drawer'), back = $('#drawerBack');
  const openDrawer = () => { drawer.classList.add('is-open'); back.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); lenis && lenis.stop(); setTimeout(() => $('#f-name').focus(), 450); };
  const closeDrawer = () => { drawer.classList.remove('is-open'); back.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); lenis && lenis.start(); };
  document.addEventListener('click', e => { if (e.target.closest('[data-hire]')) { e.preventDefault(); openDrawer(); } });
  $('#drawerClose').addEventListener('click', closeDrawer);
  back.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', e => {
    if (lb.classList.contains('is-open')) {
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowRight') stepLb(1);
      else if (e.key === 'ArrowLeft') stepLb(-1);
      return;
    }
    if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-lb][role="button"]')) { e.preventDefault(); e.target.click(); }
  });

  if (window.emailjs) emailjs.init({ publicKey: 'LN5Yv9k1ZUXppD9LX' });
  const form = $('#contactForm'), err = $('#formErr'), btn = $('#formBtn');
  form.addEventListener('submit', async e => {
    e.preventDefault();
    err.textContent = '';
    if (!form.checkValidity()) { form.reportValidity(); err.textContent = 'Please add your name and a valid email address.'; return; }
    if (!window.emailjs) { err.textContent = 'The form could not load. Email me directly at shuakai15@gmail.com.'; return; }
    btn.disabled = true; btn.textContent = 'Sending…';
    const d = new FormData(form);
    try {
      await emailjs.send('service_6isch48', 'template_rt7l8rf', {
        from_name: d.get('name'), from_email: d.get('email'),
        service_type: d.get('service') || 'Not specified', message: d.get('message') || 'No message provided.',
      });
      drawer.classList.add('is-sent'); form.reset();
    } catch (x) {
      console.error('EmailJS error:', x);
      err.textContent = 'Something went wrong. Please try again, or email me directly.';
    } finally { btn.disabled = false; btn.textContent = 'Send message →'; }
  });

  /* =========================================================
     16. TOAST + EASTER EGG (type "hire")
  ========================================================= */
  const toastEl = $('#toast');
  function toast(msg) { toastEl.textContent = msg; toastEl.classList.add('is-on'); clearTimeout(toast._t); toast._t = setTimeout(() => toastEl.classList.remove('is-on'), 2600); }
  let keys = '';
  document.addEventListener('keydown', e => {
    if (e.target.closest && e.target.closest('input, textarea, select') || e.key.length !== 1) return;
    keys = (keys + e.key.toLowerCase()).slice(-4);
    if (keys === 'hire') { toast('You found the shortcut 👀'); openDrawer(); keys = ''; }
  });
  /* =========================================================
     16b. BACK TO TOP
  ========================================================= */
  (() => {
    const btn = $('#toTop');
    if (!btn) return;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: s => {
        btn.style.setProperty('--p', s.progress.toFixed(4));
        btn.classList.toggle('is-on', s.scroll() > innerHeight * .8);
      },
    });
    btn.addEventListener('click', () => {
      if (lenis) lenis.scrollTo(0, { duration: 1.6 });
      else scrollTo({ top: 0, behavior: RM ? 'auto' : 'smooth' });
    });
  })();
  /* =========================================================
     17. KEEP TRIGGERS IN SYNC
  ========================================================= */
  const resync = () => { if (ScrollTrigger.sort) ScrollTrigger.sort(); ScrollTrigger.refresh(); };
  resync();
  addEventListener('load', resync);
  document.fonts && document.fonts.ready.then(resync);
  setTimeout(resync, 1500);

  /* lazy images make the page taller as they load — re-measure every pinned
     section whenever that happens, so nothing pins early and overlaps */
  let lastH = 0, rsT;
  new ResizeObserver(entries => {
    const h = Math.round(entries[0].contentRect.height);
    if (Math.abs(h - lastH) < 4) return;
    lastH = h;
    clearTimeout(rsT);
    rsT = setTimeout(resync, 250);
  }).observe($('#main'));
})();
