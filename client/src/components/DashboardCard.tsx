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
    <Card className="overflow-hidden card-hover animate-scale-in glow-on-hover group">
      <CardContent className="p-5 relative">
        {/* Animated gradient border effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-r from-primary via-secondary to-accent rounded-lg transition-opacity duration-500"></div>
        
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-neutral-600 font-medium group-hover:text-primary transition-colors duration-300">{title}</h3>
          <div className={`p-2 ${iconBgClass} ${iconColor} rounded-full transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
            <Icon className="h-5 w-5 animate-pulse-subtle" />
          </div>
        </div>
        <div className="flex items-end justify-between">
          <div className="transition-all duration-300 transform group-hover:translate-y-[-2px]">
            <p className="text-3xl font-bold text-neutral-800 group-hover:text-primary transition-colors duration-300">{value}</p>
            {trend && (
              <p className={`text-sm flex items-center ${trend.isPositive ? 'text-secondary' : 'text-destructive'} opacity-90 group-hover:opacity-100 transition-opacity duration-300`}>
                <span className={`mr-1 transition-transform duration-300 ${trend.isPositive ? 'group-hover:transform group-hover:translate-y-[-2px]' : 'group-hover:transform group-hover:translate-y-[2px]'}`}>
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
