export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) +
    "-" +
    Math.random().toString(36).slice(2, 8)
  );
}
