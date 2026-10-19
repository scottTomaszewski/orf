import { createContext } from "preact";
import { signal, type Signal } from "@preact/signals";
import type { HomebrewStore, Loaded } from "../../src/content-store.js";

export interface AppServices {
  content: Signal<Loaded | undefined>;
  contentError: Signal<string | undefined>;
  homebrew: HomebrewStore;
  storage: Storage;
  reload: () => Promise<void>;
  rng: () => number;
}
export const AppContext = createContext<AppServices>({
  content: signal(undefined), contentError: signal(undefined),
  homebrew: { list: async () => [], put: async () => {}, remove: async () => {}, clear: async () => {} },
  storage: typeof localStorage !== "undefined" ? localStorage : ({} as Storage),
  reload: async () => {}, rng: Math.random,
});
