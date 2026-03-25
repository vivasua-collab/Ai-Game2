/**
 * Вкладка ядер формаций
 * 
 * Позволяет просматривать и генерировать ядра (диски и алтари)
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CORE_NAMES,
  getAvailableCoresForLevel,
} from '@/lib/formations/formation-constants';

interface FormationCore {
  id: string;
  coreType: 'disk' | 'altar';
  variant: string;
  levelMin: number;
  levelMax: number;
  maxSlots: number;
  baseConductivity: number;
  maxCapacity: number;
  isImbued: boolean;
  isStationary: boolean;
  characterId: string | null;
}

interface FormationCoresTabProps {
  characterId: string;
  cultivationLevel: number;
}

export function FormationCoresTab({ characterId, cultivationLevel }: FormationCoresTabProps) {
  const [cores, setCores] = useState<FormationCore[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Загрузка ядер персонажа
  const loadCores = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/formations/cores?characterId=${characterId}`);
      const data = await response.json();
      setCores(data.cores || []);
    } catch (error) {
      console.error('Failed to load cores:', error);
    } finally {
      setIsLoading(false);
    }
  }, [characterId]);
  
  // Генерация нового ядра
  const handleGenerateCore = useCallback(async (
    coreType: 'disk' | 'altar',
    variant?: string
  ) => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/formations/cores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: cultivationLevel,
          characterId,
          coreType,
          variant,
        }),
      });
      
      const data = await response.json();
      if (data.core) {
        await loadCores();
      }
    } catch (error) {
      console.error('Failed to generate core:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [cultivationLevel, characterId, loadCores]);
  
  // Удаление ядра
  const handleDeleteCore = useCallback(async (coreId: string) => {
    try {
      const response = await fetch(`/api/formations/cores?id=${coreId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        await loadCores();
      }
    } catch (error) {
      console.error('Failed to delete core:', error);
    }
  }, [loadCores]);
  
  // Загрузка при монтировании
  useEffect(() => {
    loadCores();
  }, [loadCores]);
  
  // Доступные ядра для уровня
  const availableCores = getAvailableCoresForLevel(cultivationLevel);
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Список имеющихся ядер */}
      <div className="border border-slate-700 rounded-lg p-3">
        <h4 className="text-sm font-medium text-slate-400 mb-2">
          Мои ядра ({cores.length})
        </h4>
        
        <ScrollArea className="h-[300px]">
          {isLoading ? (
            <div className="text-center text-slate-500 py-8">Загрузка...</div>
          ) : cores.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              У вас нет ядер. Сгенерируйте новое ядро.
            </div>
          ) : (
            <div className="space-y-2">
              {cores.map((core) => {
                const key = core.coreType === 'altar' ? `${core.variant}_altar` : core.variant;
                const name = CORE_NAMES[key] || core.variant;
                
                return (
                  <Card key={core.id} className="bg-slate-700/50 border-slate-600">
                    <CardHeader className="py-2 px-3">
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {core.coreType === 'disk' ? '💿' : '🏛️'} {name}
                        </span>
                        {core.isImbued && (
                          <Badge variant="outline" className="border-amber-500 text-amber-400">
                            С формацией
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2 px-3 text-xs text-slate-400">
                      <div className="grid grid-cols-2 gap-1">
                        <span>Уровень: {core.levelMin}-{core.levelMax}</span>
                        <span>Слоты: {core.maxSlots}</span>
                        <span>Проводимость: {core.baseConductivity}</span>
                        <span>Ёмкость: {core.maxCapacity.toLocaleString()}</span>
                      </div>
                      {!core.isImbued && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteCore(core.id)}
                          className="mt-2 text-red-400 hover:text-red-300 h-6 px-2"
                        >
                          Удалить
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>
      
      {/* Генерация новых ядер */}
      <div className="border border-slate-700 rounded-lg p-3">
        <h4 className="text-sm font-medium text-slate-400 mb-2">
          Доступные ядра (Ур. {cultivationLevel})
        </h4>
        
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {availableCores.map((core) => (
              <Card key={`${core.coreType}-${core.variant}`} className="bg-slate-700/50 border-slate-600">
                <CardHeader className="py-2 px-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    {core.coreType === 'disk' ? '💿' : '🏛️'} {core.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2 px-3">
                  <p className="text-xs text-slate-400 mb-2">{core.description}</p>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateCore(core.coreType, core.variant)}
                    disabled={isGenerating}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {isGenerating ? 'Создание...' : 'Создать'}
                  </Button>
                </CardContent>
              </Card>
            ))}
            
            {availableCores.length === 0 && (
              <div className="text-center text-slate-500 py-8">
                Нет доступных ядер для вашего уровня
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            onClick={() => handleGenerateCore('disk')}
            disabled={isGenerating}
            variant="outline"
            className="border-slate-600"
          >
            💿 Случайный диск
          </Button>
          {cultivationLevel >= 5 && (
            <Button
              size="sm"
              onClick={() => handleGenerateCore('altar')}
              disabled={isGenerating}
              variant="outline"
              className="border-slate-600"
            >
              🏛️ Случайный алтарь
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
