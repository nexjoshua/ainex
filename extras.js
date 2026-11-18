/* =========================================================
   extras.js — testimonials + Case Study 02 (ServiceM8) 3D scene
   Needs three.js r128 (global THREE) + GSAP. Load after site.js.
   ========================================================= */
(() => {
  'use strict';
  const S = window.SITE || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = n => n.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  /* ---------------------------------------------------------
     TESTIMONIALS
  --------------------------------------------------------- */
  /* ---------------------------------------------------------
     TESTIMONIALS — swipeable deck
  --------------------------------------------------------- */
  (() => {
    const root = $('#tq');
    const list = (S.testimonials || []).filter(t => t.q && !t.draft);
    if (!root || !list.length) return;
    const stack = $('#tqStack'), faces = $('#tqFaces'), word = $('#tqWord'), count = $('#tqCount');

    // *word* → highlighted; every word wrapped so it can animate in
    const words = q => esc(q).split(/(\*[^*]+\*)/).map(seg => {
      const em = /^\*[^*]+\*$/.test(seg), txt = em ? seg.slice(1, -1) : seg;
      return txt.split(/(\s+)/).map(w => (!w || /^\s+$/.test(w)) ? w : `<span class="qw${em ? ' is-em' : ''}">${w}</span>`).join('');
    }).join('');
    const av = t => `<span class="tq-av" data-initials="${esc(initials(t.name))}">${t.photo ? `<img src="${encodeURI(t.photo)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;

    stack.innerHTML = list.map((t, i) => `
      <article class="tq-card" data-pos="out" aria-roledescription="slide" aria-label="${i + 1} of ${list.length}">
        <span class="tq-mark" aria-hidden="true">“</span>
        <blockquote class="tq-quote">${words(t.q)}</blockquote>
        ${t.work ? `<p class="tq-ctx"><b>Worked on</b>${esc(t.work)}</p>` : ''}
        <footer class="tq-who">${av(t)}<span class="tq-id"><strong>${esc(t.name)}</strong><small>${esc(t.role)} · ${esc(t.company)}</small></span>${t.url ? `<a class="tq-co" href="${t.url}" target="_blank" rel="noopener">${esc(t.company)} ↗</a>` : ''}</footer>
      </article>`).join('');
    faces.innerHTML = list.map(t => `<button type="button" class="tq-face" role="tab" aria-label="${esc(t.name)}, ${esc(t.company)}">${av(t)}<span class="tq-tip">${esc(t.name.split(' ')[0])}</span></button>`).join('');

    const cards = $$('.tq-card', stack), btns = $$('.tq-face', faces), n = cards.length;
    cards.forEach(c => $$('.qw', c).forEach((w, k) => w.style.setProperty('--d', (k * .035) + 's')));

    const DUR = 7000;
    let idx = 0, t0 = performance.now(), prog = 0, hover = false, focus = false, dragging = false, inView = false;

    const layout = (from, dir) => {
      cards.forEach((c, k) => {
        const d = (k - idx + n) % n;
        c.dataset.pos = d < 3 ? String(d) : 'out';
        c.setAttribute('aria-hidden', d ? 'true' : 'false');
        c.style.transform = '';
      });
      if (from != null && from !== idx && dir > 0) {
        const c = cards[from]; c.dataset.fly = 'l';
        setTimeout(() => { delete c.dataset.fly; }, 700);
      }
      btns.forEach((b, k) => { b.classList.toggle('is-on', k === idx); b.setAttribute('aria-selected', String(k === idx)); b.style.setProperty('--p', 0); });
      word.textContent = list[idx].tag || '';
      word.classList.remove('is-in'); void word.offsetWidth; word.classList.add('is-in');
      count.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(n).padStart(2, '0')}`;
      prog = 0; t0 = performance.now();
      const b = btns[idx]; if (b) faces.scrollTo({ left: b.offsetLeft - faces.clientWidth / 2 + b.offsetWidth / 2, behavior: RM ? 'auto' : 'smooth' });
    };
    const go = (to, dir) => { const from = idx; idx = (to + n) % n; layout(from, dir); };

    // keep the stack as tall as the tallest card
    const size = () => { stack.style.height = (Math.max(...cards.map(c => c.offsetHeight)) + 50) + 'px'; };
    new ResizeObserver(size).observe(root);
    size();

    // controls
    $$('.tq-arrow', root).forEach(b => b.addEventListener('click', () => { const d = +b.dataset.dir; go(idx + d, d); }));
    btns.forEach((b, k) => b.addEventListener('click', () => { if (k !== idx) go(k, k > idx ? 1 : -1); }));
    root.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1, 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1, -1); }
    });
    root.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hover = true; });
    root.addEventListener('pointerleave', () => { hover = false; cards[idx].style.removeProperty('--tx'); cards[idx].style.removeProperty('--ty'); });
    root.addEventListener('focusin', () => { focus = true; });
    root.addEventListener('focusout', () => { focus = false; });

    // drag / swipe the top card
    let drag = null;
    stack.addEventListener('pointerdown', e => {
      const c = cards[idx];
      if (!c.contains(e.target) || e.target.closest('a')) return;
      drag = { x: e.clientX, dx: 0, c }; dragging = true;
      c.classList.add('is-drag'); c.setPointerCapture(e.pointerId);
    });
    stack.addEventListener('pointermove', e => {
      if (drag) {
        drag.dx = e.clientX - drag.x;
        drag.c.style.transform = `translateX(${drag.dx}px) rotate(${drag.dx * .03}deg)`;
      } else if (FINE && !RM) {
        const c = cards[idx], r = c.getBoundingClientRect();
        c.style.setProperty('--tx', `${((e.clientX - r.left) / r.width - .5) * 6}deg`);
        c.style.setProperty('--ty', `${-((e.clientY - r.top) / r.height - .5) * 6}deg`);
      }
    });
    const end = () => {
      if (!drag) return;
      const { dx, c } = drag; drag = null; dragging = false;
      c.classList.remove('is-drag');
      if (Math.abs(dx) > 90) go(idx + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
      else c.style.transform = '';
    };
    stack.addEventListener('pointerup', end);
    stack.addEventListener('pointercancel', end);

    // autoplay with a filling ring on the active face
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; }, { threshold: .3 }).observe(root);
    const tick = now => {
      requestAnimationFrame(tick);
      if (RM) return;
      if (hover || focus || dragging || !inView || document.hidden) { t0 = now - prog * DUR; return; }
      prog = Math.min((now - t0) / DUR, 1);
      btns[idx].style.setProperty('--p', prog.toFixed(3));
      if (prog >= 1) go(idx + 1, 1);
    };
    layout();
    requestAnimationFrame(tick);
  })();

  /* ---------------------------------------------------------
     PDF COVER TILT
  --------------------------------------------------------- */
  (() => {
    const doc = $('.cs2-doc');
    if (!doc || !FINE || RM) return;
    doc.addEventListener('pointermove', e => {
      const r = doc.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      doc.style.setProperty('--ry', `${px * 22}deg`);
      doc.style.setProperty('--rx', `${-py * 16}deg`);
    });
    doc.addEventListener('pointerleave', () => { doc.style.removeProperty('--ry'); doc.style.removeProperty('--rx'); });
  })();

  /* ---------------------------------------------------------
     CASE STUDY 02 — 3D PIPELINE
  --------------------------------------------------------- */
  (() => {
    const stage = $('#cs2Stage');
    if (!stage) return;
    const labelsHost = $('#cs2Labels'), status = $('#cs2Status');
    const toggles = $$('.cs2-toggle button', stage), steps = $$('#cs2Steps li');

    const COPY = {
      after: {
        status: 'After: every lead becomes a job, gets allocated to the owner (phone ping), and lands in the Leads queue.',
        nodes: [['CRM stage', '"Send to ServiceM8"'], ['Job created', 'Customer details'], ['Allocated', 'Owner notified instantly'], ['Leads queue', '0 new leads'], ['Client record', 'Only if new']],
      },
      before: {
        status: 'Before: repeat customers broke the chain at "Create client", and jobs that got through landed silently.',
        nodes: [['CRM stage', '"Send to ServiceM8"'], ['Create client', 'Duplicate name = stop'], ['Job created', 'No owner, no alert'], ['No queue', 'Mixed with everything'], ['No notification', 'Owner searches by name']],
      },
    };
    let mode = 'after', queue = 0, focused = -1;

    const labels = COPY.after.nodes.map((_, i) => {
      const d = document.createElement('div');
      d.className = 'cs2-label';
      d.innerHTML = `<b>0${i + 1}</b><strong></strong><small></small>`;
      labelsHost.appendChild(d);
      return d;
    });
    const setQueue = () => { if (mode === 'after') $('small', labels[3]).textContent = `${queue} new lead${queue === 1 ? '' : 's'}`; };
    const setLabels = () => {
      labels.forEach((l, i) => {
        const [a, b] = COPY[mode].nodes[i];
        $('strong', l).textContent = a;
        $('small', l).textContent = b;
        l.classList.toggle('is-off', mode === 'before' && i >= 3);
        l.classList.toggle('is-bad', mode === 'before' && i === 1);
      });
      status.textContent = COPY[mode].status;
      setQueue();
    };

    const pingTimers = [];
    const pingStep = i => {
      const li = steps[i]; if (!li) return;
      li.classList.add('is-ping');
      clearTimeout(pingTimers[i]);
      pingTimers[i] = setTimeout(() => li.classList.remove('is-ping'), 650);
    };
    steps.forEach((li, i) => {
      li.addEventListener('mouseenter', () => { focused = i; labels.forEach((l, k) => l.classList.toggle('is-focus', k === i)); });
      li.addEventListener('mouseleave', () => { focused = -1; labels.forEach(l => l.classList.remove('is-focus')); });
    });

    let onModeChange = () => {};
    toggles.forEach(b => b.addEventListener('click', () => {
      if (b.dataset.mode === mode) return;
      mode = b.dataset.mode;
      stage.dataset.mode = mode;
      toggles.forEach(x => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', String(on)); });
      queue = 0;
      setLabels();
      onModeChange();
    }));
    setLabels();

    /* ---- no WebGL: plain fallback ---- */
    const T = window.THREE;
    let renderer = null;
    if (T) { try { renderer = new T.WebGLRenderer({ canvas: $('#cs2Canvas'), antialias: true, alpha: true, powerPreference: 'high-performance' }); } catch (e) { renderer = null; } }
    if (!renderer) { stage.classList.add('no-3d'); return; }

    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    const scene = new T.Scene();
    scene.fog = new T.Fog(0x05060a, 16, 34);
    const camera = new T.PerspectiveCamera(38, 2, .1, 100);
    const rig = new T.Group(); scene.add(rig);

    scene.add(new T.AmbientLight(0x8fb4c8, .55));
    const key = new T.PointLight(0x9fd0e2, 1.4, 40); key.position.set(0, 6, 6); scene.add(key);
    const warm = new T.PointLight(0xff7a59, .7, 30); warm.position.set(6, -2, 4); scene.add(warm);

    const COL = { core: 0x9fd0e2, ok: 0x4ade80, bad: 0xff5f57, dim: 0x2a3440 };
    const P = [[-7.2, -.2, .6], [-3.6, .7, -.8], [0, -.1, .9], [3.6, .7, -.8], [7.2, -.2, .6]].map(p => new T.Vector3(p[0], p[1], p[2]));
    const curve = new T.CatmullRomCurve3(P, false, 'catmullrom', .5);

    rig.add(new T.Mesh(new T.TubeGeometry(curve, 260, .03, 8, false), new T.MeshBasicMaterial({ color: 0x7fb8cc, transparent: true, opacity: .32 })));
    rig.add(new T.Mesh(new T.TubeGeometry(curve, 260, .14, 8, false), new T.MeshBasicMaterial({ color: 0x7fb8cc, transparent: true, opacity: .05, depthWrite: false })));

    const grid = new T.GridHelper(44, 44, 0x7fb8cc, 0x1b2a33);
    grid.position.y = -2.2; grid.material.transparent = true; grid.material.opacity = .22;
    rig.add(grid);

    // floating dust
    const dustGeo = new T.BufferGeometry(), DN = 260, dp = new Float32Array(DN * 3);
    for (let i = 0; i < DN; i++) { dp[i * 3] = (Math.random() - .5) * 30; dp[i * 3 + 1] = Math.random() * 8 - 2; dp[i * 3 + 2] = (Math.random() - .5) * 16; }
    dustGeo.setAttribute('position', new T.BufferAttribute(dp, 3));
    const dust = new T.Points(dustGeo, new T.PointsMaterial({ color: 0x9fd0e2, size: .035, transparent: true, opacity: .5, depthWrite: false }));
    rig.add(dust);

    // where each station sits along the curve (arc-length parameter)
    const nodeU = P.map(p => {
      let best = 0, bd = Infinity;
      for (let i = 0; i <= 600; i++) { const u = i / 600, d = curve.getPointAt(u).distanceToSquared(p); if (d < bd) { bd = d; best = u; } }
      return best;
    });

    const nodes = P.map((p, i) => {
      const g = new T.Group(); g.position.copy(p); rig.add(g);
      const coreMat = new T.MeshStandardMaterial({ color: 0x0e1a22, emissive: COL.core, emissiveIntensity: .55, roughness: .35, metalness: .6 });
      const core = new T.Mesh(new T.IcosahedronGeometry(.42, 1), coreMat);
      const shellMat = new T.MeshBasicMaterial({ color: COL.core, wireframe: true, transparent: true, opacity: .3 });
      const shell = new T.Mesh(new T.IcosahedronGeometry(.74, 1), shellMat);
      const ringMat = new T.MeshBasicMaterial({ color: COL.core, transparent: true, opacity: 0, side: T.DoubleSide, depthWrite: false });
      const ring = new T.Mesh(new T.RingGeometry(.82, .92, 48), ringMat);
      const h = p.y + 2.2;
      const stem = new T.Mesh(new T.CylinderGeometry(.012, .012, h, 6), new T.MeshBasicMaterial({ color: COL.core, transparent: true, opacity: .16 }));
      stem.position.y = -h / 2;
      g.add(core, shell, ring, stem);
      return { g, core, coreMat, shell, shellMat, ring, ringMat, pulse: 0, focus: 0, tint: new T.Color(COL.core), ringCol: new T.Color(COL.core) };
    });

    // leads-queue stack beside station 4
    const stack = new T.Group(); stack.position.set(1.05, -.6, 0); nodes[3].g.add(stack);
    const boxGeo = new T.BoxGeometry(.34, .08, .24);
    const boxes = Array.from({ length: 8 }, (_, i) => {
      const m = new T.Mesh(boxGeo, new T.MeshStandardMaterial({ color: 0x13235c, emissive: 0x7fb8cc, emissiveIntensity: .4, metalness: .4, roughness: .4 }));
      m.userData.y = i * .11; m.position.y = m.userData.y; m.visible = false; stack.add(m);
      return m;
    });
    const showQueue = () => { const k = queue === 0 ? 0 : ((queue - 1) % 8) + 1; boxes.forEach((b, j) => { const vis = j < k; if (vis && !b.visible) b.position.y = b.userData.y + .7; b.visible = vis; }); };

    // lead packets
    const pktGeo = new T.SphereGeometry(.09, 14, 14);
    const N = 22;
    const pkts = Array.from({ length: N }, (_, i) => {
      const mat = new T.MeshBasicMaterial({ color: COL.core, transparent: true });
      const glowMat = new T.MeshBasicMaterial({ color: COL.core, transparent: true, opacity: .22, depthWrite: false });
      const m = new T.Mesh(pktGeo, mat), glow = new T.Mesh(pktGeo, glowMat);
      glow.scale.setScalar(2.4); m.add(glow); rig.add(m);
      return { m, mat, glowMat, u: -i / N, speed: .07 + Math.random() * .025, state: 'go', vy: 0, life: 1, passed: 0, fail: false };
    });
    const setPC = (p, hex) => { p.mat.color.setHex(hex); p.glowMat.color.setHex(hex); };
    const reset = (p, spread = .3) => {
      p.u = -Math.random() * spread; p.state = 'go'; p.vy = 0; p.life = 1; p.passed = 0;
      p.fail = mode === 'before' && Math.random() < .45;
      setPC(p, COL.core); p.mat.opacity = 1; p.glowMat.opacity = .22; p.m.scale.setScalar(1); p.m.visible = false;
    };

    const arrive = (p, i) => {
      const n = nodes[i];
      if (mode === 'after') {
        n.pulse = 1; n.ringCol.setHex(i === 2 ? COL.ok : COL.core); pingStep(i);
        if (i === 2) setPC(p, COL.ok);
        if (i === 3) { queue++; setQueue(); showQueue(); }
        if (i === 4) p.state = 'fade';
      } else {
        if (i === 0) { n.pulse = 1; n.ringCol.setHex(COL.core); }
        if (i === 1) {
          if (p.fail) { n.pulse = 1; n.ringCol.setHex(COL.bad); setPC(p, COL.bad); p.state = 'fall'; p.vy = 1.4; }
          else { n.pulse = .6; n.ringCol.setHex(COL.core); }
        }
        if (i === 2) { n.pulse = .25; n.ringCol.setHex(COL.dim); p.state = 'fade'; }
      }
    };

    /* ---- camera, sizing, intro ---- */
    const state = { intro: RM || !hasGsap ? 1 : 0 };
    let base = 15, px = 0, py = 0, t = 0;
    const fit = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
      base = Math.max(13, 9.6 / (Math.tan(T.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    };

    const v = new T.Vector3(), tmpC = new T.Color();
    const placeLabels = () => {
      const w = stage.clientWidth, h = stage.clientHeight;
      nodes.forEach((n, i) => {
        n.g.getWorldPosition(v); v.y += 1.05; v.project(camera);
        labels[i].style.transform = `translate(-50%,-100%) translate(${(v.x * .5 + .5) * w}px,${(-v.y * .5 + .5) * h}px)`;
      });
    };

    const update = dt => {
      t += dt;
      const k = state.intro;
      camera.position.set(Math.sin(t * .15) * .6, 2.4 + (1 - k) * 5, base * (1 + (1 - k) * .6));
      camera.lookAt(0, -.15, 0);
      rig.rotation.y += ((px * .3 + Math.sin(t * .2) * .04) - rig.rotation.y) * .05;
      rig.rotation.x += ((py * .12) - rig.rotation.x) * .05;
      dust.rotation.y += dt * .01;

      nodes.forEach((n, i) => {
        n.pulse = Math.max(0, n.pulse - dt * 1.5);
        n.focus += ((focused === i ? 1 : 0) - n.focus) * .12;
        const off = mode === 'before' && i >= 3;
        n.tint.lerp(tmpC.setHex(off ? COL.dim : (mode === 'before' && i === 1 ? COL.bad : COL.core)), .08);
        n.coreMat.emissive.copy(n.tint);
        n.shellMat.color.copy(n.tint);
        n.coreMat.emissiveIntensity = (off ? .12 : .5) + n.pulse * 1.4 + n.focus * .6;
        n.shellMat.opacity = (off ? .07 : .28) + n.focus * .3;
        n.shell.rotation.y += dt * (.3 + i * .05); n.shell.rotation.x += dt * .15;
        n.core.rotation.y -= dt * .4;
        n.core.scale.setScalar(1 + n.pulse * .25 + n.focus * .18);
        n.ringMat.color.copy(n.ringCol);
        n.ringMat.opacity = n.pulse * .85;
        n.ring.scale.setScalar(1 + (1 - n.pulse) * 1.7);
        n.g.position.y = P[i].y + Math.sin(t * 1.2 + i) * .07;
      });
      boxes.forEach(b => { if (b.visible) b.position.y += (b.userData.y - b.position.y) * .15; });

      pkts.forEach(p => {
        if (RM) { const u = Math.max(0, Math.min(1, p.u)); curve.getPointAt(u, p.m.position); p.m.visible = p.u >= 0; return; }
        if (p.state === 'go') {
          p.u += p.speed * dt;
          if (p.u < 0) { p.m.visible = false; return; }
          p.m.visible = true;
          while (p.passed < nodeU.length && p.u >= nodeU[p.passed]) { arrive(p, p.passed); p.passed++; if (p.state !== 'go') break; }
          if (p.state === 'go') { curve.getPointAt(Math.min(p.u, 1), p.m.position); if (p.u >= 1) reset(p); }
        } else if (p.state === 'fall') {
          p.vy -= 9 * dt; p.m.position.y += p.vy * dt; p.m.position.z += dt * .8;
          p.life -= dt * .9; p.mat.opacity = Math.max(p.life, 0); p.glowMat.opacity = Math.max(p.life, 0) * .3;
          if (p.life <= 0) reset(p);
        } else {
          p.life -= dt * 1.6; p.mat.opacity = Math.max(p.life, 0); p.glowMat.opacity = Math.max(p.life, 0) * .25;
          p.m.scale.setScalar(1 + (1 - p.life) * 1.6);
          if (p.life <= 0) reset(p);
        }
      });
    };

    const still = () => { update(0); renderer.render(scene, camera); placeLabels(); };

    onModeChange = () => { pkts.forEach((p, i) => { reset(p, .05); p.u = -i / N * .9; }); showQueue(); if (RM) { pkts.forEach((p, i) => { p.u = i / N; }); still(); } };

    new ResizeObserver(() => { fit(); if (RM) still(); }).observe(stage);
    fit();

    if (FINE && !RM) {
      stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(); px = (e.clientX - r.left) / r.width - .5; py = (e.clientY - r.top) / r.height - .5; });
      stage.addEventListener('pointerleave', () => { px = 0; py = 0; });
    }
    if (hasGsap && !RM) ScrollTrigger.create({ trigger: stage, start: 'top 80%', once: true, onEnter: () => gsap.to(state, { intro: 1, duration: 2.6, ease: 'power3.out' }) });

    if (RM) { pkts.forEach((p, i) => { p.u = i / N; }); still(); return; }

    let raf = 0, running = false, inView = false, last = 0;
    const frame = now => {
      const dt = Math.min((now - last) / 1000, .05); last = now;
      update(dt); renderer.render(scene, camera); placeLabels();
      raf = requestAnimationFrame(frame);
    };
    const start = () => { if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView && !document.hidden ? start() : stop(); }, { rootMargin: '120px 0px' }).observe(stage);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : inView && start(); });
    still();
  })();
})();
/* =========================================================
   HIRING AUTOMATION SIMULATOR (Cool-A-Bah)
   Edit RULES to match the real "Sort applicant" branches.
   ========================================================= */
(() => {
  'use strict';
  const form = document.getElementById('hsForm');
  if (!form) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RULES = { priorityTechYears: 3, priorityInstallerYears: 2 };

  const branches = Array.from(document.querySelectorAll('#hsTree .hs-branches li'));
  const result = document.getElementById('hsResult');
  const time = document.getElementById('hsTime');
  const yearsOut = document.getElementById('hsYearsOut');
  const ORDER = ['basics', 'nolic', 'pst', 'pin', 'pot'];
  const COLORS = { priority: '#4ade80', potential: '#f5b83d', unsuitable: '#ff5f57' };

  const read = () => {
    const d = new FormData(form);
    return { role: d.get('role'), loc: d.get('loc'), rtw: d.get('rtw'), arc: d.get('arc'), years: +d.get('years'), com: d.get('com'), reply: d.get('reply') };
  };

  // mirrors Workflow 1's branch order: first match wins
  const sort = a => {
    if (a.rtw === 'No' || a.loc === 'Other') return 'basics';
    if (a.role === 'Service Technician' && a.arc === 'No') return 'nolic';
    if (a.role !== 'AC Installer' && a.arc === 'Yes' && a.years >= RULES.priorityTechYears) return 'pst';
    if (a.role !== 'Service Technician' && a.years >= RULES.priorityInstallerYears) return 'pin';
    return 'pot';
  };
  const category = b => (b === 'basics' || b === 'nolic') ? 'unsuitable' : (b === 'pot' ? 'potential' : 'priority');
  const roleTag = r => r === 'AC Installer' ? 'role-installer' : r === 'Service Technician' ? 'role-service-tech' : 'role-both';

  let timers = [];
  const clear = () => { timers.forEach(clearTimeout); timers = []; };

  const renderResult = (a, b) => {
    const cat = category(b);
    const title = { basics: 'Not a fit (basics)', nolic: 'Not a fit (no licence)', pst: 'Priority service tech', pin: 'Priority installer', pot: 'Potential, worth a look' }[b];
    const acts = cat === 'unsuitable'
      ? ['Opportunity moves to Unsuitable – Auto-Acknowledged', 'Waits 2 hours', 'Sends a polite acknowledgement email', 'Nobody on the team has to reply']
      : [`Opportunity moves to ${cat === 'priority' ? 'Priority – Ready for Review' : 'Potential'}`, 'Team gets an internal notification straight away', 'Info request email with the follow-up form link', 'SMS with the same link'];
    if (a.com === 'Yes') acts.push('Commercial refrigeration flag: the team gets a ★ alert (Workflow 1c)');
    const tags = ['coolabah-applicant', `category-${cat}`, ...(cat === 'unsuitable' ? [] : ['info-requested']), roleTag(a.role), ...(a.com === 'Yes' ? ['commercial-refrigeration'] : [])];
    result.style.setProperty('--hc', COLORS[cat]);
    result.innerHTML = `
      <span class="hs-badge">${cat}</span>
      <h4>${title}</h4>
      <ul class="hs-acts">${acts.map((t, i) => `<li style="--i:${i}"${t.startsWith('Commercial') ? ' class="is-star"' : ''}>${t}</li>`).join('')}</ul>
      <div class="hs-tags">${tags.map(t => `<code>${t}</code>`).join('')}</div>`;
  };

  const renderTime = (a, b) => {
    const cat = category(b);
    let steps;
    if (cat === 'unsuitable') {
      steps = [['Day 0', 'Sorted & tagged', 'Category set to unsuitable, no chase needed.', COLORS.unsuitable],
               ['+2 hours', 'Polite reply', 'An acknowledgement email goes out automatically.'],
               ['Done', 'Closed', 'Zero manual follow-up for the team.']];
    } else if (a.reply === 'yes') {
      steps = [['Day 0', 'Info requested', 'Email + SMS with the follow-up form link.'],
               ['When they submit', 'Follow-up form', 'Experience summary, equipment, qualifications and an optional resume.'],
               ['Instantly', 'Info Received', 'Tag swapped to info-received, opportunity moves to Needs Review.', COLORS.priority],
               ['Instantly', cat === 'priority' ? 'Priority alert' : 'Team notified', cat === 'priority' ? 'The hiring manager is alerted to a priority applicant.' : 'The team gets their full details and resume by email.', COLORS.priority]];
    } else {
      steps = [['Day 0', 'Info requested', 'Email + SMS with the follow-up form link.'],
               ['Day 2', 'SMS reminder', 'Still no details? A friendly nudge by text.', COLORS.potential],
               ['Day 5', 'Email reminder', 'One more reminder, by email.', COLORS.potential],
               ['Day 7', cat === 'priority' ? 'Give them a call' : 'Closed out', cat === 'priority' ? 'Priority applicants trigger an internal SMS: call them instead.' : 'Tagged no-response and moved to the No Response stage.', cat === 'priority' ? COLORS.priority : COLORS.unsuitable]];
    }
    time.innerHTML = steps.map(([when, t, d, c], i) => `<li style="--i:${i}${c ? `;--tc:${c}` : ''}"><b>${when}</b><strong>${t}</strong><p>${d}</p></li>`).join('');
  };

  const run = () => {
    clear();
    const a = read(), b = sort(a), hit = ORDER.indexOf(b);
    yearsOut.textContent = a.years + (a.years >= 10 ? '+' : '');
    const color = COLORS[category(b)];
    branches.forEach(li => { li.className = ''; li.style.removeProperty('--hc'); });
    const step = RM ? 0 : 140;
    ORDER.forEach((key, i) => {
      if (i > hit) return;
      const li = branches[i];
      timers.push(setTimeout(() => {
        li.classList.add('is-check');
        timers.push(setTimeout(() => {
          li.classList.remove('is-check');
          if (i === hit) { li.style.setProperty('--hc', color); li.classList.add('is-hit'); }
          else li.classList.add('is-skip');
        }, step));
      }, i * step * 1.4));
    });
    timers.push(setTimeout(() => { renderResult(a, b); renderTime(a, b); }, RM ? 0 : hit * step * 1.4 + step));
  };

  form.addEventListener('input', run);
  form.addEventListener('change', run);
  document.querySelectorAll('input[name="reply"]').forEach(r => r.addEventListener('change', run));

  // first run when the section scrolls into view
  if ('IntersectionObserver' in window && !RM) {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { run(); io.disconnect(); } }, { threshold: .3 });
    io.observe(document.getElementById('hs'));
  } else run();
})();
/* =========================================================
   SIDEBAR — Work sub-menu: open + highlight while scrolling
   ========================================================= */
(() => {
  const group = document.querySelector('.side-group');
  if (!group || !window.ScrollTrigger) return;
  const $ = s => document.querySelector(s);
  const link = k => group.querySelector(`[data-sub="${k}"]`);

  [['automations', '#automation-spotlight', '#automation-library'], ['websites', '#websites', '#all-sites']].forEach(([k, a, b]) => {
    if (!$(a)) return;
    ScrollTrigger.create({ trigger: a, endTrigger: $(b) ? b : a, start: 'top 55%', end: 'bottom 55%',
      onToggle: s => link(k).classList.toggle('is-on', s.isActive) });
  });

  // keep the sub-menu open anywhere in the Work area (flagship builds → AI voice agent)
  ScrollTrigger.create({ trigger: '#work', endTrigger: '#ai-voice-agent', start: 'top 55%', end: 'bottom 55%',
    onToggle: s => group.classList.toggle('is-open', s.isActive) });
})();