import {Menu, Plus} from 'lucide-react';

interface TopBarProps {
  breadcrumbs: string[];
  onOpenMobileMenu: () => void;
  onOpenBridge: () => void;
}

export function TopBar({
  breadcrumbs,
  onOpenMobileMenu,
  onOpenBridge,
}: TopBarProps) {
  return (
    <header className="h-14 border-b border-[#1E293B] bg-[#0B0F17]/95 backdrop-blur-sm sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Abrir menú lateral"
          className="lg:hidden p-2 -ml-2 text-slate-300 hover:text-slate-100 hover:bg-[#161F30] rounded-md"
        >
          <Menu className="w-4 h-4" />
        </button>

        <nav aria-label="Ruta actual" className="flex items-center gap-2 text-sm min-w-0">
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <span key={`${crumb}-${index}`} className="flex items-center gap-2 min-w-0">
                {index > 0 && (
                  <span className="text-slate-600 shrink-0" aria-hidden="true">
                    /
                  </span>
                )}
                <span
                  className={`truncate ${
                    isLast
                      ? 'font-display font-semibold text-slate-100'
                      : 'text-slate-400'
                  }`}
                >
                  {crumb}
                </span>
              </span>
            );
          })}
        </nav>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenBridge}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-medium text-xs transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-amber-400"
        >
          <Plus className="w-3.5 h-3.5 shrink-0" />
          <span>Importar JSON</span>
        </button>
      </div>
    </header>
  );
}
