/**
 * BodyDoll - Схематичная кукла тела (SVG)
 * 
 * Простое SVG отображение с:
 * - Схематичным силуэтом человека
 * - HP барами на каждой части
 * - Подсветкой при выборе
 * - Коричневым цветом для отрубленных
 * 
 * Масштаб: увеличен на 20% от исходного размера
 */

'use client';

import { useState } from 'react';
import type { BodyStructure, BodyPart, LimbStatus } from '@/types/body';

interface BodyDollProps {
  bodyState: BodyStructure | null;
  onPartClick?: (partId: string) => void;
  selectedPartId?: string | null;
}

// Размеры куклы (увеличены на 20%: было 180x320, стало 216x384)
const DOLL_WIDTH = 216;
const DOLL_HEIGHT = 384;

// Конфигурация частей тела для SVG (координаты увеличены на 20%)
const BODY_PARTS = {
  // Голова
  head: {
    name: 'Голова',
    path: 'M84,10 L132,10 Q144,10 144,22 L144,46 Q144,60 132,60 L84,60 Q72,60 72,46 L72,22 Q72,10 84,10',
    center: { x: 108, y: 35 },
    hpOffset: { x: 82, y: 22 },
    hpWidth: 53,
  },
  // Торс
  torso: {
    name: 'Торс',
    path: 'M66,66 L150,66 L156,156 L144,174 L108,180 L72,174 L60,156 Z',
    center: { x: 108, y: 120 },
    hpOffset: { x: 74, y: 102 },
    hpWidth: 67,
  },
  // Левая рука
  leftArm: {
    name: 'Левая рука',
    path: 'M60,70 L34,74 L22,126 L14,174 L30,178 L42,132 L54,84 L60,114 L60,70',
    center: { x: 36, y: 120 },
    hpOffset: { x: 17, y: 108 },
    hpWidth: 29,
  },
  // Правая рука
  rightArm: {
    name: 'Правая рука',
    path: 'M156,70 L182,74 L194,126 L202,174 L186,178 L174,132 L162,84 L156,114 L156,70',
    center: { x: 180, y: 120 },
    hpOffset: { x: 170, y: 108 },
    hpWidth: 29,
  },
  // Левая ладонь
  leftHand: {
    name: 'Левая кисть',
    path: 'M12,180 Q6,180 6,190 L6,214 Q6,223 14,223 L26,223 Q36,223 36,214 L36,190 Q36,180 30,180 Z',
    center: { x: 20, y: 202 },
    hpOffset: { x: 10, y: 186 },
    hpWidth: 22,
  },
  // Правая ладонь
  rightHand: {
    name: 'Правая кисть',
    path: 'M186,180 Q180,180 180,190 L180,214 Q180,223 190,223 L202,223 Q210,223 210,214 L210,190 Q210,180 204,180 Z',
    center: { x: 194, y: 202 },
    hpOffset: { x: 182, y: 186 },
    hpWidth: 22,
  },
  // Левая нога
  leftLeg: {
    name: 'Левая нога',
    path: 'M74,178 L86,180 L82,246 L74,306 L60,306 L67,246 L67,180 Z',
    center: { x: 73, y: 240 },
    hpOffset: { x: 58, y: 222 },
    hpWidth: 26,
  },
  // Правая нога
  rightLeg: {
    name: 'Правая нога',
    path: 'M142,178 L130,180 L134,246 L142,306 L156,306 L149,246 L149,180 Z',
    center: { x: 143, y: 240 },
    hpOffset: { x: 130, y: 222 },
    hpWidth: 26,
  },
  // Левая ступня
  leftFoot: {
    name: 'Левая стопа',
    path: 'M54,312 Q48,312 48,322 L48,342 Q48,354 60,354 L82,354 Q90,354 90,346 L90,324 Q90,312 82,312 Z',
    center: { x: 68, y: 334 },
    hpOffset: { x: 53, y: 318 },
    hpWidth: 24,
  },
  // Правая ступня
  rightFoot: {
    name: 'Правая стопа',
    path: 'M134,312 Q126,312 126,324 L126,346 Q126,354 134,354 L156,354 Q168,354 168,342 L168,322 Q168,312 162,312 Z',
    center: { x: 148, y: 334 },
    hpOffset: { x: 134, y: 318 },
    hpWidth: 24,
  },
};

// Маппинг ID
const PART_MAPPING: Record<string, keyof typeof BODY_PARTS> = {
  head: 'head',
  torso: 'torso',
  left_arm: 'leftArm',
  right_arm: 'rightArm',
  left_hand: 'leftHand',
  right_hand: 'rightHand',
  left_leg: 'leftLeg',
  right_leg: 'rightLeg',
  left_foot: 'leftFoot',
  right_foot: 'rightFoot',
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

function getStatusColor(status: LimbStatus): string {
  switch (status) {
    case 'healthy': return '#22c55e';
    case 'damaged': return '#eab308';
    case 'crippled': return '#f97316';
    case 'paralyzed': return '#ef4444';
    case 'critical': return '#dc2626';
    case 'severed': return '#78350f';
    default: return '#64748b';
  }
}

// ==================== КОМПОНЕНТ ====================

export function BodyDoll({ bodyState, onPartClick, selectedPartId }: BodyDollProps) {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  const getPart = (id: string): BodyPart | undefined => bodyState?.parts.get(id);

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      <svg
        viewBox="0 0 216 384"
        className="w-full h-full max-w-[216px]"
        style={{ maxHeight: DOLL_HEIGHT }}
      >
        {/* Фон */}
        <rect x="0" y="0" width="216" height="384" fill="#1e293b" rx="10" />

        {/* Части тела */}
        {Object.entries(BODY_PARTS).map(([key, config]) => {
          const partId = Object.entries(PART_MAPPING).find(([, v]) => v === key)?.[0] || key;
          const part = getPart(partId);
          const isSevered = part?.status === 'severed';
          const isSelected = selectedPartId === partId;
          const isHovered = hoveredPart === partId;

          let fillColor = '#1f2937';
          let strokeColor = '#475569';

          if (isSevered) {
            fillColor = '#78350f';
            strokeColor = '#92400e';
          } else if (part) {
            strokeColor = getStatusColor(part.status);
            if (isSelected) {
              fillColor = '#374151';
            }
          }

          return (
            <g key={key}>
              {/* Часть тела */}
              <path
                d={config.path}
                fill={fillColor}
                stroke={isSelected ? '#f59e0b' : isHovered ? '#94a3b8' : strokeColor}
                strokeWidth={isSelected ? 3 : isHovered ? 2.4 : 1.8}
                className="cursor-pointer transition-all duration-150"
                onClick={() => onPartClick?.(partId)}
                onMouseEnter={() => setHoveredPart(partId)}
                onMouseLeave={() => setHoveredPart(null)}
              />

              {/* HP бары (если не отрублена) */}
              {part && !isSevered && (
                <g>
                  {/* Функциональная HP */}
                  <rect
                    x={config.hpOffset.x}
                    y={config.hpOffset.y}
                    width={config.hpWidth}
                    height={4}
                    fill="#374151"
                    rx={1}
                  />
                  <rect
                    x={config.hpOffset.x}
                    y={config.hpOffset.y}
                    width={config.hpWidth * (getHPPercent(part).functional / 100)}
                    height={4}
                    fill="#dc2626"
                    rx={1}
                  />

                  {/* Структурная HP */}
                  <rect
                    x={config.hpOffset.x}
                    y={config.hpOffset.y + 5}
                    width={config.hpWidth}
                    height={4}
                    fill="#374151"
                    rx={1}
                  />
                  <rect
                    x={config.hpOffset.x}
                    y={config.hpOffset.y + 5}
                    width={config.hpWidth * (getHPPercent(part).structural / 100)}
                    height={4}
                    fill="#6b7280"
                    rx={1}
                  />
                </g>
              )}

              {/* Индикатор отрубленной части */}
              {isSevered && (
                <text
                  x={config.center.x}
                  y={config.center.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#ef4444"
                  fontSize="12"
                  fontWeight="bold"
                >
                  ✕
                </text>
              )}
            </g>
          );
        })}

        {/* Сердце (точка в центре торса) */}
        {bodyState?.heart && (
          <circle
            cx="108"
            cy="108"
            r={selectedPartId === 'heart' ? 8 : 7}
            fill={bodyState.heart.hp.current > 40 ? '#991b1b' : '#450a0a'}
            stroke={selectedPartId === 'heart' ? '#f59e0b' : '#dc2626'}
            strokeWidth={selectedPartId === 'heart' ? 2.4 : 1.2}
            className="cursor-pointer"
            onClick={() => onPartClick?.('heart')}
          />
        )}

        {/* Легенда */}
        <g transform="translate(6, 360)">
          <rect x="0" y="0" width="12" height="5" fill="#dc2626" rx={1} />
          <text x="16" y="5" fill="#94a3b8" fontSize="7">Функ</text>
          
          <rect x="48" y="0" width="12" height="5" fill="#6b7280" rx={1} />
          <text x="64" y="5" fill="#94a3b8" fontSize="7">Струк</text>
          
          <rect x="96" y="0" width="10" height="10" fill="#78350f" rx={1} />
          <text x="109" y="7" fill="#94a3b8" fontSize="7">Отруб</text>
        </g>
      </svg>

      {/* Тултип при наведении */}
      {hoveredPart && bodyState && (
        <BodyPartTooltip 
          part={getPart(hoveredPart)} 
          partId={hoveredPart}
        />
      )}
    </div>
  );
}

// ==================== ТУЛТИП ====================

function BodyPartTooltip({ part, partId }: { part: BodyPart | undefined; partId: string }) {
  if (!part) return null;

  const { functional, structural } = getHPPercent(part);

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

  return (
    <div className="absolute left-0 top-0 bg-slate-900 border border-slate-600 rounded p-2 text-xs z-50 shadow-lg pointer-events-none ml-2 mt-2">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-white font-medium">{part.name}</span>
        <span style={{ color: getStatusColor(part.status) }}>
          {getStatusText(part.status)}
        </span>
      </div>
      {part.status !== 'severed' && (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            <div className="w-14 h-2 bg-slate-700 rounded overflow-hidden">
              <div className="h-full bg-red-600" style={{ width: `${functional}%` }} />
            </div>
            <span className="text-slate-400">{part.hp.functional.current}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-14 h-2 bg-slate-700 rounded overflow-hidden">
              <div className="h-full bg-gray-500" style={{ width: `${structural}%` }} />
            </div>
            <span className="text-slate-400">{part.hp.structural.current}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default BodyDoll;
