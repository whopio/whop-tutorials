// The posts map stands in for your database or CMS. A post that can be
// bought on its own carries its own Whop product and plan ids; a post
// with neither is unlocked only by the Pro subscription.
export interface Post {
  slug: string;
  title: string;
  teaser: string;
  minutes: number;
  premium: boolean;
  productId: string | null;
  planId: string | null;
  body: string[];
}

export const posts: Post[] = [
  {
    slug: "the-state-of-internet-businesses",
    title: "The state of internet businesses in 2026",
    teaser:
      "Where the money actually moves: a tour through the storefronts, communities, and tools that earned this year.",
    minutes: 6,
    premium: false,
    productId: null,
    planId: null,
    body: [
      "The internet economy stopped being a niche a long time ago, but 2026 is the year the numbers became impossible to ignore. More first-dollar businesses launched this year than in the previous three combined, and the median time from idea to first sale dropped under a week.",
      "The biggest shift is in who is earning. Solo operators now outnumber funded teams among businesses crossing $10k per month. They sell templates, signals, coaching, software seats, and access to communities, and they run lean: no office, no payroll, a stack of tools that costs less than a phone bill.",
      "Distribution moved too. Marketplaces and embedded checkouts replaced the storefront homepage as the first purchase surface. The businesses that grew fastest put the buy button where the audience already was instead of pulling the audience to a website.",
      "The free tier you are reading now covers the landscape. The numbers behind it, the pricing teardowns, and the churn benchmarks live in the Pro posts, which is also how this demo pays for its own existence.",
    ],
  },
  {
    slug: "saas-pricing-teardown",
    title: "Pricing teardown: what 50 top SaaS apps actually charge",
    teaser:
      "We pulled the public pricing of 50 category leaders and normalized it per seat, per workspace, and per outcome. The patterns are not what the pricing-page templates suggest.",
    minutes: 9,
    premium: true,
    // Paste the product + one-time plan you created for this individually
    // sellable post (see the sandbox dashboard). Leave both null to make a
    // post unlockable only by the Pro subscription.
    productId: "prod_REPLACE_WITH_YOUR_POST_PRODUCT",
    planId: "plan_REPLACE_WITH_YOUR_ONE_TIME_PLAN",
    body: [
      "Across the 50 apps we tore down, the median entry plan landed at $19 per seat per month, but the number that matters is the multiple between the entry and the plan most customers end up on: 3.4x. Pricing pages are designed to make the middle column inevitable.",
      "Per-seat pricing is quietly losing ground. Eighteen of the fifty now meter something other than people: workspaces, monthly active contacts, compute, or completed outcomes. Every app that switched reported the same motivation in earnings calls and changelogs: seats cap revenue at headcount, and headcount is flat.",
      "Annual discounts cluster at exactly two months free. Only four apps discount deeper, and three of them sell to industries with procurement cycles measured in quarters. If your discount is steeper than 17 percent, you are likely paying for cash flow you do not need.",
      "The most copied pattern of the year is the usage floor: a flat platform fee that includes a bucket of usage, with overage priced at a visible, predictable rate. It reads as fair, it bills predictably, and it survives the spreadsheet a buyer builds the night before renewal.",
      "The teardown table with all 50 rows, the normalization method, and the per-category medians ships with this post. Steal the patterns, not the prices.",
    ],
  },
  {
    slug: "the-churn-report",
    title: "The churn report: why customers actually leave",
    teaser:
      "Twelve months of cancellation reasons across subscription businesses, categorized by what customers said versus what the data shows they did.",
    minutes: 7,
    premium: true,
    productId: null,
    planId: null,
    body: [
      "Cancellation surveys lie, but they lie consistently. 'Too expensive' wins the dropdown in 41 percent of cancellations, yet the accounts that pick it show the same usage decay curve as everyone else: a last-good-week, then three weeks of silence, then the cancel click.",
      "The real predictor is the second user. Accounts that never invite a second person churn at 4.1x the rate of accounts that do, regardless of plan size. Single-player accounts do not churn because of price; they churn because nobody else notices when they stop showing up.",
      "Pauses outperform discounts. Businesses that offered a pause option in the cancel flow saved 31 percent of cancellations, and paused accounts returned at nearly double the rate of win-back email campaigns. A discount taught customers to cancel again next year; a pause taught them to come back.",
      "Involuntary churn is still the cheapest fix in the industry. Failed payments accounted for between a fifth and a third of all churn in every dataset we touched, and most of it recovers with a retry schedule and a card-updater. If you fix one thing this quarter, fix this one.",
    ],
  },
];

export function getPost(slug: string): Post | undefined {
  return posts.find((post) => post.slug === slug);
}
