import { Users, CreditCard, Eye, FileText, DollarSign } from "lucide-react";
import { formatCount, formatPrice } from "@/lib/utils";

interface StatsCardsProps {
  stats: {
    subscribers: number;
    followers: number;
    totalViews: number;
    totalPosts: number;
    revenue?: number; // in cents
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      label: "Subscribers",
      value: formatCount(stats.subscribers),
      icon: CreditCard,
    },
    {
      label: "Followers",
      value: formatCount(stats.followers),
      icon: Users,
    },
    {
      label: "Total Views",
      value: formatCount(stats.totalViews),
      icon: Eye,
    },
    {
      label: "Posts",
      value: formatCount(stats.totalPosts),
      icon: FileText,
    },
    ...(stats.revenue != null
      ? [
          {
            label: "Revenue",
            value: formatPrice(stats.revenue),
            icon: DollarSign,
          },
        ]
      : []),
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div key={card.label} className="card flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
            <card.icon className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className="text-lg font-semibold text-gray-900">{card.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
