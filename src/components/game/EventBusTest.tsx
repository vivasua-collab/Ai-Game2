/**
 * EventBus Test Component
 * 
 * Панель для тестирования Event Bus системы.
 * Позволяет отправлять события и видеть ответы.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGameCharacter } from '@/stores/game.store';
import { Play, Send, Trash2, Activity } from 'lucide-react';

interface EventBusTestProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  type: 'sent' | 'received' | 'error';
  direction: '→' | '←' | '✗';
  eventType?: string;
  data: unknown;
}

const EVENT_TYPES = [
  { value: 'character.update', label: '👤 character.update' },
  { value: 'inventory.update', label: '🎒 inventory.update' },
  { value: 'technique.use', label: '⚔️ technique.use' },
  { value: 'combat.start', label: '💀 combat.start' },
  { value: 'combat.end', label: '🏆 combat.end' },
  { value: 'movement', label: '🚶 movement' },
  { value: 'time.tick', label: '⏰ time.tick' },
  { value: 'custom', label: '✏️ Свой тип' },
];

export function EventBusTest({ open, onOpenChange }: EventBusTestProps) {
  const character = useGameCharacter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [eventType, setEventType] = useState('character.update');
  const [customType, setCustomType] = useState('');
  const [payload, setPayload] = useState('{}');
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка логов из localStorage
  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('eventbus_test_logs');
      if (saved) {
        try {
          setLogs(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    }
  }, [open]);

  // Сохранение логов
  const saveLogs = useCallback((newLogs: LogEntry[]) => {
    setLogs(newLogs);
    localStorage.setItem('eventbus_test_logs', JSON.stringify(newLogs.slice(-50)));
  }, []);

  const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    const newEntry: LogEntry = {
      ...entry,
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toLocaleTimeString(),
    };
    saveLogs([newEntry, ...logs].slice(0, 50));
  };

  const clearLogs = () => {
    saveLogs([]);
  };

  const sendEvent = async () => {
    if (!character?.id) {
      addLog({
        type: 'error',
        direction: '✗',
        data: 'Нет активного персонажа',
      });
      return;
    }

    const type = eventType === 'custom' ? customType : eventType;
    if (!type) {
      addLog({
        type: 'error',
        direction: '✗',
        data: 'Укажите тип события',
      });
      return;
    }

    let parsedPayload: unknown;
    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      addLog({
        type: 'error',
        direction: '✗',
        data: 'Неверный JSON в payload',
      });
      return;
    }

    setIsLoading(true);

    // Логируем отправку
    addLog({
      type: 'sent',
      direction: '→',
      eventType: type,
      data: parsedPayload,
    });

    try {
      const response = await fetch('/api/game/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: character.id,
          eventType: type,
          payload: parsedPayload,
        }),
      });

      const result = await response.json();

      addLog({
        type: 'received',
        direction: '←',
        eventType: type,
        data: result,
      });
    } catch (error) {
      addLog({
        type: 'error',
        direction: '✗',
        eventType: type,
        data: error instanceof Error ? error.message : 'Network error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'sent': return 'text-blue-400';
      case 'received': return 'text-green-400';
      case 'error': return 'text-red-400';
    }
  };

  const getLogBg = (type: LogEntry['type']) => {
    switch (type) {
      case 'sent': return 'bg-blue-900/20';
      case 'received': return 'bg-green-900/20';
      case 'error': return 'bg-red-900/20';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-cyan-400 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Тест Event Bus
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Форма отправки */}
          <div className="bg-slate-800/50 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-slate-400">Тип события</Label>
                <Select value={eventType} onValueChange={setEventType}>
                  <SelectTrigger className="bg-slate-700 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700">
                    {EVENT_TYPES.map(et => (
                      <SelectItem key={et.value} value={et.value}>
                        {et.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {eventType === 'custom' && (
                <div>
                  <Label className="text-xs text-slate-400">Свой тип</Label>
                  <Input
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="my.custom.event"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              )}
            </div>

            <div>
              <Label className="text-xs text-slate-400">Payload (JSON)</Label>
              <Input
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                placeholder='{"key": "value"}'
                className="bg-slate-700 border-slate-600 font-mono text-sm"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={sendEvent}
                disabled={isLoading}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Отправить
              </Button>
              <Button
                onClick={clearLogs}
                variant="outline"
                className="border-slate-600 text-slate-400"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Очистить лог
              </Button>
            </div>
          </div>

          {/* Логи */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Лог событий</span>
              <Badge variant="outline" className="border-slate-600">
                {logs.length} записей
              </Badge>
            </div>
            
            <ScrollArea className="h-64 border border-slate-700 rounded-lg">
              {logs.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  Нет записей. Отправьте событие.
                </div>
              ) : (
                <div className="divide-y divide-slate-700/50">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-2 text-xs font-mono ${getLogBg(log.type)}`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-slate-500">{log.timestamp}</span>
                        <span className={getLogColor(log.type)}>{log.direction}</span>
                        {log.eventType && (
                          <Badge variant="outline" className="text-[10px] border-slate-600">
                            {log.eventType}
                          </Badge>
                        )}
                      </div>
                      <pre className="text-slate-300 whitespace-pre-wrap overflow-x-auto">
                        {typeof log.data === 'object' 
                          ? JSON.stringify(log.data, null, 2)
                          : String(log.data)
                        }
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Информация */}
          <div className="text-xs text-slate-500 bg-slate-800/30 rounded p-2">
            <div className="font-medium text-slate-400 mb-1">ℹ️ Информация:</div>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Character ID: {character?.id || 'не определён'}</li>
              <li>Events отправляются на /api/game/event</li>
              <li>Лог хранится в localStorage</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default EventBusTest;
