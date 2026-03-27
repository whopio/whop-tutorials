import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import Whop from "@whop/sdk";
import Mux from "@mux/mux-node";
import * as fs from "fs";
import * as path from "path";

const PLATFORM_FEE_PERCENT = 20;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY!,
  ...(process.env.WHOP_SANDBOX === "true" && {
    baseURL: "https://sandbox-api.whop.com/api/v1",
  }),
});

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const COMPANY_ID = process.env.WHOP_COMPANY_ID!;

const SEED_DATA = [
  {
    instructor: { name: "Sarah Chen", email: "sarah.chen.demo@gmail.com" },
    course: {
      title: "Web Development Fundamentals",
      description: "Learn the fundamentals of HTML, CSS, and JavaScript. Build real projects from scratch and deploy them to the web. This course covers everything from basic syntax to modern frameworks.",
      price: 1499,
      category: "DEVELOPMENT" as const,
      sections: [
        { title: "Getting Started", lessons: ["Setting Up Your Environment", "Your First HTML Page"] },
        { title: "CSS Styling", lessons: ["Box Model Basics", "Flexbox Layout"] },
      ],
    },
    videoFile: "video1-web-dev.mp4",
  },
  {
    instructor: { name: "Marcus Rivera", email: "marcus.rivera.demo@gmail.com" },
    course: {
      title: "UI/UX Design Masterclass",
      description: "Master the principles of user interface and experience design. From wireframing to high-fidelity prototypes, learn the complete design workflow used by top companies.",
      price: 1999,
      category: "DESIGN" as const,
      sections: [
        { title: "Design Foundations", lessons: ["Color Theory", "Typography Rules"] },
        { title: "Prototyping", lessons: ["Wireframing Basics", "Interactive Prototypes"] },
      ],
    },
    videoFile: "video2-design.mp4",
  },
  {
    instructor: { name: "Amira Patel", email: "amira.patel.demo@gmail.com" },
    course: {
      title: "Marketing & Growth Strategy",
      description: "Learn proven strategies to grow your business online. Covers SEO, content marketing, social media, paid ads, and analytics. Real case studies from successful startups.",
      price: 999,
      category: "MARKETING" as const,
      sections: [
        { title: "Growth Fundamentals", lessons: ["Market Research", "Customer Personas"] },
        { title: "Digital Channels", lessons: ["SEO Essentials", "Social Media Strategy"] },
      ],
    },
    videoFile: "video3-marketing.mp4",
  },
  {
    instructor: { name: "James Okafor", email: "james.okafor.demo@gmail.com" },
    course: {
      title: "Data Science with Python",
      description: "From zero to data scientist. Learn Python, pandas, NumPy, matplotlib, and scikit-learn through hands-on projects. Analyze real datasets and build predictive models.",
      price: 2499,
      category: "DEVELOPMENT" as const,
      sections: [
        { title: "Python Basics", lessons: ["Variables and Types", "Functions and Loops"] },
        { title: "Data Analysis", lessons: ["Pandas DataFrames", "Data Visualization"] },
      ],
    },
    videoFile: "video4-data-science.mp4",
  },
  {
    instructor: { name: "Elena Volkov", email: "elena.volkov.demo@gmail.com" },
    course: {
      title: "Photography & Visual Arts",
      description: "Transform your photography skills from amateur to professional. Covers composition, lighting, editing, and building a portfolio. Works with any camera, including smartphones.",
      price: 799,
      category: "PHOTOGRAPHY" as const,
      sections: [
        { title: "Camera Basics", lessons: ["Understanding Exposure", "Composition Rules"] },
        { title: "Post-Processing", lessons: ["Lightroom Essentials", "Color Grading"] },
      ],
    },
    videoFile: "video5-photography.mp4",
  },
];

function slugify(text: string): string {
  const suffix = Math.random().toString(36).substring(2, 8);
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 80) +
    "-" +
    suffix
  );
}

async function uploadVideoToMux(filePath: string): Promise<{
  assetId: string;
  playbackId: string;
  duration: number;
}> {
  console.log(`  Uploading video: ${path.basename(filePath)}`);

  const upload = await mux.video.uploads.create({
    cors_origin: APP_URL,
    new_asset_settings: {
      playback_policy: ["signed"],
      video_quality: "basic",
    },
  });

  // Upload the file directly to Mux
  const fileData = fs.readFileSync(filePath);
  const res = await fetch(upload.url!, {
    method: "PUT",
    body: fileData,
    headers: { "Content-Type": "video/mp4" },
  });
  if (!res.ok) throw new Error(`Mux upload failed: ${res.status}`);

  // Poll for asset ready
  console.log("  Waiting for Mux transcoding...");
  let asset = null;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const uploadStatus = await mux.video.uploads.retrieve(upload.id);
    if (uploadStatus.asset_id) {
      asset = await mux.video.assets.retrieve(uploadStatus.asset_id);
      if (asset.status === "ready") break;
    }
    process.stdout.write(".");
  }
  console.log("");

  if (!asset || asset.status !== "ready") {
    throw new Error("Mux asset not ready after 3 minutes");
  }

  const playbackId = asset.playback_ids?.[0]?.id;
  if (!playbackId) throw new Error("No playback ID on asset");

  return {
    assetId: asset.id,
    playbackId,
    duration: Math.round(asset.duration || 10),
  };
}

async function setupCourseChat(
  companyId: string,
  productId: string,
  courseName: string
): Promise<{ experienceId: string; chatChannelId: string } | null> {
  try {
    let chatAppId: string | null = null;
    for await (const app of whop.apps.list({ query: "chat", first: 20 })) {
      if (app.name.toLowerCase().includes("chat")) {
        chatAppId = app.id;
        break;
      }
    }
    if (!chatAppId) return null;

    const experience = await whop.experiences.create({
      app_id: chatAppId,
      company_id: companyId,
      name: `${courseName.slice(0, 50)} Discussion`,
    });

    await whop.experiences.attach(experience.id, { product_id: productId });

    let chatChannelId: string | null = null;
    for await (const channel of whop.chatChannels.list({
      company_id: companyId,
      first: 50,
    })) {
      if (channel.experience.id === experience.id) {
        chatChannelId = channel.id;
        break;
      }
    }

    if (!chatChannelId) return null;
    return { experienceId: experience.id, chatChannelId };
  } catch (err) {
    console.error("  Chat setup failed:", err);
    return null;
  }
}

async function seed() {
  console.log("=== Courstar Seed Script ===\n");

  // Clean up any previous seed data
  const seedUsers = await prisma.user.findMany({
    where: { whopUserId: { startsWith: "seed_user_" } },
  });
  if (seedUsers.length > 0) {
    console.log(`Cleaning up ${seedUsers.length} previous seed users...`);
    for (const u of seedUsers) {
      await prisma.user.delete({ where: { id: u.id } }).catch(() => {});
    }
  }

  const videosDir = path.resolve(__dirname, "../../seed-videos");

  for (let i = 0; i < SEED_DATA.length; i++) {
    const { instructor, course, videoFile } = SEED_DATA[i];
    console.log(`\n[${i + 1}/5] ${course.title}`);
    console.log(`  Instructor: ${instructor.name}`);

    // 1. Create user
    const user = await prisma.user.create({
      data: {
        whopUserId: `seed_user_${i + 1}_${Date.now()}`,
        email: instructor.email,
        name: instructor.name,
        avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(instructor.name)}&background=14B8A6&color=fff&format=png`,
      },
    });
    console.log("  User created:", user.id);

    // 2. Create Whop company (connected account)
    console.log("  Creating Whop company...");
    const company = await whop.companies.create({
      email: process.env.WHOP_SANDBOX_EMAIL || "developer@example.com",
      title: `${instructor.name}'s Teaching Account`,
      parent_company_id: COMPANY_ID,
    });

    const profile = await prisma.creatorProfile.create({
      data: {
        userId: user.id,
        whopCompanyId: company.id,
        kycComplete: true,
        headline: `Expert instructor on Courstar`,
        bio: `${instructor.name} is a passionate educator bringing real-world experience to online learning.`,
      },
    });
    console.log("  Creator profile:", profile.id, "Company:", company.id);

    // 3. Create course
    const slug = slugify(course.title);
    const dbCourse = await prisma.course.create({
      data: {
        title: course.title,
        slug,
        description: course.description,
        price: course.price,
        category: course.category,
        creatorId: profile.id,
        status: "DRAFT",
      },
    });
    console.log("  Course created:", dbCourse.id, "slug:", slug);

    // 4. Create sections + lessons
    const videoPath = path.join(videosDir, videoFile);
    let muxData: { assetId: string; playbackId: string; duration: number } | null = null;

    if (fs.existsSync(videoPath)) {
      muxData = await uploadVideoToMux(videoPath);
      console.log("  Mux asset:", muxData.assetId, "playback:", muxData.playbackId);
    } else {
      console.log("  WARNING: Video file not found:", videoPath);
    }

    for (let si = 0; si < course.sections.length; si++) {
      const section = course.sections[si];
      const dbSection = await prisma.section.create({
        data: {
          title: section.title,
          order: si,
          courseId: dbCourse.id,
        },
      });

      for (let li = 0; li < section.lessons.length; li++) {
        await prisma.lesson.create({
          data: {
            title: section.lessons[li],
            order: li,
            sectionId: dbSection.id,
            isFree: si === 0 && li === 0, // First lesson is free preview
            ...(muxData && {
              muxAssetId: si === 0 && li === 0 ? muxData.assetId : null,
              muxPlaybackId: si === 0 && li === 0 ? muxData.playbackId : null,
              duration: si === 0 && li === 0 ? muxData.duration : null,
              videoReady: si === 0 && li === 0,
            }),
          },
        });
      }
      console.log(`  Section "${section.title}" with ${section.lessons.length} lessons`);
    }

    // 5. Publish: create Whop product + plan + checkout + chat
    console.log("  Publishing via Whop API...");
    const product = await whop.products.create({
      company_id: company.id,
      title: course.title.slice(0, 40),
      description: course.description.slice(0, 500),
    });

    const priceInDollars = course.price / 100;
    const plan = await whop.plans.create({
      company_id: company.id,
      product_id: product.id,
      initial_price: priceInDollars,
      plan_type: "one_time",
    });

    const applicationFee =
      Math.round(priceInDollars * (PLATFORM_FEE_PERCENT / 100) * 100) / 100;

    const checkout = await whop.checkoutConfigurations.create({
      plan: {
        company_id: company.id,
        currency: "usd",
        initial_price: priceInDollars,
        plan_type: "one_time",
        application_fee_amount: applicationFee,
      },
      metadata: { courstar_course_id: dbCourse.id },
      redirect_url: `${APP_URL}/courses/${slug}/learn`,
    });

    console.log("  Product:", product.id, "Plan:", plan.id);
    console.log("  Checkout:", checkout.purchase_url);

    // 6. Update course with Whop IDs (chat setup skipped — will add later)
    await prisma.course.update({
      where: { id: dbCourse.id },
      data: {
        status: "PUBLISHED",
        whopProductId: product.id,
        whopPlanId: plan.id,
        whopCheckoutUrl: checkout.purchase_url,
      },
    });

    console.log(`  ✓ Published: /courses/${slug}`);
  }

  console.log("\n=== Seed complete! 5 courses published ===");
}

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
