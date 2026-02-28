/**
 * ============================================================================
 * EVENT BUS TEST - Тестовый интерфейс для Event Bus
 * ============================================================================
 * 
 * Позволяет тестировать:
 * - HTTP запросы к /api/game/event
 * - Измерение задержек (latency)
 * - Отправку игровых событий
 * 
 * Версия: 2.0.0 (упрощённая архитектура)
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useGameSessionId, useGameCharacter } from '@/stores/game.store';
import { sendEvent } from '@/lib/game/event-bus/client';
import { EVENT_TYPES } from '@/lib/game/events/game-events';

// ==================== ТИПЫ ====================

interface LogEntry {
  id: string;
  timestamp: number;
  type: 'info' | 'sent' | 'received' | 'error' | 'timing';
  message: string;
  latency?: number;
  data?: unknown;
}

// ==================== КОНСТАНТЫ ====================

const EVENT_TYPE_OPTIONS = [
  { value: EVENT_TYPES.DAMAGE_DEALT, label: '⚔️ Damage Dealt' },
  { value: EVENT_TYPES.TECHNIQUE_USE, label: '✨ Technique Use' },
  { value: EVENT_TYPES.USE_ITEM, label: '🎒 Use Item' },
  { value: EVENT_TYPES.PICKUP_ITEM, label: '📦 Pickup Item' },
  { value: EVENT_TYPES.ENTER, label: '🌍 Enter Zone' },
  { value: EVENT_TYPES.MOVE, label: '🚶 Player Move' },
  { value: EVENT_TYPES.TELEPORT, label: '🌀 Teleport' },
];

// ==================== КОМПОНЕНТ ====================

export function EventBusTest() {
  // State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedEventType, setSelectedEventType] = useState<string>(EVENT_TYPES.DAMAGE_DEALT);
  const [targetId, setTargetId] = useState('training_dummy_1');
  const [techniqueId, setTechniqueId] = useState('tech_basic_strike');
  const [isSending, setIsSending] = useState(false);
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const [avgLatency, setAvgLatency] = useState<number | null>(null);
  const [latencies, setLatencies] = useState<number[]>([]);
  
  // Real session from store
  const sessionId = useGameSessionId();
  const character = useGameCharacter();
  const currentSessionId = sessionId || 'no-session';
  const currentCharacterId = character?.id || 'no-character';

  // ==================== УТИЛИТЫ ====================

  const addLog = useCallback((type: LogEntry['type'], message: string, latency?: number, data?: unknown) => {
    setLogs(prev => [
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: Date.now(),
        type,
        message,
        latency,
        data,
      },
      ...prev,
    ].slice(0, 100));
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setLatencies([]);
    setAvgLatency(null);
    setLastLatency(null);
  }, []);

  const updateLatencyStats = useCallback((latency: number) => {
    setLastLatency(latency);
    setLatencies(prev => {
      const newLatencies = [...prev, latency].slice(-10);
      const avg = newLatencies.reduce((a, b) => a + b, 0) / newLatencies.length;
      setAvgLatency(Math.round(avg));
      return newLatencies;
    });
  }, []);

  // ==================== ДЕЙСТВИЯ ====================

  const handleSendEvent = useCallback(async () => {
    if (!sessionId || !character) {
      addLog('error', 'No active session. Start a game first.');
      return;
    }

    setIsSending(true);
    const startTime = Date.now();
    
    try {
      // Создаём базовые данные события
      let eventData: Record<string, unknown>;

      switch (selectedEventType) {
        case EVENT_TYPES.DAMAGE_DEALT:
          eventData = {
            type: EVENT_TYPES.DAMAGE_DEALT,
            sessionId: currentSessionId,
            characterId: currentCharacterId,
            targetId,
            targetType: 'training_dummy',
            techniqueId,
            targetPosition: { x: 500, y: 300 },
            distance: 100,
            rotation: 0,
          };
          break;
          
        case EVENT_TYPES.TECHNIQUE_USE:
          eventData = {
            type: EVENT_TYPES.TECHNIQUE_USE,
            sessionId: currentSessionId,
            characterId: currentCharacterId,
            techniqueId,
            position: { x: 400, y: 300 },
            rotation: 0,
          };
          break;
          
        case EVENT_TYPES.USE_ITEM:
          eventData = {
            type: EVENT_TYPES.USE_ITEM,
            sessionId: currentSessionId,
            characterId: currentCharacterId,
            itemId: 'item_pill_qi',
            quantity: 1,
          };
          break;
          
        case EVENT_TYPES.PICKUP_ITEM:
          eventData = {
            type: EVENT_TYPES.PICKUP_ITEM,
            sessionId: currentSessionId,
            characterId: currentCharacterId,
            worldItemId: 'world_item_001',
            itemType: 'spirit_stone',
            position: { x: 350, y: 250 },
          };
          break;
          
        case EVENT_TYPES.ENTER:
          eventData = {
            type: EVENT_TYPES.ENTER,
            sessionId: currentSessionId,
            characterId: currentCharacterId,
            zoneId: 'zone_qi_rich',
            zoneType: 'qi_rich',
            position: { x: 400, y: 300 },
          };
          break;
          
        case EVENT_TYPES.MOVE:
          eventData = {
            type: EVENT_TYPES.MOVE,
            sessionId: currentSessionId,
            characterId: currentCharacterId,
            fromPosition: { x: 400, y: 300 },
            toPosition: { x: 500, y: 400 },
            distanceMeters: 5.5,
            durationMs: 2000,
          };
          break;
          
        case EVENT_TYPES.TELEPORT:
          eventData = {
            type: EVENT_TYPES.TELEPORT,
            sessionId: currentSessionId,
            characterId: currentCharacterId,
            targetPosition: { x: 600, y: 400 },
            techniqueId: 'tech_teleport',
          };
          break;
          
        default:
          addLog('error', `Unknown event type: ${selectedEventType}`);
          setIsSending(false);
          return;
      }

      addLog('sent', `📤 POST: ${selectedEventType}`);

      // Отправляем через Event Bus
      const result = await sendEvent(eventData as Parameters<typeof sendEvent>[0]);
      
      const latency = Date.now() - startTime;
      updateLatencyStats(latency);

      if (result.success) {
        addLog('received', `✅ Success: ${result.message || 'OK'}`, latency, result);
        
        if (result.commands && result.commands.length > 0) {
          addLog('info', `📋 Commands: ${result.commands.map(c => c.type).join(', ')}`);
        }
      } else {
        addLog('error', `❌ Failed: ${result.error}`, latency, result);
      }

    } catch (err) {
      const latency = Date.now() - startTime;
      addLog('error', `Request failed: ${err instanceof Error ? err.message : 'Unknown'}`, latency);
    } finally {
      setIsSending(false);
    }
  }, [selectedEventType, targetId, techniqueId, sessionId, character, currentSessionId, currentCharacterId, addLog, updateLatencyStats]);

  const handleMultiTest = useCallback(async (count: number = 5) => {
    addLog('info', `🔄 Starting ${count} requests...`);
    
    for (let i = 0; i < count; i++) {
      await handleSendEvent();
      await new Promise(r => setTimeout(r, 100));
    }
    
    addLog('info', `✅ Completed ${count} requests`);
  }, [handleSendEvent, addLog]);

  // ==================== РЕНДЕР ====================

  const hasSession = sessionId && character;

  return (
    <Card className="w-full max-w-md bg-slate-800/90 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-amber-400">
            🧪 Event Bus Test
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant={hasSession ? 'default' : 'secondary'} className="text-xs">
              {hasSession ? '🟢 Ready' : '🔴 No Session'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Latency Stats */}
        <div className="flex gap-4 p-2 bg-slate-900/50 rounded">
          <div className="text-center">
            <div className="text-xs text-slate-400">Last</div>
            <div className="text-lg font-mono text-amber-400">
              {lastLatency !== null ? `${lastLatency}ms` : '-'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">Avg (10)</div>
            <div className="text-lg font-mono text-green-400">
              {avgLatency !== null ? `${avgLatency}ms` : '-'}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-slate-400">Samples</div>
            <div className="text-lg font-mono text-slate-300">
              {latencies.length}
            </div>
          </div>
        </div>

        {/* Session Info */}
        {!hasSession && (
          <div className="p-2 bg-amber-900/30 rounded text-amber-300 text-sm">
            ⚠️ No active session. Start a game first.
          </div>
        )}

        {/* Controls */}
        <div className="space-y-3">
          {/* Event Type */}
          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Event Type</Label>
            <Select value={selectedEventType} onValueChange={setSelectedEventType}>
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPE_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Target ID */}
          {(selectedEventType === EVENT_TYPES.DAMAGE_DEALT) && (
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Target ID</Label>
              <Input
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="bg-slate-700 border-slate-600 h-8"
              />
            </div>
          )}

          {/* Technique ID */}
          {(selectedEventType === EVENT_TYPES.DAMAGE_DEALT || selectedEventType === EVENT_TYPES.TECHNIQUE_USE) && (
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Technique ID</Label>
              <Input
                value={techniqueId}
                onChange={(e) => setTechniqueId(e.target.value)}
                className="bg-slate-700 border-slate-600 h-8"
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleSendEvent}
              disabled={isSending || !hasSession}
              size="sm"
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              {isSending ? '⏳ Sending...' : '📤 Send Event'}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button
              onClick={() => handleMultiTest(5)}
              disabled={isSending || !hasSession}
              variant="outline"
              size="sm"
              className="flex-1 border-slate-600 text-slate-300"
            >
              🔄 Test x5
            </Button>
            <Button
              onClick={() => handleMultiTest(10)}
              disabled={isSending || !hasSession}
              variant="outline"
              size="sm"
              className="flex-1 border-slate-600 text-slate-300"
            >
              🔄 Test x10
            </Button>
          </div>
        </div>

        {/* Logs */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-slate-400 text-xs">Event Log</Label>
            <Button
              onClick={clearLogs}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-slate-500"
            >
              Clear
            </Button>
          </div>
          <ScrollArea className="h-40 w-full rounded border border-slate-700 bg-slate-900/50">
            <div className="p-2 space-y-1 text-xs font-mono">
              {logs.length === 0 ? (
                <div className="text-slate-500 italic">No events yet...</div>
              ) : (
                logs.map(log => (
                  <div 
                    key={log.id}
                    className={`py-1 px-2 rounded ${
                      log.type === 'sent' ? 'bg-blue-900/30 text-blue-300' :
                      log.type === 'received' ? 'bg-green-900/30 text-green-300' :
                      log.type === 'error' ? 'bg-red-900/30 text-red-300' :
                      'bg-slate-800/50 text-slate-300'
                    }`}
                  >
                    <span className="opacity-50">
                      [{new Date(log.timestamp).toLocaleTimeString()}
                      {log.latency !== undefined && ` | ${log.latency}ms`}]
                    </span>{' '}
                    {log.message}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Info */}
        <div className="text-xs text-slate-500 space-y-1">
          <div>Session: <code className="text-slate-400">{currentSessionId.slice(0, 12)}...</code></div>
          <div>API: <code className="text-slate-400">POST /api/game/event</code></div>
          <div className="text-green-400/70">
            ✅ Event Bus встроен в Next.js (без WebSocket)
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default EventBusTest;
