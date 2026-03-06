"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { PublicationCategory } from "@/generated/prisma/browser";
import { CATEGORY_LABELS } from "@/constants/categories";
import { UploadZone } from "@/components/ui/upload-zone";

const STEPS = ["Publication", "About", "Images", "Category"] as const;

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [category, setCategory] = useState<PublicationCategory>("OTHER");

  function generateHandle(text: string) {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }

  function handleNameChange(value: string) {
    setName(value);
    setHandle(generateHandle(value));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/writers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          handle,
          bio: bio || undefined,
          avatarUrl:
            avatarUrl ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=256`,
          bannerUrl: bannerUrl || undefined,
          category,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create publication.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      {/* Progress */}
      <div className="mb-8 flex items-center justify-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                i < step
                  ? "bg-green-500 text-white"
                  : i === step
                    ? "bg-[var(--brand-600)] text-white"
                    : "bg-gray-100 text-gray-400"
              }`}
            >
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-8 ${
                  i < step ? "bg-green-500" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <h2 className="mb-6 font-serif text-2xl font-bold text-gray-900">
          {step === 0 && "Name your publication"}
          {step === 1 && "Tell readers about yourself"}
          {step === 2 && "Add your images"}
          {step === 3 && "Choose a category"}
        </h2>

        {/* Step 0: Name + Handle */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Publication name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Newsletter"
                className="input"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Handle
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-gray-400">penstack.com/</span>
                <input
                  type="text"
                  value={handle}
                  onChange={(e) => setHandle(generateHandle(e.target.value))}
                  placeholder="my-newsletter"
                  className="input"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Bio */}
        {step === 1 && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              placeholder="Tell readers what your publication is about..."
              className="input resize-none"
            />
          </div>
        )}

        {/* Step 2: Images */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              {avatarUrl ? (
                <div className="flex items-center gap-4">
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                  <button
                    onClick={() => setAvatarUrl("")}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <UploadZone
                  endpoint="avatarUploader"
                  onUploadComplete={setAvatarUrl}
                  label="Avatar"
                />
              )}
            </div>
            <div>
              {bannerUrl ? (
                <div className="space-y-2">
                  <img
                    src={bannerUrl}
                    alt="Banner"
                    className="h-32 w-full rounded-lg object-cover"
                  />
                  <button
                    onClick={() => setBannerUrl("")}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <UploadZone
                  endpoint="bannerUploader"
                  onUploadComplete={setBannerUrl}
                  label="Banner"
                />
              )}
            </div>
          </div>
        )}

        {/* Step 3: Category */}
        {step === 3 && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.values(PublicationCategory).map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  category === cat
                    ? "border-[var(--brand-600)] bg-[var(--brand-600)]/5 text-[var(--brand-600)]"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600">{error}</p>
        )}

        {/* Navigation */}
        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-ghost"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 && (!name.trim() || !handle.trim())}
              className="btn-primary"
            >
              Next
              <ArrowRight className="ml-1 h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary"
            >
              {loading && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Create publication
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
