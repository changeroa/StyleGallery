// Original flat product illustrations for commerce studies. No brand artwork, logos, or photos.
// SG.art(kind, { ground, main, accent }) returns an SVG string sized to fill its box.
(() => {
  const shapes = {
    bag: (m, a) => `<path d="M30 40h40l6 46H24z" fill="${m}"/><path d="M38 40c0-12 5-18 12-18s12 6 12 18" stroke="${a}" stroke-width="4" fill="none"/><rect x="34" y="52" width="32" height="4" rx="2" fill="${a}" opacity=".5"/>`,
    tote: (m, a) => `<path d="M24 36h52l-4 52H28z" fill="${m}"/><path d="M36 36c0-16 6-22 14-22s14 6 14 22" stroke="${a}" stroke-width="3" fill="none"/>`,
    shoe: (m, a) => `<path d="M14 66c10-2 22-16 30-24 6 6 14 10 26 12 10 2 16 6 16 14v6H14z" fill="${m}"/><path d="M14 74h72v6H14z" fill="${a}"/><path d="M42 48l6 6M48 44l6 6M54 42l6 6" stroke="${a}" stroke-width="2.5"/>`,
    sneaker: (m, a) => `<path d="M12 62c14 0 24-20 32-22 4 8 12 12 26 14 10 2 18 6 18 14v4H12z" fill="${m}"/><path d="M12 72h76v8H12z" fill="#f4f4f4"/><path d="M30 60c10-4 26-2 40 6" stroke="${a}" stroke-width="4" fill="none"/>`,
    boot: (m, a) => `<path d="M34 14h22v46c8 2 20 6 24 14v8H30z" fill="${m}"/><rect x="30" y="80" width="50" height="6" fill="${a}"/><path d="M36 26h18M36 38h18" stroke="${a}" stroke-width="3"/>`,
    tee: (m, a) => `<path d="M30 20l-16 12 8 12 8-5v47h40V39l8 5 8-12-16-12c-4 6-10 8-20 8s-16-2-20-8z" fill="${m}"/><path d="M40 20c2 5 6 7 10 7s8-2 10-7" stroke="${a}" stroke-width="3" fill="none"/>`,
    jacket: (m, a) => `<path d="M32 16l-18 14v58h22V44l14 10 14-10v44h22V30L68 16c-4 6-10 10-18 10s-14-4-18-10z" fill="${m}"/><path d="M50 26v62" stroke="${a}" stroke-width="3"/><circle cx="50" cy="44" r="2" fill="${a}"/><circle cx="50" cy="58" r="2" fill="${a}"/>`,
    pants: (m, a) => `<path d="M32 12h36l4 78H56l-6-50-6 50H28z" fill="${m}"/><path d="M32 18h36" stroke="${a}" stroke-width="4"/>`,
    cap: (m, a) => `<path d="M22 60c0-22 12-34 28-34s28 12 28 34z" fill="${m}"/><path d="M62 58c10 0 22 2 28 8H58z" fill="${a}"/><circle cx="50" cy="26" r="3" fill="${a}"/>`,
    bottle: (m, a) => `<rect x="40" y="12" width="20" height="12" rx="3" fill="${a}"/><path d="M36 24h28v6c6 4 8 10 8 18v38H28V48c0-8 2-14 8-18z" fill="${m}"/><rect x="34" y="52" width="32" height="18" rx="3" fill="#fff" opacity=".7"/>`,
    serum: (m, a) => `<rect x="44" y="10" width="12" height="14" rx="4" fill="${a}"/><rect x="36" y="24" width="28" height="64" rx="8" fill="${m}"/><rect x="40" y="46" width="20" height="20" rx="3" fill="#fff" opacity=".6"/>`,
    lipstick: (m, a) => `<rect x="38" y="52" width="24" height="36" rx="3" fill="${a}"/><rect x="41" y="36" width="18" height="18" fill="#d9d9d9"/><path d="M42 36V20l16-8v24z" fill="${m}"/>`,
    box: (m, a) => `<path d="M16 38 50 24l34 14v40L50 92 16 78z" fill="${m}"/><path d="M16 38l34 14 34-14M50 52v40" stroke="${a}" stroke-width="2.5" fill="none"/><path d="M30 32l34 14" stroke="${a}" stroke-width="5"/>`,
    gift: (m, a) => `<rect x="20" y="40" width="60" height="44" rx="3" fill="${m}"/><rect x="16" y="32" width="68" height="12" rx="2" fill="${m}"/><path d="M50 32v52" stroke="${a}" stroke-width="7"/><path d="M50 32c-8-14-22-12-18-2 2 4 10 4 18 2zm0 0c8-14 22-12 18-2-2 4-10 4-18 2z" fill="${a}"/>`,
    fruit: (m, a) => `<circle cx="38" cy="58" r="20" fill="${m}"/><circle cx="62" cy="58" r="20" fill="${m}"/><circle cx="50" cy="42" r="20" fill="${m}"/><path d="M50 22c0-6 4-10 10-10" stroke="${a}" stroke-width="3" fill="none"/><ellipse cx="44" cy="36" rx="5" ry="3" fill="#fff" opacity=".4"/>`,
    meat: (m, a) => `<ellipse cx="50" cy="56" rx="36" ry="26" fill="#f0e6dc"/><path d="M24 54c4-16 20-20 32-16 12 4 22 8 20 18-2 12-22 16-36 12-10-2-18-6-16-14z" fill="${m}"/><path d="M34 50c8-4 18-2 26 4M40 62c8 2 16 0 22-4" stroke="${a}" stroke-width="3" fill="none" opacity=".8"/>`,
    bowl: (m, a) => `<path d="M16 50h68c0 20-16 34-34 34S16 70 16 50z" fill="${m}"/><ellipse cx="50" cy="50" rx="34" ry="8" fill="${a}"/><circle cx="40" cy="46" r="5" fill="#f6d365"/><circle cx="56" cy="44" r="6" fill="#8bc34a"/>`,
    chair: (m, a) => `<rect x="30" y="16" width="40" height="36" rx="8" fill="${m}"/><rect x="26" y="52" width="48" height="12" rx="4" fill="${m}"/><path d="M32 64l-4 24M68 64l4 24" stroke="${a}" stroke-width="4"/>`,
    lamp: (m, a) => `<path d="M30 20h40l10 30H20z" fill="${m}"/><path d="M50 50v30" stroke="${a}" stroke-width="4"/><rect x="34" y="80" width="32" height="6" rx="3" fill="${a}"/>`,
    sofa: (m, a) => `<rect x="12" y="44" width="76" height="26" rx="8" fill="${m}"/><rect x="18" y="30" width="64" height="20" rx="8" fill="${m}" opacity=".85"/><rect x="8" y="46" width="12" height="28" rx="5" fill="${a}"/><rect x="80" y="46" width="12" height="28" rx="5" fill="${a}"/><path d="M20 70v10M80 70v10" stroke="${a}" stroke-width="4"/>`,
    plant: (m, a) => `<path d="M34 62h32l-4 26H38z" fill="${a}"/><path d="M50 62C44 44 30 40 22 42c4 12 16 20 28 20zm0 0c6-22 20-28 30-26-4 14-16 24-30 26zm0 0c-2-20 2-34 8-40 4 14 0 30-8 40z" fill="${m}"/>`,
    phone: (m, a) => `<rect x="32" y="10" width="36" height="80" rx="8" fill="${a}"/><rect x="35" y="16" width="30" height="66" rx="4" fill="${m}"/>`,
    watch: (m, a) => `<rect x="40" y="10" width="20" height="80" rx="6" fill="${a}"/><rect x="32" y="32" width="36" height="36" rx="10" fill="${m}"/><path d="M50 42v8l6 4" stroke="#fff" stroke-width="3"/>`,
    ticket: (m, a) => `<path d="M14 30h72v12a8 8 0 0 0 0 16v12H14V58a8 8 0 0 0 0-16z" fill="${m}"/><path d="M62 30v40" stroke="${a}" stroke-width="2" stroke-dasharray="4 4"/>`,
    bed: (m, a) => `<rect x="12" y="50" width="76" height="20" rx="4" fill="${m}"/><rect x="12" y="36" width="20" height="16" rx="5" fill="#fff"/><path d="M12 30v50M88 50v30" stroke="${a}" stroke-width="5"/>`,
    pin: (m, a) => `<path d="M50 88C30 62 24 50 24 38a26 26 0 0 1 52 0c0 12-6 24-26 50z" fill="${m}"/><circle cx="50" cy="38" r="10" fill="${a}"/>`,
    car: (m, a) => `<path d="M14 60l8-18c2-4 6-6 10-6h36c4 0 8 2 10 6l8 18v14H14z" fill="${m}"/><path d="M28 44h44l4 12H24z" fill="#dfe8f0"/><circle cx="30" cy="74" r="8" fill="${a}"/><circle cx="70" cy="74" r="8" fill="${a}"/>`,
    book: (m, a) => `<path d="M18 22h28c4 0 4 4 4 4v62s0-4-4-4H18z" fill="${m}"/><path d="M82 22H54c-4 0-4 4-4 4v62s0-4 4-4h28z" fill="${m}" opacity=".8"/><path d="M24 34h18M24 42h18M58 34h18" stroke="${a}" stroke-width="2.5"/>`,
  };
  window.SG = window.SG || {};
  window.SG.art = (kind, { ground = "#f1f1f1", main = "#222", accent = "#999", label = "" } = {}) =>
    `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${label || kind + " illustration"}" style="background:${ground};width:100%;height:100%">${(shapes[kind] || shapes.box)(main, accent)}</svg>`;
  window.SG.artKinds = Object.keys(shapes);
})();
