import { signal } from "@preact/signals";

export type Route =
  | { view: "play"; id?: string } | { view: "create" } | { view: "level-up"; id?: string }
  | { view: "reader"; id?: string } | { view: "write"; path?: string } | { view: "content" } | { view: "about" } | { view: "share"; payload: string };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  switch (parts[0]) {
    case "create": return { view: "create" };
    case "level-up": return { view: "level-up", id: parts[1] && decodeURIComponent(parts[1]) };
    case "reader": return { view: "reader", id: parts[1] && decodeURIComponent(parts[1]) };
    case "write": return { view: "write", path: parts[1] && decodeURIComponent(parts[1]) };
    case "content": return { view: "content" };
    case "about": return { view: "about" };
    case "share": return { view: "share", payload: parts.slice(1).join("/") };
    default: return { view: "play", id: parts[1] && decodeURIComponent(parts[1]) };
  }
}
export const route = signal<Route>(parseHash(typeof location !== "undefined" ? location.hash : ""));
if (typeof window !== "undefined") window.addEventListener("hashchange", () => { route.value = parseHash(location.hash); });
export function navigate(hash: string): void { if (typeof location !== "undefined") location.hash = hash; route.value = parseHash(hash); }
