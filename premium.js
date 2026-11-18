/* =========================================================
   premium.js — "Premium website samples" (#premium-samples)
   3D MacBook + iPhone playing SITE.premium (data.js).
   Needs GSAP + ScrollTrigger. Load AFTER site.js.
   ========================================================= */
(() => {
  'use strict';
  const sec = document.getElementById('premium-samples');
  if (!sec) return;
  const L = ((window.SITE && window.SITE.premium) || []).filter(s => s.desktop && s.mobile);
  if (!L.length) { sec.remove(); return; }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const G = window.gsap, ANIM = !!(G && window.ScrollTrigger) && !RM;
  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = n => String(n).padStart(2, '0');
  const DUR = 14000, LID = 12, RIG = { x: -10, y: -14 };

  const main = $('#pwMain'), stage = $('#pwStage'), tabsEl = $('#pwTabs'), copy = $('#pwCopy'), ghost = $('#pwGhost'), chip = $('#pwChip');
  const U = () => stage.clientWidth / 100;

  /* ---------- build the scene ---------- */
  const fit = s => {
    const z = +s.macZoom || 1, y = s.macShift || '0%';
    if (z === 1 && /^0%?$/.test(y)) return '';
    return ` style="inset:auto;width:calc(100% * ${z});height:calc(100% * ${z});left:calc((1 - ${z}) * 50%);top:calc((1 - ${z}) * 50% + ${y})"`;
  };
  const vids = dev => L.map((s, i) => {
    const src = dev === 'mac' ? s.desktop : s.mobile, poster = dev === 'mac' ? s.desktopPoster : s.mobilePoster;
    return `<video class="pw-vid${i ? '' : ' is-on'}" data-pw="${src}"${poster ? ` poster="${poster}"` : ''}${dev === 'mac' ? fit(s) : ''} muted loop playsinline preload="none"></video>`;
  }).join('');
  const EXPAND = '<svg viewBox="0 0 24 24" width="1.1em" height="1.1em" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  const slices = Array.from({ length: 6 }, (_, i) => `<i class="pw-psl" style="--i:${i + 1}"></i>`).join('');

  stage.insertAdjacentHTML('beforeend', `
    <i class="pw-bloom" aria-hidden="true"></i>
    <div class="pw-cam"><div class="pw-rig" id="pwRig"><div class="pw-look" id="pwLook">
      <div class="pw-mac">
        <i class="pw-floor"></i><i class="pw-mshadow"></i>
        <div class="pw-lid" id="pwLid">
          <div class="pw-lid-front">
            <span class="pw-camdot"></span>
            <div class="pw-screen pw-mscreen" data-lb-type="video" data-cursor="Play" tabindex="0" role="button">
              <span class="pw-bar"><i></i><i></i><i></i><em id="pwUrl"></em></span>
              <div class="pw-view">${vids('mac')}<span class="pw-off"></span><span class="pw-glare"></span><span class="pw-wipe"></span><span class="pw-pill">${EXPAND}Watch full screen</span></div>
            </div>
          </div>
          <div class="pw-lid-back"><img src="./images/logo-x.png" alt="" onerror="this.remove()"></div>
          <i class="pw-lid-top"></i>
        </div>
        <div class="pw-deck"><i class="pw-kb"></i><i class="pw-tp"></i></div>
        <i class="pw-lip"></i><i class="pw-side l"></i><i class="pw-side r"></i>
      </div>
      <div class="pw-phone">
        <i class="pw-pshadow"></i>
        <div class="pw-pin" id="pwPin"><div class="pw-pfloat"><div class="pw-pflip" id="pwFlip">
          ${slices}
          <div class="pw-pback"><span class="pw-lens"><i></i><i></i><i></i></span></div>
          <div class="pw-pfront"><div class="pw-screen pw-pscreen" data-lb-type="video" data-cursor="Play" tabindex="0" role="button">
            ${vids('phone')}<span class="pw-island"></span><span class="pw-off"></span><span class="pw-glare"></span><span class="pw-wipe"></span>
          </div></div>
        </div></div></div>
      </div>
    </div></div></div>`);

  const rig = $('#pwRig'), look = $('#pwLook'), lid = $('#pwLid'), pin = $('#pwPin'), flip = $('#pwFlip'), url = $('#pwUrl');
  const mScreen = $('.pw-mscreen', stage), pScreen = $('.pw-pscreen', stage);
  const mV = $$('.pw-vid', mScreen), pV = $$('.pw-vid', pScreen);
  const offs = $$('.pw-off', stage), wipes = $$('.pw-wipe', stage);

  tabsEl.innerHTML = L.map((s, i) => `
    <button type="button" class="pw-tab" role="tab" aria-controls="pwCopy" style="--c:${s.accent || '#7fd3e6'}">
      <span class="sw"></span><b>${pad(i + 1)}</b>
      <span class="tx"><strong>${esc(s.t)}</strong><small>${esc(s.tab || s.kind || '')}</small></span>
      <span class="bar"><i></i></span>
    </button>`).join('');
  const tabs = $$('.pw-tab', tabsEl), bars = tabs.map(t => $('.bar i', t));
  if (L.length < 2) tabsEl.style.display = 'none';

  /* ---------- state ---------- */
  let cur = 0, live = !ANIM, near = false, inView = false, busy = false, hover = false, ready = !ANIM, warmed = false;
  const lbOpen = () => { const lb = document.getElementById('lb'); return !!(lb && lb.classList.contains('is-open')); };

  const load = v => { if (!v.getAttribute('src')) { v.preload = 'auto'; v.src = v.dataset.pw; } v.muted = true; v.defaultMuted = true; };
  const warm = () => {
    if (warmed) return; warmed = true;
    [...mV, ...pV].forEach(v => { if (!v.getAttribute('src')) { v.preload = 'metadata'; v.src = v.dataset.pw; v.muted = true; } });
  };
  const failCheck = () => {
    mScreen.classList.toggle('is-failed', !!mV[cur].error);
    pScreen.classList.toggle('is-failed', !!pV[cur].error);
  };
  [...mV, ...pV].forEach(v => {
    v.addEventListener('error', () => { console.warn('[premium] video failed:', v.dataset.pw); failCheck(); });
    v.addEventListener('playing', failCheck);
  });

  // only the current pair plays, and only while visible
  const sync = () => {
    const play = live && inView && !document.hidden && !lbOpen() && !RM;
    [mV, pV].forEach(list => list.forEach((v, k) => {
      if (k === cur) { if (near) load(v); if (play) v.play().catch(() => {}); else if (!v.paused) v.pause(); }
      else if (!v.paused) v.pause();
    }));
  };

  /* ---------- content ---------- */
  const setTabs = i => tabs.forEach((t, k) => { t.classList.toggle('is-on', k === i); t.setAttribute('aria-selected', String(k === i)); t.tabIndex = k === i ? 0 : -1; });

  const setScreens = i => {
    const s = L[i];
    [mV, pV].forEach(list => list.forEach((v, k) => {
      v.classList.toggle('is-on', k === i);
      if (k === i && v.readyState) { try { v.currentTime = 0; } catch (e) {} }
    }));
    mScreen.dataset.lb = s.desktop; mScreen.dataset.lbCap = `${s.t} · desktop`;
    mScreen.setAttribute('aria-label', `Watch the ${s.t} desktop recording full screen`);
    pScreen.dataset.lb = s.mobile; pScreen.dataset.lbCap = `${s.t} · mobile`;
    pScreen.setAttribute('aria-label', `Watch the ${s.t} mobile recording full screen`);
    url.textContent = s.domain || '';
    chip.textContent = s.status || 'Live site';
    sec.style.setProperty('--pa', s.accent || '#7fd3e6');
    sec.style.setProperty('--pg', s.glow || '#1f7fa3');
    ghost.innerHTML = `<span>${esc(s.ghost || s.t)}</span>`.repeat(4);
    failCheck(); sync();
  };

  const renderCopy = i => {
    const s = L[i];
    copy.innerHTML = `
      <p class="pw-kind"><span>${pad(i + 1)} / ${pad(L.length)}</span>${esc(s.kind || '')}</p>
      <h3>${esc(s.t)}</h3>
      <p class="pw-d">${esc(s.d || '')}</p>
      ${s.feats && s.feats.length ? `<ul class="pw-feats">${s.feats.map(f => `<li>${esc(f)}</li>`).join('')}</ul>` : ''}
      ${s.stats && s.stats.length ? `<ul class="pw-stats">${s.stats.map(x => `<li><strong>${esc(x.n)}</strong><span>${esc(x.l)}</span></li>`).join('')}</ul>` : ''}
      <div class="actions">
        <a class="btn btn-solid" href="${s.url}" target="_blank" rel="noopener">Visit live site ↗</a>
        <button class="btn btn-ghost" type="button" data-pw-watch>Watch full screen</button>
      </div>`;
  };

  /* ---------- switching ---------- */
  let t0 = performance.now(), prog = 0;
  const go = n => {
    n = (n + L.length) % L.length;
    if (n === cur || busy) return;
    cur = n; prog = 0; t0 = performance.now();
    bars.forEach(b => { b.style.width = '0%'; });
    setTabs(n);
    if (!ANIM) { setScreens(n); renderCopy(n); return; }
    busy = true;
    G.timeline({ onComplete: () => { busy = false; G.set(flip, { rotationY: 0 }); t0 = performance.now(); } })
      .to(copy.children, { y: -14, opacity: 0, duration: .32, stagger: .03, ease: 'power2.in' }, 0)
      .to(ghost, { opacity: 0, duration: .4 }, 0)
      .to(offs, { opacity: .92, duration: .35, ease: 'power2.in' }, 0)
      .to(lid, { rotationX: LID - 22, duration: .55, ease: 'power2.inOut' }, 0)
      .to(flip, { rotationY: 180, duration: .55, ease: 'power2.in' }, 0)
      .add(() => {
        setScreens(n); renderCopy(n);
        G.fromTo(copy.children, { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .65, stagger: .06, ease: 'power3.out' });
      }, .56)
      .to(ghost, { opacity: 1, duration: .8 }, .6)
      .to(lid, { rotationX: LID, duration: 1, ease: 'back.out(1.7)' }, .58)
      .to(flip, { rotationY: 360, duration: .85, ease: 'power3.out' }, .58)
      .to(offs, { opacity: 0, duration: .7, ease: 'power2.out' }, .72)
      .fromTo(wipes, { xPercent: -130 }, { xPercent: 130, duration: 1.1, ease: 'power2.inOut' }, .72);
  };

  tabs.forEach((t, k) => t.addEventListener('click', () => go(k)));
  tabsEl.addEventListener('keydown', e => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = (cur + (e.key === 'ArrowRight' ? 1 : -1) + L.length) % L.length;
    go(n); tabs[n].focus();
  });
  copy.addEventListener('click', e => { if (e.target.closest('[data-pw-watch]')) mScreen.click(); });

  // 3D hit-testing can miss: if a click lands on the scene, open whichever screen is under the pointer
  stage.addEventListener('click', e => {
    if (e.target.closest('[data-lb]')) return;
    const hit = [pScreen, mScreen].find(el => {
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    });
    if (hit) hit.click();
  });

  /* ---------- first paint ---------- */
  setTabs(0); setScreens(0); renderCopy(0);

  if (!ANIM) {
    offs.forEach(o => { o.style.opacity = 0; });
  } else {
    G.set(wipes, { x: 0, xPercent: -130 });
    G.set(rig, { rotationX: -30, rotationY: -50, scale: .84 });
    G.set(lid, { rotationX: -90 });
    G.set(pin, { y: U() * 18, scale: .6, visibility: 'hidden' });
    G.set(flip, { rotationY: -200 });
    G.set([tabsEl, copy], { opacity: 0, y: 24 });

    const startSway = () => G.to(rig, { rotationY: RIG.y + 4, rotationX: RIG.x + 1.5, duration: 7, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    const powerOn = () => {
      live = true; sync();
      G.to(offs, { opacity: 0, duration: 1, ease: 'power2.out' });
      G.fromTo(wipes, { xPercent: -130 }, { xPercent: 130, duration: 1.3, ease: 'power2.inOut', delay: .2 });
    };
    ScrollTrigger.create({
      trigger: stage, start: 'top 78%', once: true,
      onEnter: () => {
        G.timeline({ onComplete: () => { ready = true; t0 = performance.now(); startSway(); } })
          .to(rig, { rotationX: RIG.x, rotationY: RIG.y, scale: 1, duration: 2.6, ease: 'power3.out' }, 0)
          .to([tabsEl, copy], { opacity: 1, y: 0, duration: 1, stagger: .14, ease: 'power3.out' }, .3)
          .to(lid, { rotationX: LID, duration: 1.8, ease: 'power2.inOut' }, .45)
          .set(pin, { visibility: 'visible' }, 1)
          .to(pin, { y: 0, scale: 1, duration: 1.6, ease: 'power3.out' }, 1)
          .to(flip, { rotationY: 0, duration: 1.7, ease: 'power3.out' }, 1)
          .add(powerOn, 2);
      },
    });

    if (FINE) {
      const qy = G.quickTo(look, 'rotationY', { duration: 1.3, ease: 'power3.out' });
      const qx = G.quickTo(look, 'rotationX', { duration: 1.3, ease: 'power3.out' });
      stage.addEventListener('pointermove', e => {
        const r = stage.getBoundingClientRect();
        qy(((e.clientX - r.left) / r.width - .5) * 10);
        qx(-((e.clientY - r.top) / r.height - .5) * 6);
      });
      stage.addEventListener('pointerenter', () => { if (ready && !busy) G.to(pin, { y: -U() * 1.6, duration: .8, ease: 'power3.out', overwrite: 'auto' }); });
      stage.addEventListener('pointerleave', () => {
        qy(0); qx(0);
        if (ready) G.to(pin, { y: 0, duration: 1, ease: 'power3.out', overwrite: 'auto' });
      });
    }
  }

  /* ---------- visibility + autoplay ---------- */
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !near) { near = true; setTimeout(warm, 3000); }
    sync();
  }, { rootMargin: '600px 0px' }).observe(stage);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }, { threshold: .25 }).observe(stage);
  document.addEventListener('visibilitychange', sync);

  if (FINE) {
    main.addEventListener('pointerenter', () => { hover = true; });
    main.addEventListener('pointerleave', () => { hover = false; });
  }

  let wasLb = false;
  const tick = now => {
    requestAnimationFrame(tick);
    const lb = lbOpen();
    if (lb !== wasLb) { wasLb = lb; sync(); }
    if (RM || L.length < 2) return;
    if (!ready || busy || hover || lb || !inView || document.hidden) { t0 = now - prog * DUR; return; }
    prog = Math.min((now - t0) / DUR, 1);
    bars[cur].style.width = (prog * 100).toFixed(2) + '%';
    if (prog >= 1) go(cur + 1);
  };
  requestAnimationFrame(tick);
})();