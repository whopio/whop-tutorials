import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const f = createUploadthing();

const inputSchema = z.object({ templateId: z.string().min(1) });

async function authorizeUpload(templateId: string) {
  const session = await getSession();
  if (!session.userId) throw new UploadThingError("Unauthorized");

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      sellerProfile: { select: { userId: true } },
    },
  });
  if (!template) throw new UploadThingError("Template not found");
  if (template.sellerProfile.userId !== session.userId) {
    throw new UploadThingError("You don't own this template");
  }
  return { templateId: template.id, userId: session.userId };
}

export const ourFileRouter = {
  // Public preview images shown on the template detail page
  preview: f({
    image: { maxFileSize: "8MB", maxFileCount: 6 },
  })
    .input(inputSchema)
    .middleware(async ({ input }) => authorizeUpload(input.templateId))
    .onUploadComplete(async ({ metadata, file }) => {
      const count = await prisma.templateFile.count({
        where: { templateId: metadata.templateId, kind: "PREVIEW" },
      });
      const created = await prisma.templateFile.create({
        data: {
          templateId: metadata.templateId,
          kind: "PREVIEW",
          fileName: file.name,
          fileKey: file.key,
          fileUrl: file.ufsUrl,
          fileSize: file.size,
          mimeType: file.type,
          displayOrder: count,
        },
      });
      // First preview image becomes the thumbnail by default
      if (count === 0) {
        await prisma.template.update({
          where: { id: metadata.templateId },
          data: { thumbnailUrl: file.ufsUrl },
        });
      }
      return { fileId: created.id, url: file.ufsUrl };
    }),

  // Post-purchase downloadable files
  downloadable: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    video: { maxFileSize: "16MB", maxFileCount: 5 },
    blob: { maxFileSize: "16MB", maxFileCount: 10 },
  })
    .input(inputSchema)
    .middleware(async ({ input }) => authorizeUpload(input.templateId))
    .onUploadComplete(async ({ metadata, file }) => {
      const count = await prisma.templateFile.count({
        where: { templateId: metadata.templateId, kind: "DOWNLOAD" },
      });
      const created = await prisma.templateFile.create({
        data: {
          templateId: metadata.templateId,
          kind: "DOWNLOAD",
          fileName: file.name,
          fileKey: file.key,
          fileUrl: file.ufsUrl,
          fileSize: file.size,
          mimeType: file.type,
          displayOrder: count,
        },
      });
      return { fileId: created.id, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
