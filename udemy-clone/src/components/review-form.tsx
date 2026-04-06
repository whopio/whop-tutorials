"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

export function ReviewForm({
  courseId,
  existingReview,
}: {
  courseId: string;
  existingReview?: { rating: number; comment: string | null } | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState(existingReview?.comment || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      setError("Please select a rating");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/courses/${courseId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || "" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(typeof data.error === "string" ? data.error : "Failed to submit review");
        return;
      }
      setSuccess(true);
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="p-5 rounded-lg bg-[var(--color-success)]/10 border border-[var(--color-success)]/20 text-center">
        <p className="text-[var(--color-success)] font-medium">
          {existingReview ? "Review updated!" : "Review submitted!"}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
      <h3 className="font-semibold mb-4">
        {existingReview ? "Update your review" : "Write a review"}
      </h3>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-[var(--color-error)]/10 text-[var(--color-error)] text-sm">
          {error}
        </div>
      )}

      <div className="flex items-center gap-1 mb-4">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredStar(star)}
            onMouseLeave={() => setHoveredStar(0)}
            className="p-0.5"
          >
            <Star
              className={`w-7 h-7 transition-colors ${
                star <= (hoveredStar || rating)
                  ? "fill-[var(--color-warning)] text-[var(--color-warning)]"
                  : "text-[var(--color-border)] hover:text-[var(--color-warning)]"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-sm text-[var(--color-text-secondary)]">
            {rating}/5
          </span>
        )}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Share your experience (optional)"
        rows={3}
        maxLength={1000}
        className="w-full px-4 py-3 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)] text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] resize-none mb-4"
      />

      <button
        type="submit"
        disabled={loading || rating === 0}
        className="px-6 py-2.5 rounded-lg bg-[var(--color-accent)] text-white text-sm font-semibold hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
      >
        {loading ? "Submitting..." : existingReview ? "Update Review" : "Submit Review"}
      </button>
    </form>
  );
}
