gsap.registerPlugin(ScrollTrigger);

// iOS/Android address bars resizing mid-scroll used to fire a "resize"
// event that made ScrollTrigger recalculate every pinned section on the
// spot — that's what was causing the hero to jump/shake as you scrolled.
// This tells ScrollTrigger to ignore those height-only "resizes".
ScrollTrigger.config({ ignoreMobileResize: true });

/* ================= preloader ================= */
(function initPreloader() {
  const pre = document.getElementById('preloader');
  if (!pre) return;
  const video = pre.querySelector('video');
  const PLAY_DURATION = 3000;   // play normally for 3s
  const FF_DURATION = 1000;     // then fast-forward to the last frame over 1s (3s-4s)
  const MAX_WAIT = 4400;        // safety fallback slightly after the ff completes
  let done = false;

  function hide() {
    if (done) return;
    done = true;
    pre.classList.add('is-hidden');
    document.body.classList.remove('is-loading');
    setTimeout(() => pre.remove(), 800);
  }

  function fastForwardToEnd() {
    if (!video || !video.duration || done) return;
    video.pause();
    const startTime = video.currentTime;
    const endTime = video.duration;
    const startReal = performance.now();

    function step(now) {
      if (done) return;
      const elapsed = now - startReal;
      const progress = Math.min(elapsed / FF_DURATION, 1);
      video.currentTime = startTime + progress * (endTime - startTime);
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        hide();
      }
    }
    requestAnimationFrame(step);
  }

  document.body.classList.add('is-loading');

  if (video) {
    video.play().catch(() => {});
    setTimeout(fastForwardToEnd, PLAY_DURATION);
  } else {
    setTimeout(hide, PLAY_DURATION);
  }

  setTimeout(hide, MAX_WAIT);
  pre.addEventListener('click', hide);
})();

/* ================= Lenis smooth scroll ================= */
const lenis = new Lenis({
  duration: 0.5,
  easing: (t) => 1 - Math.pow(1 - t, 3),
  smoothWheel: true,
  syncTouch: true,       // keeps pinned sections from jittering under touch scroll
  syncTouchLerp: 0.075,
});
lenis.on('scroll', ScrollTrigger.update);
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);

/* ================= custom cursor (two states: click + view) ================= */
const cursor = document.getElementById('cursor');
let cx = 0, cy = 0, tx = 0, ty = 0;
window.addEventListener('mousemove', (e) => {
  tx = e.clientX; ty = e.clientY;
});
gsap.ticker.add(() => {
  cx += (tx - cx) * 0.14;
  cy += (ty - cy) * 0.14;
  cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
});

// links / buttons / nav -> small glowing dot ("click" affordance)
document.querySelectorAll('a, .nav-cta, .btn, .navlink').forEach((el) => {
  el.addEventListener('mouseenter', () => cursor.classList.add('is-click'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('is-click'));
});

// images / info boxes / cards -> ring with expand icon ("view" affordance)
document.querySelectorAll('[data-cursor="expand"]').forEach((el) => {
  el.addEventListener('mouseenter', () => cursor.classList.add('is-view'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('is-view'));
});

/* ================= hero: pinned for a long scroll so the full video plays out ================= */
const HERO_END = '+=160%'; // extra scroll distance the hero stays pinned for

if (document.querySelector('.hero')) {
  // The scroll-tied tint layer is desktop-only — on mobile it was tied to a
  // very long scrub range (hero pin + 160%) and, combined with the fixed
  // full-viewport blur layer, produced a stray blue band as it composited
  // mid-scroll. Mobile just keeps it off (see CSS: .layout-gradient /
  // .backdrop-blur-layer are disabled under 900px too).
  const heroGradientMM = gsap.matchMedia();
  heroGradientMM.add('(min-width: 901px)', () => {
    gsap.to('.home-gradient', {
      opacity: 1,
      scrollTrigger: { trigger: '.hero', start: 'top top', end: HERO_END, scrub: true },
    });
  });

  gsap.to('#scrollHint', {
    opacity: 0,
    scrollTrigger: { trigger: '.hero', start: 'top top', end: '15% top', scrub: true },
  });
}

/* hero shatter sequence: pre-loaded JPG frames drawn to canvas and swapped instantly
   based on scroll progress — no video seeking involved, so it's perfectly smooth and
   exactly in sync with scroll speed in both directions, fast or slow. */
const heroCanvas = document.getElementById('heroShatterCanvas');
if (heroCanvas) {
  const ctx = heroCanvas.getContext('2d');
  const FRAME_COUNT = 193; // total extracted frames (all still preloaded)
  const RELEASE_EARLY_BY = 20; // pin releases once we'd have reached this many frames before the very last one
  const RELEASE_FRAME_COUNT = FRAME_COUNT - RELEASE_EARLY_BY; // 173 — the sequence is treated as "done" here
  const frames = new Array(FRAME_COUNT);
  let loadedCount = 0;
  let ready = false;
  let currentFrame = -1;

  function frameSrc(i) {
    return `frames/frame_${String(i + 1).padStart(3, '0')}.jpg`;
  }

  function resizeCanvas() {
    const rect = heroCanvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    heroCanvas.width = rect.width * dpr;
    heroCanvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw(Math.max(currentFrame, 0));
  }

  function draw(index) {
    const img = frames[index];
    if (!img || !img.complete || !img.naturalWidth) return;
    currentFrame = index;
    const cw = heroCanvas.width / (window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2) : 1);
    const ch = heroCanvas.height / (window.devicePixelRatio ? Math.min(window.devicePixelRatio, 2) : 1);
    // cover-fit math so the frame fills the canvas edge-to-edge like object-fit:cover
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    const x = (cw - w) / 2;
    const y = (ch - h) / 2;
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, x, y, w, h);
  }

  for (let i = 0; i < FRAME_COUNT; i++) {
    const img = new Image();
    img.src = frameSrc(i);
    img.onload = () => {
      loadedCount++;
      if (i === 0) { resizeCanvas(); }
      if (loadedCount === FRAME_COUNT) { ready = true; ScrollTrigger.refresh(); }
    };
    frames[i] = img;
  }

  // Only force a full ScrollTrigger refresh on real width changes
  // (actual resize/orientation change) — not on mobile address-bar
  // show/hide, which also fires "resize" but only changes height and
  // was causing the pinned hero to jump mid-scroll.
  let heroLastWidth = window.innerWidth;
  window.addEventListener('resize', () => {
    resizeCanvas();
    if (window.innerWidth !== heroLastWidth) {
      heroLastWidth = window.innerWidth;
      ScrollTrigger.refresh();
    }
  });
  resizeCanvas();

  const heroContentEl = document.getElementById('heroContent');
  const heroNamecardEl = document.getElementById('heroNamecard');
  // shatter frames run across the ENTIRE pinned scroll (frame 1 at the very top,
  // last frame right as the pin is about to release). The name pops in at the
  // midpoint as a short, clean swap — not a long overlapping blur.
  const SWAP_CENTER = 0.5;
  const SWAP_WINDOW = 0.06; // narrow — a quick pop, not a slow dissolve
  const SWAP_START = SWAP_CENTER - SWAP_WINDOW / 2;
  const SWAP_END = SWAP_CENTER + SWAP_WINDOW / 2;

  ScrollTrigger.create({
    trigger: '.hero',
    start: 'top top',
    end: HERO_END,
    pin: true,
    pinType: 'transform', // the reliable mode when combined with Lenis
    pinSpacing: true,
    anticipatePin: 1,
    scrub: 0, // 1:1 with scroll — no smoothing delay, so it truly fast-forwards/rewinds at scroll speed
    onUpdate: (self) => {
      const p = self.progress;

      const idx = Math.min(Math.round(p * (RELEASE_FRAME_COUNT - 1)), FRAME_COUNT - 1);
      if (idx !== currentFrame) draw(idx);

      if (heroContentEl && heroNamecardEl) {
        const cf = Math.min(Math.max((p - SWAP_START) / (SWAP_END - SWAP_START), 0), 1);
        gsap.set(heroContentEl, {
          opacity: 1 - cf,
          y: -cf * 30,
          scale: 1 - cf * 0.05,
          filter: `blur(${cf * 14}px)`,
          pointerEvents: cf > 0.5 ? 'none' : 'auto',
        });
        gsap.set(heroNamecardEl, {
          opacity: cf,
          y: (1 - cf) * 24,
          scale: 0.94 + cf * 0.06,
          filter: `blur(${(1 - cf) * 14}px)`,
          pointerEvents: cf > 0.5 ? 'auto' : 'none',
        });
      }
    },
  });
}

/* ================= "Real Results" — desktop gets the pinned scrub
   animation, mobile gets a plain swipeable reveal ================= */
const proofMM = gsap.matchMedia();

proofMM.add('(min-width: 901px)', () => {
  if (document.getElementById('proofLogoBg')) {
    gsap.fromTo('#proofLogoBg img',
      { rotate: -18, scale: .92 },
      { rotate: 18, scale: 1.08, ease: 'none',
        scrollTrigger: { trigger: '#proof', start: 'top top', end: '+=150%', scrub: 0.6 } }
    );
  }

  if (document.getElementById('proofPin')) {
    const proofTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#proof', start: 'top top', end: '+=150%', scrub: 0.6,
        pin: '#proofPin', pinType: 'transform',
      },
    });
    document.querySelectorAll('.review-card').forEach((card) => {
      const x = parseFloat(card.dataset.x || 0);
      const r = parseFloat(card.dataset.r || 0);
      gsap.set(card, { xPercent: -50, yPercent: -50, x, y: 90, rotate: r, opacity: 0 });
    });
    proofTl
      .from('.proof-heading', { opacity: 0, scale: 0.4, duration: 0.4 })
      .to('.proof-heading', { opacity: 1, scale: 1, duration: 0.001 }, 0)
      .to('.proof-heading', { opacity: 0, y: -40, duration: 0.3 }, 0.35)
      .to('.review-card', {
        opacity: 1, y: 0,
        x: (i, el) => parseFloat(el.dataset.x || 0),
        rotate: (i, el) => parseFloat(el.dataset.r || 0),
        stagger: 0.15, duration: 0.6, ease: 'power2.out',
      }, 0.3);
  }
});

proofMM.add('(max-width: 900px)', () => {
  // No pin, no scroll-hijack — the pinned scrub animation depended on a
  // stable 100vh, which mobile browsers change mid-scroll as the address
  // bar hides/shows, so only the middle card ever reliably finished
  // fading in. Here all three cards sit in a compact 3-up grid so they're
  // all visible together, with a light fade-in like the rest of the page.
  gsap.set('.review-card', { clearProps: 'transform,opacity,xPercent,yPercent,x,y,rotate' });
  gsap.set('.review-card', { opacity: 1 });

  gsap.from('.proof-heading', {
    opacity: 0, y: 24, duration: 0.6, ease: 'power2.out',
    scrollTrigger: { trigger: '.proof-heading', start: 'top 85%' },
  });
  gsap.from('.review-card', {
    opacity: 0, y: 24, duration: 0.5, stagger: 0.12, ease: 'power2.out',
    scrollTrigger: { trigger: '.proof-cards', start: 'top 90%' },
  });
});

/* ================= generic scroll reveals ================= */
gsap.utils.toArray(
  '.project-row, .card, .service-card, .portfolio-card, .site-card, .automation-card, .media-card, .about-body, .stat, .timeline-item, .faq-wrap, .cta, .value-card, .info-item'
).forEach((el) => {
  gsap.from(el, {
    opacity: 0, y: 40, duration: 0.8, ease: 'power2.out',
    scrollTrigger: { trigger: el, start: 'top 88%' },
  });
});

/* stagger stats counters */
document.querySelectorAll('.stat strong[data-count]').forEach((el) => {
  const target = parseInt(el.dataset.count, 10);
  ScrollTrigger.create({
    trigger: el, start: 'top 90%', once: true,
    onEnter: () => {
      gsap.fromTo(el, { innerText: 0 }, {
        innerText: target, duration: 1.4, ease: 'power1.out', snap: { innerText: 1 },
        onUpdate() { el.innerText = Math.floor(el.innerText) + (el.dataset.suffix || ''); },
      });
    },
  });
});

/* ================= scroll-to-top button ================= */
const scrollTopBtn = document.getElementById('scrollTop');
if (scrollTopBtn) {
  ScrollTrigger.create({
    trigger: document.body, start: 'top -600',
    onEnter: () => scrollTopBtn.classList.add('is-visible'),
    onLeaveBack: () => scrollTopBtn.classList.remove('is-visible'),
  });
  scrollTopBtn.addEventListener('click', () => lenis.scrollTo(0));
}

/* smooth in-page anchor links */
document.querySelectorAll('a[href^="#"]').forEach((a) => {
  a.addEventListener('click', (e) => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) { e.preventDefault(); lenis.scrollTo(target, { offset: -20 }); }
  });
});

/* ================= FAQ accordion ================= */
document.querySelectorAll('.faq-item').forEach((item) => {
  item.addEventListener('click', () => {
    const isOpen = item.classList.contains('is-open');
    item.parentElement.querySelectorAll('.faq-item').forEach((i) => i.classList.remove('is-open'));
    if (!isOpen) item.classList.add('is-open');
  });
});

/* ================= lightbox for shots + media frames ================= */
const popup = document.getElementById('popup');
if (popup) {
  const popupImg = document.getElementById('popupImg');

  function openLightbox(el) {
    popupImg.innerHTML = '';
    popupImg.style.background = '';

    const video = el.querySelector('video');
    const img = el.querySelector('img');

    if (video) {
      const clone = document.createElement('video');
      clone.src = video.currentSrc || video.querySelector('source')?.src || video.src;
      clone.autoplay = true;
      clone.muted = true;
      clone.loop = true;
      clone.playsInline = true;
      clone.style.cssText = 'width:100%;height:100%;object-fit:contain';
      popupImg.appendChild(clone);
    } else if (img && img.style.display !== 'none') {
      const clone = img.cloneNode();
      clone.style.cssText = 'width:100%;height:100%;object-fit:contain';
      popupImg.appendChild(clone);
    } else {
      popupImg.style.background = getComputedStyle(el).backgroundImage;
    }
    popup.classList.add('is-open');
  }

  function closeLightbox() {
    popup.classList.remove('is-open');
    popupImg.innerHTML = '';
  }

  // NOTE: shots/media-frames that live inside a "project" card (.project-row or
  // .automation-card) are handled by the richer preview modal below instead —
  // that modal reuses the same image plus adds description + CTAs. Plain shots
  // (about portrait, brand-media logo renders) keep this simple lightbox.
  document.querySelectorAll('.shot[data-cursor="expand"], .media-frame[data-cursor="expand"]').forEach((el) => {
    el.addEventListener('click', () => {
      if (el.closest('.project-row, .automation-card')) return;
      openLightbox(el);
    });
  });

  document.getElementById('popupClose')?.addEventListener('click', closeLightbox);
  popup.addEventListener('click', (e) => { if (e.target === popup) closeLightbox(); });
}

/* ================= contact page entrance ================= */
if (document.getElementById('contactForm')) {
  gsap.from('.page-banner > *', { opacity: 0, y: 24, duration: .8, stagger: .12, ease: 'power2.out' });
  gsap.from('.contact-form', { opacity: 0, y: 30, duration: .9, delay: .25, ease: 'power2.out' });
  gsap.from('.icon-links .icon-link', { opacity: 0, y: 16, scale: .85, duration: .5, stagger: .08, delay: .55, ease: 'back.out(1.6)' });
  gsap.from('.info-strip .info-item', { opacity: 0, y: 24, duration: .7, stagger: .12, delay: .75, ease: 'power2.out' });
  gsap.from('.tag-cloud .tag', { opacity: 0, scale: .82, duration: .45, stagger: .025, delay: .95, ease: 'back.out(1.6)' });
}

/* ================= burger menu (mobile) ================= */
document.querySelector('.burger')?.addEventListener('click', function () {
  this.classList.toggle('is-open');
  document.body.classList.toggle('menu-open');
});
// close the mobile menu automatically after tapping a nav link
document.querySelectorAll('.nav-links a').forEach((a) => {
  a.addEventListener('click', () => {
    document.querySelector('.burger')?.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  });
});

/* ================= EmailJS contact form ================= */
const contactForm = document.getElementById('contactForm');
if (contactForm && window.emailjs) {
  emailjs.init('LN5Yv9k1ZUXppD9LX');

  // Where to send visitors after a successful submission.
  // Update this path if your thank-you page lives somewhere else.
  const THANK_YOU_URL = 'thank-you.html';

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();

    const fname = document.getElementById('fname').value.trim();
    const lname = document.getElementById('lname').value.trim();
    const email = document.getElementById('email').value.trim();
    const service = document.getElementById('service').value;
    const message = document.getElementById('message').value.trim();
    const btn = document.getElementById('submitBtn');
    const errMsg = document.getElementById('errorMsg');

    errMsg.classList.remove('show');

    // preventDefault() above stops the browser from ever running its native
    // required/type="email" validation, so we trigger it manually here.
    // This also catches malformed emails (e.g. "asdf"), which the old
    // "just check it's non-empty" logic silently let through.
    if (!contactForm.checkValidity()) {
      contactForm.reportValidity();
      errMsg.textContent = 'Please fill in your name and a valid email address.';
      errMsg.classList.add('show');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending…';

    const templateParams = {
      from_name: fname + (lname ? ' ' + lname : ''),
      from_email: email,
      service_type: service || 'Not specified',
      message: message || 'No message provided.',
    };

    emailjs.send('service_6isch48', 'template_rt7l8rf', templateParams).then(
      function () {
        // Redirect to the thank-you page instead of showing an inline message.
        window.location.href = THANK_YOU_URL;
      },
      function (error) {
        console.error('EmailJS error:', error);
        btn.disabled = false;
        btn.textContent = 'Send Message →';
        errMsg.textContent = 'Something went wrong — please try again or email me directly.';
        errMsg.classList.add('show');
      }
    );
  });
}

/* ================= 3D skills sphere (foreground + sitewide background) ================= */
(function initSkillsSpheres() {
  const words = [
    'GoHighLevel', 'Web Development', 'AI Automation', 'Zapier', 'Make', 'n8n',
    'Webhooks', 'REST APIs', 'Appointwise', 'Claude Code', 'Anthropic API',
    'Google Ads', 'Meta Ads', 'SEO', 'CapCut', 'Canva', 'WordPress', 'Framer',
    'monday.com', 'Slack', 'Blotato', 'Postiz', 'Fal.ai', 'GitHub',
    'CRM Systems', 'EmailJS', 'A2P Compliance', 'Rank & Rent',
  ];
  const golden = Math.PI * (3 - Math.sqrt(5));

  function buildSphere(world, radius, minSize, maxSize) {
    if (!world) return;
    const N = words.length;
    words.forEach((word, i) => {
      const y = 1 - (i / (N - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const theta = golden * i;
      const x = Math.cos(theta) * radiusAtY;
      const z = Math.sin(theta) * radiusAtY;

      const lat = Math.asin(y) * (180 / Math.PI);
      const lon = Math.atan2(x, z) * (180 / Math.PI);

      const span = document.createElement('span');
      span.className = 'skills-3d-word';
      span.textContent = word;
      span.style.fontSize = (minSize + Math.random() * (maxSize - minSize)) + 'px';
      span.style.transform =
        `translate(-50%,-50%) rotateY(${lon}deg) rotateX(${-lat}deg) translateZ(${radius}px)`;
      span.style.left = '50%';
      span.style.top = '50%';

      world.appendChild(span);
    });
  }

buildSphere(document.getElementById('skillsWorld'), 320, 16, 24);

const bgWorld = document.getElementById('skillsWorldBg');
if (bgWorld) {
  const bgRadius = Math.min(window.innerWidth, window.innerHeight) * 0.55;
  buildSphere(bgWorld, bgRadius, 18, 34);
}

/* ================= draggable, always-spinning foreground sphere ================= */
(function initDraggableSphere() {
  const scene = document.querySelector('.skills-3d-scene');
  const world = document.getElementById('skillsWorld');
  if (!scene || !world) return;

  let rotY = 0;
  let rotX = 12;           // starting tilt (matches the old static rotateX(12deg))
  let autoSpin = true;
  let isDragging = false;
  let lastX = 0, lastY = 0;
  let resumeTimer = null;

  function render() {
    world.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg)`;
  }

  function pointerDown(e) {
    isDragging = true;
    autoSpin = false;
    clearTimeout(resumeTimer);
    scene.classList.add('is-dragging');
    const p = e.touches ? e.touches[0] : e;
    lastX = p.clientX; lastY = p.clientY;
  }

  function pointerMove(e) {
    if (!isDragging) return;
    const p = e.touches ? e.touches[0] : e;
    const dx = p.clientX - lastX;
    const dy = p.clientY - lastY;
    lastX = p.clientX; lastY = p.clientY;
    rotY += dx * 0.4;                          // left/right drag
    rotX = Math.max(-80, Math.min(80, rotX - dy * 0.4)); // up/down drag, clamped
    render();
    if (e.cancelable) e.preventDefault();
  }

  function pointerUp() {
    if (!isDragging) return;
    isDragging = false;
    scene.classList.remove('is-dragging');
    resumeTimer = setTimeout(() => { autoSpin = true; }, 600); // resume auto-spin shortly after release
  }

  scene.addEventListener('mousedown', pointerDown);
  window.addEventListener('mousemove', pointerMove);
  window.addEventListener('mouseup', pointerUp);
  scene.addEventListener('touchstart', pointerDown, { passive: true });
  window.addEventListener('touchmove', pointerMove, { passive: false });
  window.addEventListener('touchend', pointerUp);

  function tick() {
    if (autoSpin && !isDragging) rotY += 0.176; // ≈ same speed as the old 34s/360° CSS animation
    render();
    requestAnimationFrame(tick);
  }
  render();
  requestAnimationFrame(tick);
})();
})();
ScrollTrigger.refresh();
window.addEventListener('load', () => ScrollTrigger.refresh());

/* ================================================================
   PREVIEW POPUP — click any project card (featured builds on the
   homepage, client site cards on the portfolio page, automation
   cards) to get a description + "Chat on WhatsApp" / "Hire Me" CTA.
   Reads title/description/tags/image straight out of the existing
   markup, so it works on every page with zero HTML changes.
================================================================ */
(function initPreviewPopup() {
  const WHATSAPP_URL = 'https://wa.me/639696171479';
  const HIRE_URL = 'contact.html';

  const overlay = document.createElement('div');
  overlay.className = 'pv-overlay';
  overlay.innerHTML = `
    <div class="pv-box">
      <button class="pv-close" aria-label="Close preview">✕</button>
      <img class="pv-img" src="" alt="">
      <div class="pv-body">
        <div class="pv-tags"></div>
        <div class="pv-title"></div>
        <div class="pv-desc"></div>
        <div class="pv-ctas">
          <a class="pv-btn pv-outline pv-live" target="_blank" rel="noopener" href="#">Visit Website →</a>
          <a class="pv-btn pv-whatsapp" target="_blank" rel="noopener" href="${WHATSAPP_URL}">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            Chat on WhatsApp
          </a>
          <a class="pv-btn pv-primary pv-hire" href="${HIRE_URL}">Hire Me For This →</a>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  // the custom cursor only gets its "click" hover state wired up for elements
  // that exist at page load — these buttons are created dynamically right here,
  // so without this they'd show no cursor at all on hover.
  overlay.querySelectorAll('.pv-btn, .pv-close').forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-click'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-click'));
  });

  const pvImg = overlay.querySelector('.pv-img');
  const pvTitle = overlay.querySelector('.pv-title');
  const pvDesc = overlay.querySelector('.pv-desc');
  const pvTags = overlay.querySelector('.pv-tags');
  const pvLive = overlay.querySelector('.pv-live');
  const pvClose = overlay.querySelector('.pv-close');

  function extractCard(el) {
    const img = el.querySelector('img');
    const titleEl = el.querySelector('h3, h4');
    const descEl = el.querySelector('.project-copy p, .automation-caption, .site-card p, p');
    const tagEls = el.querySelectorAll('.tag');
    let link = el.dataset.href || '';
    if (!link) {
      const externalLink = (el.matches('a[href^="http"]') ? el : el.querySelector('a[href^="http"]'));
      link = externalLink ? externalLink.href : '';
    }
    let desc = descEl ? descEl.textContent.trim() : '';
    // automation-caption puts the bold title inline with the description — strip it out
    const strongEl = descEl ? descEl.querySelector('strong') : null;
    if (strongEl) desc = desc.replace(strongEl.textContent, '').trim();
    return {
      img: img ? img.src : '',
      title: (titleEl ? titleEl.textContent.trim() : '') || (strongEl ? strongEl.textContent.trim() : ''),
      desc,
      tags: Array.from(tagEls).map((t) => t.textContent.trim()),
      link,
    };
  }

  function openPreview(el) {
    const data = extractCard(el);
    if (!data.title && !data.img) return;
    if (data.img) { pvImg.src = data.img; pvImg.style.display = 'block'; }
    else { pvImg.style.display = 'none'; }
    pvTitle.textContent = data.title;
    pvDesc.textContent = data.desc;
    pvTags.innerHTML = '';
    data.tags.forEach((t) => {
      const s = document.createElement('span');
      s.className = 'tag';
      s.textContent = t;
      pvTags.appendChild(s);
    });
    if (data.link) { pvLive.href = data.link; pvLive.style.display = 'inline-flex'; }
    else { pvLive.style.display = 'none'; }
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closePreview() {
    overlay.classList.remove('open');
    setTimeout(() => { document.body.style.overflow = ''; }, 300);
  }

  pvClose.addEventListener('click', closePreview);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePreview(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePreview(); });

  document.querySelectorAll('.project-row, .site-card, .automation-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a')) return; // an explicit link inside the card still navigates directly
      openPreview(card);
    });
  });

  // exposed so the NC dashboard carousel (below) can reuse the same modal
  window.__nexsaleOpenPreview = { overlay, pvImg, pvTitle, pvDesc, pvTags, pvLive };
})();

/* ================================================================
   Auto-glow for the three "hero" screenshots (social platforms grid,
   North City Roofing site, GHL workflow builder) — matches by image
   filename so it works across every page without editing the HTML.
================================================================ */
(function autoGlowFeatured() {
  const GLOW_MATCH = /socials\.png|nc-new\.png|northc\.png|workflow-builder\.png/i;
  document.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (GLOW_MATCH.test(src)) {
      const wrap = img.closest('.shot') || img.closest('.media-frame') || img.parentElement;
      if (wrap) wrap.classList.add('glow-always');
    }
  });
})();

/* ================================================================
   NORTH CITY ROOFING — MOBILE DASHBOARD CAROUSEL
   ONE unified init for every page (index.html + portfolio.html).
   Breakpoint (900px) matches the single CSS block in styles.css —
   previously index.html and portfolio.html each shipped their own
   slightly different inline <script>, one checking 1024px and one
   checking 900px, which fought the CSS breakpoints and caused the
   carousel to render broken or blank in the gap between them.
================================================================ */
(function initNcDashboardCarousel() {
  if (!window.Swiper) return;
  if (!document.getElementById('nc-mobile-dashboard')) return;

  const BREAKPOINT = '(max-width: 900px)';

  function openNcPreview(slide) {
    const overlay = document.querySelector('.pv-overlay');
    if (!overlay) return;
    const img = slide.querySelector('img');
    const pvImg = overlay.querySelector('.pv-img');
    const pvTitle = overlay.querySelector('.pv-title');
    const pvDesc = overlay.querySelector('.pv-desc');
    const pvTags = overlay.querySelector('.pv-tags');
    const pvLive = overlay.querySelector('.pv-live');

    if (pvImg) {
      pvImg.src = img ? img.src : '';
      pvImg.style.display = img ? 'block' : 'none';
    }
    if (pvTitle) pvTitle.textContent = slide.dataset.title || '';
    if (pvDesc) pvDesc.textContent = slide.dataset.desc || '';
    if (pvTags) {
      pvTags.innerHTML = '';
      (slide.dataset.tags || '').split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => {
        const s = document.createElement('span');
        s.className = 'tag';
        s.textContent = t;
        pvTags.appendChild(s);
      });
    }
    if (pvLive) {
      pvLive.href = slide.dataset.href || 'https://www.northcityroofing.com/nc-dashboard';
      pvLive.style.display = 'inline-flex';
    }
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  const mq = window.matchMedia(BREAKPOINT);
  let ncSwiper = null;
  let ncMobileSwiper = null;

  function initDesktop() {
    if (ncSwiper) return;
    const el = document.querySelector('.nc-swiper');
    if (!el) return;
    ncSwiper = new Swiper(el, {
      effect: 'coverflow',
      grabCursor: true,
      centeredSlides: true,
      loop: true,
      slidesPerView: 'auto',
      slideToClickedSlide: true,
      watchOverflow: true,
      observer: true,
      observeParents: true,
      observeSlideChildren: true,
      coverflowEffect: { rotate: 32, stretch: 0, depth: 260, modifier: 1, slideShadows: true },
      navigation: { nextEl: '.nc-swiper-next', prevEl: '.nc-swiper-prev' },
    });
    el.querySelectorAll('.swiper-slide').forEach((slide) => {
      slide.addEventListener('click', () => {
        if (slide.classList.contains('swiper-slide-active')) openNcPreview(slide);
      });
    });
  }

  function destroyDesktop() {
    if (ncSwiper) { ncSwiper.destroy(true, true); ncSwiper = null; }
  }

  function initMobile() {
    if (ncMobileSwiper) return;
    const el = document.querySelector('.nc-mobile-swiper');
    if (!el) return;
    const totalSlides = el.querySelectorAll('.swiper-slide').length;
    const counterEl = document.getElementById('ncMobileCounter');
    function updateCounter(swiper) {
      if (!counterEl) return;
      const n = ((swiper.realIndex % totalSlides) + totalSlides) % totalSlides;
      counterEl.textContent = (n + 1) + ' / ' + totalSlides;
    }
    ncMobileSwiper = new Swiper(el, {
      slidesPerView: 'auto',
      centeredSlides: true,
      loop: true,
      spaceBetween: 16,
      speed: 450,
      grabCursor: true,
      slideToClickedSlide: true,
      watchOverflow: true,
      observer: true,
      observeParents: true,
      pagination: { el: '.nc-mobile-pagination', clickable: true },
      navigation: { nextEl: '.nc-mobile-next', prevEl: '.nc-mobile-prev' },
      on: { slideChange: updateCounter, init: updateCounter },
    });
    el.querySelectorAll('.swiper-slide').forEach((slide) => {
      slide.addEventListener('click', () => {
        if (slide.classList.contains('swiper-slide-active')) openNcPreview(slide);
      });
    });
  }

  function destroyMobile() {
    if (ncMobileSwiper) { ncMobileSwiper.destroy(true, true); ncMobileSwiper = null; }
  }

  function applyForViewport() {
    if (mq.matches) { destroyDesktop(); initMobile(); }
    else { destroyMobile(); initDesktop(); }
  }

  applyForViewport();
  if (mq.addEventListener) mq.addEventListener('change', applyForViewport);
  else mq.addListener(applyForViewport); // Safari <14 fallback

  let ncResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(ncResizeTimer);
    ncResizeTimer = setTimeout(() => {
      if (ncSwiper) ncSwiper.update();
      if (ncMobileSwiper) ncMobileSwiper.update();
    }, 150);
  });

  // Gentle scroll-in reveal for whichever carousel is visible
  const revealEl = document.querySelector('.nc-swiper, .nc-mobile-simple');
  if (window.gsap && window.ScrollTrigger && revealEl) {
    gsap.from(revealEl, {
      opacity: 0, y: 60, duration: 0.9, ease: 'power2.out',
      scrollTrigger: { trigger: '#nc-mobile-dashboard', start: 'top 85%' },
    });
  }
})();

/* ================================================================
   MOBILE PHONE-STACK CAROUSEL
   Custom, dependency-free carousel: a big centered phone with dimmed
   rotated phones peeking on either side (coverflow look), paged
   through via drag/swipe, the arrow buttons, or clicking a side phone.
   No Swiper — self-contained so it can't conflict with the desktop
   carousel's breakpoint/init logic elsewhere on the page.
================================================================ */
(function initMdpStack() {
  const stack = document.getElementById('mdpStack');
  if (!stack) return;

  const slides = Array.from(stack.querySelectorAll('.mdp-slide'));
  const total = slides.length;
  if (!total) return;

  const dotsWrap = document.getElementById('mdpDots');
  const prevBtn = document.querySelector('.mdp-prev');
  const nextBtn = document.querySelector('.mdp-next');

  let current = 0;

  // build dot indicators
  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'mdp-dot';
    dot.addEventListener('click', () => { current = i; render(); });
    dotsWrap.appendChild(dot);
  });
  const dots = Array.from(dotsWrap.children);

  function render() {
    slides.forEach((slide, i) => {
      let offset = i - current;
      // always take the shortest path around the loop
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;
      const abs = Math.abs(offset);

      const x = offset * 78;
      const scale = abs === 0 ? 1 : 0.8;
      const rotate = offset * 9;
      const opacity = abs > 2 ? 0 : (abs === 0 ? 1 : 0.6);

      slide.style.transform = `translateX(-50%) translateX(${x}px) rotate(${rotate}deg) scale(${scale})`;
      slide.style.opacity = opacity;
      slide.style.zIndex = 10 - abs;
      slide.classList.toggle('is-active', abs === 0);
    });
    dots.forEach((d, i) => d.classList.toggle('is-active', i === current));
  }

  function go(delta) {
    current = ((current + delta) % total + total) % total;
    render();
  }

  prevBtn?.addEventListener('click', () => go(-1));
  nextBtn?.addEventListener('click', () => go(1));

  // drag / swipe (touch + mouse, unified)
  let dragging = false;
  let dragged = false;
  let startX = 0;

  function down(x) { dragging = true; dragged = false; startX = x; }
  function move(x) { if (dragging && Math.abs(x - startX) > 6) dragged = true; }
  function up(x) {
    if (!dragging) return;
    dragging = false;
    const dx = x - startX;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  }

  stack.addEventListener('touchstart', (e) => down(e.touches[0].clientX), { passive: true });
  stack.addEventListener('touchmove', (e) => move(e.touches[0].clientX), { passive: true });
  stack.addEventListener('touchend', (e) => up(e.changedTouches[0].clientX));

  stack.addEventListener('mousedown', (e) => { down(e.clientX); e.preventDefault(); });
  window.addEventListener('mousemove', (e) => move(e.clientX));
  window.addEventListener('mouseup', (e) => up(e.clientX));

  // clicking a dimmed side slide (not a drag) jumps straight to it
  slides.forEach((slide, i) => {
    slide.addEventListener('click', () => {
      if (dragged) return;
      if (i !== current) { current = i; render(); }
    });
  });

  render();
})();

/* ================================================================
   CUSTOM MOBILE APPS SHOWCASE — scroll-in reveal
   (Only fades opacity in, so it never fights the CSS rotate/float
   animations already applied to each phone.)
================================================================ */
(function initCustomAppsReveal() {
  if (!document.getElementById('custom-apps') || !window.gsap || !window.ScrollTrigger) return;

  gsap.from('.capps-head', {
    opacity: 0, y: 24, duration: .7, ease: 'power2.out',
    scrollTrigger: { trigger: '#custom-apps', start: 'top 85%' },
  });
  gsap.from('.capps-install-pill', {
    opacity: 0, y: 10, duration: .6, delay: .15, ease: 'power2.out',
    scrollTrigger: { trigger: '#custom-apps', start: 'top 82%' },
  });
  gsap.utils.toArray('.capps-phone').forEach((el, i) => {
    gsap.from(el, {
      opacity: 0, duration: .7, delay: i * .12, ease: 'power2.out',
      scrollTrigger: { trigger: '#custom-apps', start: 'top 78%' },
    });
  });
  gsap.from('.capps-note, #custom-apps .hero-actions', {
    opacity: 0, y: 16, duration: .6, delay: .2, ease: 'power2.out',
    scrollTrigger: { trigger: '#custom-apps', start: 'top 70%' },
  });
})();

/* ================================================================
   AUTOMATION SPOTLIGHT — scroll-in reveal for the flow diagram
================================================================ */
(function initAutomationSpotlight() {
  if (!document.getElementById('automation-spotlight') || !window.gsap || !window.ScrollTrigger) return;

  gsap.from('.autospot-head > *', {
    opacity: 0, y: 20, duration: .7, stagger: .1, ease: 'power2.out',
    scrollTrigger: { trigger: '#automation-spotlight', start: 'top 82%' },
  });

  gsap.from('.autospot-flow .autospot-node', {
    opacity: 0, y: 26, scale: .92, duration: .6, stagger: .08, ease: 'back.out(1.5)',
    scrollTrigger: { trigger: '.autospot-flow', start: 'top 85%' },
  });

  gsap.from('.autospot-flow .autospot-line', {
    scaleX: 0, transformOrigin: 'left center', duration: .6, stagger: .08, ease: 'power2.out',
    scrollTrigger: { trigger: '.autospot-flow', start: 'top 85%' },
  });

  gsap.from('.autospot-stat', {
    opacity: 0, y: 16, duration: .6, stagger: .1, ease: 'power2.out',
    scrollTrigger: { trigger: '.autospot-stats', start: 'top 88%' },
  });

  gsap.from('.autospot-shot', {
    opacity: 0, y: 30, scale: .97, duration: .7, stagger: .15, ease: 'power2.out',
    scrollTrigger: { trigger: '.autospot-shots', start: 'top 85%' },
  });

  gsap.from('.autospot-card', {
    opacity: 0, y: 24, duration: .7, stagger: .12, ease: 'power2.out',
    scrollTrigger: { trigger: '.autospot-cards', start: 'top 88%' },
  });
})();

/* ================================================================
   AUTOMATION SPOTLIGHT — click a screenshot to open it full-size
   (reuses the same #popup lightbox already in the page, since these
   screenshots use their own class name instead of ".shot")
================================================================ */
(function initAutospotLightbox() {
  const popup = document.getElementById('popup');
  const popupImg = document.getElementById('popupImg');
  if (!popup || !popupImg) return;

  document.querySelectorAll('.autospot-shot[data-cursor="expand"]').forEach((el) => {
    el.addEventListener('click', () => {
      const img = el.querySelector('img');
      if (!img) return;
      popupImg.innerHTML = '';
      popupImg.style.background = '';
      const clone = img.cloneNode();
      clone.style.cssText = 'width:100%;height:100%;object-fit:contain';
      popupImg.appendChild(clone);
      popup.classList.add('is-open');
    });
  });
})();

/* ================================================================
   AUTOMATIONS IN ACTION — floating 3D phone: idle float + pointer
   tilt on hover, driven by requestAnimationFrame for buttery motion.
================================================================ */
(function initAphoneFloat() {
  const orbit = document.getElementById('aphoneOrbit');
  const device = document.getElementById('aphoneDevice');
  if (!orbit || !device) return;

  let hover = false;
  let mx = 0, my = 0; // pointer position, normalized -1..1
  let t = Math.random() * 10; // stagger the idle loop so it doesn't feel mechanical

  orbit.addEventListener('mouseenter', () => { hover = true; });
  orbit.addEventListener('mouseleave', () => { hover = false; });
  orbit.addEventListener('mousemove', (e) => {
    const rect = orbit.getBoundingClientRect();
    mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    my = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    device.style.transform = 'translateY(0) rotateX(4deg) rotateY(-6deg)';
    return;
  }

  function tick() {
    t += 0.012;
    const idleY = Math.sin(t) * 14;
    const idleRotY = Math.sin(t * 0.7) * 9;
    const idleRotX = Math.cos(t * 0.55) * 5;

    let rotY, rotX, y, scale;
    if (hover) {
      // pointer-driven tilt, gently eased toward the cursor position
      rotY = mx * 20;
      rotX = -my * 15;
      y = idleY * 0.35 - 10;
      scale = 1.09;
    } else {
      rotY = idleRotY;
      rotX = idleRotX;
      y = idleY;
      scale = 1;
    }
    device.style.transform =
      `translateY(${y}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();

/* ================================================================
   AUTOMATIONS IN ACTION — click the phone to open the demo video
   in a popup with CTAs (built to match the .pv-overlay lightbox
   used elsewhere on the site).
================================================================ */
(function initPhoneDemoPopup() {
  const orbit = document.getElementById('aphoneOrbit');
  if (!orbit) return;

  const WHATSAPP_URL = 'https://wa.me/639696171479';

  const overlay = document.createElement('div');
  overlay.className = 'pv-overlay';
  overlay.innerHTML = `
    <div class="pv-box">
      <button class="pv-close" aria-label="Close preview">✕</button>
      <video class="pv-video" src="./videos/phone-demo.mp4" controls playsinline></video>
      <div class="pv-body">
        <div class="pv-tags">
          <span class="tag">Automated Google Reviews</span>
          <span class="tag">Missed Call Text Back</span>
          <span class="tag">GHL Automation</span>
        </div>
        <div class="pv-title">See It Running, Live</div>
        <div class="pv-desc">The moment a job wraps up, the customer gets a text asking for a Google review. Miss a call, and the caller gets an instant text back so the lead never goes cold. Both run automatically, 24/7, with zero manual work.</div>
        <div class="pv-ctas">
          <a class="pv-btn pv-outline" href="./htmls/automations.html">See All Automations →</a>
          <a class="pv-btn pv-whatsapp" target="_blank" rel="noopener" href="${WHATSAPP_URL}">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
            Chat on WhatsApp
          </a>
          <a class="pv-btn pv-primary" href="./htmls/contact.html">Get This Built For Me →</a>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const video = overlay.querySelector('.pv-video');
  const closeBtn = overlay.querySelector('.pv-close');

  function open() {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    video.currentTime = 0;
    video.muted = false;
    video.play().catch(() => {});
  }
  function close() {
    overlay.classList.remove('open');
    video.pause();
    setTimeout(() => { document.body.style.overflow = ''; }, 300);
  }

  orbit.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && overlay.classList.contains('open')) close(); });

  // wires the custom cursor's "click" glow state to this popup's own
  // buttons/close icon, same as every other dynamically-created popup
  // on the site (the cursor listeners set up on page load only cover
  // elements that already existed in the HTML at that point).
  overlay.querySelectorAll('.pv-btn, .pv-close').forEach((el) => {
    el.addEventListener('mouseenter', () => cursor.classList.add('is-click'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('is-click'));
  });
})();

/* ================================================================
   AUTOMATIONS IN ACTION — scroll-in reveal
================================================================ */
(function initAutomationPhonesReveal() {
  if (!document.getElementById('automation-phones') || !window.gsap || !window.ScrollTrigger) return;

  gsap.from('#automation-phones .section-head > *', {
    opacity: 0, y: 20, duration: .7, stagger: .1, ease: 'power2.out',
    scrollTrigger: { trigger: '#automation-phones', start: 'top 82%' },
  });

  gsap.from('#aphoneOrbit', {
    opacity: 0, y: 50, scale: .9, duration: .9, ease: 'back.out(1.4)',
    scrollTrigger: { trigger: '#automation-phones', start: 'top 78%' },
  });

  gsap.from('.aphone-feature', {
    opacity: 0, y: 30, duration: .7, stagger: .15, ease: 'power2.out',
    scrollTrigger: { trigger: '.aphone-features', start: 'top 85%' },
  });

  gsap.from('#automation-phones .hero-actions', {
    opacity: 0, y: 16, duration: .6, delay: .2, ease: 'power2.out',
    scrollTrigger: { trigger: '#automation-phones', start: 'top 70%' },
  });
})();

/* ================================================================
   SCROLLTRIGGER SYNC — recheck all scroll-trigger positions once the
   page has fully loaded, once fonts finish, and once more shortly
   after (covers late-finishing image/video loads). Without this,
   elements can get "stuck" at their hidden pre-animation state if
   the page reflows (fonts swapping in, images loading) after their
   trigger position was first calculated.
================================================================ */
(function keepScrollTriggerInSync() {
  if (!window.ScrollTrigger) return;

  const refresh = () => ScrollTrigger.refresh();

  window.addEventListener('load', refresh);

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(refresh).catch(() => {});
  }

  setTimeout(refresh, 500);
  setTimeout(refresh, 1500);
})();
/* ================================================================
   FUNNELS, ADS & CROSS-PLATFORM INTEGRATIONS
   Clicking the iPhone or the MacBook plays a 3D "zoom out from the
   device" transition: the popup grows out of the exact device you
   clicked, in 3D, then shows the video (phone) or full screenshot
   (Mac) — with a button inside the Mac popup to continue on to the
   full case study.
================================================================ */
(function initFunnelHub() {
  const section = document.getElementById('funnel-hub');
  if (!section) return;

  /* ---- 3D tilt on the funnel stage cards, tracks the cursor ---- */
  document.querySelectorAll('#fnlFlow .fnl-card').forEach((card) => {
    const inner = card.querySelector('.fnl-card-inner');
    if (!inner) return;
    function move(e) {
      const rect = card.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      inner.style.transform = `rotateY(${px * 16}deg) rotateX(${-py * 16}deg) translateZ(6px)`;
    }
    function reset() { inner.style.transform = ''; }
    card.addEventListener('mousemove', move);
    card.addEventListener('mouseleave', reset);
    card.addEventListener('touchstart', () => card.classList.add('is-hover'), { passive: true });
    card.addEventListener('touchend', () => setTimeout(() => card.classList.remove('is-hover'), 400));
  });

  /* ---- MacBook: subtle pointer-tilt while idle (popup handles the click) ---- */
  const macStage = document.getElementById('fnlMacStage');
  const mac = document.getElementById('fnlMac');
  if (macStage && mac) {
    macStage.addEventListener('mousemove', (e) => {
      const rect = macStage.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      mac.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 8}deg)`;
    });
    macStage.addEventListener('mouseleave', () => { mac.style.transform = ''; });
  }

  /* ================================================================
     SHARED 3D "ZOOM FROM DEVICE" TRANSITION
  ================================================================ */
  const hasGsap = !!(window.gsap);

  function dimTrigger(el, dim) {
    if (!hasGsap || !el) return;
    if (dim) {
      gsap.to(el, { opacity: 0.32, scale: 0.94, duration: .35, ease: 'power2.out' });
    } else {
      gsap.to(el, {
        opacity: 1, scale: 1, duration: .45, ease: 'power2.out',
        onComplete: () => gsap.set(el, { clearProps: 'opacity,scale' }),
      });
    }
  }

  function flipOpen(triggerEl, overlay, box) {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';

    if (!hasGsap || !triggerEl) return;
    const startRect = triggerEl.getBoundingClientRect();
    dimTrigger(triggerEl, true);
    box.classList.add('is-flipping');

    requestAnimationFrame(() => requestAnimationFrame(() => {
      const endRect = box.getBoundingClientRect();
      if (!endRect.width || !endRect.height) { box.classList.remove('is-flipping'); return; }

      const scaleX = Math.max(startRect.width / endRect.width, 0.04);
      const scaleY = Math.max(startRect.height / endRect.height, 0.04);
      const dx = (startRect.left + startRect.width / 2) - (endRect.left + endRect.width / 2);
      const dy = (startRect.top + startRect.height / 2) - (endRect.top + endRect.height / 2);
      const tiltDir = dx > 0 ? 1 : -1;

      gsap.set(box, {
        x: dx, y: dy, scaleX, scaleY,
        rotationY: 18 * tiltDir, rotationX: 10,
        transformPerspective: 1000, opacity: 1,
      });
      gsap.to(box, {
        x: 0, y: 0, scaleX: 1, scaleY: 1, rotationX: 0, rotationY: 0,
        duration: .9, ease: 'power3.out',
        onComplete: () => box.classList.remove('is-flipping'),
      });
    }));
  }

  function flipClose(triggerEl, overlay, box, onDone) {
    if (!hasGsap || !triggerEl) {
      overlay.classList.remove('open');
      setTimeout(() => { document.body.style.overflow = ''; if (onDone) onDone(); }, 250);
      return;
    }

    const startRect = triggerEl.getBoundingClientRect();
    const boxRect = box.getBoundingClientRect();
    const scaleX = Math.max(startRect.width / boxRect.width, 0.04);
    const scaleY = Math.max(startRect.height / boxRect.height, 0.04);
    const dx = (startRect.left + startRect.width / 2) - (boxRect.left + boxRect.width / 2);
    const dy = (startRect.top + startRect.height / 2) - (boxRect.top + boxRect.height / 2);
    const tiltDir = dx > 0 ? 1 : -1;

    box.classList.add('is-flipping');
    dimTrigger(triggerEl, false);
    gsap.to(box, {
      x: dx, y: dy, scaleX, scaleY,
      rotationY: 16 * tiltDir, rotationX: 8, opacity: .35,
      duration: .55, ease: 'power2.in',
      onComplete: () => {
        overlay.classList.remove('open');
        gsap.set(box, { clearProps: 'transform,opacity,x,y,scaleX,scaleY,rotationX,rotationY,transformPerspective' });
        box.classList.remove('is-flipping');
        document.body.style.overflow = '';
        if (onDone) onDone();
      },
    });
  }

  /* ---- iPhone demo: idle float + 3D zoom-out popup with the video ---- */
  const phoneStage = document.getElementById('fnlPhoneStage');
  const phoneDevice = document.getElementById('fnlPhoneDevice');
  const phoneFrame = phoneStage ? phoneStage.querySelector('.iphone-frame') : null;

  if (phoneStage && phoneDevice) {
    const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      let t = Math.random() * 10;
      (function tick() {
        t += 0.014;
        const y = Math.sin(t) * 8;
        const rot = Math.sin(t * 0.6) * 4;
        phoneDevice.style.transform = `translateY(${y}px) rotate(${rot}deg)`;
        requestAnimationFrame(tick);
      })();
    }

    const WHATSAPP_URL = 'https://wa.me/639696171479';
    const phoneOverlay = document.createElement('div');
    phoneOverlay.className = 'pv-overlay';
    phoneOverlay.innerHTML = `
      <div class="pv-box">
        <button class="pv-close" aria-label="Close preview">✕</button>
        <video class="pv-video" src="./videos/funnel-demo.mp4" controls playsinline></video>
        <div class="pv-body">
          <div class="pv-tags"><span class="tag">Funnel Walkthrough</span><span class="tag">Meta Ads → GHL</span></div>
          <div class="pv-title">The Funnel, Live On A Real Phone</div>
          <div class="pv-desc">A real walkthrough of a funnel and booking flow exactly as a lead experiences it on their own phone — from ad click to booked appointment.</div>
          <div class="pv-ctas">
            <a class="pv-btn pv-outline" href="./htmls/portfolio.html#funnels">See More Funnels →</a>
            <a class="pv-btn pv-whatsapp" target="_blank" rel="noopener" href="${WHATSAPP_URL}">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              Chat on WhatsApp
            </a>
            <a class="pv-btn pv-primary" href="./htmls/contact.html">Get This Built For Me →</a>
          </div>
        </div>
      </div>`;
    document.body.appendChild(phoneOverlay);

    const phoneBox = phoneOverlay.querySelector('.pv-box');
    const phoneVideo = phoneOverlay.querySelector('.pv-video');
    const phoneCloseBtn = phoneOverlay.querySelector('.pv-close');

    function openPhonePopup() {
      flipOpen(phoneFrame, phoneOverlay, phoneBox);
      phoneVideo.currentTime = 0;
      phoneVideo.muted = false;
      phoneVideo.play().catch(() => {});
    }
    function closePhonePopup() {
      phoneVideo.pause();
      flipClose(phoneFrame, phoneOverlay, phoneBox);
    }

    phoneStage.addEventListener('click', openPhonePopup);
    phoneCloseBtn.addEventListener('click', closePhonePopup);
    phoneOverlay.addEventListener('click', (e) => { if (e.target === phoneOverlay) closePhonePopup(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && phoneOverlay.classList.contains('open')) closePhonePopup(); });
    phoneOverlay.querySelectorAll('.pv-btn, .pv-close').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-click'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-click'));
    });
  }

  /* ---- MacBook: 3D zoom-out popup with the full screenshot ---- */
  if (macStage && mac) {
    macStage.addEventListener('click', (e) => { e.preventDefault(); openMacPopup(); });

    const WHATSAPP_URL2 = 'https://wa.me/639696171479';
    const macOverlay = document.createElement('div');
    macOverlay.className = 'pv-overlay';
    macOverlay.innerHTML = `
      <div class="pv-box">
        <button class="pv-close" aria-label="Close preview">✕</button>
        <img class="pv-img" src="./images/funnel-macbook-shot.jpg" alt="Sales funnels built for Trusted Home Service Pros and Trusted Roofing Pros">
        <div class="pv-body">
          <div class="pv-tags"><span class="tag">SEO</span><span class="tag">LeadConnector</span><span class="tag">Lead Gen</span></div>
          <div class="pv-title">Sales Funnels — See The Full Build</div>
          <div class="pv-desc">Nationwide, Angi-compliant lead-matching platforms for Trusted Home Service Pros and Trusted Roofing Pros — 15+ core pages, thousands of SEO landing pages, and the funnels that turn that traffic into booked jobs.</div>
          <div class="pv-ctas">
            <a class="pv-btn pv-primary" href="./htmls/portfolio.html#funnels">View Full Case Study →</a>
            <a class="pv-btn pv-whatsapp" target="_blank" rel="noopener" href="${WHATSAPP_URL2}">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              Chat on WhatsApp
            </a>
            <a class="pv-btn pv-outline" href="./htmls/contact.html">Get A Funnel Like This →</a>
          </div>
        </div>
      </div>`;
    document.body.appendChild(macOverlay);

    const macBox = macOverlay.querySelector('.pv-box');
    const macCloseBtn = macOverlay.querySelector('.pv-close');

    function openMacPopup() { flipOpen(mac, macOverlay, macBox); }
    function closeMacPopup() { flipClose(mac, macOverlay, macBox); }

    macCloseBtn.addEventListener('click', closeMacPopup);
    macOverlay.addEventListener('click', (e) => { if (e.target === macOverlay) closeMacPopup(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && macOverlay.classList.contains('open')) closeMacPopup(); });
    macOverlay.querySelectorAll('.pv-btn, .pv-close').forEach((el) => {
      el.addEventListener('mouseenter', () => cursor.classList.add('is-click'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-click'));
    });
  }

  /* ---- scroll-in reveal (matches the rest of the site) ---- */
  if (window.gsap && window.ScrollTrigger) {
    gsap.from('.fnl-head > *', {
      opacity: 0, y: 20, duration: .7, stagger: .1, ease: 'power2.out',
      scrollTrigger: { trigger: '#funnel-hub', start: 'top 82%' },
    });
    gsap.from('#fnlFlow .fnl-card', {
      opacity: 0, y: 30, duration: .6, stagger: .1, ease: 'power2.out',
      scrollTrigger: { trigger: '#fnlFlow', start: 'top 85%' },
    });
    gsap.from('.fnl-show-col', {
      opacity: 0, y: 30, duration: .7, stagger: .15, ease: 'power2.out',
      scrollTrigger: { trigger: '.fnl-showcase', start: 'top 85%' },
    });
    gsap.from('#funnel-hub .hero-actions', {
      opacity: 0, y: 16, duration: .6, delay: .1, ease: 'power2.out',
      scrollTrigger: { trigger: '#funnel-hub', start: 'top 70%' },
    });
  }
})();

/* ================================================================
   FUNNELS, ALL IN ONE FRAME — subtle pointer-tilt on the portfolio
   page's MacBook collage (purely decorative hover, no click action).
================================================================ */
(function initPortfolioFunnelMac() {
  const stage = document.getElementById('pfmStage');
  const mac = document.getElementById('pfmMac');
  if (!stage || !mac) return;

  stage.addEventListener('mousemove', (e) => {
    const rect = stage.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    mac.style.transform = `rotateY(${px * 8}deg) rotateX(${-py * 6}deg)`;
  });
  stage.addEventListener('mouseleave', () => { mac.style.transform = ''; });

  if (window.gsap && window.ScrollTrigger) {
    gsap.from(stage, {
      opacity: 0, y: 30, duration: .8, ease: 'power2.out',
      scrollTrigger: { trigger: stage, start: 'top 82%' },
    });
  }
})();
