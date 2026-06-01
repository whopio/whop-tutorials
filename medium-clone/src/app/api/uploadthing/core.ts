import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getAuthUser } from "@/lib/auth";

const f = createUploadthing();

async function authedMiddleware() {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return { userId: user.id };
}

export const storylineFileRouter = {
  storyCover: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(authedMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl, key: file.key };
    }),
  storyInlineImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(authedMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl, key: file.key };
    }),
  avatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(authedMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl, key: file.key };
    }),
} satisfies FileRouter;

export type StorylineFileRouter = typeof storylineFileRouter;
