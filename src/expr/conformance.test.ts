import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { evaluateText } from "./evaluate.js";
import { parse } from "./parser.js";
import { bool, formatValue, int } from "./value.js";

interface Case { name: string; expr: string; env?: Record<string, number | boolean>; expect?: { kind: string; value?: unknown; format?: string }; error?: string; parseError?: boolean }
const cases: Case[] = JSON.parse(readFileSync(new URL("../../conformance/expressions.json", import.meta.url), "utf8"));

test("corpus has at least 40 cases", () => expect(cases.length).toBeGreaterThanOrEqual(40));
for (const c of cases) test(c.name, () => {
  const env = { lookup: (n: string) => { const v = c.env?.[n]; return typeof v === "number" ? int(v) : typeof v === "boolean" ? bool(v) : undefined; } };
  if (c.parseError) { expect(() => parse(c.expr)).toThrow(); return; }
  if (c.error) { expect(() => evaluateText(c.expr, env)).toThrow(new RegExp(c.error)); return; }
  const v = evaluateText(c.expr, env);
  expect(v.kind).toBe(c.expect!.kind);
  if (c.expect!.value !== undefined) expect((v as { value: unknown }).value).toBe(c.expect!.value);
  if (c.expect!.format !== undefined) expect(formatValue(v)).toBe(c.expect!.format);
});
