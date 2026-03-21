'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Sword,
  Shield,
  Heart,
  Eye,
  Move,
  Brain,
  Skull,
  Droplet,
  Zap,
  Trash2,
} from 'lucide-react';
// Импорт типов из единого источника (V2 compatible)
import type { TechniqueType, CombatSubtype } from '@/types/technique-types';
import type { TechniqueGrade } from '@/types/grade';

// Rarity алиас для совместимости
type Rarity = 'common' | 'uncommon' | 'rare' | 'legendary';
import {
  getTechniqueTypeList,
  RARITY_INFO,
  getBonusSlotsForRarity,
  getCombatSubtypeList,
  type TechniqueTypeConfig,
  type BonusSlot,
  type CombatSubtypeConfig,
} from '@/lib/generator/technique-config';
import { getWeaponTypeList, type WeaponTypeConfig } from '@/lib/generator/weapon-config';
import { getWeaponCategoryList, type WeaponCategoryConfig } from '@/lib/generator/weapon-categories';

interface TechniqueGeneratorPanelProps {
  onGenerate: (params: {
    type: string;
    level: number;
    rarity?: Rarity;
    count: number;
    damageVariance: { min: number; max: number };
    mode: 'replace' | 'append';
    typeSpecificParams?: Record<string, number>;
    combatSubtype?: CombatSubtype;
    weaponCategory?: string;
    weaponType?: string;
  }) => Promise<void>;
  onClear?: (params: {
    scope: 'all' | 'type' | 'subtype';
    targetType?: TechniqueType;
    targetSubtype?: CombatSubtype;
  }) => Promise<void>;
  loading: boolean;
}

const TYPE_ICONS: Record<TechniqueType, React.ReactNode> = {
  combat: <Sword className="w-5 h-5" />,
  defense: <Shield className="w-5 h-5" />,
  healing: <Heart className="w-5 h-5" />,
  sensory: <Eye className="w-5 h-5" />,
  movement: <Move className="w-5 h-5" />,
  cultivation: <Brain className="w-5 h-5" />,
  curse: <Skull className="w-5 h-5" />,
  poison: <Droplet className="w-5 h-5" />,
  support: <Zap className="w-5 h-5" />,
  formation: <Info className="w-5 h-5" />,
};

export function TechniqueGeneratorPanel({ onGenerate, onClear, loading }: TechniqueGeneratorPanelProps) {
  // Выбор типа - только один за раз
  const [selectedType, setSelectedType] = useState<TechniqueType>('combat');
  
  // Общие параметры
  const [genLevel, setGenLevel] = useState<string>('all');
  const [genRarity, setGenRarity] = useState<string>('random');
  const [genCount, setGenCount] = useState(10); // V2: уменьшено с 50 до 10
  
  // Версия генератора
  const [genVersion, setGenVersion] = useState<1 | 2>(2); // По умолчанию V2
  const [genMode, setGenMode] = useState<'replace' | 'append'>('append');
  
  // Параметры для combat техник
  const [combatSubtype, setCombatSubtype] = useState<string>('random');
  const [weaponCategory, setWeaponCategory] = useState<string>('random');
  const [weaponType, setWeaponType] = useState<string>('random');
  
  // Специфичные параметры типа (сохраняем для каждого типа)
  const [typeParams, setTypeParams] = useState<Record<TechniqueType, Record<string, number>>>(() => {
    const initial: Record<TechniqueType, Record<string, number>> = {} as Record<TechniqueType, Record<string, number>>;
    const types = getTechniqueTypeList();
    for (const t of types) {
      initial[t.id] = {};
      for (const p of t.params) {
        initial[t.id][p.id] = p.default;
      }
    }
    return initial;
  });
  
  // UI состояние
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showV2Info, setShowV2Info] = useState(true); // Баннер V2
  
  const typeConfig = useMemo(() => {
    return getTechniqueTypeList().find(t => t.id === selectedType)!;
  }, [selectedType]);
  
  const typeList = getTechniqueTypeList();
  const combatSubtypeList = getCombatSubtypeList();
  const weaponCategoryList = getWeaponCategoryList();
  const weaponList = getWeaponTypeList();
  
  // Получаем текущие параметры для выбранного типа
  const currentParams = typeParams[selectedType] || {};
  
  const handleParamChange = (paramId: string, value: number) => {
    setTypeParams(prev => ({
      ...prev,
      [selectedType]: {
        ...prev[selectedType],
        [paramId]: value,
      },
    }));
  };
  
  const handleGenerate = async () => {
    // V2: damageVariance не используется (формулы вместо рандома)
    const damageVariance = genVersion === 1 
      ? {
          min: (currentParams.damageVarianceMin || 70) / 100,
          max: (currentParams.damageVarianceMax || 130) / 100,
        }
      : { min: 1.0, max: 1.0 }; // V2: без variance
    
    await onGenerate({
      type: selectedType,
      level: genLevel === 'all' ? 0 : parseInt(genLevel),
      rarity: genRarity === 'random' ? undefined : genRarity as Rarity,
      count: genCount,
      damageVariance,
      mode: genMode,
      typeSpecificParams: { ...currentParams, version: genVersion },
      combatSubtype: combatSubtype === 'random' ? undefined : combatSubtype as CombatSubtype,
      weaponCategory: weaponCategory === 'random' ? undefined : weaponCategory,
      weaponType: weaponType === 'random' ? undefined : weaponType,
    });
  };
  
  const handleClear = async () => {
    if (!onClear) return;
    
    // Определяем что очищаем
    let scope: 'all' | 'type' | 'subtype' = 'all';
    let targetType: TechniqueType | undefined;
    let targetSubtype: CombatSubtype | undefined;
    
    if (selectedType === 'combat' && combatSubtype !== 'random') {
      scope = 'subtype';
      targetSubtype = combatSubtype as CombatSubtype;
    } else if (selectedType !== 'combat') {
      scope = 'type';
      targetType = selectedType;
    }
    
    // Подтверждение
    const confirmMessage = scope === 'subtype' 
      ? `Очистить техники подтипа "${combatSubtypeList.find(s => s.id === combatSubtype)?.name}"?`
      : scope === 'type'
      ? `Очистить все техники типа "${typeConfig.name}"?`
      : 'Очистить ВСЕ техники?';
    
    if (!confirm(confirmMessage)) return;
    
    await onClear({ scope, targetType, targetSubtype });
  };
  
  // Рендер слайдера параметра
  const renderParamSlider = (param: TechniqueTypeConfig['params'][0]) => (
    <div key={param.id} className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-sm text-slate-300">{param.label}</Label>
        <span className="text-sm text-amber-400 font-medium">
          {currentParams[param.id] ?? param.default}{param.unit || ''}
        </span>
      </div>
      <Slider
        value={[currentParams[param.id] ?? param.default]}
        onValueChange={([v]) => handleParamChange(param.id, v)}
        min={param.min}
        max={param.max}
        step={param.step}
        className="w-full"
      />
      <p className="text-xs text-slate-500">{param.description}</p>
    </div>
  );
  
  // Рендер бонусов редкости
  const renderRarityBonuses = () => {
    if (genRarity === 'random') return null;
    
    const bonusSlots = getBonusSlotsForRarity(selectedType, genRarity as Rarity);
    if (bonusSlots.length === 0) return null;
    
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
        <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Бонусы редкости {RARITY_INFO[genRarity as Rarity].label}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {bonusSlots.map((slot, idx) => (
            <div key={idx} className="bg-slate-700/50 rounded p-2">
              <div className="text-xs text-amber-400 font-medium">{slot.label}</div>
              <div className="text-xs text-slate-400">
                +{slot.minValue} ~ +{slot.maxValue}
              </div>
              <div className="text-xs text-slate-500 mt-1">{slot.description}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Рендер выбора подтипа для combat
  const renderCombatSubtypeSelection = () => {
    if (selectedType !== 'combat') return null;
    
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Sword className="w-5 h-5 text-amber-400" />
          Подтип атакующей техники
        </h3>
        <p className="text-sm text-slate-400">
          Выберите подтип техники или оставьте случайным для генерации всех типов.
        </p>
        
        {/* Выбор подтипа */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-slate-400">Подтип техники</Label>
            <Select value={combatSubtype} onValueChange={setCombatSubtype}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="random">🎲 Случайный</SelectItem>
                {combatSubtypeList.map(sub => (
                  <SelectItem key={sub.id} value={sub.id}>
                    <span className="flex items-center gap-2">
                      <span>{sub.icon}</span>
                      {sub.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Выбор категории и типа оружия - только для melee_weapon */}
          {(combatSubtype === 'melee_weapon' || combatSubtype === 'random') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Категория оружия */}
              <div>
                <Label className="text-xs text-slate-400">
                  Категория оружия {combatSubtype === 'random' && '(если melee_weapon)'}
                </Label>
                <Select value={weaponCategory} onValueChange={(v) => { setWeaponCategory(v); setWeaponType('random'); }}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700">
                    <SelectItem value="random">🎲 Случайная</SelectItem>
                    {weaponCategoryList.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          {cat.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Конкретный тип оружия (опционально) */}
              {weaponCategory !== 'random' && (
                <div>
                  <Label className="text-xs text-slate-400">Тип оружия (опционально)</Label>
                  <Select value={weaponType} onValueChange={setWeaponType}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                      <SelectValue placeholder="Любой из категории" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      <SelectItem value="random">🎲 Любой из категории</SelectItem>
                      {weaponCategoryList
                        .find(c => c.id === weaponCategory)?.weapons
                        .map(wId => weaponList.find(w => w.id === wId))
                        .filter(Boolean)
                        .map(w => (
                          <SelectItem key={w!.id} value={w!.id}>
                            <span className="flex items-center gap-2">
                              <span>{w!.icon}</span>
                              {w!.name}
                              <span className="text-xs text-slate-400">({w!.baseRange}м)</span>
                            </span>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Информация о выбранном подтипе */}
        {combatSubtype !== 'random' && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">
                {combatSubtypeList.find(s => s.id === combatSubtype)?.icon}
              </span>
              <div>
                <div className="font-medium text-slate-200">
                  {combatSubtypeList.find(s => s.id === combatSubtype)?.name}
                </div>
                <div className="text-sm text-slate-400">
                  {combatSubtypeList.find(s => s.id === combatSubtype)?.description}
                </div>
              </div>
            </div>
            
            {/* Характеристики подтипа */}
            {(() => {
              const subConfig = combatSubtypeList.find(s => s.id === combatSubtype);
              if (!subConfig) return null;
              
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                  {subConfig.requiresWeaponType && (
                    <Badge variant="outline" className="border-purple-500 text-purple-400">
                      Требует оружие
                    </Badge>
                  )}
                  {subConfig.hasDamageFalloff && (
                    <Badge variant="outline" className="border-orange-500 text-orange-400">
                      Затухание урона
                    </Badge>
                  )}
                  {subConfig.canRangedQi && (
                    <Badge variant="outline" className="border-amber-500 text-amber-400">
                      Волна Ци (легенда)
                    </Badge>
                  )}
                  {subConfig.baseRange !== undefined && (
                    <Badge variant="outline" className="border-slate-500 text-slate-300">
                      База: {subConfig.baseRange}м
                    </Badge>
                  )}
                </div>
              );
            })()}
          </div>
        )}
        
        {/* Информация о выбранной категории */}
        {combatSubtype === 'melee_weapon' && weaponCategory !== 'random' && (
          <div className="bg-slate-700/30 rounded-lg p-3">
            {(() => {
              const category = weaponCategoryList.find(c => c.id === weaponCategory);
              if (!category) return null;
              
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.icon}</span>
                    <div>
                      <div className="font-medium text-slate-200">{category.name}</div>
                      <div className="text-sm text-slate-400">{category.description}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {category.weapons.map(wId => {
                      const w = weaponList.find(weapon => weapon.id === wId);
                      return w ? (
                        <Badge key={wId} variant="outline" className="border-slate-500 text-slate-300">
                          {w.icon} {w.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                    <div className="bg-slate-600/30 rounded p-2 text-center">
                      <div className="text-slate-400">Сред. урон</div>
                      <div className="text-red-400 font-medium">
                        ×{category.baseStats.avgDamage.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-600/30 rounded p-2 text-center">
                      <div className="text-slate-400">Сред. скорость</div>
                      <div className="text-green-400 font-medium">
                        ×{category.baseStats.avgSpeed.toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-slate-600/30 rounded p-2 text-center">
                      <div className="text-slate-400">Сред. дальность</div>
                      <div className="text-amber-400 font-medium">
                        {category.baseStats.avgRange.toFixed(1)}м
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
        
        {/* Информация о выбранном оружии (если указано) */}
        {combatSubtype === 'melee_weapon' && weaponCategory !== 'random' && weaponType !== 'random' && (
          <div className="bg-slate-700/30 rounded-lg p-3 border border-amber-500/30">
            {(() => {
              const weapon = weaponList.find(w => w.id === weaponType);
              const category = weaponCategoryList.find(c => c.id === weaponCategory);
              const bonus = category?.weaponBonuses[weaponType as keyof typeof category.weaponBonuses];
              if (!weapon) return null;
              
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{weapon.icon}</span>
                    <div>
                      <div className="font-medium text-slate-200">{weapon.name}</div>
                      <div className="text-sm text-slate-400">{weapon.description}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-sm">
                    <div className="bg-slate-600/30 rounded p-2 text-center">
                      <div className="text-slate-400">Дальность</div>
                      <div className="text-amber-400 font-medium">{weapon.baseRange}м</div>
                    </div>
                    <div className="bg-slate-600/30 rounded p-2 text-center">
                      <div className="text-slate-400">Множ. урона</div>
                      <div className="text-red-400 font-medium">×{bonus?.damageMod?.toFixed(2) || '1.00'}</div>
                    </div>
                    <div className="bg-slate-600/30 rounded p-2 text-center">
                      <div className="text-slate-400">Скорость</div>
                      <div className="text-green-400 font-medium">×{bonus?.speedMod?.toFixed(2) || '1.00'}</div>
                    </div>
                    <div className="bg-slate-600/30 rounded p-2 text-center">
                      <div className="text-slate-400">Крит</div>
                      <div className="text-purple-400 font-medium">+{bonus?.critBonus || 0}%</div>
                    </div>
                  </div>
                  {bonus?.specialEffect && (
                    <div className="text-xs text-cyan-400 mt-1">
                      ✦ Особый эффект: {bonus.specialEffect}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Баннер V2 */}
      {showV2Info && genVersion === 2 && (
        <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Sparkles className="w-5 h-5 text-green-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-medium text-green-400">V2 Генератор активен</div>
              <p className="text-xs text-slate-400 mt-1">
                <strong>baseDamage = qiCost</strong> • Формулы вместо таблиц • Архитектура "Матрёшка"
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Формула урона: <code className="text-amber-400">qiCost × gradeMult × specMult</code>
              </p>
            </div>
            <button 
              onClick={() => setShowV2Info(false)}
              className="text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Выбор типа техники */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Info className="w-5 h-5 text-amber-400" />
          Выберите тип техники
        </h3>
        <p className="text-sm text-slate-400">
          Выберите один тип техники для генерации. Для каждого типа доступны свои параметры.
        </p>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {typeList.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`
                flex flex-col items-center justify-center p-3 rounded-lg border cursor-pointer transition-all
                ${selectedType === type.id 
                  ? 'bg-amber-600/20 border-amber-500 text-amber-400' 
                  : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700 hover:border-slate-500'}
              `}
            >
              <span className="mb-1">{TYPE_ICONS[type.id]}</span>
              <span className="text-xs font-medium text-center">{type.name}</span>
            </button>
          ))}
        </div>
        
        {/* Описание выбранного типа */}
        <div className="bg-slate-700/30 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">{TYPE_ICONS[selectedType]}</span>
            <div>
              <div className="font-medium text-slate-200">{typeConfig.name}</div>
              <div className="text-sm text-slate-400">{typeConfig.description}</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Выбор подтипа для combat */}
      {renderCombatSubtypeSelection()}
      
      {/* Основные параметры генерации */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200">Параметры генерации</h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Уровень */}
          <div>
            <Label className="text-xs text-slate-400">Уровень</Label>
            <Select value={genLevel} onValueChange={setGenLevel}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="all">Все уровни</SelectItem>
                {Array.from({ length: 9 }, (_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    Уровень {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Редкость */}
          <div>
            <Label className="text-xs text-slate-400">Редкость</Label>
            <Select value={genRarity} onValueChange={setGenRarity}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="random">🎲 Случайная</SelectItem>
                {Object.entries(RARITY_INFO).map(([key, info]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${info.bgColor}`} />
                      {info.label} ({info.bonusSlots} бонусов)
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Количество */}
          <div>
            <Label className="text-xs text-slate-400">Количество</Label>
            <Input
              type="number"
              value={genCount}
              onChange={(e) => setGenCount(parseInt(e.target.value) || 50)}
              className="bg-slate-700 border-slate-600 text-white mt-1"
              min={1}
              max={10000}
            />
          </div>
          
          {/* Режим */}
          <div>
            <Label className="text-xs text-slate-400">Режим</Label>
            <Select value={genMode} onValueChange={(v) => setGenMode(v as 'replace' | 'append')}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="replace">Заменить</SelectItem>
                <SelectItem value="append">Добавить</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Версия генератора */}
          <div>
            <Label className="text-xs text-slate-400">Версия</Label>
            <Select value={String(genVersion)} onValueChange={(v) => setGenVersion(Number(v) as 1 | 2)}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="2">V2 (рекомендуется)</SelectItem>
                <SelectItem value="1">V1 (deprecated)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Информация о редкости */}
        {genRarity !== 'random' && (
          <div className={`bg-slate-700/30 rounded p-3 ${RARITY_INFO[genRarity as Rarity].color}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`w-3 h-3 rounded-full ${RARITY_INFO[genRarity as Rarity].bgColor}`} />
              <span className="font-medium">{RARITY_INFO[genRarity as Rarity].label}</span>
              <Badge variant="outline" className="text-xs">
                {RARITY_INFO[genRarity as Rarity].bonusSlots} бонусов
              </Badge>
            </div>
            <p className="text-sm text-slate-400">{RARITY_INFO[genRarity as Rarity].description}</p>
          </div>
        )}
        
        {/* Бонусы редкости для выбранного типа */}
        {renderRarityBonuses()}
      </div>
      
      {/* Специфичные параметры типа */}
      {typeConfig.params.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
          <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
            <span className="text-amber-400">{TYPE_ICONS[selectedType]}</span>
            Параметры {typeConfig.name}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {typeConfig.params.map(renderParamSlider)}
          </div>
        </div>
      )}
      
      {/* Расширенные настройки */}
      <div className="bg-slate-800/50 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-4 flex items-center justify-between text-slate-300 hover:bg-slate-700/30 transition-colors"
        >
          <span className="font-medium">Расширенные настройки</span>
          {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        
        {showAdvanced && (
          <div className="p-4 pt-0 space-y-4 border-t border-slate-700">
            {/* Границы параметров */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-300">Границы параметров</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <Label className="text-xs text-slate-400">Мин. урон</Label>
                  <Input
                    type="number"
                    placeholder={String(typeConfig.baseBounds.damageMin)}
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Макс. урон</Label>
                  <Input
                    type="number"
                    placeholder={String(typeConfig.baseBounds.damageMax)}
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Мин. Ци</Label>
                  <Input
                    type="number"
                    placeholder={String(typeConfig.baseBounds.qiCostMin)}
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Макс. Ци</Label>
                  <Input
                    type="number"
                    placeholder={String(typeConfig.baseBounds.qiCostMax)}
                    className="bg-slate-700 border-slate-600 text-white mt-1 text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Информация об уборке дубликатов */}
            <div className="bg-amber-900/20 border border-amber-700/50 rounded p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-sm font-medium text-amber-400">Автоматическая уборка дубликатов</div>
                  <p className="text-xs text-slate-400 mt-1">
                    После генерации автоматически удаляются техники с полностью идентичными параметрами 
                    (тип, элемент, редкость, урон, Ци, эффекты и их значения).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Кнопка генерации */}
      <Button
        onClick={handleGenerate}
        disabled={loading}
        className="w-full bg-amber-600 hover:bg-amber-700 h-12 text-lg"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5 mr-2" />
        )}
        Сгенерировать {genCount} техник &quot;{typeConfig.name}&quot;
      </Button>
      
      {/* Кнопка очистки */}
      {onClear && (
        <div className="flex justify-end">
          <Button
            onClick={handleClear}
            disabled={loading}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {selectedType === 'combat' && combatSubtype !== 'random' 
              ? `Очистить "${combatSubtypeList.find(s => s.id === combatSubtype)?.name}"`
              : selectedType !== 'combat'
              ? `Очистить "${typeConfig.name}"`
              : 'Очистить все техники'
            }
          </Button>
        </div>
      )}
      
      {/* Краткая сводка */}
      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
        <p className="text-sm text-slate-400">
          Генерация: <span className="text-amber-400">{typeConfig.name}</span>
          {selectedType === 'combat' && combatSubtype !== 'random' && (
            <> → <span className="text-purple-400">
              {combatSubtypeList.find(s => s.id === combatSubtype)?.name}
            </span></>
          )}
          {selectedType === 'combat' && combatSubtype === 'melee_weapon' && weaponCategory !== 'random' && (
            <> → <span className="text-cyan-400">
              {weaponCategoryList.find(c => c.id === weaponCategory)?.name}
            </span></>
          )}
          {selectedType === 'combat' && combatSubtype === 'melee_weapon' && weaponCategory !== 'random' && weaponType !== 'random' && (
            <> (<span className="text-green-400">
              {weaponList.find(w => w.id === weaponType)?.name}
            </span>)</>
          )}
          {genRarity !== 'random' && (
            <> • <span className={RARITY_INFO[genRarity as Rarity].color}>
              {RARITY_INFO[genRarity as Rarity].label}
            </span></>
          )}
          {genLevel !== 'all' && (
            <> • Уровень <span className="text-amber-400">{genLevel}</span></>
          )}
        </p>
      </div>
    </div>
  );
}
