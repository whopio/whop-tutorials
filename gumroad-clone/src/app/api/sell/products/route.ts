import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateSlug } from "@/lib/utils";

const createProductSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(5000),
  price: z.number().int().min(0), // cents
  category: z.enum([
    "TEMPLATES",
    "EBOOKS",
    "SOFTWARE",
    "DESIGN",
    "AUDIO",
    "VIDEO",
    "PHOTOGRAPHY",
    "EDUCATION",
    "OTHER",
  ]),
  content: z.string().max(50000).optional(),
  externalUrl: z.string().url().optional().or(z.literal("")),
  files: z
    .array(
      z.object({
        fileName: z.string(),
        fileKey: z.string(),
        fileUrl: z.string().url(),
        fileSize: z.number().int(),
        mimeType: z.string(),
      })
    )
    .optional(),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!sellerProfile || !sellerProfile.kycComplete) {
    return NextResponse.json(
      { error: "Complete seller onboarding first" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { title, description, price, category, content, externalUrl, files } =
    parsed.data;

  const slug = generateSlug(title);

  // Find the first image file for thumbnail
  const thumbnailFile = files?.find((f) => f.mimeType.startsWith("image/"));

  const product = await prisma.product.create({
    data: {
      sellerProfileId: sellerProfile.id,
      title,
      slug,
      description,
      price,
      category,
      content: content || null,
      externalUrl: externalUrl || null,
      thumbnailUrl: thumbnailFile?.fileUrl || null,
      files: files
        ? {
            create: files.map((f, i) => ({
              fileName: f.fileName,
              fileKey: f.fileKey,
              fileUrl: f.fileUrl,
              fileSize: f.fileSize,
              mimeType: f.mimeType,
              displayOrder: i,
            })),
          }
        : undefined,
    },
    include: { files: true },
  });

  return NextResponse.json(product, { status: 201 });
}
