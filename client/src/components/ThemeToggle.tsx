import { Moon, Sun, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full bg-background border-muted-foreground/20 hover:bg-muted transition-colors"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all text-amber-500 dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all text-indigo-400 dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem] overflow-hidden rounded-md border border-muted-foreground/20">
        <DropdownMenuItem 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setTheme("light")}
        >
          <Sun className="h-4 w-4 text-amber-500" />
          <span className={theme === "light" ? "font-medium" : ""}>Light</span>
          {theme === "light" && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"></span>}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setTheme("dark")}
        >
          <Moon className="h-4 w-4 text-indigo-400" />
          <span className={theme === "dark" ? "font-medium" : ""}>Dark</span>
          {theme === "dark" && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"></span>}
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setTheme("system")}
        >
          <Laptop className="h-4 w-4 text-muted-foreground" />
          <span className={theme === "system" ? "font-medium" : ""}>System</span>
          {theme === "system" && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"></span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}