/**
 * Techniques Dialog Component
 * 
 * UI для просмотра и использования техник:
 * - Список изученных техник
 * - Просмотр деталей техники
 * - Использование техники (тратит Ци)
 * - Управление слотами (культивация и бой)
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
import { getCombatSlotsCount } from '@/types/game';
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
};

const TYPE_NAMES: Record<string, string> = {
  combat: '⚔️ Боевая',
  cultivation: '🌀 Культивация',
  support: '🛡️ Поддержка',
  movement: '🏃 Перемещение',
  sensory: '👁️ Восприятие',
  healing: '💚 Исцеление',
};

// Функция для получения количества боевых слотов
function getCombatSlotsCountLocal(level: number): number {
  return 3 + Math.max(0, level - 1);
}

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

export function TechniquesDialog({ open, onOpenChange }: TechniquesDialogProps) {
  const character = useGameCharacter();
  const techniques = useGameTechniques();
  const { loadState } = useGameActions();

  const [selectedTechnique, setSelectedTechnique] = useState<CharacterTechnique | null>(null);
  const [isUsing, setIsUsing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('techniques');

  // Группировка техник по типу
  const techniquesByType = useMemo(() => {
    const groups: Record<string, CharacterTechnique[]> = {};
    for (const t of techniques) {
      const type = t.technique.type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(t);
    }
    return groups;
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

  // Проверка возможности использования
  const canUse = useMemo(() => {
    if (!character || !selectedTechnique) return { canUse: false, reason: '' };
    return canUseTechnique(selectedTechnique.technique as any, character as any);
  }, [character, selectedTechnique]);

  // Эффективность техники
  const effectiveness = useMemo(() => {
    if (!character || !selectedTechnique) return 1;
    return calculateTechniqueEffectiveness(selectedTechnique.technique as any, character as any);
  }, [character, selectedTechnique]);

  // Использование техники
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
      setActiveTab('techniques');
    }
    onOpenChange(open);
  }, [onOpenChange]);

  if (!character) return null;

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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-slate-700">
              <TabsTrigger value="techniques">📚 Техники</TabsTrigger>
              <TabsTrigger value="slots">🎯 Слоты</TabsTrigger>
            </TabsList>

            <TabsContent value="techniques" className="mt-4">
              <div className="grid grid-cols-3 gap-4 min-h-[400px]">
                {/* Список техник */}
                <div className="col-span-1 border-r border-slate-700 pr-4">
                  <ScrollArea className="h-[350px]">
                    {Object.entries(techniquesByType).map(([type, techs]) => (
                      <div key={type} className="mb-4">
                        <div className="text-xs text-slate-500 mb-2">{TYPE_NAMES[type] || type}</div>
                        <div className="space-y-1">
                          {techs.map((t) => (
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
                      </div>
                    ))}
                  </ScrollArea>
                </div>

                {/* Детали техники */}
                <div className="col-span-2">
              {selectedTechnique ? (
                <div className="space-y-4">
                  {/* Заголовок */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {selectedTechnique.technique.name}
                      </h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline" className={TYPE_COLORS[selectedTechnique.technique.type] || ''}>
                          {TYPE_NAMES[selectedTechnique.technique.type] || selectedTechnique.technique.type}
                        </Badge>
                        <Badge variant="outline" className="text-slate-400">
                          {ELEMENT_NAMES[selectedTechnique.technique.element] || selectedTechnique.technique.element}
                        </Badge>
                      </div>
                    </div>
                    <Badge className={RARITY_COLORS[selectedTechnique.technique.rarity] || 'text-slate-400'}>
                      {selectedTechnique.technique.rarity}
                    </Badge>
                  </div>

                  {/* Описание */}
                  <p className="text-sm text-slate-400">
                    {selectedTechnique.technique.description}
                  </p>

                  {/* Параметры */}
                  <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Уровень:</span>
                        <span className="text-white">{selectedTechnique.technique.level}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Мин. культ.:</span>
                        <span className="text-white">{selectedTechnique.technique.minCultivationLevel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Затраты Ци:</span>
                        <span className="text-cyan-400">{selectedTechnique.technique.qiCost}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Эффективность:</span>
                        <span className="text-green-400">{Math.round(effectiveness * 100)}%</span>
                      </div>
                    </div>

                    {/* Эффекты */}
                    {selectedTechnique.technique.effects && (
                      <div className="pt-2 border-t border-slate-600/50">
                        <div className="text-xs text-slate-500 mb-1">Эффекты:</div>
                        <div className="flex flex-wrap gap-2">
                          {selectedTechnique.technique.effects.damage && (
                            <Badge variant="destructive">⚔️ Урон: {selectedTechnique.technique.effects.damage}</Badge>
                          )}
                          {selectedTechnique.technique.effects.healing && (
                            <Badge className="bg-green-600">💚 Лечение: {selectedTechnique.technique.effects.healing}</Badge>
                          )}
                          {selectedTechnique.technique.effects.qiRegen && (
                            <Badge className="bg-cyan-600">💫 Ци: +{selectedTechnique.technique.effects.qiRegen}</Badge>
                          )}
                          {selectedTechnique.technique.effects.duration && (
                            <Badge variant="outline">⏱️ {selectedTechnique.technique.effects.duration} мин</Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Мастерство */}
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Мастерство</span>
                      <span className="text-amber-400">{selectedTechnique.mastery}%</span>
                    </div>
                    <Progress value={selectedTechnique.mastery} className="h-2" />
                    <p className="text-xs text-slate-500 mt-1">
                      Выше мастерство = больше эффективность
                    </p>
                  </div>

                  {/* Результат использования */}
                  {result && (
                    <div className={`rounded-lg p-3 ${result.success ? 'bg-green-900/30 border border-green-600/50' : 'bg-red-900/30 border border-red-600/50'}`}>
                      <p className={`text-sm ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                        {result.message}
                      </p>
                    </div>
                  )}

                  {/* Предупреждение */}
                  {!canUse.canUse && (
                    <div className="bg-amber-900/30 border border-amber-600/50 rounded-lg p-3">
                      <p className="text-sm text-amber-300">⚠️ {canUse.reason}</p>
                    </div>
                  )}

                  {/* Кнопки управления слотами */}
                  <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                    <div className="text-sm text-slate-400 mb-2">🎯 Назначить в слот:</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedTechnique.technique.type === 'cultivation' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAssignSlot('cultivation')}
                          className="border-purple-500 text-purple-400 hover:bg-purple-900/30"
                        >
                          🧘 Слот культивации
                        </Button>
                      )}
                      {(selectedTechnique.technique.type === 'combat' || selectedTechnique.technique.type === 'movement') && (
                        combatSlotTechniques.map((_, index) => (
                          <Button
                            key={index}
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignSlot('combat', index)}
                            className="border-red-500 text-red-400 hover:bg-red-900/30"
                          >
                            ⚔️ Слот {index + 1}
                          </Button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500">
                  Выберите технику для просмотра
                </div>
              )}
                </div>
              </div>
            </TabsContent>

            {/* Вкладка управления слотами */}
            <TabsContent value="slots" className="mt-4">
              <div className="space-y-6">
                {/* Слот культивации */}
                <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-purple-400">🧘 Слот культивации</h4>
                    {cultivationSlotTechnique && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleClearSlot('cultivation')}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        ✕ Очистить
                      </Button>
                    )}
                  </div>
                  {cultivationSlotTechnique ? (
                    <div className="flex items-center gap-3 bg-slate-700/50 rounded-lg p-3">
                      <div className="flex-1">
                        <div className="text-white font-medium">{cultivationSlotTechnique.technique.name}</div>
                        <div className="text-xs text-slate-400">
                          Мастерство: {cultivationSlotTechnique.mastery}%
                        </div>
                      </div>
                      <Badge variant="outline" className="border-purple-500 text-purple-400">
                        Активна
                      </Badge>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 text-center py-4">
                      Слот пуст. Выберите технику культивации и нажмите "Слот культивации"
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Техника в слоте культивации применяется автоматически при медитации.
                  </p>
                </div>

                {/* Боевые слоты */}
                <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600/50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium text-red-400">⚔️ Боевые слоты ({combatSlotsCount})</h4>
                    <span className="text-xs text-slate-500">Уровень {character.cultivationLevel}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {combatSlotTechniques.map((tech, index) => (
                      <div
                        key={index}
                        className={`relative rounded-lg p-3 border ${
                          tech
                            ? 'bg-slate-700/50 border-green-500/50'
                            : 'bg-slate-800/50 border-slate-600/50'
                        }`}
                      >
                        <div className="text-xs text-slate-500 mb-1">Слот {index + 1}</div>
                        {tech ? (
                          <>
                            <div className="text-sm text-white truncate">{tech.technique.name}</div>
                            <div className="text-xs text-slate-400">Ур. {tech.technique.level}</div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleClearSlot('combat', index)}
                              className="absolute top-1 right-1 h-5 w-5 p-0 text-red-400 hover:text-red-300"
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

                {/* Результат операции */}
                {result && (
                  <div className={`rounded-lg p-3 ${result.success ? 'bg-green-900/30 border border-green-600/50' : 'bg-red-900/30 border border-red-600/50'}`}>
                    <p className={`text-sm ${result.success ? 'text-green-300' : 'text-red-300'}`}>
                      {result.message}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          {activeTab === 'techniques' && selectedTechnique && !result && (
            <Button
              onClick={handleUseTechnique}
              disabled={!canUse.canUse || isUsing}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isUsing ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Используем...
                </span>
              ) : (
                `⚡ Использовать (${selectedTechnique.technique.qiCost} Ци)`
              )}
            </Button>
          )}
          {result && (
            <Button onClick={() => { setResult(null); }} className="bg-amber-600 hover:bg-amber-700">
              OK
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
