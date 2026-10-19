import { render } from "preact";
import { App, fetchBundleLoader } from "./app.js";
import { indexedDbHomebrewStore } from "./homebrew-idb.js";

render(<App loader={fetchBundleLoader} homebrew={indexedDbHomebrewStore()} storage={localStorage} />, document.getElementById("app")!);
