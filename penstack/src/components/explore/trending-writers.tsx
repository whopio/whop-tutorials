import { WriterCard } from "@/components/writer/writer-card";

interface TrendingWriter {
  id: string;
  handle: string;
  name: string;
  bio?: string | null;
  avatarUrl?: string | null;
  category: string;
  _count: { followers: number; subscriptions: number };
}

interface TrendingWritersProps {
  writers: TrendingWriter[];
}

export function TrendingWriters({ writers }: TrendingWritersProps) {
  if (writers.length === 0) return null;

  return (
    <section>
      <h2 className="mb-4 font-serif text-2xl font-bold text-gray-900">
        Trending Publications
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none">
        {writers.map((writer) => (
          <WriterCard key={writer.id} writer={writer} />
        ))}
      </div>
    </section>
  );
}
