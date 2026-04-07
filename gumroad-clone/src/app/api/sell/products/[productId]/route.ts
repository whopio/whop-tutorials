// src/app/api/sell/products/[productId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const updateProductSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(5000).optional(),
  price: z.number().int().min(0).optional(),
  category: z
    .enum([
      "TEMPLATES",
      "EBOOKS",
      "SOFTWARE",
      "DESIGN",
      "AUDIO",
      "VIDEO",
      "PHOTOGRAPHY",
      "EDUCATION",
      "OTHER",
    ])
    .optional(),
  content: z.string().max(50000).optional().nullable(),
  externalUrl: z.string().url().optional().nullable().or(z.literal("")),
  thumbnailUrl: z.string().url().optional().nullable(),
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
  removeFileIds: z.array(z.string()).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!sellerProfile) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { files: true },
  });

  if (!product || product.sellerProfileId !== sellerProfile.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  if (product.status === "PUBLISHED") {
    return NextResponse.json(
      { error: "Cannot edit a published product. Unpublish first." },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = updateProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { files, removeFileIds, ...fields } = parsed.data;

  // Remove files
  if (removeFileIds && removeFileIds.length > 0) {
    await prisma.productFile.deleteMany({
      where: { id: { in: removeFileIds }, productId },
    });
  }

  // Add new files
  if (files && files.length > 0) {
    const existingCount = product.files.length - (removeFileIds?.length || 0);
    await prisma.productFile.createMany({
      data: files.map((f, i) => ({
        productId,
        fileName: f.fileName,
        fileKey: f.fileKey,
        fileUrl: f.fileUrl,
        fileSize: f.fileSize,
        mimeType: f.mimeType,
        displayOrder: existingCount + i,
      })),
    });
  }

  // Update thumbnail if new image files were added
  const newThumbnail = files?.find((f) => f.mimeType.startsWith("image/"));

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      ...fields,
      externalUrl: fields.externalUrl || null,
      ...(newThumbnail && !product.thumbnailUrl
        ? { thumbnailUrl: newThumbnail.fileUrl }
        : {}),
    },
    include: { files: { orderBy: { displayOrder: "asc" } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sellerProfile = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });

  if (!sellerProfile) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product || product.sellerProfileId !== sellerProfile.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.product.delete({ where: { id: productId } });

  return NextResponse.json({ success: true });
}
