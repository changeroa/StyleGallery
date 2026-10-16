// allow: SIZE_OK - explicit 46-pattern sample and rule data table; generation logic stays separate.
export const sources = {
  carbonGrid: "https://carbondesignsystem.com/elements/2x-grid/overview/",
  everyLayout: "https://every-layout.dev/layouts/",
  everySidebar: "https://every-layout.dev/layouts/sidebar/",
  everyStack: "https://every-layout.dev/layouts/stack/",
  govukLayout: "https://design-system.service.gov.uk/styles/layout/",
  materialCanonical: "https://m3.material.io/foundations/adaptive-design/canonical-layouts",
  mdnCookbook: "https://developer.mozilla.org/en-US/docs/Web/CSS/How_to/Layout_cookbook",
  mdnGrid: "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/CSS_layout/Grids",
  mdnOverflow: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow",
  mdnPosition: "https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position",
  webOneLine: "https://web.dev/articles/one-line-layouts",
};

export const samples = {
  "stack": `
<section class="stack" aria-labelledby="stack-heading">
    <h2 id="stack-heading">Release checklist</h2>
    <p>Review copy, verify forms, and publish the notes in order.</p>
    <button>Start review</button>
</section>`,
  "box": `
<aside class="box" aria-labelledby="box-heading">
    <h2 id="box-heading">Support window</h2>
    <p>Responses resume Monday at 09:00.</p>
</aside>`,
  "center": `
<article class="center" aria-labelledby="center-heading">
    <h2 id="center-heading">Editorial policy</h2>
    <p>Long-form guidance stays readable while the page around it remains fluid.</p>
</article>`,
  "cluster": `
<nav class="cluster" aria-label="Project actions">
    <a href="#">Backlog</a>
    <a href="#">Milestones</a>
    <a href="#">Roadmap</a>
</nav>`,
  "content-limiter": `
<article class="content_limiter" aria-labelledby="limiter-heading">
    <h2 id="limiter-heading">Incident summary</h2>
    <p>The report keeps a comfortable measure even inside a wide dashboard shell.</p>
</article>`,
  "super-center": `
<section class="super_center" aria-labelledby="centered-dialog-title">
    <form aria-labelledby="centered-dialog-title">
        <h2 id="centered-dialog-title">Confirm archive</h2>
        <button>Archive project</button>
    </form>
</section>`,
  "icon-frame": `
<span class="icon_frame" role="img" aria-label="Calendar">
    <svg aria-hidden="true" viewBox="0 0 24 24"></svg>
</span>`,
  "frame": `
<figure class="frame">
    <img alt="Product walkthrough still" class="frame_media">
</figure>`,
  "cover": `
<section class="cover" aria-labelledby="cover-title">
    <header><p>Step 2 of 4</p></header>
    <main><h1 id="cover-title">Choose a billing profile</h1></main>
    <footer><button>Continue</button></footer>
</section>`,
  "sidebar": `
<section class="sidebar" aria-labelledby="sidebar-title">
    <article class="sidebar_primary">
        <h2 id="sidebar-title">Quarterly planning notes</h2>
        <p>The main article keeps priority when the available inline space changes.</p>
    </article>
    <aside class="sidebar_secondary">Meeting agenda and owners</aside>
</section>`,
  "switcher": `
<section class="switcher" aria-label="Pricing tiers">
    <article class="switcher_item">Starter plan</article>
    <article class="switcher_item">Team plan</article>
    <article class="switcher_item">Enterprise plan</article>
</section>`,
  "media-object": `
<article class="media_object">
    <figure class="media_object_media"><img alt="Speaker portrait"></figure>
    <div class="media_object_content">
        <h2>Design systems briefing</h2>
        <p>Speaker details align beside the portrait without squeezing the text.</p>
    </div>
</article>`,
  "split-nav": `
<nav class="split_nav" aria-label="Documentation">
    <section class="split_nav_primary"><a href="#">Guides</a><a href="#">API</a></section>
    <section class="split_nav_secondary"><a href="#">Sign in</a></section>
</nav>`,
  "holy-grail": `
<section class="holy_grail" aria-label="News page">
    <header class="holy_grail_header">Daily briefing</header>
    <aside class="holy_grail_left">Topic navigation</aside>
    <main class="holy_grail_main">Lead story and article stream</main>
    <aside class="holy_grail_right">Market snapshot</aside>
    <footer class="holy_grail_footer">Edition links</footer>
</section>`,
  "sticky-footer": `
<section class="sticky_footer" aria-label="Account setup">
    <header>Account setup</header>
    <main class="sticky_footer_main">Profile fields and preferences</main>
    <footer><button>Save profile</button></footer>
</section>`,
  "sticky-header": `
<header class="sticky_header">
    <nav aria-label="Repository"><a href="#">Code</a><a href="#">Issues</a><a href="#">Pull requests</a></nav>
</header>`,
  "scroll-body-shell": `
<section class="scroll_body_shell" aria-label="Inbox">
    <header>Inbox filters</header>
    <main class="scroll_body_shell_body">Message list owns vertical scrolling</main>
    <footer>Selected message actions</footer>
</section>`,
  "fixed-sidenav-shell": `
<section class="fixed_sidenav_shell" aria-label="Settings">
    <nav class="fixed_sidenav_shell_list"><a href="#">Profile</a><a href="#">Billing</a></nav>
    <main class="fixed_sidenav_shell_main">Editable settings form scrolls independently</main>
</section>`,
  "sticky-aside": `
<section class="sticky_aside" aria-label="Long article">
    <main class="sticky_aside_main">Article sections continue down the page.</main>
    <aside class="sticky_aside_side">Table of contents</aside>
</section>`,
  "ram-grid": `
<section class="ram_grid" aria-label="Photo albums">
    <article>Spring launch album</article>
    <article>Customer meetup album</article>
    <article>Workshop album</article>
</section>`,
  "card-grid": `
<section class="card_grid" aria-label="Project cards">
    <article>Design audit</article>
    <article>Analytics migration</article>
    <article>Onboarding rewrite</article>
</section>`,
  "twelve-span-grid": `
<section class="twelve_span_grid" aria-label="Dashboard modules">
    <article class="twelve_span_grid_item">Revenue module</article>
    <article class="twelve_span_grid_item">Retention module</article>
    <article class="twelve_span_grid_item">Pipeline module</article>
</section>`,
  "page-grid": `
<section class="page_grid" aria-label="Article page">
    <main class="page_grid_content">Centered article track with fluid outer gutters</main>
</section>`,
  "grid-wrapper": `
<section class="grid_wrapper" aria-label="Marketing page">
    <main class="grid_wrapper_main">Centered campaign copy</main>
</section>`,
  "columns": `
<article class="columns" aria-labelledby="columns-heading">
    <h2 id="columns-heading">Release notes</h2>
    <p>Several short updates can flow into balanced columns when there is room.</p>
    <p>When the container narrows, the same content returns to a single column.</p>
</article>`,
  "deconstructed-pancake": `
<section class="deconstructed_pancake" aria-label="Plan comparison">
    <article class="deconstructed_pancake_item">Solo plan</article>
    <article class="deconstructed_pancake_item">Studio plan</article>
    <article class="deconstructed_pancake_item">Agency plan</article>
</section>`,
  "line-up": `
<article class="line_up" aria-labelledby="line-up-title">
    <section class="line_up_body"><h2 id="line-up-title">Implementation proposal</h2><p>Variable-length summary copy sits above the aligned action row.</p></section>
    <footer class="line_up_footer"><button>Review proposal</button></footer>
</article>`,
  "clamped-card": `
<article class="clamped_card" aria-labelledby="clamped-title">
    <h2 id="clamped-title">Invite teammate</h2>
    <p>The card grows with the viewport but stops at the intended reading width.</p>
</article>`,
  "fluid-styles": `
<section class="fluid_styles" aria-labelledby="fluid-title">
    <h2 id="fluid-title">Operations overview</h2>
    <p>The region fills the parent without exceeding the shared page measure.</p>
</section>`,
  "split-screen": `
<section class="split_screen" aria-label="Compare documents">
    <section class="split_screen_pane">Draft contract</section>
    <section class="split_screen_pane">Reviewed contract</section>
</section>`,
  "list-detail": `
<section class="list_detail" aria-label="Customer records">
    <nav class="list_detail_list"><a href="#">Acme Co.</a><a href="#">Northwind</a></nav>
    <section class="list_detail_detail">Selected customer timeline</section>
</section>`,
  "supporting-pane": `
<section class="supporting_pane" aria-label="Invoice editor">
    <main class="supporting_pane_main">Invoice line-item editor</main>
    <aside class="supporting_pane_summary">Payment summary</aside>
</section>`,
  "feed": `
<section class="feed" aria-label="Activity feed">
    <article>Build completed</article>
    <article>Review requested</article>
    <article>Deployment approved</article>
</section>`,
  "breadcrumb": `
<nav class="breadcrumb" aria-label="Breadcrumb">
    <a href="#">Workspace</a>
    <a href="#">Projects</a>
    <span>Layout gallery</span>
</nav>`,
  "pagination": `
<nav class="pagination" aria-label="Search results pages">
    <a href="#">Previous</a>
    <a href="#">Page 4</a>
    <a href="#">Next</a>
</nav>`,
  "badge-list": `
<section class="badge_list" aria-label="Repository counts">
    <div class="badge_list_item"><span>Open issues</span><span>12</span></div>
    <div class="badge_list_item"><span>Pull requests</span><span>4</span></div>
    <div class="badge_list_item"><span>Reviews waiting</span><span>7</span></div>
</section>`,
  "step-nav": `
<nav class="step_nav" aria-label="Checkout steps">
    <a href="#">Shipping address</a>
    <a href="#">Payment method</a>
    <a href="#">Order review</a>
</nav>`,
  "tab-strip": `
<nav class="tab_strip" aria-label="Report views">
    <a href="#">Summary</a>
    <a href="#">Cohorts</a>
    <a href="#">Exports</a>
</nav>`,
  "reel": `
<section class="reel" aria-label="Upcoming events">
    <article>Design critique</article>
    <article>Planning workshop</article>
    <article>Launch review</article>
</section>`,
  "imposter": `
<section class="imposter_anchor" aria-label="Draft editor">
    <p>Draft body text stays in normal document flow.</p>
    <section class="imposter" aria-label="Modal placement">
        <dialog open>Unsaved changes confirmation</dialog>
    </section>
</section>`,
  "panel-layout": `
<section class="panel_layout" aria-label="Console workspace">
    <main class="panel_layout_main">Query editor</main>
    <aside class="panel_layout_side">Execution history</aside>
</section>`,
  "overlay-stack": `
<section class="overlay_stack" aria-label="Map with controls">
    <figure class="overlay_stack_item">Transit map</figure>
    <form class="overlay_stack_item">Route search controls</form>
</section>`,
  "wrap-row": `
<form class="wrap_row" aria-label="Filter tickets">
    <label>Status <select></select></label>
    <label>Owner <select></select></label>
    <button>Apply filters</button>
</form>`,
  "dense-grid": `
<section class="dense_grid" aria-label="Keyboard shortcuts">
    <kbd>Cmd K</kbd>
    <kbd>Cmd Shift P</kbd>
    <kbd>Esc</kbd>
</section>`,
  "masonry-approx": `
<section class="masonry_approx" aria-label="Research notes">
    <article>Interview excerpt with a longer observation.</article>
    <article>Short survey result.</article>
    <article>Workshop synthesis note.</article>
</section>`,
  "main-with-rail": `
<section class="main_with_rail" aria-label="Documentation page">
    <main class="main_with_rail_main">API reference article</main>
    <aside class="main_with_rail_side">On this page links</aside>
</section>`,
};

export const patterns = [
  ["stack", "Stacking", "Create consistent vertical rhythm between direct children.", "block", "fluid", sources.everyStack, [[".stack", { display: "grid", gap: "1rem" }]]],
  ["box", "Containment", "Wrap content with predictable internal spacing.", "block", "fixed", sources.everyLayout, [[".box", { "box-sizing": "border-box", display: "block", padding: "1rem" }]]],
  ["center", "Centering", "Center a block while respecting a maximum measure.", "inline", "fluid", sources.everyLayout, [[".center", { "margin-inline": "auto", "max-inline-size": "64rem", "padding-inline": "1rem" }]]],
  ["cluster", "In-line grouping", "Keep related items together while allowing wrapping.", "inline", "wrap", sources.everyLayout, [[".cluster", { display: "flex", "flex-wrap": "wrap", gap: "0.75rem", "justify-content": "flex-start" }]]],
  ["content-limiter", "Containment", "Keep prose width readable inside fluid containers.", "inline", "fluid", sources.govukLayout, [[".content_limiter", { "margin-inline": "auto", "max-inline-size": "70ch", "padding-inline": "1rem" }]]],
  ["super-center", "Centering", "Center one region along both axes.", "both", "fluid", sources.webOneLine, [[".super_center", { display: "grid", "min-block-size": "100dvh", "place-items": "center" }]]],
  ["icon-frame", "Media / Fit", "Keep an icon aligned inside a fixed square slot.", "both", "fixed", sources.everyLayout, [[".icon_frame", { "block-size": "2.5rem", display: "grid", "inline-size": "2.5rem", "place-items": "center" }]]],
  ["frame", "Media / Fit", "Preserve media aspect ratio in a responsive slot.", "both", "fluid", sources.everyLayout, [[".frame", { "aspect-ratio": "16 / 9", display: "grid", "inline-size": "100%", overflow: "clip" }], [".frame_media", { "block-size": "100%", "inline-size": "100%", "min-block-size": "0", "min-inline-size": "0", "object-fit": "cover" }]]],
  ["cover", "Viewport / Shell", "Keep a central region balanced between optional header and footer.", "block", "fluid", sources.everyLayout, [[".cover", { display: "grid", gap: "1rem", "grid-template-rows": "auto 1fr auto", "min-block-size": "100dvh", padding: "1rem" }]]],
  ["sidebar", "Split / Sidebar", "Let a narrow sidebar and wider content wrap when space is tight.", "inline", "wrap", sources.everySidebar, [[".sidebar", { display: "flex", "flex-wrap": "wrap", gap: "1rem" }], [".sidebar_primary", { "flex-basis": "0", "flex-grow": "999", "min-inline-size": "16rem" }], [".sidebar_secondary", { "flex-basis": "18rem", "flex-grow": "1" }]]],
  ["switcher", "Split / Sidebar", "Switch equal regions from row to stack without a viewport breakpoint.", "inline", "wrap", sources.everyLayout, [[".switcher", { display: "flex", "flex-wrap": "wrap", gap: "1rem" }], [".switcher_item", { "flex-basis": "calc((40rem - 100%) * 999)", "flex-grow": "1" }]]],
  ["media-object", "Split / Sidebar", "Align media and descriptive content as a stable pair.", "inline", "reflow", sources.mdnCookbook, [[".media_object", { "align-items": "start", display: "flex", "flex-wrap": "wrap", gap: "1rem" }], [".media_object_media", { "flex-basis": "6rem", "flex-grow": "0" }], [".media_object_content", { "flex-basis": "min(20rem, 100%)", "flex-grow": "1", "min-inline-size": "0" }]]],
  ["split-nav", "In-line grouping", "Separate primary and secondary nav actions in one row.", "inline", "wrap", sources.mdnCookbook, [[".split_nav", { "align-items": "center", display: "flex", "flex-wrap": "wrap", gap: "0.75rem" }], [".split_nav_primary", { display: "flex", gap: "0.75rem" }], [".split_nav_secondary", { "margin-inline-start": "auto" }]]],
  ["holy-grail", "Viewport / Shell", "Place header, footer, sidebars, and main content in a resilient shell.", "both", "breakpointed", sources.webOneLine, [[".holy_grail", { display: "grid", gap: "1rem", "grid-template": '"header header header" auto "left main right" 1fr "footer footer footer" auto / minmax(12rem, auto) 1fr minmax(12rem, auto)', "min-block-size": "100dvh" }], [".holy_grail_header", { "grid-area": "header" }], [".holy_grail_left", { "grid-area": "left" }], [".holy_grail_main", { "grid-area": "main", "min-inline-size": "0" }], [".holy_grail_right", { "grid-area": "right" }], [".holy_grail_footer", { "grid-area": "footer" }], ["@media (max-width: 47.99rem)", [[".holy_grail", { "grid-template": '"header" auto "left" auto "main" 1fr "right" auto "footer" auto / 1fr' }]], "Below 48rem the two 12rem side columns no longer fit beside main content, so all five regions stack in one column in DOM order: header, left, main, right, footer. At 48rem and wider the three-column shell applies."]]],
  ["sticky-footer", "Viewport / Shell", "Keep footer at the bottom when content is short.", "block", "fluid", sources.mdnCookbook, [[".sticky_footer", { display: "grid", "grid-template-rows": "auto 1fr auto", "min-block-size": "100dvh" }], [".sticky_footer_main", { "min-block-size": "0" }]]],
  ["sticky-header", "Viewport / Shell", "Keep a header visible above a scrolling content region.", "block", "fluid", sources.mdnPosition, [[".sticky_header", { "inset-block-start": "0", position: "sticky", "z-index": "1" }]]],
  ["scroll-body-shell", "Viewport / Shell", "Keep shell regions fixed while only the body scrolls.", "block", "fluid", sources.mdnOverflow, [[".scroll_body_shell", { display: "grid", "grid-template-rows": "auto minmax(0, 1fr) auto", "max-block-size": "100dvh" }], [".scroll_body_shell_body", { "min-block-size": "0", overflow: "auto" }]], "Pattern owns the named scroll container."],
  ["fixed-sidenav-shell", "Viewport / Shell", "Keep side navigation stable while main content scrolls.", "both", "fluid", sources.carbonGrid, [[".fixed_sidenav_shell", { display: "grid", "grid-template-columns": "16rem minmax(0, 1fr)", "grid-template-rows": "minmax(0, 1fr)", "max-block-size": "100dvh" }], [".fixed_sidenav_shell_list", { "min-block-size": "0" }], [".fixed_sidenav_shell_main", { "min-block-size": "0", overflow: "auto" }]], "Pattern owns the named scroll container."],
  ["sticky-aside", "Split / Sidebar", "Keep related aside content visible during long reads.", "block", "fluid", sources.mdnPosition, [[".sticky_aside", { "align-items": "start", display: "grid", gap: "1rem", "grid-template-columns": "minmax(0, 1fr) 16rem" }], [".sticky_aside_main", { "min-inline-size": "0" }], [".sticky_aside_side", { "inset-block-start": "1rem", position: "sticky" }]]],
  ["ram-grid", "Grid / Repetition", "Repeat items into as many useful columns as space allows.", "both", "fluid", sources.webOneLine, [[".ram_grid", { display: "grid", gap: "1rem", "grid-template-columns": "repeat(auto-fit, minmax(min(16rem, 100%), 1fr))" }]]],
  ["card-grid", "Grid / Repetition", "Align repeating cards in rows and columns.", "both", "fluid", sources.mdnCookbook, [[".card_grid", { display: "grid", gap: "1rem", "grid-template-columns": "repeat(auto-fit, minmax(min(18rem, 100%), 1fr))" }]]],
  ["twelve-span-grid", "Grid / Repetition", "Provide a twelve-column placement scaffold.", "both", "fluid", sources.webOneLine, [[".twelve_span_grid", { display: "grid", gap: "1rem", "grid-template-columns": "repeat(12, minmax(0, 1fr))" }], [".twelve_span_grid_item", { "grid-column": "span 4" }]]],
  ["page-grid", "Grid / Repetition", "Align page content to margins, gutters, and a central track.", "inline", "fluid", sources.carbonGrid, [[".page_grid", { display: "grid", gap: "1rem", "grid-template-columns": "minmax(1rem, 1fr) minmax(0, 72rem) minmax(1rem, 1fr)" }], [".page_grid_content", { "grid-column": "2" }]]],
  ["grid-wrapper", "Grid / Repetition", "Center grid tracks while allowing full-width breakout tracks.", "inline", "fluid", sources.mdnCookbook, [[".grid_wrapper", { display: "grid", "grid-template-columns": "1fr minmax(0, 64rem) 1fr" }], [".grid_wrapper_main", { "grid-column": "2" }]]],
  ["columns", "Grid / Repetition", "Flow long content into balanced text columns.", "inline", "fluid", sources.mdnCookbook, [[".columns", { "column-gap": "2rem", columns: "18rem" }]]],
  ["deconstructed-pancake", "In-line grouping", "Let equal cards stretch in a row and stack naturally when narrow.", "inline", "wrap", sources.webOneLine, [[".deconstructed_pancake", { display: "flex", "flex-wrap": "wrap", gap: "1rem" }], [".deconstructed_pancake_item", { flex: "1 1 16rem" }]]],
  ["line-up", "Stacking", "Keep card footer actions aligned at the bottom.", "block", "fluid", sources.webOneLine, [[".line_up", { display: "flex", "flex-direction": "column", gap: "1rem" }], [".line_up_body", { "min-block-size": "0" }], [".line_up_footer", { "margin-block-start": "auto" }]]],
  ["clamped-card", "Containment", "Constrain a card to a readable fluid width.", "inline", "fluid", sources.webOneLine, [[".clamped_card", { "inline-size": "clamp(16rem, 50vw, 28rem)", "margin-inline": "auto" }]]],
  ["fluid-styles", "Containment", "Let a region fill available width without exceeding a readable max.", "inline", "fluid", sources.carbonGrid, [[".fluid_styles", { "inline-size": "min(100%, 72rem)", "margin-inline": "auto" }]]],
  ["split-screen", "Split / Sidebar", "Split a viewport or region into two balanced panes.", "inline", "reflow", sources.materialCanonical, [[".split_screen", { display: "grid", gap: "1rem", "grid-template-columns": "repeat(auto-fit, minmax(min(20rem, 100%), 1fr))", "min-block-size": "100dvh" }], [".split_screen_pane", { "min-inline-size": "0" }]]],
  ["list-detail", "Split / Sidebar", "Place an explorable list beside its detail region.", "inline", "reflow", sources.materialCanonical, [[".list_detail", { display: "grid", gap: "1rem", "grid-template-columns": "repeat(auto-fit, minmax(min(18rem, 100%), 1fr))" }], [".list_detail_list", { "min-inline-size": "0" }], [".list_detail_detail", { "min-inline-size": "0" }]]],
  ["supporting-pane", "Split / Sidebar", "Keep supplemental information beside a primary task.", "inline", "reflow", sources.materialCanonical, [[".supporting_pane", { display: "grid", gap: "1rem", "grid-template-columns": "repeat(auto-fit, minmax(min(20rem, 100%), 1fr))" }], [".supporting_pane_main", { "min-inline-size": "0" }], [".supporting_pane_summary", { "min-inline-size": "0" }]]],
  ["feed", "Stacking", "Stack repeated content items with stable rhythm.", "block", "fluid", sources.materialCanonical, [[".feed", { display: "grid", gap: "1rem", "grid-auto-rows": "minmax(min-content, auto)" }]]],
  ["breadcrumb", "In-line grouping", "Lay out hierarchy links compactly with wrapping.", "inline", "wrap", sources.mdnCookbook, [[".breadcrumb", { "align-items": "center", display: "flex", "flex-wrap": "wrap", gap: "0.5rem" }]]],
  ["pagination", "In-line grouping", "Lay out page controls as a bounded wrapping row.", "inline", "wrap", sources.mdnCookbook, [[".pagination", { display: "flex", "flex-wrap": "wrap", gap: "0.5rem", "justify-content": "center" }]]],
  ["badge-list", "In-line grouping", "Align item labels with trailing counts.", "inline", "fluid", sources.mdnCookbook, [[".badge_list", { display: "grid", gap: "0.5rem" }], [".badge_list_item", { "align-items": "center", display: "flex", gap: "0.75rem", "justify-content": "space-between" }]]],
  ["step-nav", "Stacking", "Present sequential steps with consistent vertical rhythm.", "block", "fluid", sources.govukLayout, [[".step_nav", { display: "grid", gap: "0.75rem", "margin-block": "1rem" }]]],
  ["tab-strip", "In-line grouping", "Keep peer tabs in one stable row that can wrap.", "inline", "wrap", sources.govukLayout, [[".tab_strip", { display: "flex", "flex-wrap": "wrap", gap: "0.75rem" }]]],
  ["reel", "In-line grouping", "Let a row scroll horizontally instead of wrapping.", "inline", "scroll", sources.everyLayout, [[".reel", { display: "grid", gap: "1rem", "grid-auto-columns": "minmax(14rem, 35%)", "grid-auto-flow": "column", "overflow-x": "auto" }]], "Pattern owns the named scroll container."],
  ["imposter", "Overlay / Exception", "Place an overlay region over a parent without changing document order.", "both", "fixed", sources.everyLayout, [[".imposter_anchor", { position: "relative" }], [".imposter", { display: "grid", inset: "0", "place-items": "center", position: "absolute", "z-index": "1" }]]],
  ["panel-layout", "Viewport / Shell", "Create predictable main and utility panels.", "inline", "reflow", sources.carbonGrid, [[".panel_layout", { display: "grid", gap: "1rem", "grid-template-columns": "repeat(auto-fit, minmax(min(22rem, 100%), 1fr))" }], [".panel_layout_main", { "min-inline-size": "0" }], [".panel_layout_side", { "min-inline-size": "0" }]]],
  ["overlay-stack", "Overlay / Exception", "Stack several regions into the same grid cell.", "both", "fluid", sources.webOneLine, [[".overlay_stack", { display: "grid" }], [".overlay_stack_item", { "grid-area": "1 / 1" }]]],
  ["wrap-row", "In-line grouping", "Wrap controls into rows with stable gaps.", "inline", "wrap", sources.mdnCookbook, [[".wrap_row", { "align-items": "center", display: "flex", "flex-wrap": "wrap", gap: "0.75rem" }]]],
  ["dense-grid", "Grid / Repetition", "Fill a compact grid with repeated small items.", "both", "fluid", sources.mdnGrid, [[".dense_grid", { display: "grid", gap: "0.5rem", "grid-template-columns": "repeat(auto-fill, minmax(8rem, 1fr))" }]]],
  ["masonry-approx", "Grid / Repetition", "Approximate staggered content with columns when exact row alignment is not needed.", "block", "fluid", sources.mdnCookbook, [[".masonry_approx", { "column-gap": "1rem", "column-width": "14rem" }]]],
  ["main-with-rail", "Split / Sidebar", "Keep primary content dominant with a narrow secondary rail.", "inline", "reflow", sources.govukLayout, [[".main_with_rail", { display: "grid", gap: "1rem", "grid-template-columns": "repeat(auto-fit, minmax(min(18rem, 100%), 1fr))" }], [".main_with_rail_main", { "min-inline-size": "0" }], [".main_with_rail_side", { "min-inline-size": "0" }]]],
];
