import {
  Circle,
  Crown,
  Footprints,
  Gem,
  Hand,
  Image as ImageIcon,
  Shield,
  Shirt,
  Sparkles,
  Sword,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {EquipmentSlot, ItemCatalogEntry, ItemEntry} from '../types/l2';
import {ItemIcon} from './ItemIcon';

interface EquipmentPaperdollProps {
  equippedItems: ItemEntry[];
  itemCatalog: Record<string, ItemCatalogEntry>;
  iconBaseUrl: string;
  onQuickEditIcon: (itemName: string) => void;
  onAssignSlot: (itemId: string | null, slot: EquipmentSlot) => void;
}

const SLOT_META: Record<EquipmentSlot, {label: string}> = {
  hair_1: {label: 'Accesorio cabeza 1'},
  helmet: {label: 'Casco'},
  hair_2: {label: 'Accesorio cabeza 2'},
  gloves: {label: 'Guantes'},
  chest: {label: 'Pechera / Armadura'},
  boots: {label: 'Botas'},
  cloak: {label: 'Capa'},
  legs: {label: 'Pantalones'},
  belt: {label: 'Cinturón'},
  rhand: {label: 'Arma (Mano der.)'},
  lhand: {label: 'Escudo / Sigil'},
  earring_1: {label: 'Pendiente 1'},
  earring_2: {label: 'Pendiente 2'},
  shirt: {label: 'Camisa / Ropa int.'},
  ring_1: {label: 'Anillo 1'},
  ring_2: {label: 'Anillo 2'},
  necklace: {label: 'Collar'},
};

const PAPERDOLL_ROWS: EquipmentSlot[][] = [
  ['hair_1', 'helmet', 'hair_2'],
  ['gloves', 'chest', 'boots'],
  ['cloak', 'legs', 'belt'],
  ['rhand', 'lhand'],
  ['earring_1', 'earring_2', 'shirt'],
  ['ring_1', 'ring_2', 'necklace'],
];

function inferSlotFromName(
  name: string,
  usedSlots: Set<EquipmentSlot>
): EquipmentSlot | null {
  const n = name.toLowerCase();

  if (n.includes('circlet') || n.includes('hair') || n.includes('tiara') || n.includes('diadem')) {
    if (!usedSlots.has('hair_1')) return 'hair_1';
    if (!usedSlots.has('hair_2')) return 'hair_2';
  }
  if (n.includes('helmet') || n.includes('helm') || n.includes('cap') || n.includes('hat')) {
    if (!usedSlots.has('helmet')) return 'helmet';
  }
  if (n.includes('gloves') || n.includes('gauntlet') || n.includes('mitt')) {
    if (!usedSlots.has('gloves')) return 'gloves';
  }
  if (n.includes('boots') || n.includes('shoes') || n.includes('sandals') || n.includes('solleret')) {
    if (!usedSlots.has('boots')) return 'boots';
  }
  if (
    n.includes('breastplate') ||
    n.includes('tunic') ||
    n.includes('cuirass') ||
    n.includes('hauberk') ||
    n.includes('leather armor') ||
    n.includes('robe') ||
    n.includes('armor')
  ) {
    if (!usedSlots.has('chest')) return 'chest';
  }
  if (n.includes('gaiter') || n.includes('legging') || n.includes('stockings') || n.includes('hose') || n.includes('pants')) {
    if (!usedSlots.has('legs')) return 'legs';
  }
  if (n.includes('cloak') || n.includes('mantle') || n.includes('cape')) {
    if (!usedSlots.has('cloak')) return 'cloak';
  }
  if (n.includes('belt') || n.includes('sash')) {
    if (!usedSlots.has('belt')) return 'belt';
  }
  if (n.includes('shield') || n.includes('sigil')) {
    if (!usedSlots.has('lhand')) return 'lhand';
  }
  if (n.includes('earring')) {
    if (!usedSlots.has('earring_1')) return 'earring_1';
    if (!usedSlots.has('earring_2')) return 'earring_2';
  }
  if (n.includes('shirt') || n.includes('underwear')) {
    if (!usedSlots.has('shirt')) return 'shirt';
  }
  if (n.includes('ring')) {
    if (!usedSlots.has('ring_1')) return 'ring_1';
    if (!usedSlots.has('ring_2')) return 'ring_2';
  }
  if (n.includes('necklace') || n.includes('pendant') || n.includes('choker')) {
    if (!usedSlots.has('necklace')) return 'necklace';
  }
  if (
    n.includes('sword') ||
    n.includes('bow') ||
    n.includes('dagger') ||
    n.includes('staff') ||
    n.includes('mace') ||
    n.includes('spear') ||
    n.includes('blade') ||
    n.includes('hammer') ||
    n.includes('club') ||
    n.includes('fist') ||
    n.includes('rapier') ||
    n.includes('crossbow') ||
    n.includes('caster') ||
    n.includes('crusher')
  ) {
    if (!usedSlots.has('rhand')) return 'rhand';
  }

  return null;
}

function SlotPlaceholderIcon({slot}: {slot: EquipmentSlot}) {
  const cls = 'w-4 h-4 text-slate-600/80';
  switch (slot) {
    case 'hair_1':
    case 'hair_2':
      return <Crown className={cls} />;
    case 'helmet':
      return <Shield className={cls} />;
    case 'gloves':
      return <Hand className={cls} />;
    case 'chest':
    case 'legs':
    case 'shirt':
    case 'cloak':
      return <Shirt className={cls} />;
    case 'boots':
      return <Footprints className={cls} />;
    case 'rhand':
      return <Sword className={cls} />;
    case 'lhand':
      return <Shield className={cls} />;
    case 'necklace':
    case 'earring_1':
    case 'earring_2':
      return <Sparkles className={cls} />;
    case 'ring_1':
    case 'ring_2':
      return <Circle className={cls} />;
    case 'belt':
      return <Gem className={cls} />;
  }
}

export function EquipmentPaperdoll({
  equippedItems,
  itemCatalog,
  iconBaseUrl,
  onQuickEditIcon,
  onAssignSlot,
}: EquipmentPaperdollProps) {
  const [selectedSlot, setSelectedSlot] = useState<EquipmentSlot | null>(null);

  const slotMap = useMemo(() => {
    const map = new Map<EquipmentSlot, ItemEntry>();
    const used = new Set<EquipmentSlot>();

    // First pass: explicit slots saved on items
    equippedItems.forEach((item) => {
      if (item.slot && !used.has(item.slot)) {
        map.set(item.slot, item);
        used.add(item.slot);
      }
    });

    // Second pass: smart inference for items without explicit slot
    equippedItems.forEach((item) => {
      if (item.slot) return;
      const inferred = inferSlotFromName(item.name, used);
      if (inferred) {
        map.set(inferred, item);
        used.add(inferred);
      }
    });

    return map;
  }, [equippedItems]);

  const activeSlotItem = selectedSlot ? slotMap.get(selectedSlot) || null : null;

  return (
    <div className="bg-[#111827] border border-[#1E293B] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-slate-100">
          Equipado
        </h2>
        <span className="font-mono text-[11px] tabular-nums text-slate-400">
          {equippedItems.length} {equippedItems.length === 1 ? 'pieza' : 'piezas'}
        </span>
      </div>

      {/* Lineage 2 17-slot paperdoll grid */}
      <div className="bg-[#0B0F17] border border-[#1E293B] rounded-md p-4 space-y-2.5">
        {PAPERDOLL_ROWS.map((row, rowIdx) => (
          <div
            key={rowIdx}
            className={`flex items-center justify-center gap-3 ${
              row.length === 2 ? 'px-5' : ''
            }`}
          >
            {row.map((slot) => {
              const item = slotMap.get(slot);
              const isSelected = selectedSlot === slot;
              const title = item
                ? `${SLOT_META[slot].label}: ${item.name}${
                    item.tags.length > 0 ? ` [${item.tags.join(' ')}]` : ''
                  }`
                : `${SLOT_META[slot].label} (vacío)`;

              return (
                <button
                  key={slot}
                  type="button"
                  title={title}
                  onClick={() =>
                    setSelectedSlot((curr) => (curr === slot ? null : slot))
                  }
                  className={`w-11 h-11 rounded-[4px] border flex items-center justify-center transition-colors focus-visible:outline-2 focus-visible:outline-amber-500 ${
                    isSelected
                      ? 'border-amber-500 bg-amber-500/10'
                      : item
                      ? 'border-[#334155] bg-[#161F30] hover:border-amber-400/70'
                      : 'border-[#1E293B] bg-[#111827]/70 hover:border-slate-600'
                  }`}
                >
                  {item ? (
                    <ItemIcon
                      name={item.name}
                      itemCatalog={itemCatalog}
                      iconBaseUrl={iconBaseUrl}
                      size="md"
                    />
                  ) : (
                    <SlotPlaceholderIcon slot={slot} />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Selected Slot Inspector */}
      {selectedSlot ? (
        <div className="bg-[#0B0F17] border border-[#1E293B] rounded-md p-3 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-amber-300">
              {SLOT_META[selectedSlot].label}
            </span>
            {activeSlotItem && (
              <button
                type="button"
                onClick={() => onQuickEditIcon(activeSlotItem.name)}
                className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-amber-300"
              >
                <ImageIcon className="w-3 h-3" />
                <span>Cambiar icono</span>
              </button>
            )}
          </div>

          {activeSlotItem ? (
            <div className="text-slate-100 font-medium">
              {activeSlotItem.name}
              {activeSlotItem.tags.length > 0 && (
                <span className="ml-2 font-mono text-[11px] text-amber-400/90">
                  {activeSlotItem.tags.join(' · ')}
                </span>
              )}
            </div>
          ) : (
            <div className="text-slate-500">Casilla sin objeto asignado.</div>
          )}

          {equippedItems.length > 0 && (
            <select
              aria-label={`Asignar objeto a ${SLOT_META[selectedSlot].label}`}
              value={activeSlotItem?.id || ''}
              onChange={(e) =>
                onAssignSlot(e.target.value || null, selectedSlot)
              }
              className="w-full bg-[#111827] border border-[#1E293B] rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">Vaciar casilla</option>
              {equippedItems.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name}
                </option>
              ))}
            </select>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500">
          Haz clic en una casilla para ver el objeto equipado, cambiar su icono o reasignar su posición.
        </p>
      )}
    </div>
  );
}
