// The example owns its product state. No profile or Layout source is mutated.
const byId = (id) => document.getElementById(id);
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const animations = new Set();
function present(element) {
  if (motion.matches) return;
  const animation = element.animate([{ opacity: .4 }, { opacity: 1 }], { duration: 240 });
  animations.add(animation);
  // Cancellation is expected, including a preference change during playback.
  animation.finished.catch(() => {}).finally(() => animations.delete(animation));
}
function motionChanged() {
  byId("motion-preference").textContent = motion.matches ? "Motion: reduced. Status changes immediately." : "Motion: normal. Status changes immediately.";
  if (motion.matches) {
    for (const animation of animations) animation.cancel();
    finishReveal();
  }
}

// Draft, submitted snapshot, and persisted value have different owners.
let persisted = "Original";
let saveRequest = null;
let saveError = "";
function renderSave() {
  const dirty = byId("draft").value !== persisted;
  byId("save").disabled = Boolean(saveRequest) || !dirty;
  byId("save-success").disabled = !saveRequest;
  byId("save-failure").disabled = !saveRequest;
  byId("persisted").textContent = persisted;
  byId("save-error").textContent = saveError;
  byId("save-status").textContent = saveRequest
    ? `Saving “${saveRequest.value}”.${byId("draft").value !== saveRequest.value ? " Later edits are unsaved." : ""}`
    : dirty ? "Unsaved changes." : "All changes saved.";
}
byId("draft").addEventListener("input", () => {
  saveError = "";
  byId("draft").removeAttribute("aria-invalid");
  renderSave();
});
byId("save-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (saveRequest || byId("draft").value === persisted) return;
  if (!byId("draft").value.trim()) {
    saveError = "Enter a display name.";
    byId("draft").setAttribute("aria-invalid", "true");
    renderSave();
    byId("draft").focus();
    return;
  }
  saveError = "";
  saveRequest = { value: byId("draft").value };
  renderSave();
});
function resolveSave(ok) {
  if (!saveRequest) return;
  if (ok) persisted = saveRequest.value;
  saveError = ok ? "" : "Save failed. Your draft is retained; try again.";
  saveRequest = null;
  renderSave();
  present(byId("save-status"));
}
byId("save-success").addEventListener("click", () => resolveSave(true));
byId("save-failure").addEventListener("click", () => resolveSave(false));

let searchSequence = 0;
let selectedResult = null;
let results = [];
const narrow = matchMedia("(max-width: 40rem)");
function renderSelection({ focus = false } = {}) {
  const item = results.find(({ id }) => id === selectedResult);
  byId("detail").hidden = !item;
  byId("search-panes").dataset.view = item ? "detail" : "list";
  if (item) {
    byId("detail-heading").textContent = item.label;
    byId("detail-description").textContent = `Details for ${item.label}. Query and selection survive window resizing.`;
    if (focus) byId("detail-heading").focus();
  }
}
function selectResult(id) {
  selectedResult = id;
  history.pushState({ result: id }, "", `#result=${encodeURIComponent(id)}`);
  renderSelection({ focus: true });
}
function renderResults() {
  const hadResultFocus = byId("results").contains(document.activeElement) || byId("detail").contains(document.activeElement);
  byId("results").replaceChildren(...results.map((item) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.textContent = item.label;
    button.dataset.result = item.id;
    button.addEventListener("click", () => selectResult(item.id));
    li.append(button);
    return li;
  }));
  if (selectedResult && !results.some(({ id }) => id === selectedResult)) {
    selectedResult = null;
    history.replaceState(null, "", location.pathname);
    byId("search-status").textContent += " Previous selection is unavailable.";
  }
  renderSelection();
  if (hadResultFocus) (selectedResult ? byId("detail-heading") : byId("query")).focus();
}
function returnToResults() {
  const previous = selectedResult;
  selectedResult = null;
  renderSelection();
  const button = [...byId("results").querySelectorAll("button")].find((node) => node.dataset.result === previous);
  (button || byId("query")).focus();
}
byId("back-results").addEventListener("click", () => {
  // An in-session detail entry has a known parent. Direct entry stays local.
  if (history.state?.result) history.back();
  else returnToResults();
});
window.addEventListener("popstate", (event) => {
  if (event.state?.result && results.some(({ id }) => id === event.state.result)) {
    selectedResult = event.state.result;
    renderSelection({ focus: true });
  } else returnToResults();
});
narrow.addEventListener("change", () => {
  if (narrow.matches && selectedResult && byId("search-list").contains(document.activeElement)) byId("detail-heading").focus();
});
byId("search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const query = byId("query").value.trim();
  if (!query) return;
  const request = ++searchSequence;
  byId("search-status").textContent = `Searching “${query}”.`;
  const controls = document.createElement("div");
  controls.className = "actions";
  for (const outcome of ["results", "empty", "failure"]) {
    const button = document.createElement("button");
    button.textContent = `Resolve ${request} (${query}): ${outcome}`;
    button.addEventListener("click", () => {
      controls.remove();
      if (request === searchSequence) {
        if (outcome === "failure") {
          byId("search-status").textContent = `Search “${query}” failed. Previous results retained; retry the search.`;
        } else {
          results = outcome === "empty" ? [] : [1, 2].map((n) => ({ id: `${request}-${n}`, label: `${query} · ${n}` }));
          byId("search-status").textContent = results.length ? `Results for “${query}”.` : `No results for “${query}”. Try another query.`;
          renderResults();
        }
      }
      // Removing a focused response control must leave a useful focus target.
      byId("query").focus();
    });
    controls.append(button);
  }
  byId("search-responses").append(controls);
});

// Session data outlives either modal view; responses target captured identities.
let selectedItem = "A";
let equippedItem = null;
let equipTarget = null;
let equipRequest = null;
let equipMessage = "Equipped: none.";
const inventory = byId("inventory-dialog");
const decision = byId("equip-dialog");
for (const dialog of [inventory, decision]) dialog.addEventListener("keydown", (event) => {
  if (event.key !== "Tab" || (dialog === inventory && decision.open)) return;
  const controls = [...dialog.querySelectorAll("button, input, [tabindex]")].filter((node) =>
    !node.disabled && node.tabIndex >= 0 && node.getClientRects().length
    && (node.type !== "radio" || node.checked));
  const destination = event.shiftKey ? controls.at(-1) : controls[0];
  const boundary = event.shiftKey ? controls[0] : controls.at(-1);
  if (destination && (document.activeElement === boundary || !dialog.contains(document.activeElement))) {
    event.preventDefault();
    destination.focus();
  }
});
function renderInventory() {
  byId("equipment-status").textContent = equipMessage;
  byId("equip-success").disabled = !equipRequest;
  byId("equip-failure").disabled = !equipRequest;
  if (!inventory.open) return;
  byId("inventory-status").textContent = `Selected: ${selectedItem}. Equipped: ${equippedItem || "none"}.${equipRequest ? ` Pending: ${equipRequest.item}.` : ""}`;
  byId("equip-item").disabled = Boolean(equipRequest);
}
byId("open-inventory").addEventListener("click", () => {
  inventory.showModal();
  renderInventory();
  inventory.querySelector("input:checked").focus();
});
for (const radio of inventory.querySelectorAll("input[name='item']")) radio.addEventListener("change", () => {
  selectedItem = radio.value;
  renderInventory();
});
byId("equip-item").addEventListener("click", () => {
  equipTarget = selectedItem;
  byId("equip-title").textContent = `Equip item ${equipTarget}?`;
  byId("equip-status").textContent = "This changes the equipped item.";
  byId("confirm-equip").disabled = false;
  decision.showModal();
  byId("cancel-equip").focus();
  present(decision);
});
function closeDecision() {
  decision.close();
  if (inventory.open) inventory.querySelector("input:checked").focus();
}
decision.addEventListener("cancel", (event) => { event.preventDefault(); closeDecision(); });
byId("cancel-equip").addEventListener("click", closeDecision);
function closeInventory() {
  if (decision.open) decision.close();
  inventory.close();
  byId("open-inventory").focus();
}
inventory.addEventListener("cancel", (event) => { event.preventDefault(); closeInventory(); });
byId("close-inventory").addEventListener("click", closeInventory);
byId("confirm-equip").addEventListener("click", () => {
  if (equipRequest) return;
  equipRequest = { item: equipTarget };
  equipMessage = `Equipment request pending: ${equipTarget}.`;
  byId("confirm-equip").disabled = true;
  byId("equip-status").textContent = "Pending. Closing this view does not cancel the operation.";
  renderInventory();
});
function resolveEquipment(ok) {
  if (!equipRequest) return;
  if (ok) equippedItem = equipRequest.item;
  equipMessage = ok ? `Equipped: ${equippedItem}.` : `Equipment request failed. Equipped: ${equippedItem || "none"}. Reopen inventory to retry.`;
  equipRequest = null;
  renderInventory();
}
byId("equip-success").addEventListener("click", () => resolveEquipment(true));
byId("equip-failure").addEventListener("click", () => resolveEquipment(false));

let rewardGranted = false;
let revealTimer = null;
function finishReveal() {
  if (revealTimer !== null) clearTimeout(revealTimer);
  revealTimer = null;
  if (rewardGranted) byId("reward-status").textContent = "Reward received.";
  // Keep focus useful when a focused skip command becomes unavailable.
  if (document.activeElement === byId("skip-reveal")) {
    byId("reward-status").tabIndex = -1;
    byId("reward-status").focus();
  }
  byId("skip-reveal").disabled = true;
}
byId("claim-reward").addEventListener("click", () => {
  if (rewardGranted) return;
  rewardGranted = true;
  byId("claim-reward").disabled = true;
  byId("reward-count").textContent = "Rewards granted: 1";
  byId("reward-status").textContent = "Reward received. Revealing…";
  byId("skip-reveal").disabled = false;
  if (motion.matches) finishReveal();
  else {
    present(byId("reward-count"));
    revealTimer = setTimeout(finishReveal, 1500);
  }
});
byId("skip-reveal").addEventListener("click", finishReveal);

const position = byId("position");
let committedPosition = position.value;
position.addEventListener("input", () => { byId("position-status").textContent = `Preview position: ${position.value}. Committed: ${committedPosition}.`; });
position.addEventListener("change", () => {
  committedPosition = position.value;
  byId("position-status").textContent = `Committed position: ${committedPosition}`;
});
position.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  event.preventDefault();
  position.value = committedPosition;
  byId("position-status").textContent = `Committed position: ${committedPosition}`;
  position.blur();
  position.focus();
});
motion.addEventListener("change", motionChanged);
motionChanged();
renderSave();
