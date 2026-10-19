// jsdom lacks structuredClone in some versions; the engine uses it in applyLevelUp
if (typeof globalThis.structuredClone !== "function") globalThis.structuredClone = (v: unknown) => JSON.parse(JSON.stringify(v));
