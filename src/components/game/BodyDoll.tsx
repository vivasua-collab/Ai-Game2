/**
 * BodyDoll - Схематичная кукла тела (SVG)
 * 
 * Простое SVG отображение с:
 * - Схематичным силуэтом человека
 * - HP барами на каждой части
 * - Подсветкой при выборе
 * - Коричневым цветом для отрубленных
 */

'use client';

import { useState } from 'react';
import type { BodyStructure, BodyPart, LimbStatus } from '@/types/body';

interface BodyDollProps {
  bodyState: BodyStructure | null;
  onPartClick?: (partId: string) => void;
  selectedPartId?: string | null;
}

// Размеры куклы (компактные)
const DOLL_WIDTH = 180;
const DOLL_HEIGHT = 320;

// Конфигурация частей тела для SVG
const BODY_PARTS = {
  // Голова
  head: {
    name: 'Голова',
    path: 'M70,8 L110,8 Q120,8 120,18 L120,38 Q120,50 110,50 L70,50 Q60,50 60,38 L60,18 Q60,8 70,8',
    center: { x: 90, y: 29 },
    hpOffset: { x: 68, y: 18 },
    hpWidth: 44,
  },
  // Торс
  torso: {
    name: 'Торс',
    path: 'M55,55 L125,55 L130,130 L120,145 L90,150 L60,145 L50,130 Z',
    center: { x: 90, y: 100 },
    hpOffset: { x: 62, y: 85 },
    hpWidth: 56,
  },
  // Левая рука
  leftArm: {
    name: 'Левая рука',
    path: 'M50,58 L28,62 L18,105 L12,145 L25,148 L35,110 L45,70 L50,95 L50,58',
    center: { x: 30, y: 100 },
    hpOffset: { x: 14, y: 90 },
    hpWidth: 24,
  },
  // Правая рука
  rightArm: {
    name: 'Правая рука',
    path: 'M130,58 L152,62 L162,105 L168,145 L155,148 L145,110 L135,70 L130,95 L130,58',
    center: { x: 150, y: 100 },
    hpOffset: { x: 142, y: 90 },
    hpWidth: 24,
  },
  // Левая ладонь
  leftHand: {
    name: 'Левая кисть',
    path: 'M10,150 Q5,150 5,158 L5,178 Q5,186 12,186 L22,186 Q30,186 30,178 L30,158 Q30,150 25,150 Z',
    center: { x: 17, y: 168 },
    hpOffset: { x: 8, y: 155 },
    hpWidth: 18,
  },
  // Правая ладонь
  rightHand: {
    name: 'Правая кисть',
    path: 'M155,150 Q150,150 150,158 L150,178 Q150,186 158,186 L168,186 Q175,186 175,178 L175,158 Q175,150 170,150 Z',
    center: { x: 162, y: 168 },
    hpOffset: { x: 152, y: 155 },
    hpWidth: 18,
  },
  // Левая нога
  leftLeg: {
    name: 'Левая нога',
    path: 'M62,148 L72,150 L68,205 L62,255 L50,255 L56,205 L56,150 Z',
    center: { x: 61, y: 200 },
    hpOffset: { x: 48, y: 185 },
    hpWidth: 22,
  },
  // Правая нога
  rightLeg: {
    name: 'Правая нога',
    path: 'M118,148 L108,150 L112,205 L118,255 L130,255 L124,205 L124,150 Z',
    center: { x: 119, y: 200 },
    hpOffset: { x: 108, y: 185 },
    hpWidth: 22,
  },
  // Левая ступня
  leftFoot: {
    name: 'Левая стопа',
    path: 'M45,260 Q40,260 40,268 L40,285 Q40,295 50,295 L68,295 Q75,295 75,288 L75,270 Q75,260 68,260 Z',
    center: { x: 57, y: 278 },
    hpOffset: { x: 44, y: 265 },
    hpWidth: 20,
  },
  // Правая ступня
  rightFoot: {
    name: 'Правая стопа',
    path: 'M112,260 Q105,260 105,270 L105,288 Q105,295 112,295 L130,295 Q140,295 140,285 L140,268 Q140,260 135,260 Z',
    center: { x: 123, y: 278 },
    hpOffset: { x: 112, y: 265 },
    hpWidth: 20,
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
        viewBox="0 0 180 320"
        className="w-full h-full max-w-[180px]"
        style={{ maxHeight: DOLL_HEIGHT }}
      >
        {/* Фон */}
        <rect x="0" y="0" width="180" height="320" fill="#1e293b" rx="8" />

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
                strokeWidth={isSelected ? 2.5 : isHovered ? 2 : 1.5}
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
                    height={3}
                    fill="#374151"
                    rx={1}
                  />
                  <rect
                    x={config.hpOffset.x}
                    y={config.hpOffset.y}
                    width={config.hpWidth * (getHPPercent(part).functional / 100)}
                    height={3}
                    fill="#dc2626"
                    rx={1}
                  />

                  {/* Структурная HP */}
                  <rect
                    x={config.hpOffset.x}
                    y={config.hpOffset.y + 4}
                    width={config.hpWidth}
                    height={3}
                    fill="#374151"
                    rx={1}
                  />
                  <rect
                    x={config.hpOffset.x}
                    y={config.hpOffset.y + 4}
                    width={config.hpWidth * (getHPPercent(part).structural / 100)}
                    height={3}
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
                  fontSize="10"
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
            cx="90"
            cy="90"
            r={selectedPartId === 'heart' ? 7 : 6}
            fill={bodyState.heart.hp.current > 40 ? '#991b1b' : '#450a0a'}
            stroke={selectedPartId === 'heart' ? '#f59e0b' : '#dc2626'}
            strokeWidth={selectedPartId === 'heart' ? 2 : 1}
            className="cursor-pointer"
            onClick={() => onPartClick?.('heart')}
          />
        )}

        {/* Легенда */}
        <g transform="translate(5, 300)">
          <rect x="0" y="0" width="10" height="4" fill="#dc2626" rx={1} />
          <text x="13" y="4" fill="#94a3b8" fontSize="6">Функ</text>
          
          <rect x="40" y="0" width="10" height="4" fill="#6b7280" rx={1} />
          <text x="53" y="4" fill="#94a3b8" fontSize="6">Струк</text>
          
          <rect x="80" y="0" width="8" height="8" fill="#78350f" rx={1} />
          <text x="91" y="6" fill="#94a3b8" fontSize="6">Отруб</text>
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
            <div className="w-12 h-1.5 bg-slate-700 rounded overflow-hidden">
              <div className="h-full bg-red-600" style={{ width: `${functional}%` }} />
            </div>
            <span className="text-slate-400">{part.hp.functional.current}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-12 h-1.5 bg-slate-700 rounded overflow-hidden">
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
