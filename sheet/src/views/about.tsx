import { useContext } from "preact/hooks";
import { AppContext } from "../app-context.js";
import { Panel, CrestRule } from "../components/panel.js";
import { ATTRIBUTION, FREE_NOTICE, NIMBLE_URL, PRODUCT_NAME, REPO_URL } from "../notice.js";

export function AboutView() {
  const { content } = useContext(AppContext);
  const loaded = content.value;
  const pkg = loaded ? [...loaded.docs.values()].find((d) => d.frontmatter.type === "package") : undefined;
  return (
    <div class="stack about">
      <h1 class="steel-h1">{PRODUCT_NAME}</h1>
      <Panel title="Nimble license notice">
        <p>{FREE_NOTICE}</p>
        <p>{ATTRIBUTION}</p>
        <p class="small muted">Buy the books at <a href={NIMBLE_URL}>{NIMBLE_URL.replace("https://", "")}</a>. No Nimble art or logos are included.</p>
      </Panel>
      <CrestRule />
      <Panel title="Content">
        <p>Rules package: <b>{pkg ? String(pkg.frontmatter.label ?? pkg.frontmatter.name) : "loading…"}</b>{loaded?.built && <span class="muted small"> · bundle built {loaded.built.slice(0, 10)}</span>}</p>
        <p class="small muted">{loaded ? `${loaded.docs.size} documents, ${loaded.registry.variables.size} variables, ${loaded.registry.resources.size} resources` : ""}</p>
      </Panel>
      <Panel title="About">
        <p>A free, data-driven character sheet for Nimble. Every number on the sheet comes from content documents you can read, copy, and change; tap any number to see where it came from.</p>
        <p class="small muted">Source and format: <a href={REPO_URL}>{REPO_URL.replace("https://", "")}</a>. No accounts; everything stays in this browser. Export your characters from the Play view.</p>
      </Panel>
    </div>
  );
}
