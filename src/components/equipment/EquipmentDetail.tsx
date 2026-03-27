/**
 * EquipmentDetail - Детальная информация о предмете экипировки
 */

'use client';

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GradeBadge } from './GradeBadge';
import { DurabilityBar, getConditionLabel } from './DurabilityBar';
import { RepairDialog } from './RepairDialog';
import { UpgradeDialog } from './UpgradeDialog';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@prisma/client';
import { GRADE_CONFIGS } from '@/lib/game/grade-system';

interface EquipmentDetailProps {
  item: InventoryItem | null;
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
}

export function EquipmentDetail({ item, open, onClose, onRefresh }: EquipmentDetailProps) {
  if (!item) return null;
  
  const bonusStats = item.bonusStats ? safeParseJSON(item.bonusStats) : [];
  const specialEffects = item.specialEffects ? safeParseJSON(item.specialEffects) : [];
  const gradeHistory = item.gradeHistory ? safeParseJSON(item.gradeHistory) : [];
  
  const gradeConfig = GRADE_CONFIGS[(item.grade as any) ?? 'common'];
  
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{item.icon || '📦'}</span>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {item.name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <GradeBadge grade={(item.grade as any) ?? 'common'} size="sm" />
                <span className="text-muted-foreground">
                  {getItemTypeLabel(item.type)} • Ур. {item.itemLevel ?? 1}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="info">Информация</TabsTrigger>
            <TabsTrigger value="bonuses">Бонусы</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
            <TabsTrigger value="actions">Действия</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="space-y-4 mt-4">
            <ScrollArea className="h-[350px] pr-4">
              {/* Основные параметры */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Основное</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow label="Тип" value={getItemTypeLabel(item.type)} />
                  <InfoRow label="Категория" value={getCategoryLabel(item.category)} />
                  <InfoRow label="Материал" value={item.materialName ?? getMaterialName(item.materialId)} />
                  <InfoRow label="Тир материала" value={`T${item.materialTier ?? 1}`} valueClass="text-amber-400" />
                  <InfoRow label="Редкость" value={getRarityLabel(item.rarity)} />
                  <InfoRow label="Стоимость" value={`${item.value} 💰`} valueClass="text-amber-400" />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              {/* Эффективные параметры */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Эффективность</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {(item.effectiveDamage ?? 0) > 0 && (
                    <InfoRow 
                      label="Урон" 
                      value={`${item.effectiveDamage}`} 
                      valueClass="text-red-400 font-medium" 
                    />
                  )}
                  {(item.effectiveDefense ?? 0) > 0 && (
                    <InfoRow 
                      label="Защита" 
                      value={`${item.effectiveDefense}`} 
                      valueClass="text-blue-400 font-medium" 
                    />
                  )}
                  {(item.effectiveQiCond ?? 0) > 0 && (
                    <InfoRow 
                      label="Проводимость Ци" 
                      value={`${item.effectiveQiCond}%`}
                      valueClass="text-purple-400 font-medium" 
                    />
                  )}
                  <InfoRow 
                    label="Множитель урона" 
                    value={`×${gradeConfig.damageMultiplier}`}
                    valueClass="text-red-300" 
                  />
                  <InfoRow 
                    label="Множитель прочности" 
                    value={`×${gradeConfig.durabilityMultiplier}`}
                    valueClass="text-blue-300" 
                  />
                </div>
              </div>
              
              <Separator className="my-4" />
              
              {/* Прочность */}
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Прочность</h3>
                <DurabilityBar
                  current={item.durabilityCurrent ?? item.durability ?? 100}
                  max={item.durabilityMax ?? item.maxDurability ?? 100}
                  condition={(item.durabilityCondition as any) ?? 'pristine'}
                />
                <div className="grid grid-cols-2 gap-3 text-sm text-muted-foreground">
                  <div>Ремонтов: <span className="text-foreground">{item.repairCount ?? 0}</span></div>
                  <div>Качество последнего: <span className="text-foreground">{item.lastRepairQuality ?? 100}%</span></div>
                  <div>Всего урона поглощено: <span className="text-foreground">{item.totalDamageAbsorbed ?? 0}</span></div>
                </div>
              </div>
              
              {/* Требования */}
              {(item.requiredLevel > 1 || item.requiredStrength > 0 || item.requiredAgility > 0) && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-3">
                    <h3 className="font-semibold text-sm">Требования</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {item.requiredLevel > 1 && (
                        <InfoRow label="Уровень" value={`${item.requiredLevel}`} />
                      )}
                      {item.requiredStrength > 0 && (
                        <InfoRow label="Сила" value={`${item.requiredStrength}`} />
                      )}
                      {item.requiredAgility > 0 && (
                        <InfoRow label="Ловкость" value={`${item.requiredAgility}`} />
                      )}
                      {item.requiredIntelligence > 0 && (
                        <InfoRow label="Интеллект" value={`${item.requiredIntelligence}`} />
                      )}
                    </div>
                  </div>
                </>
              )}
              
              {/* Описание */}
              {item.description && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm">Описание</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="bonuses" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              {bonusStats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  У этого предмета нет бонусов
                </p>
              ) : (
                <div className="space-y-2">
                  {bonusStats.map((bonus: any, i: number) => (
                    <div 
                      key={i} 
                      className="flex justify-between items-center p-3 rounded bg-muted/50"
                    >
                      <div>
                        <span className="text-sm font-medium">{formatBonusType(bonus.type)}</span>
                        {bonus.source && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({bonus.source})
                          </span>
                        )}
                      </div>
                      <span className={cn(
                        "font-medium text-sm",
                        (bonus.value ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                      )}>
                        {(bonus.value ?? 0) >= 0 ? '+' : ''}{bonus.value}
                        {bonus.isMultiplier ? '%' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              
              {specialEffects.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h3 className="font-semibold text-sm">Особые эффекты</h3>
                  {specialEffects.map((effect: string, i: number) => (
                    <div key={i} className="text-sm text-amber-400 p-2 rounded bg-amber-500/10">
                      ✦ {effect}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="history" className="mt-4">
            <ScrollArea className="h-[350px] pr-4">
              {gradeHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  История изменений пуста
                </p>
              ) : (
                <div className="space-y-2">
                  {gradeHistory.map((event: any, i: number) => (
                    <div key={i} className="text-sm p-3 rounded bg-muted/50">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {event.reason === 'upgrade' ? '⬆️ Улучшение' : 
                           event.reason === 'downgrade' ? '⬇️ Понижение' : 
                           event.reason === 'repair' ? '🔧 Ремонт' : '📋 Изменение'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {event.timestamp ? new Date(event.timestamp).toLocaleDateString() : ''}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {getGradeLabel(event.from)} → {getGradeLabel(event.to)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="actions" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <RepairDialog 
                item={item} 
                onRepaired={() => onRefresh?.()} 
              />
              <UpgradeDialog 
                item={item}
                onUpgraded={() => onRefresh?.()}
              />
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Хелперы
function InfoRow({ label, value, valueClass }: { 
  label: string; 
  value: string; 
  valueClass?: string;
}) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

function getItemTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    weapon_sword: 'Меч',
    weapon_spear: 'Копьё',
    weapon_staff: 'Посох',
    weapon_bow: 'Лук',
    weapon_dagger: 'Кинжал',
    weapon_fist: 'Кистевое оружие',
    armor_head: 'Шлем',
    armor_torso: 'Нагрудник',
    armor_legs: 'Поножи',
    armor_feet: 'Сапоги',
    armor_arms: 'Наручи',
    accessory_ring: 'Кольцо',
    accessory_amulet: 'Амулет',
    charger: 'Зарядник',
  };
  return labels[type] ?? type;
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    weapon: 'Оружие',
    armor: 'Броня',
    accessory: 'Аксессуар',
    consumable: 'Расходуемое',
    material: 'Материал',
    quest: 'Квестовый предмет',
    misc: 'Разное',
  };
  return labels[category] ?? category;
}

function getRarityLabel(rarity: string): string {
  const labels: Record<string, string> = {
    common: 'Обычная',
    uncommon: 'Необычная',
    rare: 'Редкая',
    epic: 'Эпическая',
    legendary: 'Легендарная',
    mythic: 'Мифическая',
  };
  return labels[rarity] ?? rarity;
}

function getMaterialName(materialId: string): string {
  const names: Record<string, string> = {
    iron: 'Железо',
    steel: 'Сталь',
    spirit_iron: 'Духовное железо',
    star_metal: 'Звёздный металл',
    void_matter: 'Материя пустоты',
    leather: 'Кожа',
    silk: 'Шёлк',
    spirit_silk: 'Духовный шёлк',
    jade: 'Нефрит',
    // ... добавить остальные по необходимости
  };
  return names[materialId] ?? materialId;
}

function formatBonusType(type: string): string {
  const labels: Record<string, string> = {
    combat_damage: 'Урон',
    combat_crit_chance: 'Шанс крит.',
    combat_crit_damage: 'Крит. урон',
    combat_armor_penetration: 'Бронепробитие',
    combat_attack_speed: 'Скорость атаки',
    defense_armor: 'Броня',
    defense_evasion: 'Уклонение',
    defense_hp: 'Здоровье',
    defense_block: 'Блок',
    qi_regeneration: 'Регенерация Ци',
    qi_cost_reduction: 'Снижение стоимости Ци',
    qi_conductivity: 'Проводимость Ци',
    elemental_fire: 'Урон огнём',
    elemental_cold: 'Урон холодом',
    elemental_lightning: 'Урон молнией',
    utility_move_speed: 'Скорость передвижения',
    special_life_steal: 'Вампиризм',
  };
  return labels[type] ?? type.split('_').pop() ?? type;
}

function getGradeLabel(grade: string): string {
  const labels: Record<string, string> = {
    damaged: 'Повреждённый',
    common: 'Обычный',
    refined: 'Улучшенный',
    perfect: 'Идеальный',
    transcendent: 'Превосходный',
  };
  return labels[grade] ?? grade;
}

function safeParseJSON(str: string | null): any[] {
  if (!str) return [];
  try {
    return JSON.parse(str);
  } catch {
    return [];
  }
}
