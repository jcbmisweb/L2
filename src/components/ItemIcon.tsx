import {Package} from 'lucide-react';
import {useEffect, useState} from 'react';
import {ItemCatalogEntry} from '../types/l2';
import {
  DEFAULT_ICON_BASE_URL,
  normalizeItemKey,
  resolveItemIconUrl,
} from '../utils/storage';

interface ItemIconProps {
  name: string;
  itemCatalog: Record<string, ItemCatalogEntry>;
  iconBaseUrl?: string;
  size?: 'sm' | 'md';
  onClick?: () => void;
}

export function ItemIcon({
  name,
  itemCatalog,
  iconBaseUrl = DEFAULT_ICON_BASE_URL,
  size = 'sm',
  onClick,
}: ItemIconProps) {
  const key = normalizeItemKey(name);
  const entry = itemCatalog?.[key];
  const resolvedUrl = resolveItemIconUrl(entry?.icon, iconBaseUrl);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [resolvedUrl]);

  const dimClass = size === 'md' ? 'w-9 h-9' : 'w-7 h-7';
  const showImage = Boolean(resolvedUrl) && !failed;

  const inner = showImage ? (
    <img
      src={resolvedUrl!}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${dimClass} object-cover rounded-[3px] border border-[#283548] bg-[#0B0F17] shrink-0`}
    />
  ) : (
    <span
      className={`${dimClass} inline-flex items-center justify-center rounded-[3px] border border-[#1E293B] bg-[#0B0F17] text-slate-600 shrink-0`}
    >
      <Package className={size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />
    </span>
  );

  if (!onClick) {
    return inner;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={
        resolvedUrl
          ? `Cambiar icono de "${name}"`
          : `Asignar imagen a "${name}"`
      }
      aria-label={`Configurar imagen de ${name}`}
      className="group relative inline-flex shrink-0 rounded-[3px] focus-visible:outline-2 focus-visible:outline-amber-500 hover:ring-1 hover:ring-amber-400/70 transition-all"
    >
      {inner}
    </button>
  );
}
