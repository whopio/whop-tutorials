> **Part 2 of 3** - Features: Data models, writer onboarding, rich text editor, publication pages, content rendering
>
> Continues from [Part 1](./penstack-guide-part1.md) (Foundation). At this point you should have: Next.js project scaffolded, Prisma configured with driver adapter, Whop OAuth working, session management, and rate limiting.

---

# Part 2: Data models and writer onboarding
Now that our user verification system works, we must determine the data structures necessary for our project to function as a publishing platform. In this section, we will look at the complete schema, file uploading, and the onboarding flow for regular users to become authors.
### The complete data model
We will use a total of eight models in our project. Some details to note:
* Writers are separate from Users, not every user is a writer.
* Post.content is `Json`, Tiptap (the editor we use) outputs JSON and storing it as such lets the server slice the node array at `paywallIndex` for preview posts so paid content can't be seen by unauthorized users.
* Single paid tier per writer, all writers have a single plan and price.
* WebhookEvent stores processed event IDs for idempotency since webhooks can fire more than once.
Now, go to `prisma` and update the `schema.prisma` file content with:
```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

//  Enums
enum PublicationCategory {
  TECHNOLOGY
  BUSINESS
  CULTURE
  POLITICS
  SCIENCE
  HEALTH
  FINANCE
  SPORTS
  FOOD
  TRAVEL
  MUSIC
  ART
  EDUCATION
  OTHER
}

enum PostVisibility {
  FREE
  PAID
  PREVIEW
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELLED
  PAUSED
  TRIALING
}

enum NotificationType {
  NEW_POST
  NEW_SUBSCRIBER
  NEW_FOLLOWER
  PAYMENT_RECEIVED
  PAYMENT_FAILED
}

// Models
model User {
  id          String   @id @default(cuid())
  whopUserId  String   @unique
  email       String?
  username    String?
  displayName String?
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  writer        Writer?
  subscriptions Subscription[]
  follows       Follow[]
  likes         Like[]
  notifications Notification[]
}

model Writer {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  handle    String
  name      String
  bio       String?
  avatarUrl String?
  bannerUrl String?
  category  PublicationCategory @default(OTHER)

  whopCompanyId     String? // Connected account company
  whopProductId     String? // Product for subscriptions
  whopPlanId        String? // Plan (single tier)
  whopChatChannelId String? // Embedded chat channel

  kycCompleted      Boolean @default(false)
  monthlyPriceInCents Int?
  chatPublic        Boolean @default(true) // false = subscriber-only chat

  posts         Post[]
  subscriptions Subscription[]
  followers     Follow[]

  @@index([handle])
  @@index([category])
}

model Post {
  id        String   @id @default(cuid())
  writerId  String
  writer    Writer   @relation(fields: [writerId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  slug          String
  title         String
  subtitle      String?
  coverImageUrl String?
  content       Json // Tiptap ProseMirror JSON document
  visibility    PostVisibility @default(FREE)
  paywallIndex  Int? // Node index for PREVIEW — server slices here

  published   Boolean   @default(false)
  publishedAt DateTime?
  viewCount   Int       @default(0)

  likes Like[]

  @@unique([writerId, slug])
  @@index([writerId, published, publishedAt])
  @@index([published, publishedAt])
  @@index([visibility])
}

model Subscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  writerId  String
  writer    Writer   @relation(fields: [writerId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  status             SubscriptionStatus @default(ACTIVE)
  whopMembershipId   String?            @unique
  currentPeriodEnd   DateTime?
  cancelledAt        DateTime?
  lastWebhookEventId String?

  @@unique([userId, writerId])
  @@index([writerId, status])
}

model Follow {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  writerId  String
  writer    Writer   @relation(fields: [writerId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, writerId])
  @@index([writerId])
}

model Like {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  postId    String
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([userId, postId])
  @@index([postId])
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  message   String
  postId    String?
  writerId  String?
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())

  @@index([userId, read, createdAt])
}

model WebhookEvent {
  id          String   @id // Whop event ID — used for idempotency
  eventType   String
  processedAt DateTime @default(now())
}
```
Then push the updated schema using the command:
```bash
npx prisma db push
```
### Uploadthing for file uploads
We're going to use Uploadthing for avatars, banners, and cover images instead of Supabase Storage. Uploadthing lets us use type-safe file routes with built-in React upload components, which means less custom code.
Go to `src/lib` and create a file called `uploadthing.ts` with the content:
```ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getSession } from "./session";

const f = createUploadthing();

export const uploadRouter = {
  avatarUploader: f({
    image: { maxFileSize: "2MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getSession();
      if (!session.userId) throw new Error("Unauthorized");
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl, userId: metadata.userId };
    }),

  bannerUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getSession();
      if (!session.userId) throw new Error("Unauthorized");
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl, userId: metadata.userId };
    }),

  coverImageUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getSession();
      if (!session.userId) throw new Error("Unauthorized");
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl, userId: metadata.userId };
    }),

  editorImageUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const session = await getSession();
      if (!session.userId) throw new Error("Unauthorized");
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
```
To set up Uploadthing, create a project at uploadthing.com, copy your `UPLOADTHING_TOKEN` key and add it to your Vercel environment variables. Then, use the command below to pull the variables:
```BASH
vercel env pull .env.local
```
Now, go to `src/app/api/uploadthing` and create a file called `route.ts` with the content:
```ts
import { createRouteHandler } from "uploadthing/next";
import { uploadRouter } from "@/lib/uploadthing";

export const { GET, POST } = createRouteHandler({
  router: uploadRouter,
});
```
### Writer onboarding flow
All users in the project can become writers by going through the onboarding flow. They can do this through a multi-step onboarding at `/settings`.  To create this, let's go to `src/app/api/writers` and create a file called `route.ts` with the content:
```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

const createWriterSchema = z.object({
  handle: z
    .string()
    .min(3)
    .max(30)
    .regex(
      /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/,
      "Handle must be lowercase alphanumeric with optional hyphens"
    ),
  name: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  category: z.enum([
    "TECHNOLOGY",
    "BUSINESS",
    "CULTURE",
    "POLITICS",
    "SCIENCE",
    "HEALTH",
    "FINANCE",
    "SPORTS",
    "FOOD",
    "TRAVEL",
    "MUSIC",
    "ART",
    "EDUCATION",
    "OTHER",
  ]),
  avatarUrl: z.string().url().optional(),
  bannerUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`writers:create:${user.id}`, {
    interval: 60_000,
    maxRequests: 5,
  });
  if (limited) return limited;

  const existingWriter = await prisma.writer.findUnique({
    where: { userId: user.id },
  });
  if (existingWriter) {
    return NextResponse.json(
      { error: "You already have a publication" },
      { status: 409 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createWriterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { handle, name, bio, category, avatarUrl, bannerUrl } = parsed.data;

  const handleTaken = await prisma.writer.findFirst({ where: { handle } });
  if (handleTaken) {
    return NextResponse.json(
      { error: "Handle is already taken" },
      { status: 409 }
    );
  }

  const writer = await prisma.writer.create({
    data: {
      userId: user.id,
      handle,
      name,
      bio,
      category,
      avatarUrl,
      bannerUrl,
    },
  });

  return NextResponse.json(writer, { status: 201 });
}
```
The handles become the publication URL (`/writer-handle`) once the onboarding is complete, so the regex we use for handles (`/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/`) enforces URL-safe slugs.
The settings page and onboarding wizard are standard React components that collect these fields across four steps, use the Uploadthing components for avatar and banner uploads, and POST the collected data to this endpoint. See `src/app/settings/page.tsx` and `src/components/settings/onboarding-wizard.tsx` in the repo.
### Publication categories
The explore page of the project uses a category filter and they're defined as both a Prisma enum (a fixed set of allowed values) and a constants file (a mapping from those values to readable labels for the UI). To create this, go to `src/constants` and create a file called `categories.ts` with the content:
```ts
import { PublicationCategory } from "@/generated/prisma/client";

export const CATEGORY_LABELS: Record<PublicationCategory, string> = {
  TECHNOLOGY: "Technology",
  BUSINESS: "Business",
  CULTURE: "Culture",
  POLITICS: "Politics",
  SCIENCE: "Science",
  HEALTH: "Health",
  FINANCE: "Finance",
  SPORTS: "Sports",
  FOOD: "Food",
  TRAVEL: "Travel",
  MUSIC: "Music",
  ART: "Art",
  EDUCATION: "Education",
  OTHER: "Other",
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_LABELS).map(
  ([value, label]) => ({ value: value as PublicationCategory, label })
);
```
### App configuration constants
Several parts of the project reference shared constants like page sizes, trending algorithm weights, and pricing limits. Go to `src/constants` and create a file called `config.ts` with the content:
```ts
export const PLATFORM_FEE_PERCENT = 10;
export const MIN_PRICE_CENTS = 100;
export const MAX_PRICE_CENTS = 100_000;
export const POSTS_PER_PAGE = 10;
export const TRENDING_WRITERS_COUNT = 6;
export const TRENDING_WINDOW_DAYS = 14;
export const TRENDING_WEIGHTS = {
  followers: 1,
  subscribers: 3,
  recentPosts: 2,
} as const;
```
### Verify the onboarding flow
The build is done, so let's verify our writer onboarding flow:
1. Sign in through Whop OAuth
2. Navigate to `/settings`. The onboarding wizard appears since you don't have a writer profile
3. Complete the four steps and submit
4. Confirm the Writer record was created in Supabase with the correct `userId` reference
5. Visit `/{your-handle}` -- the publication page should be there
You now have authentication, a complete data model, file uploads, and writer onboarding. In Part 3, we'll build the rich text editor that writers use to create posts.
## Part 3: The rich text editor
The text editor is one of the most important parts of the project because we need a text editor that authors can use easily but that still offers standard formatting options (so they can freely customise the articles they write).
In this section, we will set up the rich text editor Tiptap, add the custom paywall break extension, and set up the API calls to add articles to the database.
### Paywall break extension configuration
One of the key features that will set our editor apart from other classic text editors is the paywall break extension. Authors will be able to insert this component wherever they wish in their text. Everything above the component will be readable by everyone, while the content below will be exclusive to subscribers.
To create the component file, go to `/src/components/editor/extensions` and create a file called `paywall-break.ts` with the content:
```ts
import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paywallBreak: {
      setPaywallBreak: () => ReturnType;
    };
  }
}

export const PaywallBreak = Node.create({
  name: "paywallBreak",
  group: "block",
  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-type="paywall-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "paywall-break",
        class: "paywall-break",
      }),
      "Content below is for paid subscribers only",
    ];
  },

  addCommands() {
    return {
      setPaywallBreak:
        () =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name });
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-p": () => this.editor.commands.setPaywallBreak(),
    };
  },
});
```
### Editor setup
Now, let's create our editor which has basic formatting, image uploads, and the paywall break. Go to `src/components/editor` and create a file called `editor.tsx` with the content:
```tsx
"use client";

import { useRef } from "react";
import { useEditor, EditorContent, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExt from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { PaywallBreak } from "./extensions/paywall-break";
import { Toolbar } from "./toolbar";

interface EditorProps {
  initialContent?: JSONContent;
  onChange: (content: JSONContent) => void;
  editable?: boolean;
}

export function Editor({
  initialContent,
  onChange,
  editable = true,
}: EditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExt,
      LinkExt.configure({ openOnClick: false }),
      ImageExt,
      Placeholder.configure({ placeholder: "Start writing..." }),
      PaywallBreak,
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  if (!editor) return null;

  function handleImageUpload() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    const formData = new FormData();
    formData.append("files", file);

    try {
      const res = await fetch("/api/uploadthing", {
        method: "POST",
        headers: { "x-uploadthing-package": "uploadthing" },
        body: formData,
      });
      const data = await res.json();
      if (data?.[0]?.ufsUrl) {
        editor.chain().focus().setImage({ src: data[0].ufsUrl }).run();
      }
    } catch {
      alert("Image upload failed. Please try again.");
    }

    e.target.value = "";
  }

  return (
    <div className="rounded-lg border border-gray-200">
      {editable && (
        <Toolbar editor={editor} onImageUpload={handleImageUpload} />
      )}
      <div className="min-h-[400px] p-4">
        <EditorContent editor={editor} />
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
```
The toolbar (see `src/components/editor/toolbar.tsx` in the repo) is a flat array of button definitions: bold, italic, underline, headings, lists, blockquote, code block, link, image, horizontal rule, and a paywall break toggle (lock icon). Each button calls the corresponding Tiptap chain command and highlights when active.
### How the paywallIndex works
When a writer publishes a preview in our project, our server needs to understand how to split this content, which is why we use the `paywallIndex` field in our Post model. This allows us to configure where the server should split the post and which part should be shown to unsubscribed users.
Then, the `/write` page finds the `paywallBreak` section in the JSON content:
```ts
let paywallIndex: number | undefined;
if (content?.content) {
  const idx = content.content.findIndex(
    (node) => node.type === "paywallBreak"
  );
  if (idx !== -1) paywallIndex = idx;
}
```
### The API for post creation
The POST handler we'll use should link the editor to the database, validate with Zod, generate a unique slug, and create the post record. To do this, go to `src/app/api/posts` and create a file called `route.ts` with the content:
```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getWriterProfile } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { POSTS_PER_PAGE } from "@/constants/config";

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  subtitle: z.string().max(400).optional(),
  content: z.unknown(),
  visibility: z.enum(["FREE", "PAID", "PREVIEW"]),
  paywallIndex: z.number().int().min(0).optional(),
  published: z.boolean(),
  coverImageUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  const user = await requireAuth({ redirect: false });
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limited = rateLimit(`posts:create:${user.id}`, {
    interval: 60_000,
    maxRequests: 10,
  });
  if (limited) return limited;

  const writer = await getWriterProfile(user.id);
  if (!writer) {
    return NextResponse.json(
      { error: "You must be a writer to create posts" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { title, subtitle, content, visibility, paywallIndex, published, coverImageUrl } =
    parsed.data;

  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  const post = await prisma.post.create({
    data: {
      writerId: writer.id,
      title,
      subtitle,
      content: content as object,
      visibility,
      paywallIndex,
      published,
      publishedAt: published ? new Date() : null,
      coverImageUrl,
      slug,
    },
  });

  return NextResponse.json(post, { status: 201 });
}
```
### The write page
The `/write` page is what writers will use to create and edit posts. It includes the rich text editor and the toolbar (you can find it in `src/components/editor/toolbar.tsx` in the repo) that allows writers to format their text as bold, italic, heading, list, blockquotes, images, and add paywall breaks.
To create the `/write` page, go to `src/app/write` and create a file called `page.tsx` with the content:
```tsx
"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { JSONContent } from "@tiptap/core";
import { Editor } from "@/components/editor/editor";
import { UploadZone } from "@/components/ui/upload-zone";
import type { PostVisibility } from "@/generated/prisma/browser";

const VISIBILITY_OPTIONS: { value: PostVisibility; label: string; description: string }[] = [
  { value: "FREE", label: "Free", description: "Visible to everyone" },
  { value: "PAID", label: "Paid", description: "Subscribers only" },
  { value: "PREVIEW", label: "Preview", description: "Free preview with paywall" },
];

export default function WritePage() {
  return (
    <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <WritePageInner />
    </Suspense>
  );
}

function WritePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const postId = searchParams.get("postId");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [content, setContent] = useState<JSONContent | undefined>(undefined);
  const [visibility, setVisibility] = useState<PostVisibility>("FREE");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!postId);

  useEffect(() => {
    if (!postId) return;

    fetch(`/api/posts/${postId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load post");
        return res.json();
      })
      .then((post) => {
        setTitle(post.title);
        setSubtitle(post.subtitle ?? "");
        setCoverImageUrl(post.coverImageUrl);
        setContent(post.content as JSONContent);
        setVisibility(post.visibility);
      })
      .catch(() => {
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));
  }, [postId, router]);

  const save = useCallback(
    async (publish: boolean) => {
      if (!title.trim()) return;
      setSaving(true);

      try {
        let paywallIndex: number | undefined;
        if (content?.content) {
          const idx = content.content.findIndex(
            (node) => node.type === "paywallBreak"
          );
          if (idx !== -1) paywallIndex = idx;
        }

        const body = {
          title: title.trim(),
          subtitle: subtitle.trim() || undefined,
          content,
          visibility,
          paywallIndex,
          published: publish,
          coverImageUrl: coverImageUrl ?? undefined,
        };

        const url = postId ? `/api/posts/${postId}` : "/api/posts";
        const method = postId ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const data = await res.json();
          alert(data.error ?? "Something went wrong");
          return;
        }

        router.push("/dashboard");
      } finally {
        setSaving(false);
      }
    },
    [title, subtitle, content, visibility, coverImageUrl, postId, router]
  );

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6">
        <UploadZone
          endpoint="coverImageUploader"
          onUploadComplete={(url) => setCoverImageUrl(url)}
          label="Cover image"
        />
      </div>

      <input
        type="text"
        placeholder="Post title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border-0 bg-transparent font-serif text-4xl font-bold placeholder-gray-300 focus:outline-none focus:ring-0"
      />

      <input
        type="text"
        placeholder="Add a subtitle..."
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        className="mt-2 w-full border-0 bg-transparent text-xl text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-0"
      />

      <div className="mt-6">
        <Editor
          initialContent={content}
          onChange={setContent}
        />
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2">
          <label htmlFor="visibility" className="text-sm font-medium text-gray-700">
            Visibility:
          </label>
          <select
            id="visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as PostVisibility)}
            className="input w-auto"
          >
            {VISIBILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label} — {opt.description}
              </option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex gap-3">
          <button
            onClick={() => save(false)}
            disabled={saving || !title.trim()}
            className="btn-secondary"
          >
            {saving ? "Saving..." : "Save draft"}
          </button>
          <button
            onClick={() => save(true)}
            disabled={saving || !title.trim()}
            className="btn-primary"
          >
            {saving ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
```
## Verification
Test the full editor-to-database loop:
1. Navigate to `/write`, create a post with a few paragraphs, insert a paywall break, and add content below it
2. Set visibility to "Preview" and publish
3. Check the database. `published: true`, `visibility: "PREVIEW"`, and the content JSON contains a `paywallBreak` node at the correct position
4. Save a second post as a draft. Verify it appears in your dashboard but not on your public publication page
5. Edit the draft from the dashboard. `/write` loads with all fields populated
The editor is connected end-to-end. Next, we'll turn this stored content into rendered articles with server-side paywall enforcement.
# Part 4: Publication pages and content rendering
Now that we've built the writer side of the project, let's move on to the reader side. In this section, we're going to create pages where audiences discover writers and read their content. 
When a non-subscriber visits a preview post (article with a paywall and a preview at the start), we want to prevent them from manually removing the paywall and seeing the rest of the article. So, we want to slice the content on the server-side, not client. Here's how the article pages implement the access check (from `src/app/[writer]/[slug]/page.tsx`):
```tsx
let hasAccess = true;
let paywallIndex: number | undefined;

if (post.visibility !== "FREE") {
  if (!user) {
    hasAccess = false;
  } else {
    hasAccess = await canAccessPaidContent(user.id, post.writerId);
  }

  if (!hasAccess && post.visibility === "PREVIEW" && post.paywallIndex != null) {
    paywallIndex = post.paywallIndex;
  }
}
```
### Rendering the Tiptap JSON
As we mentioned before, Tiptap stores the articles as JSON, not HTML. This allows us to use a recursive renderer that reads the JSON tree, giving us control over how each element renders, especially the paywall break node.
Let's go to `src/components/post` and create a file called `post-content.tsx` with the content:
```tsx
import { PaywallGate } from "./paywall-gate";

interface PostContentProps {
  content: unknown;
  paywallIndex?: number | null;
  hasAccess?: boolean;
  writerName?: string;
  writerHandle?: string;
  price?: number;
}

export function PostContent({
  content,
  paywallIndex,
  hasAccess,
  writerName = "",
  writerHandle = "",
  price = 0,
}: PostContentProps) {
  const doc = content as { type: string; content?: unknown[] };
  const nodes = doc?.content ?? [];

  let visibleNodes = nodes;
  let showPaywall = false;

  if (paywallIndex != null && !hasAccess) {
    visibleNodes = nodes.slice(0, paywallIndex);
    showPaywall = true;
  }

  return (
    <div>
      <div
        className="prose prose-lg max-w-none"
        dangerouslySetInnerHTML={{
          __html: renderNodes(visibleNodes),
        }}
      />
      {showPaywall && (
        <PaywallGate
          writerName={writerName}
          writerHandle={writerHandle}
          price={price}
        />
      )}
    </div>
  );
}

function renderNodes(nodes: unknown[]): string {
  return nodes.map(renderNode).join("");
}

function renderNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Record<string, unknown>;

  switch (n.type) {
    case "paragraph":
      return `<p>${renderChildren(n)}</p>`;
    case "heading": {
      const level = (n.attrs as Record<string, unknown>)?.level ?? 2;
      return `<h${level}>${renderChildren(n)}</h${level}>`;
    }
    case "bulletList":
      return `<ul>${renderChildren(n)}</ul>`;
    case "orderedList":
      return `<ol>${renderChildren(n)}</ol>`;
    case "listItem":
      return `<li>${renderChildren(n)}</li>`;
    case "blockquote":
      return `<blockquote>${renderChildren(n)}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${renderChildren(n)}</code></pre>`;
    case "image": {
      const attrs = n.attrs as Record<string, unknown>;
      const src = attrs?.src ?? "";
      const alt = attrs?.alt ?? "";
      return `<img src="${escapeHtml(String(src))}" alt="${escapeHtml(String(alt))}" />`;
    }
    case "horizontalRule":
      return `<hr />`;
    case "hardBreak":
      return `<br />`;
    case "paywallBreak":
      return "";
    case "text": {
      let text = escapeHtml(String(n.text ?? ""));
      const marks = n.marks as Array<Record<string, unknown>> | undefined;
      if (marks) {
        for (const mark of marks) {
          switch (mark.type) {
            case "bold":
              text = `<strong>${text}</strong>`;
              break;
            case "italic":
              text = `<em>${text}</em>`;
              break;
            case "underline":
              text = `<u>${text}</u>`;
              break;
            case "strike":
              text = `<s>${text}</s>`;
              break;
            case "code":
              text = `<code>${text}</code>`;
              break;
            case "link": {
              const href = (mark.attrs as Record<string, unknown>)?.href ?? "";
              text = `<a href="${escapeHtml(String(href))}" target="_blank" rel="noopener noreferrer">${text}</a>`;
              break;
            }
          }
        }
      }
      return text;
    }
    default:
      return renderChildren(n);
  }
}

function renderChildren(node: Record<string, unknown>): string {
  const children = node.content as unknown[] | undefined;
  if (!children) return "";
  return renderNodes(children);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```
### The paywall gate
When an unsubscribed reader hits the content boundary (the paywall gate), they should see a gate with a fade gradient that creates the impression the article continues but fades into the paywall. To create this, go to `src/components/post` and create a file called `paywall-gate.tsx` with the content:
```tsx
import { Lock } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export interface PaywallGateProps {
  writerName: string;
  writerHandle: string;
  price?: number | null;
}

export function PaywallGate({
  writerName,
  writerHandle,
  price,
}: PaywallGateProps) {
  return (
    <div className="relative mt-8">
      <div className="pointer-events-none absolute -top-24 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent" />

      <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <Lock className="h-6 w-6 text-amber-700" />
        </div>
        <h3 className="font-serif text-xl font-bold text-gray-900">
          This content is for paid subscribers
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Subscribe to {writerName}
          {price ? ` for ${formatPrice(price)}/month` : ""} to unlock this
          post and all premium content.
        </p>
        <Link href={`/${writerHandle}`} className="btn-primary mt-6 inline-flex">
          Subscribe to read
        </Link>
      </div>
    </div>
  );
}
```
One thing we should note is that the CTA button redirects readers to the publication page rather than a checkout page, allowing us to expose the full publication to the reader.
### The article pages
The article pages live in the `/[writer]/[slug]` route and renders the page content and paywall breaks we just configured. Using a slug, it pulls the post's content, determines which content the user should see, and displays either the full content (subscriber), partial content via a paywall gate (preview post), or the entire content (free post).
To create the article pages, go to `/src/app/[writer]/[slug]` and create a page called `page.tsx` with the content:
```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { getPostBySlug } from "@/services/post-service";
import { canAccessPaidContent } from "@/services/subscription-service";
import { isLikedByUser } from "@/services/post-service";
import { PostContent } from "@/components/post/post-content";
import { LikeButton } from "@/components/post/like-button";
import { PaywallGate } from "@/components/post/paywall-gate";
import { formatDate, estimateReadingTime } from "@/lib/utils";

interface ArticlePageProps {
  params: Promise<{ writer: string; slug: string }>;
}

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { writer, slug } = await params;
  const post = await getPostBySlug(writer, slug);

  if (!post) {
    return { title: "Post not found | Penstack" };
  }

  return {
    title: `${post.title} | Penstack`,
    description: post.subtitle ?? `By ${post.writer.name}`,
    openGraph: {
      title: post.title,
      description: post.subtitle ?? `By ${post.writer.name}`,
      type: "article",
      ...(post.coverImageUrl ? { images: [post.coverImageUrl] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { writer: writerHandle, slug } = await params;
  const post = await getPostBySlug(writerHandle, slug);

  if (!post) notFound();

  const user = await requireAuth({ redirect: false });

  let hasAccess = true;
  let paywallIndex: number | undefined;

  if (post.visibility !== "FREE") {
    if (!user) {
      hasAccess = false;
    } else {
      hasAccess = await canAccessPaidContent(user.id, post.writerId);
    }

    if (!hasAccess && post.visibility === "PREVIEW" && post.paywallIndex != null) {
      paywallIndex = post.paywallIndex;
    }
  }

  const liked = user ? await isLikedByUser(user.id, post.id) : false;
  const readingTime = estimateReadingTime(post.content);

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt={post.title}
          className="mb-8 aspect-[2/1] w-full rounded-xl object-cover"
        />
      )}

      <header className="mb-8">
        <h1 className="font-serif text-4xl font-bold leading-tight">
          {post.title}
        </h1>
        {post.subtitle && (
          <p className="mt-3 text-xl text-gray-600">{post.subtitle}</p>
        )}
        <div className="mt-4 flex items-center gap-3 text-sm text-gray-500">
          <a
            href={`/${post.writer.handle}`}
            className="flex items-center gap-2 font-medium text-gray-900 hover:underline"
          >
            {post.writer.avatarUrl && (
              <img
                src={post.writer.avatarUrl}
                alt={post.writer.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            )}
            {post.writer.name}
          </a>
          <span aria-hidden="true">&middot;</span>
          <time dateTime={post.publishedAt?.toISOString()}>
            {post.publishedAt ? formatDate(post.publishedAt) : "Draft"}
          </time>
          <span aria-hidden="true">&middot;</span>
          <span>{readingTime} min read</span>
        </div>
      </header>

      {hasAccess ? (
        <PostContent content={post.content} />
      ) : post.visibility === "PREVIEW" && paywallIndex != null ? (
        <PostContent
          content={post.content}
          paywallIndex={paywallIndex}
          writerName={post.writer.name}
          writerHandle={post.writer.handle}
          price={post.writer.monthlyPriceInCents ?? undefined}
        />
      ) : (
        <PaywallGate
          writerName={post.writer.name}
          writerHandle={post.writer.handle}
          price={post.writer.monthlyPriceInCents}
        />
      )}

      <footer className="mt-10 flex items-center justify-between border-t border-gray-200 pt-6">
        <LikeButton
          postId={post.id}
          initialLiked={liked}
          initialCount={post._count.likes}
          isLoggedIn={!!user}
        />
        <a
          href={`/${post.writer.handle}`}
          className="text-sm font-medium text-[var(--brand-600)] hover:underline"
        >
          More from {post.writer.name}
        </a>
      </footer>
    </article>
  );
}
```
### Writer publication page
The `[writer]` route (see the `src/app/[writer]/page.tsx` page in the repo) uses a handle to select the writer, fetches their shared content, and checks whether the current user follows the writer and is subscribed to them.
The page contains a `WriterHeader` element at the top (avatar, name, bio, follower/subscriber/post counts, follow and subscribe buttons) and below it, a `PostCard` element for each shared content (title, subtitle, cover image thumbnail, date, reading time, like/view counts).
 If the writer has a `whopChatChannelId`, a `WriterChat` section appears at the bottom. Access is gated by `chatPublic` so subscriber-only chat is enforced.  
See `src/components/writer/writer-header.tsx` and `src/components/post/post-card.tsx` in the repo.
### Like buttons in articles
To add the like button to the article pages, go to `src/components/post` and create a file called `like-button.tsx` with the content. The `isLoggedIn` prop lets us redirect unauthenticated users to the login page (with a `returnTo` URL) instead of silently failing:
```tsx
"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { formatCount } from "@/lib/utils";

interface LikeButtonProps {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
  isLoggedIn?: boolean;
}

export function LikeButton({
  postId,
  initialLiked,
  initialCount,
  isLoggedIn,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  async function handleToggle() {
    if (!isLoggedIn) {
      window.location.href = `/api/auth/login?returnTo=${window.location.pathname}`;
      return;
    }

    setLiked(!liked);
    setCount((c) => (liked ? c - 1 : c + 1));

    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLiked(data.liked);
      setCount(data.count);
    } catch {
      setLiked(liked);
      setCount(count);
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors ${
        liked
          ? "bg-red-50 text-red-600"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
      }`}
    >
      <Heart
        className={`h-4 w-4 ${liked ? "fill-red-500 text-red-500" : ""}`}
      />
      {formatCount(count)}
    </button>
  );
}
```
### Follow button
The follow mechanism (see `src/components/writer/writer-header.tsx` in the repo) mirrors the like pattern: POST to `/api/writers/[id]/follow`, revert on failure. If the user is not logged in, they are redirected to the login page with a `returnTo` URL pointing back to the writer's page. Following is a free relationship distinct from subscribing. When a user follows a writer, the server creates a Follow record and a `NEW_FOLLOWER` notification.
