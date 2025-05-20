import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";

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
  isLoading?: boolean;
}

export function DashboardCard({ 
  title, 
  value, 
  icon: Icon, 
  iconBgClass, 
  iconColor,
  trend,
  isLoading = false
}: DashboardCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-5 relative min-h-[150px]">
        
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingState
              type="data"
              title={`Loading ${title}`}
              message="Please wait..."
              size="sm"
            />
          </div>
        ) : (
          <>
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
                  <p className={`text-sm flex items-center ${trend.isPositive ? 'text-secondary' : 'text-destructive'}`}>
                    <span className="mr-1">
                      {trend.isPositive ? '↑' : '↓'}
                    </span>
                    <span>{trend.value}</span>
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
