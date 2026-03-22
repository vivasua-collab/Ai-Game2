/**
 * RepairDialog - Диалог ремонта экипировки
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { InventoryItem } from '@prisma/client';
import { RepairMethod } from '@/types/equipment-v2';
import { REPAIR_METHODS } from '@/lib/game/repair-system';

interface RepairDialogProps {
  item: InventoryItem;
  onRepaired: () => void;
  trigger?: React.ReactNode;
}

export function RepairDialog({ item, onRepaired, trigger }: RepairDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<RepairMethod>('field_repair');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // ✅ S1-4: State для материалов и навыка
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);
  const [isLoadingMaterials, setIsLoadingMaterials] = useState(true);
  const [characterSkill, setCharacterSkill] = useState(0);
  const [spiritStones, setSpiritStones] = useState(0);
  
  const config = REPAIR_METHODS[selectedMethod];
  const currentDurability = item.durabilityCurrent ?? item.durability ?? 100;
  const maxDurability = item.durabilityMax ?? item.maxDurability ?? 100;
  
  // ✅ S1-4: Загрузка материалов и навыка при открытии диалога
  useEffect(() => {
    async function checkResources() {
      if (!item.characterId || !open) return;
      
      setIsLoadingMaterials(true);
      try {
        // Получаем инвентарь персонажа
        const res = await fetch(`/api/inventory?characterId=${item.characterId}`);
        const data = await res.json();
        
        if (data.success && data.items) {
          // Собираем все доступные материалы
          const available: string[] = [];
          for (const matId of config.materialCost) {
            const hasMaterial = data.items.some(
              (i: any) => i.nameId === matId && i.quantity >= 1
            );
            if (hasMaterial) available.push(matId);
          }
          setAvailableMaterials(available);
        }
        
        // Получаем данные персонажа
        const charRes = await fetch(`/api/character/data?characterId=${item.characterId}`);
        const charData = await charRes.json();
        if (charData.success && charData.character) {
          const cultivationLevel = charData.character.cultivationLevel || 1;
          setCharacterSkill(Math.floor(cultivationLevel * 5)); // Примерная формула
          setSpiritStones(charData.character.spiritStones || 0);
        }
      } catch (error) {
        console.error('Failed to check resources:', error);
      } finally {
        setIsLoadingMaterials(false);
      }
    }
    
    checkResources();
  }, [open, item.characterId, config.materialCost.join(',')]);
  
  const handleRepair = async () => {
    setLoading(true);
    setResult(null);
    
    // ✅ S1-4: Проверяем наличие материалов
    const missing = config.materialCost.filter(m => !availableMaterials.includes(m));
    if (missing.length > 0) {
      setResult({ 
        success: false, 
        error: `Недостаточно материалов: ${missing.join(', ')}` 
      });
      setLoading(false);
      return;
    }
    
    // Проверяем золото/дух камни
    if (config.goldCost > spiritStones) {
      setResult({
        success: false,
        error: `Недостаточно дух камней: нужно ${config.goldCost}, есть ${spiritStones}`
      });
      setLoading(false);
      return;
    }
    
    // Проверяем навык
    if (characterSkill < config.skillRequired) {
      setResult({
        success: false,
        error: `Требуется навык кузнеца: ${config.skillRequired}. Ваш навык: ${characterSkill}`
      });
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/inventory/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: item.characterId,
          itemId: item.id,
          method: selectedMethod,
          materials: config.materialCost, // ✅ Реальные материалы
          skill: characterSkill, // ✅ Реальный навык
        }),
      });
      
      const data = await res.json();
      setResult(data);
      
      if (data.success) {
        setTimeout(() => {
          setOpen(false);
          onRepaired();
        }, 1500);
      }
    } catch (error) {
      setResult({ success: false, error: 'Ошибка соединения' });
    } finally {
      setLoading(false);
    }
  };
  
  // Если предмет не требует ремонта
  const needsRepair = currentDurability < maxDurability;
  
  // ✅ S1-4: Проверка доступности метода
  const hasAllMaterials = config.materialCost.length === 0 || 
    config.materialCost.every(m => availableMaterials.includes(m));
  const hasEnoughSkill = characterSkill >= config.skillRequired;
  const hasEnoughGold = spiritStones >= config.goldCost;
  const canRepairThis = hasAllMaterials && hasEnoughSkill && hasEnoughGold;
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="w-full" disabled={!needsRepair}>
            🔧 Ремонт
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ремонт: {item.name}</DialogTitle>
          <DialogDescription>
            Выберите метод ремонта. Каждый метод имеет разное качество и риск понижения грейда.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Текущая прочность */}
          <div className="p-3 rounded bg-muted/50">
            <div className="flex justify-between text-sm mb-2">
              <span>Текущая прочность</span>
              <span className="font-medium">{currentDurability}/{maxDurability}</span>
            </div>
            <Progress value={(currentDurability / maxDurability) * 100} className="h-2" />
          </div>
          
          {/* Выбор метода */}
          <RadioGroup 
            value={selectedMethod} 
            onValueChange={(v) => setSelectedMethod(v as RepairMethod)}
            className="space-y-2"
          >
            {Object.entries(REPAIR_METHODS).map(([id, method]) => (
              <div 
                key={id} 
                className={cn(
                  "flex items-start space-x-3 p-3 rounded border cursor-pointer transition-colors",
                  selectedMethod === id && "border-primary bg-primary/5"
                )}
                onClick={() => setSelectedMethod(id as RepairMethod)}
              >
                <RadioGroupItem value={id} id={id} className="mt-1" />
                <div className="flex-1 space-y-1">
                  <Label htmlFor={id} className="font-medium cursor-pointer">
                    {method.name}
                  </Label>
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">+{method.durabilityRestore}%</Badge>
                    <Badge variant="secondary">Качество: {method.quality}%</Badge>
                    <Badge variant="destructive" className={cn(method.downgradeRisk < 10 && "opacity-50")}>
                      Риск: {method.downgradeRisk}%
                    </Badge>
                  </div>
                  <div className="text-xs text-amber-400">
                    💰 {method.goldCost} | Материалы: {method.materialCost.join(', ') || 'нет'}
                  </div>
                </div>
              </div>
            ))}
          </RadioGroup>
          
          {/* ✅ S1-4: Информация о ресурсах */}
          {isLoadingMaterials ? (
            <div className="text-xs text-muted-foreground">Загрузка ресурсов...</div>
          ) : (
            <div className="text-xs space-y-1 p-2 rounded bg-muted/30">
              <div className="font-medium">Ваши ресурсы:</div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Дух камни:</span>
                <span className={hasEnoughGold ? "text-green-400" : "text-red-400"}>
                  {spiritStones} / {config.goldCost} {hasEnoughGold ? '✓' : '✗'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Навык кузнеца:</span>
                <span className={hasEnoughSkill ? "text-green-400" : "text-red-400"}>
                  {characterSkill} / {config.skillRequired} {hasEnoughSkill ? '✓' : '✗'}
                </span>
              </div>
              {config.materialCost.length > 0 && (
                <div className="mt-1">
                  <span className="text-muted-foreground">Материалы:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {config.materialCost.map(matId => (
                      <Badge 
                        key={matId}
                        variant={availableMaterials.includes(matId) ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {matId} {availableMaterials.includes(matId) ? '✓' : '✗'}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Результат */}
          {result && (
            <div className={cn(
              "p-3 rounded text-sm",
              result.success 
                ? "bg-green-500/10 text-green-400 border border-green-500/20" 
                : "bg-red-500/10 text-red-400 border border-red-500/20"
            )}>
              {result.success ? (
                <>
                  <div className="font-medium">{result.result?.message}</div>
                  <div className="text-xs mt-1 opacity-80">
                    Качество: {result.result?.quality}% | 
                    Восстановлено: {result.result?.durabilityRestored}
                  </div>
                  {result.result?.didDowngrade && (
                    <div className="text-red-400 font-medium mt-2">
                      ⚠️ Грейд понижен!
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
            onClick={handleRepair} 
            disabled={loading || !needsRepair || isLoadingMaterials || !canRepairThis}
            variant={config.downgradeRisk > 20 ? "destructive" : "default"}
          >
            {loading ? 'Ремонт...' : `Ремонт за ${config.goldCost} 💰`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
