import { expect, test } from "vitest";
import { findInline, renderDisplay, toPortable, toShort } from "./inline.js";

test("finds the short form with and without a display", () => {
  expect(findInline("You have {{ 1 + level | 1 + your level }} mana and {{ wil }} Will.")).toEqual([
    { expr: "1 + level", display: "1 + your level", start: 9, end: 41, form: "short" },
    { expr: "wil", start: 51, end: 60, form: "short" },
  ]);
});

test("finds the portable span form as the same construct", () => {
  const body = 'You have <span data-orf="1 + level">1 + your level</span> mana.';
  expect(findInline(body)).toEqual([{ expr: "1 + level", display: "1 + your level", start: 9, end: 57, form: "span" }]);
});

test("both spellings in one body come back in document order", () => {
  const body = '{{ a }} then <span data-orf="b">bee</span> then {{ c | sea }}';
  expect(findInline(body).map((m) => [m.expr, m.display, m.form])).toEqual([["a", undefined, "short"], ["b", "bee", "span"], ["c", "sea", "short"]]);
});

test("toPortable rewrites every short span; the expression stands in for a missing display", () => {
  expect(toPortable("A {{ 1 + level | 1 + your level }} B {{ wil }} C")).toBe('A <span data-orf="1 + level">1 + your level</span> B <span data-orf="wil">wil</span> C');
});

test("toShort is the inverse; a display equal to the expression is dropped", () => {
  const portable = 'A <span data-orf="1 + level">1 + your level</span> B <span data-orf="wil">wil</span> C';
  expect(toShort(portable)).toBe("A {{ 1 + level | 1 + your level }} B {{ wil }} C");
  expect(toShort(toPortable("x {{ a | b }} y"))).toBe("x {{ a | b }} y");
});

test("quotes inside an expression survive the attribute", () => {
  const short = '{{ table("nimble.tables.starting-gold", level, "gold") | your starting gold }}';
  const portable = toPortable(short);
  expect(portable).toBe('<span data-orf="table(&quot;nimble.tables.starting-gold&quot;, level, &quot;gold&quot;)">your starting gold</span>');
  expect(findInline(portable)[0].expr).toBe('table("nimble.tables.starting-gold", level, "gold")');
  expect(toShort(portable)).toBe(short);
});

test("renderDisplay shows the display text, or the expression, for both spellings", () => {
  expect(renderDisplay('{{ a | A }} <span data-orf="b">B</span> {{ c }}')).toBe("A B c");
});

test("unbalanced and nested short braces are errors, with the line", () => {
  expect(() => findInline("ok\n{{ open")).toThrow(/unbalanced "\{\{" at line 2/);
  expect(() => findInline("{{ a {{ b }} }}")).toThrow(/nested/);
});
