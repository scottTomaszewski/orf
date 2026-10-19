import { fireEvent, render, screen, waitFor, within } from "@testing-library/preact";
import { beforeEach, expect, test } from "vitest";
import { loadContent, memoryHomebrewStore, type ContentFile } from "../../../src/content-store.js";
import { App } from "../app.js";
import { realContent } from "../test-content.js";

beforeEach(() => { localStorage.clear(); });
const content = realContent();
const loaderFor = (homebrew: ReturnType<typeof memoryHomebrewStore>) => async () => loadContent({ built: "test", files: content.files.map((f) => ({ path: f.path, text: f.text })) }, await homebrew.list());
const RATFOLK: ContentFile = { path: "homebrew/ratfolk.md", origin: "homebrew", text: "---\nid: nimble.ancestries.ratfolk\ntype: ancestry\nsystem: nimble\nname: Ratfolk\neffects:\n  - {target: wounds.max, add: 1}\n---\nHard to kill.\n" };
const BROKEN: ContentFile = { path: "homebrew/broken.md", origin: "homebrew", text: "---\nid: x.broken\nname: \"a\" b\n---\n" };
const source = () => screen.getByLabelText("source") as HTMLTextAreaElement;
const problems = () => screen.getByRole("region", { name: /problems/i });

test("writing a new ancestry: suggested id, effect row, clean lint, save to homebrew, open in the Reader", async () => {
  const homebrew = memoryHomebrewStore();
  location.hash = "#/write";
  render(<App loader={loaderFor(homebrew)} homebrew={homebrew} storage={localStorage} />);
  await screen.findByRole("heading", { name: /write/i });
  fireEvent.change(screen.getByLabelText("type"), { target: { value: "ancestry" } });
  fireEvent.input(screen.getByLabelText("name"), { target: { value: "Ratfolk" } });
  expect((screen.getByLabelText("id") as HTMLInputElement).value).toBe("nimble.ancestries.ratfolk");
  expect(screen.getByLabelText("size")).toBeTruthy();                       // suggested property
  fireEvent.click(screen.getByRole("button", { name: /add effect/i }));
  const effect = screen.getByRole("group", { name: /effect 1/i });
  fireEvent.input(within(effect).getByLabelText("target"), { target: { value: "wounds.max" } });
  fireEvent.change(within(effect).getByLabelText("operation"), { target: { value: "add" } });
  fireEvent.input(within(effect).getByLabelText("value"), { target: { value: "1" } });
  fireEvent.input(within(effect).getByLabelText("note"), { target: { value: "Hard to kill." } });
  fireEvent.input(screen.getByLabelText("text"), { target: { value: "Hard to kill." } });
  expect(source().value).toContain("  - {target: wounds.max, add: 1, note: Hard to kill.}\n");
  await waitFor(() => expect(problems().textContent).toMatch(/none/i));
  const save = screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement;
  expect(save.disabled).toBe(false);
  fireEvent.click(save);
  await waitFor(async () => expect((await homebrew.list()).map((f) => f.path)).toEqual(["homebrew/ancestry/ratfolk.md"]));
  expect((await homebrew.list())[0].text).toContain("id: nimble.ancestries.ratfolk\n");
  await waitFor(() => expect(location.hash).toBe("#/reader/nimble.ancestries.ratfolk"));
});

test("an unknown target is reported and blocks Save; a duplicate id is named", async () => {
  const homebrew = memoryHomebrewStore();
  location.hash = "#/write";
  render(<App loader={loaderFor(homebrew)} homebrew={homebrew} storage={localStorage} />);
  await screen.findByRole("heading", { name: /write/i });
  fireEvent.change(screen.getByLabelText("type"), { target: { value: "ancestry" } });
  fireEvent.input(screen.getByLabelText("name"), { target: { value: "Ratfolk" } });
  fireEvent.click(screen.getByRole("button", { name: /add effect/i }));
  const effect = screen.getByRole("group", { name: /effect 1/i });
  fireEvent.input(within(effect).getByLabelText("target"), { target: { value: "wound.max" } });
  fireEvent.input(within(effect).getByLabelText("value"), { target: { value: "1" } });
  await waitFor(() => expect(problems().textContent).toMatch(/wound\.max/));
  expect((screen.getByRole("button", { name: /^save$/i }) as HTMLButtonElement).disabled).toBe(true);
  fireEvent.input(screen.getByLabelText("id"), { target: { value: "nimble.ancestries.dwarf" } });
  await waitFor(() => expect(problems().textContent).toMatch(/duplicate document id "nimble.ancestries.dwarf"/));
});

test("editing the source updates the form; the form keeps unknown properties", async () => {
  const homebrew = memoryHomebrewStore([RATFOLK]);
  location.hash = `#/write/${encodeURIComponent("homebrew/ratfolk.md")}`;
  render(<App loader={loaderFor(homebrew)} homebrew={homebrew} storage={localStorage} />);
  await screen.findByRole("heading", { name: /write/i });
  await waitFor(() => expect((screen.getByLabelText("name") as HTMLInputElement).value).toBe("Ratfolk"));
  const effect = screen.getByRole("group", { name: /effect 1/i });
  expect((within(effect).getByLabelText("value") as HTMLInputElement).value).toBe("1");
  fireEvent.input(source(), { target: { value: RATFOLK.text.replace("add: 1", "add: 2").replace("name: Ratfolk", "name: Ratfolk\nflavor: twitchy") } });
  await waitFor(() => expect((within(screen.getByRole("group", { name: /effect 1/i })).getByLabelText("value") as HTMLInputElement).value).toBe("2"));
  expect((screen.getByLabelText("flavor") as HTMLInputElement).value).toBe("twitchy");
  fireEvent.click(screen.getByRole("button", { name: /^save$/i }));
  await waitFor(async () => expect((await homebrew.list())[0].text).toContain("add: 2"));
  expect((await homebrew.list()).map((f) => f.path)).toEqual(["homebrew/ratfolk.md"]);   // same path on edit
});

test("a homebrew file that does not parse opens in source mode with the error", async () => {
  const homebrew = memoryHomebrewStore([BROKEN]);
  location.hash = `#/write/${encodeURIComponent("homebrew/broken.md")}`;
  render(<App loader={loaderFor(homebrew)} homebrew={homebrew} storage={localStorage} />);
  await screen.findByRole("heading", { name: /write/i });
  await waitFor(() => expect(problems().textContent).toMatch(/invalid YAML/));
  expect(source().value).toBe(BROKEN.text);
  expect(screen.queryByLabelText("name")).toBeNull();
});

test("the Content view links each homebrew file to the Write view", async () => {
  const homebrew = memoryHomebrewStore([RATFOLK]);
  location.hash = "#/content";
  render(<App loader={loaderFor(homebrew)} homebrew={homebrew} storage={localStorage} />);
  const link = await screen.findByRole("link", { name: /edit homebrew\/ratfolk\.md/i });
  expect(link.getAttribute("href")).toBe(`#/write/${encodeURIComponent("homebrew/ratfolk.md")}`);
  expect(screen.getByRole("link", { name: /new document/i }).getAttribute("href")).toBe("#/write");
});
