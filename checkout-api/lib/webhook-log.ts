const seen = new Set<string>();

export function recordDelivery(webhookId: string): { firstTime: boolean } {
  if (seen.has(webhookId)) return { firstTime: false };

  seen.add(webhookId);
  return { firstTime: true };
}
