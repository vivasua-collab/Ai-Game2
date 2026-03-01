/**
 * BodyDollEditor - Редактор куклы тела
 * 
 * Позволяет:
 * - Размещать части тела мышкой
 * - Настраивать масштаб линейно
 * - Загружать новые изображения
 * - Удалять белый фон
 * - Экспортировать конфигурацию
 * 
 * Запуск: Настройки -> Редактор тела
 */

'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

// ==================== ТИПЫ ====================

interface PartConfig {
  id: string;
  name: string;
  image: string;
  naturalWidth: number;
  naturalHeight: number;
  position: { top: number; left: number };
  scale: number;
  hpBar: { x: number; y: number; width: number };
}

// ==================== КОНСТАНТЫ ====================

const CANVAS_WIDTH = 450;
const CANVAS_HEIGHT = 650;

// Стандартные части тела
const DEFAULT_HUMAN_PARTS: PartConfig[] = [
  {
    id: 'head',
    name: 'Голова',
    image: '/images/body/head.png',
    naturalWidth: 32,
    naturalHeight: 39,
    position: { top: 107, left: 206 },
    scale: 1,
    hpBar: { x: 2, y: 15, width: 28 },
  },
  {
    id: 'torso',
    name: 'Тело',
    image: '/images/body/torso.png',
    naturalWidth: 96,
    naturalHeight: 174,
    position: { top: 153, left: 175 },
    scale: 1,
    hpBar: { x: 20, y: 50, width: 56 },
  },
  {
    id: 'armLeft',
    name: 'Рука Левая',
    image: '/images/body/arm-left.png',
    naturalWidth: 32,
    naturalHeight: 105,
    position: { top: 199, left: 263 },
    scale: 1,
    hpBar: { x: 2, y: 30, width: 28 },
  },
  {
    id: 'armRight',
    name: 'Рука Правая',
    image: '/images/body/arm-right.png',
    naturalWidth: 32,
    naturalHeight: 101,
    position: { top: 193, left: 147 },
    scale: 1,
    hpBar: { x: 2, y: 30, width: 28 },
  },
  {
    id: 'legLeft',
    name: 'Нога Левая',
    image: '/images/body/leg-left.png',
    naturalWidth: 32,
    naturalHeight: 138,
    position: { top: 331, left: 235 },
    scale: 1,
    hpBar: { x: 2, y: 40, width: 28 },
  },
  {
    id: 'legRight',
    name: 'Нога Правая',
    image: '/images/body/leg-right.png',
    naturalWidth: 32,
    naturalHeight: 138,
    position: { top: 331, left: 185 },
    scale: 1,
    hpBar: { x: 2, y: 40, width: 28 },
  },
];

// ==================== КОМПОНЕНТ ====================

interface BodyDollEditorProps {
  initialParts?: PartConfig[];
  onSave?: (config: PartConfig[]) => void;
  entityName?: string;
}

export function BodyDollEditor({ 
  initialParts, 
  onSave,
  entityName = 'Человек'
}: BodyDollEditorProps) {
  const [parts, setParts] = useState<PartConfig[]>(initialParts || DEFAULT_HUMAN_PARTS);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [hpBarEditMode, setHpBarEditMode] = useState(false);
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Кэш загруженных изображений
  const [loadedImages, setLoadedImages] = useState<Map<string, { width: number; height: number }>>(new Map());

  // ==================== ОБРАБОТКА ИЗОБРАЖЕНИЙ ====================

  // Удаление белого фона
  const removeWhiteBackground = useCallback((file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d')!;
          
          // Рисуем оригинал
          ctx.drawImage(img, 0, 0);
          
          // Получаем данные пикселей
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          
          // Удаляем белый/почти белый фон
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Если пиксель близок к белому (порог 240)
            if (r > 240 && g > 240 && b > 240) {
              data[i + 3] = 0; // Прозрачный
            }
          }
          
          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }, []);

  // Загрузка изображения
  const handleFileUpload = useCallback(async (file: File, partId: string) => {
    try {
      // Удаляем белый фон
      const processedImage = await removeWhiteBackground(file);
      
      // Обновляем конфигурацию
      setParts(prev => prev.map(p => 
        p.id === partId 
          ? { ...p, image: processedImage }
          : p
      ));
    } catch {
      // Ошибка загрузки - игнорируем
    }
  }, [removeWhiteBackground]);

  // Обработка загрузки файла
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedPartId) {
      handleFileUpload(file, selectedPartId);
    }
    e.target.value = '';
  }, [selectedPartId, handleFileUpload]);

  // ==================== ПЕРЕТАСКИВАНИЕ ====================

  const handleMouseDown = (e: React.MouseEvent, partId: string) => {
    e.preventDefault();
    setSelectedPartId(partId);
    setIsDragging(true);
    
    const part = parts.find(p => p.id === partId);
    if (part) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setDragOffset({
          x: e.clientX - rect.left - part.position.left,
          y: e.clientY - rect.top - part.position.top,
        });
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedPartId) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const newLeft = Math.round(e.clientX - rect.left - dragOffset.x);
    const newTop = Math.round(e.clientY - rect.top - dragOffset.y);
    
    setParts(prev => prev.map(p => 
      p.id === selectedPartId 
        ? { ...p, position: { left: newLeft, top: newTop } }
        : p
    ));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // ==================== МАСШТАБИРОВАНИЕ ====================

  // Линейное изменение размера в пикселях
  const handleScaleChange = (partId: string, newScale: number) => {
    setParts(prev => prev.map(p => 
      p.id === partId 
        ? { ...p, scale: newScale }
        : p
    ));
  };

  // Изменение размера в пикселях (ширина)
  const handleWidthChange = (partId: string, newWidth: number) => {
    const part = parts.find(p => p.id === partId);
    if (!part) return;
    
    // Вычисляем новый scale на основе желаемой ширины
    const newScale = newWidth / part.naturalWidth;
    
    setParts(prev => prev.map(p => 
      p.id === partId 
        ? { ...p, scale: Math.max(0.1, newScale) }
        : p
    ));
  };

  // ==================== HP BAR ====================

  const handleHpBarChange = (partId: string, field: 'x' | 'y' | 'width', value: number) => {
    setParts(prev => prev.map(p => 
      p.id === partId 
        ? { ...p, hpBar: { ...p.hpBar, [field]: value } }
        : p
    ));
  };

  // ==================== ЭКСПОРТ ====================

  const generateCode = () => {
    let code = `// Конфигурация частей тела: ${entityName}\n`;
    code += `const BODY_PARTS_CONFIG = {\n`;
    parts.forEach(part => {
      code += `  ${part.id}: {\n`;
      code += `    image: '${part.image}',\n`;
      code += `    naturalWidth: ${part.naturalWidth},\n`;
      code += `    naturalHeight: ${part.naturalHeight},\n`;
      code += `    position: { top: ${part.position.top}, left: ${part.position.left} },\n`;
      code += `    scale: ${part.scale.toFixed(2)},\n`;
      code += `    hpBar: { x: ${part.hpBar.x}, y: ${part.hpBar.y}, width: ${part.hpBar.width} },\n`;
      code += `  },\n`;
    });
    code += `};\n\n`;
    code += `// Размеры контейнера\n`;
    code += `const DOLL_WIDTH = ${CANVAS_WIDTH};\n`;
    code += `const DOLL_HEIGHT = ${CANVAS_HEIGHT};`;
    return code;
  };

  // ==================== УПРАВЛЕНИЕ ЧАСТЯМИ ====================

  const addNewPart = () => {
    const newId = `part_${Date.now()}`;
    const newPart: PartConfig = {
      id: newId,
      name: `Новая часть ${parts.length + 1}`,
      image: '',
      naturalWidth: 32,
      naturalHeight: 32,
      position: { top: 100, left: 200 },
      scale: 1,
      hpBar: { x: 5, y: 10, width: 22 },
    };
    setParts(prev => [...prev, newPart]);
    setSelectedPartId(newId);
  };

  const removePart = (partId: string) => {
    setParts(prev => prev.filter(p => p.id !== partId));
    if (selectedPartId === partId) {
      setSelectedPartId(null);
    }
  };

  const updatePartName = (partId: string, name: string) => {
    setParts(prev => prev.map(p => 
      p.id === partId ? { ...p, name } : p
    ));
  };

  const resetToDefault = () => {
    setParts(initialParts || DEFAULT_HUMAN_PARTS);
    setSelectedPartId(null);
  };

  // ==================== РЕНДЕР ====================

  const selectedPart = parts.find(p => p.id === selectedPartId);

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-900 rounded-xl h-full">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-white">🛠️ Редактор тела</h2>
          <Badge variant="outline" className="text-amber-400 border-amber-600">
            {entityName}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCode(!showCode)}
            className="border-blue-600 text-blue-400"
          >
            {showCode ? 'Скрыть код' : '📋 Код'}
          </Button>
          {onSave && (
            <Button
              size="sm"
              onClick={() => onSave(parts)}
              className="bg-green-600 hover:bg-green-700"
            >
              💾 Сохранить
            </Button>
          )}
        </div>
      </div>

      {/* Основной контент */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Холст */}
        <div 
          ref={canvasRef}
          className="relative bg-slate-800 border-2 border-slate-600 rounded-lg flex-shrink-0 overflow-hidden"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Сетка */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
            {[...Array(10)].map((_, i) => (
              <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={CANVAS_HEIGHT} stroke="white" strokeWidth="0.5" />
            ))}
            {[...Array(14)].map((_, i) => (
              <line key={`h${i}`} x1={0} y1={i * 50} x2={CANVAS_WIDTH} y2={i * 50} stroke="white" strokeWidth="0.5" />
            ))}
          </svg>

          {/* Центральная линия */}
          <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-amber-500/30 pointer-events-none" />

          {/* Части тела */}
          {parts.map(part => {
            const width = Math.round(part.naturalWidth * part.scale);
            const height = Math.round(part.naturalHeight * part.scale);
            const isSelected = selectedPartId === part.id;
            
            return (
              <div
                key={part.id}
                className={`absolute cursor-move transition-shadow ${
                  isSelected ? 'ring-2 ring-amber-400 z-10' : ''
                }`}
                style={{
                  top: part.position.top,
                  left: part.position.left,
                  width,
                  height,
                }}
                onMouseDown={(e) => handleMouseDown(e, part.id)}
              >
                {part.image ? (
                  <img
                    src={part.image}
                    alt={part.name}
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                    onLoad={(e) => {
                      const img = e.currentTarget;
                      setLoadedImages(prev => {
                        const next = new Map(prev);
                        next.set(part.id, { width: img.naturalWidth, height: img.naturalHeight });
                        return next;
                      });
                      // Обновляем naturalWidth/Height при первой загрузке
                      if (part.naturalWidth === 32 && part.naturalHeight === 32 && part.image.startsWith('data:')) {
                        setParts(prev => prev.map(p => 
                          p.id === part.id 
                            ? { ...p, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight }
                            : p
                        ));
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-slate-600 rounded flex items-center justify-center text-xs text-slate-400">
                    Нет изображения
                  </div>
                )}
                
                {/* HP бар (превью) */}
                {(part.image || !hpBarEditMode) && (
                  <div 
                    className="absolute pointer-events-none"
                    style={{ left: part.hpBar.x, top: part.hpBar.y, width: part.hpBar.width }}
                  >
                    <div className="h-1 bg-red-600 rounded-sm mb-0.5" style={{ width: '100%' }} />
                    <div className="h-1 bg-gray-400 rounded-sm" style={{ width: '100%' }} />
                  </div>
                )}
                
                {/* Название и координаты */}
                <div className="absolute -top-6 left-0 bg-black/80 px-2 py-0.5 rounded text-xs whitespace-nowrap z-20">
                  <span className="text-white">{part.name}</span>
                  <span className="text-amber-400 ml-2">
                    ({part.position.left}, {part.position.top})
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Панель управления */}
        <div className="flex-1 flex flex-col gap-4 min-w-[300px] overflow-y-auto">
          {/* Инструкция */}
          <div className="bg-slate-800 rounded-lg p-3 flex-shrink-0">
            <h3 className="text-amber-400 font-medium mb-2">📖 Инструкция:</h3>
            <ul className="text-xs text-slate-300 space-y-1">
              <li>• <strong>Перетаскивание</strong> - двигайте части мышкой</li>
              <li>• <strong>Масштаб</strong> - используйте слайдер ширины в пикселях</li>
              <li>• <strong>Загрузка</strong> - выберите часть и загрузите PNG</li>
              <li>• <strong>Фон</strong> - белый фон удаляется автоматически</li>
            </ul>
          </div>

          {/* Список частей */}
          <div className="bg-slate-800 rounded-lg p-3 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-amber-400 font-medium">📋 Части тела:</h3>
              <Button size="sm" variant="outline" onClick={addNewPart} className="h-7 text-xs">
                + Добавить
              </Button>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {parts.map(part => (
                <div 
                  key={part.id}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedPartId === part.id ? 'bg-amber-600/30' : 'bg-slate-700/50 hover:bg-slate-700'
                  }`}
                  onClick={() => setSelectedPartId(part.id)}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm">{part.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {Math.round(part.naturalWidth * part.scale)}×{Math.round(part.naturalHeight * part.scale)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removePart(part.id); }}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Настройки выбранной части */}
          {selectedPart && (
            <div className="bg-slate-800 rounded-lg p-3 flex-shrink-0">
              <h3 className="text-amber-400 font-medium mb-3">⚙️ Настройки: {selectedPart.name}</h3>
              
              <Tabs defaultValue="position" className="w-full">
                <TabsList className="grid w-full grid-cols-3 bg-slate-700 h-8">
                  <TabsTrigger value="position" className="text-xs">Позиция</TabsTrigger>
                  <TabsTrigger value="scale" className="text-xs">Размер</TabsTrigger>
                  <TabsTrigger value="image" className="text-xs">Изображение</TabsTrigger>
                </TabsList>
                
                {/* Позиция */}
                <TabsContent value="position" className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">Left (X)</label>
                      <Input
                        type="number"
                        value={selectedPart.position.left}
                        onChange={(e) => setParts(prev => prev.map(p => 
                          p.id === selectedPart.id 
                            ? { ...p, position: { ...p.position, left: parseInt(e.target.value) || 0 } }
                            : p
                        ))}
                        className="h-8 bg-slate-700 border-slate-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Top (Y)</label>
                      <Input
                        type="number"
                        value={selectedPart.position.top}
                        onChange={(e) => setParts(prev => prev.map(p => 
                          p.id === selectedPart.id 
                            ? { ...p, position: { ...p.position, top: parseInt(e.target.value) || 0 } }
                            : p
                        ))}
                        className="h-8 bg-slate-700 border-slate-600"
                      />
                    </div>
                  </div>
                  
                  <div className="border-t border-slate-700 pt-3">
                    <label className="text-xs text-slate-400 mb-2 block">HP Бар позиция</label>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-xs text-slate-500">X</label>
                        <Input
                          type="number"
                          value={selectedPart.hpBar.x}
                          onChange={(e) => handleHpBarChange(selectedPart.id, 'x', parseInt(e.target.value) || 0)}
                          className="h-8 bg-slate-700 border-slate-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Y</label>
                        <Input
                          type="number"
                          value={selectedPart.hpBar.y}
                          onChange={(e) => handleHpBarChange(selectedPart.id, 'y', parseInt(e.target.value) || 0)}
                          className="h-8 bg-slate-700 border-slate-600"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">Ширина</label>
                        <Input
                          type="number"
                          value={selectedPart.hpBar.width}
                          onChange={(e) => handleHpBarChange(selectedPart.id, 'width', parseInt(e.target.value) || 0)}
                          className="h-8 bg-slate-700 border-slate-600"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                {/* Размер */}
                <TabsContent value="scale" className="mt-3 space-y-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-400">Ширина (пиксели)</span>
                      <span className="text-white">{Math.round(selectedPart.naturalWidth * selectedPart.scale)}px</span>
                    </div>
                    <Slider
                      value={[Math.round(selectedPart.naturalWidth * selectedPart.scale)]}
                      onValueChange={([v]) => handleWidthChange(selectedPart.id, v)}
                      min={10}
                      max={300}
                      step={1}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="text-xs text-slate-500">
                    Оригинал: {selectedPart.naturalWidth}×{selectedPart.naturalHeight}px
                    | Scale: {selectedPart.scale.toFixed(2)}
                  </div>
                  
                  <div>
                    <label className="text-xs text-slate-400">Scale (точный)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={selectedPart.scale.toFixed(2)}
                      onChange={(e) => handleScaleChange(selectedPart.id, parseFloat(e.target.value) || 1)}
                      className="h-8 bg-slate-700 border-slate-600"
                    />
                  </div>
                </TabsContent>
                
                {/* Изображение */}
                <TabsContent value="image" className="mt-3 space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Название</label>
                    <Input
                      value={selectedPart.name}
                      onChange={(e) => updatePartName(selectedPart.id, e.target.value)}
                      className="h-8 bg-slate-700 border-slate-600"
                    />
                  </div>
                  
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Загрузить изображение (PNG)</label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      📁 Выбрать файл
                    </Button>
                    <p className="text-xs text-slate-500 mt-1">
                      Белый фон будет удалён автоматически
                    </p>
                  </div>
                  
                  {/* Превью */}
                  {selectedPart.image && (
                    <div className="mt-2">
                      <label className="text-xs text-slate-400 mb-2 block">Превью</label>
                      <div className="bg-slate-700 rounded p-2 flex items-center justify-center">
                        <img 
                          src={selectedPart.image} 
                          alt={selectedPart.name}
                          className="max-w-[100px] max-h-[100px] object-contain"
                        />
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}

          {/* Сброс */}
          <Button
            variant="outline"
            onClick={resetToDefault}
            className="border-red-600 text-red-400 hover:bg-red-900/30 flex-shrink-0"
          >
            🔄 Сбросить к стандартным
          </Button>
        </div>
      </div>

      {/* Сгенерированный код */}
      {showCode && (
        <div className="bg-slate-800 rounded-lg p-4 max-h-60 overflow-auto">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-green-400 font-medium">📝 Сгенерированный код:</h3>
            <Button
              size="sm"
              onClick={() => navigator.clipboard.writeText(generateCode())}
              className="bg-green-600 hover:bg-green-700"
            >
              📋 Копировать
            </Button>
          </div>
          <pre className="text-xs text-slate-300 bg-slate-900 p-3 rounded overflow-x-auto whitespace-pre-wrap">
            {generateCode()}
          </pre>
        </div>
      )}
    </div>
  );
}

export default BodyDollEditor;
