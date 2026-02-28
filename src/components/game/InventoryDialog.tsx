/**
 * InventoryDialog - Диалог инвентаря
 * 
 * Широкое окно с:
 * - Слева: Кукла тела с частями
 * - Справа: Ячейки инвентаря
 * 
 * Открывается через вкладку "Инвентарь"
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { BodyDoll } from './BodyDoll';
import { InventoryPanel, type InventoryItem, type InventoryState } from './InventoryPanel';
import type { BodyStructure, BodyPart, LimbStatus } from '@/types/body';
import { useGameCharacter } from '@/stores/game.store';
import { createHumanBody, calculateOverallHealth } from '@/lib/game/body-system';

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function getStatusText(status: LimbStatus): string {
  switch (status) {
    case 'healthy': return 'Здорова';
    case 'damaged': return 'Повреждена';
    case 'crippled': return 'Изуродована';
    case 'paralyzed': return 'Парализована';
    case 'critical': return 'Критическое';
    case 'severed': return 'ОТРУБЛЕНА';
    default: return 'Неизвестно';
  }
}

function getStatusColor(status: LimbStatus): string {
  switch (status) {
    case 'healthy': return 'text-green-400';
    case 'damaged': return 'text-yellow-400';
    case 'crippled': return 'text-orange-400';
    case 'paralyzed': return 'text-red-400';
    case 'critical': return 'text-red-500';
    case 'severed': return 'text-gray-500';
    default: return 'text-slate-400';
  }
}

// ==================== ДЕМО ДАННЫЕ ====================

// Демо предметы инвентаря
const DEMO_INVENTORY: InventoryState = {
  capacity: 36,
  gold: 1250,
  items: [
    {
      id: 'weapon_1',
      name: 'Духовный меч "Лунный клинок"',
      description: 'Мастерски выкованный меч, усиленный духовной энергией.',
      icon: '🗡️',
      type: 'weapon',
      rarity: 'rare',
      quantity: 1,
      maxStack: 1,
      weight: 2.5,
      damage: 45,
      damageType: 'slash',
      equipped: true,
    },
    {
      id: 'armor_1',
      name: 'Мантия культиватора',
      description: 'Лёгкая мантия, не сковывающая движения.',
      icon: '👘',
      type: 'armor',
      rarity: 'uncommon',
      quantity: 1,
      maxStack: 1,
      weight: 1.2,
      armor: 15,
      slot: 'torso',
      equipped: true,
    },
    {
      id: 'consumable_1',
      name: 'Таблетка восстановления Ци',
      description: 'Восстанавливает 50 единиц Ци.',
      icon: '💊',
      type: 'consumable',
      rarity: 'common',
      quantity: 12,
      maxStack: 99,
      weight: 0.1,
      effect: '+50 Ци',
    },
    {
      id: 'consumable_2',
      name: 'Эликсир исцеления',
      description: 'Восстанавливает 30% здоровья.',
      icon: '🧴',
      type: 'consumable',
      rarity: 'uncommon',
      quantity: 5,
      maxStack: 20,
      weight: 0.2,
      effect: '+30% HP',
    },
    {
      id: 'material_1',
      name: 'Духовный камень',
      description: 'Кристаллизованная духовная энергия.',
      icon: '💎',
      type: 'material',
      rarity: 'rare',
      quantity: 25,
      maxStack: 100,
      weight: 0.05,
    },
    {
      id: 'technique_1',
      name: 'Свиток "Пламенный удар"',
      description: 'Техника ближнего боя с огненным эффектом.',
      icon: '📜',
      type: 'technique',
      rarity: 'epic',
      quantity: 1,
      maxStack: 1,
      weight: 0.1,
    },
    {
      id: 'material_2',
      name: 'Железная руда',
      description: 'Сырой материал для ковки.',
      icon: '🪨',
      type: 'material',
      rarity: 'common',
      quantity: 40,
      maxStack: 100,
      weight: 1.0,
    },
    {
      id: 'special_1',
      name: 'Медальон секты',
      description: 'Символ принадлежности к секте Небесного Лотоса.',
      icon: '🔮',
      type: 'special',
      rarity: 'legendary',
      quantity: 1,
      maxStack: 1,
      weight: 0.1,
      equipped: true,
    },
  ],
};

// ==================== ПАНЕЛЬ ВЫБРАННОЙ ЧАСТИ ТЕЛА ====================

interface BodyPartDetailsProps {
  part: BodyPart | null;
  heart: BodyStructure['heart'] | null;
}

function BodyPartDetails({ part, heart }: BodyPartDetailsProps) {
  // Отображение сердца
  if (!part && heart) {
    const hpPercent = (heart.hp.current / heart.hp.max) * 100;
    
    return (
      <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-2xl">❤️</span>
          <span className="font-bold text-white">Сердце</span>
        </div>
        
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-red-400">HP</span>
              <span className="text-slate-400">{heart.hp.current}/{heart.hp.max}</span>
            </div>
            <Progress value={hpPercent} className="h-2" />
          </div>
          
          <div className="text-xs">
            {heart.vulnerable ? (
              <span className="text-red-400 animate-pulse">⚠️ Сердце уязвимо!</span>
            ) : (
              <span className="text-slate-500">Защищено торсом</span>
            )}
          </div>
          
          <div className="text-xs text-slate-500">
            Эффективность: <span className={heart.efficiency >= 100 ? 'text-green-400' : 'text-orange-400'}>{heart.efficiency}%</span>
          </div>
        </div>
      </div>
    );
  }
  
  if (!part) {
    return (
      <div className="bg-slate-800/50 rounded-lg p-4 text-center text-slate-500">
        <span className="text-4xl mb-2 block">👆</span>
        <span>Выберите часть тела</span>
      </div>
    );
  }
  
  const functionalPercent = part.hp.functional.max > 0
    ? (part.hp.functional.current / part.hp.functional.max) * 100
    : 0;
  
  const structuralPercent = part.hp.structural.max > 0
    ? (part.hp.structural.current / part.hp.structural.max) * 100
    : 100;
  
  return (
    <div className={`rounded-lg p-4 ${part.status === 'severed' ? 'bg-gray-900/50 border border-gray-600/30' : 'bg-slate-800/50'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{part.type === 'head' ? '🗣️' : part.type === 'torso' ? '👕' : part.type === 'arm' ? '💪' : part.type === 'hand' ? '✋' : part.type === 'leg' ? '🦵' : part.type === 'foot' ? '🦶' : part.type === 'eye' ? '👁️' : part.type === 'ear' ? '👂' : '🫀'}</span>
          <span className="font-bold text-white">{part.name}</span>
        </div>
        <span className={`text-sm font-medium ${getStatusColor(part.status)}`}>
          {getStatusText(part.status)}
        </span>
      </div>
      
      {part.status !== 'severed' ? (
        <div className="space-y-3">
          {/* Функциональная HP */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-red-400">Функциональная HP</span>
              <span className="text-slate-400">{part.hp.functional.current}/{part.hp.functional.max}</span>
            </div>
            <Progress value={functionalPercent} className="h-2" />
          </div>
          
          {/* Структурная HP */}
          {part.hp.structural.max > 0 && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Структурная HP</span>
                <span className="text-slate-400">{part.hp.structural.current}/{part.hp.structural.max}</span>
              </div>
              <Progress value={structuralPercent} className="h-2 bg-slate-700 [&>div]:bg-gray-500" />
            </div>
          )}
          
          <Separator className="bg-slate-700" />
          
          {/* Эффективность */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Эффективность:</span>
            <span className={part.efficiency >= 100 ? 'text-green-400' : part.efficiency >= 50 ? 'text-yellow-400' : 'text-red-400'}>
              {part.efficiency}%
            </span>
          </div>
          
          {/* Броня */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Броня:</span>
            <span className="text-blue-400">{part.armor}</span>
          </div>
          
          {/* Приживлённая конечность */}
          {part.attachment && (
            <div className="mt-2">
              <Badge className="bg-purple-600 text-white">Приживлённая</Badge>
              <div className="text-xs text-purple-400 mt-1">
                Прогресс: {part.attachment.progress.toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center text-slate-500">
          <span className="text-4xl mb-2 block">✂️</span>
          <span>Часть тела отрублена</span>
        </div>
      )}
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

interface InventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InventoryDialog({ open, onOpenChange }: InventoryDialogProps) {
  const character = useGameCharacter();
  
  // Состояние тела (демо - создаём новое тело)
  const [bodyState, setBodyState] = useState<BodyStructure | null>(null);
  
  // Выбранная часть тела
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  
  // Выбранный предмет
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  
  // Создаём демо тело при загрузке
  useEffect(() => {
    if (open && !bodyState) {
      const newBody = createHumanBody(character?.id || 'demo');
      
      // Демо повреждения для тестирования
      const leftArm = newBody.parts.get('left_arm');
      if (leftArm) {
        leftArm.hp.functional.current = 25; // Изуродована
        leftArm.status = 'crippled';
        leftArm.efficiency = 30;
      }
      
      const rightLeg = newBody.parts.get('right_leg');
      if (rightLeg) {
        rightLeg.hp.functional.current = 30; // Повреждена
        rightLeg.status = 'damaged';
        rightLeg.efficiency = 75;
      }
      
      // Критическое состояние торса
      const torso = newBody.parts.get('torso');
      if (torso) {
        torso.hp.structural.current = 50; // 25% структурной HP
        torso.status = 'critical';
      }
      
      // Сердце уязвимо (торс в критическом состоянии)
      newBody.heart.vulnerable = true;
      newBody.heart.hp.current = 60;
      newBody.heart.efficiency = 75;
      
      // Общее здоровье
      newBody.overallHealth = calculateOverallHealth(newBody);
      
      setBodyState(newBody);
    }
  }, [open, bodyState, character?.id]);
  
  // Получить выбранную часть
  const selectedPart = useMemo(() => {
    if (!bodyState || !selectedPartId) return null;
    if (selectedPartId === 'heart') return null; // Сердце обрабатывается отдельно
    return bodyState.parts.get(selectedPartId) || null;
  }, [bodyState, selectedPartId]);
  
  // Показывать ли сердце
  const showHeart = selectedPartId === 'heart';
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white w-[95vw] max-w-[2100px] h-[90vh] overflow-hidden p-0">
        {/* Заголовок */}
        <DialogHeader className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-amber-400 flex items-center gap-2">
              📋 Инвентарь
            </DialogTitle>
            {bodyState && (
              <div className="flex items-center gap-3">
                {bodyState.isDead && (
                  <Badge className="bg-red-600 text-white">МЁРТВ</Badge>
                )}
                <div className="text-sm text-slate-400">
                  Здоровье: <span className="text-green-400 font-medium">{bodyState.overallHealth}%</span>
                </div>
              </div>
            )}
          </div>
        </DialogHeader>
        
        {/* Основной контент */}
        <div className="flex h-[calc(92vh-80px)]">
          {/* ЛЕВАЯ ПАНЕЛЬ: Кукла тела */}
          <div className="w-[380px] flex-shrink-0 border-r border-slate-700 flex flex-col">
            <div className="flex-1 p-4 relative">
              <BodyDoll
                bodyState={bodyState}
                onPartClick={setSelectedPartId}
                selectedPartId={selectedPartId}
              />
            </div>
            
            {/* Детали выбранной части */}
            <div className="p-4 border-t border-slate-700">
              <BodyPartDetails 
                part={showHeart ? null : selectedPart} 
                heart={showHeart ? bodyState?.heart || null : null}
              />
            </div>
          </div>
          
          {/* ПРАВАЯ ПАНЕЛЬ: Инвентарь */}
          <div className="flex-1 p-6 flex flex-col min-w-0">
            <Tabs defaultValue="inventory" className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3 bg-slate-800 mb-4">
                <TabsTrigger value="inventory" className="data-[state=active]:bg-amber-600">
                  📦 Инвентарь
                </TabsTrigger>
                <TabsTrigger value="equipment" className="data-[state=active]:bg-purple-600">
                  ⚔️ Экипировка
                </TabsTrigger>
                <TabsTrigger value="stats" className="data-[state=active]:bg-cyan-600">
                  📊 Характеристики
                </TabsTrigger>
              </TabsList>
              
              {/* Инвентарь */}
              <TabsContent value="inventory" className="flex-1 mt-0">
                <InventoryPanel
                  inventory={DEMO_INVENTORY}
                  selectedItem={selectedItem}
                  onSelectItem={setSelectedItem}
                />
              </TabsContent>
              
              {/* Экипировка */}
              <TabsContent value="equipment" className="flex-1 mt-0">
                <div className="bg-slate-800/50 rounded-lg p-4 h-full">
                  <h3 className="text-lg font-bold text-purple-400 mb-4">⚔️ Экипировка</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Оружие */}
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-sm text-slate-400 mb-2">Основное оружие</div>
                      <div className="flex items-center gap-2 bg-slate-600/50 rounded p-2">
                        <span className="text-2xl">🗡️</span>
                        <div>
                          <div className="text-sm font-medium text-blue-400">Духовный меч</div>
                          <div className="text-xs text-slate-500">45 урона</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Вторичное */}
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-sm text-slate-400 mb-2">Вторичное оружие</div>
                      <div className="flex items-center justify-center bg-slate-600/30 rounded p-2 border-2 border-dashed border-slate-600">
                        <span className="text-slate-500 text-sm">Пусто</span>
                      </div>
                    </div>
                    
                    {/* Броня */}
                    <div className="col-span-2 grid grid-cols-2 gap-2">
                      <div className="bg-slate-700/50 rounded-lg p-2">
                        <div className="text-xs text-slate-400">Голова</div>
                        <div className="text-sm text-slate-500">-</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-2">
                        <div className="text-xs text-slate-400">Торс</div>
                        <div className="text-sm text-green-400">Мантия (+15)</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-2">
                        <div className="text-xs text-slate-400">Руки</div>
                        <div className="text-sm text-slate-500">-</div>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-2">
                        <div className="text-xs text-slate-400">Ноги</div>
                        <div className="text-sm text-slate-500">-</div>
                      </div>
                    </div>
                    
                    {/* Аксессуары */}
                    <div className="col-span-2">
                      <div className="text-xs text-slate-400 mb-2">Аксессуары</div>
                      <div className="flex gap-2">
                        <div className="bg-purple-900/30 border border-purple-600/30 rounded p-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span>🔮</span>
                            <span className="text-sm text-purple-400">Медальон секты</span>
                          </div>
                        </div>
                        <div className="bg-slate-600/30 rounded p-2 flex-1 border-2 border-dashed border-slate-600">
                          <span className="text-slate-500 text-sm">Пусто</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Статистика экипировки */}
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl text-red-400 font-bold">45</div>
                        <div className="text-xs text-slate-500">Урон</div>
                      </div>
                      <div>
                        <div className="text-2xl text-blue-400 font-bold">15</div>
                        <div className="text-xs text-slate-500">Броня</div>
                      </div>
                      <div>
                        <div className="text-2xl text-slate-400 font-bold">3.8</div>
                        <div className="text-xs text-slate-500">Вес (кг)</div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              {/* Характеристики */}
              <TabsContent value="stats" className="flex-1 mt-0">
                <div className="bg-slate-800/50 rounded-lg p-4 h-full">
                  <h3 className="text-lg font-bold text-cyan-400 mb-4">📊 Характеристики</h3>
                  
                  {character ? (
                    <div className="space-y-4">
                      {/* Основные статы */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <div className="text-2xl mb-1">💪</div>
                          <div className="text-slate-400 text-xs">Сила</div>
                          <div className="text-white font-bold text-xl">{character.strength.toFixed(1)}</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <div className="text-2xl mb-1">🏃</div>
                          <div className="text-slate-400 text-xs">Ловкость</div>
                          <div className="text-white font-bold text-xl">{character.agility.toFixed(1)}</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <div className="text-2xl mb-1">🧠</div>
                          <div className="text-slate-400 text-xs">Интеллект</div>
                          <div className="text-white font-bold text-xl">{character.intelligence.toFixed(1)}</div>
                        </div>
                      </div>
                      
                      {/* Культивация */}
                      <div className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-purple-400 font-medium">🌀 Культивация</span>
                          <Badge className="bg-purple-600">
                            Ур. {character.cultivationLevel}.{character.cultivationSubLevel}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Ци:</span>
                            <span className="text-cyan-400">{character.currentQi}/{character.coreCapacity}</span>
                          </div>
                          <Progress 
                            value={(character.currentQi / character.coreCapacity) * 100} 
                            className="h-2" 
                          />
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Ядро:</span>
                            <span className="text-purple-400">{character.coreCapacity} ед.</span>
                          </div>
                          
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Качество ядра:</span>
                            <span className="text-purple-400">{character.coreQuality.toFixed(3)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Ресурсы */}
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <div className="text-sm font-medium text-slate-300 mb-3">💰 Ресурсы:</div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Духовные камни:</span>
                            <span className="text-cyan-400">{character.spiritStones || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Очки вклада:</span>
                            <span className="text-amber-400">{character.contributionPoints || 0}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Усталость */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">💚 Физ. усталость</span>
                            <span className={character.fatigue >= 70 ? 'text-red-400' : 'text-green-400'}>
                              {character.fatigue.toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={character.fatigue} className="h-2" />
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="text-slate-400">💜 Мент. усталость</span>
                            <span className={character.mentalFatigue >= 70 ? 'text-red-400' : 'text-purple-400'}>
                              {character.mentalFatigue.toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={character.mentalFatigue} className="h-2" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-slate-500">
                      Данные персонажа не загружены
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default InventoryDialog;
