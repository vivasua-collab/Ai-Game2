/**
 * Cheat Menu Content - Debug tools for settings panel
 */

'use client';

import { useState } from 'react';
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
import { QI_STONE_DEFINITIONS, QiStoneQuality } from '@/types/qi-stones';

type StatType = 'strength' | 'agility' | 'intelligence' | 'conductivity';

export function CheatMenuContent() {
  const character = useGameCharacter();
  const { loadState, loadTechniques, loadInventory } = useGameActions();
  
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
  const [qiStoneQuality, setQiStoneQuality] = useState<QiStoneQuality>('stone');
  const [qiStoneQuantity, setQiStoneQuantity] = useState(1);

  if (!character) {
    return (
      <div className="text-center text-slate-400 py-8">
        Нет активного персонажа
      </div>
    );
  }

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
        // Перезагружаем техники если это была команда give_technique
        if (command === 'give_technique') {
          await loadTechniques();
        }
        // Перезагружаем инвентарь если это была команда add_qi_stone
        if (command === 'add_qi_stone') {
          await loadInventory();
        }
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

  // Qi Stone command
  const handleAddQiStone = () => executeCheat('add_qi_stone', { quality: qiStoneQuality, quantity: qiStoneQuantity });

  return (
    <div className="space-y-4">
      {/* Current status */}
      <div className="bg-slate-800/50 rounded-lg p-3">
        <div className="text-sm text-slate-400 mb-2">📊 Текущее состояние:</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
          <div>Уровень: <span className="text-amber-400">{character.cultivationLevel}.{character.cultivationSubLevel}</span></div>
          <div>Ци: <span className="text-cyan-400">{Math.round(character.currentQi)}/{character.coreCapacity}</span></div>
          <div>Физ. уст.: <span className="text-green-400">{character.fatigue.toFixed(1)}%</span></div>
          <div>Мент. уст.: <span className="text-purple-400">{character.mentalFatigue.toFixed(1)}%</span></div>
          <div>Сила: <span className="text-red-400">{character.strength.toFixed(2)}</span></div>
          <div>Ловкость: <span className="text-green-400">{character.agility.toFixed(2)}</span></div>
          <div>Интеллект: <span className="text-blue-400">{character.intelligence.toFixed(2)}</span></div>
          <div>Проводимость: <span className="text-yellow-400">{character.conductivity.toFixed(2)}</span></div>
          <div>Прозрение: <span className="text-purple-400">{character.qiUnderstanding}/{character.qiUnderstandingCap}</span></div>
          <div>Камни: <span className="text-cyan-400">{character.spiritStones}</span></div>
          <div>ОВ: <span className="text-amber-400">{character.contributionPoints}</span></div>
          <div>Здоровье: <span className="text-red-400">{character.health}%</span></div>
        </div>
      </div>

      <Tabs defaultValue="cultivation" className="w-full">
        <TabsList className="grid grid-cols-4 bg-slate-800 h-auto">
          <TabsTrigger value="cultivation" className="text-xs py-2">🔮 Культивация</TabsTrigger>
          <TabsTrigger value="stats" className="text-xs py-2">💪 Статы</TabsTrigger>
          <TabsTrigger value="techniques" className="text-xs py-2">⚔️ Техники</TabsTrigger>
          <TabsTrigger value="other" className="text-xs py-2">📦 Прочее</TabsTrigger>
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
                    className="bg-slate-700 border-slate-600 h-9"
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
                    className="bg-slate-700 border-slate-600 h-9"
                  />
                </div>
              </div>
              <Button
                onClick={handleSetLevel}
                disabled={isLoading}
                className="w-full bg-amber-600 hover:bg-amber-700 h-9"
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
                className="w-full bg-purple-600 hover:bg-purple-700 h-9"
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
                  className="bg-slate-700 border-slate-600 h-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleAddQi}
                  disabled={isLoading}
                  className="bg-cyan-600 hover:bg-cyan-700 h-9"
                >
                  + Добавить
                </Button>
                <Button
                  onClick={handleSetQi}
                  disabled={isLoading}
                  className="bg-cyan-800 hover:bg-cyan-900 h-9"
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
                className="w-full bg-green-600 hover:bg-green-700 h-9"
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
                  <SelectTrigger className="bg-slate-700 border-slate-600 h-9">
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
                  className="bg-slate-700 border-slate-600 h-9"
                />
              </div>
              <Button
                onClick={handleAddStat}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 h-9"
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
                  <SelectTrigger className="bg-slate-700 border-slate-600 h-9">
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
                  className="bg-slate-700 border-slate-600 h-9"
                />
              </div>
              <Button
                onClick={handleSetStat}
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 h-9"
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
                    className="bg-slate-700 border-slate-600 h-9"
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
                    className="bg-slate-700 border-slate-600 h-9"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleAddFatigue}
                  disabled={isLoading}
                  className="bg-orange-600 hover:bg-orange-700 h-9"
                >
                  + Добавить
                </Button>
                <Button
                  onClick={handleResetFatigue}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 h-9"
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
                  className="bg-slate-700 border-slate-600 h-9"
                />
              </div>
              <Button
                onClick={handleAddInsight}
                disabled={isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 h-9"
              >
                💡 +{insightAmount} прозрения
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Techniques Tab - только изучение по ID */}
        <TabsContent value="techniques" className="space-y-4 mt-4">
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <h4 className="text-violet-400 font-medium">📜 Изучить технику по ID</h4>
            <div>
              <Label className="text-xs text-slate-400">ID техники</Label>
              <Input
                type="text"
                placeholder="TC_000001, DF_000042..."
                value={techniqueId}
                onChange={(e) => setTechniqueId(e.target.value)}
                className="bg-slate-700 border-slate-600 h-9"
              />
            </div>
            <p className="text-xs text-slate-500">
              Введите ID техники из хранилища сгенерированных объектов.
            </p>
            <Button
              onClick={handleGiveTechnique}
              disabled={isLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 h-9"
            >
              📜 Изучить
            </Button>
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
                    className="bg-slate-700 border-slate-600 h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Очки вклада</Label>
                  <Input
                    type="number"
                    min={0}
                    value={contributionPoints}
                    onChange={(e) => setContributionPoints(Number(e.target.value))}
                    className="bg-slate-700 border-slate-600 h-9"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddResources}
                disabled={isLoading}
                className="w-full bg-yellow-600 hover:bg-yellow-700 h-9"
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
                    className="bg-slate-700 border-slate-600 h-9"
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
                    className="bg-slate-700 border-slate-600 h-9"
                  />
                </div>
              </div>
              <Button
                onClick={handleSetTime}
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 h-9"
              >
                🕐 Установить время
              </Button>
            </div>

            {/* Qi Stones */}
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
              <h4 className="text-cyan-400 font-medium">💎 Камни Ци</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-slate-400">Качество</Label>
                  <Select value={qiStoneQuality} onValueChange={(v) => setQiStoneQuality(v as QiStoneQuality)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700">
                      {Object.entries(QI_STONE_DEFINITIONS).map(([quality, def]) => (
                        <SelectItem key={quality} value={quality}>
                          {def.icon} {def.name} ({def.qiContent} Ци)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-400">Количество</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={qiStoneQuantity}
                    onChange={(e) => setQiStoneQuantity(Number(e.target.value))}
                    className="bg-slate-700 border-slate-600 h-9"
                  />
                </div>
              </div>
              <Button
                onClick={handleAddQiStone}
                disabled={isLoading}
                className="w-full bg-cyan-600 hover:bg-cyan-700 h-9"
              >
                💎 Добавить Камень Ци
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
                className="w-full bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 hover:opacity-90 h-9"
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
    </div>
  );
}
