/**
 * BodyDoll - Кукла тела из изображений
 * 
 * Использует PNG изображения частей тела:
 * - Голова, Торс, Руки (левая/правая), Ноги (левая/правая)
 * - HP бары на каждой части
 * - Коричневый цвет для отрубленных (CSS filter)
 */

'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { BodyStructure, BodyPart, LimbStatus } from '@/types/body';

interface BodyDollProps {
  bodyState: BodyStructure | null;
  onPartClick?: (partId: string) => void;
  selectedPartId?: string | null;
}

// ==================== КОНСТАНТЫ ====================

// Размеры контейнера куклы
const DOLL_WIDTH = 400;
const DOLL_HEIGHT = 500;

// Конфигурация частей тела (настроено через редактор)
const BODY_PARTS_CONFIG = {
  head: {
    image: '/images/body/head.png',
    naturalWidth: 32,
    naturalHeight: 39,
    position: { top: 107, left: 206 },
    scale: 1,
    hpBar: { x: 2, y: 15, width: 28 },
  },
  torso: {
    image: '/images/body/torso.png',
    naturalWidth: 96,
    naturalHeight: 174,
    position: { top: 153, left: 175 },
    scale: 1,
    hpBar: { x: 20, y: 50, width: 56 },
  },
  armLeft: {
    image: '/images/body/arm-left.png',
    naturalWidth: 32,
    naturalHeight: 105,
    position: { top: 199, left: 263 },
    scale: 1,
    hpBar: { x: 2, y: 30, width: 28 },
  },
  armRight: {
    image: '/images/body/arm-right.png',
    naturalWidth: 32,
    naturalHeight: 101,
    position: { top: 193, left: 147 },
    scale: 1,
    hpBar: { x: 2, y: 30, width: 28 },
  },
  legLeft: {
    image: '/images/body/leg-left.png',
    naturalWidth: 32,
    naturalHeight: 138,
    position: { top: 331, left: 235 },
    scale: 1,
    hpBar: { x: 2, y: 40, width: 28 },
  },
  legRight: {
    image: '/images/body/leg-right.png',
    naturalWidth: 32,
    naturalHeight: 138,
    position: { top: 331, left: 185 },
    scale: 1,
    hpBar: { x: 2, y: 40, width: 28 },
  },
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function getHPPercent(part: BodyPart): { functional: number; structural: number } {
  const functional = part.hp.functional.max > 0
    ? (part.hp.functional.current / part.hp.functional.max) * 100
    : 0;
  const structural = part.hp.structural.max > 0
    ? (part.hp.structural.current / part.hp.structural.max) * 100
    : 100;
  return { functional, structural };
}

// ==================== КОМПОНЕНТ HP БАРА ====================

interface HPBarProps {
  part: BodyPart;
  x: number;
  y: number;
  width: number;
}

function HPBar({ part, x, y, width }: HPBarProps) {
  const { functional, structural } = getHPPercent(part);
  const isSevered = part.status === 'severed';
  const isHeart = part.type === 'heart';
  
  if (isSevered) return null;
  
  return (
    <div 
      className="absolute pointer-events-none"
      style={{ left: x, top: y, width }}
    >
      {/* Функциональная HP */}
      <div className="h-1 rounded-sm bg-gray-800/80 mb-0.5 relative overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 bg-red-600 rounded-sm transition-all duration-300"
          style={{ width: `${functional}%` }}
        />
      </div>
      
      {/* Структурная HP (не показываем для сердца) */}
      {!isHeart && (
        <div className="h-1 rounded-sm bg-gray-800/80 relative overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-gray-400 rounded-sm transition-all duration-300"
            style={{ width: `${structural}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ==================== КОМПОНЕНТ ЧАСТИ ТЕЛА ====================

interface BodyPartImageProps {
  partId: string;
  part: BodyPart | undefined;
  config: typeof BODY_PARTS_CONFIG[keyof BODY_PARTS_CONFIG];
  onClick?: () => void;
  isSelected?: boolean;
  onHover?: (part: BodyPart | null) => void;
}

function BodyPartImage({ partId, part, config, onClick, isSelected, onHover }: BodyPartImageProps) {
  const isSevered = part?.status === 'severed';
  
  const width = config.naturalWidth * config.scale;
  const height = config.naturalHeight * config.scale;
  
  // Фильтр для отрубленных частей (коричневый)
  const filterStyle = isSevered 
    ? 'sepia(100%) saturate(400%) hue-rotate(15deg) brightness(0.6)'
    : 'none';
  
  return (
    <div
      className={`absolute cursor-pointer transition-all duration-200 ${
        isSelected ? 'z-10' : ''
      }`}
      style={{
        top: config.position.top,
        left: config.position.left,
        width,
        height,
        opacity: isSevered ? 0.5 : 1,
        filter: filterStyle,
      }}
      onClick={onClick}
      onMouseEnter={() => part && onHover?.(part)}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* Изображение части */}
      <Image
        src={config.image}
        alt={partId}
        width={width}
        height={height}
        className={`transition-all duration-200 ${isSelected ? 'ring-2 ring-amber-400 rounded' : ''}`}
        style={{ objectFit: 'contain' }}
      />
      
      {/* HP бар */}
      {part && !isSevered && (
        <HPBar
          part={part}
          x={config.hpBar.x}
          y={config.hpBar.y}
          width={config.hpBar.width}
        />
      )}
      
      {/* Индикатор отрубания */}
      {isSevered && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-red-500 text-lg font-bold bg-black/60 rounded-full w-6 h-6 flex items-center justify-center">
            ✕
          </span>
        </div>
      )}
    </div>
  );
}

// ==================== HP ТУЛТИП ====================

interface HPTooltipProps {
  part: BodyPart;
  position: { x: number; y: number };
}

function HPTooltip({ part, position }: HPTooltipProps) {
  const { functional, structural } = getHPPercent(part);
  const isHeart = part.type === 'heart';
  
  const getStatusText = (status: LimbStatus): string => {
    switch (status) {
      case 'healthy': return 'Здорова';
      case 'damaged': return 'Повреждена';
      case 'crippled': return 'Изуродована';
      case 'paralyzed': return 'Парализована';
      case 'critical': return 'Критическое';
      case 'severed': return 'ОТРУБЛЕНА';
      default: return 'Неизвестно';
    }
  };
  
  const getStatusColor = (status: LimbStatus): string => {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'damaged': return 'text-yellow-400';
      case 'crippled': return 'text-orange-400';
      case 'paralyzed': return 'text-red-400';
      case 'critical': return 'text-red-500';
      case 'severed': return 'text-gray-400';
      default: return 'text-slate-400';
    }
  };
  
  return (
    <div 
      className="fixed z-50 bg-slate-900 border border-slate-600 rounded-lg p-3 shadow-xl pointer-events-none min-w-[180px]"
      style={{ left: position.x + 15, top: position.y + 10 }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <span className="text-sm font-medium text-white">{part.name}</span>
        <span className={`text-xs font-medium ${getStatusColor(part.status)}`}>
          {getStatusText(part.status)}
        </span>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-red-400 w-14">Функция</span>
          <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-red-600" style={{ width: `${functional}%` }} />
          </div>
          <span className="text-xs text-slate-400 w-12 text-right">
            {part.hp.functional.current}/{part.hp.functional.max}
          </span>
        </div>
        
        {!isHeart && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 w-14">Структура</span>
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gray-500" style={{ width: `${structural}%` }} />
            </div>
            <span className="text-xs text-slate-400 w-12 text-right">
              {part.hp.structural.current}/{part.hp.structural.max}
            </span>
          </div>
        )}
      </div>
      
      <div className="text-xs text-slate-500 mt-2">Эффективность: {part.efficiency}%</div>
    </div>
  );
}

// ==================== ГЛАВНЫЙ КОМПОНЕНТ ====================

export function BodyDoll({ bodyState, onPartClick, selectedPartId }: BodyDollProps) {
  const [hoveredPart, setHoveredPart] = useState<BodyPart | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  const getPart = (id: string): BodyPart | undefined => bodyState?.parts.get(id);
  
  const handleMouseEnter = (e: React.MouseEvent, part: BodyPart) => {
    setHoveredPart(part);
    setTooltipPosition({ x: e.clientX, y: e.clientY });
  };
  
  // Маппинг ID частей к конфигу
  const partMappings = [
    { id: 'head', config: BODY_PARTS_CONFIG.head },
    { id: 'torso', config: BODY_PARTS_CONFIG.torso },
    { id: 'left_arm', config: BODY_PARTS_CONFIG.armLeft },
    { id: 'right_arm', config: BODY_PARTS_CONFIG.armRight },
    { id: 'left_leg', config: BODY_PARTS_CONFIG.legLeft },
    { id: 'right_leg', config: BODY_PARTS_CONFIG.legRight },
  ];
  
  return (
    <div 
      className="relative flex items-center justify-center w-full h-full bg-slate-800/50 rounded-lg"
      onMouseMove={(e) => {
        if (hoveredPart) {
          setTooltipPosition({ x: e.clientX, y: e.clientY });
        }
      }}
      onMouseLeave={() => setHoveredPart(null)}
    >
      {/* Контейнер куклы */}
      <div 
        className="relative"
        style={{ width: DOLL_WIDTH, height: DOLL_HEIGHT }}
      >
        {/* Части тела */}
        {partMappings.map(({ id, config }) => {
          const part = getPart(id);
          return (
            <BodyPartImage
              key={id}
              partId={id}
              part={part}
              config={config}
              onClick={() => onPartClick?.(id)}
              isSelected={selectedPartId === id}
              onHover={(p) => {
                if (p) {
                  const rect = document.activeElement?.getBoundingClientRect();
                  handleMouseEnter({ clientX: tooltipPosition.x || 0, clientY: tooltipPosition.y || 0 } as React.MouseEvent, p);
                }
              }}
            />
          );
        })}
        
        {/* Сердце (индикатор внутри торса) */}
        {bodyState?.heart && (
          <div
            className="absolute cursor-pointer"
            style={{ top: 200, left: 205 }}
            onClick={() => onPartClick?.('heart')}
            onMouseEnter={(e) => {
              const heartPart: BodyPart = {
                id: 'heart',
                name: 'Сердце',
                type: 'heart',
                status: 'healthy',
                hp: {
                  functional: { max: bodyState.heart.hp.max, current: bodyState.heart.hp.current },
                  structural: { max: 0, current: 0 }
                },
                functions: ['circulation'],
                efficiency: bodyState.heart.efficiency,
                armor: 0,
                damageThreshold: 0,
                hitboxRadius: 0.02,
              };
              handleMouseEnter(e, heartPart);
            }}
          >
            <div 
              className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                selectedPartId === 'heart' ? 'ring-2 ring-amber-400' : ''
              }`}
              style={{ backgroundColor: bodyState.heart.hp.current > 40 ? 'rgba(127, 29, 29, 0.8)' : 'rgba(69, 10, 10, 0.9)' }}
            >
              <span className="text-sm">❤️</span>
            </div>
          </div>
        )}
      </div>
      
      {/* HP Tooltip */}
      {hoveredPart && <HPTooltip part={hoveredPart} position={tooltipPosition} />}
      
      {/* Легенда */}
      <div className="absolute bottom-2 left-2 right-2 bg-slate-900/80 rounded-lg p-2">
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-4 h-1.5 bg-red-600 rounded-sm" />
            <span className="text-slate-400">Функция</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-1.5 bg-gray-400 rounded-sm" />
            <span className="text-slate-400">Структура</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-4 h-3 rounded bg-amber-800 opacity-60" />
            <span className="text-slate-400">Отрублена</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BodyDoll;
