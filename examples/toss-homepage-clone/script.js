const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector("#primary-nav");
const sections = [...document.querySelectorAll("[data-section]")];
const railLinks = [...document.querySelectorAll("[data-section-rail] a")];
const featureButtons = [...document.querySelectorAll("[data-feature]")];
const balance = document.querySelector("[data-balance]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const featureValues = {
  overview: "$18,420.50",
  manage: "$14,985.20",
  interest: "+$42.18",
  exchange: "$0 fees",
};

function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  primaryNav.dataset.open = "false";
}

menuButton.addEventListener("click", () => {
  const nextOpen = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(nextOpen));
  primaryNav.dataset.open = String(nextOpen);
});

primaryNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) closeMenu();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

featureButtons.forEach((button) => {
  button.addEventListener("click", () => {
    featureButtons.forEach((candidate) => candidate.setAttribute("aria-selected", String(candidate === button)));
    balance.textContent = featureValues[button.dataset.feature];
  });
  button.addEventListener("keydown", (event) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = featureButtons.indexOf(button);
    const target = event.key === "Home" ? 0 : event.key === "End" ? featureButtons.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + featureButtons.length) % featureButtons.length;
    featureButtons[target].focus();
    featureButtons[target].click();
  });
});

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("is-visible");
  });
}, { rootMargin: "0px 0px -12%", threshold: 0.1 });

document.querySelectorAll(".reveal").forEach((element) => {
  if (reducedMotion.matches) element.classList.add("is-visible");
  else revealObserver.observe(element);
});

const sectionObserver = new IntersectionObserver((entries) => {
  const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
  if (!current) return;
  railLinks.forEach((link) => link.setAttribute("aria-current", String(link.hash === `#${current.target.id}`)));
  const dark = current.target.matches(".finance-section,.business-section,.travel-section");
  if (!header.dataset.scrolled) header.dataset.tone = dark ? "dark" : "light";
}, { rootMargin: "-35% 0px -55%", threshold: 0 });

sections.forEach((section) => sectionObserver.observe(section));

function updateHeader() {
  if (window.scrollY > 40) {
    header.dataset.scrolled = "true";
    header.dataset.tone = "light";
  } else {
    delete header.dataset.scrolled;
    header.dataset.tone = "light";
  }
}

window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

reducedMotion.addEventListener("change", ({ matches }) => {
  if (matches) document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
});
