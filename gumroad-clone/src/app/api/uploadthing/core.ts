// src/app/api/uploadthing/core.ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getSession } from "@/lib/session";

const f = createUploadthing();

export const ourFileRouter = {
  productFile: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    video: { maxFileSize: "16MB", maxFileCount: 10 },
  })
    .middleware(async () => {
      const session = await getSession();
      if (!session.userId) throw new UploadThingError("Unauthorized");
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return {
        uploadedBy: metadata.userId,
        name: file.name,
        size: file.size,
        key: file.key,
        url: file.ufsUrl,
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
