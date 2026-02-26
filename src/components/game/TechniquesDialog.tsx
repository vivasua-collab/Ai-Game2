/**
 * Techniques Dialog Component
 * 
 * UI для просмотра и использования техник:
 * - 3 категории: Культивация, Формации, Бой
 * - Культивация: 1 слот, используется автоматически при медитации
 * - Формации: можно использовать из меню
 * - Бой: 3+ слота (зависит от уровня), быстрый вызов
 * 
 * Слоты интегрированы в каждую категорию (отдельная вкладка убрана)
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
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

const ELEMENT_NAMES: Record<string, string> = {
  fire: '🔥 Огонь',
  water: '💧 Вода',
  earth: '🪨 Земля',
  air: '💨 Воздух',
  lightning: '⚡ Молния',
  void: '🌑 Пустота',
  neutral: '⚪ Нейтральный',
};

const RARITY_COLORS: Record<string, string> = {
  common: 'text-slate-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  legendary: 'text-amber-400',
};

// Функция для получения количества боевых слотов
function getCombatSlotsCountLocal(level: number): number {
  return 3 + Math.max(0, level - 1);
}

export function TechniquesDialog({ open, onOpenChange }: TechniquesDialogProps) {
  const character = useGameCharacter();
  const techniques = useGameTechniques();
  const { loadState } = useGameActions();

  const [selectedTechnique, setSelectedTechnique] = useState<CharacterTechnique | null>(null);
  const [isUsing, setIsUsing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('cultivation');

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
        await loadState();
        setResult({ success: true, message: data.message });
      } else {
        setResult({ success: false, message: data.error });
      }
    } catch (error) {
      setResult({ success: false, message: 'Ошибка соединения' });
    }
  }, [character, selectedTechnique, loadState]);

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
        await loadState();
        setResult({ success: true, message: 'Слот очищен' });
      } else {
        setResult({ success: false, message: data.error });
      }
    } catch (error) {
      setResult({ success: false, message: 'Ошибка соединения' });
    }
  }, [character, loadState]);

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
    return calculateTechniqueEffectiveness(selectedTechnique.technique as any, character as any);
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
        await loadState();
      } else {
        setResult({ success: false, message: data.error || 'Ошибка использования' });
      }
    } catch (error) {
      console.error('Technique use error:', error);
      setResult({ success: false, message: 'Ошибка соединения' });
    } finally {
      setIsUsing(false);
    }
  }, [character, selectedTechnique, canUse.canUse, loadState]);

  // Сброс при закрытии
  const handleClose = useCallback((open: boolean) => {
    if (!open) {
      setSelectedTechnique(null);
      setResult(null);
      setActiveCategory('cultivation');
    }
    onOpenChange(open);
  }, [onOpenChange]);

  if (!character) return null;

  // Рендер списка техник для категории
  const renderTechniqueList = (techList: CharacterTechnique[]) => (
    <ScrollArea className="h-[280px]">
      {techList.length === 0 ? (
        <div className="text-center text-slate-500 py-8">
          Нет изученных техник этой категории
        </div>
      ) : (
        <div className="space-y-1">
          {techList.map((t) => (
            <Button
              key={t.id}
              variant="ghost"
              className={`w-full justify-start text-left h-auto py-2 px-3 ${
                selectedTechnique?.id === t.id
                  ? 'bg-slate-700'
                  : 'hover:bg-slate-700/50'
              }`}
              onClick={() => {
                setSelectedTechnique(t);
                setResult(null);
              }}
            >
              <div className="w-full">
                <div className="flex items-center gap-2">
                  <div className="text-sm text-white truncate">{t.technique.name}</div>
                  {t.quickSlot !== null && (
                    <Badge variant="outline" className="text-xs border-green-500 text-green-400">
                      {t.quickSlot === 0 ? '🧘' : `${t.quickSlot}`}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-slate-500">
                  Ур. {t.technique.level} • Мастерство: {t.mastery}%
                </div>
              </div>
            </Button>
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
                  +{cultivationSlotTechnique.technique.effects?.qiRegenPercent || 0}% Ци • Мастерство: {cultivationSlotTechnique.mastery}%
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
    
    // Боевые слоты
    return (
      <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-red-400">⚔️ Боевые слоты ({combatSlotsCount})</h4>
          <span className="text-xs text-slate-500">Уровень {character.cultivationLevel}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {combatSlotTechniques.map((tech, index) => (
            <div
              key={index}
              className={`relative rounded-lg p-2 border text-center ${
                tech
                  ? 'bg-slate-700/50 border-green-500/50'
                  : 'bg-slate-800/50 border-slate-600/50'
              }`}
            >
              <div className="text-xs text-slate-500 mb-1">{index + 1}</div>
              {tech ? (
                <>
                  <div className="text-xs text-white truncate">{tech.technique.name}</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleClearSlot('combat', index)}
                    className="absolute top-0 right-0 h-4 w-4 p-0 text-red-400 hover:text-red-300"
                  >
                    ✕
                  </Button>
                </>
              ) : (
                <div className="text-xs text-slate-500">Пуст</div>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Боевые техники активируются клавишами 1-{combatSlotsCount} в игре.
        </p>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-amber-400 flex items-center gap-2">
            ⚔️ Техники
          </DialogTitle>
        </DialogHeader>

        {techniques.length === 0 ? (
          <div className="py-8 text-center text-slate-400">
            <p>У вас нет изученных техник.</p>
            <p className="text-sm mt-2">Техники можно получить через обучение, свитки или прозрение.</p>
          </div>
        ) : (
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-slate-700">
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
            <TabsContent value="cultivation" className="mt-4 space-y-4">
              {/* Слот культивации */}
              {renderSlots('cultivation')}
              
              {/* Список техник культивации */}
              <div className="grid grid-cols-2 gap-4">
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
                          <span className="text-amber-400">{selectedTechnique.mastery}%</span>
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
                    <div className="h-full flex items-center justify-center text-slate-500">
                      Выберите технику культивации
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Категория: Формации */}
            <TabsContent value="formations" className="mt-4 space-y-4">
              <div className="bg-amber-900/20 border border-amber-600/30 rounded-lg p-3 text-sm">
                <span className="text-amber-400">💡 Формации можно использовать напрямую для усиления медитации.</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
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
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Затраты Ци:</span>
                          <span className="text-cyan-400">{selectedTechnique.technique.qiCost}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Длительность:</span>
                          <span className="text-white">8 часов</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Снижение прерываний:</span>
                          <span className="text-green-400">-30%</span>
                        </div>
                      </div>
                      
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
                    <div className="h-full flex items-center justify-center text-slate-500">
                      Выберите формацию
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Категория: Бой */}
            <TabsContent value="combat" className="mt-4 space-y-4">
              {/* Боевые слоты */}
              {renderSlots('combat')}
              
              {/* Список боевых техник */}
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-slate-700 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-slate-400 mb-2">Боевые техники</h4>
                  {renderTechniqueList(techniquesByCategory.combat)}
                </div>
                
                {/* Детали выбранной техники */}
                <div className="border border-slate-700 rounded-lg p-3">
                  {selectedTechnique && ['combat', 'support', 'movement', 'sensory', 'healing'].includes(selectedTechnique.technique.type) ? (
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-bold text-white">{selectedTechnique.technique.name}</h3>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className={TYPE_COLORS[selectedTechnique.technique.type] || ''}>
                            {TYPE_NAMES[selectedTechnique.technique.type] || selectedTechnique.technique.type}
                          </Badge>
                          <Badge variant="outline" className="text-slate-400">
                            {ELEMENT_NAMES[selectedTechnique.technique.element] || selectedTechnique.technique.element}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-slate-400">{selectedTechnique.technique.description}</p>
                      
                      {/* Параметры */}
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Уровень:</span>
                          <span className="text-white">{selectedTechnique.technique.level}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Затраты Ци:</span>
                          <span className="text-cyan-400">{selectedTechnique.technique.qiCost}</span>
                        </div>
                        {selectedTechnique.technique.effects?.damage && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Урон:</span>
                            <span className="text-red-400">{selectedTechnique.technique.effects.damage}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Эффективность:</span>
                          <span className="text-green-400">{Math.round(effectiveness * 100)}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-400">Мастерство:</span>
                          <span className="text-amber-400">{selectedTechnique.mastery}%</span>
                        </div>
                      </div>
                      
                      {/* Информация о слотах */}
                      <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3 text-sm text-slate-300">
                        <span className="text-red-400">⚔️ Боевые техники используются через слоты быстрого доступа.</span>
                        <p className="mt-1 text-xs">Назначьте технику в свободный слот выше.</p>
                      </div>
                      
                      {/* Кнопки назначения в слоты */}
                      <div className="space-y-2">
                        <p className="text-xs text-slate-400">Назначить в слот:</p>
                        <div className="flex flex-wrap gap-2">
                          {combatSlotTechniques.map((_, index) => (
                            <Button
                              key={index}
                              size="sm"
                              variant="outline"
                              onClick={() => handleAssignSlot('combat', index)}
                              className="border-red-500 text-red-400 hover:bg-red-900/30"
                            >
                              Слот {index + 1}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      Выберите боевую технику
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Результат операции */}
        {result && (
          <div className={`rounded-lg p-3 ${result.success ? 'bg-green-900/30 border border-green-600/50' : 'bg-red-900/30 border border-red-600/50'}`}>
            <p className={`text-sm ${result.success ? 'text-green-300' : 'text-red-300'}`}>
              {result.message}
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={() => handleClose(false)}
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
