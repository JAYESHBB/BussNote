import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  iconBgClass: string;
  iconColor: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function DashboardCard({ 
  title, 
  value, 
  icon: Icon, 
  iconBgClass, 
  iconColor,
  trend 
}: DashboardCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-neutral-600 font-medium">{title}</h3>
          <div className={`p-2 ${iconBgClass} ${iconColor} rounded-full`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-neutral-800">{value}</p>
            {trend && (
              <p className={`text-sm flex items-center ${trend.isPositive ? 'text-secondary-500' : 'text-destructive'}`}>
                <span className="mr-1">
                  {trend.isPositive ? '↑' : '↓'}
                </span>
                <span>{trend.value}</span>
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
