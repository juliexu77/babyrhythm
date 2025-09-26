import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="h-10 px-4 bg-background/80 backdrop-blur-sm border-border/50 min-w-fit whitespace-nowrap inline-flex items-center gap-2"
    >
      <span className="relative inline-block w-5 h-5 mr-1">
        <Sun className="absolute inset-0 h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute inset-0 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </span>
      <span className="text-sm font-medium">
        {theme === "dark" ? "Dark" : "Light"}
      </span>
    </Button>
  );
}