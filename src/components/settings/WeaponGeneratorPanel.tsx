'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Info,
  ChevronDown,
  ChevronUp,
  Sword,
  Trash2,
} from 'lucide-react';
import type { Rarity } from '@/lib/generator/base-item-generator';
import { RARITY_INFO } from '@/lib/generator/base-item-generator';
import {
  getWeaponCategoryList,
  getWeaponTypeList,
  getWeaponsForCategory,
  type WeaponCategory,
  type WeaponType,
} from '@/lib/generator/item-config';

interface WeaponGeneratorPanelProps {
  onGenerate: (params: {
    category?: WeaponCategory;
    weaponType?: WeaponType;
    level: number;
    rarity?: Rarity;
    count: number;
    mode: 'replace' | 'append';
  }) => Promise<void>;
  onClear?: () => Promise<void>;
  loading: boolean;
}

export function WeaponGeneratorPanel({ onGenerate, onClear, loading }: WeaponGeneratorPanelProps) {
  // Параметры генерации
  const [category, setCategory] = useState<string>('random');
  const [weaponType, setWeaponType] = useState<string>('random');
  const [genLevel, setGenLevel] = useState<string>('all');
  const [genRarity, setGenRarity] = useState<string>('random');
  const [genCount, setGenCount] = useState(50);
  const [genMode, setGenMode] = useState<'replace' | 'append'>('append');
  
  // UI состояние
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const categoryList = getWeaponCategoryList();
  const weaponList = getWeaponTypeList();
  
  // Оружие для выбранной категории
  const weaponsForCategory = useMemo(() => {
    if (category === 'random') return [];
    return getWeaponsForCategory(category as WeaponCategory);
  }, [category]);
  
  // Сброс типа оружия при смене категории
  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setWeaponType('random');
  };
  
  const handleGenerate = async () => {
    await onGenerate({
      category: category === 'random' ? undefined : category as WeaponCategory,
      weaponType: weaponType === 'random' ? undefined : weaponType as WeaponType,
      level: genLevel === 'all' ? 0 : parseInt(genLevel),
      rarity: genRarity === 'random' ? undefined : genRarity as Rarity,
      count: genCount,
      mode: genMode,
    });
  };
  
  const handleClear = async () => {
    if (!onClear) return;
    if (!confirm('Очистить всё сгенерированное оружие?')) return;
    await onClear();
  };
  
  // Информация о выбранной категории
  const renderCategoryInfo = () => {
    if (category === 'random') return null;
    
    const cat = categoryList.find(c => c.id === category);
    if (!cat) return null;
    
    return (
      <div className="bg-slate-700/30 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{cat.icon}</span>
          <div>
            <div className="font-medium text-slate-200">{cat.name}</div>
            <div className="text-sm text-slate-400">{cat.description}</div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {cat.weapons.map(wId => {
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
              ×{cat.baseStats.avgDamage.toFixed(2)}
            </div>
          </div>
          <div className="bg-slate-600/30 rounded p-2 text-center">
            <div className="text-slate-400">Сред. скорость</div>
            <div className="text-green-400 font-medium">
              ×{cat.baseStats.avgSpeed.toFixed(2)}
            </div>
          </div>
          <div className="bg-slate-600/30 rounded p-2 text-center">
            <div className="text-slate-400">Сред. дальность</div>
            <div className="text-amber-400 font-medium">
              ×{cat.baseStats.avgRange.toFixed(1)}м
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Информация о выбранном оружии
  const renderWeaponInfo = () => {
    if (weaponType === 'random' || category === 'random') return null;
    
    const weapon = weaponList.find(w => w.id === weaponType);
    if (!weapon) return null;
    
    return (
      <div className="bg-slate-700/30 rounded-lg p-3 border border-amber-500/30">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xl">{weapon.icon}</span>
          <div>
            <div className="font-medium text-slate-200">{weapon.name}</div>
            <div className="text-sm text-slate-400">{weapon.description}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="bg-slate-600/30 rounded p-2 text-center">
            <div className="text-slate-400">Урон</div>
            <div className="text-red-400 font-medium">{weapon.baseDamage}</div>
          </div>
          <div className="bg-slate-600/30 rounded p-2 text-center">
            <div className="text-slate-400">Дальность</div>
            <div className="text-amber-400 font-medium">{weapon.baseRange}м</div>
          </div>
          <div className="bg-slate-600/30 rounded p-2 text-center">
            <div className="text-slate-400">Скорость</div>
            <div className="text-green-400 font-medium">×{weapon.attackSpeed}</div>
          </div>
          <div className="bg-slate-600/30 rounded p-2 text-center">
            <div className="text-slate-400">Род</div>
            <div className="text-purple-400 font-medium">
              {weapon.gender === 'male' ? 'Муж.' : weapon.gender === 'female' ? 'Жен.' : 'Ср.'}
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      {/* Выбор категории и типа оружия */}
      <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
        <h3 className="text-lg font-medium text-slate-200 flex items-center gap-2">
          <Sword className="w-5 h-5 text-amber-400" />
          Выбор оружия
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Категория */}
          <div>
            <Label className="text-xs text-slate-400">Категория оружия</Label>
            <Select value={category} onValueChange={handleCategoryChange}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-700">
                <SelectItem value="random">🎲 Случайная</SelectItem>
                {categoryList.map(cat => (
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
          
          {/* Тип оружия */}
          {category !== 'random' && (
            <div>
              <Label className="text-xs text-slate-400">Тип оружия (опционально)</Label>
              <Select value={weaponType} onValueChange={setWeaponType}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white mt-1">
                  <SelectValue placeholder="Любой из категории" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700">
                  <SelectItem value="random">🎲 Любой из категории</SelectItem>
                  {weaponsForCategory.map(w => (
                    <SelectItem key={w.id} value={w.id}>
                      <span className="flex items-center gap-2">
                        <span>{w.icon}</span>
                        {w.name}
                        <span className="text-xs text-slate-400">({w.baseRange}м)</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        
        {/* Информация о категории */}
        {renderCategoryInfo()}
        
        {/* Информация о конкретном оружии */}
        {renderWeaponInfo()}
      </div>
      
      {/* Основные параметры */}
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
                      {info.label}
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
      </div>
      
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
            <p className="text-sm text-slate-400">
              Дополнительные настройки будут добавлены позже.
            </p>
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
        Сгенерировать {genCount} единиц оружия
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
            Очистить всё оружие
          </Button>
        </div>
      )}
      
      {/* Краткая сводка */}
      <div className="bg-slate-700/30 rounded-lg p-3 text-center">
        <p className="text-sm text-slate-400">
          Генерация: <span className="text-amber-400">Оружие</span>
          {category !== 'random' && (
            <> → <span className="text-purple-400">
              {categoryList.find(c => c.id === category)?.name}
            </span></>
          )}
          {weaponType !== 'random' && category !== 'random' && (
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
