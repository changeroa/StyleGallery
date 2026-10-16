// Conservator exhibits: one browser-measurable claim per Layout pattern. Each exhibit renders the
// pattern doc's CSS block verbatim (the Conservator reads it from patterns/**.md at run time) around
// stress content that uses the doc's class hooks, then measures the spatial behavior the doc claims.
// The negative control removes one declaration the doc lists under "Properties That Break The Layout
// If Removed" and must make the named behavior fail.
//
// `measure(c, width)` runs inside the page and must be self-contained: it may use only its arguments.
// `c.expect(condition, behavior, message)` records a failure tagged with the behavior id.
// This module is plain data so the Registrar can import the exhibit list without a browser.

const sentence = (topic, index) => `${topic} note ${index + 1}: layout contracts keep reading order, focus order, and spatial order aligned while content grows.`;
const paragraphs = (topic, count) => Array.from({ length: count }, (_, index) => `<p>${sentence(topic, index)}</p>`).join("\n");
const links = (labels) => labels.map((label) => `<a href="#${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}">${label}</a>`).join("\n");
const items = (tag, className, labels) => labels.map((label) => `<${tag}${className ? ` class="${className}"` : ""}>${label}</${tag}>`).join("\n");
const squareImage = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Crect width='120' height='120' fill='%23345'/%3E%3C/svg%3E";
const twelveLabels = ["Backlog", "Milestones", "Roadmap", "Releases", "Discussions", "Insights", "Security", "Settings", "Projects", "Wiki", "Packages", "Environments"];
const cardLabels = (noun) => Array.from({ length: 8 }, (_, index) => `${noun} ${index + 1}`);

// Shared in-page checks, defined as functions so their source is serialized into the page.
function gridColumns(c, root, child, min, gap) {
  const container = c.r(root);
  const cells = c.rs(child);
  const expected = Math.max(1, Math.min(cells.length, Math.floor((container.width + gap) / (min + gap))));
  const firstRow = cells.filter((cell) => Math.abs(cell.top - cells[0].top) < 2).length;
  c.expect(firstRow === expected, "track-count", `${firstRow} items share the first row; ${expected} tracks fit ${Math.round(container.width)}px at ${min}px minimum`);
  c.expect(cells.every((cell) => cell.right <= container.right + 1 && cell.left >= container.left - 1), "track-containment", "an item overflows its grid container");
}

function wrapRow(c, root, child, gap, mustWrapAtNarrow = true) {
  const container = c.r(root);
  const cells = c.rs(child);
  c.expect(cells.every((cell) => cell.right <= container.right + 1), "wrap-containment", "an item overflows the row instead of wrapping");
  const rows = c.rowsOf(cells);
  if (mustWrapAtNarrow && c.W <= 400) c.expect(rows.length > 1, "wrap-containment", `items stay on ${rows.length} row at ${c.W}px`);
  for (const row of rows) {
    for (let index = 1; index < row.length; index += 1) {
      const space = row[index].left - row[index - 1].right;
      c.expect(c.near(space, gap, 1.5), "wrap-gap", `inline gap ${space.toFixed(1)}px differs from ${gap}px`);
    }
  }
}

function twoPane(c, root, first, second, min, gap) {
  const container = c.r(root);
  const a = c.r(first);
  const b = c.r(second);
  const sideBySide = container.width >= 2 * min + gap;
  if (sideBySide) {
    c.expect(c.near(a.top, b.top, 1.5) && b.left >= a.right + gap - 1.5, "pane-reflow", `panes should sit side by side at ${Math.round(container.width)}px`);
    c.expect(c.near(a.width, b.width, 1.5), "pane-reflow", `side-by-side panes should share the row equally (${a.width.toFixed(1)} vs ${b.width.toFixed(1)})`);
  } else {
    c.expect(b.top >= a.bottom + gap - 1.5 && c.near(a.left, b.left, 1.5), "pane-reflow", `panes should stack below ${2 * min + gap}px, container is ${Math.round(container.width)}px`);
  }
  c.expect(a.right <= container.right + 1 && b.right <= container.right + 1, "pane-containment", "a pane overflows its container");
}

function blockRhythm(c, root, gap) {
  const children = [...c.q(root).children].map((element) => element.getBoundingClientRect());
  for (let index = 1; index < children.length; index += 1) {
    const space = children[index].top - children[index - 1].bottom;
    c.expect(c.near(space, gap, 1), "block-rhythm", `block gap ${space.toFixed(1)}px differs from ${gap}px`);
  }
}

function multiColumn(c, root, child, width, gap) {
  const container = c.r(root);
  const expected = Math.max(1, Math.floor((container.width + gap) / (width + gap)));
  const lefts = new Set(c.rs(child).map((cell) => Math.round(cell.left / 4)));
  if (expected > 1) c.expect(lefts.size >= 2, "column-flow", `content stays in ${lefts.size} column where ${expected} columns of ${width}px fit`);
  else c.expect(lefts.size === 1, "column-flow", `content splits into ${lefts.size} columns where only one ${width}px column fits`);
}

export const sharedMeasures = { blockRhythm, gridColumns, multiColumn, twoPane, wrapRow };

export const exhibits = [
  {
    slug: "stack",
    claim: "Direct children of `stack` are separated by one 1rem block gap.",
    html: `<section class="stack" aria-labelledby="stack-heading">
    <h2 id="stack-heading">Release checklist</h2>
    ${paragraphs("Checklist", 2)}
    <button type="button">Start review</button>
</section>`,
    measure: (c) => c.blockRhythm(c, ".stack", 16),
    negative: { selector: ".stack", property: "display", behavior: "block-rhythm" },
  },
  {
    slug: "box",
    claim: "Content inside `box` is inset 1rem from every edge of the box.",
    html: `<aside class="box" aria-labelledby="box-heading">
    <h2 id="box-heading">Support window</h2>
    <p>Responses resume Monday at 09:00.</p>
</aside>`,
    measure: (c) => {
      const box = c.r(".box");
      const first = c.r(".box > h2");
      const last = c.r(".box > p");
      c.expect(c.near(first.left - box.left, 16, 1) && c.near(first.top - box.top, 16, 1), "box-inset", `start inset is ${(first.left - box.left).toFixed(1)}px by ${(first.top - box.top).toFixed(1)}px, expected 16px`);
      c.expect(c.near(box.right - last.right, 16, 1) && c.near(box.bottom - last.bottom, 16, 1), "box-inset", `end inset is ${(box.right - last.right).toFixed(1)}px by ${(box.bottom - last.bottom).toFixed(1)}px, expected 16px`);
    },
    negative: { selector: ".box", property: "padding", behavior: "box-inset" },
  },
  {
    slug: "center",
    claim: "`center` caps its content box at 64rem, centers itself in wider space, and keeps 1rem inline gutters.",
    html: `<article class="center" aria-labelledby="center-heading">
    <h2 id="center-heading">Editorial policy</h2>
    ${paragraphs("Policy", 3)}
</article>`,
    measure: (c) => {
      const box = c.r(".center");
      const text = c.r(".center > p");
      c.expect(c.near(box.width, Math.min(c.W, 1024 + 32), 1), "center-measure", `width ${box.width.toFixed(1)}px, expected min(viewport, 64rem + gutters)`);
      c.expect(c.near(box.left, c.W - box.right, 1), "center-centered", `left space ${box.left.toFixed(1)}px differs from right space ${(c.W - box.right).toFixed(1)}px`);
      c.expect(c.near(text.left - box.left, 16, 1), "center-gutter", `inline gutter ${(text.left - box.left).toFixed(1)}px, expected 16px`);
    },
    negative: { selector: ".center", property: "margin-inline", behavior: "center-centered" },
  },
  {
    slug: "cluster",
    claim: "`cluster` items keep a 0.75rem gap and wrap onto new rows instead of overflowing.",
    html: `<nav class="cluster" aria-label="Project actions">
${links(twelveLabels)}
</nav>`,
    measure: (c) => c.wrapRow(c, ".cluster", ".cluster > a", 12),
    negative: { selector: ".cluster", property: "flex-wrap", behavior: "wrap-containment", allow: ["overflow"] },
  },
  {
    slug: "content-limiter",
    claim: "`content-limiter` caps prose at a 70ch measure plus 1rem gutters and centers it.",
    html: `<article class="content_limiter" aria-labelledby="limiter-heading">
    <h2 id="limiter-heading">Incident summary</h2>
    ${paragraphs("Incident", 3)}
</article>`,
    measure: (c) => {
      const box = c.r(".content_limiter");
      const measure = c.length("70ch", ".content_limiter");
      c.expect(c.near(box.width, Math.min(c.W, measure + 32), 1), "limiter-measure", `width ${box.width.toFixed(1)}px, expected min(viewport, 70ch + gutters = ${(measure + 32).toFixed(1)}px)`);
      c.expect(c.near(box.left, c.W - box.right, 1), "limiter-centered", "the limited region is not centered");
    },
    negative: { selector: ".content_limiter", property: "max-inline-size", behavior: "limiter-measure" },
  },
  {
    slug: "super-center",
    claim: "`super-center` places its child at the center of a viewport-tall region on both axes.",
    html: `<section class="super_center" aria-labelledby="centered-dialog-title">
    <form aria-labelledby="centered-dialog-title">
        <h2 id="centered-dialog-title">Confirm archive</h2>
        <button type="button">Archive project</button>
    </form>
</section>`,
    measure: (c) => {
      const region = c.r(".super_center");
      const child = c.r(".super_center > form");
      c.expect(region.height >= c.H - 1, "super-center-fill", `region is ${region.height.toFixed(1)}px tall in a ${c.H}px viewport`);
      c.expect(child.width < region.width - 2 && child.height < region.height - 2, "super-center-both", "the child stretches across the region instead of being centered");
      c.expect(c.near(child.left - region.left, region.right - child.right, 1.5) && c.near(child.top - region.top, region.bottom - child.bottom, 1.5), "super-center-both", "the child is off center");
    },
    negative: { selector: ".super_center", property: "place-items", behavior: "super-center-both" },
  },
  {
    slug: "icon-frame",
    claim: "`icon-frame` is a 2.5rem square slot with its icon centered.",
    // role="img" is added: the doc sample's role-less aria-label fails axe-core (see notMeasured).
    html: `<p>Next event <span class="icon_frame" role="img" aria-label="Calendar">
    <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24"><rect width="24" height="24" fill="#345"></rect></svg>
</span> on Monday.</p>`,
    measure: (c) => {
      const frame = c.r(".icon_frame");
      const icon = c.r(".icon_frame > svg");
      c.expect(c.near(frame.width, 40, 0.5) && c.near(frame.height, 40, 0.5), "icon-frame-square", `slot is ${frame.width.toFixed(1)}x${frame.height.toFixed(1)}px, expected 40x40`);
      c.expect(c.near(icon.left - frame.left, frame.right - icon.right, 1) && c.near(icon.top - frame.top, frame.bottom - icon.bottom, 1), "icon-frame-center", "icon is not centered in its slot");
    },
    negative: { selector: ".icon_frame", property: "place-items", behavior: "icon-frame-center" },
  },
  {
    slug: "frame",
    claim: "`frame` holds a 16:9 slot at full inline size and its media fills the slot regardless of the media's own ratio.",
    html: `<figure class="frame">
    <img alt="Product walkthrough still" class="frame_media" src="${squareImage}">
</figure>`,
    measure: (c) => {
      const frame = c.r(".frame");
      const media = c.r(".frame_media");
      c.expect(c.near(frame.width / frame.height, 16 / 9, 0.02), "frame-ratio", `slot ratio ${(frame.width / frame.height).toFixed(3)}, expected 1.778`);
      c.expect(c.near(media.width, frame.width, 1) && c.near(media.height, frame.height, 1), "frame-fill", "media does not fill the slot");
      c.expect(c.near(frame.width, c.W, 1), "frame-fill", "slot does not take the full inline size");
    },
    negative: { selector: ".frame", property: "aspect-ratio", behavior: "frame-ratio" },
  },
  {
    slug: "cover",
    claim: "`cover` is at least viewport tall and gives its central region all space between the header and footer rows.",
    html: `<section class="cover" aria-labelledby="cover-title">
    <header><p>Step 2 of 4</p></header>
    <main><h1 id="cover-title">Choose a billing profile</h1></main>
    <footer><button type="button">Continue</button></footer>
</section>`,
    measure: (c) => {
      const cover = c.r(".cover");
      const header = c.r(".cover > header");
      const main = c.r(".cover > main");
      const footer = c.r(".cover > footer");
      c.expect(cover.height >= c.H - 1, "cover-fill", `cover is ${cover.height.toFixed(1)}px tall in a ${c.H}px viewport`);
      c.expect(c.near(footer.bottom, cover.bottom - 16, 1), "cover-fill", "footer does not rest on the cover's end padding");
      c.expect(c.near(main.top, header.bottom + 16, 1) && c.near(main.bottom, footer.top - 16, 1), "cover-center-region", "the central region does not span the space between header and footer");
    },
    negative: { selector: ".cover", property: "min-block-size", behavior: "cover-fill" },
  },
  {
    slug: "sidebar",
    claim: "`sidebar` keeps an 18rem sidebar beside a wider primary region and wraps them when the primary would fall below 16rem.",
    html: `<section class="sidebar" aria-labelledby="sidebar-title">
    <article class="sidebar_primary">
        <h2 id="sidebar-title">Quarterly planning notes</h2>
        ${paragraphs("Planning", 2)}
    </article>
    <aside class="sidebar_secondary">Meeting agenda and owners</aside>
</section>`,
    measure: (c) => {
      const root = c.r(".sidebar");
      const primary = c.r(".sidebar_primary");
      const secondary = c.r(".sidebar_secondary");
      const fits = root.width >= 256 + 16 + 288;
      if (fits) {
        c.expect(c.near(primary.top, secondary.top, 1) && secondary.left >= primary.right + 15, "sidebar-beside", "sidebar does not sit beside the primary region");
        c.expect(primary.width > secondary.width && primary.width >= 256 - 1, "sidebar-beside", "primary region does not keep priority");
      } else {
        c.expect(secondary.top >= primary.bottom + 15, "sidebar-wrap", `regions should wrap at ${Math.round(root.width)}px`);
      }
      c.expect(primary.right <= root.right + 1 && secondary.right <= root.right + 1, "sidebar-wrap", "a region overflows the container");
    },
    negative: { selector: ".sidebar", property: "flex-wrap", behavior: "sidebar-wrap", allow: ["overflow"] },
  },
  {
    slug: "switcher",
    claim: "`switcher` lays all items in one row when the container is at least 40rem and stacks all of them otherwise, never a partial row.",
    html: `<section class="switcher" aria-label="Pricing tiers">
    <article class="switcher_item">Starter plan</article>
    <article class="switcher_item">Team plan</article>
    <article class="switcher_item">Enterprise plan</article>
</section>`,
    measure: (c) => {
      const root = c.r(".switcher");
      const rows = c.rowsOf(c.rs(".switcher_item"));
      const expected = root.width >= 640 ? 1 : 3;
      c.expect(rows.length === expected, "switcher-all-or-none", `${rows.length} rows at ${Math.round(root.width)}px, expected ${expected}`);
    },
    negative: { selector: ".switcher_item", property: "flex-basis", behavior: "switcher-all-or-none" },
  },
  {
    slug: "media-object",
    claim: "`media-object` keeps a 6rem media slot top-aligned beside its content when both fit and wraps the content below otherwise.",
    html: `<article class="media_object">
    <figure class="media_object_media"><img alt="Speaker portrait" src="${squareImage}" width="96" height="96"></figure>
    <div class="media_object_content">
        <h2>Design systems briefing</h2>
        ${paragraphs("Speaker", 2)}
    </div>
</article>`,
    harness: ".media_object_media img { display: block; }",
    measure: (c) => {
      const root = c.r(".media_object");
      const media = c.r(".media_object_media");
      const content = c.r(".media_object_content");
      c.expect(c.near(media.width, 96, 1), "media-slot", `media slot is ${media.width.toFixed(1)}px, expected 96px`);
      if (root.width >= 96 + 16 + 320) {
        c.expect(c.near(media.top, content.top, 1) && content.left >= media.right + 15, "media-beside", "content does not sit top-aligned beside the media");
      } else {
        c.expect(content.top >= media.bottom + 15, "media-wrap", `content should wrap below the media at ${Math.round(root.width)}px`);
      }
    },
    negative: { selector: ".media_object", property: "flex-wrap", behavior: "media-wrap" },
  },
  {
    slug: "split-nav",
    claim: "`split-nav` holds primary links at the inline start and pushes secondary links to the inline end.",
    html: `<nav class="split_nav" aria-label="Documentation">
    <section class="split_nav_primary"><a href="#guides">Guides</a><a href="#api">API</a></section>
    <section class="split_nav_secondary"><a href="#sign-in">Sign in</a></section>
</nav>`,
    measure: (c) => {
      const nav = c.r(".split_nav");
      const primary = c.r(".split_nav_primary");
      const secondary = c.r(".split_nav_secondary");
      c.expect(c.near(primary.left, nav.left, 1), "split-nav-ends", "primary links do not start at the inline start");
      c.expect(c.near(secondary.right, nav.right, 1), "split-nav-ends", `secondary links end ${(nav.right - secondary.right).toFixed(1)}px before the inline end`);
    },
    negative: { selector: ".split_nav_secondary", property: "margin-inline-start", behavior: "split-nav-ends" },
  },
  {
    slug: "holy-grail",
    claim: "`holy-grail` spans header and footer across three columns, keeps left, main, and right side by side, and fills the viewport block size.",
    html: `<section class="holy_grail" aria-label="News page">
    <header class="holy_grail_header">Daily briefing</header>
    <aside class="holy_grail_left">Topic navigation</aside>
    <main class="holy_grail_main">${paragraphs("Lead story", 2)}</main>
    <aside class="holy_grail_right">Market snapshot</aside>
    <footer class="holy_grail_footer">Edition links</footer>
</section>`,
    // The doc CSS has no breakpoint: two 12rem side columns plus gaps exceed a 320px viewport.
    widths: [768, 1440],
    measure: (c) => {
      const root = c.r(".holy_grail");
      const [header, left, main, right, footer] = ["header", "left", "main", "right", "footer"].map((area) => c.r(`.holy_grail_${area}`));
      c.expect(c.near(left.top, main.top, 1) && c.near(main.top, right.top, 1) && left.right < main.left && main.right < right.left, "holy-grail-columns", "left, main, and right are not side by side");
      c.expect(c.near(header.width, root.width, 1) && c.near(footer.width, root.width, 1), "holy-grail-span", "header or footer does not span all columns");
      c.expect(root.height >= c.H - 1 && c.near(footer.bottom, root.bottom, 1), "holy-grail-fill", "shell does not fill the viewport block size");
    },
    negative: { selector: ".holy_grail", property: "grid-template", behavior: "holy-grail-columns", allow: ["holy-grail-span"] },
  },
  {
    slug: "sticky-footer",
    claim: "`sticky-footer` keeps the footer at the viewport's block end when content is short.",
    html: `<section class="sticky_footer" aria-label="Account setup">
    <header>Account setup</header>
    <main class="sticky_footer_main">Profile fields and preferences</main>
    <footer><button type="button">Save profile</button></footer>
</section>`,
    measure: (c) => {
      const footer = c.r(".sticky_footer > footer");
      c.expect(c.near(footer.bottom, c.H, 1), "sticky-footer-end", `footer ends at ${footer.bottom.toFixed(1)}px in a ${c.H}px viewport`);
    },
    negative: { selector: ".sticky_footer", property: "min-block-size", behavior: "sticky-footer-end" },
  },
  {
    slug: "sticky-header",
    claim: "`sticky-header` stays pinned at the viewport's block start while the document scrolls.",
    html: `<header class="sticky_header">
    <nav aria-label="Repository"><a href="#code">Code</a> <a href="#issues">Issues</a> <a href="#pulls">Pull requests</a></nav>
</header>
<main>${paragraphs("Repository", 30)}</main>`,
    harness: ".sticky_header { background: #fff; }",
    measure: (c) => {
      window.scrollTo(0, 600);
      const header = c.r(".sticky_header");
      c.expect(scrollY > 0 && c.near(header.top, 0, 1), "sticky-header-pinned", `after scrolling ${scrollY}px the header sits at ${header.top.toFixed(1)}px`);
      window.scrollTo(0, 0);
    },
    negative: { selector: ".sticky_header", property: "position", behavior: "sticky-header-pinned" },
  },
  {
    slug: "scroll-body-shell",
    claim: "`scroll-body-shell` keeps header and footer inside the viewport while only the named body scrolls; the document root never scrolls.",
    html: `<section class="scroll_body_shell" aria-label="Inbox">
    <header><nav aria-label="Inbox filters">${links(["All", "Unread", "Flagged"])}</nav></header>
    <main class="scroll_body_shell_body" data-scroll-owner tabindex="-1">
        <h1>Message list owns vertical scrolling</h1>
        ${paragraphs("Message", 40)}
        <p><button type="button">Load older messages</button></p>
    </main>
    <footer><a href="#selected">Selected message actions</a></footer>
</section>`,
    measure: (c) => {
      const body = c.q(".scroll_body_shell_body");
      const footer = c.r(".scroll_body_shell > footer");
      const header = c.r(".scroll_body_shell > header");
      body.scrollTop = 120;
      const moved = body.scrollTop > 0;
      body.scrollTop = 0;
      c.expect(body.scrollHeight > body.clientHeight + 1 && moved, "scroll-owner", "the body region does not scroll its overflowing content");
      c.expect(c.root.scrollHeight <= c.root.clientHeight + 1, "scroll-owner", `document root overflows by ${c.root.scrollHeight - c.root.clientHeight}px`);
      c.expect(header.top >= -1 && footer.bottom <= c.H + 1, "shell-regions-visible", "header or footer leaves the viewport");
    },
    negative: { selector: ".scroll_body_shell_body", property: "overflow", behavior: "scroll-owner" },
  },
  {
    slug: "fixed-sidenav-shell",
    claim: "`fixed-sidenav-shell` keeps a 16rem navigation column in place while only the main region scrolls.",
    html: `<section class="fixed_sidenav_shell" aria-label="Settings">
    <nav class="fixed_sidenav_shell_list" aria-label="Settings sections">${links(["Profile", "Billing", "Security"])}</nav>
    <main class="fixed_sidenav_shell_main" tabindex="0">${paragraphs("Setting", 50)}</main>
</section>`,
    harness: ".fixed_sidenav_shell_list a { display: block; }",
    measure: (c) => {
      const nav = c.r(".fixed_sidenav_shell_list");
      const main = c.q(".fixed_sidenav_shell_main");
      c.expect(c.near(nav.width, 256, 1), "sidenav-column", `navigation column is ${nav.width.toFixed(1)}px, expected 256px`);
      main.scrollTop = 200;
      const moved = main.scrollTop > 0;
      const navAfter = c.r(".fixed_sidenav_shell_list");
      main.scrollTop = 0;
      c.expect(moved && main.scrollHeight > main.clientHeight + 1, "sidenav-scroll-owner", "main region does not scroll its overflowing content");
      c.expect(c.root.scrollHeight <= c.root.clientHeight + 1, "sidenav-scroll-owner", `document root overflows by ${c.root.scrollHeight - c.root.clientHeight}px`);
      c.expect(c.near(navAfter.top, nav.top, 0.5), "sidenav-column", "navigation moved while main scrolled");
    },
    negative: { selector: ".fixed_sidenav_shell_main", property: "overflow", behavior: "sidenav-scroll-owner", allow: ["overflow"] },
  },
  {
    slug: "sticky-aside",
    claim: "`sticky-aside` keeps a 16rem aside visible 1rem from the viewport's block start during long reads.",
    html: `<section class="sticky_aside" aria-label="Long article">
    <main class="sticky_aside_main">${paragraphs("Article section", 80)}</main>
    <aside class="sticky_aside_side">Table of contents</aside>
</section>`,
    measure: (c) => {
      const aside = c.r(".sticky_aside_side");
      c.expect(c.near(aside.width, 256, 1), "sticky-aside-column", `aside is ${aside.width.toFixed(1)}px, expected 256px`);
      window.scrollTo(0, 800);
      const pinned = c.r(".sticky_aside_side");
      c.expect(scrollY > 0 && c.near(pinned.top, 16, 1), "sticky-aside-pinned", `after scrolling ${scrollY}px the aside sits at ${pinned.top.toFixed(1)}px`);
      window.scrollTo(0, 0);
    },
    negative: { selector: ".sticky_aside_side", property: "position", behavior: "sticky-aside-pinned" },
  },
  {
    slug: "ram-grid",
    claim: "`ram-grid` repeats as many equal columns of at least 16rem as fit and collapses to one full-width column below that.",
    html: `<section class="ram_grid" aria-label="Photo albums">
${items("article", "", cardLabels("Album"))}
</section>`,
    measure: (c) => c.gridColumns(c, ".ram_grid", ".ram_grid > article", 256, 16),
    negative: { selector: ".ram_grid", property: "display", behavior: "track-count" },
  },
  {
    slug: "card-grid",
    claim: "`card-grid` repeats as many equal columns of at least 18rem as fit and collapses to one full-width column below that.",
    html: `<section class="card_grid" aria-label="Project cards">
${items("article", "", cardLabels("Project"))}
</section>`,
    measure: (c) => c.gridColumns(c, ".card_grid", ".card_grid > article", 288, 16),
    negative: { selector: ".card_grid", property: "grid-template-columns", behavior: "track-count" },
  },
  {
    slug: "twelve-span-grid",
    claim: "`twelve-span-grid` items spanning four of twelve tracks sit three to a row at equal widths.",
    html: `<section class="twelve_span_grid" aria-label="Dashboard modules">
${items("article", "twelve_span_grid_item", ["Revenue module", "Retention module", "Pipeline module", "Churn module", "Forecast module", "Support module"])}
</section>`,
    measure: (c) => {
      const root = c.r(".twelve_span_grid");
      const cells = c.rs(".twelve_span_grid_item");
      const rows = c.rowsOf(cells);
      const track = (root.width - 11 * 16) / 12;
      c.expect(rows.every((row) => row.length === 3), "twelve-span-thirds", `rows hold ${rows.map((row) => row.length).join("/")} items, expected 3 each`);
      c.expect(cells.every((cell) => c.near(cell.width, 4 * track + 3 * 16, 1)), "twelve-span-thirds", "an item does not span four tracks");
    },
    negative: { selector: ".twelve_span_grid_item", property: "grid-column", behavior: "twelve-span-thirds" },
  },
  {
    slug: "page-grid",
    claim: "`page-grid` centers content in a track of at most 72rem with outer gutters of at least 1rem plus the gap.",
    html: `<section class="page_grid" aria-label="Article page">
    <main class="page_grid_content">${paragraphs("Article", 2)}</main>
</section>`,
    measure: (c) => {
      const content = c.r(".page_grid_content");
      c.expect(content.width <= 1152 + 1 && c.near(content.width, Math.min(1152, c.W - 64), 1), "page-grid-track", `content track is ${content.width.toFixed(1)}px`);
      c.expect(c.near(content.left, c.W - content.right, 1) && content.left >= 32 - 1, "page-grid-centered", "content track is not centered between its gutters");
    },
    negative: { selector: ".page_grid_content", property: "grid-column", behavior: "page-grid-centered", allow: ["page-grid-track"] },
  },
  {
    slug: "grid-wrapper",
    claim: "`grid-wrapper` centers main content in a track of at most 64rem and lets it take the full width when space is short.",
    html: `<section class="grid_wrapper" aria-label="Marketing page">
    <main class="grid_wrapper_main">${paragraphs("Campaign", 2)}</main>
</section>`,
    measure: (c) => {
      const main = c.r(".grid_wrapper_main");
      c.expect(c.near(main.width, Math.min(1024, c.W), 1), "grid-wrapper-track", `main track is ${main.width.toFixed(1)}px`);
      c.expect(c.near(main.left, c.W - main.right, 1), "grid-wrapper-centered", "main track is not centered");
    },
    negative: { selector: ".grid_wrapper_main", property: "grid-column", behavior: "grid-wrapper-centered", allow: ["grid-wrapper-track"] },
  },
  {
    slug: "columns",
    claim: "`columns` flows long content into as many 18rem columns as fit and returns to one column when narrow.",
    html: `<article class="columns" aria-labelledby="columns-heading">
    <h2 id="columns-heading">Release notes</h2>
    ${paragraphs("Release", 12)}
</article>`,
    measure: (c) => c.multiColumn(c, ".columns", ".columns > p", 288, 32),
    negative: { selector: ".columns", property: "columns", behavior: "column-flow" },
  },
  {
    slug: "deconstructed-pancake",
    claim: "`deconstructed-pancake` items stretch to fill each row and wrap when a 16rem item no longer fits.",
    html: `<section class="deconstructed_pancake" aria-label="Plan comparison">
${items("article", "deconstructed_pancake_item", ["Solo plan", "Studio plan", "Agency plan"])}
</section>`,
    measure: (c) => {
      const root = c.r(".deconstructed_pancake");
      const rows = c.rowsOf(c.rs(".deconstructed_pancake_item"));
      const perRow = Math.max(1, Math.min(3, Math.floor((root.width + 16) / (256 + 16))));
      c.expect(rows[0].length === perRow, "pancake-wrap", `first row holds ${rows[0].length} items, expected ${perRow}`);
      for (const row of rows) {
        const filled = row.at(-1).right - row[0].left;
        c.expect(c.near(filled, root.width, 1), "pancake-stretch", `a row fills ${filled.toFixed(1)}px of ${root.width.toFixed(1)}px`);
      }
    },
    negative: { selector: ".deconstructed_pancake_item", property: "flex", behavior: "pancake-stretch", allow: ["pancake-wrap"] },
  },
  {
    slug: "line-up",
    claim: "`line-up` pushes each card's footer to the card's block end so actions align across cards of different lengths.",
    html: `<div class="exhibit_row">
${["Short summary.", "A medium summary that runs across a couple of lines in narrow cards.", "A long summary that keeps going so this card body is clearly taller than its neighbours, which is the case the pattern exists for."].map((summary, index) => `<article class="line_up" aria-labelledby="line-up-${index}">
    <section class="line_up_body"><h2 id="line-up-${index}">Plan ${index + 1}</h2><p>${summary}</p></section>
    <footer class="line_up_footer"><button type="button">Open ${index + 1}</button></footer>
</article>`).join("\n")}
</div>`,
    harness: ".exhibit_row { display: grid; gap: 1rem; grid-template-columns: repeat(3, minmax(0, 1fr)); }",
    measure: (c) => {
      const footers = c.rs(".line_up_footer");
      const cards = c.rs(".line_up");
      c.expect(footers.every((footer) => c.near(footer.bottom, footers[0].bottom, 1)), "line-up-footers", "card footers do not share one block-end line");
      c.expect(footers.every((footer, index) => c.near(footer.bottom, cards[index].bottom, 1)), "line-up-footers", "a footer does not rest on its card's block end");
    },
    negative: { selector: ".line_up_footer", property: "margin-block-start", behavior: "line-up-footers" },
  },
  {
    slug: "clamped-card",
    claim: "`clamped-card` sizes to half the viewport, clamped between 16rem and 28rem, and centers itself.",
    html: `<article class="clamped_card" aria-labelledby="clamped-title">
    <h2 id="clamped-title">Invite teammate</h2>
    <p>The card grows with the viewport but stops at its intended width.</p>
</article>`,
    measure: (c) => {
      const card = c.r(".clamped_card");
      const expected = Math.min(448, Math.max(256, c.W / 2));
      c.expect(c.near(card.width, expected, 1), "clamped-width", `card is ${card.width.toFixed(1)}px, expected ${expected}px`);
      c.expect(c.near(card.left, c.W - card.right, 1), "clamped-centered", "card is not centered");
    },
    negative: { selector: ".clamped_card", property: "inline-size", behavior: "clamped-width" },
  },
  {
    slug: "fluid-styles",
    claim: "`fluid-styles` fills its parent up to 72rem and centers itself beyond that.",
    html: `<section class="fluid_styles" aria-labelledby="fluid-title">
    <h2 id="fluid-title">Operations overview</h2>
    ${paragraphs("Operations", 2)}
</section>`,
    measure: (c) => {
      const region = c.r(".fluid_styles");
      c.expect(c.near(region.width, Math.min(c.W, 1152), 1), "fluid-width", `region is ${region.width.toFixed(1)}px`);
      c.expect(c.near(region.left, c.W - region.right, 1), "fluid-centered", "region is not centered");
    },
    negative: { selector: ".fluid_styles", property: "inline-size", behavior: "fluid-width" },
  },
  {
    slug: "split-screen",
    claim: "`split-screen` shows two equal panes side by side when two 20rem panes fit, stacks them otherwise, and is at least viewport tall.",
    html: `<section class="split_screen" aria-label="Compare documents">
    <section class="split_screen_pane" aria-label="Draft contract">${paragraphs("Draft clause", 2)}</section>
    <section class="split_screen_pane" aria-label="Reviewed contract">${paragraphs("Reviewed clause", 2)}</section>
</section>`,
    measure: (c) => {
      c.twoPane(c, ".split_screen", ".split_screen_pane:nth-child(1)", ".split_screen_pane:nth-child(2)", 320, 16);
      c.expect(c.r(".split_screen").height >= c.H - 1, "split-screen-fill", "split screen is shorter than the viewport");
    },
    negative: { selector: ".split_screen", property: "display", behavior: "pane-reflow" },
  },
  {
    slug: "list-detail",
    claim: "`list-detail` places list and detail side by side when two 18rem panes fit and stacks them otherwise.",
    html: `<section class="list_detail" aria-label="Customer records">
    <nav class="list_detail_list" aria-label="Customers">${links(["Acme Co.", "Northwind", "Globex"])}</nav>
    <section class="list_detail_detail" aria-label="Selected customer">${paragraphs("Timeline", 2)}</section>
</section>`,
    harness: ".list_detail_list a { display: block; }",
    measure: (c) => c.twoPane(c, ".list_detail", ".list_detail_list", ".list_detail_detail", 288, 16),
    negative: { selector: ".list_detail", property: "grid-template-columns", behavior: "pane-reflow" },
  },
  {
    slug: "supporting-pane",
    claim: "`supporting-pane` keeps the summary beside the main task when two 20rem panes fit and stacks it below otherwise.",
    html: `<section class="supporting_pane" aria-label="Invoice editor">
    <main class="supporting_pane_main">${paragraphs("Line item", 2)}</main>
    <aside class="supporting_pane_summary">Payment summary</aside>
</section>`,
    measure: (c) => c.twoPane(c, ".supporting_pane", ".supporting_pane_main", ".supporting_pane_summary", 320, 16),
    negative: { selector: ".supporting_pane", property: "grid-template-columns", behavior: "pane-reflow" },
  },
  {
    slug: "feed",
    claim: "`feed` stacks repeated items with one 1rem block gap.",
    html: `<section class="feed" aria-label="Activity feed">
${items("article", "", ["Build completed", "Review requested", "Deployment approved", "Release tagged"])}
</section>`,
    measure: (c) => c.blockRhythm(c, ".feed", 16),
    negative: { selector: ".feed", property: "display", behavior: "block-rhythm" },
  },
  {
    slug: "breadcrumb",
    claim: "`breadcrumb` keeps a 0.5rem gap between trail items and wraps the trail instead of overflowing.",
    html: `<nav class="breadcrumb" aria-label="Breadcrumb">
${links(["Workspace", "Projects", "Design operations", "Quarterly reviews", "Layout audits"])}
    <span>Layout gallery</span>
</nav>`,
    measure: (c) => c.wrapRow(c, ".breadcrumb", ".breadcrumb > *", 8),
    negative: { selector: ".breadcrumb", property: "flex-wrap", behavior: "wrap-containment", allow: ["overflow"] },
  },
  {
    slug: "pagination",
    claim: "`pagination` centers its page controls in the row with a 0.5rem gap.",
    html: `<nav class="pagination" aria-label="Search results pages">
${links(["Previous", "Page 3", "Page 4", "Page 5", "Next"])}
</nav>`,
    measure: (c) => {
      const nav = c.r(".pagination");
      const rows = c.rowsOf(c.rs(".pagination > a"));
      for (const row of rows) c.expect(c.near(row[0].left - nav.left, nav.right - row.at(-1).right, 1.5), "pagination-centered", "a row of page controls is not centered");
      c.wrapRow(c, ".pagination", ".pagination > a", 8, false);
    },
    negative: { selector: ".pagination", property: "justify-content", behavior: "pagination-centered" },
  },
  {
    slug: "badge-list",
    claim: "`badge-list` starts each label at the item's inline start and ends each count at the item's inline end.",
    html: `<section class="badge_list" aria-label="Repository counts">
    <div class="badge_list_item"><span>Open issues</span><span>12</span></div>
    <div class="badge_list_item"><span>Pull requests</span><span>4</span></div>
    <div class="badge_list_item"><span>Reviews waiting</span><span>7</span></div>
</section>`,
    measure: (c) => {
      for (const item of c.q(".badge_list").children) {
        const box = item.getBoundingClientRect();
        const [label, count] = [...item.children].map((child) => child.getBoundingClientRect());
        c.expect(c.near(label.left, box.left, 1) && c.near(count.right, box.right, 1), "badge-ends", "label and count do not sit at opposite ends of the item");
      }
      c.blockRhythm(c, ".badge_list", 8);
    },
    negative: { selector: ".badge_list_item", property: "justify-content", behavior: "badge-ends" },
  },
  {
    slug: "step-nav",
    claim: "`step-nav` stacks steps with one 0.75rem block gap.",
    html: `<nav class="step_nav" aria-label="Checkout steps">
${links(["Shipping address", "Payment method", "Order review"])}
</nav>`,
    measure: (c) => c.blockRhythm(c, ".step_nav", 12),
    negative: { selector: ".step_nav", property: "gap", behavior: "block-rhythm" },
  },
  {
    slug: "tab-strip",
    claim: "`tab-strip` keeps peer tabs in a row with a 0.75rem gap and wraps them instead of overflowing.",
    html: `<nav class="tab_strip" aria-label="Report views">
${links(["Summary", "Cohorts", "Exports", "Retention", "Funnels", "Segments", "Revenue", "Settings"])}
</nav>`,
    measure: (c) => c.wrapRow(c, ".tab_strip", ".tab_strip > a", 12),
    negative: { selector: ".tab_strip", property: "flex-wrap", behavior: "wrap-containment", allow: ["overflow"] },
  },
  {
    slug: "reel",
    claim: "`reel` keeps items in one row of columns at least 14rem wide and scrolls that row itself, so the document root never overflows inline.",
    html: `<section class="reel" aria-label="Upcoming events" tabindex="0">
${items("article", "", ["Design critique", "Planning workshop", "Launch review", "Accessibility clinic", "Roadmap review", "Retrospective", "Content audit", "Usability study", "Release party", "Quarterly review"])}
</section>`,
    measure: (c) => {
      const reel = c.q(".reel");
      const cells = c.rs(".reel > article");
      c.expect(c.rowsOf(cells).length === 1, "reel-row", "items wrap onto more than one row");
      c.expect(cells.every((cell) => cell.width >= 224 - 1), "reel-row", "an item is narrower than 14rem");
      reel.scrollLeft = 100;
      const moved = reel.scrollLeft > 0;
      reel.scrollLeft = 0;
      c.expect(moved && reel.scrollWidth > reel.clientWidth + 1, "reel-scroll-owner", "the reel does not scroll its overflowing row");
      c.expect(c.root.scrollWidth <= c.root.clientWidth + 1, "reel-scroll-owner", `document root overflows inline by ${c.root.scrollWidth - c.root.clientWidth}px`);
    },
    negative: { selector: ".reel", property: "overflow-x", behavior: "reel-scroll-owner", allow: ["overflow"] },
  },
  {
    slug: "imposter",
    claim: "`imposter` covers exactly its anchor, not the page, and centers its content over the anchor without leaving document order.",
    html: `<p>Content before the editor.</p>
<section class="imposter_anchor" aria-label="Draft editor">
    ${paragraphs("Draft body", 4)}
    <section class="imposter" aria-label="Modal placement">
        <div class="exhibit_overlay">Unsaved changes confirmation</div>
    </section>
</section>
<p>Content after the editor.</p>`,
    harness: ".exhibit_overlay { background: #fff; padding: 1rem; }",
    measure: (c) => {
      const anchor = c.r(".imposter_anchor");
      const overlay = c.r(".imposter");
      const content = c.r(".exhibit_overlay");
      c.expect(c.near(overlay.top, anchor.top, 1) && c.near(overlay.left, anchor.left, 1) && c.near(overlay.width, anchor.width, 1) && c.near(overlay.height, anchor.height, 1), "imposter-cover", "overlay does not cover exactly its anchor");
      c.expect(c.near(content.left - anchor.left, anchor.right - content.right, 1.5) && c.near(content.top - anchor.top, anchor.bottom - content.bottom, 1.5), "imposter-center", "overlay content is not centered over the anchor");
    },
    negative: { selector: ".imposter_anchor", property: "position", behavior: "imposter-cover", allow: ["imposter-center"] },
  },
  {
    slug: "panel-layout",
    claim: "`panel-layout` places main and utility panels side by side when two 22rem panels fit and stacks them otherwise.",
    html: `<section class="panel_layout" aria-label="Console workspace">
    <main class="panel_layout_main">${paragraphs("Query", 2)}</main>
    <aside class="panel_layout_side">Execution history</aside>
</section>`,
    measure: (c) => c.twoPane(c, ".panel_layout", ".panel_layout_main", ".panel_layout_side", 352, 16),
    negative: { selector: ".panel_layout", property: "display", behavior: "pane-reflow" },
  },
  {
    slug: "overlay-stack",
    claim: "`overlay-stack` places every item in the same grid cell so they overlap from one origin.",
    html: `<section class="overlay_stack" aria-label="Map with controls">
    <figure class="overlay_stack_item"><img alt="Transit map" src="${squareImage}" width="240" height="240"></figure>
    <form class="overlay_stack_item" aria-label="Route search"><label>Route <input type="search"></label></form>
</section>`,
    measure: (c) => {
      const [first, second] = c.rs(".overlay_stack_item");
      c.expect(c.near(first.top, second.top, 1) && c.near(first.left, second.left, 1), "overlay-same-cell", "items do not share one grid cell");
    },
    negative: { selector: ".overlay_stack_item", property: "grid-area", behavior: "overlay-same-cell" },
  },
  {
    slug: "wrap-row",
    claim: "`wrap-row` keeps controls in rows with a 0.75rem gap and wraps them instead of overflowing.",
    html: `<form class="wrap_row" aria-label="Filter tickets">
    <label>Status <select><option>Open</option><option>Closed</option></select></label>
    <label>Owner <select><option>Anyone</option><option>Me</option></select></label>
    <label>Priority <select><option>Any</option><option>High</option></select></label>
    <label>Label <select><option>Any</option><option>Bug</option></select></label>
    <button type="button">Apply filters</button>
</form>`,
    measure: (c) => c.wrapRow(c, ".wrap_row", ".wrap_row > *", 12),
    negative: { selector: ".wrap_row", property: "flex-wrap", behavior: "wrap-containment", allow: ["overflow"] },
  },
  {
    slug: "dense-grid",
    claim: "`dense-grid` fills as many 8rem columns as fit, even when items run out.",
    html: `<section class="dense_grid" aria-label="Keyboard shortcuts">
${items("kbd", "", ["Cmd K", "Cmd Shift P", "Esc", "Cmd S", "Cmd Z", "Cmd F", "Cmd B", "Cmd J", "Tab", "Enter", "Cmd W", "Cmd T"])}
</section>`,
    measure: (c) => {
      const root = c.r(".dense_grid");
      const cells = c.rs(".dense_grid > kbd");
      const expected = Math.max(1, Math.floor((root.width + 8) / (128 + 8)));
      const firstRow = cells.filter((cell) => Math.abs(cell.top - cells[0].top) < 2).length;
      c.expect(firstRow === Math.min(expected, cells.length), "track-count", `${firstRow} items share the first row; ${expected} tracks fit`);
      c.expect(cells.every((cell) => cell.width >= 128 - 1), "track-count", "an item is narrower than 8rem");
    },
    negative: { selector: ".dense_grid", property: "display", behavior: "track-count" },
  },
  {
    slug: "masonry-approx",
    claim: "`masonry-approx` flows items into as many 14rem columns as fit and returns to one column when narrow.",
    html: `<section class="masonry_approx" aria-label="Research notes">
${items("article", "", Array.from({ length: 12 }, (_, index) => sentence("Research", index)))}
</section>`,
    measure: (c) => c.multiColumn(c, ".masonry_approx", ".masonry_approx > article", 224, 16),
    negative: { selector: ".masonry_approx", property: "column-width", behavior: "column-flow" },
  },
  {
    slug: "main-with-rail",
    claim: "`main-with-rail` keeps the rail beside main content when two 18rem panes fit and stacks it below otherwise.",
    html: `<section class="main_with_rail" aria-label="Documentation page">
    <main class="main_with_rail_main">${paragraphs("Reference", 2)}</main>
    <aside class="main_with_rail_side">On this page links</aside>
</section>`,
    measure: (c) => c.twoPane(c, ".main_with_rail", ".main_with_rail_main", ".main_with_rail_side", 288, 16),
    negative: { selector: ".main_with_rail", property: "grid-template-columns", behavior: "pane-reflow" },
  },
];

export const exhibitSlugs = Object.freeze(exhibits.map(({ slug }) => slug));

// Doc claims the Conservator does not measure, with the reason. Reported with every run.
export const notMeasured = Object.freeze([
  { pattern: "holy-grail", scope: "320px viewport", reason: "The doc marks the pattern breakpointed, but its CSS has no breakpoint: two minmax(12rem, auto) side columns plus gaps overflow a 320px viewport by 96px, so the exhibit is measured at 768 and 1440 only." },
  { pattern: "frame", scope: "object-fit: cover", reason: "Cropping is a paint result; element geometry cannot tell cover from fill once the media box equals the slot." },
  { pattern: "icon-frame", scope: "doc HTML sample", reason: "The doc sample puts aria-label on a span with no role, which axe-core reports as serious aria-prohibited-attr; the exhibit adds role=\"img\" and measures the layout only." },
  { pattern: "all patterns", scope: "Properties That Break The Layout If Removed", reason: "Each doc lists every core declaration as breaking; a negative control removes one declaration per pattern, so the remaining declarations are not individually proven." },
]);
