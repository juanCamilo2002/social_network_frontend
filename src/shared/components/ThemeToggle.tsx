import { Moon, Sun } from 'lucide-react';

import { useTheme } from '../theme/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={
        theme === 'light' ? 'Activar tema oscuro' : 'Activar tema claro'
      }
      className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-foreground"
    >
      {theme === 'light' ? (
        <Moon aria-hidden="true" className="size-4" strokeWidth={1.6} />
      ) : (
        <Sun aria-hidden="true" className="size-4" strokeWidth={1.6} />
      )}
      <span>{theme === 'light' ? 'Oscuro' : 'Claro'}</span>
    </button>
  );
}
