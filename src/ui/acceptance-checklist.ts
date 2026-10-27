/**
 * In-app acceptance checklist: the few checks that genuinely need a real phone or tablet,
 * with Pass / Fail / Skip and one summary to copy. Results stay in this browser.
 */
export const CHECKLIST_ITEMS = [
  {
    id: "phase2-photo-library",
    text: "On iPhone or iPad: Add photos → Photo Library. Pick 3 photos, including at least one taken with the iPhone camera (HEIC). They appear with thumbnails and no error.",
  },
  {
    id: "phase2-take-photo",
    text: "On iPhone or iPad: Add photos → Take Photo. The new photo is added. (This uses the file picker, not the Detection lab camera.)",
  },
  {
    id: "phase2-reload",
    text: "Reload the page and return to Dataset lab. Your dataset, labels and photos are still there.",
  },
] as const;

type Result = "pass" | "fail" | "skip" | "";
const KEY = "visual-labs.acceptance.phase2.v1";

function load(): Record<string, Result> {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function checklistSummary(results: Record<string, Result>): string {
  return [
    `Visual Labs AI — Phase 2 acceptance (${new Date().toISOString().slice(0, 10)})`,
    `Browser: ${navigator.userAgent}`,
    ...CHECKLIST_ITEMS.map(
      (item, i) =>
        `${i + 1}. ${(results[item.id] || "not done").toUpperCase()} — ${item.text}`,
    ),
  ].join("\n");
}

export function mountAcceptanceChecklist(container: HTMLElement) {
  const results = load();
  const details = document.createElement("details");
  details.className = "panel ds-panel";
  const summary = document.createElement("summary");
  summary.textContent = "Acceptance checklist (only when asked)";
  const help = document.createElement("p");
  help.className = "ds-help";
  help.textContent =
    "These checks need a real device. Mark each one, then copy the summary into chat. Unmarked items are reported as not done.";
  const list = document.createElement("ol");
  const output = document.createElement("textarea");
  output.readOnly = true;
  output.rows = 5;
  output.setAttribute("aria-label", "Checklist summary");
  const save = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify(results));
    } catch {
      /* results still shown in the summary */
    }
    output.value = checklistSummary(results);
  };
  for (const item of CHECKLIST_ITEMS) {
    const li = document.createElement("li");
    const text = document.createElement("p");
    text.textContent = item.text;
    li.append(text);
    for (const choice of ["pass", "fail", "skip"] as const) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "button secondary";
      b.textContent = choice[0].toUpperCase() + choice.slice(1);
      b.setAttribute("aria-pressed", String(results[item.id] === choice));
      b.addEventListener("click", () => {
        results[item.id] = choice;
        for (const sibling of li.querySelectorAll("button"))
          sibling.setAttribute("aria-pressed", String(sibling === b));
        save();
      });
      li.append(b);
    }
    list.append(li);
  }
  const copy = document.createElement("button");
  copy.type = "button";
  copy.className = "button secondary";
  copy.textContent = "Copy summary";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(output.value);
      copy.textContent = "Copied";
    } catch {
      output.focus();
      output.select();
      copy.textContent = "Select and copy the text above";
    }
  });
  save();
  details.append(summary, help, list, output, copy);
  container.replaceChildren(details);
}
