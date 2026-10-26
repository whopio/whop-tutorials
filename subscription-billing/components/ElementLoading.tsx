import { Text } from "@whop/react/components";

// Whop's embedded forms take a few seconds to load in their own frame.
export function ElementLoading({ label }: { label: string }) {
  return (
    <div className="flex h-64 items-center justify-center">
      <Text size="2" color="gray">
        {label}
      </Text>
    </div>
  );
}
