'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { loadWhopElements } from '@whop/embedded-components-vanilla-js';
import { Elements, PayoutsSession } from '@whop/embedded-components-react-js';

const HasPayoutsContext = createContext(false);

export function useHasPayoutsSession() {
  return useContext(HasPayoutsContext);
}

interface PayoutsConfig {
  companyId: string;
  redirectUrl: string;
}

export function SellPayoutsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PayoutsConfig | null>(null);
  const elementsPromise = useMemo(() => loadWhopElements(), []);

  useEffect(() => {
    fetch('/api/sell/payouts-token')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.companyId && data?.redirectUrl) {
          setConfig({ companyId: data.companyId, redirectUrl: data.redirectUrl });
        }
      })
      .catch(() => {});
  }, []);

  if (!config) {
    return <HasPayoutsContext.Provider value={false}>{children}</HasPayoutsContext.Provider>;
  }

  const tokenGetter = async () => {
    const res = await fetch('/api/sell/payouts-token');
    const data = await res.json();
    return data?.token ?? null;
  };

  return (
    <Elements elements={elementsPromise}>
        <PayoutsSession
          token={tokenGetter}
          companyId={config.companyId}
          redirectUrl={config.redirectUrl}
        >
          <HasPayoutsContext.Provider value={true}>{children}</HasPayoutsContext.Provider>
        </PayoutsSession>
    </Elements>
  );
}
