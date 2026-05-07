import { redirect } from 'next/navigation';

/**
 * Checkout is handled in the slide-out on the gig page.
 * Direct visits redirect to search.
 */
export default function CheckoutPage() {
  redirect('/search');
}
