/**
 * LogsPanel - Панель просмотра логов системы
 * 
 * Отображает:
 * - Системные логи (ERROR, WARN, INFO, DEBUG)
 * - Qi логи (изменения Ци)
 * - Фильтрация по уровню и категории
 * - Автообновление
 * 
 * @updated 2026-03-06 13:00 UTC
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, AlertTriangle, Info, Bug, RefreshCw, 
  Trash2, Filter, Pause, Play, ChevronDown, ChevronUp,
  Zap, TrendingUp, TrendingDown
} from 'lucide-react';

// Типы логов (синхронизированы с server-side)
type LogLevel = 'ERROR' | 'WARN' | 'INFO' | 'DEBUG';
type LogCategory = 'SYSTEM' | 'API' | 'LLM' | 'GAME' | 'DATABASE' | 'UI' | 'AUTH' | 'CHEATS' | 'TECHNIQUE_POOL' | 'UNKNOWN';

interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details: Record<string, unknown> | null;
  stack?: string | null;
  sessionId?: string | null;
  duration?: number | null;
}

interface LogsResponse {
  success: boolean;
  settings: {
    enabled: boolean;
    level: LogLevel;
  };
  qiLogs: {
    enabled: boolean;
    logs: QiLogEntry[];
  };
  database: {
    available: boolean;
    total: number;
    logs: LogEntry[];
  };
  buffer: {
    count: number;
  };
}

interface QiLogEntry {
  timestamp: string;
  sessionId: string;
  characterId: string;
  oldQi: number;
  newQi: number;
  qiChange: number;
  source: string;
  reason: string;
  details?: Record<string, unknown>;
  oldAccumulated?: number;
  newAccumulated?: number;
  accumulatedChange?: number;
}

// Цвета уровней
const LEVEL_COLORS: Record<LogLevel, string> = {
  ERROR: 'text-red-400 bg-red-400/10 border-red-400/30',
  WARN: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  INFO: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  DEBUG: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
};

const LEVEL_ICONS: Record<LogLevel, React.ReactNode> = {
  ERROR: <AlertCircle className="w-4 h-4" />,
  WARN: <AlertTriangle className="w-4 h-4" />,
  INFO: <Info className="w-4 h-4" />,
  DEBUG: <Bug className="w-4 h-4" />,
};

// Цвета категорий
const CATEGORY_COLORS: Record<LogCategory, string> = {
  SYSTEM: 'text-purple-400',
  API: 'text-cyan-400',
  LLM: 'text-orange-400',
  GAME: 'text-green-400',
  DATABASE: 'text-pink-400',
  UI: 'text-blue-400',
  AUTH: 'text-red-400',
  CHEATS: 'text-yellow-400',
  TECHNIQUE_POOL: 'text-amber-400',
  UNKNOWN: 'text-gray-400',
};

// Цвета источников Qi
const QI_SOURCE_COLORS: Record<string, string> = {
  meditation: 'text-purple-400',
  breakthrough: 'text-amber-400',
  conductivity: 'text-cyan-400',
  technique: 'text-red-400',
  combat: 'text-orange-400',
  item: 'text-green-400',
  dissipation: 'text-gray-400',
  cheat: 'text-yellow-400',
  system: 'text-blue-400',
  passive: 'text-emerald-400',
  sync: 'text-pink-400',
  unknown: 'text-gray-400',
};

export function LogsPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [qiLogs, setQiLogs] = useState<QiLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'system' | 'qi'>('system');
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'ALL'>('ALL');
  const [filterCategory, setFilterCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [qiFilterSource, setQiFilterSource] = useState<string>('ALL');

  // Загрузка логов
  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterLevel !== 'ALL') params.append('level', filterLevel);
      if (filterCategory !== 'ALL') params.append('category', filterCategory);
      params.append('limit', '200');

      const response = await fetch(`/api/logs?${params.toString()}`);
      const data: LogsResponse = await response.json();

      if (data.success) {
        setLogs(data.database.logs);
        if (data.qiLogs) {
          setQiLogs(data.qiLogs.logs);
        }
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filterLevel, filterCategory]);

  // Автообновление
  useEffect(() => {
    fetchLogs();

    if (autoRefresh) {
      const interval = setInterval(fetchLogs, 3000);
      return () => clearInterval(interval);
    }
  }, [fetchLogs, autoRefresh]);

  // Очистка всех логов
  const clearAllLogs = async () => {
    try {
      // Очищаем системные логи
      await fetch('/api/logs', {
        method: 'DELETE',
      });
      
      // Очищаем Qi логи
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clearQiBuffer' }),
      });
      
      setLogs([]);
      setQiLogs([]);
      setExpandedId(null);
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  // Форматирование времени
  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('ru', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        fractionalSecondDigits: 3
      });
    } catch {
      return timestamp;
    }
  };

  // Фильтрованные системные логи
  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'ALL' && log.level !== filterLevel) return false;
    if (filterCategory !== 'ALL' && log.category !== filterCategory) return false;
    return true;
  });

  // Фильтрованные Qi логи
  const filteredQiLogs = qiLogs.filter(log => {
    if (qiFilterSource !== 'ALL' && log.source !== qiFilterSource) return false;
    return true;
  });

  // Уникальные источники Qi
  const qiSources = ['ALL', ...new Set(qiLogs.map(l => l.source))];

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Заголовок с настройками */}
      <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium text-amber-400">📋 Логи</h3>
          <Badge variant="outline" className="text-xs">
            {activeTab === 'system' ? `${filteredLogs.length}/${logs.length}` : `${filteredQiLogs.length}/${qiLogs.length}`}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Автообновление */}
          <div className="flex items-center gap-1.5 mr-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              className="data-[state=checked]:bg-green-600"
            />
            <Label className="text-xs text-slate-400 cursor-pointer">
              {autoRefresh ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </Label>
          </div>

          {/* Обновить */}
          <Button
            size="sm"
            variant="outline"
            onClick={fetchLogs}
            disabled={loading}
            className="h-7 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {/* Очистить всё */}
          <Button
            size="sm"
            variant="outline"
            onClick={clearAllLogs}
            className="h-7 border-red-600/50 text-red-400 hover:bg-red-900/30"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Вкладки */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'system' | 'qi')} className="flex-1 flex flex-col">
        <TabsList className="mx-3 mt-2 bg-slate-800">
          <TabsTrigger value="system" className="data-[state=active]:bg-slate-700">
            🖥️ Система
          </TabsTrigger>
          <TabsTrigger value="qi" className="data-[state=active]:bg-slate-700">
            ⚡ Ци ({qiLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Фильтры системных логов */}
        <TabsContent value="system" className="flex-1 flex flex-col mt-0">
          <div className="flex items-center gap-2 p-2 border-b border-slate-700 bg-slate-800/30">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            
            <Select value={filterLevel} onValueChange={(v) => setFilterLevel(v as LogLevel | 'ALL')}>
              <SelectTrigger className="h-7 w-28 text-xs bg-slate-700 border-slate-600">
                <SelectValue placeholder="Уровень" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="ALL" className="text-xs">Все уровни</SelectItem>
                <SelectItem value="ERROR" className="text-xs text-red-400">ERROR</SelectItem>
                <SelectItem value="WARN" className="text-xs text-yellow-400">WARN</SelectItem>
                <SelectItem value="INFO" className="text-xs text-blue-400">INFO</SelectItem>
                <SelectItem value="DEBUG" className="text-xs text-gray-400">DEBUG</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as LogCategory | 'ALL')}>
              <SelectTrigger className="h-7 w-32 text-xs bg-slate-700 border-slate-600">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="ALL" className="text-xs">Все</SelectItem>
                <SelectItem value="SYSTEM" className="text-xs text-purple-400">SYSTEM</SelectItem>
                <SelectItem value="API" className="text-xs text-cyan-400">API</SelectItem>
                <SelectItem value="LLM" className="text-xs text-orange-400">LLM</SelectItem>
                <SelectItem value="GAME" className="text-xs text-green-400">GAME</SelectItem>
                <SelectItem value="DATABASE" className="text-xs text-pink-400">DATABASE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Список системных логов */}
          <ScrollArea className="flex-1 max-h-[400px]">
            <div className="p-2 space-y-1">
              {loading && logs.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  Загрузка логов...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  Нет логов для отображения
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <LogItem
                    key={log.id}
                    log={log}
                    expanded={expandedId === log.id}
                    onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    formatTime={formatTime}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Фильтры Qi логов */}
        <TabsContent value="qi" className="flex-1 flex flex-col mt-0">
          <div className="flex items-center gap-2 p-2 border-b border-slate-700 bg-slate-800/30">
            <Zap className="w-3.5 h-3.5 text-purple-400" />
            
            <Select value={qiFilterSource} onValueChange={setQiFilterSource}>
              <SelectTrigger className="h-7 w-32 text-xs bg-slate-700 border-slate-600">
                <SelectValue placeholder="Источник" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="ALL" className="text-xs">Все</SelectItem>
                {qiSources.filter(s => s !== 'ALL').map(source => (
                  <SelectItem key={source} value={source} className="text-xs">
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Статистика Qi */}
            <div className="flex items-center gap-2 ml-auto text-xs">
              <span className="text-green-400 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +{qiLogs.filter(l => l.qiChange > 0).reduce((s, l) => s + l.qiChange, 0)}
              </span>
              <span className="text-red-400 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" />
                {qiLogs.filter(l => l.qiChange < 0).reduce((s, l) => s + l.qiChange, 0)}
              </span>
            </div>
          </div>

          {/* Список Qi логов */}
          <ScrollArea className="flex-1 max-h-[400px]">
            <div className="p-2 space-y-1">
              {filteredQiLogs.length === 0 ? (
                <div className="text-center text-slate-500 py-8">
                  Нет логов изменений Ци
                </div>
              ) : (
                filteredQiLogs.map((log, index) => (
                  <QiLogItem
                    key={`${log.timestamp}-${index}`}
                    log={log}
                    expanded={expandedId === `qi-${index}`}
                    onToggle={() => setExpandedId(expandedId === `qi-${index}` ? null : `qi-${index}`)}
                    formatTime={formatTime}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Статус-бар */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-700 bg-slate-800/50 text-xs text-slate-400">
        <span>Система: {logs.length} | Ци: {qiLogs.length}</span>
        <span>{autoRefresh ? '🔄 Авто' : '⏸️ Пауза'}</span>
      </div>
    </div>
  );
}

// Компонент отдельного системного лога
function LogItem({ 
  log, 
  expanded, 
  onToggle,
  formatTime 
}: { 
  log: LogEntry; 
  expanded: boolean; 
  onToggle: () => void;
  formatTime: (t: string) => string;
}) {
  const levelColor = LEVEL_COLORS[log.level];
  const categoryColor = CATEGORY_COLORS[log.category];
  const LevelIcon = LEVEL_ICONS[log.level];

  return (
    <div 
      className={`rounded-lg border transition-colors cursor-pointer ${
        expanded 
          ? 'bg-slate-700/50 border-slate-600' 
          : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/30'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2 p-2">
        <div className={`flex-shrink-0 mt-0.5 ${levelColor.split(' ')[0]}`}>
          {LevelIcon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-mono">
              {formatTime(log.timestamp)}
            </span>

            <Badge 
              variant="outline" 
              className={`text-[10px] px-1.5 py-0 h-4 ${levelColor}`}
            >
              {log.level}
            </Badge>

            <span className={`text-[10px] font-medium ${categoryColor}`}>
              [{log.category}]
            </span>

            {log.duration !== null && log.duration !== undefined && (
              <span className="text-[10px] text-cyan-400">
                {log.duration}ms
              </span>
            )}

            {log.details && (
              <div className="ml-auto">
                {expanded 
                  ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                  : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                }
              </div>
            )}
          </div>

          <p className="text-sm text-slate-200 mt-0.5 break-all">
            {log.message}
          </p>
        </div>
      </div>

      {expanded && (log.details || log.stack) && (
        <div className="px-2 pb-2 pt-0 border-t border-slate-600/50 mt-1">
          {log.details && Object.keys(log.details).length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-slate-400">Details:</span>
              <pre className="mt-1 text-xs text-slate-300 bg-slate-800 rounded p-2 overflow-x-auto max-h-40">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}
          
          {log.stack && (
            <div className="mt-2">
              <span className="text-xs text-red-400">Stack trace:</span>
              <pre className="mt-1 text-xs text-red-300/80 bg-red-900/20 rounded p-2 overflow-x-auto max-h-32">
                {log.stack}
              </pre>
            </div>
          )}

          {log.sessionId && (
            <div className="mt-1 text-xs text-slate-500">
              Session: {log.sessionId}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Компонент отдельного Qi лога
function QiLogItem({ 
  log, 
  expanded, 
  onToggle,
  formatTime 
}: { 
  log: QiLogEntry; 
  expanded: boolean; 
  onToggle: () => void;
  formatTime: (t: string) => string;
}) {
  const sourceColor = QI_SOURCE_COLORS[log.source] || 'text-gray-400';
  const isGain = log.qiChange >= 0;
  const changeColor = isGain ? 'text-green-400' : 'text-red-400';
  const ChangeIcon = isGain ? TrendingUp : TrendingDown;

  return (
    <div 
      className={`rounded-lg border transition-colors cursor-pointer ${
        expanded 
          ? 'bg-slate-700/50 border-slate-600' 
          : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-700/30'
      }`}
      onClick={onToggle}
    >
      <div className="flex items-start gap-2 p-2">
        <div className={`flex-shrink-0 mt-0.5 ${isGain ? 'text-purple-400' : 'text-red-400'}`}>
          <Zap className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500 font-mono">
              {formatTime(log.timestamp)}
            </span>

            <Badge 
              variant="outline" 
              className={`text-[10px] px-1.5 py-0 h-4 ${changeColor} bg-current/10 border-current/30`}
            >
              {isGain ? '+' : ''}{log.qiChange}
            </Badge>

            <span className={`text-[10px] font-medium ${sourceColor}`}>
              [{log.source}]
            </span>

            <div className="ml-auto">
              {expanded 
                ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              }
            </div>
          </div>

          <p className="text-sm text-slate-200 mt-0.5">
            <span className="text-slate-400">Ядро:</span> {log.oldQi} → {log.newQi}
            {log.accumulatedChange !== undefined && log.accumulatedChange !== 0 && (
              <span className="ml-2 text-slate-400">
                | Накоп: {log.oldAccumulated} → {log.newAccumulated}
              </span>
            )}
          </p>
          
          <p className="text-xs text-slate-400 mt-0.5 truncate">
            {log.reason}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="px-2 pb-2 pt-0 border-t border-slate-600/50 mt-1">
          <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
            <div>
              <span className="text-slate-500">Старое Ци:</span>
              <span className="ml-1 text-slate-300">{log.oldQi}</span>
            </div>
            <div>
              <span className="text-slate-500">Новое Ци:</span>
              <span className="ml-1 text-slate-300">{log.newQi}</span>
            </div>
            {log.oldAccumulated !== undefined && (
              <>
                <div>
                  <span className="text-slate-500">Старое накоп:</span>
                  <span className="ml-1 text-slate-300">{log.oldAccumulated}</span>
                </div>
                <div>
                  <span className="text-slate-500">Новое накоп:</span>
                  <span className="ml-1 text-slate-300">{log.newAccumulated}</span>
                </div>
              </>
            )}
            <div>
              <span className="text-slate-500">Источник:</span>
              <span className={`ml-1 ${sourceColor}`}>{log.source}</span>
            </div>
            <div>
              <span className="text-slate-500">Причина:</span>
              <span className="ml-1 text-slate-300">{log.reason}</span>
            </div>
          </div>

          {log.details && Object.keys(log.details).length > 0 && (
            <div className="mt-2">
              <span className="text-xs text-slate-400">Details:</span>
              <pre className="mt-1 text-xs text-slate-300 bg-slate-800 rounded p-2 overflow-x-auto max-h-32">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-2 text-xs text-slate-500">
            Session: {log.sessionId.slice(0, 8)}...
          </div>
        </div>
      )}
    </div>
  );
}

export default LogsPanel;
