import { Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle() {
  const { theme } = useTheme();

  return (
    <Button 
      variant="outline" 
      size="icon" 
      className="h-8 w-8 rounded-full bg-background border-muted-foreground/20 hover:bg-muted transition-colors"
      disabled
    >
      <Sun className="h-[1.2rem] w-[1.2rem] text-amber-500" />
      <span className="sr-only">Light theme</span>
    </Button>
  );
}