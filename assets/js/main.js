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
    metaTheme.setAttribute("content", theme === "dark" ? "#141413" : "#f7f5ee");
  }

  applyTheme(root.dataset.theme === "dark" ? "dark" : "light");
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

})();
