import type { ComponentChildren } from "preact";

export function Panel({ title, kind, right, children, class: cls }: { title?: ComponentChildren; kind?: "hp" | "mana" | "wound"; right?: ComponentChildren; children: ComponentChildren; class?: string }) {
  return (
    <section class={`steel-panel${kind ? ` steel-panel--${kind}` : ""}${cls ? ` ${cls}` : ""}`}>
      {title !== undefined && <div class="steel-panel__title"><span class="steel-label">{title}</span>{right}</div>}
      {children}
    </section>
  );
}

export const CrestRule = () => <hr class="steel" />;
