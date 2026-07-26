'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Alternar tema"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          {isDark ? <Sun /> : <Moon />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Alternar tema</TooltipContent>
    </Tooltip>
  );
}
