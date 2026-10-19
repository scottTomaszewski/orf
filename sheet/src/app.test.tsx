import { render, screen, fireEvent } from "@testing-library/preact";
import { expect, test } from "vitest";
import { App } from "./app.js";
import { Stepper } from "./components/stepper.js";
import { ATTRIBUTION, FREE_NOTICE, PRODUCT_NAME } from "./notice.js";
import { memoryHomebrewStore } from "../../src/content-store.js";
import { realContent } from "./test-content.js";

test("the app renders the product name, the free-use notice verbatim, and six tabs", async () => {
  location.hash = "#/about";
  render(<App loader={async () => realContent()} homebrew={memoryHomebrewStore()} storage={localStorage} />);
  expect(await screen.findByText(FREE_NOTICE)).toBeTruthy();
  expect(screen.getByText(ATTRIBUTION)).toBeTruthy();
  expect(screen.getAllByText(PRODUCT_NAME).length).toBeGreaterThan(0);
  for (const t of ["Play", "Create", "Level Up", "Reader", "Content", "About"]) expect(screen.getByRole("tab", { name: t })).toBeTruthy();
  expect(screen.getByText(/2\.0\.3/)).toBeTruthy();
});

test("Stepper calls onChange within bounds and shows the value", () => {
  const seen: number[] = [];
  render(<Stepper label="HP" value={1} min={0} max={2} onChange={(v) => seen.push(v)} />);
  expect(screen.getByText("1")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /increase HP/ }));
  fireEvent.click(screen.getByRole("button", { name: /decrease HP/ }));
  expect(seen).toEqual([2, 0]);
  const { container } = render(<Stepper label="X" value={2} min={0} max={2} onChange={(v) => seen.push(v)} />);
  fireEvent.click(container.querySelector('button[aria-label="increase X"]')!);
  expect(seen).toEqual([2, 0]);   // clamped: no call past max
});
