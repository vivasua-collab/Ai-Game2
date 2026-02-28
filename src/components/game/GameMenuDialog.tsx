/**
 * Game Menu Dialog - Save, New, Load, Cheats, Body Editor
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
  Wrench, User, ChevronRight 
} from 'lucide-react';
import { CheatMenuContent } from './CheatMenuContent';
import { BodyDollEditor } from './BodyDollEditor';

interface GameMenuDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface SaveData {
  sessionId: string;
  characterName: string;
  level: number;
  savedAt: string;
  worldDay: number;
}

const SESSION_STORAGE_KEY = 'cultivation_session_id';
const SAVES_KEY = 'cultivation_saves_list';

export function GameMenuDialog({ open, onOpenChange }: GameMenuDialogProps) {
  const sessionId = useGameSessionId();
  const character = useGameCharacter();
  const { saveAndExit, startGame, resetGame } = useGameActions();
  
  const [saves, setSaves] = useState<SaveData[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('game');

  useEffect(() => {
    if (open) {
      loadSaves();
      // Сброс на вкладку "Игра" при открытии
      setActiveTab('game');
    }
  }, [open]);

  const loadSaves = () => {
    try {
      const saved = localStorage.getItem(SAVES_KEY);
      if (saved) {
        setSaves(JSON.parse(saved));
      } else {
        setSaves([]);
      }
    } catch {
      setSaves([]);
    }
  };

  const saveCurrentGame = async () => {
    if (!sessionId) {
      setMessage('Нет активной сессии');
      return;
    }
    
    setLoading(true);
    try {
      await saveAndExit();
      
      // Сохраняем в список сохранений
      const savesList: SaveData[] = JSON.parse(localStorage.getItem(SAVES_KEY) || '[]');
      const newSave: SaveData = {
        sessionId,
        characterName: character?.name || 'Персонаж',
        level: character?.cultivationLevel || 1,
        savedAt: new Date().toISOString(),
        worldDay: 1, // TODO: получить из стора
      };
      
      // Проверяем, нет ли уже этого сохранения
      const existingIndex = savesList.findIndex(s => s.sessionId === sessionId);
      if (existingIndex >= 0) {
        savesList[existingIndex] = newSave;
      } else {
        savesList.unshift(newSave);
      }
      
      // Храним максимум 10 сохранений
      if (savesList.length > 10) {
        savesList.pop();
      }
      
      localStorage.setItem(SAVES_KEY, JSON.stringify(savesList));
      setSaves(savesList);
      setMessage('Игра сохранена!');
    } catch (error) {
      setMessage('Ошибка сохранения');
    } finally {
      setLoading(false);
    }
  };

  const loadSave = async (saveSessionId: string) => {
    setLoading(true);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, saveSessionId);
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      setMessage('Ошибка загрузки');
      setLoading(false);
    }
  };

  const deleteSave = (saveSessionId: string) => {
    const updated = saves.filter(s => s.sessionId !== saveSessionId);
    localStorage.setItem(SAVES_KEY, JSON.stringify(updated));
    setSaves(updated);
    setMessage('Сохранение удалено');
  };

  const startNewGame = async () => {
    setLoading(true);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      resetGame();
      onOpenChange(false);
      
      const success = await startGame(1, undefined, 'Путник');
      if (success && typeof window !== 'undefined') {
        const store = (await import('@/stores/game.store')).useGameStore.getState();
        if (store.sessionId) {
          localStorage.setItem(SESSION_STORAGE_KEY, store.sessionId);
        }
      }
      
      window.location.reload();
    } catch (error) {
      setMessage('Ошибка создания игры');
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
            <TabsTrigger value="body" className="data-[state=active]:bg-purple-600">
              <User className="w-4 h-4 mr-2" />
              Редактор тела
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
                Сохранения
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
                        key={save.sessionId}
                        className={`p-3 flex items-center justify-between ${
                          save.sessionId === sessionId ? 'bg-amber-900/20' : 'bg-slate-800/30'
                        } hover:bg-slate-800/50`}
                      >
                        <div 
                          className="flex-1 cursor-pointer"
                          onClick={() => loadSave(save.sessionId)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{save.characterName}</span>
                            {save.sessionId === sessionId && (
                              <span className="text-xs text-amber-400">(текущая)</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">
                            Ур. {save.level} • День {save.worldDay} • {formatDate(save.savedAt)}
                          </div>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                          onClick={() => deleteSave(save.sessionId)}
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

          {/* Вкладка "Редактор тела" */}
          <TabsContent value="body" className="mt-0 overflow-hidden p-4" style={{ maxHeight: '65vh' }}>
            <div className="bg-slate-800/50 rounded-lg p-4 h-full">
              <h3 className="text-lg font-medium text-amber-400 mb-3 flex items-center gap-2">
                <User className="w-5 h-5" />
                Редактор куклы тела
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Создание и настройка визуальных кукол для персонажей и монстров.
                Загружайте изображения частей тела, размещайте их и экспортируйте конфигурацию.
              </p>
              <div className="h-[calc(60vh-160px)] overflow-auto">
                <BodyDollEditor 
                  entityName="Человек"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
