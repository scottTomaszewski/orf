import { useSignal } from "@preact/signals";
import type { Sheet, SheetVariable } from "../../../src/engine.js";
import { formatValue } from "../../../src/expr/value.js";
import { extractReferences } from "../../../src/expr-refs.js";

/** A number you can tap to see where it came from. */
export function Value({ sheet, id, label, docs, layout }: { sheet: Sheet; id: string; label?: string; docs?: Map<string, { frontmatter: Record<string, unknown> }>; layout?: "inline" | "cell" }) {
  const open = useSignal(false);
  const v = sheet.variables.get(id) ?? ({ id, name: id, value: sheet.value(id), provenance: { contributions: [], shadowed: [], dropped: [], usedDefault: true } } as SheetVariable);
  const text = formatValue(v.value);
  const nameOf = (origin: string) => { const d = docs?.get(origin); return d ? String(d.frontmatter.name) : origin; };
  const cell = layout === "cell";
  return (
    <span class={cell ? "value cell" : "value"}>
      <button type="button" class="steel-value" aria-label={`${label ?? v.name} ${text}`} onClick={() => (open.value = !open.value)}>
        {cell ? <><b class="steel-mono">{text}</b><span class="cell__label">{label ?? v.name}</span></> : <>{label !== undefined ? `${label} ` : ""}<b class="steel-mono">{text}</b></>}
      </button>
      {open.value && (
        <div role="dialog" aria-label={`where ${v.name} comes from`} class="pop steel-panel">
          <div class="steel-panel__title"><span class="steel-label">{v.name}</span><button type="button" class="steel-btn small" onClick={() => (open.value = false)} aria-label="close">×</button></div>
          {v.description && <p class="small muted">{v.description}</p>}
          {v.provenance.usedDefault && v.provenance.contributions.length === 0 && <p class="small muted">default value; nothing contributes</p>}
          <ul class="small prov">
            {v.provenance.contributions.map((c, i) => c.origin === "<formula>" ? <Formula key={i} sheet={sheet} id={v.id} value={formatValue(c.value)} nameOf={nameOf} /> : <li key={i}><span class="steel-mono">{c.op} {formatValue(c.value)}</span> from {nameOf(c.origin)}{c.whenText ? <span class="muted"> when {c.whenText}</span> : null}{c.note ? <div class="muted">{c.note}</div> : null}</li>)}
            {v.provenance.shadowed.map((c, i) => <li key={`s${i}`} class="struck"><span class="steel-mono">{c.op} {formatValue(c.value)}</span> from {nameOf(c.origin)} (overridden by set)</li>)}
            {v.provenance.dropped.map((c, i) => <li key={`d${i}`} class="struck"><span class="steel-mono">{c.op} {formatValue(c.value)}</span> from {nameOf(c.origin)} (same source, lower)</li>)}
          </ul>
        </div>
      )}
    </span>
  );
}

/** A formula contribution, expanded one level: the formula text and each referenced variable with its own contributions. */
function Formula({ sheet, id, value, nameOf }: { sheet: Sheet; id: string; value: string; nameOf: (o: string) => string }) {
  const def = sheet.registry.variables.get(id);
  const formula = def && typeof def.formula === "string" ? def.formula : undefined;
  const refs = formula ? extractReferences(formula).identifiers.filter((r) => sheet.registry.variables.has(r) || sheet.registry.aliases.has(r)) : [];
  return (
    <li><span class="steel-mono">= {value}</span> <span class="muted">from {formula ? <code>{formula}</code> : "a lookup"}</span>
      {refs.length > 0 && (
        <ul class="prov">
          {refs.map((r) => { const canon = sheet.registry.variables.has(r) ? r : sheet.registry.aliases.get(r)!; const sv = sheet.variables.get(canon); const val = sheet.value(canon); return (
            <li key={r}><span class="steel-mono">{r} = {formatValue(val)}</span>
              {sv && sv.provenance.contributions.length > 0 && <span class="muted"> ← {sv.provenance.contributions.map((c) => `${c.op} ${formatValue(c.value)} from ${nameOf(c.origin)}${c.whenText ? ` when ${c.whenText}` : ""}`).join("; ")}</span>}
            </li>); })}
        </ul>
      )}
    </li>
  );
}
