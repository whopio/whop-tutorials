"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Trash2, Eye } from "lucide-react";
import { formatDate, formatCount } from "@/lib/utils";

interface TablePost {
  id: string;
  slug: string;
  title: string;
  published: boolean;
  visibility: string;
  viewCount: number;
  publishedAt?: Date | string | null;
  createdAt: Date | string;
  _count: { likes: number };
}

interface PostsTableProps {
  posts: TablePost[];
  writerHandle: string;
}

export function PostsTable({
  posts: initialPosts,
  writerHandle,
}: PostsTableProps) {
  const [posts, setPosts] = useState(initialPosts);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      }
    } catch {
      alert("Failed to delete post.");
    }
  }

  if (posts.length === 0) {
    return (
      <div className="card py-12 text-center">
        <p className="text-gray-500">No posts yet. Start writing!</p>
        <Link href="/write" className="btn-primary mt-4 inline-flex">
          Create your first post
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50">
          <tr>
            <th className="px-4 py-3 font-medium text-gray-600">Title</th>
            <th className="px-4 py-3 font-medium text-gray-600">Status</th>
            <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-600">Visibility</th>
            <th className="px-4 py-3 font-medium text-gray-600">Views</th>
            <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-600">Likes</th>
            <th className="hidden md:table-cell px-4 py-3 font-medium text-gray-600">Date</th>
            <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {posts.map((post) => (
            <tr key={post.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link
                  href={`/${writerHandle}/${post.slug}`}
                  className="font-medium text-gray-900 hover:text-[var(--brand-600)]"
                >
                  {post.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                    post.published
                      ? "bg-green-50 text-green-700"
                      : "bg-yellow-50 text-yellow-700"
                  }`}
                >
                  {post.published ? "Published" : "Draft"}
                </span>
              </td>
              <td className="hidden md:table-cell px-4 py-3 text-gray-500 capitalize">
                {post.visibility.toLowerCase()}
              </td>
              <td className="px-4 py-3 text-gray-500">
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {formatCount(post.viewCount)}
                </span>
              </td>
              <td className="hidden md:table-cell px-4 py-3 text-gray-500">
                {formatCount(post._count.likes)}
              </td>
              <td className="hidden md:table-cell px-4 py-3 text-gray-500">
                {formatDate(String(post.publishedAt ?? post.createdAt))}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-1">
                  <Link
                    href={`/write?postId=${post.id}`}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
