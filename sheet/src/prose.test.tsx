import { render } from "@testing-library/preact";
import { expect, test } from "vitest";
import { Prose, renderSymbolic } from "./prose.js";

test("the symbolic view shows display text for both spellings", () => {
  expect(renderSymbolic('A {{ a | one }} B <span data-orf="b">two</span> C {{ c }}')).toBe("A one B two C c");
  const { container } = render(<Prose text={'You have <span data-orf="1 + level">1 + your level</span> mana.'} />);
  expect(container.textContent).toBe("You have 1 + your level mana.");
  expect(container.querySelector("span[data-orf]")).toBeNull();
});
