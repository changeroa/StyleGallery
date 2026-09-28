// Shared runtime for showcase studies. Every behavior here keeps the QA floor:
// content is visible without JavaScript, reduced motion gets a calm static page,
// ambient loops pause offscreen, and fictional actions announce themselves.
(() => {
  const root = document.documentElement;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  root.classList.add("sg-js");
  const ease = "cubic-bezier(0.16, 1, 0.3, 1)";

  // Visible by default; the entrance plays only as an element arrives, so an element that never
  // arrives (offline, no observer, screenshots of offscreen content) is still readable.
  function reveal(element) {
    if (reduced || element.dataset.revealed) return;
    element.dataset.revealed = "1";
    const kind = element.dataset.reveal || "rise";
    const delay = Number(element.dataset.delay || 0);
    const frames = {
      rise: [{ opacity: 0, transform: "translateY(28px)" }, { opacity: 1, transform: "none" }],
      fade: [{ opacity: 0 }, { opacity: 1 }],
      scale: [{ opacity: 0, transform: "scale(0.94)" }, { opacity: 1, transform: "none" }],
      left: [{ opacity: 0, transform: "translateX(-40px)" }, { opacity: 1, transform: "none" }],
      right: [{ opacity: 0, transform: "translateX(40px)" }, { opacity: 1, transform: "none" }],
      blur: [{ opacity: 0, filter: "blur(12px)", transform: "translateY(12px)" }, { opacity: 1, filter: "blur(0)", transform: "none" }],
      clip: [{ clipPath: "inset(0 0 100% 0)" }, { clipPath: "inset(0 0 0% 0)" }],
    }[kind] ?? [{ opacity: 0 }, { opacity: 1 }];
    // Measured reveals on live homepages run 400-600ms (expression/measured-benchmarks.md).
    element.animate(frames, { delay, duration: 600, easing: ease, fill: "backwards" });
  }

  // Split a heading into words that rise in sequence. The text stays in the DOM as words.
  function split(element) {
    if (element.dataset.splitDone) return;
    element.dataset.splitDone = "1";
    const walk = (node) => {
      for (const child of [...node.childNodes]) {
        if (child.nodeType === 3) {
          const parts = child.textContent.split(/(\s+)/);
          const fragment = document.createDocumentFragment();
          for (const part of parts) {
            if (!part) continue;
            if (/^\s+$/.test(part)) { fragment.append(part); continue; }
            const outer = document.createElement("span");
            outer.className = "sg-word";
            const inner = document.createElement("span");
            inner.className = "sg-word-inner";
            inner.textContent = part;
            outer.append(inner);
            fragment.append(outer);
          }
          child.replaceWith(fragment);
        } else if (child.nodeType === 1 && !child.classList.contains("sg-word")) walk(child);
      }
    };
    walk(element);
  }
  function playSplit(element) {
    if (reduced || element.dataset.splitPlayed) return;
    element.dataset.splitPlayed = "1";
    const step = Number(element.dataset.stagger || 60);
    element.querySelectorAll(".sg-word-inner").forEach((word, index) => {
      word.animate([{ transform: "translateY(110%)" }, { transform: "none" }], { delay: Number(element.dataset.delay || 0) + index * step, duration: 800, easing: ease, fill: "backwards" });
    });
  }

  function count(element) {
    if (element.dataset.counted) return;
    element.dataset.counted = "1";
    const target = Number(element.dataset.count);
    const decimals = Number(element.dataset.decimals || 0);
    const prefix = element.dataset.prefix || "";
    const suffix = element.dataset.suffix || "";
    const format = (value) => prefix + value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (reduced) { element.textContent = format(target); return; }
    const start = performance.now();
    const duration = 1400;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      element.textContent = format(target * (1 - Math.pow(1 - t, 4)));
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  const arrive = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      if (element.hasAttribute("data-reveal")) reveal(element);
      if (element.hasAttribute("data-split")) playSplit(element);
      if (element.hasAttribute("data-count")) count(element);
      arrive.unobserve(element);
    }
  }, { rootMargin: "0px 0px -6% 0px" });

  // Ambient loops (CSS animations inside [data-ambient]) run only while their container is on screen.
  const ambient = new IntersectionObserver((entries) => {
    for (const entry of entries) entry.target.toggleAttribute("data-paused", !entry.isIntersecting);
  });

  // Canvas or rAF loops gated on visibility and reduced motion. draw(time, state) is called per frame;
  // under reduced motion it is called once so the scene still shows a still frame.
  function loop(element, draw) {
    let visible = false;
    let frame = 0;
    const tick = (time) => {
      if (!visible) { frame = 0; return; }
      draw(time);
      frame = requestAnimationFrame(tick);
    };
    if (reduced) { draw(0); return; }
    new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(tick);
    }).observe(element);
  }

  // Scroll-linked scenes: callback receives progress 0..1 across the element's scroll track.
  // Progress is derived from the current position, so reverse scrolling and mid-page entry work.
  const scenes = [];
  function scene(element, update, { start = "top", end = "bottom" } = {}) {
    scenes.push({ element, update, start, end });
    measure();
  }
  function progressOf({ element, start }) {
    const rect = element.getBoundingClientRect();
    const track = start === "enter" ? rect.height + innerHeight : Math.max(1, rect.height - innerHeight);
    const offset = start === "enter" ? innerHeight - rect.top : -rect.top;
    return Math.min(1, Math.max(0, offset / track));
  }
  let pending = false;
  function measure() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => {
      pending = false;
      for (const item of scenes) {
        const p = progressOf(item);
        if (p !== item.last) { item.last = p; item.update(p, item.element); }
      }
    });
  }
  addEventListener("scroll", measure, { passive: true });
  addEventListener("resize", measure);

  // Fictional actions announce an honest message in one polite status region.
  let status;
  let hideTimer = 0;
  function announce(message) {
    if (!status) {
      status = document.createElement("div");
      status.className = "sg-status";
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      document.body.append(status);
    }
    status.textContent = message;
    status.dataset.show = "1";
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { delete status.dataset.show; status.textContent = ""; }, 4200);
  }
  document.addEventListener("click", (event) => {
    const action = event.target.closest("[data-demo]");
    if (!action) return;
    event.preventDefault();
    announce(action.dataset.demo || "This is a demo action in an unofficial study.");
  });

  // In-page links glide (focus scrolling stays instant so keyboard focus is never mid-flight).
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[href^='#']");
    if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const id = decodeURIComponent(link.getAttribute("href").slice(1));
    const target = id === "top" ? document.body : document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    if (location.hash !== "#" + id) history.pushState(null, "", "#" + id);
    if (id === "top") scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    else target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  });

  // Pointer-driven effects: tilt cards, spotlight surfaces, magnetic buttons.
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
  function pointerEffects(scope) {
    if (reduced || !finePointer) return;
    scope.querySelectorAll("[data-spotlight]").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        element.style.setProperty("--mx", `${event.clientX - rect.left}px`);
        element.style.setProperty("--my", `${event.clientY - rect.top}px`);
      });
    });
    scope.querySelectorAll("[data-tilt]").forEach((element) => {
      const strength = Number(element.dataset.tilt || 8);
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        element.style.transform = `perspective(900px) rotateX(${-y * strength}deg) rotateY(${x * strength}deg)`;
      });
      element.addEventListener("pointerleave", () => { element.style.transform = ""; });
    });
    scope.querySelectorAll("[data-magnet]").forEach((element) => {
      element.addEventListener("pointermove", (event) => {
        const rect = element.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        element.style.transform = `translate(${x * 0.25}px, ${y * 0.3}px)`;
      });
      element.addEventListener("pointerleave", () => { element.style.transform = ""; });
    });
  }

  // Accessible tabs: [data-tabs] containing [role=tab] buttons with aria-controls panels.
  function tabs(scope) {
    scope.querySelectorAll("[data-tabs]").forEach((group) => {
      const list = [...group.querySelectorAll("[role='tab']")];
      const select = (tab) => {
        for (const other of list) {
          const on = other === tab;
          other.setAttribute("aria-selected", String(on));
          const panel = document.getElementById(other.getAttribute("aria-controls"));
          if (panel) panel.hidden = !on;
        }
        group.dispatchEvent(new CustomEvent("sg:tab", { detail: { index: list.indexOf(tab) } }));
      };
      list.forEach((tab, index) => {
        tab.addEventListener("click", () => select(tab));
        tab.addEventListener("keydown", (event) => {
          const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
          if (!delta) return;
          event.preventDefault();
          const next = list[(index + delta + list.length) % list.length];
          next.focus();
          select(next);
        });
      });
      const initial = list.find((tab) => tab.getAttribute("aria-selected") === "true") ?? list[0];
      if (initial) select(initial);
    });
  }

  function init() {
    document.querySelectorAll(".sg-marquee").forEach((row) => { if (row.querySelector(".sg-marquee-mover")) return; const mover = document.createElement("div"); mover.className = "sg-marquee-mover"; mover.append(...row.querySelectorAll(":scope > .sg-marquee-track")); row.append(mover); });
    document.querySelectorAll("[data-split]").forEach(split);
    // Elements already on screen start now, so the entrance exists before load settles; the rest wait to arrive.
    document.querySelectorAll("[data-reveal], [data-split], [data-count]").forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (rect.top < innerHeight * 0.94 && rect.bottom > 0 && rect.width > 0) {
        if (element.hasAttribute("data-reveal")) reveal(element);
        if (element.hasAttribute("data-split")) playSplit(element);
        if (element.hasAttribute("data-count")) count(element);
      } else arrive.observe(element);
    });
    document.querySelectorAll("[data-ambient]").forEach((element) => ambient.observe(element));
    pointerEffects(document);
    tabs(document);
    const header = document.querySelector("[data-header]");
    if (header) {
      const onScroll = () => header.toggleAttribute("data-scrolled", scrollY > 8);
      addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }
    measure();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  window.SG = { reduced, loop, scene, announce, reveal, count, finePointer, clamp: (v, a = 0, b = 1) => Math.min(b, Math.max(a, v)), lerp: (a, b, t) => a + (b - a) * t, range: (p, a, b) => Math.min(1, Math.max(0, (p - a) / (b - a))) };
})();
