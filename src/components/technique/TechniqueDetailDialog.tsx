/**
 * TechniqueDetailDialog - Детальная информация о технике
 * 
 * Показывает все параметры техники:
 * - Grade, Element, Level, Type, Subtype
 * - Базовые параметры (damage, qiCost, range, duration, capacity)
 * - Итоговые параметры (final*)
 * - Эффекты и значения
 * - Требования к характеристикам
 * - Оружие (если applicable)
 * - Метаинформация
 * - Информация о ёмкости и дестабилизации (для боевых техник)
 */

'use client';

import { useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { 
  Flame, 
  Snowflake, 
  Zap, 
  Wind, 
  Mountain, 
  Droplets,
  Moon,
  Sun,
  Star,
  Sword,
  Shield,
  Heart,
  Move,
  Eye,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TechniqueGrade } from '@/types/grade';
import { TECHNIQUE_GRADE_CONFIGS, TECHNIQUE_GRADE_ORDER } from '@/types/grade';
import { ELEMENT_NAMES, ELEMENT_ICONS, ELEMENT_COLORS } from '@/lib/constants/elements';
import {
  calculateTechniqueCapacity,
  calculateQiDensity,
  checkDestabilizationWithBaseQi,
  type TechniqueType,
  type CombatSubtype,
} from '@/lib/constants/technique-capacity';

// Типы для техники (частичные, для отображения)
interface TechniqueForDetail {
  id: string;
  name: string;
  description?: string;
  type: string;
  subtype?: string;
  element: string;
  level: number;
  grade?: TechniqueGrade;
  rarity?: string;
  
  // Базовые параметры
  baseDamage?: number;
  baseQiCost?: number;
  baseRange?: number;
  baseDuration?: number;
  baseCapacity?: number;
  
  // Итоговые параметры
  finalDamage?: number;
  finalQiCost?: number;
  finalRange?: number;
  finalDuration?: number;
  finalCapacity?: number;
  
  // Эффекты
  effects?: Array<{
    type: string;
    value?: number;
    duration?: number;
    chance?: number;
    description?: string;
  }>;
  
  // Требования
  requiredLevel?: number;
  statRequirements?: Record<string, number>;
  
  // Оружие
  weaponCategory?: string;
  weaponType?: string;
  
  // Прочее
  damageFalloff?: boolean;
  isRangedQi?: boolean;
  modifiers?: Record<string, unknown>;
  meta?: Record<string, unknown>;
  
  // Для расчёта ёмкости
  mastery?: number;           // 0-100%
  cultivationLevel?: number;  // Уровень культивации персонажа
}

interface TechniqueDetailDialogProps {
  technique: TechniqueForDetail | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Уровень культивации персонажа (для расчёта qiDensity) */
  characterCultivationLevel?: number;
  /** Мастерство техники (для расчёта ёмкости) */
  characterMastery?: number;
}

export function TechniqueDetailDialog({ 
  technique, 
  open, 
  onOpenChange,
  characterCultivationLevel = 1,
  characterMastery = 0,
}: TechniqueDetailDialogProps) {
  // Расчёт ёмкости техники
  const capacityInfo = useMemo(() => {
    if (!technique) return null;
    
    // Пассивные техники культивации не имеют ёмкости
    if (technique.type === 'cultivation') return null;
    
    const mastery = technique.mastery ?? characterMastery;
    const cultivationLevel = technique.cultivationLevel ?? characterCultivationLevel;
    
    // Рассчитываем ёмкость
    const calculatedCapacity = calculateTechniqueCapacity(
      technique.type as TechniqueType,
      technique.level,
      mastery,
      technique.subtype as CombatSubtype
    );
    
    if (!calculatedCapacity) return null;
    
    // Плотность Ци персонажа
    const qiDensity = calculateQiDensity(cultivationLevel);
    
    // Проверка дестабилизации
    const qiCost = technique.finalQiCost ?? technique.baseQiCost ?? 0;
    const destabilization = qiCost > 0 
      ? checkDestabilizationWithBaseQi(qiCost, qiDensity, calculatedCapacity)
      : null;
    
    // Использование ёмкости в процентах
    const usagePercent = qiCost > 0 
      ? Math.round((qiCost * qiDensity / calculatedCapacity) * 100)
      : 0;
    
    return {
      calculatedCapacity,
      qiDensity,
      qiCost,
      destabilization,
      usagePercent,
      mastery,
      levelMultiplier: Math.pow(2, technique.level - 1),
      masteryBonus: Math.floor(mastery * 0.5),
    };
  }, [technique, characterCultivationLevel, characterMastery]);
  
  if (!technique) return null;
  
  const grade = technique.grade ?? 'common';
  const gradeConfig = TECHNIQUE_GRADE_CONFIGS[grade];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {getElementIcon(technique.element)}
            </span>
            <div>
              <DialogTitle className="flex items-center gap-2">
                {technique.name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1 flex-wrap">
                <GradeBadge grade={grade} />
                <Badge variant="outline" className="text-xs">
                  {ELEMENT_NAMES[technique.element] ?? technique.element}
                </Badge>
                <span className="text-muted-foreground">
                  {getTechniqueTypeLabel(technique.type)}
                  {technique.subtype && ` • ${getSubtypeLabel(technique.subtype)}`}
                  {' • '}Ур. {technique.level}
                </span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] pr-4">
          {/* Описание */}
          {technique.description && (
            <div className="mb-4 p-3 rounded bg-muted/50">
              <p className="text-sm text-muted-foreground italic">
                "{technique.description}"
              </p>
            </div>
          )}
          
          {/* Базовые параметры */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Базовые параметры</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(technique.baseDamage ?? 0) > 0 && (
                <InfoRow 
                  label="Базовый урон" 
                  value={`${technique.baseDamage}`}
                  valueClass="text-red-400" 
                />
              )}
              {(technique.baseQiCost ?? 0) > 0 && (
                <InfoRow 
                  label="Базовая стоимость Ци" 
                  value={`${technique.baseQiCost}`}
                  valueClass="text-purple-400" 
                />
              )}
              {(technique.baseRange ?? 0) > 0 && (
                <InfoRow 
                  label="Базовая дальность" 
                  value={`${technique.baseRange}м`} 
                />
              )}
              {(technique.baseDuration ?? 0) > 0 && (
                <InfoRow 
                  label="Базовая длительность" 
                  value={`${technique.baseDuration}с`} 
                />
              )}
              {(technique.baseCapacity ?? 0) > 0 && (
                <InfoRow 
                  label="Базовая ёмкость" 
                  value={`${technique.baseCapacity}`} 
                />
              )}
            </div>
          </div>
          
          <Separator className="my-4" />
          
          {/* Итоговые параметры с множителями Grade */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">
              Итоговые параметры 
              <span className="text-xs text-muted-foreground ml-2">
                (×{gradeConfig.damageMultiplier} от Grade)
              </span>
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(technique.finalDamage ?? technique.baseDamage ?? 0) > 0 && (
                <InfoRow 
                  label="Финальный урон" 
                  value={`${technique.finalDamage ?? technique.baseDamage}`}
                  valueClass="text-red-400 font-medium" 
                />
              )}
              {(technique.finalQiCost ?? technique.baseQiCost ?? 0) > 0 && (
                <InfoRow 
                  label="Финальная стоимость Ци" 
                  value={`${technique.finalQiCost ?? technique.baseQiCost}`}
                  valueClass="text-purple-400 font-medium" 
                />
              )}
              {(technique.finalRange ?? technique.baseRange ?? 0) > 0 && (
                <InfoRow 
                  label="Финальная дальность" 
                  value={`${technique.finalRange ?? technique.baseRange}м`}
                  valueClass="font-medium" 
                />
              )}
              {(technique.finalDuration ?? technique.baseDuration ?? 0) > 0 && (
                <InfoRow 
                  label="Финальная длительность" 
                  value={`${technique.finalDuration ?? technique.baseDuration}с`}
                  valueClass="font-medium" 
                />
              )}
              {(technique.finalCapacity ?? technique.baseCapacity ?? 0) > 0 && (
                <InfoRow 
                  label="Финальная ёмкость" 
                  value={`${technique.finalCapacity ?? technique.baseCapacity}`}
                  valueClass="font-medium" 
                />
              )}
            </div>
          </div>
          
          {/* Структурная ёмкость и дестабилизация */}
          {capacityInfo && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  Структурная ёмкость
                </h3>
                
                <div className="p-3 rounded-lg bg-purple-900/20 border border-purple-600/30 space-y-2">
                  {/* Базовая ёмкость */}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Базовая ёмкость:</span>
                    <span className="text-purple-400">{technique.baseCapacity ?? 48} ед.</span>
                  </div>
                  
                  {/* Множители */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>× Уровень ({technique.level}):</span>
                      <span className="text-slate-300">×{capacityInfo.levelMultiplier}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>+ Мастерство:</span>
                      <span className="text-slate-300">+{capacityInfo.masteryBonus}%</span>
                    </div>
                  </div>
                  
                  {/* Итоговая ёмкость */}
                  <div className="flex justify-between text-sm font-medium pt-2 border-t border-purple-600/30">
                    <span className="text-purple-300">Итоговая ёмкость:</span>
                    <span className="text-purple-400 font-bold">{capacityInfo.calculatedCapacity} ед. Ци</span>
                  </div>
                  
                  {/* Плотность Ци */}
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Плотность Ци (ур. {characterCultivationLevel}):</span>
                    <span>{capacityInfo.qiDensity} ед/ед</span>
                  </div>
                  
                  {/* Использование ёмкости */}
                  {capacityInfo.qiCost > 0 && (
                    <div className="pt-2 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Использование:</span>
                        <span className={cn(
                          capacityInfo.usagePercent > 110 ? "text-red-400" :
                          capacityInfo.usagePercent > 100 ? "text-amber-400" : "text-slate-300"
                        )}>
                          {capacityInfo.qiCost} × {capacityInfo.qiDensity} = {capacityInfo.qiCost * capacityInfo.qiDensity} ед.
                          ({capacityInfo.usagePercent}%)
                        </span>
                      </div>
                      
                      <Progress 
                        value={Math.min(capacityInfo.usagePercent, 150)} 
                        className={cn(
                          "h-2",
                          capacityInfo.usagePercent > 110 && "[&>div]:bg-red-500",
                          capacityInfo.usagePercent > 100 && capacityInfo.usagePercent <= 110 && "[&>div]:bg-amber-500"
                        )}
                      />
                    </div>
                  )}
                  
                  {/* Дестабилизация */}
                  {capacityInfo.destabilization?.isDestabilized && (
                    <div className="mt-2 p-2 rounded bg-red-900/30 border border-red-600/50 text-xs space-y-1">
                      <div className="flex items-center gap-1 text-red-400 font-medium">
                        <AlertTriangle className="w-3 h-3" />
                        ДЕСТАБИЛИЗАЦИЯ!
                      </div>
                      <div className="text-slate-300">
                        Превышение: {capacityInfo.usagePercent - 110}% сверх лимита
                      </div>
                      {capacityInfo.destabilization.backlashDamage && (
                        <div className="text-red-300">
                          Обратный удар: {capacityInfo.destabilization.backlashDamage} урона себе
                        </div>
                      )}
                      <div className="text-slate-400">
                        Эффективность: {Math.round(capacityInfo.destabilization.efficiency * 100)}%
                      </div>
                    </div>
                  )}
                  
                  {/* Предупреждение о перегрузке */}
                  {capacityInfo.usagePercent > 100 && capacityInfo.usagePercent <= 110 && (
                    <div className="mt-2 p-2 rounded bg-amber-900/30 border border-amber-600/50 text-xs">
                      <div className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="w-3 h-3" />
                        Перегрузка! Риск дестабилизации при увеличении затрат.
                      </div>
                    </div>
                  )}
                  
                  {/* Безопасный лимит */}
                  {capacityInfo.usagePercent <= 100 && capacityInfo.qiCost > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1">
                      💡 Безопасный лимит: 110% ({Math.floor(capacityInfo.calculatedCapacity * 1.1)} ед.)
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Эффекты */}
          {technique.effects && technique.effects.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Эффекты</h3>
                <div className="space-y-2">
                  {technique.effects.map((effect, i) => (
                    <div 
                      key={i} 
                      className="p-3 rounded bg-muted/50 text-sm"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {formatEffectType(effect.type)}
                        </span>
                        {effect.chance !== undefined && effect.chance < 100 && (
                          <Badge variant="outline" className="text-xs">
                            {effect.chance}%
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {effect.description ?? formatEffectDescription(effect)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Требования */}
          {(technique.requiredLevel || technique.statRequirements) && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Требования</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {technique.requiredLevel && technique.requiredLevel > 1 && (
                    <InfoRow 
                      label="Уровень культивации" 
                      value={`${technique.requiredLevel}`}
                      valueClass="text-amber-400" 
                    />
                  )}
                  {technique.statRequirements && Object.entries(technique.statRequirements).map(([stat, value]) => (
                    <InfoRow 
                      key={stat}
                      label={formatStatName(stat)} 
                      value={`${value}`}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
          
          {/* Оружие */}
          {technique.weaponCategory && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Требуемое оружие</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <InfoRow 
                    label="Категория" 
                    value={getWeaponCategoryLabel(technique.weaponCategory)}
                  />
                  {technique.weaponType && (
                    <InfoRow 
                      label="Тип" 
                      value={getWeaponTypeLabel(technique.weaponType)}
                    />
                  )}
                </div>
              </div>
            </>
          )}
          
          {/* Метаинформация */}
          {technique.meta && Object.keys(technique.meta).length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">Дополнительно</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {technique.damageFalloff && (
                    <InfoRow 
                      label="Падение урона" 
                      value="Есть"
                      valueClass="text-orange-400"
                    />
                  )}
                  {technique.isRangedQi && (
                    <InfoRow 
                      label="Дистанционная Ци" 
                      value="Да"
                      valueClass="text-purple-400"
                    />
                  )}
                </div>
              </div>
            </>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Компонент бейджа грейда
function GradeBadge({ grade }: { grade: TechniqueGrade }) {
  const config = TECHNIQUE_GRADE_CONFIGS[grade];
  
  return (
    <Badge 
      className={cn("text-xs", config.color)}
      style={{ backgroundColor: `${config.colorHex}20` }}
    >
      {config.icon} {config.name}
    </Badge>
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

function getElementIcon(element: string): string {
  return ELEMENT_ICONS[element] ?? '✨';
}

function getTechniqueTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    combat: 'Боевая',
    defense: 'Защитная',
    support: 'Поддержка',
    healing: 'Лечение',
    movement: 'Перемещение',
    sensory: 'Чувствительность',
    cultivation: 'Культивация',
  };
  return labels[type] ?? type;
}

function getSubtypeLabel(subtype: string): string {
  const labels: Record<string, string> = {
    strike: 'Удар',
    weapon: 'Оружейная',
    ranged: 'Дистанционная',
    buff: 'Усиление',
    debuff: 'Ослабление',
    crowd_control: 'Контроль',
    single_target: 'Одиночная цель',
    area: 'По области',
  };
  return labels[subtype] ?? subtype;
}

function formatEffectType(type: string): string {
  const labels: Record<string, string> = {
    damage: 'Урон',
    heal: 'Лечение',
    buff: 'Усиление',
    debuff: 'Ослабление',
    stun: 'Оглушение',
    slow: 'Замедление',
    root: 'Обездвиживание',
    burn: 'Горение',
    freeze: 'Замораживание',
    shock: 'Шок',
    poison: 'Отравление',
    bleed: 'Кровотечение',
    knockback: 'Отбрасывание',
    pull: 'Притягивание',
  };
  return labels[type] ?? type;
}

function formatEffectDescription(effect: { 
  type: string; 
  value?: number; 
  duration?: number;
  chance?: number;
}): string {
  const parts: string[] = [];
  
  if (effect.value !== undefined) {
    parts.push(`${effect.value} ${effect.type === 'damage' ? 'урона' : 'эффекта'}`);
  }
  
  if (effect.duration !== undefined) {
    parts.push(`на ${effect.duration}с`);
  }
  
  return parts.join(', ') || effect.type;
}

function formatStatName(stat: string): string {
  const labels: Record<string, string> = {
    strength: 'Сила',
    agility: 'Ловкость',
    intelligence: 'Интеллект',
    vitality: 'Живучесть',
    willpower: 'Воля',
    perception: 'Восприятие',
  };
  return labels[stat] ?? stat;
}

function getWeaponCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    melee: 'Ближний бой',
    ranged: 'Дальний бой',
    unarmed: 'Без оружия',
  };
  return labels[category] ?? category;
}

function getWeaponTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    sword: 'Меч',
    spear: 'Копьё',
    staff: 'Посох',
    bow: 'Лук',
    dagger: 'Кинжал',
    fist: 'Кистевое',
  };
  return labels[type] ?? type;
}

export default TechniqueDetailDialog;
