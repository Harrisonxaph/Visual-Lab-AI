import { catalogFor, searchCategories } from "../data/coco-labels";
import type { DetectorConfiguration } from "../inference/types";
export function mountCategoryExplorer(
  container: HTMLElement,
  model: DetectorConfiguration,
  filter: (label: string) => void,
) {
  const label = document.createElement("label"),
    input = document.createElement("input"),
    list = document.createElement("div"),
    all = document.createElement("button");
  label.textContent = "Search supported categories";
  input.id = "category-search";
  input.type = "search";
  label.htmlFor = input.id;
  list.id = "category-list";
  all.textContent = "Show all observed tracks";
  all.addEventListener("click", () => filter(""));
  const update = () => {
    list.replaceChildren();
    if (!catalogFor(model)) {
      list.textContent = "Category catalog unavailable for this model.";
      return;
    }
    for (const name of searchCategories(model, input.value)) {
      const button = document.createElement("button");
      button.textContent = name;
      button.addEventListener("click", () => filter(name));
      list.append(button);
    }
  };
  input.addEventListener("input", update);
  container.append(label, input, all, list);
  update();
  return {
    destroy() {
      container.replaceChildren();
    },
  };
}
