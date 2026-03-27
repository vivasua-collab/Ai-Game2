/**
 * EquipmentCard - Карточка предмета экипировки
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GradeBadge } from './GradeBadge';
import { DurabilityBar } from './DurabilityBar';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@prisma/client';

interface EquipmentCardProps {
  item: InventoryItem;
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
}

export function EquipmentCard({ item, onClick, selected, compact = false }: EquipmentCardProps) {
  const materialName = getMaterialName(item.materialId);
  const bonusStats = item.bonusStats ? safeParseJSON(item.bonusStats) : [];
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50",
        selected && "border-primary ring-2 ring-primary/20",
        compact && "p-2"
      )}
      onClick={onClick}
    >
      <CardHeader className={cn("pb-2", compact && "p-2")}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">{item.icon || '📦'}</span>
            <CardTitle className="text-sm font-medium truncate">
              {item.name}
            </CardTitle>
          </div>
          <GradeBadge grade={(item.grade as any) ?? 'common'} size="sm" />
        </div>
      </CardHeader>
      
      <CardContent className={cn("space-y-3", compact && "p-2 pt-0")}>
        {/* Уровень и материал */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Ур. {item.itemLevel ?? 1}</span>
          <span>•</span>
          <span>{item.materialName ?? materialName}</span>
          {item.materialTier && item.materialTier > 1 && (
            <>
              <span>•</span>
              <span className="text-amber-400">T{item.materialTier}</span>
            </>
          )}
        </div>
        
        {/* Параметры */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {(item.effectiveDamage ?? 0) > 0 && (
            <div>
              <span className="text-muted-foreground">Урон: </span>
              <span className="text-red-400 font-medium">
                {item.effectiveDamage}
              </span>
            </div>
          )}
          {(item.effectiveDefense ?? 0) > 0 && (
            <div>
              <span className="text-muted-foreground">Защита: </span>
              <span className="text-blue-400 font-medium">
                {item.effectiveDefense}
              </span>
            </div>
          )}
          {(item.effectiveQiCond ?? 0) > 0 && (
            <div>
              <span className="text-muted-foreground">Проводимость: </span>
              <span className="text-purple-400 font-medium">
                {item.effectiveQiCond}%
              </span>
            </div>
          )}
        </div>
        
        {/* Прочность */}
        <DurabilityBar
          current={item.durabilityCurrent ?? item.durability ?? 100}
          max={item.durabilityMax ?? item.maxDurability ?? 100}
          condition={(item.durabilityCondition as any) ?? 'pristine'}
          size="sm"
        />
        
        {/* Бонусы */}
        {bonusStats.length > 0 && !compact && (
          <div className="flex flex-wrap gap-1">
            {bonusStats.slice(0, 3).map((bonus: any, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">
                {formatBonus(bonus)}
              </Badge>
            ))}
            {bonusStats.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{bonusStats.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {/* Стоимость и статус */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-400">💰 {item.value}</span>
          {item.isEquipped && (
            <Badge className="text-xs bg-green-600">Экипировано</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Хелперы
function getMaterialName(materialId: string): string {
  const names: Record<string, string> = {
    // T1
    iron: 'Железо',
    copper: 'Медь',
    leather: 'Кожа',
    cloth: 'Ткань',
    bone: 'Кость',
    wood: 'Дерево',
    stone: 'Камень',
    herb: 'Трава',
    // T2
    steel: 'Сталь',
    bronze: 'Бронза',
    silk: 'Шёлк',
    ivory: 'Слоновая кость',
    hardwood: 'Твёрдое дерево',
    marble: 'Мрамор',
    // T3
    spirit_iron: 'Духовное железо',
    cold_iron: 'Хладное железо',
    spirit_silk: 'Духовный шёлк',
    jade: 'Нефрит',
    spirit_wood: 'Духовное дерево',
    crystal: 'Кристалл',
    // T4
    star_metal: 'Звёздный металл',
    dragon_bone: 'Кость дракона',
    heavenly_silk: 'Небесный шёлк',
    void_wood: 'Пустотное дерево',
    spirit_crystal: 'Духовный кристалл',
    // T5
    void_matter: 'Материя пустоты',
    chaos_matter: 'Материя хаоса',
    primordial_essence: 'Первородная эссенция',
  };
  return names[materialId] ?? materialId;
}

function formatBonus(bonus: any): string {
  if (!bonus) return '';
  const sign = (bonus.value ?? 0) >= 0 ? '+' : '';
  const type = bonus.type?.split('_').pop() ?? bonus.type ?? '';
  return `${type}: ${sign}${bonus.value}${bonus.isMultiplier ? '%' : ''}`;
}

function safeParseJSON(str: string | null): any[] {
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}
