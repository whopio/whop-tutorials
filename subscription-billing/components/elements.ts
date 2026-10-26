import type { Appearance } from "@whop/elements";

// Shared, module-level Elements settings. Elements re-initialise when their
// props change identity, so these never get rebuilt inside a render.
export const ELEMENTS_APPEARANCE: Appearance = {
  theme: { appearance: "light", accentColor: "orange", grayColor: "sand" },
};
