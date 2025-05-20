import React from "react";
import { cn } from "@/lib/utils";

interface AnimatedIllustrationProps {
  className?: string;
  size?: number;
}

export function InvoiceIllustration({ className, size = 100 }: AnimatedIllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("animate-float", className)}
    >
      <rect 
        x="20" y="10" width="60" height="80" 
        rx="3" 
        className="fill-primary/10 stroke-primary" 
        strokeWidth="2"
      />
      <rect 
        x="28" y="25" width="44" height="3" 
        rx="1" 
        className="fill-primary/60"
      >
        <animate 
          attributeName="width" 
          values="10;44;44" 
          dur="2s" 
          repeatCount="indefinite" 
        />
      </rect>
      <rect 
        x="28" y="35" width="34" height="3" 
        rx="1" 
        className="fill-primary/50"
      >
        <animate 
          attributeName="width" 
          values="5;34;34" 
          dur="2s" 
          repeatCount="indefinite"
          begin="0.2s" 
        />
      </rect>
      <rect 
        x="28" y="45" width="40" height="3" 
        rx="1" 
        className="fill-primary/40"
      >
        <animate 
          attributeName="width" 
          values="8;40;40" 
          dur="2s" 
          repeatCount="indefinite"
          begin="0.4s" 
        />
      </rect>
      <rect 
        x="28" y="55" width="28" height="3" 
        rx="1" 
        className="fill-primary/30"
      >
        <animate 
          attributeName="width" 
          values="12;28;28" 
          dur="2s" 
          repeatCount="indefinite"
          begin="0.6s" 
        />
      </rect>
      
      <circle 
        cx="65" 
        cy="70" 
        r="12" 
        className="fill-accent/20 stroke-accent" 
        strokeWidth="2"
      >
        <animate 
          attributeName="r" 
          values="10;12;10" 
          dur="3s" 
          repeatCount="indefinite" 
        />
      </circle>
      <path 
        d="M60 70L63 73L70 66" 
        className="stroke-accent" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <animate 
          attributeName="opacity" 
          values="0;1;1" 
          dur="2s"
          begin="1s"
          repeatCount="indefinite" 
        />
      </path>
    </svg>
  );
}

export function DataAnalyticsIllustration({ className, size = 100 }: AnimatedIllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("animate-float", className)}
    >
      <rect 
        x="20" y="70" width="10" height="20" 
        rx="1" 
        className="fill-primary/70"
      >
        <animate 
          attributeName="height" 
          values="0;20;20" 
          dur="2s"
          begin="0.1s"
          repeatCount="indefinite" 
        />
        <animate 
          attributeName="y" 
          values="90;70;70" 
          dur="2s"
          begin="0.1s"
          repeatCount="indefinite" 
        />
      </rect>
      
      <rect 
        x="35" y="50" width="10" height="40" 
        rx="1" 
        className="fill-primary/80"
      >
        <animate 
          attributeName="height" 
          values="0;40;40" 
          dur="2s"
          begin="0.3s"
          repeatCount="indefinite" 
        />
        <animate 
          attributeName="y" 
          values="90;50;50" 
          dur="2s"
          begin="0.3s"
          repeatCount="indefinite" 
        />
      </rect>
      
      <rect 
        x="50" y="30" width="10" height="60" 
        rx="1" 
        className="fill-accent"
      >
        <animate 
          attributeName="height" 
          values="0;60;60" 
          dur="2s"
          begin="0.5s"
          repeatCount="indefinite" 
        />
        <animate 
          attributeName="y" 
          values="90;30;30" 
          dur="2s"
          begin="0.5s"
          repeatCount="indefinite" 
        />
      </rect>
      
      <rect 
        x="65" y="40" width="10" height="50" 
        rx="1" 
        className="fill-primary/90"
      >
        <animate 
          attributeName="height" 
          values="0;50;50" 
          dur="2s"
          begin="0.7s"
          repeatCount="indefinite" 
        />
        <animate 
          attributeName="y" 
          values="90;40;40" 
          dur="2s"
          begin="0.7s"
          repeatCount="indefinite" 
        />
      </rect>
      
      <rect 
        x="80" y="60" width="10" height="30" 
        rx="1" 
        className="fill-secondary"
      >
        <animate 
          attributeName="height" 
          values="0;30;30" 
          dur="2s"
          begin="0.9s"
          repeatCount="indefinite" 
        />
        <animate 
          attributeName="y" 
          values="90;60;60" 
          dur="2s"
          begin="0.9s"
          repeatCount="indefinite" 
        />
      </rect>
      
      <circle 
        cx="35" 
        cy="25" 
        r="15" 
        className="fill-background stroke-primary" 
        strokeWidth="2"
      />
      
      <path 
        d="M30 25L35 30L42 23" 
        className="stroke-primary" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <animate 
          attributeName="opacity" 
          values="0;1;1" 
          dur="3s"
          begin="1.5s"
          repeatCount="indefinite" 
        />
      </path>
    </svg>
  );
}

export function SuccessIllustration({ className, size = 100 }: AnimatedIllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <circle 
        cx="50" 
        cy="50" 
        r="30" 
        className="fill-green-100 stroke-green-500" 
        strokeWidth="2"
      >
        <animate 
          attributeName="r" 
          values="0;30;28;30" 
          dur="1s" 
          repeatCount="1" 
        />
      </circle>
      
      <path 
        d="M35 50L45 60L65 40" 
        className="stroke-green-500" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <animate 
          attributeName="stroke-dasharray" 
          values="0,100;100,0" 
          dur="1s"
          begin="0.5s"
          repeatCount="1" 
        />
      </path>
      
      <circle 
        cx="50" 
        cy="50" 
        r="40" 
        className="fill-none stroke-green-300" 
        strokeWidth="2"
        strokeDasharray="6 2"
      >
        <animate 
          attributeName="r" 
          values="30;40" 
          dur="1s"
          begin="0.7s"
          repeatCount="1" 
        />
        <animate 
          attributeName="opacity" 
          values="0;0.5" 
          dur="1s"
          begin="0.7s"
          repeatCount="1" 
        />
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 50 50"
          to="360 50 50"
          dur="15s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

export function LoadingDataIllustration({ className, size = 100 }: AnimatedIllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <rect 
        x="20" 
        y="20" 
        width="60" 
        height="60" 
        rx="3" 
        className="fill-none stroke-primary/30" 
        strokeWidth="2"
        strokeDasharray="5 3"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 50 50; 360 50 50"
          dur="10s"
          repeatCount="indefinite"
        />
      </rect>
      
      <circle 
        cx="50" 
        cy="50" 
        r="20" 
        className="fill-none stroke-primary" 
        strokeWidth="3"
        strokeDasharray="40 60"
        strokeDashoffset="0"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 50 50; 360 50 50"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      
      <circle 
        cx="50" 
        cy="50" 
        r="30" 
        className="fill-none stroke-secondary" 
        strokeWidth="3"
        strokeDasharray="60 90"
        strokeDashoffset="40"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 50 50; -360 50 50"
          dur="3s"
          repeatCount="indefinite"
        />
      </circle>
      
      <circle 
        cx="50" 
        cy="50" 
        r="15" 
        className="fill-accent/20" 
      >
        <animate
          attributeName="r"
          values="15; 12; 15"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      
      <text 
        x="50" 
        y="53" 
        textAnchor="middle" 
        className="fill-primary text-xs font-bold"
        style={{ fontSize: '8px' }}
      >LOADING</text>
    </svg>
  );
}

export function ProcessingIllustration({ className, size = 100 }: AnimatedIllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <path 
        d="M50 20 L70 40 L50 60 L30 40 Z" 
        className="fill-primary/20 stroke-primary" 
        strokeWidth="2"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 50 50; 45 50 50; 0 50 50"
          dur="3s"
          repeatCount="indefinite"
        />
      </path>
      
      <path 
        d="M50 35 L60 45 L50 55 L40 45 Z" 
        className="fill-accent/40 stroke-accent" 
        strokeWidth="1.5"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 50 50; -45 50 50; 0 50 50"
          dur="4s"
          repeatCount="indefinite"
        />
      </path>
      
      <circle 
        cx="50" 
        cy="50" 
        r="30" 
        className="fill-none stroke-secondary/50" 
        strokeWidth="1"
        strokeDasharray="3 3"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 50 50; 360 50 50"
          dur="15s"
          repeatCount="indefinite"
        />
      </circle>
      
      <circle 
        cx="30" 
        cy="30" 
        r="3" 
        className="fill-primary"
      >
        <animate
          attributeName="cx"
          values="30; 70; 70; 30; 30"
          dur="4s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="cy"
          values="30; 30; 70; 70; 30"
          dur="4s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

export function ErrorIllustration({ className, size = 100 }: AnimatedIllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(className)}
    >
      <circle 
        cx="50" 
        cy="50" 
        r="30" 
        className="fill-destructive/10 stroke-destructive" 
        strokeWidth="2"
      >
        <animate
          attributeName="r"
          values="30; 32; 30"
          dur="2s"
          repeatCount="indefinite"
        />
      </circle>
      
      <line 
        x1="38" 
        y1="38" 
        x2="62" 
        y2="62" 
        className="stroke-destructive" 
        strokeWidth="4" 
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-width"
          values="4; 5; 4"
          dur="2s"
          repeatCount="indefinite"
        />
      </line>
      
      <line 
        x1="62" 
        y1="38" 
        x2="38" 
        y2="62" 
        className="stroke-destructive" 
        strokeWidth="4" 
        strokeLinecap="round"
      >
        <animate
          attributeName="stroke-width"
          values="4; 5; 4"
          dur="2s"
          repeatCount="indefinite"
        />
      </line>
      
      <circle 
        cx="50" 
        cy="50" 
        r="40" 
        className="fill-none stroke-destructive/30" 
        strokeWidth="2"
        strokeDasharray="5 3"
      >
        <animateTransform
          attributeName="transform"
          type="rotate"
          values="0 50 50; 360 50 50"
          dur="8s"
          repeatCount="indefinite"
        />
      </circle>
    </svg>
  );
}

export function EmptyStateIllustration({ className, size = 100 }: AnimatedIllustrationProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("animate-float", className)}
    >
      <rect 
        x="30" 
        y="20" 
        width="40" 
        height="50" 
        rx="2" 
        className="fill-muted/30 stroke-muted-foreground/50" 
        strokeWidth="1"
        strokeDasharray="4 2"
      />
      
      <line 
        x1="40" 
        y1="30" 
        x2="60" 
        y2="30" 
        className="stroke-muted-foreground/50" 
        strokeWidth="1" 
      />
      
      <line 
        x1="40" 
        y1="40" 
        x2="60" 
        y2="40" 
        className="stroke-muted-foreground/40" 
        strokeWidth="1" 
      />
      
      <line 
        x1="40" 
        y1="50" 
        x2="60" 
        y2="50" 
        className="stroke-muted-foreground/30" 
        strokeWidth="1" 
      />
      
      <circle 
        cx="50" 
        cy="65" 
        r="2" 
        className="fill-muted-foreground/60" 
      />
      
      <circle 
        cx="50" 
        cy="80" 
        r="10" 
        className="fill-none stroke-muted-foreground/30" 
        strokeWidth="1"
      />
      
      <path 
        d="M44 80 L48 84 L56 76" 
        className="fill-none stroke-muted-foreground/50" 
        strokeWidth="1" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        strokeDasharray="12"
        strokeDashoffset="12"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="12; 0; 0; 12"
          dur="4s"
          repeatCount="indefinite"
        />
      </path>
    </svg>
  );
}