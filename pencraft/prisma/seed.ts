import { PrismaClient, Tier } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const templates = [
  {
    name: "Blog Post",
    slug: "blog-post",
    description: "Well-structured articles with headings, introduction, and conclusion",
    category: "Content",
    tier: Tier.FREE,
    model: "claude-haiku-4-5-20251001",
    systemPrompt: `You are a professional blog writer. Write a well-structured blog post based on the user's inputs.\n\nInclude:\n- An engaging introduction that hooks the reader\n- Clear section headings formatted with ## in Markdown\n- Well-organized body paragraphs under each heading\n- A conclusion that summarizes key points and includes a call to action\n\nMatch the requested tone. Default to conversational and informative if no tone is specified. Format the output in Markdown.`,
    inputFields: [
      { name: "topic", label: "Topic", placeholder: "e.g., Remote work productivity tips", type: "text" },
      { name: "audience", label: "Target Audience", placeholder: "e.g., Remote workers and managers", type: "text" },
      { name: "tone", label: "Tone", placeholder: "e.g., Professional, casual, humorous", type: "text" },
      { name: "keyPoints", label: "Key Points", placeholder: "List the main points to cover", type: "textarea" },
    ],
  },
  {
    name: "Email",
    slug: "email",
    description: "Professional emails with subject line, greeting, and clear structure",
    category: "Communication",
    tier: Tier.FREE,
    model: "claude-haiku-4-5-20251001",
    systemPrompt: `You are a professional email writer. Write a clear, well-structured email based on the user's inputs.\n\nInclude:\n- A concise, descriptive subject line (prefixed with "Subject: ")\n- An appropriate greeting\n- A clear body organized by purpose\n- A professional sign-off\n\nMatch the requested tone. Keep the email focused and actionable. Format the output in plain text (not Markdown).`,
    inputFields: [
      { name: "purpose", label: "Purpose", placeholder: "e.g., Follow up on a meeting, Request feedback", type: "text" },
      { name: "recipient", label: "Recipient", placeholder: "e.g., Team lead, Client, Job interviewer", type: "text" },
      { name: "keyMessage", label: "Key Message", placeholder: "The main point you want to communicate", type: "textarea" },
      { name: "tone", label: "Tone", placeholder: "e.g., Formal, friendly, urgent", type: "text" },
    ],
  },
  {
    name: "Social Media Post",
    slug: "social-media-post",
    description: "Platform-optimized posts with hashtags and engagement hooks",
    category: "Social",
    tier: Tier.FREE,
    model: "gpt-4o-mini",
    systemPrompt: `You are a social media content specialist. Write a platform-appropriate social media post based on the user's inputs.\n\nGuidelines:\n- Twitter/X: Keep under 280 characters, punchy and direct\n- LinkedIn: Professional tone, can be longer, use line breaks for readability\n- Instagram: Visual-focused caption, generous with relevant hashtags, aim for five to ten\n- Facebook: Conversational, can include questions to drive engagement\n- General: Adapt length and style to the specified platform\n\nInclude relevant hashtags and a clear call to action. Make it scroll-stopping.`,
    inputFields: [
      { name: "platform", label: "Platform", placeholder: "e.g., Twitter, LinkedIn, Instagram", type: "text" },
      { name: "topic", label: "Topic", placeholder: "e.g., Product launch, Industry insight", type: "text" },
      { name: "tone", label: "Tone", placeholder: "e.g., Excited, professional, witty", type: "text" },
      { name: "cta", label: "Call to Action", placeholder: "e.g., Visit our website, Share your thoughts", type: "text" },
    ],
  },
  {
    name: "Ad Copy",
    slug: "ad-copy",
    description: "Attention-grabbing ad copy with headline, body, and CTA",
    category: "Marketing",
    tier: Tier.PRO,
    model: "gpt-4o-mini",
    systemPrompt: `You are an advertising copywriter. Write compelling ad copy based on the user's inputs.\n\nInclude:\n- A headline that grabs attention (under 10 words)\n- A subheadline that expands on the promise\n- Body copy that highlights the unique selling point and addresses the audience's needs\n- A clear, action-oriented CTA\n\nAdapt the format to the specified platform (Google Ads = shorter, Facebook = can be longer, etc.). Focus on benefits over features.`,
    inputFields: [
      { name: "product", label: "Product / Service", placeholder: "e.g., Project management SaaS tool", type: "text" },
      { name: "audience", label: "Target Audience", placeholder: "e.g., Startup founders, small business owners", type: "text" },
      { name: "platform", label: "Ad Platform", placeholder: "e.g., Google Ads, Facebook, Instagram", type: "text" },
      { name: "usp", label: "Unique Selling Point", placeholder: "What makes this product different?", type: "textarea" },
    ],
  },
  {
    name: "Landing Page",
    slug: "landing-page",
    description: "Landing page copy with hero, benefits, social proof, and CTA sections",
    category: "Marketing",
    tier: Tier.PRO,
    model: "claude-haiku-4-5-20251001",
    systemPrompt: `You are a conversion copywriter specializing in landing pages. Write landing page copy based on the user's inputs.\n\nStructure the output with these clearly labeled sections:\n## Hero Section\n- Headline (under 12 words, benefit-driven)\n- Subheadline (1-2 sentences expanding the promise)\n- CTA button text\n\n## Benefits\n- 3-4 benefit blocks, each with a short title and 1-2 sentence description\n- Focus on outcomes, not features\n\n## Social Proof\n- A template for a testimonial quote\n- A stats/numbers section (suggest realistic metrics)\n\n## Final CTA\n- A closing headline\n- CTA button text\n- A brief urgency or reassurance line\n\nFormat in Markdown.`,
    inputFields: [
      { name: "product", label: "Product / Service", placeholder: "e.g., AI-powered resume builder", type: "text" },
      { name: "headline", label: "Headline Idea", placeholder: "Optional starting point for the headline", type: "text" },
      { name: "audience", label: "Target Audience", placeholder: "e.g., Job seekers, career changers", type: "text" },
      { name: "benefits", label: "Key Benefits", placeholder: "List the top 3-4 benefits", type: "textarea" },
    ],
  },
  {
    name: "Product Description",
    slug: "product-description",
    description: "Compelling product descriptions with features and buyer benefits",
    category: "E-commerce",
    tier: Tier.PRO,
    model: "gpt-4o-mini",
    systemPrompt: `You are an e-commerce copywriter. Write a compelling product description based on the user's inputs.\n\nInclude:\n- An opening hook that captures the product's essence (1-2 sentences)\n- Key features presented as buyer benefits (use bullet points)\n- A paragraph connecting the product to the buyer's lifestyle or needs\n- Specifications or details section if relevant\n\nMatch the requested tone. Use sensory language where appropriate. Focus on how the product improves the buyer's life, not just what it does.`,
    inputFields: [
      { name: "productName", label: "Product Name", placeholder: "e.g., CloudWalk Running Shoes", type: "text" },
      { name: "features", label: "Key Features", placeholder: "List the main features and specs", type: "textarea" },
      { name: "audience", label: "Target Buyer", placeholder: "e.g., Marathon runners, casual joggers", type: "text" },
      { name: "tone", label: "Tone", placeholder: "e.g., Premium, playful, technical", type: "text" },
    ],
  },
  {
    name: "SEO Article",
    slug: "seo-article",
    description: "SEO-optimized articles with natural keyword placement and meta description",
    category: "Content",
    tier: Tier.PRO,
    model: "claude-haiku-4-5-20251001",
    systemPrompt: `You are an SEO content writer. Write an SEO-optimized article based on the user's inputs.\n\nRequirements:\n- Include a meta description (under 160 characters) at the top, labeled "Meta Description:"\n- Use the target keyword naturally in the title, first paragraph, and 2-3 subheadings\n- Structure with clear ## headings for scannability\n- Aim for the requested word count (default 1000 words if not specified)\n- Include an FAQ section at the end with 3-4 questions (uses ## FAQ heading)\n- Write for humans first, search engines second — no keyword stuffing\n\nFormat in Markdown.`,
    inputFields: [
      { name: "keyword", label: "Target Keyword", placeholder: "e.g., best project management tools 2025", type: "text" },
      { name: "audience", label: "Target Audience", placeholder: "e.g., Small business owners", type: "text" },
      { name: "wordCount", label: "Word Count Target", placeholder: "e.g., 1500", type: "text" },
      { name: "keyPoints", label: "Key Points to Cover", placeholder: "Main topics and subtopics", type: "textarea" },
    ],
  },
  {
    name: "Press Release",
    slug: "press-release",
    description: "Standard-format press releases with headline, lead, body, and boilerplate",
    category: "PR",
    tier: Tier.PRO,
    model: "claude-haiku-4-5-20251001",
    systemPrompt: `You are a PR professional. Write a press release in standard AP format based on the user's inputs.\n\nStructure:\n- "FOR IMMEDIATE RELEASE" header\n- Headline (compelling, under 15 words)\n- Dateline (City, State — Date)\n- Lead paragraph answering who, what, when, where, why\n- 2-3 body paragraphs with supporting details\n- A direct quote from a company representative (use the provided quote or generate an appropriate one)\n- Boilerplate "About [Company]" paragraph\n- Media contact section (placeholder)\n\nUse third person. Keep sentences concise. Avoid marketing language — focus on newsworthy facts.`,
    inputFields: [
      { name: "announcement", label: "Announcement", placeholder: "e.g., Launch of new product line", type: "text" },
      { name: "company", label: "Company Name", placeholder: "e.g., Acme Corp", type: "text" },
      { name: "details", label: "Key Details", placeholder: "Who, what, when, where, why", type: "textarea" },
      { name: "quote", label: "Quote (optional)", placeholder: "A quote from a spokesperson", type: "textarea" },
    ],
  },
];

async function main() {
  console.log("Seeding templates...");

  for (const template of templates) {
    await prisma.template.upsert({
      where: { slug: template.slug },
      update: {
        name: template.name,
        description: template.description,
        category: template.category,
        systemPrompt: template.systemPrompt,
        inputFields: template.inputFields,
        tier: template.tier,
        model: template.model,
      },
      create: template,
    });
  }

  console.log(`Seeded ${templates.length} templates.`);

  console.log("Seeding Pro plan placeholder...");

  // Placeholder values — replace with real Whop IDs by running:
  //   npx tsx prisma/create-pro-plan.ts
  // That script creates the product and plan via the Whop API and upserts the IDs here.
  await prisma.plan.upsert({
    where: { id: "pro-plan" },
    update: {
      name: "Pro",
      price: 2000,
      whopProductId: "prod_placeholder",
      whopPlanId: "plan_placeholder",
      checkoutUrl: "https://sandbox.whop.com/checkout/plan_placeholder",
    },
    create: {
      id: "pro-plan",
      name: "Pro",
      price: 2000,
      whopProductId: "prod_placeholder",
      whopPlanId: "plan_placeholder",
      checkoutUrl: "https://sandbox.whop.com/checkout/plan_placeholder",
      isActive: true,
    },
  });

  console.log("Seeded Pro plan placeholder. Run `npx tsx prisma/create-pro-plan.ts` to replace with real Whop IDs.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
