"use client";

import { useState, useRef, useEffect, memo, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Message } from "@/types/game";
import {
  useGameCharacter,
  useGameMessages,
  useGameTime,
  useGameLocation,
  useGameLoading,
  useGamePaused,
  useGameDaysSinceStart,
  useGameActions,
} from "@/stores/game.store";

// Типы боковых панелей
type PanelType = "character" | "inventory" | "techniques" | "map" | "quests" | "relations" | null;

// Компонент одного сообщения - мемоизирован
const MessageBubble = memo(function MessageBubble({ message }: { message: Message }) {
  const isPlayer = message.sender === "player";
  const isSystem = message.type === "system";
  const isError = message.type === "error";

  return (
    <div
      className={`flex ${isPlayer ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`p-3 rounded-lg ${
          isPlayer
            ? "bg-blue-600/30 border border-blue-500/30"
            : isSystem
            ? "bg-amber-600/20 border border-amber-500/30"
            : isError
            ? "bg-red-600/20 border border-red-500/30"
            : "bg-slate-700/50 border border-slate-600/30"
        }`}
      >
        {!isPlayer && (
          <div className="text-xs text-slate-400 mb-1">
            {message.sender === "narrator" ? "📖 Рассказчик" : "⚙️ Система"}
          </div>
        )}
        <div className="text-sm text-slate-200 whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.message.id === nextProps.message.id);

// Статус-бар - использует store напрямую, мемоизирован
const StatusBar = memo(function StatusBar() {
  const character = useGameCharacter();
  const worldTime = useGameTime();
  const location = useGameLocation();
  const daysSinceStart = useGameDaysSinceStart();

  // Мемоизированные расчёты
  const qiPercent = useMemo(() => 
    character ? (character.currentQi / character.coreCapacity) * 100 : 0,
    [character?.currentQi, character?.coreCapacity]
  );
  
  const healthPercent = useMemo(() => character?.health ?? 0, [character?.health]);

  if (!character) return null;

  return (
    <div className="bg-slate-800/80 border-b border-slate-700 px-4 py-2 ml-12">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {/* Левая часть: Культивация */}
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-amber-500/50 text-amber-400">
            Lv.{character.cultivationLevel}.{character.cultivationSubLevel}
          </Badge>

          {/* Qi Bar */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Ци:</span>
            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-cyan-500 transition-all duration-300"
                style={{ width: `${qiPercent}%` }}
              />
            </div>
            <span className="text-xs text-slate-400">
              {character.currentQi}/{character.coreCapacity}
            </span>
          </div>

          {/* Health */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">HP:</span>
            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${healthPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Центр: Время */}
        {worldTime && (
          <div className="flex items-center gap-2 text-slate-400">
            <span>📅 День {daysSinceStart}</span>
            <Separator orientation="vertical" className="h-4 bg-slate-600" />
            <span>
              {worldTime.hour}:{worldTime.minute.toString().padStart(2, "0")}
            </span>
            <Badge variant="secondary" className="text-xs">
              {worldTime.season} сезон
            </Badge>
          </div>
        )}

        {/* Правая часть: Локация */}
        {location && (
          <div className="text-slate-400">
            📍 {location.name}
          </div>
        )}
      </div>
    </div>
  );
});

// Панель характеристик - использует store напрямую, мемоизирована
const CharacterPanel = memo(function CharacterPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const character = useGameCharacter();

  if (!character || !isOpen) return null;

  return (
    <Card className="absolute left-14 top-[104px] w-72 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">📊 Характеристики</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">Имя:</span>
          <span className="text-slate-200">{character.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Возраст:</span>
          <span className="text-slate-200">{character.age} лет</span>
        </div>
        <Separator className="bg-slate-700" />
        <div className="flex justify-between">
          <span className="text-slate-400">Сила:</span>
          <span className="text-slate-200">{character.strength.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Ловкость:</span>
          <span className="text-slate-200">{character.agility.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Интеллект:</span>
          <span className="text-slate-200">{character.intelligence.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Проводимость:</span>
          <span className="text-slate-200">{character.conductivity.toFixed(2)}/сек</span>
        </div>
        <Separator className="bg-slate-700" />
        <div className="flex justify-between">
          <span className="text-slate-400">Ядро:</span>
          <span className="text-slate-200">{character.coreCapacity} ед.</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Физ. усталость:</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${character.fatigue}%` }} />
            </div>
            <span className="text-slate-200 text-xs">{character.fatigue.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Мент. усталость:</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500" style={{ width: `${character.mentalFatigue}%` }} />
            </div>
            <span className="text-slate-200 text-xs">{character.mentalFatigue.toFixed(0)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Панель инвентаря - мемоизирована
const InventoryPanel = memo(function InventoryPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <Card className="absolute left-14 top-[104px] w-80 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">🎒 Инвентарь</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="text-sm text-slate-400 text-center py-8">
            Инвентарь пуст
            <p className="text-xs mt-2">Найденные предметы будут отображаться здесь</p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

// Панель техник - мемоизирована
const TechniquesPanel = memo(function TechniquesPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <Card className="absolute left-14 top-[104px] w-80 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">⚡ Техники</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="text-sm text-slate-400 text-center py-8">
            Нет изученных техник
            <p className="text-xs mt-2">Изучайте техники культивации в процессе игры</p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

// Панель карты - использует store напрямую, мемоизирована
const MapPanel = memo(function MapPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useGameLocation();

  if (!isOpen) return null;

  return (
    <Card className="absolute left-14 top-[104px] w-96 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">🗺️ Карта мира</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-slate-400 text-center py-8">
          Карта мира
          {location && (
            <p className="text-xs mt-2 text-slate-300">📍 Текущая локация: {location.name}</p>
          )}
          <p className="text-xs mt-2">Исследуйте мир, чтобы открыть новые области</p>
        </div>
      </CardContent>
    </Card>
  );
});

// Панель квестов - мемоизирована
const QuestsPanel = memo(function QuestsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <Card className="absolute left-14 top-[104px] w-80 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">📜 Квесты</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="text-sm text-slate-400 text-center py-8">
            Нет активных квестов
            <p className="text-xs mt-2">Квесты будут появляться по мере развития сюжета</p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

// Панель отношений - мемоизирована
const RelationsPanel = memo(function RelationsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <Card className="absolute left-14 top-[104px] w-80 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">👥 Отношения</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="text-sm text-slate-400 text-center py-8">
            Нет знакомых персонажей
            <p className="text-xs mt-2">Встреченные NPC будут отображаться здесь</p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

// Боковое меню с иконками - мемоизировано
const SideMenu = memo(function SideMenu({ 
  activePanel, 
  setActivePanel 
}: { 
  activePanel: PanelType; 
  setActivePanel: (panel: PanelType) => void;
}) {
  const menuItems: { id: PanelType; icon: string; label: string }[] = [
    { id: "character", icon: "📊", label: "Характеристики" },
    { id: "inventory", icon: "🎒", label: "Инвентарь" },
    { id: "techniques", icon: "⚡", label: "Техники" },
    { id: "map", icon: "🗺️", label: "Карта" },
    { id: "quests", icon: "📜", label: "Квесты" },
    { id: "relations", icon: "👥", label: "Отношения" },
  ];

  return (
    <div className="absolute left-0 top-[104px] bottom-0 w-12 bg-slate-800/90 border-r border-t border-slate-700 flex flex-col items-center py-2 z-20">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActivePanel(activePanel === item.id ? null : item.id)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center mb-1 transition-all ${
            activePanel === item.id
              ? "bg-amber-600/30 border border-amber-500/50 text-amber-400"
              : "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
          }`}
          title={item.label}
        >
          <span className="text-lg">{item.icon}</span>
        </button>
      ))}
    </div>
  );
});

// Props for GameChat - now minimal, just callbacks for navigation
interface GameChatProps {
  onNewGame: () => void;
  onSaveAndExit: () => void;
}

export function GameChat({ onNewGame, onSaveAndExit }: GameChatProps) {
  const [input, setInput] = useState("");
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get state from store using selectors
  const messages = useGameMessages();
  const isLoading = useGameLoading();
  const isPaused = useGamePaused();

  // Get actions from store
  const { sendMessage, togglePause } = useGameActions();

  // Автопрокрутка к новым сообщениям
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Мемоизированные обработчики
  const handleSend = useCallback(() => {
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput("");
    }
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleTogglePause = useCallback(() => {
    togglePause();
  }, [togglePause]);

  // Стабильный обработчик для закрытия панелей
  const handleClosePanel = useCallback(() => setActivePanel(null), []);

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white relative">
      {/* Боковое меню */}
      <SideMenu activePanel={activePanel} setActivePanel={setActivePanel} />

      {/* Панели */}
      <div className="relative">
        <CharacterPanel 
          isOpen={activePanel === "character"} 
          onClose={handleClosePanel} 
        />
        <InventoryPanel 
          isOpen={activePanel === "inventory"} 
          onClose={handleClosePanel} 
        />
        <TechniquesPanel 
          isOpen={activePanel === "techniques"} 
          onClose={handleClosePanel} 
        />
        <MapPanel 
          isOpen={activePanel === "map"} 
          onClose={handleClosePanel}
        />
        <QuestsPanel 
          isOpen={activePanel === "quests"} 
          onClose={handleClosePanel} 
        />
        <RelationsPanel 
          isOpen={activePanel === "relations"} 
          onClose={handleClosePanel} 
        />
      </div>

      {/* Хедер */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex-shrink-0 ml-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-lg font-semibold text-amber-400 flex-shrink-0">
            🌸 Cultivation Simulator
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 min-w-[90px]"
              onClick={handleTogglePause}
            >
              {isPaused ? "▶️ Запуск" : "⏸️ Пауза"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-600 text-emerald-400 hover:bg-emerald-900/30 min-w-[150px]"
              onClick={onSaveAndExit}
            >
              💾 Сохранить и выйти
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-amber-600 text-amber-400 hover:bg-amber-900/30 min-w-[120px]"
              onClick={onNewGame}
            >
              🔄 Новая игра
            </Button>
          </div>
        </div>
      </header>

      {/* Статус-бар */}
      <StatusBar />

      {/* Основная область с ограничением ширины чата */}
      <div className="flex-1 overflow-y-auto p-4 flex justify-center ml-12">
        <div className="w-full max-w-[100ch]">
          {messages.map((message) => (
            <MessageBubble key={String(message.id)} message={message} />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-3">
              <div className="bg-slate-700/50 border border-slate-600/30 p-3 rounded-lg">
                <div className="text-sm text-slate-400 animate-pulse">
                  📖 Рассказчик думает...
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Подсказки команд */}
      <div className="px-4 py-1 text-xs text-slate-500 border-t border-slate-700/50 flex justify-center ml-12">
        <div className="max-w-[100ch] w-full">
          Команды: !! (действие ГГ) | -- (запрос мира) | --- (строгий режим) | --ПМ (проверка мира)
        </div>
      </div>

      {/* Поле ввода */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-center ml-12">
        <div className="w-full max-w-[100ch] flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите действие или команду..."
            className="flex-1 bg-slate-700 border-slate-600 focus:border-amber-500/50"
            disabled={isLoading}
          />
          <Button
            className="bg-amber-600 hover:bg-amber-700"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            Отправить
          </Button>
        </div>
      </div>
    </div>
  );
}
