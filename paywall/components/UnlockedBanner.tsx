import { Badge, Text } from "@whop/react/components";
import { StepAnchor } from "@/components/StepAnchor";

interface Entitlement {
  label: string;
  granted: boolean;
}

interface UnlockedBannerProps {
  username?: string;
  checkedAt: string;
  entitlements: Entitlement[];
}

export function UnlockedBanner({
  username,
  checkedAt,
  entitlements,
}: UnlockedBannerProps) {
  return (
    <div className="rounded-xl border border-[#E5E4E0] bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge color="green" variant="soft">
          Unlocked
        </Badge>

        <StepAnchor id="verify">
          <Text size="2" weight="medium">
            @{username ?? "member"}
          </Text>
        </StepAnchor>

        <StepAnchor id="session">
          <Badge color="gray" variant="soft">
            whop_session
          </Badge>
        </StepAnchor>

        <StepAnchor id="entitlement">
          <span className="inline-flex flex-wrap items-center gap-1.5">
            {entitlements.map((entitlement) => (
              <Badge
                key={entitlement.label}
                color={entitlement.granted ? "green" : "gray"}
                variant={entitlement.granted ? "soft" : "outline"}
              >
                {entitlement.granted ? "✓ " : "– "}
                {entitlement.label}
              </Badge>
            ))}
          </span>
        </StepAnchor>
      </div>

      <div className="mt-1.5">
        <StepAnchor id="access-check">
          <Text size="1" color="gray">
            Access checked at {checkedAt}
          </Text>
        </StepAnchor>
      </div>
    </div>
  );
}
