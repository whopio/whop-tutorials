export type SellerLevel = 'new' | 'level1' | 'level2' | 'top_rated';

export function getSellerLevel(completedOrders: number): { level: SellerLevel; label: string } {
  if (completedOrders >= 20) return { level: 'top_rated', label: 'Top Rated' };
  if (completedOrders >= 5) return { level: 'level2', label: 'Level 2' };
  if (completedOrders >= 1) return { level: 'level1', label: 'Level 1' };
  return { level: 'new', label: 'New Seller' };
}
