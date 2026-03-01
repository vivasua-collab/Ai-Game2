/**
 * Cheat Menu Dialog - Debug tools for testing
 * 
 * Features:
 * - Cultivation: set level, breakthrough, add qi, full restore
 * - Stats: add/set strength, agility, intelligence, conductivity
 * - Fatigue: add/reset fatigue
 * - Techniques: give by ID, generate pool
 * - Resources: add spirit stones, contribution points
 * - Insight: add qiUnderstanding
 * - Time: set world time
 * - God Mode: max stats, infinite qi
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGameCharacter, useGameActions } from '@/stores/game.store';

interface CheatMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type StatType = 'strength' | 'agility' | 'intelligence' | 'conductivity';

export function CheatMenuDialog({ open, onOpenChange }: CheatMenuDialogProps) {
  const character = useGameCharacter();
  const { loadState } = useGameActions();
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  
  // Input states
  const [levelInput, setLevelInput] = useState(1);
  const [subLevelInput, setSubLevelInput] = useState(0);
  const [qiAmount, setQiAmount] = useState(1000);
  const [statType, setStatType] = useState<StatType>('strength');
  const [statAmount, setStatAmount] = useState(10);
  const [statValue, setStatValue] = useState(50);
  const [physicalFatigue, setPhysicalFatigue] = useState(20);
  const [mentalFatigue, setMentalFatigue] = useState(10);
  const [techniqueId, setTechniqueId] = useState('');
  const [techniqueLevel, setTechniqueLevel] = useState(1);
  const [techniqueCount, setTechniqueCount] = useState(5);
  const [insightAmount, setInsightAmount] = useState(50);
  const [spiritStones, setSpiritStones] = useState(1000);
  const [contributionPoints, setContributionPoints] = useState(500);
  const [worldHour, setWorldHour] = useState(12);
  const [worldDay, setWorldDay] = useState(1);

  if (!character) return null;

  const executeCheat = async (command: string, params: Record<string, unknown>) => {
    setIsLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/cheats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          command,
          params,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        await loadState();
        setResult(`✅ ${data.message}`);
      } else {
        setResult(`❌ Ошибка: ${data.error || data.message}`);
      }
    } catch (error) {
      setResult(`❌ Ошибка: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Cultivation commands
  const handleSetLevel = () => executeCheat('set_level', { level: levelInput, subLevel: subLevelInput });
  const handleBreakthrough = () => executeCheat('breakthrough', {});
  const handleAddQi = () => executeCheat('add_qi', { amount: qiAmount });
  const handleSetQi = () => executeCheat('set_qi', { amount: qiAmount });
  const handleFullRestore = () => executeCheat('full_restore', {});
  const handleGodMode = () => executeCheat('god_mode', {});

  // Stats commands
  const handleAddStat = () => executeCheat('add_stat', { stat: statType, amount: statAmount });
  const handleSetStat = () => executeCheat('set_stat', { stat: statType, value: statValue });

  // Fatigue commands
  const handleAddFatigue = () => executeCheat('add_fatigue', { physical: physicalFatigue, mental: mentalFatigue });
  const handleResetFatigue = () => executeCheat('reset_fatigue', {});

  // Techniques commands
  const handleGiveTechnique = () => {
    if (!techniqueId.trim()) {
      setResult('❌ Введите ID техники');
      return;
    }
    executeCheat('give_technique', { techniqueId });
  };
  const handleGenTechniques = () => executeCheat('gen_techniques', { level: techniqueLevel, count: techniqueCount });

  // Insight command
  const handleAddInsight = () => executeCheat('add_insight', { amount: insightAmount });

  // Time command
  const handleSetTime = () => executeCheat('set_time', { hour: worldHour, day: worldDay });

  // Resources command
  const handleAddResources = () => executeCheat('add_resources', { stones: spiritStones, points: contributionPoints });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center gap-2">
            🛠️ Чит Меню
            <Badge variant="outline" className="border-red-500 text-red-400 text-xs">
              DEBUG
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Current status */}
        <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
          <div className="text-sm text-slate-400 mb-2">📊 Текущее состояние:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
            <div>Уровень: <span className="text-amber-400">{character.cultivationLevel}.{character.cultivationSubLevel}</span></div>
            <div>Ци: <span className="text-cyan-400">{character.currentQi}/{character.coreCapacity}</span></div>
            <div>Физ. уст.: <span className="text-green-400">{character.fatigue.toFixed(0)}%</span></div>
            <div>Мент. уст.: <span className="text-purple-400">{character.mentalFatigue.toFixed(0)}%</span></div>
            <div>Сила: <span className="text-red-400">{character.strength}</span></div>
            <div>Ловкость: <span className="text-green-400">{character.agility}</span></div>
            <div>Интеллект: <span className="text-blue-400">{character.intelligence}</span></div>
            <div>Проводимость: <span className="text-yellow-400">{character.conductivity}</span></div>
            <div>Прозрение: <span className="text-purple-400">{character.qiUnderstanding}/{character.qiUnderstandingCap}</span></div>
            <div>Камни: <span className="text-cyan-400">{character.spiritStones}</span></div>
            <div>ОВ: <span className="text-amber-400">{character.contributionPoints}</span></div>
            <div>Здоровье: <span className="text-red-400">{character.health}%</span></div>
          </div>
        </div>

        <Tabs defaultValue="cultivation" className="w-full">
          <TabsList className="grid grid-cols-4 bg-slate-800">
            <TabsTrigger value="cultivation" className="text-xs sm:text-sm">🔮 Культивация</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs sm:text-sm">💪 Статы</TabsTrigger>
            <TabsTrigger value="techniques" className="text-xs sm:text-sm">⚔️ Техники</TabsTrigger>
            <TabsTrigger value="other" className="text-xs sm:text-sm">📦 Прочее</TabsTrigger>
          </TabsList>

          {/* Cultivation Tab */}
          <TabsContent value="cultivation" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Set Level */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-amber-400 font-medium">🎯 Установить уровень</h4>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs text-slate-400">Уровень</Label>
                    <Input
                      type="number"
                      min={1}
                      max={9}
                      value={levelInput}
                      onChange={(e) => setLevelInput(Number(e.target.value))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs text-slate-400">Под-уровень</Label>
                    <Input
                      type="number"
                      min={0}
                      max={9}
                      value={subLevelInput}
                      onChange={(e) => setSubLevelInput(Number(e.target.value))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSetLevel}
                  disabled={isLoading}
                  className="w-full bg-amber-600 hover:bg-amber-700"
                >
                  Установить {levelInput}.{subLevelInput}
                </Button>
              </div>

              {/* Breakthrough */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-purple-400 font-medium">⚡ Прорыв</h4>
                <p className="text-xs text-slate-400">Мгновенный прорыв на следующий под-уровень</p>
                <Button
                  onClick={handleBreakthrough}
                  disabled={isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  ⚡ Прорыв
                </Button>
              </div>

              {/* Qi */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-cyan-400 font-medium">💫 Ци</h4>
                <div>
                  <Label className="text-xs text-slate-400">Количество</Label>
                  <Input
                    type="number"
                    min={0}
                    value={qiAmount}
                    onChange={(e) => setQiAmount(Number(e.target.value))}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleAddQi}
                    disabled={isLoading}
                    className="bg-cyan-600 hover:bg-cyan-700"
                  >
                    + Добавить
                  </Button>
                  <Button
                    onClick={handleSetQi}
                    disabled={isLoading}
                    className="bg-cyan-800 hover:bg-cyan-900"
                  >
                    = Установить
                  </Button>
                </div>
              </div>

              {/* Restore */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-green-400 font-medium">💚 Восстановление</h4>
                <p className="text-xs text-slate-400">Полное восстановление Ци, здоровья, усталости</p>
                <Button
                  onClick={handleFullRestore}
                  disabled={isLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  💚 Полное восстановление
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Stats Tab */}
          <TabsContent value="stats" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Add Stat */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-red-400 font-medium">📈 Добавить к стату</h4>
                <div>
                  <Label className="text-xs text-slate-400">Характеристика</Label>
                  <Select value={statType} onValueChange={(v) => setStatType(v as StatType)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      <SelectItem value="strength">Сила</SelectItem>
                      <SelectItem value="agility">Ловкость</SelectItem>
                      <SelectItem value="intelligence">Интеллект</SelectItem>
                      <SelectItem value="conductivity">Проводимость</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Количество</Label>
                  <Input
                    type="number"
                    min={1}
                    value={statAmount}
                    onChange={(e) => setStatAmount(Number(e.target.value))}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <Button
                  onClick={handleAddStat}
                  disabled={isLoading}
                  className="w-full bg-red-600 hover:bg-red-700"
                >
                  +{statAmount} к {statType === 'strength' ? 'силе' : statType === 'agility' ? 'ловкости' : statType === 'intelligence' ? 'интеллекту' : 'проводимости'}
                </Button>
              </div>

              {/* Set Stat */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-blue-400 font-medium">🎯 Установить стат</h4>
                <div>
                  <Label className="text-xs text-slate-400">Характеристика</Label>
                  <Select value={statType} onValueChange={(v) => setStatType(v as StatType)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      <SelectItem value="strength">Сила</SelectItem>
                      <SelectItem value="agility">Ловкость</SelectItem>
                      <SelectItem value="intelligence">Интеллект</SelectItem>
                      <SelectItem value="conductivity">Проводимость</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Значение</Label>
                  <Input
                    type="number"
                    min={0}
                    value={statValue}
                    onChange={(e) => setStatValue(Number(e.target.value))}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <Button
                  onClick={handleSetStat}
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  = {statValue}
                </Button>
              </div>

              {/* Fatigue */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-orange-400 font-medium">😴 Усталость</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-400">Физическая %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={physicalFatigue}
                      onChange={(e) => setPhysicalFatigue(Number(e.target.value))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Ментальная %</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={mentalFatigue}
                      onChange={(e) => setMentalFatigue(Number(e.target.value))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleAddFatigue}
                    disabled={isLoading}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    + Добавить
                  </Button>
                  <Button
                    onClick={handleResetFatigue}
                    disabled={isLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Сбросить
                  </Button>
                </div>
              </div>

              {/* Insight */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-purple-400 font-medium">💡 Прозрение</h4>
                <div>
                  <Label className="text-xs text-slate-400">Количество</Label>
                  <Input
                    type="number"
                    min={1}
                    value={insightAmount}
                    onChange={(e) => setInsightAmount(Number(e.target.value))}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <Button
                  onClick={handleAddInsight}
                  disabled={isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  💡 +{insightAmount} прозрения
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Techniques Tab */}
          <TabsContent value="techniques" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Give Technique */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-violet-400 font-medium">📜 Изучить технику</h4>
                <div>
                  <Label className="text-xs text-slate-400">ID техники</Label>
                  <Input
                    type="text"
                    placeholder="fire-palm, ice-shield..."
                    value={techniqueId}
                    onChange={(e) => setTechniqueId(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <Button
                  onClick={handleGiveTechnique}
                  disabled={isLoading}
                  className="w-full bg-violet-600 hover:bg-violet-700"
                >
                  📜 Изучить
                </Button>
              </div>

              {/* Generate Techniques */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-pink-400 font-medium">🎲 Сгенерировать пул</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-400">Уровень</Label>
                    <Input
                      type="number"
                      min={1}
                      max={9}
                      value={techniqueLevel}
                      onChange={(e) => setTechniqueLevel(Number(e.target.value))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Количество</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={techniqueCount}
                      onChange={(e) => setTechniqueCount(Number(e.target.value))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleGenTechniques}
                  disabled={isLoading}
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  🎲 Сгенерировать {techniqueCount} техник
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Other Tab */}
          <TabsContent value="other" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Resources */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-yellow-400 font-medium">💰 Ресурсы</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-400">Дух. камни</Label>
                    <Input
                      type="number"
                      min={0}
                      value={spiritStones}
                      onChange={(e) => setSpiritStones(Number(e.target.value))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">Очки вклада</Label>
                    <Input
                      type="number"
                      min={0}
                      value={contributionPoints}
                      onChange={(e) => setContributionPoints(Number(e.target.value))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleAddResources}
                  disabled={isLoading}
                  className="w-full bg-yellow-600 hover:bg-yellow-700"
                >
                  💰 Добавить ресурсы
                </Button>
              </div>

              {/* Time */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
                <h4 className="text-indigo-400 font-medium">🕐 Время</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-400">Час</Label>
                    <Input
                      type="number"
                      min={0}
                      max={23}
                      value={worldHour}
                      onChange={(e) => setWorldHour(Number(e.target.value))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-400">День</Label>
                    <Input
                      type="number"
                      min={1}
                      max={30}
                      value={worldDay}
                      onChange={(e) => setWorldDay(Number(e.target.value))}
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSetTime}
                  disabled={isLoading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700"
                >
                  🕐 Установить время
                </Button>
              </div>

              {/* God Mode */}
              <div className="bg-slate-800/50 rounded-lg p-4 space-y-3 sm:col-span-2">
                <h4 className="text-red-400 font-medium">✨ God Mode</h4>
                <p className="text-xs text-slate-400">
                  Максимальные статы, бесконечная Ци, бессмертие
                </p>
                <Button
                  onClick={handleGodMode}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 hover:opacity-90"
                >
                  ✨ АКТИВИРОВАТЬ GOD MODE
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Result */}
        {result && (
          <div className={`rounded-lg p-3 border ${
            result.startsWith('✅') 
              ? 'bg-green-900/30 border-green-700/50 text-green-300' 
              : 'bg-red-900/30 border-red-700/50 text-red-300'
          }`}>
            <pre className="text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}

        <DialogFooter>
          <Button
            onClick={() => onOpenChange(false)}
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
