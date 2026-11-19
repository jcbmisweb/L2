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
      <img
        src={customImageUrl}
        alt={setName}
        className="w-full h-full object-cover object-top"
      />
    );
  }

  const isHeavy = armorType === 'Heavy Armor';
  const isLight = armorType === 'Light Armor';
  const gradeLabel = grade === 'No-Grade' ? 'NG' : grade;

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden select-none"
      style={{
        background: `radial-gradient(circle at 50% 25%, ${palette.secondary}44 0%, #0b0f17 85%)`,
      }}
    >
      {/* Subtle grid texture */}
      <div
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(to right, ${palette.accent}22 1px, transparent 1px), linear-gradient(to bottom, ${palette.accent}22 1px, transparent 1px)`,
          backgroundSize: '18px 18px',
        }}
      />

      {/* Top-left archetype watermark */}
      <span className="absolute top-1.5 left-2 font-mono text-[9px] tracking-widest uppercase text-slate-400/80">
        {isHeavy ? 'HEAVY' : isLight ? 'LIGHT' : 'ROBE'}
      </span>

      {/* Top-right grade watermark */}
      <span
        className="absolute top-1.5 right-2 font-mono text-[9px] font-bold px-1 py-0.5 rounded-[2px] border"
        style={{
          borderColor: `${palette.accent}66`,
          color: palette.trim,
          backgroundColor: `${palette.secondary}55`,
        }}
      >
        {gradeLabel}
      </span>

      {/* Stylized L2 character-in-armor silhouette */}
      <svg
        viewBox="0 0 120 150"
        className="w-[82%] h-[82%] drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)]"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`grad-${armorType}-${grade}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.primary} />
            <stop offset="100%" stopColor={palette.secondary} />
          </linearGradient>
        </defs>

        {/* Ground shadow */}
        <ellipse cx="60" cy="142" rx="30" ry="4" fill="#000000" opacity="0.55" />

        {isHeavy ? (
          /* HEAVY KNIGHT SILHOUETTE */
          <g>
            {/* Cape backdrop */}
            <path d="M35 42 L85 42 L94 128 L26 128 Z" fill={palette.secondary} opacity="0.7" />
            {/* Helmet & crest */}
            <path d="M49 16 Q60 6 71 16 L72 32 L48 32 Z" fill={palette.primary} stroke={palette.trim} strokeWidth="1.2" />
            <path d="M56 12 L60 4 L64 12" fill={palette.accent} />
            <rect x="53" y="21" width="14" height="3" rx="1" fill="#0b0f17" />
            {/* Massive pauldrons */}
            <path d="M22 44 Q33 30 48 38 L46 56 L24 54 Z" fill={palette.primary} stroke={palette.accent} strokeWidth="1.4" />
            <path d="M98 44 Q87 30 72 38 L74 56 L96 54 Z" fill={palette.primary} stroke={palette.accent} strokeWidth="1.4" />
            {/* Breastplate */}
            <path d="M42 36 L78 36 L74 78 L46 78 Z" fill={palette.primary} stroke={palette.trim} strokeWidth="1.2" />
            <path d="M60 39 L68 52 L60 68 L52 52 Z" fill={palette.accent} opacity="0.85" />
            {/* Belt */}
            <rect x="45" y="75" width="30" height="6" rx="1" fill={palette.secondary} stroke={palette.accent} strokeWidth="1" />
            {/* Gauntlets / arms */}
            <path d="M25 55 L38 55 L34 88 L22 86 Z" fill={palette.secondary} stroke={palette.trim} strokeWidth="1" />
            <path d="M82 55 L95 55 L98 86 L86 88 Z" fill={palette.secondary} stroke={palette.trim} strokeWidth="1" />
            {/* Greaves & tassets */}
            <path d="M44 81 L58 81 L55 135 L39 135 Z" fill={palette.primary} stroke={palette.trim} strokeWidth="1.2" />
            <path d="M62 81 L76 81 L81 135 L65 135 Z" fill={palette.primary} stroke={palette.trim} strokeWidth="1.2" />
            <path d="M40 120 L56 120 L55 137 L37 137 Z" fill={palette.secondary} stroke={palette.accent} strokeWidth="1" />
            <path d="M64 120 L80 120 L83 137 L65 137 Z" fill={palette.secondary} stroke={palette.accent} strokeWidth="1" />
          </g>
        ) : isLight ? (
          /* LIGHT RANGER / DAGGER SILHOUETTE */
          <g>
            {/* Hood / agile helm */}
            <path d="M50 15 Q60 7 70 15 L69 32 L51 32 Z" fill={palette.secondary} stroke={palette.trim} strokeWidth="1.1" />
            <path d="M53 20 L67 20 L65 29 L55 29 Z" fill="#0f172a" />
            {/* Sleek shoulder guards */}
            <path d="M31 41 Q41 33 48 37 L46 50 L32 49 Z" fill={palette.primary} stroke={palette.accent} strokeWidth="1.2" />
            <path d="M89 41 Q79 33 72 37 L74 50 L88 49 Z" fill={palette.primary} stroke={palette.accent} strokeWidth="1.2" />
            {/* Leather jerkin */}
            <path d="M45 36 L75 36 L71 78 L49 78 Z" fill={palette.primary} stroke={palette.trim} strokeWidth="1.1" />
            <path d="M49 38 L60 58 L71 38" fill="none" stroke={palette.accent} strokeWidth="1.8" />
            {/* Waist coat tails */}
            <path d="M47 78 L73 78 L80 105 L64 96 L56 96 L40 105 Z" fill={palette.secondary} opacity="0.9" />
            {/* Arms */}
            <path d="M32 50 L43 50 L38 84 L28 82 Z" fill={palette.secondary} stroke={palette.trim} strokeWidth="1" />
            <path d="M77 50 L88 50 L92 82 L82 84 Z" fill={palette.secondary} stroke={palette.trim} strokeWidth="1" />
            {/* Legs & agile boots */}
            <path d="M47 79 L58 79 L54 135 L42 135 Z" fill={palette.primary} stroke={palette.trim} strokeWidth="1" />
            <path d="M62 79 L73 79 L78 135 L66 135 Z" fill={palette.primary} stroke={palette.trim} strokeWidth="1" />
            <path d="M42 114 L55 114 L54 137 L39 137 Z" fill={palette.secondary} stroke={palette.accent} strokeWidth="1" />
            <path d="M65 114 L78 114 L81 137 L66 137 Z" fill={palette.secondary} stroke={palette.accent} strokeWidth="1" />
          </g>
        ) : (
          /* ROBE MYSTIC SILHOUETTE */
          <g>
            {/* Circlet / crown */}
            <path d="M51 18 Q60 11 69 18 L68 30 L52 30 Z" fill="#1e293b" stroke={palette.trim} strokeWidth="0.9" />
            <path d="M49 18 L60 12 L71 18" fill="none" stroke={palette.accent} strokeWidth="2" />
            <circle cx="60" cy="12" r="2.3" fill={palette.accent} />
            {/* Mantle / High collar */}
            <path d="M36 37 L49 32 L71 32 L84 37 L77 52 L43 52 Z" fill={palette.secondary} stroke={palette.accent} strokeWidth="1.2" />
            {/* Tunic bodice */}
            <path d="M45 38 L75 38 L72 74 L48 74 Z" fill={palette.primary} stroke={palette.trim} strokeWidth="1" />
            <path d="M60 40 L60 72" stroke={palette.accent} strokeWidth="1.8" />
            {/* Flowing wide sleeves */}
            <path d="M36 39 L45 43 L40 82 L25 78 Z" fill={palette.secondary} stroke={palette.trim} strokeWidth="1" />
            <path d="M75 43 L84 39 L95 78 L80 82 Z" fill={palette.secondary} stroke={palette.trim} strokeWidth="1" />
            {/* Long ceremonial skirt / stockings */}
            <path d="M47 73 L73 73 L86 134 L34 134 Z" fill={palette.primary} stroke={palette.trim} strokeWidth="1.1" />
            <path d="M55 74 L65 74 L69 134 L51 134 Z" fill={palette.secondary} opacity="0.85" />
            {/* Sash */}
            <rect x="46" y="70" width="28" height="5" rx="1" fill={palette.accent} />
            {/* Shoes */}
            <ellipse cx="48" cy="136" rx="7" ry="3" fill={palette.secondary} stroke={palette.accent} strokeWidth="0.9" />
            <ellipse cx="72" cy="136" rx="7" ry="3" fill={palette.secondary} stroke={palette.accent} strokeWidth="0.9" />
          </g>
        )}
      </svg>
    </div>
  );
}
