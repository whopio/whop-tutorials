import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStorySlug } from "@/lib/slug";

// Create a fresh draft and redirect to its editor.
export default async function NewStory() {
  const user = await requireAuth();
  const title = "Untitled draft";
  const slug = await generateStorySlug(user.id, title);

  const story = await prisma.story.create({
    data: {
      authorUserId: user.id,
      title,
      slug,
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
    },
  });

  redirect(`/edit/${story.id}`);
}
