/**
 * Techniques Dialog Component
 * 
 * UI для просмотра и использования техник:
 * - 3 категории: Культивация, Формации, Бой
 * - Культивация: 1 слот, используется автоматически при медитации
 * - Формации: можно использовать из меню
 * - Бой: 3+ слотов (зависит от уровня), быстрый вызов
 * 
 * Поддержка Drag & Drop для назначения техник в слоты
 */

'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGameCharacter, useGameTechniques, useGameActions } from '@/stores/game.store';
import { canUseTechnique, calculateTechniqueEffectiveness } from '@/lib/game/techniques';
import type { CharacterTechnique, Technique } from '@/types/game';
import { ELEMENT_NAMES } from '@/lib/constants/elements';
import { RARITY_TEXT_COLORS } from '@/types/rarity';
import { GradeBadge } from '@/components/equipment/GradeBadge';
import { TechniqueDetailDialog } from '@/components/technique/TechniqueDetailDialog';
import type { TechniqueGrade } from '@/types/grade';

interface TechniquesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TYPE_COLORS: Record<string, string> = {
  combat: 'border-red-500 text-red-400',
  cultivation: 'border-purple-500 text-purple-400',
  support: 'border-blue-500 text-blue-400',
  movement: 'border-green-500 text-green-400',
  sensory: 'border-cyan-500 text-cyan-400',
  healing: 'border-pink-500 text-pink-400',
  formation: 'border-amber-500 text-amber-400',
};

const TYPE_NAMES: Record<string, string> = {
  combat: '⚔️ Боевая',
  cultivation: '🌀 Культивация',
  support: '🛡️ Поддержка',
  movement: '🏃 Перемещение',
  sensory: '👁️ Восприятие',
  healing: '💚 Исцеление',
  formation: '⭕ Формация',
};

// ELEMENT_NAMES импортируется из @/lib/constants/elements
// RARITY_TEXT_COLORS импортируется из @/types/rarity

// Форматирование мастерства - 2 знака после запятой
function formatMastery(mastery: number): string {
  return Number(mastery).toFixed(2);
}

// Функция для получения количества боевых слотов
function getCombatSlotsCountLocal(level: number): number {
  return 3 + Math.max(0, level - 1);
}

/**
 * Компонент для отображения эффектов формации
 */
function FormationEffectsDisplay({ technique }: { technique: Technique }) {
  // Парсим effects если это строка
  let effectsData: {
    formationType?: string;
    formationEffects?: {
      unnoticeability?: number;
      interruptionReduction?: number;  // Legacy field
      qiBonus?: number;
      qiDensityBonus?: number;
      fatigueRecoveryBonus?: number;
      spiritRepel?: number;
    };
    setupTime?: number;
    duration?: number;
    difficulty?: number;
  } = {};
  
  try {
    if (technique.effects) {
      if (typeof technique.effects === 'string') {
        effectsData = JSON.parse(technique.effects);
      } else {
        effectsData = technique.effects as typeof effectsData;
      }
    }
  } catch {
    // Ignore parse errors
  }
  
  const formationEffects = effectsData.formationEffects || {};
  const duration = effectsData.duration || 8;
  const setupTime = effectsData.setupTime || 15;
  
  // Поддержка старого поля interruptionReduction
  const unnoticeability = formationEffects.unnoticeability ?? formationEffects.interruptionReduction ?? 0;
  
  return (
    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Затраты Ци:</span>
        <span className="text-cyan-400">{technique.qiCost}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Время установки:</span>
        <span className="text-white">{setupTime} мин</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">Длительность:</span>
        <span className="text-white">{duration === 0 ? 'Постоянная' : `${duration} ч`}</span>
      </div>
      
      {/* Разделитель эффектов */}
      {unnoticeability > 0 && (
        <div className="flex justify-between text-sm pt-1 border-t border-slate-600">
          <span className="text-slate-400">🛡️ Незаметность:</span>
          <span className="text-green-400">+{unnoticeability}%</span>
        </div>
      )}
      
      {formationEffects.qiBonus && formationEffects.qiBonus > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">💫 Бонус поглощения Ци:</span>
          <span className="text-cyan-400">+{formationEffects.qiBonus}%</span>
        </div>
      )}
      
      {formationEffects.qiDensityBonus && formationEffects.qiDensityBonus > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">🌀 Плотность Ци:</span>
          <span className="text-purple-400">+{formationEffects.qiDensityBonus} ед.</span>
        </div>
      )}
      
      {formationEffects.fatigueRecoveryBonus && formationEffects.fatigueRecoveryBonus > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">💚 Восстановление усталости:</span>
          <span className="text-green-400">+{formationEffects.fatigueRecoveryBonus}%</span>
        </div>
      )}
      
      {formationEffects.spiritRepel && formationEffects.spiritRepel > 0 && (
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">👻 Отпугивание духов:</span>
          <span className="text-amber-400">+{formationEffects.spiritRepel}%</span>
        </div>
      )}
      
      <div className="flex justify-between text-sm pt-1 border-t border-slate-600">
        <span className="text-slate-400">Мастерство:</span>
        <span className="text-amber-400">{technique.level}</span>
      </div>
    </div>
  );
}

/**
 * Компонент техники в списке с поддержкой drag
 */
interface DraggableTechniqueItemProps {
  technique: CharacterTechnique;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (e: React.DragEvent, technique: CharacterTechnique) => void;
  onDragEnd: (e: React.DragEvent) => void;
}

function DraggableTechniqueItem({ 
  technique, 
  isSelected, 
  onSelect,
  onDragStart,
  onDragEnd
}: DraggableTechniqueItemProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, technique)}
      onDragEnd={onDragEnd}
      onClick={onSelect}
      className={`w-full justify-start text-left h-auto py-2 px-3 cursor-grab active:cursor-grabbing rounded-lg transition-all ${
        isSelected
          ? 'bg-slate-700 ring-2 ring-amber-500/50'
          : 'hover:bg-slate-700/50'
      }`}
    >
      <div className="w-full">
        <div className="flex items-center gap-2">
          <div className="text-sm text-white truncate">{technique.technique.name}</div>
          {technique.quickSlot !== null && (
            <Badge variant="outline" className="text-xs border-green-500 text-green-400">
              {technique.quickSlot === 0 ? '🧘' : `${technique.quickSlot}`}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>Ур. {technique.technique.level}</span>
          <span>•</span>
          <span>Мастерство: {formatMastery(technique.mastery)}%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Компонент слота с поддержкой drop
 */
interface DroppableSlotProps {
  slotIndex: number;
  technique: CharacterTechnique | null;
  isSlot1: boolean;
  canAssignToSlot: boolean;
  isDragOver: boolean;
  onClear: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, slotIndex: number) => void;
}

function DroppableSlot({
  slotIndex,
  technique,
  isSlot1,
  canAssignToSlot,
  isDragOver,
  onClear,
  onDragOver,
  onDragLeave,
  onDrop
}: DroppableSlotProps) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, slotIndex)}
      className={`relative rounded-lg p-2 border text-center transition-all min-h-[60px] flex flex-col justify-center ${
        isDragOver 
          ? 'bg-amber-900/30 border-amber-500 ring-2 ring-amber-500/50' 
          : technique
            ? 'bg-slate-700/50 border-green-500/50'
            : 'bg-slate-800/50 border-slate-600/50 hover:border-slate-500'
      }`}
    >
      <div className="text-xs text-slate-500 mb-1 font-medium">
        {isSlot1 ? '👊' : ''} {slotIndex + 1}
      </div>
      {technique ? (
        <>
          <div className="text-xs text-white truncate font-medium">{technique.technique.name}</div>
          <div className="text-[10px] text-slate-400 truncate">
            Ур.{technique.technique.level} • {formatMastery(technique.mastery)}%
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="absolute -top-1 -right-1 h-4 w-4 p-0 text-red-400 hover:text-red-300 bg-slate-800 rounded-full flex items-center justify-center text-xs"
          >
            ✕
          </button>
        </>
      ) : (
        <div className="text-xs text-slate-500">Пуст</div>
      )}
    </div>
  );
}

export function TechniquesDialog({ open, onOpenChange }: TechniquesDialogProps) {
  const character = useGameCharacter();
  const techniques = useGameTechniques();
  const { loadTechniques, loadState } = useGameActions();

  const [selectedTechnique, setSelectedTechnique] = useState<CharacterTechnique | null>(null);
  const [isUsing, setIsUsing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('cultivation');
  const [draggedTechnique, setDraggedTechnique] = useState<CharacterTechnique | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null);
  const dragImageRef = useRef<HTMLDivElement | null>(null);
  
  // Каталог всех доступных техник (для просмотра)
  const [catalogTechniques, setCatalogTechniques] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  // Разделение техник по категориям
  const techniquesByCategory = useMemo(() => {
    const cultivation: CharacterTechnique[] = [];
    const formations: CharacterTechnique[] = [];
    const combat: CharacterTechnique[] = [];
    
    for (const t of techniques) {
      const type = t.technique.type;
      if (type === 'cultivation') {
        cultivation.push(t);
      } else if (type === 'formation') {
        formations.push(t);
      } else {
        // combat, support, movement, sensory, healing - всё это "бой" для слотов
        combat.push(t);
      }
    }
    
    return { cultivation, formations, combat };
  }, [techniques]);

  // Количество боевых слотов
  const combatSlotsCount = character ? getCombatSlotsCountLocal(character.cultivationLevel) : 3;

  // Текущая техника культивации в слоте
  const cultivationSlotTechnique = useMemo(() => {
    return techniques.find(t => t.quickSlot === 0 && t.technique.type === 'cultivation');
  }, [techniques]);

  // Техники в боевых слотах
  const combatSlotTechniques = useMemo(() => {
    const slots: (CharacterTechnique | null)[] = Array(combatSlotsCount).fill(null);
    for (const t of techniques) {
      if (t.quickSlot !== null && t.quickSlot > 0 && t.quickSlot <= combatSlotsCount) {
        slots[t.quickSlot - 1] = t;
      }
    }
    return slots;
  }, [techniques, combatSlotsCount]);

  // Назначить технику в слот
  const handleAssignSlot = useCallback(async (slotType: 'cultivation' | 'combat', slotIndex?: number) => {
    if (!character || !selectedTechnique) return;

    try {
      const response = await fetch('/api/technique/slot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          slotType,
          slotIndex,
          techniqueId: selectedTechnique.techniqueId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadTechniques();
        setResult({ success: true, message: data.message });
      } else {
        setResult({ success: false, message: data.error });
      }
    } catch (error) {
      setResult({ success: false, message: 'Ошибка соединения' });
    }
  }, [character, selectedTechnique, loadTechniques]);

  // Назначить технику в слот по ID (для drag & drop)
  const handleAssignTechniqueToSlot = useCallback(async (techniqueId: string, slotIndex: number) => {
    if (!character) return;

    try {
      const response = await fetch('/api/technique/slot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          slotType: 'combat',
          slotIndex,
          techniqueId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadTechniques();
        setResult({ success: true, message: data.message });
      } else {
        setResult({ success: false, message: data.error });
      }
    } catch (error) {
      setResult({ success: false, message: 'Ошибка соединения' });
    }
  }, [character, loadTechniques]);

  // Очистить слот
  const handleClearSlot = useCallback(async (slotType: 'cultivation' | 'combat', slotIndex?: number) => {
    if (!character) return;

    try {
      const response = await fetch('/api/technique/slot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          slotType,
          slotIndex,
          techniqueId: null, // null очищает слот
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadTechniques();
        setResult({ success: true, message: 'Слот очищен' });
      } else {
        setResult({ success: false, message: data.error });
      }
    } catch (error) {
      setResult({ success: false, message: 'Ошибка соединения' });
    }
  }, [character, loadTechniques]);

  // Drag & Drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, technique: CharacterTechnique) => {
    setDraggedTechnique(technique);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', technique.techniqueId);
    
    // Создаем кастомный drag image
    const dragImage = document.createElement('div');
    dragImage.className = 'bg-slate-800 border border-amber-500 rounded-lg px-3 py-2 text-white text-sm shadow-lg';
    dragImage.textContent = technique.technique.name;
    document.body.appendChild(dragImage);
    e.dataTransfer.setDragImage(dragImage, 0, 0);
    setTimeout(() => document.body.removeChild(dragImage), 0);
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    setDraggedTechnique(null);
    setDragOverSlot(null);
  }, []);

  const handleSlotDragOver = useCallback((e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot(slotIndex);
  }, []);

  const handleSlotDragLeave = useCallback((e: React.DragEvent) => {
    setDragOverSlot(null);
  }, []);

  const handleSlotDrop = useCallback(async (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    const techniqueId = e.dataTransfer.getData('text/plain');
    if (!techniqueId || !character) return;
    
    // Проверяем, можно ли назначить в этот слот
    const isSlot1 = slotIndex === 0;
    const technique = techniques.find(t => t.techniqueId === techniqueId);
    
    if (technique) {
      const subtype = technique.technique.subtype;
      // Слот 1 только для техник тела (melee_strike = удары руками/ногами)
      if (isSlot1 && subtype !== 'melee_strike') {
        setResult({ success: false, message: 'Слот 1 только для техник тела (удары руками/ногами)' });
        return;
      }
    }
    
    await handleAssignTechniqueToSlot(techniqueId, slotIndex);
    setDraggedTechnique(null);
  }, [character, techniques, handleAssignTechniqueToSlot]);

  // Проверка возможности использования (только формации!)
  const canUse = useMemo(() => {
    if (!character || !selectedTechnique) return { canUse: false, reason: '' };
    
    // Формации можно использовать из меню
    if (selectedTechnique.technique.type === 'formation') {
      return canUseTechnique(selectedTechnique.technique as any, character as any);
    }
    
    // Остальные техники - только через слоты
    return { 
      canUse: false, 
      reason: 'Эта техника используется через слоты быстрого доступа' 
    };
  }, [character, selectedTechnique]);

  // Эффективность техники
  const effectiveness = useMemo(() => {
    if (!character || !selectedTechnique) return 1;
    return calculateTechniqueEffectiveness(
      selectedTechnique.technique as any, 
      character as any,
      selectedTechnique.mastery // Передаём мастерство из CharacterTechnique
    );
  }, [character, selectedTechnique]);

  // Использование техники (только формации!)
  const handleUseTechnique = useCallback(async () => {
    if (!character || !selectedTechnique || !canUse.canUse) return;

    setIsUsing(true);
    setResult(null);

    try {
      const response = await fetch('/api/technique/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          techniqueId: selectedTechnique.techniqueId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({ success: true, message: data.message });
        await loadTechniques();
      } else {
        setResult({ success: false, message: data.error || 'Ошибка использования' });
      }
    } catch (error) {
      console.error('Technique use error:', error);
      setResult({ success: false, message: 'Ошибка соединения' });
    } finally {
      setIsUsing(false);
    }
  }, [character, selectedTechnique, canUse.canUse, loadTechniques]);

  // Загрузка каталога техник
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const res = await fetch('/api/generator/techniques?action=list');
      const data = await res.json();
      if (data.success && data.techniques) {
        setCatalogTechniques(data.techniques);
      }
    } catch (error) {
      console.error('Failed to load catalog:', error);
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  // Загрузка данных при открытии диалога
  const handleOpenChange = useCallback(async (newOpen: boolean) => {
    if (newOpen) {
      // Загружаем актуальные данные при открытии
      await loadTechniques();
      await loadState();
      // Загружаем каталог техник
      await loadCatalog();
    } else {
      // Сброс при закрытии
      setSelectedTechnique(null);
      setResult(null);
      setActiveCategory('cultivation');
      setDraggedTechnique(null);
      setDragOverSlot(null);
      setShowCatalog(false);
    }
    onOpenChange(newOpen);
  }, [loadTechniques, loadState, loadCatalog, onOpenChange]);

  if (!character) return null;

  // Рендер списка техник для категории
  const renderTechniqueList = (techList: CharacterTechnique[]) => (
    <ScrollArea className="h-[300px]">
      {techList.length === 0 ? (
        <div className="text-center text-slate-500 py-8">
          Нет изученных техник этой категории
        </div>
      ) : (
        <div className="space-y-1">
          {techList.map((t) => (
            <DraggableTechniqueItem
              key={t.id}
              technique={t}
              isSelected={selectedTechnique?.id === t.id}
              onSelect={() => {
                setSelectedTechnique(t);
                setResult(null);
              }}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))}
        </div>
      )}
    </ScrollArea>
  );

  // Рендер слотов для категории
  const renderSlots = (category: 'cultivation' | 'combat') => {
    if (category === 'cultivation') {
      return (
        <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-purple-400">🧘 Слот культивации</h4>
            {cultivationSlotTechnique && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleClearSlot('cultivation')}
                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 h-6 px-2"
              >
                ✕ Очистить
              </Button>
            )}
          </div>
          {cultivationSlotTechnique ? (
            <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-2">
              <div className="flex-1">
                <div className="text-white text-sm font-medium">{cultivationSlotTechnique.technique.name}</div>
                <div className="text-xs text-slate-400">
                  +{cultivationSlotTechnique.technique.effects?.qiRegenPercent || 0}% Ци • Мастерство: {formatMastery(cultivationSlotTechnique.mastery)}%
                </div>
              </div>
              <Badge variant="outline" className="border-purple-500 text-purple-400">
                Активна
              </Badge>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-3 border border-dashed border-slate-600 rounded-lg">
              Слот пуст. Выберите технику культивации и нажмите "Назначить"
            </div>
          )}
          <p className="text-xs text-slate-500 mt-2">
            Техника в слоте применяется автоматически при медитации.
          </p>
        </div>
      );
    }
    
    // Боевые слоты - адаптивная сетка
    const gridCols = combatSlotsCount <= 6 ? 'grid-cols-6' : 
                     combatSlotsCount <= 8 ? 'grid-cols-4 sm:grid-cols-6 lg:grid-cols-8' : 
                     'grid-cols-4 sm:grid-cols-6 lg:grid-cols-11';
    
    return (
      <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-red-400">⚔️ Боевые слоты ({combatSlotsCount})</h4>
          <span className="text-xs text-slate-500">Уровень {character.cultivationLevel}</span>
        </div>
        <div className={`grid ${gridCols} gap-2`}>
          {combatSlotTechniques.map((tech, index) => {
            const isSlot1 = index === 0;
            // Проверяем можно ли назначить в этот слот
            let canAssignToSlot = true;
            if (isSlot1 && draggedTechnique) {
              const subtype = draggedTechnique.technique.subtype;
              // Слот 1 только для техник тела (melee_strike)
              canAssignToSlot = subtype === 'melee_strike';
            }
            
            return (
              <DroppableSlot
                key={index}
                slotIndex={index}
                technique={tech}
                isSlot1={isSlot1}
                canAssignToSlot={canAssignToSlot}
                isDragOver={dragOverSlot === index}
                onClear={() => handleClearSlot('combat', index)}
                onDragOver={(e) => handleSlotDragOver(e, index)}
                onDragLeave={handleSlotDragLeave}
                onDrop={handleSlotDrop}
              />
            );
          })}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          ⬇️ Перетащите технику на слот или используйте кнопки ниже
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-amber-400 flex items-center gap-2 text-xl">
            ⚔️ Техники
            {draggedTechnique && (
              <Badge variant="outline" className="ml-2 border-amber-500 text-amber-400 animate-pulse">
                Перетащите на слот: {draggedTechnique.technique.name}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Информация об изученных техниках */}
        {techniques.length === 0 && (
          <div className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-3 text-sm text-center">
            <span className="text-amber-400">💡 У вас нет изученных техник. Просмотрите каталог и получите техники через обучение или свитки.</span>
          </div>
        )}

        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-3 bg-slate-700 shrink-0">
              <TabsTrigger value="cultivation" className="data-[state=active]:bg-purple-600">
                🌀 Культивация ({techniquesByCategory.cultivation.length})
              </TabsTrigger>
              <TabsTrigger value="formations" className="data-[state=active]:bg-amber-600">
                ⭕ Формации ({techniquesByCategory.formations.length})
              </TabsTrigger>
              <TabsTrigger value="combat" className="data-[state=active]:bg-red-600">
                ⚔️ Бой ({techniquesByCategory.combat.length})
              </TabsTrigger>
            </TabsList>

            {/* Категория: Культивация */}
            <TabsContent value="cultivation" className="mt-4 space-y-4 overflow-y-auto flex-1">
              {/* Слот культивации */}
              {renderSlots('cultivation')}
              
              {/* Список техник культивации */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-slate-700 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Доступные техники</h4>
                  {renderTechniqueList(techniquesByCategory.cultivation)}
                </div>
                
                {/* Детали выбранной техники */}
                <div className="border border-slate-700 rounded-lg p-3">
                  {selectedTechnique && selectedTechnique.technique.type === 'cultivation' ? (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{selectedTechnique.technique.name}</h3>
                        <Badge variant="outline" className={TYPE_COLORS.cultivation}>
                          🌀 Культивация
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-slate-400">{selectedTechnique.technique.description}</p>
                      
                      {/* Эффекты культивации */}
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        {selectedTechnique.technique.effects?.qiRegenPercent && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Бонус поглощения Ци:</span>
                            <span className="text-cyan-400">+{selectedTechnique.technique.effects.qiRegenPercent}%</span>
                          </div>
                        )}
                        {selectedTechnique.technique.effects?.unnoticeability && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Незаметность:</span>
                            <span className="text-purple-400">+{selectedTechnique.technique.effects.unnoticeability}%</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Мастерство:</span>
                          <span className="text-amber-400">{formatMastery(selectedTechnique.mastery)}%</span>
                        </div>
                      </div>
                      
                      {/* Кнопка назначения */}
                      <Button
                        onClick={() => handleAssignSlot('cultivation')}
                        disabled={cultivationSlotTechnique?.id === selectedTechnique.id}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                      >
                        {cultivationSlotTechnique?.id === selectedTechnique.id 
                          ? '✓ Уже в слоте' 
                          : '🧘 Назначить в слот культивации'}
                      </Button>
                    </div>
                  ) : (
                    <div className="h-full min-h-[200px] flex items-center justify-center text-slate-500">
                      Выберите технику культивации
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Категория: Формации */}
            <TabsContent value="formations" className="mt-4 space-y-4 overflow-y-auto flex-1">
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3 text-sm">
                <span className="text-amber-400">💡 Формации можно использовать напрямую для усиления медитации.</span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-slate-700 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Изученные формации</h4>
                  {renderTechniqueList(techniquesByCategory.formations)}
                </div>
                
                {/* Детали выбранной формации */}
                <div className="border border-slate-700 rounded-lg p-3">
                  {selectedTechnique && selectedTechnique.technique.type === 'formation' ? (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{selectedTechnique.technique.name}</h3>
                        <Badge variant="outline" className={TYPE_COLORS.formation}>
                          ⭕ Формация
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-slate-400">{selectedTechnique.technique.description}</p>
                      
                      {/* Параметры формации */}
                      <FormationEffectsDisplay technique={selectedTechnique.technique} />
                      
                      {/* Кнопка использования */}
                      <Button
                        onClick={handleUseTechnique}
                        disabled={!canUse.canUse || isUsing}
                        className="w-full bg-amber-600 hover:bg-amber-700"
                      >
                        {isUsing ? '⏳ Создание...' : `⭕ Создать формацию (${selectedTechnique.technique.qiCost} Ци)`}
                      </Button>
                      
                      {!canUse.canUse && (
                        <p className="text-xs text-amber-400 text-center">{canUse.reason}</p>
                      )}
                    </div>
                  ) : (
                    <div className="h-full min-h-[200px] flex items-center justify-center text-slate-500">
                      Выберите формацию
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Категория: Бой */}
            <TabsContent value="combat" className="mt-4 space-y-4 overflow-y-auto flex-1">
              {/* Боевые слоты */}
              {renderSlots('combat')}
              
              {/* Список боевых техник */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-slate-700 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">
                    Боевые техники 
                    <span className="text-xs text-slate-500 ml-2">(перетащите на слот)</span>
                  </h4>
                  {renderTechniqueList(techniquesByCategory.combat)}
                </div>
                
                {/* Детали выбранной техники */}
                <div className="border border-slate-700 rounded-lg p-3">
                  {selectedTechnique && ['combat', 'support', 'movement', 'sensory', 'healing'].includes(selectedTechnique.technique.type) ? (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{selectedTechnique.technique.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="outline" className={TYPE_COLORS[selectedTechnique.technique.type] || ''}>
                            {TYPE_NAMES[selectedTechnique.technique.type] || selectedTechnique.technique.type}
                          </Badge>
                          <Badge variant="outline" className="text-slate-400">
                            {ELEMENT_NAMES[selectedTechnique.technique.element] || selectedTechnique.technique.element}
                          </Badge>
                          {selectedTechnique.technique.rarity && (
                            <Badge variant="outline" className={RARITY_TEXT_COLORS[selectedTechnique.technique.rarity] || ''}>
                              {selectedTechnique.technique.rarity}
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-400">{selectedTechnique.technique.description}</p>
                      
                      {/* Параметры */}
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        {/* Подтип техники */}
                        {selectedTechnique.technique.subtype && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Тип атаки:</span>
                            <span className="text-amber-300">
                              {selectedTechnique.technique.subtype === 'melee_strike' ? '👊 Удар телом' :
                               selectedTechnique.technique.subtype === 'melee_weapon' ? '⚔️ Удар оружием' :
                               selectedTechnique.technique.subtype === 'ranged_projectile' ? '🎯 Снаряд' :
                               selectedTechnique.technique.subtype === 'ranged_beam' ? '⚡ Луч' :
                               selectedTechnique.technique.subtype === 'ranged_aoe' ? '💥 По площади' :
                               selectedTechnique.technique.subtype}
                            </span>
                          </div>
                        )}
                        
                        {/* Тип оружия */}
                        {selectedTechnique.technique.weaponType && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Оружие:</span>
                            <span className="text-purple-300">{selectedTechnique.technique.weaponType}</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Уровень:</span>
                          <span className="text-white">{selectedTechnique.technique.level}</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Затраты Ци:</span>
                          <span className="text-cyan-400">{selectedTechnique.technique.qiCost}</span>
                        </div>
                        
                        {/* Урон из effects или computed */}
                        {(selectedTechnique.technique.effects?.damage ?? selectedTechnique.technique.computed?.finalDamage) && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Урон:</span>
                            <span className="text-red-400">
                              {Number(selectedTechnique.technique.computed?.finalDamage ?? selectedTechnique.technique.effects?.damage)}
                            </span>
                          </div>
                        )}
                        
                        {/* Дальность */}
                        {(selectedTechnique.technique.effects?.range ?? selectedTechnique.technique.computed?.finalRange) && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Дальность:</span>
                            <span className="text-blue-300">
                              {Number(selectedTechnique.technique.computed?.finalRange ?? selectedTechnique.technique.effects?.range).toFixed(1)}м
                            </span>
                          </div>
                        )}
                        
                        {/* Дальний удар Ци для легендарных */}
                        {selectedTechnique.technique.isRangedQi && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">⚡ Волна Ци:</span>
                            <span className="text-amber-400">Да</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Эффективность:</span>
                          <span className="text-green-400">{Math.round(effectiveness * 100)}%</span>
                        </div>
                        
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Мастерство:</span>
                          <span className="text-amber-400">{formatMastery(selectedTechnique.mastery)}%</span>
                        </div>
                        
                        {/* Ёмкость техники (НОВАЯ СИСТЕМА) */}
                        {selectedTechnique.technique.baseCapacity !== null && selectedTechnique.technique.baseCapacity !== undefined && (
                          <div className="border-t border-slate-600 pt-2 mt-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-400">Базовая ёмкость:</span>
                              <span className="text-purple-400">{selectedTechnique.technique.baseCapacity} ед. Ци</span>
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              Макс. Ци техники: ~{Math.floor((selectedTechnique.technique.baseCapacity ?? 48) * Math.pow(2, (selectedTechnique.technique.level ?? 1) - 1) * (1 + (selectedTechnique.mastery ?? 0) * 0.005))} баз. ед.
                            </div>
                          </div>
                        )}
                        
                        {/* Предупреждение о дестабилизации */}
                        {character && selectedTechnique.technique.baseCapacity && selectedTechnique.technique.qiCost && (() => {
                          const qiDensity = Math.pow(2, character.cultivationLevel - 1);
                          const baseQiInput = selectedTechnique.technique.qiCost * qiDensity;
                          const capacity = (selectedTechnique.technique.baseCapacity ?? 48) * Math.pow(2, (selectedTechnique.technique.level ?? 1) - 1) * (1 + (selectedTechnique.mastery ?? 0) * 0.005);
                          const isDestabilized = baseQiInput > capacity * 1.1;
                          
                          return isDestabilized && (
                            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-2 mt-2">
                              <div className="flex items-center gap-2 text-red-400 text-sm">
                                <span>⚠️</span>
                                <span className="font-medium">Дестабилизация!</span>
                              </div>
                              <p className="text-xs text-red-300 mt-1">
                                Ваше Ци ({Math.floor(baseQiInput)}) превышает ёмкость техники ({Math.floor(capacity)}).
                                Возможен обратный удар!
                              </p>
                            </div>
                          );
                        })()}
                        
                        {/* Требования к характеристикам */}
                        {selectedTechnique.technique.statRequirements && (
                          <div className="border-t border-slate-600 pt-2 mt-2">
                            <span className="text-xs text-slate-500 block mb-1">Требования:</span>
                            <div className="flex flex-wrap gap-2">
                              {selectedTechnique.technique.statRequirements.strength && (
                                <Badge variant="outline" className="text-xs">Сила: {selectedTechnique.technique.statRequirements.strength}</Badge>
                              )}
                              {selectedTechnique.technique.statRequirements.agility && (
                                <Badge variant="outline" className="text-xs">Ловкость: {selectedTechnique.technique.statRequirements.agility}</Badge>
                              )}
                              {selectedTechnique.technique.statRequirements.intelligence && (
                                <Badge variant="outline" className="text-xs">Интеллект: {selectedTechnique.technique.statRequirements.intelligence}</Badge>
                              )}
                              {selectedTechnique.technique.statRequirements.conductivity && (
                                <Badge variant="outline" className="text-xs">Проводимость: {selectedTechnique.technique.statRequirements.conductivity}</Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Активные эффекты */}
                        {selectedTechnique.technique.computed?.activeEffects && selectedTechnique.technique.computed.activeEffects.length > 0 && (
                          <div className="border-t border-slate-600 pt-2 mt-2">
                            <span className="text-xs text-slate-500 block mb-1">Активные эффекты:</span>
                            <div className="flex flex-wrap gap-1">
                              {selectedTechnique.technique.computed.activeEffects.map((effect, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs border-green-500 text-green-400">
                                  {effect.type}: {effect.value}{effect.duration ? ` (${effect.duration}с)` : ''}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Информация о слотах */}
                      <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-sm text-slate-300">
                        <span className="text-red-400">⚔️ Боевые техники используются через слоты быстрого доступа.</span>
                        <p className="mt-1 text-xs">Перетащите технику на свободный слот выше или используйте кнопки ниже.</p>
                      </div>
                      
                      {/* Кнопки назначения в слоты */}
                      <div className="space-y-2">
                        <p className="text-xs text-slate-400">Назначить в слот:</p>
                        <div className="flex flex-wrap gap-2">
                          {combatSlotTechniques.map((_, index) => {
                            // Слот 1 - только для ближнего боя
                            const isSlot1 = index === 0;
                            const techniqueEffects = selectedTechnique.technique.effects || {};
                            const combatType = techniqueEffects.combatType;
                            const isMelee = combatType === 'melee_strike' || combatType === 'melee_weapon';
                            const canAssignToSlot = !isSlot1 || isMelee;
                            
                            return (
                              <Button
                                key={index}
                                size="sm"
                                variant="outline"
                                onClick={() => handleAssignSlot('combat', index)}
                                disabled={!canAssignToSlot}
                                className={`${canAssignToSlot 
                                  ? 'border-red-500 text-red-400 hover:bg-red-900/30' 
                                  : 'border-slate-600 text-slate-500 cursor-not-allowed'}`}
                                title={isSlot1 && !canAssignToSlot 
                                  ? 'Слот 1 только для техник ближнего боя (удар рукой/оружием)' 
                                  : undefined}
                              >
                                {isSlot1 ? '👊 ' : ''}Слот {index + 1}
                              </Button>
                            );
                          })}
                        </div>
                        {selectedTechnique && (() => {
                          const combatType = selectedTechnique.technique.effects?.combatType;
                          const isMelee = combatType === 'melee_strike' || combatType === 'melee_weapon';
                          return !isMelee && (
                            <p className="text-xs text-amber-400 mt-1">
                              ⚠️ Эта техника не может быть в слоте 1 (только ближний бой)
                            </p>
                          );
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="h-full min-h-[200px] flex items-center justify-center text-slate-500">
                      Выберите боевую технику
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

        {/* Результат операции */}
        {result && (
          <div className={`rounded-lg p-3 ${result.success ? 'bg-green-900/30 border border-green-600/50' : 'bg-red-900/30 border border-red-600/50'}`}>
            <p className={`text-sm ${result.success ? 'text-green-300' : 'text-red-300'}`}>
              {result.message}
            </p>
          </div>
        )}

        <DialogFooter className="shrink-0">
          <Button
            onClick={() => handleOpenChange(false)}
            variant="outline"
            className="border-slate-600 text-slate-300"
          >
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
