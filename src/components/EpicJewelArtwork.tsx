import {useState} from 'react';
import {EpicJewelDef} from '../data/epicJewels';
import {resolveItemIconUrl} from '../utils/storage';

interface EpicJewelArtworkProps {
  def: EpicJewelDef;
  customImageUrl?: string;
  catalogIcon?: string | null;
  iconBaseUrl: string;
}

export function EpicJewelArtwork({
  def,
  customImageUrl,
  catalogIcon,
  iconBaseUrl,
}: EpicJewelArtworkProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const resolvedCatalogUrl = catalogIcon
    ? resolveItemIconUrl(catalogIcon, iconBaseUrl)
    : null;
  const activeUrl = customImageUrl || resolvedCatalogUrl;

  if (activeUrl && !imgFailed) {
    return (
      <div
        className="w-full h-full flex items-center justify-center p-1.5"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${def.palette.bg} 0%, #0b0f17 90%)`,
        }}
      >
        <img
          src={activeUrl}
          alt={def.name}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="max-w-full max-h-full w-auto h-full object-contain rounded-[3px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
        />
      </div>
    );
  }

  const {primary, secondary, glow, bg} = def.palette;

  return (
    <div
      className="w-full h-full flex items-center justify-center relative overflow-hidden select-none"
      style={{
        background: `radial-gradient(circle at 50% 45%, ${bg} 0%, #0b0f17 92%)`,
      }}
    >
      <svg
        viewBox="0 0 80 80"
        className="w-16 h-16 drop-shadow-[0_4px_10px_rgba(0,0,0,0.75)]"
        aria-hidden="true"
      >
        {def.category === 'necklace' && (
          <g>
            {/* Chain */}
            <path
              d="M18 18 Q40 36 62 18"
              fill="none"
              stroke={secondary}
              strokeWidth="2.5"
              strokeDasharray="3 2"
            />
            <line x1="40" y1="27" x2="40" y2="34" stroke={secondary} strokeWidth="2.5" />
            {/* Pendant crest */}
            <path
              d="M40 32 L56 46 L40 68 L24 46 Z"
              fill={bg}
              stroke={secondary}
              strokeWidth="2.2"
            />
            <path
              d="M40 37 L50 47 L40 62 L30 47 Z"
              fill={primary}
              stroke={glow}
              strokeWidth="1.2"
            />
            <circle cx="37" cy="46" r="2.2" fill={glow} opacity="0.85" />
          </g>
        )}

        {def.category === 'earring' && (
          <g>
            {/* Hook / ring */}
            <circle
              cx="40"
              cy="22"
              r="8"
              fill="none"
              stroke={primary}
              strokeWidth="3"
            />
            {/* Drop clasp */}
            <path
              d="M32 32 L48 32 L52 54 L40 68 L28 54 Z"
              fill={bg}
              stroke={primary}
              strokeWidth="2"
            />
            <path
              d="M35 37 L45 37 L47 52 L40 62 L33 52 Z"
              fill={secondary}
              stroke={glow}
              strokeWidth="1.2"
            />
            <circle cx="40" cy="48" r="3" fill={glow} opacity="0.8" />
          </g>
        )}

        {def.category === 'ring' && (
          <g>
            {/* Outer band */}
            <ellipse
              cx="40"
              cy="46"
              rx="18"
              ry="15"
              fill="none"
              stroke={secondary}
              strokeWidth="5"
            />
            <ellipse
              cx="40"
              cy="46"
              rx="18"
              ry="15"
              fill="none"
              stroke={glow}
              strokeWidth="1"
              opacity="0.55"
            />
            {/* Crown gem bezel */}
            <path
              d="M30 27 L40 19 L50 27 L45 37 L35 37 Z"
              fill={primary}
              stroke={glow}
              strokeWidth="1.5"
            />
            <circle cx="40" cy="28" r="2.4" fill={glow} />
          </g>
        )}

        {def.category === 'shirt' && (
          <g>
            {/* Striped Mithril Shirt silhouette */}
            <path
              d="M28 18 L35 16 Q40 21 45 16 L52 18 L64 30 L57 38 L52 33 L52 64 L28 64 L28 33 L23 38 L16 30 Z"
              fill={primary}
              stroke={glow}
              strokeWidth="1.5"
            />
            <line x1="40" y1="20" x2="40" y2="33" stroke={secondary} strokeWidth="2" />
            <line x1="32" y1="42" x2="48" y2="42" stroke={secondary} strokeWidth="1.6" opacity="0.75" />
            <line x1="32" y1="51" x2="48" y2="51" stroke={secondary} strokeWidth="1.6" opacity="0.75" />
          </g>
        )}
      </svg>
    </div>
  );
}
