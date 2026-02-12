"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Message, Character, WorldTime, Location } from "@/hooks/useGame";

interface GameChatProps {
  messages: Message[];
  character: Character | null;
  worldTime: WorldTime | null;
  location: Location | null;
  isLoading: boolean;
  isPaused: boolean;
  daysSinceStart: number;
  onSendMessage: (message: string) => void;
  onTogglePause: () => void;
  onNewGame: () => void;
  onSaveAndExit: () => void;
}

// Компонент одного сообщения
function MessageBubble({ message }: { message: Message }) {
  const isPlayer = message.sender === "player";
  const isSystem = message.type === "system";
  const isError = message.type === "error";

  return (
    <div
      className={`flex ${isPlayer ? "justify-end" : "justify-start"} mb-3`}
    >
      <div
        className={`max-w-[80%] p-3 rounded-lg ${
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
        <div className="text-sm text-slate-200 whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  );
}

// Статус-бар
function StatusBar({
  character,
  worldTime,
  location,
  daysSinceStart,
}: {
  character: Character | null;
  worldTime: WorldTime | null;
  location: Location | null;
  daysSinceStart: number;
}) {
  if (!character) return null;

  const qiPercent = (character.currentQi / character.coreCapacity) * 100;
  const healthPercent = character.health;

  return (
    <div className="bg-slate-800/80 border-b border-slate-700 px-4 py-2">
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
}

// Панель характеристик (внизу справа, не мешает хедеру)
function CharacterPanel({ character }: { character: Character | null }) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!character) return null;

  return (
    <div className="fixed bottom-20 right-4 z-20">
      <Button
        variant="outline"
        size="sm"
        className="border-slate-600 bg-slate-800/90 hover:bg-slate-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? "✕ Закрыть" : "📊 Характеристики"}
      </Button>

      {isExpanded && (
        <Card className="absolute bottom-12 right-0 w-72 bg-slate-800/95 border-slate-700 p-4 shadow-xl">
          <h3 className="text-sm font-semibold text-amber-400 mb-3">📊 Характеристики персонажа</h3>
          <div className="space-y-2 text-sm">
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
            <div className="flex justify-between">
              <span className="text-slate-400">Усталость:</span>
              <span className="text-slate-200">{character.fatigue.toFixed(1)}%</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

export function GameChat({
  messages,
  character,
  worldTime,
  location,
  isLoading,
  isPaused,
  daysSinceStart,
  onSendMessage,
  onTogglePause,
  onNewGame,
  onSaveAndExit,
}: GameChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Автопрокрутка к новым сообщениям
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white relative">
      {/* Хедер */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold text-amber-400 flex-shrink-0">
            🌸 Cultivation Simulator
          </h1>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
              onClick={onTogglePause}
            >
              {isPaused ? "▶️ Запуск" : "⏸️ Пауза"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-green-600 text-green-400 hover:bg-green-900/30"
              onClick={onSaveAndExit}
            >
              💾 Сохранить и выйти
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-600 text-red-400 hover:bg-red-900/30"
              onClick={onNewGame}
            >
              🔄 Новая игра
            </Button>
          </div>
        </div>
      </header>

      {/* Статус-бар */}
      <StatusBar
        character={character}
        worldTime={worldTime}
        location={location}
        daysSinceStart={daysSinceStart}
      />

      {/* Панель характеристик */}
      <CharacterPanel character={character} />

      {/* Область сообщений */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
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

      {/* Подсказки команд */}
      <div className="px-4 py-1 text-xs text-slate-500 border-t border-slate-700/50">
        Команды: !! (действие ГГ) | -- (запрос мира) | --- (строгий режим) | --ПМ (проверка мира)
      </div>

      {/* Поле ввода */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex gap-2">
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
