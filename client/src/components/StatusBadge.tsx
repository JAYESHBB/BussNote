import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Status = "paid" | "pending" | "overdue" | "cancelled" | "draft";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusStyles = (status: Status) => {
    switch (status) {
      case "paid":
        return "bg-secondary-50 text-secondary border-secondary-100 hover:bg-secondary-100";
      case "pending":
        return "bg-accent-50 text-accent-700 border-accent-100 hover:bg-accent-100";
      case "overdue":
        return "bg-destructive-50 text-destructive border-destructive-100 hover:bg-destructive-100";
      case "cancelled":
        return "bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-neutral-200";
      case "draft":
        return "bg-primary-50 text-primary border-primary-100 hover:bg-primary-100";
      default:
        return "bg-neutral-100 text-neutral-700";
    }
  };

  const getStatusLabel = (status: Status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Badge 
      variant="outline" 
      className={cn("font-normal border", getStatusStyles(status), className)}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}
