/**
 * Chat Panel for 2D Game Mode
 * 
 * Lightweight chat component for use alongside Phaser canvas.
 */

'use client';

import { useState, useRef, useEffect, memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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

// Маппинг редкости на цвета
const RARITY_COLORS: Record<string, string> = {
  common: "text-slate-300",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  legendary: "text-amber-400",
};

// Компонент одного сообщения
const MessageBubble = memo(function MessageBubble({ message }: { message: Message }) {
  const isPlayer = message.sender === "player";
  const isSystem = message.type === "system";
  const isError = message.type === "error";

  return (
    <div className={`flex ${isPlayer ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`p-2 rounded-lg text-sm ${
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
            {message.sender === "narrator" ? "📖" : "⚙️"}
          </div>
        )}
        <div className="text-slate-200 whitespace-pre-wrap break-words">
          {message.content.length > 500 
            ? message.content.slice(0, 500) + "..." 
            : message.content}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.message.id === nextProps.message.id);

// Компактный статус бар
function CompactStatusBar() {
  const character = useGameCharacter();
  const worldTime = useGameTime();
  const location = useGameLocation();

  if (!character) return null;

  const qiPercent = (character.currentQi / character.coreCapacity) * 100;

  return (
    <div className="bg-slate-800/90 border-b border-slate-700 px-3 py-2 text-xs">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">
            Lv.{character.cultivationLevel}.{character.cultivationSubLevel}
          </Badge>
          <div className="flex items-center gap-1">
            <span className="text-cyan-400">Ци</span>
            <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500" style={{ width: `${qiPercent}%` }} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-400">HP</span>
            <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${character.health}%` }} />
            </div>
          </div>
        </div>
        {worldTime && (
          <div className="text-slate-400">
            День {character.age} • {worldTime.hour}:{worldTime.minute.toString().padStart(2, "0")}
          </div>
        )}
      </div>
      {location && (
        <div className="text-slate-400 mt-1 truncate">
          📍 {location.name}
        </div>
      )}
    </div>
  );
}

interface ChatPanelProps {
  className?: string;
}

export function ChatPanel({ className = "" }: ChatPanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get state from store
  const messages = useGameMessages();
  const isLoading = useGameLoading();
  const isPaused = useGamePaused();

  // Get actions from store
  const { sendMessage, togglePause } = useGameActions();

  // Автопрокрутка к новым сообщениям
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Обработчики
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

  return (
    <div className={`flex flex-col h-full bg-slate-900 text-white ${className}`}>
      {/* Статус бар */}
      <CompactStatusBar />

      {/* Заголовок */}
      <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 flex items-center justify-between">
        <h2 className="text-sm font-medium text-amber-400">💬 Чат</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-slate-400"
            onClick={togglePause}
          >
            {isPaused ? "▶️" : "⏸️"}
          </Button>
        </div>
      </div>

      {/* Сообщения */}
      <ScrollArea className="flex-1 p-3">
        {messages.length === 0 ? (
          <div className="text-sm text-slate-400 text-center py-8">
            Нет сообщений
            <p className="text-xs mt-2">Введите действие для начала</p>
          </div>
        ) : (
          <>
            {messages.slice(-100).map((message) => (
              <MessageBubble key={String(message.id)} message={message} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-2">
                <div className="bg-slate-700/50 border border-slate-600/30 p-2 rounded-lg">
                  <div className="text-xs text-slate-400 animate-pulse">📖 Думает...</div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </ScrollArea>

      {/* Подсказки */}
      <div className="px-3 py-1 text-xs text-slate-500 border-t border-slate-700/50">
        !! действие | -- запрос | --- строгий
      </div>

      {/* Поле ввода */}
      <div className="p-3 border-t border-slate-700 bg-slate-800/50">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Действие..."
            className="flex-1 bg-slate-700 border-slate-600 text-sm h-8"
            disabled={isLoading}
          />
          <Button
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 h-8 px-3"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            ➤
          </Button>
        </div>
      </div>
    </div>
  );
}
