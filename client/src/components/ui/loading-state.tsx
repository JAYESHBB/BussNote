import React from "react";
import { cn } from "@/lib/utils";
import { Loader2, FileCheck, PenTool, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";

type AnimatedIllustration = 
  | "default" // Spinner
  | "invoice" // Document with pen
  | "success" // Check mark
  | "error" // Error symbol
  | "data" // Data loading
  | "sync" // Sync animation

interface LoadingStateProps {
  title?: string;
  message?: string;
  type?: AnimatedIllustration;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const illustrationColors = {
  primary: "text-primary",
  secondary: "text-secondary",
  accent: "text-accent",
  muted: "text-muted-foreground",
  background: "text-background"
};

export function LoadingState({
  title = "Loading...",
  message = "Please wait while we process your request",
  type = "default",
  size = "md",
  className
}: LoadingStateProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-10 w-10",
    lg: "h-16 w-16",
    xl: "h-24 w-24",
  };

  const containerClasses = {
    sm: "p-2 space-y-1",
    md: "p-4 space-y-2",
    lg: "p-6 space-y-3",
    xl: "p-8 space-y-4",
  };

  const getIconByType = () => {
    switch (type) {
      case "invoice":
        return (
          <div className="relative">
            <FileCheck className={cn(sizeClasses[size], "animate-pulse-subtle text-primary")} />
            <PenTool className={cn(sizeClasses.sm, "absolute bottom-0 right-0 text-accent animate-float")} />
          </div>
        );
      case "success":
        return <CheckCircle2 className={cn(sizeClasses[size], "text-green-500 animate-scale-in")} />;
      case "error":
        return <AlertTriangle className={cn(sizeClasses[size], "text-destructive animate-pulse-subtle")} />;
      case "data":
        return (
          <div className="relative">
            <div className={cn(sizeClasses[size], "rounded-full border-4 border-background relative")}>
              <div className="absolute inset-0 border-t-4 border-primary rounded-full animate-spin"></div>
              <div className="absolute inset-1 border-t-4 border-accent rounded-full animate-spin" style={{ animationDuration: "1.5s" }}></div>
              <div className="absolute inset-2 border-t-4 border-secondary rounded-full animate-spin" style={{ animationDuration: "2s" }}></div>
            </div>
          </div>
        );
      case "sync":
        return <RefreshCw className={cn(sizeClasses[size], "text-primary animate-spin")} />;
      case "default":
      default:
        return <Loader2 className={cn(sizeClasses[size], "text-primary animate-spin")} />;
    }
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center",
      containerClasses[size],
      className
    )}>
      <div className="relative">
        {getIconByType()}
      </div>
      
      {title && (
        <h3 className={cn(
          "text-center font-semibold animate-fade-in",
          {
            "text-sm": size === "sm",
            "text-base": size === "md",
            "text-lg": size === "lg",
            "text-xl": size === "xl",
          }
        )}>
          {title}
        </h3>
      )}
      
      {message && (
        <p className={cn(
          "text-center text-muted-foreground max-w-sm animate-fade-in",
          {
            "text-xs": size === "sm",
            "text-sm": size === "md",
            "text-base": size === "lg",
            "text-lg": size === "xl",
          }
        )}>
          {message}
        </p>
      )}
    </div>
  );
}

export function LoadingOverlay({
  title,
  message,
  type = "default",
  size = "lg",
  className,
  isLoading = true
}: LoadingStateProps & { isLoading?: boolean }) {
  if (!isLoading) return null;
  
  return (
    <div className={cn(
      "fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center",
      className
    )}>
      <div className="bg-card rounded-lg shadow-lg p-8 max-w-md w-full animate-scale-in">
        <LoadingState
          title={title}
          message={message}
          type={type}
          size={size}
        />
      </div>
    </div>
  );
}

// Animated empty state component with illustration
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center text-center p-8 animate-fade-in",
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground animate-float">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2 animate-slide-in-bottom" style={{ animationDelay: "0.1s" }}>
        {title}
      </h3>
      {description && (
        <p className="text-muted-foreground mb-6 max-w-sm animate-slide-in-bottom" style={{ animationDelay: "0.2s" }}>
          {description}
        </p>
      )}
      {action && (
        <div className="animate-slide-in-bottom" style={{ animationDelay: "0.3s" }}>
          {action}
        </div>
      )}
    </div>
  );
}

export function SkeletonLoader({
  className,
  height = "h-6",
  width = "w-full",
  animate = true
}: {
  className?: string;
  height?: string;
  width?: string;
  animate?: boolean;
}) {
  return (
    <div 
      className={cn(
        "bg-muted rounded-md",
        height,
        width,
        animate && "animate-shimmer bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:400%_100%]",
        className
      )}
    />
  );
}