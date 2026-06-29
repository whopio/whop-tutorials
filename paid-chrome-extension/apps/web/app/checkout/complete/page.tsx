import Link from "next/link";

export default async function CheckoutCompletePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "success";

  return (
    <main className="narrow-page">
      <p className="eyebrow">Checkout complete</p>
      <h1>{status === "error" ? "Checkout needs another try" : "Premium is ready"}</h1>
      <p className="lead">
        Return to the extension and sign in with Whop. If you were already
        signed in, use Refresh access once to pick up the new entitlement.
      </p>
      <Link className="button primary" href="/demo">
        View template status
      </Link>
    </main>
  );
}
