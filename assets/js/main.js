(() => {
  "use strict";

  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ---------- Theme ---------- */
  const themeBtn = $(".theme-toggle");
  const metaTheme = $('meta[name="theme-color"]');

  function applyTheme(theme) {
    root.dataset.theme = theme;
    themeBtn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    metaTheme.setAttribute("content", theme === "dark" ? "#07090f" : "#f6f7fb");
    window.dispatchEvent(new Event("themechange"));
  }

  applyTheme(root.dataset.theme === "light" ? "light" : "dark");
  themeBtn.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    try { localStorage.setItem("theme", next); } catch (e) { /* storage unavailable */ }
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = $(".menu-toggle");
  const navLinks = $("#nav-links");

  function setMenu(open) {
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    navLinks.classList.toggle("open", open);
  }

  menuBtn.addEventListener("click", () => setMenu(menuBtn.getAttribute("aria-expanded") !== "true"));
  navLinks.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
  document.addEventListener("click", (e) => { if (!e.target.closest(".nav")) setMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Header, progress bar, back-to-top ---------- */
  const header = $(".site-header");
  const progress = $(".scroll-progress");
  const fab = $(".fab-top");
  let ticking = false;

  function onScroll() {
    const y = window.scrollY;
    const max = root.scrollHeight - window.innerHeight;
    header.classList.toggle("scrolled", y > 12);
    progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
    fab.classList.toggle("show", y > window.innerHeight * 0.9 && max - y > 140);
    ticking = false;
  }

  window.addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Active nav link ---------- */
  const links = $$('a[href^="#"]', navLinks);
  const linkFor = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));

  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.remove("active"));
        const link = linkFor.get(entry.target.id);
        if (link) link.classList.add("active");
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main section[id]").forEach((s) => spy.observe(s));
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$(".reveal");

  revealEls.forEach((el) => {
    const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
    const i = Math.min(siblings.indexOf(el), 5);
    if (i > 0) el.style.setProperty("--rd", `${i * 80}ms`);
  });

  function finishReveal(el) {
    el.classList.remove("reveal", "in");
    el.style.removeProperty("--rd");
  }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(finishReveal);
  } else {
    const revealer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add("in");
        revealer.unobserve(el);
        el.addEventListener("transitionend", function done(e) {
          if (e.target !== el || e.propertyName !== "transform") return;
          el.removeEventListener("transitionend", done);
          finishReveal(el);
        });
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach((el) => revealer.observe(el));
  }

  /* ---------- Count-up stats ---------- */
  const counters = $$("[data-count]");
  const fmt = (n) => n.toLocaleString("en-US");

  function runCounter(el) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    const duration = 1600;
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(target * eased)) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  if (!reduceMotion && "IntersectionObserver" in window) {
    counters.forEach((el) => { el.textContent = "0" + (el.dataset.suffix || ""); });
    const counterObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        runCounter(entry.target);
        counterObs.unobserve(entry.target);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => counterObs.observe(el));
  }

  /* ---------- CGPA bar ---------- */
  const bars = $$(".cgpa-bar");
  if ("IntersectionObserver" in window) {
    const barObs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("filled");
        barObs.unobserve(entry.target);
      });
    }, { threshold: 0.6 });
    bars.forEach((b) => barObs.observe(b));
  } else {
    bars.forEach((b) => b.classList.add("filled"));
  }

  /* ---------- Typewriter ---------- */
  const typed = $(".typed");
  if (typed && !reduceMotion) {
    const phrases = JSON.parse(typed.dataset.phrases);
    let index = 0;
    let chars = phrases[0].length;
    let deleting = true;

    const tick = () => {
      const phrase = phrases[index];
      if (deleting) {
        chars -= 1;
        typed.textContent = phrase.slice(0, chars);
        if (chars === 0) {
          deleting = false;
          index = (index + 1) % phrases.length;
          setTimeout(tick, 380);
          return;
        }
        setTimeout(tick, 26);
      } else {
        chars += 1;
        typed.textContent = phrase.slice(0, chars);
        if (chars === phrase.length) {
          deleting = true;
          setTimeout(tick, 2300);
          return;
        }
        setTimeout(tick, 52);
      }
    };
    setTimeout(tick, 2800);
  }

  /* ---------- Card spotlight ---------- */
  if (window.matchMedia("(hover: hover)").matches) {
    document.addEventListener("pointermove", (e) => {
      const card = e.target.closest && e.target.closest(".spot");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ---------- Case study dialogs ---------- */
  let lastTrigger = null;

  $$("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dialog = document.getElementById(btn.dataset.open);
      if (!dialog) return;
      lastTrigger = btn;
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      document.body.classList.add("modal-open");
      const body = $(".case-body", dialog);
      if (body) body.scrollTop = 0;
    });
  });

  $$("dialog.case").forEach((dialog) => {
    dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });
    $$("[data-close]", dialog).forEach((b) => b.addEventListener("click", () => dialog.close()));
    dialog.addEventListener("close", () => {
      document.body.classList.remove("modal-open");
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    });
  });

  /* ---------- Copy email ---------- */
  const toast = $(".toast");
  let toastTimer;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
  }

  $$("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        btn.classList.add("copied");
        showToast("Email address copied");
        setTimeout(() => btn.classList.remove("copied"), 2000);
      } catch (e) {
        showToast(btn.dataset.copy);
      }
    });
  });

  /* ---------- Footer year ---------- */
  $$(".year").forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Hero neural-network canvas ---------- */
  const canvas = $(".hero-canvas");
  const hero = $(".hero");
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext("2d");
    const mouse = { x: -9999, y: -9999 };
    let width = 0;
    let height = 0;
    let nodes = [];
    let raf = null;
    let heroVisible = true;
    let c1 = "139, 108, 255";
    let c2 = "34, 211, 238";

    function readColors() {
      const cs = getComputedStyle(root);
      c1 = cs.getPropertyValue("--net-1").trim() || c1;
      c2 = cs.getPropertyValue("--net-2").trim() || c2;
    }

    function seed() {
      const count = Math.round(Math.min(90, Math.max(26, (width * height) / 15000)));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.34,
        vy: (Math.random() - 0.5) * 0.34,
        r: Math.random() * 1.6 + 0.8,
        alt: Math.random() < 0.45,
      }));
    }

    function resize() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const widthChanged = Math.abs(rect.width - width) > 1;
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (widthChanged || !nodes.length) seed();
      draw();
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      const maxD = 130;
      const maxD2 = maxD * maxD;
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < maxD2) {
            ctx.strokeStyle = `rgba(${c1}, ${(1 - Math.sqrt(d2) / maxD) * 0.32})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (md < 170) {
          ctx.strokeStyle = `rgba(${c2}, ${(1 - md / 170) * 0.5})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();
        }
      }
      for (const n of nodes) {
        ctx.fillStyle = `rgba(${n.alt ? c2 : c1}, 0.85)`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function step() {
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;
      }
      draw();
      raf = requestAnimationFrame(step);
    }

    function start() {
      if (reduceMotion || raf || !heroVisible || document.hidden) return;
      raf = requestAnimationFrame(step);
    }

    function stop() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    readColors();
    resize();
    start();

    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
    window.addEventListener("themechange", () => { readColors(); draw(); });

    hero.addEventListener("pointermove", (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    }, { passive: true });
    hero.addEventListener("pointerleave", () => { mouse.x = -9999; mouse.y = -9999; });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        heroVisible = entry.isIntersecting;
        if (heroVisible) start(); else stop();
      }).observe(hero);
    }
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  }
})();
