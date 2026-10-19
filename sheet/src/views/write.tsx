import { useComputed, useSignal } from "@preact/signals";
import { useContext, useEffect, useMemo } from "preact/hooks";
import { blankDocument, contentTypes, documentText, lintDraft, momentSuggestions, slug, suggestedId, targetSuggestions } from "../../../src/authoring.js";
import type { Loaded } from "../../../src/content-store.js";
import type { Document } from "../../../src/document.js";
import { OPS } from "../../../src/registry.js";
import { AppContext } from "../app-context.js";
import { Panel, CrestRule } from "../components/panel.js";
import { navigate, route } from "../router.js";

type FM = Record<string, unknown>;
type Row = Record<string, unknown>;
/** Keys the form renders itself; everything else in the header is "another property". */
const FORM_KEYS = new Set(["id", "type", "system", "name", "effects", "resources"]);
const EFFECT_META = new Set(["target", "when", "note", "source"]);

/** "1" → 1, "true" → true, anything else stays text (an expression, a word). */
const parseScalar = (s: string): unknown => (/^-?\d+$/.test(s) ? Number(s) : s === "true" ? true : s === "false" ? false : s);
const scalarText = (v: unknown): string => (v === undefined || v === null ? "" : typeof v === "object" ? "" : String(v));
const opOf = (e: Row): string => (OPS as readonly string[]).find((op) => op in e) ?? "add";

export function WriteView() {
  const { content } = useContext(AppContext);
  const loaded = content.value;
  const r = route.value;
  const path = r.view === "write" ? r.path : undefined;
  if (!loaded) return <p class="muted">Loading content…</p>;
  return <Editor key={path ?? "new"} loaded={loaded} path={path} />;
}

function Editor({ loaded, path }: { loaded: Loaded; path?: string }) {
  const { homebrew, reload } = useContext(AppContext);
  const types = useMemo(() => contentTypes(loaded.docs), [loaded]);
  const targets = useMemo(() => targetSuggestions(loaded.registry), [loaded]);
  const moments = useMemo(() => momentSuggestions(loaded.registry), [loaded]);
  const system = useMemo(() => [...loaded.docs.values()].find((d) => d.frontmatter.type === "package")?.frontmatter.id as string | undefined ?? "nimble", [loaded]);
  const existing = path ? loaded.files.find((f) => f.path === path) : undefined;

  const initial = useMemo(() => {
    if (!existing) { const t = types[0]; const b = blankDocument(t?.id ?? "feature", system, t?.properties ?? []); return { fm: b.frontmatter, body: b.body, text: documentText(b.frontmatter, b.body), sourceOnly: false }; }
    const lint = lintDraft(existing.text, existing.path, loaded);
    if (!lint.doc) return { fm: {} as FM, body: "", text: existing.text, sourceOnly: true };
    return { fm: lint.doc.frontmatter, body: lint.doc.body, text: existing.text, sourceOnly: false };
  }, [existing, loaded, system, types]);

  const fm = useSignal<FM>(initial.fm);
  const body = useSignal(initial.body);
  const text = useSignal(initial.text);
  const sourceOnly = useSignal(initial.sourceOnly);
  const idTouched = useSignal(Boolean(existing));
  const saving = useSignal(false);
  const lint = useComputed(() => lintDraft(text.value, path ?? `homebrew/${String(fm.value.type ?? "doc")}/${slug(String(fm.value.id ?? "").split(".").pop() ?? "") || "untitled"}.md`, loaded));
  const errors = useComputed(() => lint.value.diagnostics.filter((d) => d.severity !== "warning"));

  /** Form → text. */
  const commit = (next: FM, nextBody = body.value) => { fm.value = next; body.value = nextBody; text.value = documentText(next, nextBody); };
  const setKey = (k: string, v: unknown) => commit({ ...fm.value, [k]: v });
  const setName = (name: string) => {
    const next: FM = { ...fm.value, name };
    if (!idTouched.value) next.id = suggestedId(String(next.type ?? ""), name, system, loaded.docs);
    commit(next);
  };
  const setType = (type: string) => {
    const next: FM = { ...fm.value, type };
    for (const p of types.find((t) => t.id === type)?.properties ?? []) if (!(p in next)) next[p] = "";
    if (!idTouched.value) next.id = suggestedId(type, String(next.name ?? ""), system, loaded.docs);
    commit(next);
  };
  /** Text → form, when it parses. */
  const setSource = (src: string) => {
    text.value = src;
    const parsed = lint.value.doc;
    if (parsed) { fm.value = parsed.frontmatter; body.value = parsed.body; sourceOnly.value = false; }
  };
  useEffect(() => { if (sourceOnly.value && lint.value.doc) { fm.value = lint.value.doc.frontmatter; body.value = lint.value.doc.body; sourceOnly.value = false; } }, [lint.value]);

  const effects = useComputed(() => (Array.isArray(fm.value.effects) ? (fm.value.effects as Row[]) : []));
  const resources = useComputed(() => (Array.isArray(fm.value.resources) ? (fm.value.resources as Row[]) : []));
  const setEffect = (i: number, row: Row) => setKey("effects", effects.value.map((e, j) => (j === i ? row : e)));
  const setEffectOp = (i: number, op: string) => { const e = effects.value[i]; const value = e[opOf(e)]; const next: Row = {}; for (const [k, v] of Object.entries(e)) if (!(OPS as readonly string[]).includes(k)) next[k] = v; next[op] = value ?? ""; setEffect(i, orderEffect(next)); };
  const setResource = (i: number, row: Row) => setKey("resources", resources.value.map((e, j) => (j === i ? row : e)));

  const savePath = path ?? `homebrew/${String(fm.value.type ?? "doc")}/${slug(String(fm.value.id ?? "").split(".").pop() ?? "") || "untitled"}.md`;
  const canSave = errors.value.length === 0 && lint.value.doc !== undefined && String(lint.value.doc.frontmatter.id ?? "") !== "";
  const save = async () => {
    saving.value = true;
    try {
      await homebrew.put([{ path: savePath, text: text.value, origin: "homebrew" }]);
      await reload();
      navigate(`#/reader/${encodeURIComponent(String(lint.value.doc?.frontmatter.id))}`);
    } finally { saving.value = false; }
  };
  const suggested = types.find((t) => t.id === fm.value.type)?.properties ?? [];
  const others = Object.keys(fm.value).filter((k) => !FORM_KEYS.has(k) && !suggested.includes(k));
  const typeSelect = types.some((t) => t.id === fm.value.type) ? types : [...types, { id: String(fm.value.type ?? ""), properties: [] }];

  return (
    <div class="stack">
      <div class="row" style="justify-content:space-between">
        <div><h1 class="steel-h1">Write</h1><div class="muted small">{path ? <span class="steel-mono">{path}</span> : "A new document. It becomes a file in your homebrew folder; the sheet reads it everywhere."}</div></div>
        <div class="row">
          <a class="steel-btn" style="display:inline-flex;align-items:center;text-decoration:none" href={`data:text/markdown;charset=utf-8,${encodeURIComponent(text.value)}`} download={savePath.split("/").pop()}>Download .md</a>
          <button type="button" class="steel-btn steel-btn--primary" disabled={!canSave || saving.value} onClick={() => void save()}>Save</button>
        </div>
      </div>
      <div class="write">
        {!sourceOnly.value && (
          <div class="stack">
            <Panel title="Document">
              <div class="fields">
                <label class="field"><span class="steel-label">type</span>
                  <select class="steel-select" aria-label="type" value={String(fm.value.type ?? "")} onChange={(e) => setType((e.target as HTMLSelectElement).value)}>{typeSelect.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}</select></label>
                <label class="field"><span class="steel-label">name</span><input class="steel-input" aria-label="name" value={String(fm.value.name ?? "")} onInput={(e) => setName((e.target as HTMLInputElement).value)} /></label>
                <label class="field field--wide"><span class="steel-label">id</span><input class="steel-input steel-mono" aria-label="id" value={String(fm.value.id ?? "")} onInput={(e) => { idTouched.value = true; setKey("id", (e.target as HTMLInputElement).value); }} /></label>
                {[...suggested, ...others].map((k) => <PropertyField key={k} name={k} value={fm.value[k]} onChange={(v) => setKey(k, v)} />)}
              </div>
              <p class="small muted">Add any property in the source on the right; it is kept and shown, never rejected.</p>
            </Panel>
            <Panel title="Effects" right={<button type="button" class="steel-btn small" onClick={() => setKey("effects", [...effects.value, { target: "", add: "" }])}>add effect</button>}>
              {effects.value.length === 0 && <p class="small muted">How this document changes a character's numbers. Many documents have none.</p>}
              {effects.value.map((e, i) => (
                <fieldset key={i} class="effect" aria-label={`effect ${i + 1}`}>
                  <label class="field"><span class="steel-label">target</span><input class="steel-input steel-mono" aria-label="target" list="orf-targets" value={String(e.target ?? "")} onInput={(ev) => setEffect(i, { ...e, target: (ev.target as HTMLInputElement).value })} /></label>
                  <label class="field"><span class="steel-label">operation</span>
                    <select class="steel-select" aria-label="operation" value={opOf(e)} onChange={(ev) => setEffectOp(i, (ev.target as HTMLSelectElement).value)}>{OPS.map((op) => <option key={op} value={op}>{op}</option>)}</select></label>
                  <label class="field"><span class="steel-label">value</span><input class="steel-input steel-mono" aria-label="value" value={scalarText(e[opOf(e)])} onInput={(ev) => setEffect(i, { ...e, [opOf(e)]: parseScalar((ev.target as HTMLInputElement).value) })} /></label>
                  <label class="field"><span class="steel-label">when</span><input class="steel-input steel-mono" aria-label="when" placeholder="equipped, in_wilderness…" value={scalarText(e.when)} onInput={(ev) => setEffect(i, withOptional(e, "when", (ev.target as HTMLInputElement).value))} /></label>
                  <label class="field field--wide"><span class="steel-label">note</span><input class="steel-input" aria-label="note" placeholder="One sentence shown next to the number." value={scalarText(e.note)} onInput={(ev) => setEffect(i, withOptional(e, "note", (ev.target as HTMLInputElement).value))} /></label>
                  <button type="button" class="steel-btn small" aria-label={`remove effect ${i + 1}`} onClick={() => setKey("effects", effects.value.filter((_, j) => j !== i))}>remove</button>
                </fieldset>
              ))}
              <datalist id="orf-targets">{targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</datalist>
            </Panel>
            <Panel title="Resources" right={<button type="button" class="steel-btn small" onClick={() => setKey("resources", [...resources.value, { id: "", max: 1, refresh: [{ on: "safe-rest", to: "max" }] }])}>add resource</button>}>
              {resources.value.length === 0 && <p class="small muted">A pool with limited uses: how many, and the moment it refills.</p>}
              {resources.value.map((res, i) => (
                <fieldset key={i} class="effect" aria-label={`resource ${i + 1}`}>
                  <label class="field"><span class="steel-label">resource id</span><input class="steel-input steel-mono" aria-label="resource id" value={String(res.id ?? "")} onInput={(ev) => setResource(i, { ...res, id: (ev.target as HTMLInputElement).value })} /></label>
                  <label class="field"><span class="steel-label">max</span><input class="steel-input steel-mono" aria-label="max" value={scalarText(res.max)} onInput={(ev) => setResource(i, { ...res, max: parseScalar((ev.target as HTMLInputElement).value) })} /></label>
                  <label class="field"><span class="steel-label">refills on</span>
                    <select class="steel-select" aria-label="refills on" value={String((Array.isArray(res.refresh) ? (res.refresh[0] as Row | undefined)?.on : undefined) ?? "")} onChange={(ev) => { const on = (ev.target as HTMLSelectElement).value; setResource(i, { ...res, refresh: on ? [{ on, to: "max" }] : [] }); }}>
                      <option value="">never</option>{moments.map((m) => <option key={m} value={m}>{m}</option>)}</select></label>
                  <button type="button" class="steel-btn small" aria-label={`remove resource ${i + 1}`} onClick={() => setKey("resources", resources.value.filter((_, j) => j !== i))}>remove</button>
                </fieldset>
              ))}
            </Panel>
            <Panel title="Text">
              <textarea class="steel-input" aria-label="text" rows={6} style="width:100%;box-sizing:border-box;padding:.5rem" placeholder="Rules text. Markdown. {{ wounds.max | your Wounds }} shows a live value." value={body.value} onInput={(e) => commit(fm.value, (e.target as HTMLTextAreaElement).value)} />
            </Panel>
          </div>
        )}
        <div class="stack">
          <Panel title="Source" right={<span class="small muted">the file, as saved</span>}>
            <textarea class="steel-input steel-mono source" aria-label="source" rows={sourceOnly.value ? 24 : 18} spellcheck={false} value={text.value} onInput={(e) => setSource((e.target as HTMLTextAreaElement).value)} />
          </Panel>
          <section class={`steel-panel${errors.value.length ? " problems" : ""}`} aria-label="Problems"><span class="steel-label">problems</span>
            {lint.value.diagnostics.length === 0 ? <p class="small muted">None. This document would load clean.</p> : (
              <ul class="small">{lint.value.diagnostics.map((d, i) => <li key={i} class={d.severity === "warning" ? "muted" : ""}>{d.line ? <span class="steel-mono">line {d.line}: </span> : null}{d.message}</li>)}</ul>
            )}
          </section>
        </div>
      </div>
      <CrestRule />
      <p class="small muted">Saved documents live in this browser's homebrew folder (Content). Download the file to keep it, share it, or open it in any Markdown editor.</p>
    </div>
  );
}

/** Keep effect keys in house order: target, op, when, note, source. */
function orderEffect(e: Row): Row {
  const out: Row = {};
  if ("target" in e) out.target = e.target;
  for (const op of OPS) if (op in e) out[op] = e[op];
  for (const k of ["when", "note", "source"]) if (k in e) out[k] = e[k];
  for (const [k, v] of Object.entries(e)) if (!(k in out) && !EFFECT_META.has(k)) out[k] = v;
  return out;
}
function withOptional(e: Row, key: string, value: string): Row {
  const next = { ...e };
  if (value === "") delete next[key]; else next[key] = value;
  return orderEffect(next);
}

function PropertyField({ name, value, onChange }: { name: string; value: unknown; onChange: (v: unknown) => void }) {
  const label = name.replace(/_/g, " ");
  if (typeof value === "object" && value !== null) return <div class="field"><span class="steel-label">{label}</span><span class="small muted">edit in the source</span></div>;
  return <label class="field"><span class="steel-label">{label}</span><input class="steel-input" aria-label={name} value={scalarText(value)} onInput={(e) => onChange(parseScalar((e.target as HTMLInputElement).value))} /></label>;
}

export type { Document };
