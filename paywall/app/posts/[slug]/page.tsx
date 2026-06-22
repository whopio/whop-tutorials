import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Heading, Separator, Text } from "@whop/react/components";
import { PaywallCard, type TierOption } from "@/components/PaywallCard";
import { getPost } from "@/constants/posts";
import { getEnv } from "@/lib/env";
import { hasAccess } from "@/lib/paywall";

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const env = getEnv();
  const unlocked =
    !post.premium ||
    (await hasAccess([env.WHOP_PRO_PRODUCT_ID, post.productId]));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 py-10 sm:px-6">
      <header className="flex items-center justify-between">
        <Link href="/">
          <Heading size="5" style={{ fontFamily: "var(--font-acid)" }}>
            Pulse
          </Heading>
        </Link>
        {post.premium && (
          <Badge color={unlocked ? "green" : "tomato"} variant="soft">
            {unlocked ? "Unlocked" : "Pro"}
          </Badge>
        )}
      </header>

      <div className="mt-8">
        <Heading size="7">{post.title}</Heading>
        <div className="mt-2">
          <Text size="2" color="gray">
            {post.minutes} min read
          </Text>
        </div>
      </div>

      <Separator size="4" className="my-6" />

      {unlocked ? (
        <article className="flex flex-col gap-4 pb-24">
          {post.body.map((paragraph, i) => (
            <Text key={i} size="3" as="p">
              {paragraph}
            </Text>
          ))}
        </article>
      ) : (
        <div className="flex flex-col gap-6 pb-24">
          <Text size="3" as="p">
            {post.teaser}
          </Text>
          <PaywallCard
            options={
              [
                post.planId && {
                  key: "post",
                  label: "Unlock this post",
                  description: "$5 one time. Yours forever.",
                  planId: post.planId,
                },
                {
                  key: "pro",
                  label: "Pulse Pro",
                  description: "$10 a month. Every premium post on Pulse.",
                  planId: env.WHOP_PRO_PLAN_ID,
                },
              ].filter(Boolean) as TierOption[]
            }
            environment={env.WHOP_SANDBOX ? "sandbox" : "production"}
            returnUrl={`${env.APP_URL}/posts/${post.slug}`}
          />
        </div>
      )}
    </main>
  );
}
