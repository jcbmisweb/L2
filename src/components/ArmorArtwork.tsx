import {ArmorPalette} from '../data/armorSets';
import {ItemArmorType, ItemGradeCategory} from '../utils/storage';

interface ArmorArtworkProps {
  armorType: ItemArmorType;
  grade: ItemGradeCategory;
  palette: ArmorPalette;
  customImageUrl?: string;
  setName: string;
}

export function ArmorArtwork({
  armorType,
  grade,
  palette,
  customImageUrl,
  setName,
}: ArmorArtworkProps) {
  if (customImageUrl) {
    return (
      <div
        className="w-full h-full flex items-center justify-center p-1"
        style={{
          background: `radial-gradient(circle at 50% 40%, ${palette.secondary}26 0%, #0b0f17 85%)`,
        }}
      >
        <img
          src={customImageUrl}
          alt={setName}
          className="max-w-full max-h-full w-auto h-full object-contain rounded-[2px]"
        />
      </div>
    );
  }

  const isHeavy = armorType === 'Heavy Armor';
  const isLight = armorType === 'Light Armor';
  const gradeLabel = grade === 'No-Grade' ? 'NG' : grade;

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none px-3"
      style={{
        background: `radial-gradient(circle at 50% 35%, ${palette.secondary}40 0%, #0b0f17 88%)`,
      }}
    >
      {/* Subtle architectural frame lines */}
      <div
        className="absolute inset-2 border rounded-[3px] pointer-events-none opacity-25"
        style={{borderColor: palette.accent}}
      />

      {/* Top-left archetype watermark */}
      <span className="absolute top-2.5 left-3 font-mono text-[10px] tracking-widest uppercase text-slate-400/80">
        {isHeavy ? 'HEAVY' : isLight ? 'LIGHT' : 'ROBE'}
      </span>

      {/* Top-right grade badge */}
      <span
        className="absolute top-2.5 right-3 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] border"
        style={{
          borderColor: `${palette.accent}66`,
          color: palette.trim,
          backgroundColor: `${palette.secondary}55`,
        }}
      >
        {gradeLabel}
      </span>

      {/* Refined Heraldic Armor Crest */}
      <svg
        viewBox="0 0 120 140"
        className="w-24 h-28 drop-shadow-[0_6px_14px_rgba(0,0,0,0.6)]"
        aria-hidden="true"
      >
        {/* Outer shield aura */}
        <path
          d="M60 12 L102 28 L96 82 C92 106 76 122 60 130 C44 122 28 106 24 82 L18 28 Z"
          fill={`${palette.secondary}44`}
          stroke={palette.accent}
          strokeWidth="1.4"
        />
        <path
          d="M60 20 L93 33 L88 79 C85 99 72 112 60 119 C48 112 35 99 32 79 L27 33 Z"
          fill="#0B0F17"
          fillOpacity="0.55"
          stroke={palette.trim}
          strokeOpacity="0.35"
          strokeWidth="0.9"
        />

        {isHeavy ? (
          /* Heavy Plate Breastplate & Pauldrons Emblem */
          <g>
            <path
              d="M34 49 Q45 38 54 44 L51 58 L35 57 Z"
              fill={palette.primary}
              stroke={palette.accent}
              strokeWidth="1.3"
            />
            <path
              d="M86 49 Q75 38 66 44 L69 58 L85 57 Z"
              fill={palette.primary}
              stroke={palette.accent}
              strokeWidth="1.3"
            />
            <path
              d="M46 43 L74 43 L70 83 L60 94 L50 83 Z"
              fill={palette.primary}
              stroke={palette.trim}
              strokeWidth="1.3"
            />
            <path
              d="M60 46 L67 59 L60 76 L53 59 Z"
              fill={palette.accent}
            />
            <path
              d="M52 34 Q60 26 68 34 L67 41 L53 41 Z"
              fill={palette.secondary}
              stroke={palette.trim}
              strokeWidth="1"
            />
          </g>
        ) : isLight ? (
          /* Light Leather Brigandine & Twin Blades Emblem */
          <g>
            <path
              d="M40 36 L80 96"
              stroke={palette.trim}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
            />
            <path
              d="M80 36 L40 96"
              stroke={palette.trim}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.7"
            />
            <path
              d="M46 42 L74 42 L70 84 L60 95 L50 84 Z"
              fill={palette.primary}
              stroke={palette.accent}
              strokeWidth="1.4"
            />
            <path
              d="M50 44 L60 66 L70 44"
              fill="none"
              stroke={palette.accent}
              strokeWidth="2"
            />
            <path
              d="M42 46 Q49 38 56 43"
              fill="none"
              stroke={palette.trim}
              strokeWidth="1.4"
            />
            <path
              d="M78 46 Q71 38 64 43"
              fill="none"
              stroke={palette.trim}
              strokeWidth="1.4"
            />
          </g>
        ) : (
          /* Mystic Robe Mantle & Arcane Crest Emblem */
          <g>
            <circle
              cx="60"
              cy="40"
              r="7"
              fill={palette.secondary}
              stroke={palette.accent}
              strokeWidth="1.5"
            />
            <circle cx="60" cy="40" r="2.5" fill={palette.trim} />
            <path
              d="M39 50 L60 44 L81 50 L74 92 L60 100 L46 92 Z"
              fill={palette.primary}
              stroke={palette.trim}
              strokeWidth="1.2"
            />
            <path
              d="M44 51 L60 62 L76 51"
              fill="none"
              stroke={palette.accent}
              strokeWidth="1.8"
            />
            <path d="M60 62 L60 95" stroke={palette.accent} strokeWidth="2" />
          </g>
        )}
      </svg>

      <span className="mt-1 text-[11px] font-medium text-slate-400 text-center line-clamp-1">
        {setName}
      </span>
    </div>
  );
}
