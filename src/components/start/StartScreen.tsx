"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface StartScreenProps {
  onStartGame: (variant: 1 | 2 | 3, customConfig?: Record<string, unknown>) => void;
  onLoadGame: (sessionId: string) => void;
  isLoading: boolean;
}

export function StartScreen({ onStartGame, onLoadGame, isLoading }: StartScreenProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showLoadForm, setShowLoadForm] = useState(false);
  const [saves, setSaves] = useState<Array<{
    id: string;
    updatedAt: string;
    daysSinceStart: number;
  }>>([]);

  // Кастомные настройки
  const [customSettings, setCustomSettings] = useState({
    location: "",
    age: 16,
    coreCapacity: 1000,
    knowsAboutSystem: false,
    strength: 10,
    agility: 10,
    intelligence: 10,
  });

  const handleLoadSaves = async () => {
    try {
      const response = await fetch("/api/game/save");
      const data = await response.json();
      setSaves(data.saves || []);
      setShowLoadForm(true);
    } catch (error) {
      console.error("Failed to load saves:", error);
    }
  };

  const handleCustomStart = () => {
    onStartGame(3, customSettings);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white p-4 flex flex-col items-center justify-center">
      {/* Заголовок */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2 text-amber-400">
          🌸 Cultivation World Simulator
        </h1>
        <p className="text-slate-400">
          Текстовая RPG-симуляция мира культивации
        </p>
      </div>

      {/* Выбор варианта старта */}
      {!showCustomForm && !showLoadForm && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl w-full">
          {/* Вариант 1: Секта */}
          <Card className="bg-slate-800/50 border-slate-700 hover:border-amber-500/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-amber-400">🏛️ Секта</CardTitle>
              <CardDescription className="text-slate-400">
                Старт в секте культивации
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-300 space-y-2 mb-4">
                <li>• Пробуждение в теле кандидата</li>
                <li>• Частичная амнезия</li>
                <li>• 4 дня испытаний</li>
                <li>• Не знает о системе</li>
              </ul>
              <Button
                className="w-full bg-amber-600 hover:bg-amber-700"
                onClick={() => onStartGame(1)}
                disabled={isLoading}
              >
                {isLoading ? "Загрузка..." : "Начать в секте"}
              </Button>
            </CardContent>
          </Card>

          {/* Вариант 2: Случайная область */}
          <Card className="bg-slate-800/50 border-slate-700 hover:border-emerald-500/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-emerald-400">🌲 Свобода</CardTitle>
              <CardDescription className="text-slate-400">
                Старт в случайной области
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-300 space-y-2 mb-4">
                <li>• Случайная локация</li>
                <li>• Полная память</li>
                <li>• Знает о системе</li>
                <li>• Минимальные ресурсы</li>
              </ul>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={() => onStartGame(2)}
                disabled={isLoading}
              >
                {isLoading ? "Загрузка..." : "Начать свободно"}
              </Button>
            </CardContent>
          </Card>

          {/* Вариант 3: Кастомный */}
          <Card className="bg-slate-800/50 border-slate-700 hover:border-purple-500/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-purple-400">⚙️ Кастомный</CardTitle>
              <CardDescription className="text-slate-400">
                Настрой свой старт
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-slate-300 space-y-2 mb-4">
                <li>• Выбери локацию</li>
                <li>• Настрой характеристики</li>
                <li>• Задай объём ядра</li>
                <li>• Полный контроль</li>
              </ul>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700"
                onClick={() => setShowCustomForm(true)}
                disabled={isLoading}
              >
                Настроить
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Форма кастомного старта */}
      {showCustomForm && (
        <Card className="bg-slate-800/50 border-slate-700 max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-purple-400">⚙️ Кастомный старт</CardTitle>
            <CardDescription className="text-slate-400">
              Настрой параметры начала игры
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="location" className="text-slate-300">Локация</Label>
              <Input
                id="location"
                placeholder="Например: Горный хребет"
                value={customSettings.location}
                onChange={(e) =>
                  setCustomSettings({ ...customSettings, location: e.target.value })
                }
                className="bg-slate-700 border-slate-600"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="age" className="text-slate-300">Возраст</Label>
                <Input
                  id="age"
                  type="number"
                  value={customSettings.age}
                  onChange={(e) =>
                    setCustomSettings({ ...customSettings, age: parseInt(e.target.value) || 16 })
                  }
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label htmlFor="core" className="text-slate-300">Ядро</Label>
                <Input
                  id="core"
                  type="number"
                  value={customSettings.coreCapacity}
                  onChange={(e) =>
                    setCustomSettings({
                      ...customSettings,
                      coreCapacity: parseInt(e.target.value) || 1000,
                    })
                  }
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            <Separator className="bg-slate-700" />

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-slate-300">Сила</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={customSettings.strength}
                  onChange={(e) =>
                    setCustomSettings({
                      ...customSettings,
                      strength: parseFloat(e.target.value) || 10,
                    })
                  }
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label className="text-slate-300">Ловкость</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={customSettings.agility}
                  onChange={(e) =>
                    setCustomSettings({
                      ...customSettings,
                      agility: parseFloat(e.target.value) || 10,
                    })
                  }
                  className="bg-slate-700 border-slate-600"
                />
              </div>
              <div>
                <Label className="text-slate-300">Интеллект</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={customSettings.intelligence}
                  onChange={(e) =>
                    setCustomSettings({
                      ...customSettings,
                      intelligence: parseFloat(e.target.value) || 10,
                    })
                  }
                  className="bg-slate-700 border-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="system"
                checked={customSettings.knowsAboutSystem}
                onCheckedChange={(checked) =>
                  setCustomSettings({ ...customSettings, knowsAboutSystem: checked })
                }
              />
              <Label htmlFor="system" className="text-slate-300">
                Знает о системе
              </Label>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-slate-600"
                onClick={() => setShowCustomForm(false)}
              >
                Назад
              </Button>
              <Button
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                onClick={handleCustomStart}
                disabled={isLoading}
              >
                {isLoading ? "Загрузка..." : "Начать игру"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Форма загрузки */}
      {showLoadForm && (
        <Card className="bg-slate-800/50 border-slate-700 max-w-lg w-full">
          <CardHeader>
            <CardTitle className="text-blue-400">📂 Загрузить игру</CardTitle>
            <CardDescription className="text-slate-400">
              Выберите сохранение
            </CardDescription>
          </CardHeader>
          <CardContent>
            {saves.length === 0 ? (
              <p className="text-slate-400 text-center py-4">Нет сохранений</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {saves.map((save) => (
                  <div
                    key={save.id}
                    className="flex justify-between items-center p-3 bg-slate-700/50 rounded hover:bg-slate-700 cursor-pointer"
                    onClick={() => onLoadGame(save.id)}
                  >
                    <div>
                      <p className="text-sm text-slate-300">
                        День {save.daysSinceStart}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(save.updatedAt).toLocaleString("ru")}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" className="border-slate-600">
                      Загрузить
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="outline"
              className="w-full mt-4 border-slate-600"
              onClick={() => setShowLoadForm(false)}
            >
              Назад
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Кнопки загрузки */}
      {!showCustomForm && !showLoadForm && (
        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300"
            onClick={handleLoadSaves}
          >
            📂 Загрузить игру
          </Button>
        </div>
      )}

      {/* Подсказки */}
      {!showCustomForm && !showLoadForm && (
        <div className="mt-8 text-center text-sm text-slate-500">
          <p>Команды: !! (действие) | -- (запрос мира) | --- (строгий режим) | --ПМ (проверка)</p>
        </div>
      )}
    </div>
  );
}
