/* =========================================================
   3D DEVICE SHOWCASE — section #showcase
   Needs GSAP + ScrollTrigger (already loaded by index.html).
   Load AFTER site.js.

   What it does
   1. Scroll in  -> the MacBook opens, the iPhone spins in, screens power on, videos autoplay
   2. Idle       -> slow camera sway; pointer parallax on desktop
   3. Hover      -> that device lifts and turns toward you, light sweep + lens flare,
                    the other device recedes
   4. Click/tap  -> cinematic expand into a full-screen player (Esc / click outside to close)
   ========================================================= */
(() => {
  'use strict';
  if (typeof gsap === 'undefined') return;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const wrap = $('#cnStage');
  if (!wrap) return;

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const cam = $('.cn-cam', wrap), orbit = $('#cnOrbit'), look = $('#cnLook'), hinge = $('#cnHinge');
  const devs = $$('.cn-dev', wrap);
  const phone = devs.find(d => d.dataset.dev === 'phone');
  const mac = devs.find(d => d.dataset.dev === 'mac');
  devs.forEach(d => {
    d._lift = $('.cn-lift', d); d._tilt = $('.cn-tilt', d);
    d._screen = $('.cn-screen', d); d._vid = $('.cn-vid', d); d._off = $('.cn-off', d);
  });

  /* 1 stage-width unit in px (matches the CSS --u) */
  const U = () => (wrap.clientWidth / 100) * (parseFloat(getComputedStyle(cam).getPropertyValue('--k')) || 1);

  let ready = false;     // entrance finished -> hover effects allowed
  let live = false;      // screens are on
  let fullOpen = null;   // device currently shown full screen
  let sway = null;

  /* ---------------------------------------------------------
     VIDEO AUTOPLAY (only while visible, never behind the player)
  --------------------------------------------------------- */
  const sync = v => {
    if (!v.dataset.src) return;
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    if (v._near && !v.getAttribute('src')) { v.src = v.dataset.src; v.load(); }
    if (RM) return;                                   // reduced motion: poster only
    const shouldPlay = v._vis && live && !fullOpen;
    if (shouldPlay) v.play().catch(() => {});
    else if (!v.paused) v.pause();
  };
  // never leave a black screen: show the poster behind the video, and say why if the file fails
  devs.forEach(d => {
    const poster = d._vid.getAttribute('poster');
    if (poster) d._screen.style.background = `#000 url("${poster}") center / cover no-repeat`;
    d._vid.addEventListener('error', () => {
      const e = d._vid.error;
      console.warn('[showcase] video failed:', d._vid.currentSrc || d._vid.dataset.src, e ? 'MediaError code ' + e.code : '');
      d._screen.classList.add('is-failed');
    });
    d._vid.addEventListener('playing', () => d._screen.classList.remove('is-failed'));
  });
  const nearIO = new IntersectionObserver(es => es.forEach(({ target: v, isIntersecting }) => { v._near = isIntersecting || v._near; sync(v); }), { rootMargin: '600px 0px' });
  const visIO = new IntersectionObserver(es => es.forEach(({ target: v, isIntersecting }) => { v._vis = isIntersecting; sync(v); }), { threshold: .2 });
  devs.forEach(d => { nearIO.observe(d._vid); visIO.observe(d._vid); });

  const powerOn = d => {
    gsap.to(d._off, { opacity: 0, duration: RM ? 0 : 1, ease: 'power2.out' });
    live = true; wrap.classList.add('is-live');
    devs.forEach(x => { x._near = true; sync(x._vid); });
  };

  /* ---------------------------------------------------------
     ENTRANCE — the one orchestrated moment
  --------------------------------------------------------- */
  gsap.set(look, { rotationX: 0, rotationY: 0 });
  gsap.set(orbit, { rotationX: -9, rotationY: -14, scale: 1 });
  gsap.set(hinge, { rotationX: 7 });
  gsap.set(phone._lift, { y: 0, rotationY: 0, scale: 1, visibility: 'visible' });

  const startSway = () => {
    if (RM) return;
    sway = gsap.to(orbit, { rotationY: -10.5, rotationX: -8, duration: 8, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  };

  const enter = () => {
    if (RM) {
      gsap.set([mac._off, phone._off], { opacity: 0 });
      live = true; wrap.classList.add('is-live'); ready = true;
      devs.forEach(x => { x._near = true; sync(x._vid); });
      return;
    }
    const u = U();
    gsap.set(orbit, { rotationX: -24, rotationY: -46, scale: .82 });
    gsap.set(hinge, { rotationX: -90 });
    gsap.set(phone._lift, { visibility: 'hidden', y: 16 * u, rotationY: -200, scale: .55 });

    gsap.timeline({ onComplete: () => { ready = true; startSway(); } })
      .to(orbit, { rotationX: -9, rotationY: -14, scale: 1, duration: 3, ease: 'power3.out' }, 0)
      .to(hinge, { rotationX: 7, duration: 1.9, ease: 'power2.inOut' }, .55)
      .set(phone._lift, { visibility: 'visible' }, 1.15)
      .to(phone._lift, { y: 0, rotationY: 0, scale: 1, duration: 1.8, ease: 'power3.out' }, 1.15)
      .add(() => powerOn(mac), 2.2)
      .add(() => powerOn(phone), 2.8);
  };

  if (RM) enter();
  else {
    // hide the closed-laptop start state before it scrolls into view
    gsap.set(hinge, { rotationX: -90 });
    gsap.set(phone._lift, { visibility: 'hidden' });
    ScrollTrigger.create({ trigger: wrap, start: 'top 72%', once: true, onEnter: enter });
  }

  /* ---------------------------------------------------------
     POINTER PARALLAX (desktop)
  --------------------------------------------------------- */
  if (FINE && !RM) {
    const qy = gsap.quickTo(look, 'rotationY', { duration: 1.3, ease: 'power3.out' });
    const qx = gsap.quickTo(look, 'rotationX', { duration: 1.3, ease: 'power3.out' });
    wrap.addEventListener('pointermove', e => {
      const r = wrap.getBoundingClientRect();
      qy(-((e.clientX - r.left) / r.width - .5) * 9);
      qx(((e.clientY - r.top) / r.height - .5) * 5);
    });
    wrap.addEventListener('pointerleave', () => { qy(0); qx(0); });
  }

  /* ---------------------------------------------------------
     HOVER — lift, turn toward you, recede the other device
  --------------------------------------------------------- */
  const focusOn = dev => {
    if (!ready) return;
    wrap.classList.toggle('has-hot', !!dev);
    const u = U();
    devs.forEach(d => {
      const hot = d === dev, dim = !!dev && !hot;
      d.classList.toggle('is-hot', hot);
      d.classList.toggle('is-dim', dim);
      if (RM) return;
      gsap.to(d._lift, {
        z: hot ? 7 * u : dim ? -4 * u : 0,
        scale: hot ? 1.05 : dim ? .96 : 1,
        rotationY: hot ? 10 : 0,
        duration: 1.1, ease: 'expo.out', overwrite: 'auto'
      });
      if (!hot) gsap.to(d._tilt, { rotationX: 0, rotationY: 0, duration: 1, ease: 'power3.out', overwrite: 'auto' });
    });
    if (sway) gsap.to(sway, { timeScale: dev ? .08 : 1, duration: .9, overwrite: 'auto' });
  };

  /* Hit-testing through nested 3D transforms is unreliable (Safari especially), so the stage
     decides what is under the pointer from the screens' on-screen rectangles instead. */
  const hitDev = (x, y) => [phone, mac].find(d => {
    const r = d._screen.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }) || null;

  const cursorEl = $('#cursor'), cursorLab = $('#cursorLabel');
  const setCursor = d => {
    if (!cursorEl || !cursorLab) return;
    cursorEl.classList.toggle('is-label', !!d);
    cursorLab.textContent = d ? (d.dataset.cursor || '') : '';
  };

  let hovered = null;
  const hover = d => { if (d === hovered) return; hovered = d; focusOn(d); setCursor(d); wrap.style.cursor = d ? 'pointer' : ''; };

  if (FINE) {
    wrap.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;
      hover(hitDev(e.clientX, e.clientY));
      if (!RM && hovered && ready) {
        const r = hovered._screen.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5;
        gsap.to(hovered._tilt, { rotationY: -nx * 6, rotationX: ny * 5, duration: .7, ease: 'power3.out', overwrite: 'auto' });
      }
    });
    wrap.addEventListener('pointerleave', () => hover(null));
  }

  devs.forEach(d => {
    d._screen.addEventListener('focus', () => { if (d._screen.matches(':focus-visible')) focusOn(d); });
    d._screen.addEventListener('blur', () => focusOn(null));
    d._screen.addEventListener('click', () => openFull(d));   // keyboard (Enter / Space) and normal clicks
  });
  // clicks / taps that 3D hit-testing sent somewhere else
  wrap.addEventListener('click', e => {
    if (e.target.closest('.cn-screen')) return;
    const d = hitDev(e.clientX, e.clientY);
    if (d) openFull(d);
  });

  // gsap stores pixel transform-origins: refresh them if the stage is resized
  new ResizeObserver(() => {
    gsap.set(devs.flatMap(d => [d._lift, d._tilt]), { transformOrigin: '50% 50%' });
  }).observe(wrap);

  /* ---------------------------------------------------------
     FULL-SCREEN PLAYER
  --------------------------------------------------------- */
  // Mac recording: crop the menu bar (top) and Dock (bottom) in the player too
  const MAC_W = 736, MAC_H = 480, CROP_TOP = .105, CROP_BOT = .065;
  const MAC_AR = MAC_W / (MAC_H * (1 - CROP_TOP - CROP_BOT));   // ≈ 1.85
  const PH_AR = 384 / 848;

  const cf = document.createElement('div');
  cf.className = 'cf';
  cf.setAttribute('role', 'dialog');
  cf.setAttribute('aria-modal', 'true');
  cf.setAttribute('aria-label', 'Website preview, full screen');
  cf.setAttribute('data-lenis-prevent', '');
  cf.innerHTML = `
    <div class="cf-bg"></div>
    <video class="cf-amb" muted loop playsinline aria-hidden="true"></video>
    <div class="cf-frame"><video class="cf-vid" loop playsinline></video><span class="cf-flare"></span></div>
    <div class="cf-ui">
      <button class="cf-btn cf-close" type="button" aria-label="Close full screen"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <button class="cf-btn cf-snd" type="button" aria-pressed="false"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path class="cf-wave" d="M15.5 8.5a5 5 0 010 7M18.5 5.5a9 9 0 010 13"/></svg><span>Sound off</span></button>
      <span class="cf-hint">Click to pause · Esc to close</span>
      <span class="cf-bar"><i></i></span>
    </div>`;
  document.body.appendChild(cf);

  const bg = $('.cf-bg', cf), amb = $('.cf-amb', cf), frame = $('.cf-frame', cf), vid = $('.cf-vid', cf);
  const flare = $('.cf-flare', cf), ui = $('.cf-ui', cf), bar = $('.cf-bar i', cf);
  const btnClose = $('.cf-close', cf), btnSnd = $('.cf-snd', cf), sndLabel = $('span', btnSnd), wave = $('.cf-wave', btnSnd);
  const hintEl = $('.cf-hint', cf), HINT = hintEl.textContent;
  vid.addEventListener('error', () => {
    console.warn('[showcase] full-screen video failed:', vid.currentSrc, vid.error ? 'MediaError code ' + vid.error.code : '');
    hintEl.textContent = "This video couldn't be loaded. Press Esc to close.";
  });
  let lastFocus = null, closing = false;

  const setSound = on => {
    vid.muted = !on;
    btnSnd.setAttribute('aria-pressed', String(on));
    btnSnd.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on');
    sndLabel.textContent = on ? 'Sound on' : 'Sound off';
    wave.style.opacity = on ? 1 : .25;
  };

  const targetRect = mode => {
    const vw = innerWidth, vh = innerHeight;
    let w, h;
    if (mode === 'mac') { w = Math.min(vw, vh * MAC_AR); h = w / MAC_AR; }
    else { h = vh; w = h * PH_AR; if (w > vw) { w = vw; h = w / PH_AR; } }
    return { left: (vw - w) / 2, top: (vh - h) / 2, width: w, height: h };
  };

  function openFull(dev) {
    if (fullOpen || closing) return;
    fullOpen = dev; lastFocus = document.activeElement;
    const mode = dev.dataset.dev, from = dev._screen.getBoundingClientRect(), to = targetRect(mode);

    // video geometry inside the frame
    if (mode === 'mac') vid.style.cssText = `left:0;top:${(-CROP_TOP / (1 - CROP_TOP - CROP_BOT) * 100).toFixed(2)}%;width:100%;height:auto;aspect-ratio:${MAC_W}/${MAC_H}`;
    else vid.style.cssText = 'left:0;top:0;width:100%;height:100%;object-fit:cover';

    const t0 = dev._vid.currentTime || 0;
    vid.poster = dev._vid.getAttribute('poster') || '';
    hintEl.textContent = HINT;
    vid.src = amb.src = dev.dataset.src;
    const begin = () => { try { vid.currentTime = t0; amb.currentTime = t0; } catch (e) {} vid.play().catch(() => {}); amb.play().catch(() => {}); };
    if (vid.readyState >= 1) begin(); else vid.addEventListener('loadedmetadata', begin, { once: true });
    setSound(false);
    sync(dev._vid);                       // pauses the on-page copy

    cf.classList.add('is-on');
    gsap.set([bg, amb, ui], { opacity: 0 });
    gsap.set(flare, { opacity: 0, scaleX: 0 });
    gsap.set(frame, { left: from.left, top: from.top, width: from.width, height: from.height, borderRadius: mode === 'mac' ? 8 : 30, transformPerspective: 1600, rotationY: mode === 'mac' ? -10 : -14, rotationX: 5 });

    if (RM) {
      gsap.set(bg, { opacity: 1 }); gsap.set(amb, { opacity: .9 }); gsap.set(ui, { opacity: 1 });
      gsap.set(frame, { ...to, borderRadius: 0, rotationX: 0, rotationY: 0 });
    } else {
      gsap.timeline({ onComplete: () => gsap.set(frame, { clearProps: 'transform' }) })
        .to(bg, { opacity: 1, duration: .55, ease: 'power2.out' }, 0)
        .to(frame, { ...to, borderRadius: 0, rotationX: 0, rotationY: 0, duration: 1.1, ease: 'expo.inOut' }, 0)
        .to(amb, { opacity: .9, duration: 1.3, ease: 'power1.out' }, .4)
        .to(flare, { opacity: 1, scaleX: 1, duration: .4, ease: 'power2.out' }, .45)
        .to(flare, { opacity: 0, duration: .55, ease: 'power1.in' }, .85)
        .to(ui, { opacity: 1, duration: .5 }, .9);
    }
    btnClose.focus({ preventScroll: true });
  }

  function closeFull() {
    if (!fullOpen || closing) return;
    closing = true;
    const dev = fullOpen, mode = dev.dataset.dev;
    try { dev._vid.currentTime = vid.currentTime; } catch (e) {}
    const done = () => {
      cf.classList.remove('is-on');
      [vid, amb].forEach(v => { v.pause(); v.removeAttribute('src'); v.load(); });
      fullOpen = null; closing = false;
      devs.forEach(d => sync(d._vid));
      lastFocus && lastFocus.focus && lastFocus.focus({ preventScroll: true });
    };
    if (RM) return done();
    gsap.set(frame, { transformPerspective: 1600 });
    const r = dev._screen.getBoundingClientRect();
    gsap.timeline({ onComplete: done })
      .to(ui, { opacity: 0, duration: .2 }, 0)
      .to(frame, { left: r.left, top: r.top, width: r.width, height: r.height, borderRadius: mode === 'mac' ? 8 : 30, rotationY: mode === 'mac' ? -10 : -14, rotationX: 5, duration: .85, ease: 'expo.inOut' }, 0)
      .to(amb, { opacity: 0, duration: .5 }, 0)
      .to(bg, { opacity: 0, duration: .6 }, .25);
  }

  btnClose.addEventListener('click', closeFull);
  btnSnd.addEventListener('click', () => setSound(vid.muted));
  cf.addEventListener('click', e => { if (e.target === cf || e.target === bg || e.target === amb) closeFull(); });
  frame.addEventListener('click', () => { vid.paused ? (vid.play(), amb.play()) : (vid.pause(), amb.pause()); });
  vid.addEventListener('timeupdate', () => { if (vid.duration) bar.style.width = (vid.currentTime / vid.duration * 100) + '%'; });

  // keep the page still while the player is open
  ['wheel', 'touchmove'].forEach(t => cf.addEventListener(t, e => { e.preventDefault(); e.stopPropagation(); }, { passive: false }));
  document.addEventListener('keydown', e => {
    if (!fullOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); closeFull(); }
    else if (e.key === ' ' && document.activeElement === document.body) { e.preventDefault(); frame.click(); }
    else if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key) && !e.target.closest('button')) e.preventDefault();
    else if (e.key === 'Tab') {                                   // keep focus inside the player
      const order = [btnClose, btnSnd], i = order.indexOf(document.activeElement);
      e.preventDefault();
      order[(i + (e.shiftKey ? -1 : 1) + order.length) % order.length].focus();
    }
  });
  addEventListener('resize', () => {
    if (fullOpen && !closing) gsap.set(frame, { ...targetRect(fullOpen.dataset.dev), borderRadius: 0 });
  });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
