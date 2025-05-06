import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivityItemProps {
  icon: LucideIcon;
  iconBgClass: string;
  iconColor: string;
  title: string;
  description: string;
  timestamp: string;
}

export function ActivityItem({
  icon: Icon,
  iconBgClass,
  iconColor,
  title,
  description,
  timestamp,
}: ActivityItemProps) {
  return (
    <div className="flex">
      <div className="flex-shrink-0">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center", iconBgClass)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-neutral-800">{title}</p>
        <p className="text-sm text-neutral-500">{description}</p>
        <p className="text-xs text-neutral-400 mt-1">{timestamp}</p>
      </div>
    </div>
  );
}
