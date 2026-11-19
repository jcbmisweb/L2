import {
  ItemGradeCategory,
  extractItemArmorType,
  extractItemGradeCategory,
  stripGradeAndArmorFromItemName,
} from '../utils/storage';

interface ItemNameDisplayProps {
  name: string;
  tags?: string[];
  className?: string;
}

const GRADE_BOX_STYLES: Record<ItemGradeCategory, string> = {
  S84: 'border-amber-500/60 bg-amber-500/10 text-amber-300',
  S80: 'border-amber-500/60 bg-amber-500/10 text-amber-300',
  S: 'border-amber-500/60 bg-amber-500/10 text-amber-300',
  A: 'border-rose-500/50 bg-rose-500/10 text-rose-300',
  B: 'border-sky-500/50 bg-sky-500/10 text-sky-300',
  C: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300',
  D: 'border-indigo-400/50 bg-indigo-500/10 text-indigo-300',
  'No-Grade': 'border-slate-600 bg-[#0B0F17] text-slate-300',
};

function isRedundantTag(
  tag: string,
  hasStage: boolean,
  grade: ItemGradeCategory | null
): boolean {
  const t = tag.trim();
  if (!t) return true;
  if (
    /^(?:grade|grado)[-\s:]*(?:no[-\s]?grade|ng|s[-\s]?84|s[-\s]?80|[sabcd])$/i.test(t) ||
    /^(?:no[-\s]?grade|ng|s[-\s]?84|s[-\s]?80|[sabcd])(?:[-\s]*(?:grade|grado))?$/i.test(t)
  ) {
    return true;
  }
  if ((grade === 'S80' || grade === 'S84') && /^(?:80|84)$/.test(t)) {
    return true;
  }
  if (
    /^heavy(?:\s+(?:armou?r|armo))?$/i.test(t) ||
    /^light(?:\s+(?:armou?r|armo))?$/i.test(t) ||
    /^(?:pesada|ligera|robe|túnica|tunica)$/i.test(t)
  ) {
    return true;
  }
  if (/^common(?:\s+item)?$/i.test(t)) {
    return true;
  }
  if (
    hasStage &&
    /^(?:(?:stage|lv\.?|level|nivel|step)[-\s:]*)?(?:1[0-8]|[1-9])$/i.test(t)
  ) {
    return true;
  }
  return false;
}

export function ItemNameDisplay({
  name,
  tags = [],
  className = '',
}: ItemNameDisplayProps) {
  const grade = extractItemGradeCategory(name, tags);
  const armorType = extractItemArmorType(name, tags);

  const isSoulCrystal = /\bsoul\s+crystal\b/i.test(name);
  const stageMatch = isSoulCrystal
    ? name.match(/\s*-\s*Stage\s+(1[0-8]|[1-9])$/i)
    : null;
  const stage = stageMatch ? stageMatch[1] : null;

  const displayTitle = stageMatch
    ? name.slice(0, stageMatch.index).trim()
    : stripGradeAndArmorFromItemName(name);

  const showArmorType =
    armorType &&
    !(armorType === 'Robe' && /\brobe\b/i.test(displayTitle)) &&
    !(armorType === 'Heavy Armor' && /\bheavy\s+armou?r\b/i.test(displayTitle)) &&
    !(armorType === 'Light Armor' && /\blight\s+armou?r\b/i.test(displayTitle));

  const extraTags = tags.filter((t) => !isRedundantTag(t, Boolean(stage), grade));

  return (
    <span className={`inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5 ${className}`}>
      <span className="font-medium text-slate-100">{displayTitle || name}</span>

      {grade &&
        (grade === 'S80' || grade === 'S84' ? (
          <span
            title={`Categoría Grado ${grade}`}
            className="inline-flex items-center gap-[2px]"
          >
            <span
              className={`inline-flex items-center justify-center min-w-[17px] h-[17px] px-1 rounded-[3px] border font-mono text-[10px] font-bold leading-none ${GRADE_BOX_STYLES[grade]}`}
            >
              S
            </span>
            <span
              className={`inline-flex items-center justify-center min-w-[19px] h-[17px] px-1 rounded-[3px] border font-mono text-[10px] font-bold leading-none ${GRADE_BOX_STYLES[grade]}`}
            >
              {grade === 'S84' ? '84' : '80'}
            </span>
          </span>
        ) : (
          <span
            title={`Categoría ${grade === 'No-Grade' ? 'No-Grade' : `Grado ${grade}`}`}
            className={`inline-flex items-center justify-center min-w-[18px] h-[17px] px-1 rounded-[3px] border font-mono text-[10px] font-bold leading-none ${GRADE_BOX_STYLES[grade]}`}
          >
            {grade === 'No-Grade' ? 'NG' : grade}
          </span>
        ))}

      {stage && (
        <span
          title={`Nivel / Stage ${stage}`}
          className="inline-flex items-center justify-center min-w-[20px] h-[17px] px-1 rounded-[3px] border border-amber-500/60 bg-amber-500/10 font-mono text-[10px] font-bold leading-none text-amber-300"
        >
          {stage}
        </span>
      )}

      {showArmorType && (
        <span className="text-[11px] font-medium text-amber-400">
          {armorType}
        </span>
      )}

      {extraTags.length > 0 && (
        <span className="font-mono text-[11px] text-amber-400/90">
          {extraTags.join(' · ')}
        </span>
      )}
    </span>
  );
}
