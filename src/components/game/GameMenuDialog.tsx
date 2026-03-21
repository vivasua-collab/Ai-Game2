/**
 * Game Menu Dialog - Save, New, Load, Cheats, Body Editor
 * Updated: 2026-03-11 11:55 - Removed localStorage, server-only storage
 *
 * @created 2024-03-01
 * @updated 2026-03-11 - Server-side storage only
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGameSessionId, useGameActions, useGameCharacter } from '@/stores/game.store';
import {
  Save, Plus, FolderOpen, Trash2, Clock,
  Wrench, FileText
} from 'lucide-react';
import { CheatMenuContent } from './CheatMenuContent';
import { LogsPanel } from './LogsPanel';

interface GameMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Server save data structure (from /api/game/save)
interface ServerSaveData {
  id: string;
  createdAt: string;
  updatedAt: string;
  worldId: string;
  worldName: string;
  startVariant: number;
  startType: string;
  startTypeLabel: string;
  worldYear: number;
  worldMonth: number;
  worldDay: number;
  worldHour: number;
  worldMinute: number;
  daysSinceStart: number;
  character: {
    id: string;
    name: string;
    cultivationLevel: number;
    cultivationSubLevel: number;
    currentQi: number;
    health: number;
  } | null;
}

export function GameMenuDialog({ open, onOpenChange }: GameMenuDialogProps) {
  const sessionId = useGameSessionId();
  const character = useGameCharacter();
  const { saveAndExit, startGame, resetGame, loadGame } = useGameActions();

  const [saves, setSaves] = useState<ServerSaveData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('game');

  // Load saves from server when dialog opens
  useEffect(() => {
    if (open) {
      loadSaves();
      setActiveTab('game');
    }
  }, [open]);

  // Load saves from server API
  const loadSaves = async () => {
    try {
      const response = await fetch('/api/game/save');
      const data = await response.json();
      if (data.success && data.saves) {
        setSaves(data.saves);
      } else {
        setSaves([]);
      }
    } catch (error) {
      console.error('[GameMenu] Failed to load saves:', error);
      setSaves([]);
    }
  };

  // Save current game to server
  const saveCurrentGame = async () => {
    if (!sessionId) {
      setMessage('Нет активной сессии');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      // Save to server via TruthSystem
      const response = await fetch('/api/game/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, saveType: 'quick' }),
      });
      const data = await response.json();

      if (data.success) {
        setMessage('Игра сохранена!');
        // Reload saves list
        await loadSaves();
      } else {
        setMessage('Ошибка сохранения: ' + (data.error || 'Неизвестная ошибка'));
      }
    } catch (error) {
      setMessage('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  // Load a save from server
  const loadSave = async (saveSessionId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const success = await loadGame(saveSessionId);
      if (success) {
        setMessage('Игра загружена!');
        onOpenChange(false);
      } else {
        setMessage('Ошибка загрузки сессии');
      }
    } catch (error) {
      setMessage('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  // Delete a save from server
  const deleteSave = async (saveSessionId: string) => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/game/save?sessionId=${saveSessionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setMessage('Сохранение удалено');
        // Reload saves list
        await loadSaves();
      } else {
        setMessage('Ошибка удаления');
      }
    } catch (error) {
      setMessage('Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  // Start new game
  const startNewGame = async () => {
    setLoading(true);
    setMessage(null);
    try {
      resetGame();
      const success = await startGame(1, undefined, 'Путник');
      if (success) {
        setMessage('Новая игра создана!');
        onOpenChange(false);
      } else {
        setMessage('Ошибка создания игры');
      }
    } catch (error) {
      setMessage('Ошибка создания игры');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString('ru');
    } catch {
      return 'Неизвестно';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-amber-400 flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            Главное меню
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800 mx-4 rounded-lg" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="game" className="data-[state=active]:bg-amber-600">
              <FolderOpen className="w-4 h-4 mr-2" />
              Игра
            </TabsTrigger>
            <TabsTrigger value="cheats" className="data-[state=active]:bg-red-600">
              <Wrench className="w-4 h-4 mr-2" />
              Читы
            </TabsTrigger>
            <TabsTrigger value="logs" className="data-[state=active]:bg-purple-600">
              <FileText className="w-4 h-4 mr-2" />
              Логи
            </TabsTrigger>
          </TabsList>

          {/* Вкладка "Игра" */}
          <TabsContent value="game" className="p-4 space-y-4 mt-0">
            {/* Кнопки действий */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={saveCurrentGame}
                disabled={loading || !sessionId}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </Button>

              <Button
                onClick={startNewGame}
                disabled={loading}
                className="bg-amber-600 hover:bg-amber-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Новая игра
              </Button>
            </div>

            {/* Сохранения */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Сохранения (сервер)
              </h3>

              {saves.length === 0 ? (
                <div className="text-center text-slate-500 py-4 bg-slate-800/50 rounded-lg">
                  Нет сохранений
                </div>
              ) : (
                <ScrollArea className="h-48 border border-slate-700 rounded-lg">
                  <div className="divide-y divide-slate-700">
                    {saves.map((save) => (
                      <div
                        key={save.id}
                        className={`p-3 flex items-center justify-between ${
                          save.id === sessionId ? 'bg-amber-900/20' : 'bg-slate-800/30'
                        } hover:bg-slate-800/50`}
                      >
                        <div
                          className="flex-1 cursor-pointer"
                          onClick={() => loadSave(save.id)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{save.character?.name || 'Персонаж'}</span>
                            {save.id === sessionId && (
                              <span className="text-xs text-amber-400">(текущая)</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            Ур. {save.character?.cultivationLevel || 1} • День {save.worldDay} • {save.worldName}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDate(save.updatedAt)}
                          </div>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                          onClick={() => deleteSave(save.id)}
                          disabled={loading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>

            {/* Сообщение */}
            {message && (
              <div className="text-sm text-center p-2 bg-slate-800/50 rounded-lg">
                {message}
              </div>
            )}
          </TabsContent>

          {/* Вкладка "Читы" */}
          <TabsContent value="cheats" className="mt-0 overflow-y-auto max-h-[60vh]">
            <CheatMenuContent />
          </TabsContent>

          {/* Вкладка "Логи" */}
          <TabsContent value="logs" className="mt-0 overflow-hidden" style={{ maxHeight: '65vh', height: '60vh' }}>
            <LogsPanel />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
