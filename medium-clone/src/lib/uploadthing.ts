import {
  generateUploadButton,
  generateUploadDropzone,
  generateReactHelpers,
} from "@uploadthing/react";
import type { StorylineFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<StorylineFileRouter>();
export const UploadDropzone = generateUploadDropzone<StorylineFileRouter>();
export const { useUploadThing, uploadFiles } = generateReactHelpers<StorylineFileRouter>();
