"use client";

import { useMemo, type ReactNode } from "react";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import { Elements } from "@whop/embedded-components-react-js";

// Elements accepts the promise directly, so loadWhopElements can be handed
// straight over. The environment option is the sandbox switch and it is easy to
// leave out, in which case the components quietly talk to production.
export function WhopElementsProvider({
  children,
  sandbox,
}: {
  children: ReactNode;
  sandbox: boolean;
}) {
  const elements = useMemo(
    () =>
      loadWhopElements({
        environment: sandbox ? "sandbox" : "production",
        appearance: { theme: { appearance: "light" } },
        locale: "en",
      }),
    [sandbox],
  );

  return <Elements elements={elements}>{children}</Elements>;
}
