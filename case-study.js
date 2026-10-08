(() => {
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const HAS_IO = 'IntersectionObserver' in window;
  const root = document.documentElement;
  const $$ = (sel, scope = document) => Array.from(scope.querySelectorAll(sel));
  const lenisDo = (method) => { try { lenis[method](); } catch (e) {} };
  const resetCursor = () => { try { cursor.classList.remove('is-click', 'is-view'); } catch (e) {} };

  /* ================= skip link (script.js intercepts #anchors) ================= */
  document.querySelector('.cs-skip')?.addEventListener('click', () => {
    const main = document.getElementById('main');
    if (!main) return;
    main.setAttribute('tabindex', '-1');
    main.focus({ preventScroll: true });
  });

  /* ================= scroll reveals with stagger ================= */
  (function reveals() {
    const els = $$('.cs-reveal');
    if (!els.length) return;
    if (RM || !HAS_IO) { els.forEach((el) => el.classList.add('is-in')); return; }

    const io = new IntersectionObserver((entries) => {
      let i = 0;
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        const delay = Math.min(i++, 6) * 0.09;
        target.style.setProperty('--cs-delay', `${delay}s`);
        target.classList.add('is-in');
        io.unobserve(target);
        // hand transitions back to the element's own hover styles once revealed
        setTimeout(() => {
          target.classList.remove('cs-reveal');
          target.style.removeProperty('--cs-delay');
        }, (delay + 1) * 1000);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    els.forEach((el) => io.observe(el));
  })();

  /* ================= count-ups ================= */
  (function counters() {
    const els = $$('.cs-stats [data-count]');
    if (!els.length || RM || !HAS_IO) return;
    const fmt = (n) => Math.round(n).toLocaleString('en-US');
    const ease = (t) => 1 - Math.pow(1 - t, 3);

    const run = (el) => {
      const to = parseFloat(el.dataset.count) || 0;
      const t0 = performance.now();
      const step = (now) => {
        const p = Math.min((now - t0) / 1600, 1);
        el.textContent = fmt(to * ease(p));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const io = new IntersectionObserver((entries) => {
      entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;
        io.unobserve(target);
        run(target);
      });
    }, { threshold: 0.6 });

    els.forEach((el) => { el.textContent = '0'; io.observe(el); });
  })();

  /* ================= system map: draw-in lines, traveling dots, node sequence ================= */
  (function systemMap() {
    const fig = document.querySelector('.cs-system-map');
    const svg = fig?.querySelector('.cs-map-lines');
    if (!fig || !svg) return;

    const NS = 'http://www.w3.org/2000/svg';
    const STEP = 0.22;
    const nodes = $$('.cs-node', fig);
    const order = new Map(nodes.map((n, i) => [n.id, i]));
    const targets = (n) => (n.dataset.to || '').split(/\s+/).filter(Boolean);
    let edges = [];
    let started = false;
    let visible = false;
    let raf = 0;

    // offset* ignores CSS transforms, so the lit-node scale animation can't skew the lines
    const box = (el) => {
      let x = 0, y = 0, n = el;
      while (n && n !== fig) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    };

    const curve = (a, b, off) => {
      const ax = a.x + a.w / 2, ay = a.y + a.h / 2;
      const bx = b.x + b.w / 2, by = b.y + b.h / 2;
      const dx = bx - ax, dy = by - ay;
      const r = (v) => Math.round(v * 10) / 10;

      if (Math.abs(dx) > Math.abs(dy)) {
        const s = Math.sign(dx);
        const x1 = ax + s * a.w / 2, x2 = bx - s * b.w / 2;
        const y1 = ay + off, y2 = by + (ay - by) * 0.35 + off;
        const mx = (x1 + x2) / 2;
        return `M${r(x1)} ${r(y1)}C${r(mx)} ${r(y1)} ${r(mx)} ${r(y2)} ${r(x2)} ${r(y2)}`;
      }
      const s = Math.sign(dy);
      const y1 = ay + s * a.h / 2, y2 = by - s * b.h / 2;
      const x1 = ax + off, x2 = bx + (ax - bx) * 0.35 + off;
      const my = (y1 + y2) / 2;
      return `M${r(x1)} ${r(y1)}C${r(x1)} ${r(my)} ${r(x2)} ${r(my)} ${r(x2)} ${r(y2)}`;
    };

    function build() {
      svg.setAttribute('viewBox', `0 0 ${fig.clientWidth} ${fig.clientHeight}`);
      svg.replaceChildren();
      edges = [];

      nodes.forEach((src) => {
        targets(src).forEach((id) => {
          const dst = document.getElementById(id);
          if (!dst || !fig.contains(dst)) return;
          const twoWay = targets(dst).includes(src.id);
          const off = twoWay ? (order.get(src.id) < order.get(id) ? -7 : 7) : 0;

          const path = document.createElementNS(NS, 'path');
          path.setAttribute('class', 'cs-map-path');
          path.setAttribute('pathLength', '1');
          path.setAttribute('d', curve(box(src), box(dst), off));

          const dot = document.createElementNS(NS, 'circle');
          dot.setAttribute('class', 'cs-map-dot');
          dot.setAttribute('r', '3.5');

          svg.append(path, dot);
          const len = path.getTotalLength();
          edges.push({ path, dot, len, step: order.get(src.id), dur: Math.max(1400, len / 0.11), phase: Math.random() });
        });
      });

      if (started) {
        edges.forEach((e) => {
          e.path.classList.add('is-drawn');
          if (!RM) e.dot.classList.add('is-on');
        });
      }
    }

    function loop(now) {
      raf = 0;
      if (!visible || RM) return;
      edges.forEach((e) => {
        if (!e.dot.classList.contains('is-on')) return;
        const p = e.path.getPointAtLength(((now / e.dur + e.phase) % 1) * e.len);
        e.dot.setAttribute('transform', `translate(${p.x} ${p.y})`);
      });
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (started) return;
      started = true;
      nodes.forEach((n, i) => {
        n.style.setProperty('--cs-delay', `${RM ? 0 : i * STEP}s`);
        n.classList.add('is-lit');
      });
      if (RM) { edges.forEach((e) => e.path.classList.add('is-drawn')); return; }

      requestAnimationFrame(() => edges.forEach((e) => {
        const d = e.step * STEP + 0.15;
        e.path.style.setProperty('--cs-delay', `${d}s`);
        e.path.classList.add('is-drawn');
        setTimeout(() => e.dot.classList.add('is-on'), (d + 0.9) * 1000);
      }));
      if (!raf) raf = requestAnimationFrame(loop);
    }

    build();

    let pending = 0;
    const rebuild = () => {
      if (pending) return;
      pending = requestAnimationFrame(() => { pending = 0; build(); });
    };
    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(rebuild);
      [fig, ...nodes].forEach((el) => ro.observe(el));
    } else {
      window.addEventListener('resize', rebuild);
    }
    document.fonts?.ready.then(rebuild).catch(() => {});

    if (!HAS_IO) { visible = true; start(); return; }
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      if (visible && started && !raf) raf = requestAnimationFrame(loop);
    }, { threshold: 0.2 }).observe(fig);
  })();

  /* ================= cursor tilt (desktop only) ================= */
  (function tilt() {
    if (RM || !FINE) return;
      $$('.cs-mac[data-tilt], .cs-phone[data-tilt]').forEach((el) => {
      const max = el.classList.contains('cs-mac') ? 7 : 10;
      let px = 0, py = 0, raf = 0;
      const apply = () => {
        raf = 0;
        el.style.setProperty('--tilt-x', `${(px * max).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${(-py * max * 0.8).toFixed(2)}deg`);
      };
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        px = (e.clientX - r.left) / r.width - 0.5;
        py = (e.clientY - r.top) / r.height - 0.5;
        if (!raf) raf = requestAnimationFrame(apply);
      });
      el.addEventListener('pointerleave', () => {
        px = py = 0;
        if (!raf) raf = requestAnimationFrame(apply);
      });
    });
  })();

  /* ================= slight parallax ================= */
  (function parallax() {
    const els = $$('[data-parallax]');
    if (!els.length || RM) return;
    const current = new Map();
    let raf = 0;

    const update = () => {
      raf = 0;
      const vh = window.innerHeight;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        const prev = current.get(el) || 0;
        const top = r.top - prev; // remove our own offset before measuring
        if (top + r.height < -200 || top > vh + 200) return;
        const f = parseFloat(el.dataset.parallax) || 0.1;
        const y = (top + r.height / 2 - vh / 2) * -f;
        current.set(el, y);
        el.style.setProperty('--cs-py', `${y.toFixed(1)}px`);
      });
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(update); };

    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    update();
  })();

  /* ================= phone videos: play in view, pause off-screen ================= */
  (function videos() {
    const vids = $$('.cs-video');
    if (!vids.length) return;
    const PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    const PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

    vids.forEach((v) => {
      const phone = v.closest('.cs-phone') || v.parentElement;
      const label = v.getAttribute('aria-label') || 'demo video';
      const btn = document.createElement('button');
      let userPaused = false;

      btn.type = 'button';
      btn.className = 'cs-play';
      const sync = () => {
        const playing = !v.paused;
        phone.classList.toggle('is-playing', playing);
        btn.innerHTML = playing ? PAUSE : PLAY;
        btn.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'}: ${label}`);
      };

      btn.addEventListener('click', () => {
        if (v.paused) { userPaused = false; v.play().catch(() => {}); }
        else { userPaused = true; v.pause(); }
      });
      v.addEventListener('play', sync);
      v.addEventListener('pause', sync);
      v.muted = true;
      phone.append(btn);
      sync();

      if (RM || !HAS_IO) return;
      new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting && !userPaused) v.play().catch(() => {});
        else if (!entry.isIntersecting) v.pause();
      }, { threshold: 0.35 }).observe(v);
    });
  })();

  /* ================= shared <dialog> helpers ================= */
  const dialogs = (() => {
    const supported = typeof HTMLDialogElement === 'function';
    const FOCUSABLE = 'a[href], button:not([disabled]), iframe, [tabindex]:not([tabindex="-1"])';
    let lastFocus = null;

    function open(d) {
      lastFocus = document.activeElement;
      resetCursor();
      d.showModal();
      root.classList.add('cs-locked');
      lenisDo('stop');
      d.querySelector('.cs-dialog-close')?.focus();
    }

    function wire(d) {
      d.addEventListener('close', () => {
        root.classList.remove('cs-locked');
        lenisDo('start');
        lastFocus?.focus?.({ preventScroll: true });
      });
      d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
      d.addEventListener('keydown', (e) => {
        if (e.key !== 'Tab') return;
        const items = $$(FOCUSABLE, d).filter((el) => el.getClientRects().length);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && (document.activeElement === first || !d.contains(document.activeElement))) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      });
      $$('.cs-dialog-close', d).forEach((b) => b.addEventListener('click', () => d.close()));
    }

    return { supported, open, wire };
  })();

  /* ================= gallery lightbox: arrows, Esc, swipe ================= */
  (function lightbox() {
    const d = document.getElementById('csLightbox');
    const shots = $$('.cs-gallery .cs-shot');
    if (!d || !shots.length) return;

    const items = shots.map((b) => {
      const img = b.querySelector('img');
      return {
        src: img.src,
        alt: img.alt,
        cap: b.parentElement.querySelector('p')?.textContent.trim() || img.alt,
      };
    });
    const img = d.querySelector('.cs-lightbox-img');
    const cap = d.querySelector('.cs-lightbox-caption');
    const count = d.querySelector('.cs-lightbox-count');
    const fig = d.querySelector('.cs-lightbox-figure');
    let idx = 0;

    img.draggable = false;

    const show = (i) => {
      idx = (i + items.length) % items.length;
      const it = items[idx];
      const done = () => d.classList.remove('is-loading');
      d.classList.add('is-loading');
      img.onload = img.onerror = done;
      img.src = it.src;
      img.alt = it.alt;
      if (img.complete) done();
      cap.textContent = it.cap;
      count.textContent = `${idx + 1} / ${items.length}`;
    };

    const openAt = (i) => {
      if (!dialogs.supported) { window.open(items[i].src, '_blank', 'noopener'); return; }
      show(i);
      dialogs.open(d);
    };

    shots.forEach((b, i) => b.addEventListener('click', () => openAt(i)));
    $$('[data-lightbox-index]').forEach((b) => {
      b.addEventListener('click', () => openAt(Math.min(+b.dataset.lightboxIndex || 0, items.length - 1)));
    });

    d.querySelector('.cs-lightbox-prev')?.addEventListener('click', () => show(idx - 1));
    d.querySelector('.cs-lightbox-next')?.addEventListener('click', () => show(idx + 1));
    d.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });

    let sx = 0, sy = 0;
    fig?.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    fig?.addEventListener('pointerup', (e) => {
      const dx = e.clientX - sx;
      const dy = e.clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1));
    });

    dialogs.wire(d);
  })();

  /* ================= PDF viewer (modal on desktop, new tab on mobile/iOS) ================= */
  (function pdf() {
    const link = document.querySelector('[data-pdf-open]');
    const d = document.getElementById('csPdf');
    if (!link || !d) return;
    const frame = d.querySelector('.cs-pdf-frame');

    const useNativeViewer = () =>
      /iPad|iPhone|iPod|Android/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ||
      matchMedia('(max-width: 900px)').matches;

    link.addEventListener('click', (e) => {
      if (!dialogs.supported || e.metaKey || e.ctrlKey || e.shiftKey || useNativeViewer()) return;
      e.preventDefault();
      if (frame && !frame.getAttribute('src')) frame.src = frame.dataset.src;
      dialogs.open(d);
    });

    dialogs.wire(d);
  })();
})();
