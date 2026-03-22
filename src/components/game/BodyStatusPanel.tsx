/**
 * Body Status Panel Component
 * 
 * Отображение состояния тела персонажа:
 * - Двойная HP полоска для каждой части тела
 * - Состояние сердца
 * - Активные кровотечения
 * - Процессы приживления
 */

'use client';

import { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type {
  BodyStructure,
  BodyPart,
  LimbStatus,
  BleedingType,
} from '@/types/body';
import type { BodyMaterial } from '@/types/entity-types';
import { BODY_MATERIAL_CONFIG } from '@/types/entity-types';

interface BodyStatusPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bodyState?: BodyStructure | null;
  /** Материал тела персонажа (по умолчанию organic для игроков) */
  material?: BodyMaterial;
}

// ==================== КОНСТАНТЫ МАТЕРИАЛОВ ====================

const MATERIAL_NAMES: Record<BodyMaterial, string> = {
  organic: '🥩 Органика',
  scaled: '🐉 Чешуя',
  chitin: '🪲 Хитин',
  ethereal: '👻 Эфир',
  mineral: '🪨 Минерал',
  chaos: '🌀 Хаос',
  construct: '⚙️ Конструкт',
};

const MATERIAL_COLORS: Record<BodyMaterial, string> = {
  organic: 'text-red-400 border-red-400',
  scaled: 'text-green-400 border-green-400',
  chitin: 'text-amber-400 border-amber-400',
  ethereal: 'text-purple-400 border-purple-400',
  mineral: 'text-slate-400 border-slate-400',
  chaos: 'text-pink-400 border-pink-400',
  construct: 'text-cyan-400 border-cyan-400',
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

/**
 * Цвет статуса конечности
 */
function getStatusColor(status: LimbStatus): string {
  switch (status) {
    case 'healthy': return 'text-green-400';
    case 'damaged': return 'text-yellow-400';
    case 'crippled': return 'text-orange-400';
    case 'paralyzed': return 'text-red-400';
    case 'critical': return 'text-red-500 animate-pulse';
    case 'severed': return 'text-gray-500';
    default: return 'text-slate-400';
  }
}

/**
 * Текст статуса конечности
 */
function getStatusText(status: LimbStatus): string {
  switch (status) {
    case 'healthy': return 'Здорова';
    case 'damaged': return 'Повреждена';
    case 'crippled': return 'Изуродована';
    case 'paralyzed': return 'Парализована';
    case 'critical': return 'Критическое';
    case 'severed': return 'ОТРУБЛЕНА';
    default: return 'Неизвестно';
  }
}

/**
 * Цвет кровотечения
 */
function getBleedingColor(type: BleedingType): string {
  switch (type) {
    case 'minor': return 'text-yellow-400';
    case 'moderate': return 'text-orange-400';
    case 'severe': return 'text-red-400';
    case 'critical': return 'text-red-500';
    case 'arterial': return 'text-red-600 animate-pulse';
    default: return 'text-slate-400';
  }
}

/**
 * Иконка части тела
 */
function getPartIcon(type: string): string {
  const icons: Record<string, string> = {
    head: '🗣️',
    torso: '👕',
    heart: '❤️',
    arm: '💪',
    hand: '✋',
    leg: '🦵',
    foot: '🦶',
    eye: '👁️',
    ear: '👂',
    wing: '🪽',
    tail: '🐉',
    horn: '🦬',
    claw: '🦀',
    fang: '🦷',
    tentacle: '🦑',
    pincer: '🦞',
    special: '⭐',
  };
  return icons[type] || '🫀';
}

// ==================== КОМПОНЕНТЫ ====================

/**
 * HP полоска конечности (двойная)
 */
function LimbHPBar({ part }: { part: BodyPart }) {
  const functionalPercent = part.hp.functional.max > 0
    ? (part.hp.functional.current / part.hp.functional.max) * 100
    : 0;
  
  const structuralPercent = part.hp.structural.max > 0
    ? (part.hp.structural.current / part.hp.structural.max) * 100
    : 100;
  
  const isSevered = part.status === 'severed';
  const isHeart = part.type === 'heart';
  
  return (
    <div className="space-y-1">
      {/* Функциональная HP (красная) */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-red-400 w-16">Функция</span>
        <div className="flex-1 relative h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 to-red-400 transition-all duration-300"
            style={{ width: `${functionalPercent}%` }}
          />
        </div>
        <span className="text-xs text-slate-400 w-16 text-right">
          {part.hp.functional.current}/{part.hp.functional.max}
        </span>
      </div>
      
      {/* Структурная HP (чёрная) - только если не сердце */}
      {!isHeart && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-16">Структура</span>
          <div className="flex-1 relative h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-gray-700 to-gray-500 transition-all duration-300"
              style={{ width: `${structuralPercent}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 w-16 text-right">
            {isSevered ? '—' : `${part.hp.structural.current}/${part.hp.structural.max}`}
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Карточка части тела
 */
function BodyPartCard({ part }: { part: BodyPart }) {
  const statusColor = getStatusColor(part.status);
  const statusText = getStatusText(part.status);
  const icon = getPartIcon(part.type);
  
  return (
    <div className={`bg-slate-700/50 rounded-lg p-3 ${part.status === 'severed' ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{icon}</span>
          <span className="font-medium text-white">{part.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {part.attachment && (
            <Badge variant="outline" className="text-purple-400 border-purple-400 text-xs">
              Приживлённая
            </Badge>
          )}
          <span className={`text-sm font-medium ${statusColor}`}>
            {statusText}
          </span>
        </div>
      </div>
      
      {part.status !== 'severed' && (
        <LimbHPBar part={part} />
      )}
      
      {/* Эффективность */}
      {part.status !== 'severed' && part.efficiency < 100 && (
        <div className="mt-2 text-xs text-slate-500">
          Эффективность: {part.efficiency}%
        </div>
      )}
    </div>
  );
}

/**
 * Панель сердца
 */
function HeartPanel({ heart }: { heart: BodyStructure['heart'] }) {
  const hpPercent = (heart.hp.current / heart.hp.max) * 100;
  
  let statusText = 'Норма';
  let statusColor = 'text-green-400';
  
  if (hpPercent < 25) {
    statusText = 'Критическое';
    statusColor = 'text-red-500 animate-pulse';
  } else if (hpPercent < 50) {
    statusText = 'Ослаблено';
    statusColor = 'text-orange-400';
  }
  
  return (
    <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">❤️</span>
          <span className="font-bold text-white">Сердце</span>
        </div>
        <span className={`text-sm font-medium ${statusColor}`}>
          {statusText}
        </span>
      </div>
      
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-400 w-16">HP</span>
          <div className="flex-1 relative h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-700 to-red-500 transition-all duration-300"
              style={{ width: `${hpPercent}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 w-16 text-right">
            {heart.hp.current}/{heart.hp.max}
          </span>
        </div>
        
        {heart.vulnerable && (
          <div className="text-xs text-red-400 animate-pulse">
            ⚠️ Сердце уязвимо для атаки!
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Панель кровотечений
 */
function BleedingPanel({ bleeds }: { bleeds: BodyStructure['activeBleeds'] }) {
  if (bleeds.length === 0) {
    return (
      <div className="bg-slate-700/30 rounded-lg p-3 text-center text-slate-500 text-sm">
        Нет активных кровотечений
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {bleeds.map(bleed => (
        <div key={bleed.id} className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🩸</span>
              <span className={`font-medium ${getBleedingColor(bleed.type)}`}>
                {bleed.type === 'minor' && 'Лёгкое'}
                {bleed.type === 'moderate' && 'Умеренное'}
                {bleed.type === 'severe' && 'Сильное'}
                {bleed.type === 'critical' && 'Критическое'}
                {bleed.type === 'arterial' && 'АРТЕРИАЛЬНОЕ'}
              </span>
            </div>
            <span className="text-xs text-red-400">
              {bleed.damagePerTick.toFixed(1)} урона/тик
            </span>
          </div>
          {bleed.remainingDuration > 0 && (
            <div className="text-xs text-slate-500 mt-1">
              Осталось: {bleed.remainingDuration} тиков
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * Панель приживления
 */
function AttachmentPanel({ attachments }: { attachments: BodyStructure['activeAttachments'] }) {
  if (attachments.length === 0) {
    return null;
  }
  
  return (
    <div className="space-y-2">
      {attachments.map(attach => (
        <div key={attach.id} className="bg-purple-900/20 border border-purple-600/30 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-purple-300">
              🔄 Приживление: {attach.partId}
            </span>
            <span className="text-xs text-purple-400">
              {attach.progress.toFixed(0)}%
            </span>
          </div>
          <Progress value={attach.progress} className="h-2" />
          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>Этап: {attach.stage}</span>
            <span>Расход Ци: {attach.qiDrainPerTick}/тик</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function BodyStatusPanel({ open, onOpenChange, bodyState, material = 'organic' }: BodyStatusPanelProps) {
  // Группировка частей тела по позиции
  const bodyParts = useMemo(() => {
    if (!bodyState) return { upper: [], lower: [], severed: [] };
    
    const upper: BodyPart[] = [];
    const lower: BodyPart[] = [];
    const severed: BodyPart[] = [];
    
    bodyState.parts.forEach(part => {
      if (part.status === 'severed') {
        severed.push(part);
      } else if (['head', 'torso', 'arm', 'hand', 'eye', 'ear'].includes(part.type)) {
        upper.push(part);
      } else {
        lower.push(part);
      }
    });
    
    return { upper, lower, severed };
  }, [bodyState]);
  
  const hasBleeds = bodyState?.activeBleeds && bodyState.activeBleeds.length > 0;
  const hasAttachments = bodyState?.activeAttachments && bodyState.activeAttachments.length > 0;
  
  // Конфигурация материала
  const materialConfig = BODY_MATERIAL_CONFIG[material];
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-amber-400 flex items-center gap-2">
            🦴 Состояние тела
            {bodyState?.isDead && (
              <Badge className="bg-red-600 text-white ml-2">МЁРТВ</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(85vh-120px)]">
          <div className="space-y-4 pr-4">
            {/* Материал тела */}
            <div className="bg-slate-700/30 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-slate-400">Материал тела:</span>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={MATERIAL_COLORS[material]}>
                  {MATERIAL_NAMES[material]}
                </Badge>
                {materialConfig.damageReduction > 0 && (
                  <span className="text-xs text-green-400">
                    -{materialConfig.damageReduction}% урон
                  </span>
                )}
              </div>
            </div>
            
            {/* Сердце */}
            {bodyState?.heart && (
              <HeartPanel heart={bodyState.heart} />
            )}
            
            {/* Кровотечения */}
            {hasBleeds && (
              <div>
                <h3 className="text-sm font-medium text-red-400 mb-2">🩸 Кровотечения</h3>
                <BleedingPanel bleeds={bodyState.activeBleeds} />
              </div>
            )}
            
            {/* Приживления */}
            {hasAttachments && (
              <div>
                <h3 className="text-sm font-medium text-purple-400 mb-2">🔄 Приживления</h3>
                <AttachmentPanel attachments={bodyState.activeAttachments} />
              </div>
            )}
            
            <Separator className="bg-slate-600" />
            
            {/* Верхняя часть тела */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Верхняя часть</h3>
              <div className="grid grid-cols-2 gap-2">
                {bodyParts.upper.map(part => (
                  <BodyPartCard key={part.id} part={part} />
                ))}
              </div>
            </div>
            
            {/* Нижняя часть тела */}
            <div>
              <h3 className="text-sm font-medium text-slate-400 mb-2">Нижняя часть</h3>
              <div className="grid grid-cols-2 gap-2">
                {bodyParts.lower.map(part => (
                  <BodyPartCard key={part.id} part={part} />
                ))}
              </div>
            </div>
            
            {/* Отрубленные части */}
            {bodyParts.severed.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Отрубленные части</h3>
                <div className="grid grid-cols-2 gap-2">
                  {bodyParts.severed.map(part => (
                    <BodyPartCard key={part.id} part={part} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Легенда */}
            <div className="bg-slate-700/30 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-2">Легенда:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span className="text-red-400">Функциональная HP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-600 rounded" />
                  <span className="text-gray-400">Структурная HP</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export default BodyStatusPanel;
