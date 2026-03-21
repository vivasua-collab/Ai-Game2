/**
 * UpgradeDialog - Диалог улучшения грейда экипировки
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@prisma/client';
import { GRADE_CONFIGS, GRADE_ORDER, getRequiredMaterialsForUpgrade, getRequiredSkillForUpgrade } from '@/lib/game/grade-system';
import { EquipmentGrade } from '@/types/equipment-v2';
import { GradeBadge } from './GradeBadge';

interface UpgradeDialogProps {
  item: InventoryItem;
  onUpgraded: () => void;
  trigger?: React.ReactNode;
}

export function UpgradeDialog({ item, onUpgraded, trigger }: UpgradeDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // State для материалов
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [characterSkill, setCharacterSkill] = useState(0);
  
  const currentGrade = (item.grade as EquipmentGrade) ?? 'common';
  const currentGradeIndex = GRADE_ORDER.indexOf(currentGrade);
  const nextGrade = currentGradeIndex < GRADE_ORDER.length - 1 
    ? GRADE_ORDER[currentGradeIndex + 1] 
    : null;
  
  const currentConfig = GRADE_CONFIGS[currentGrade];
  const nextConfig = nextGrade ? GRADE_CONFIGS[nextGrade] : null;
  
  // Получаем требуемые материалы для текущего грейда
  const requiredMaterials = getRequiredMaterialsForUpgrade(currentGrade);
  const requiredSkill = getRequiredSkillForUpgrade(currentGrade);
  
  // Загрузка материалов и навыка при открытии диалога
  useEffect(() => {
    async function checkMaterials() {
      if (!item.characterId || !open) return;
      
      setIsLoadingMaterials(true);
      try {
        // Получаем инвентарь персонажа
        const res = await fetch(`/api/inventory?characterId=${item.characterId}`);
        const data = await res.json();
        
        if (data.success && data.items) {
          // Проверяем наличие каждого материала
          const available: string[] = [];
          for (const matId of requiredMaterials) {
            const hasMaterial = data.items.some(
              (i: any) => i.nameId === matId && i.quantity >= 1
            );
            if (hasMaterial) available.push(matId);
          }
          setAvailableMaterials(available);
        }
        
        // Получаем навык кузнеца персонажа (пока используем базовое значение)
        // TODO: Добавить поле blacksmithSkill в модель персонажа
        const charRes = await fetch(`/api/character/data?characterId=${item.characterId}`);
        const charData = await charRes.json();
        if (charData.success && charData.character) {
          // Используем уровень культивации как базу для навыка (временно)
          const cultivationLevel = charData.character.cultivationLevel || 1;
          setCharacterSkill(Math.floor(cultivationLevel * 5)); // Примерная формула
        }
      } catch (error) {
        console.error('Failed to check materials:', error);
      } finally {
        setIsLoadingMaterials(false);
      }
    }
    
    checkMaterials();
  }, [open, item.characterId, requiredMaterials.join(',')]);
  
  const handleUpgrade = async () => {
    setLoading(true);
    setResult(null);
    
    // Проверяем наличие материалов
    const missing = requiredMaterials.filter(m => !availableMaterials.includes(m));
    if (missing.length > 0) {
      setResult({ 
        success: false, 
        error: `Недостаточно материалов: ${missing.join(', ')}` 
      });
      setLoading(false);
      return;
    }
    
    // Проверяем навык
    if (characterSkill < requiredSkill) {
      setResult({
        success: false,
        error: `Требуется навык кузнеца: ${requiredSkill}. Ваш навык: ${characterSkill}`
      });
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/inventory/upgrade-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: item.characterId,
          itemId: item.id,
          materials: requiredMaterials, // ✅ Реальные материалы
          skill: characterSkill, // ✅ Реальный навык
        }),
      });
      
      const data = await res.json();
      setResult(data);
      
      if (data.success && data.result?.success) {
        setTimeout(() => {
          setOpen(false);
          onUpgraded();
        }, 1500);
      }
    } catch (error) {
      setResult({ success: false, error: 'Ошибка соединения' });
    } finally {
      setLoading(false);
    }
  };
  
  // Максимальный грейд
  if (!nextGrade || !nextConfig) {
    return trigger ?? (
      <Button variant="outline" className="w-full" disabled>
        ★ Максимальный грейд
      </Button>
    );
  }
  
  // damaged нельзя улучшить — сначала ремонт
  if (currentGrade === 'damaged') {
    return (
      <Button variant="outline" className="w-full" disabled>
        ⚠️ Сначала отремонтируйте
      </Button>
    );
  }
  
  // Проверка наличия материалов
  const hasAllMaterials = requiredMaterials.length > 0 && 
    requiredMaterials.every(m => availableMaterials.includes(m));
  const hasEnoughSkill = characterSkill >= requiredSkill;
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="w-full">
            ⬆️ Улучшить грейд
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Улучшение: {item.name}</DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <GradeBadge grade={currentGrade} size="sm" />
            <span>→</span>
            <GradeBadge grade={nextGrade} size="sm" />
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Шанс успеха */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Шанс успеха</span>
              <span className="text-green-400 font-medium">{currentConfig.upgradeChance}%</span>
            </div>
            <Progress 
              value={currentConfig.upgradeChance} 
              className="h-2 [&>div]:bg-green-500" 
            />
          </div>
          
          {/* Риск понижения */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Риск понижения при неудаче</span>
              <span className="text-red-400 font-medium">{currentConfig.downgradeRisk}%</span>
            </div>
            <Progress 
              value={currentConfig.downgradeRisk} 
              className="h-2 [&>div]:bg-red-500" 
            />
          </div>
          
          {/* Разница параметров */}
          <div className="p-3 rounded bg-muted/50 space-y-2">
            <h4 className="font-medium text-sm">Изменение параметров при успехе:</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Урон:</span>
                <span className="text-red-400">
                  ×{currentConfig.damageMultiplier} → ×{nextConfig.damageMultiplier}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Прочность:</span>
                <span className="text-blue-400">
                  ×{currentConfig.durabilityMultiplier} → ×{nextConfig.durabilityMultiplier}
                </span>
              </div>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Бонусы:</span>
              <span className="text-purple-400">
                {currentConfig.bonusCount[0]}-{currentConfig.bonusCount[1]} → {nextConfig.bonusCount[0]}-{nextConfig.bonusCount[1]}
              </span>
            </div>
          </div>
          
          {/* Требуемые материалы */}
          <div className="text-xs space-y-2">
            <div className="font-medium">Требуемые материалы:</div>
            {isLoadingMaterials ? (
              <div className="text-muted-foreground">Загрузка...</div>
            ) : requiredMaterials.length === 0 ? (
              <div className="text-muted-foreground">Не требуются</div>
            ) : (
              <div className="flex flex-wrap gap-1">
                {requiredMaterials.map(matId => (
                  <Badge 
                    key={matId}
                    variant={availableMaterials.includes(matId) ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {matId} {availableMaterials.includes(matId) ? '✓' : '✗'}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Навык кузнеца */}
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Навык кузнеца:</span>
              <span className={hasEnoughSkill ? "text-green-400" : "text-red-400"}>
                {characterSkill} / {requiredSkill} {hasEnoughSkill ? '✓' : '✗'}
              </span>
            </div>
          </div>
          
          {/* Результат */}
          {result && (
            <div className={cn(
              "p-3 rounded text-sm",
              result.success && result.result?.success
                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                : result.success && !result.result?.success
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}>
              {result.success ? (
                <>
                  <div className="font-medium">{result.result?.message}</div>
                  {result.result?.didChange && (
                    <div className="text-xs mt-1 opacity-80">
                      {result.result?.previousGrade} → {result.result?.newGrade}
                    </div>
                  )}
                </>
              ) : (
                result.error
              )}
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            onClick={handleUpgrade} 
            disabled={loading || isLoadingMaterials || !hasAllMaterials || !hasEnoughSkill}
            variant={currentConfig.downgradeRisk > 20 ? "destructive" : "default"}
          >
            {loading ? 'Улучшение...' : 'Попробовать улучшить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
