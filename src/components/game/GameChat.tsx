"use client";

import { useState, useRef, useEffect, memo, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import type { Message, InventoryItem, CharacterTechnique, CharacterSkill } from "@/types/game";
import {
  useGameCharacter,
  useGameMessages,
  useGameTime,
  useGameLocation,
  useGameLoading,
  useGamePaused,
  useGameDaysSinceStart,
  useGameActions,
  useGameInventory,
  useGameTechniques,
  useGameSkills,
} from "@/stores/game.store";

// Типы боковых панелей
type PanelType = "character" | "inventory" | "techniques" | "skills" | "map" | "quests" | "relations" | null;

// Маппинг редкости на цвета
const RARITY_COLORS: Record<string, string> = {
  common: "text-slate-300",
  uncommon: "text-green-400",
  rare: "text-blue-400",
  legendary: "text-amber-400",
};

const RARITY_BG: Record<string, string> = {
  common: "bg-slate-600/30",
  uncommon: "bg-green-600/20",
  rare: "bg-blue-600/20",
  legendary: "bg-amber-600/20",
};

// Маппинг элементов на иконки
const ELEMENT_ICONS: Record<string, string> = {
  fire: "🔥",
  water: "💧",
  earth: "🪨",
  air: "💨",
  void: "🌌",
  neutral: "⚪",
  lightning: "⚡",
};

// Компонент одного сообщения - мемоизирован
const MessageBubble = memo(function MessageBubble({ message }: { message: Message }) {
  const isPlayer = message.sender === "player";
  const isSystem = message.type === "system";
  const isError = message.type === "error";

  return (
    <div className={`flex ${isPlayer ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`p-3 rounded-lg ${
          isPlayer
            ? "bg-blue-600/30 border border-blue-500/30"
            : isSystem
            ? "bg-amber-600/20 border border-amber-500/30"
            : isError
            ? "bg-red-600/20 border border-red-500/30"
            : "bg-slate-700/50 border border-slate-600/30"
        }`}
      >
        {!isPlayer && (
          <div className="text-xs text-slate-400 mb-1">
            {message.sender === "narrator" ? "📖 Рассказчик" : "⚙️ Система"}
          </div>
        )}
        <div className="text-sm text-slate-200 whitespace-pre-wrap break-words">
          {message.content}
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => prevProps.message.id === nextProps.message.id);

// Статус-бар
const StatusBar = memo(function StatusBar() {
  const character = useGameCharacter();
  const worldTime = useGameTime();
  const location = useGameLocation();
  const daysSinceStart = useGameDaysSinceStart();

  const qiPercent = useMemo(() => 
    character ? (character.currentQi / character.coreCapacity) * 100 : 0,
    [character?.currentQi, character?.coreCapacity]
  );
  
  const healthPercent = useMemo(() => character?.health ?? 0, [character?.health]);
  
  // Прогресс прорыва: accumulatedQi / (coreCapacity * requiredFills)
  const breakthroughProgress = useMemo(() => {
    if (!character) return { percent: 0, fills: 0, required: 0 };
    const requiredFills = character.cultivationLevel * 10 + character.cultivationSubLevel;
    const currentFills = Math.floor(character.accumulatedQi / character.coreCapacity);
    const percent = Math.min(100, (character.accumulatedQi / (character.coreCapacity * requiredFills)) * 100);
    return { percent, fills: currentFills, required: requiredFills };
  }, [character?.accumulatedQi, character?.coreCapacity, character?.cultivationLevel, character?.cultivationSubLevel]);

  if (!character) return null;

  return (
    <div className="bg-slate-800/80 border-b border-slate-700 px-4 py-2 ml-12">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="border-amber-500/50 text-amber-400">
            Lv.{character.cultivationLevel}.{character.cultivationSubLevel}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Ци:</span>
            <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${qiPercent}%` }} />
            </div>
            <span className="text-xs text-slate-400">{character.currentQi}/{character.coreCapacity}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Прорыв:</span>
            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${breakthroughProgress.percent}%` }} />
            </div>
            <span className="text-xs text-amber-400">{breakthroughProgress.fills}/{breakthroughProgress.required}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">HP:</span>
            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all duration-300" style={{ width: `${healthPercent}%` }} />
            </div>
          </div>
        </div>
        {worldTime && (
          <div className="flex items-center gap-2 text-slate-400">
            <span>📅 День {daysSinceStart}</span>
            <Separator orientation="vertical" className="h-4 bg-slate-600" />
            <span>{worldTime.hour}:{worldTime.minute.toString().padStart(2, "0")}</span>
            <Badge variant="secondary" className="text-xs">{worldTime.season} сезон</Badge>
          </div>
        )}
        {location && <div className="text-slate-400">📍 {location.name}</div>}
      </div>
    </div>
  );
});

// Панель характеристик
const CharacterPanel = memo(function CharacterPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const character = useGameCharacter();
  if (!character || !isOpen) return null;
  
  // Расчёт прогресса прорыва
  const requiredFills = character.cultivationLevel * 10 + character.cultivationSubLevel;
  const currentFills = Math.floor(character.accumulatedQi / character.coreCapacity);
  const breakthroughPercent = Math.min(100, (character.accumulatedQi / (character.coreCapacity * requiredFills)) * 100);

  return (
    <Card className="absolute left-14 top-[104px] w-72 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">📊 Характеристики</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between"><span className="text-slate-400">Имя:</span><span className="text-slate-200">{character.name}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Возраст:</span><span className="text-slate-200">{character.age} лет</span></div>
        <Separator className="bg-slate-700" />
        <div className="flex justify-between"><span className="text-slate-400">Сила:</span><span className="text-slate-200">{character.strength.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Ловкость:</span><span className="text-slate-200">{character.agility.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Интеллект:</span><span className="text-slate-200">{character.intelligence.toFixed(2)}</span></div>
        <div className="flex justify-between"><span className="text-slate-400">Проводимость:</span><span className="text-slate-200">{character.conductivity.toFixed(2)}/сек</span></div>
        <Separator className="bg-slate-700" />
        <div className="flex justify-between"><span className="text-slate-400">Ядро:</span><span className="text-slate-200">{character.coreCapacity} ед.</span></div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Ци:</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-cyan-500" style={{ width: `${(character.currentQi / character.coreCapacity) * 100}%` }} />
            </div>
            <span className="text-slate-200 text-xs">{character.currentQi}/{character.coreCapacity}</span>
          </div>
        </div>
        <Separator className="bg-slate-700" />
        <div className="text-amber-400 text-xs font-medium">⚡ Прогресс прорыва</div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Заполнений:</span>
          <span className="text-amber-400">{currentFills}/{requiredFills}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Накоплено:</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-amber-500" style={{ width: `${breakthroughPercent}%` }} />
            </div>
            <span className="text-slate-200 text-xs">{character.accumulatedQi}</span>
          </div>
        </div>
        <Separator className="bg-slate-700" />
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Физ. усталость:</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${character.fatigue}%` }} />
            </div>
            <span className="text-slate-200 text-xs">{character.fatigue.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Мент. усталость:</span>
          <div className="flex items-center gap-2">
            <div className="w-16 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500" style={{ width: `${character.mentalFatigue}%` }} />
            </div>
            <span className="text-slate-200 text-xs">{character.mentalFatigue.toFixed(0)}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// Панель инвентаря с реальными данными
const InventoryPanel = memo(function InventoryPanel({ 
  isOpen, 
  onClose, 
  onItemClick 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onItemClick: (item: InventoryItem) => void;
}) {
  const inventory = useGameInventory();
  const { consumeItem, loadInventory } = useGameActions();
  const [using, setUsing] = useState<string | null>(null);
  
  useEffect(() => {
    if (isOpen) loadInventory();
  }, [isOpen, loadInventory]);

  if (!isOpen) return null;

  const handleUse = async (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation();
    if (!item.isConsumable) return;
    
    setUsing(item.id);
    await consumeItem(item.id);
    setUsing(null);
  };

  return (
    <Card className="absolute left-14 top-[104px] w-80 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">🎒 Инвентарь ({inventory.length})</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          {inventory.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              Инвентарь пуст
              <p className="text-xs mt-2">Найденные предметы будут отображаться здесь</p>
            </div>
          ) : (
            <div className="space-y-2">
              {inventory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onItemClick(item)}
                  className={`p-2 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/50 transition-colors ${RARITY_BG[item.rarity || "common"]}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon || "📦"}</span>
                      <span className={`font-medium ${RARITY_COLORS[item.rarity || "common"]}`}>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.quantity > 1 && <Badge variant="outline" className="text-xs">x{item.quantity}</Badge>}
                      {item.isConsumable && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs text-green-400 hover:text-green-300"
                          onClick={(e) => handleUse(e, item)}
                          disabled={using === item.id}
                        >
                          {using === item.id ? "..." : "Исп."}
                        </Button>
                      )}
                    </div>
                  </div>
                  {item.description && <p className="text-xs text-slate-400 mt-1">{item.description}</p>}
                  {item.durability !== undefined && item.maxDurability && (
                    <div className="mt-1">
                      <Progress value={(item.durability / item.maxDurability) * 100} className="h-1" />
                    </div>
                  )}
                  {item.qiCharge !== undefined && item.maxQiCharge && (
                    <div className="text-xs text-cyan-400 mt-1">Заряд: {item.qiCharge}/{item.maxQiCharge}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

// Панель техник с реальными данными
const TechniquesPanel = memo(function TechniquesPanel({ 
  isOpen, 
  onClose,
  onTechniqueClick 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onTechniqueClick: (technique: CharacterTechnique) => void;
}) {
  const techniques = useGameTechniques();
  const { loadTechniques } = useGameActions();

  useEffect(() => {
    if (isOpen) loadTechniques();
  }, [isOpen, loadTechniques]);

  if (!isOpen) return null;

  return (
    <Card className="absolute left-14 top-[104px] w-80 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">⚡ Техники ({techniques.length})</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          {techniques.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              Нет изученных техник
              <p className="text-xs mt-2">Изучайте техники культивации в процессе игры</p>
            </div>
          ) : (
            <div className="space-y-2">
              {techniques.map((ct) => (
                <div
                  key={ct.id}
                  onClick={() => onTechniqueClick(ct)}
                  className={`p-2 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/50 transition-colors ${RARITY_BG[ct.technique.rarity || "common"]}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{ELEMENT_ICONS[ct.technique.element] || "⚪"}</span>
                      <span className={`font-medium ${RARITY_COLORS[ct.technique.rarity || "common"]}`}>
                        {ct.technique.name}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">Lv.{ct.technique.level}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{ct.technique.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs">
                    <span className="text-cyan-400">Ци: {ct.technique.qiCost}</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-slate-400">Мастерство: {ct.mastery.toFixed(0)}%</span>
                  </div>
                  <Progress value={ct.mastery} className="h-1 mt-1" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

// Панель навыков
const SkillsPanel = memo(function SkillsPanel({ 
  isOpen, 
  onClose,
  onSkillClick 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSkillClick: (skill: CharacterSkill) => void;
}) {
  const skills = useGameSkills();
  const { loadSkills } = useGameActions();

  useEffect(() => {
    if (isOpen) loadSkills();
  }, [isOpen, loadSkills]);

  if (!isOpen) return null;

  return (
    <Card className="absolute left-14 top-[104px] w-80 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">🧘 Навыки ({skills.length})</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72">
          {skills.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-8">
              Нет изученных навыков
              <p className="text-xs mt-2">Навыки культивации улучшают вашу практику</p>
            </div>
          ) : (
            <div className="space-y-2">
              {skills.map((cs) => (
                <div
                  key={cs.skillId}
                  onClick={() => onSkillClick(cs)}
                  className="p-2 rounded-lg border border-slate-600/50 cursor-pointer hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-200">
                      {cs.skill?.nameRu || cs.skill?.name || cs.skillId}
                    </span>
                    <Badge variant="outline" className="text-xs">Lv.{cs.level}/{cs.skill?.maxLevel || 5}</Badge>
                  </div>
                  {cs.skill?.description && (
                    <p className="text-xs text-slate-400 mt-1">{cs.skill.description}</p>
                  )}
                  <Progress value={(cs.level / (cs.skill?.maxLevel || 5)) * 100} className="h-1 mt-1" />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

// Типы для карты
interface MapBuilding {
  id: string;
  name: string;
  buildingType: string;
  isEnterable: boolean;
  qiBonus: number;
  comfort: number;
  defense: number;
}

interface MapObject {
  id: string;
  name: string;
  objectType: string;
  isInteractable: boolean;
  isCollectible: boolean;
  resourceType?: string;
  resourceCount: number;
  icon?: string;
}

// Панель карты
const MapPanel = memo(function MapPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const location = useGameLocation();
  const character = useGameCharacter();
  const [buildings, setBuildings] = useState<MapBuilding[]>([]);
  const [objects, setObjects] = useState<MapObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'info' | 'buildings' | 'objects'>('info');

  // Загрузка данных карты
  useEffect(() => {
    if (isOpen && character?.id) {
      let isMounted = true;
      
      fetch(`/api/map?characterId=${character.id}&action=current`)
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success) {
            setBuildings(data.buildings || []);
            setObjects(data.objects || []);
          }
        })
        .catch(console.error)
        .finally(() => {
          if (isMounted) setLoading(false);
        });
      
      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, character?.id]);

  if (!isOpen) return null;

  // Форматирование координат
  const formatCoords = (x?: number, y?: number, z?: number) => {
    if (x === undefined) return 'Неизвестно';
    const formatNum = (n: number) => n >= 0 ? `+${n}` : `${n}`;
    return `${formatNum(x)}, ${formatNum(y)}, ${formatNum(z)}м`;
  };

  // Названия типов строений
  const buildingTypeNames: Record<string, string> = {
    house: '🏠 Дом',
    shop: '🏪 Лавка',
    temple: '🛕 Храм',
    cave: '🕳️ Пещера',
    tower: '🗼 Башня',
    sect_hq: '🏯 Штаб секты',
    inn: '🏨 Постоялый двор',
    warehouse: '📦 Склад',
    alchemy_lab: '⚗️ Алхимическая лаборатория',
    training_hall: '⚔️ Тренировочный зал',
    meditation_pavilion: '🧘 Павильон медитации',
    library: '📚 Библиотека',
  };

  // Названия типов объектов
  const objectTypeNames: Record<string, string> = {
    resource: '🌿 Ресурс',
    container: '📦 Контейнер',
    interactable: '🔔 Интерактивный',
    decoration: '🎪 Декорация',
  };

  // Названия типов ресурсов
  const resourceTypeNames: Record<string, string> = {
    herb: '🌿 Трава',
    ore: '💎 Руда',
    wood: '🪵 Дерево',
    water: '💧 Вода',
    crystal: '🔮 Кристалл',
    spirit: '👻 Духовный материал',
  };

  return (
    <Card className="absolute left-14 top-[104px] w-96 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">🗺️ Карта мира</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent>
        {/* Табы */}
        <div className="flex gap-1 mb-3">
          {[
            { id: 'info', label: '📍 Локация' },
            { id: 'buildings', label: '🏠 Строения', count: buildings.length },
            { id: 'objects', label: '📦 Объекты', count: objects.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as any)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedTab === tab.id
                  ? 'bg-amber-600/30 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1 text-[10px]">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-sm text-slate-400 text-center py-4">Загрузка...</div>
        ) : selectedTab === 'info' ? (
          <div className="space-y-3">
            {location ? (
              <>
                {/* Информация о локации */}
                <div className="p-2 rounded bg-slate-700/30 border border-slate-600/30">
                  <div className="font-medium text-slate-200 mb-1">📍 {location.name}</div>
                  {location.description && (
                    <p className="text-xs text-slate-400 mb-2">{location.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500">Координаты:</span>
                      <span className="text-slate-300 ml-1">
                        {formatCoords(location.x, location.y, location.z)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Тип:</span>
                      <span className="text-slate-300 ml-1 capitalize">
                        {location.locationType || 'area'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Плотность Ци:</span>
                      <span className="text-cyan-400 ml-1">{location.qiDensity}/м³</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Местность:</span>
                      <span className="text-slate-300 ml-1 capitalize">
                        {location.terrainType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Статистика */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-slate-700/20 text-center">
                    <div className="text-lg font-bold text-amber-400">{buildings.length}</div>
                    <div className="text-xs text-slate-400">Строений</div>
                  </div>
                  <div className="p-2 rounded bg-slate-700/20 text-center">
                    <div className="text-lg font-bold text-green-400">{objects.length}</div>
                    <div className="text-xs text-slate-400">Объектов</div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-400 text-center py-4">
                Локация не определена
              </div>
            )}
          </div>
        ) : selectedTab === 'buildings' ? (
          <ScrollArea className="h-48">
            {buildings.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-4">
                Нет строений поблизости
              </div>
            ) : (
              <div className="space-y-2">
                {buildings.map((b) => (
                  <div
                    key={b.id}
                    className="p-2 rounded bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200">
                        {buildingTypeNames[b.buildingType] || b.buildingType} {b.name}
                      </span>
                      {b.isEnterable && (
                        <Badge variant="outline" className="text-xs text-green-400 border-green-600/50">
                          Вход
                        </Badge>
                      )}
                    </div>
                    {(b.qiBonus > 0 || b.comfort > 0 || b.defense > 0) && (
                      <div className="flex gap-2 mt-1 text-xs">
                        {b.qiBonus > 0 && <span className="text-cyan-400">+{b.qiBonus}% Ци</span>}
                        {b.comfort > 0 && <span className="text-green-400">+{b.comfort} комфорт</span>}
                        {b.defense > 0 && <span className="text-amber-400">+{b.defense} защита</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        ) : (
          <ScrollArea className="h-48">
            {objects.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-4">
                Нет объектов поблизости
              </div>
            ) : (
              <div className="space-y-2">
                {objects.map((o) => (
                  <div
                    key={o.id}
                    className="p-2 rounded bg-slate-700/30 border border-slate-600/30 hover:bg-slate-700/50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-slate-200">
                        {o.icon || '📦'} {o.name}
                      </span>
                      {o.isCollectible && (
                        <Badge variant="outline" className="text-xs text-amber-400 border-amber-600/50">
                          Можно собрать
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 mt-1 text-xs text-slate-400">
                      <span>{objectTypeNames[o.objectType] || o.objectType}</span>
                      {o.resourceType && (
                        <>
                          <span>•</span>
                          <span className="text-green-400">
                            {resourceTypeNames[o.resourceType] || o.resourceType}
                            {o.resourceCount > 1 && ` x${o.resourceCount}`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {/* Подсказка */}
        <div className="mt-3 pt-2 border-t border-slate-700 text-xs text-slate-500 text-center">
          💡 Исследуйте мир, чтобы открывать новые области
        </div>
      </CardContent>
    </Card>
  );
});

// Панель квестов
const QuestsPanel = memo(function QuestsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <Card className="absolute left-14 top-[104px] w-80 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">📜 Квесты</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="text-sm text-slate-400 text-center py-8">
            Нет активных квестов
            <p className="text-xs mt-2">Квесты будут появляться по мере развития сюжета</p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

// Панель отношений
const RelationsPanel = memo(function RelationsPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <Card className="absolute left-14 top-[104px] w-80 bg-slate-800/95 border-slate-700 shadow-xl z-30">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm text-amber-400">👥 Отношения</CardTitle>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400" onClick={onClose}>✕</Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="text-sm text-slate-400 text-center py-8">
            Нет знакомых персонажей
            <p className="text-xs mt-2">Встреченные NPC будут отображаться здесь</p>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
});

// Боковое меню
const SideMenu = memo(function SideMenu({ 
  activePanel, 
  setActivePanel 
}: { 
  activePanel: PanelType; 
  setActivePanel: (panel: PanelType) => void;
}) {
  const menuItems: { id: PanelType; icon: string; label: string }[] = [
    { id: "character", icon: "📊", label: "Характеристики" },
    { id: "inventory", icon: "🎒", label: "Инвентарь" },
    { id: "techniques", icon: "⚡", label: "Техники" },
    { id: "skills", icon: "🧘", label: "Навыки" },
    { id: "map", icon: "🗺️", label: "Карта" },
    { id: "quests", icon: "📜", label: "Квесты" },
    { id: "relations", icon: "👥", label: "Отношения" },
  ];

  return (
    <div className="absolute left-0 top-[104px] bottom-0 w-12 bg-slate-800/90 border-r border-t border-slate-700 flex flex-col items-center py-2 z-20">
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setActivePanel(activePanel === item.id ? null : item.id)}
          className={`w-10 h-10 rounded-lg flex items-center justify-center mb-1 transition-all ${
            activePanel === item.id
              ? "bg-amber-600/30 border border-amber-500/50 text-amber-400"
              : "hover:bg-slate-700/50 text-slate-400 hover:text-slate-200"
          }`}
          title={item.label}
        >
          <span className="text-lg">{item.icon}</span>
        </button>
      ))}
    </div>
  );
});

// Props for GameChat
interface GameChatProps {
  onNewGame: () => void;
  onSaveAndExit: () => void;
}

export function GameChat({ onNewGame, onSaveAndExit }: GameChatProps) {
  const [input, setInput] = useState("");
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get state from store
  const messages = useGameMessages();
  const isLoading = useGameLoading();
  const isPaused = useGamePaused();

  // Get actions from store
  const { sendMessage, togglePause } = useGameActions();

  // Автопрокрутка к новым сообщениям
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Обработчики
  const handleSend = useCallback(() => {
    if (input.trim() && !isLoading) {
      sendMessage(input.trim());
      setInput("");
    }
  }, [input, isLoading, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleTogglePause = useCallback(() => togglePause(), [togglePause]);

  const handleClosePanel = useCallback(() => setActivePanel(null), []);

  // Клик по предмету → подстановка в input
  const handleItemClick = useCallback((item: InventoryItem) => {
    if (item.isConsumable) {
      setInput(`Использовать ${item.name}`);
    } else {
      setInput(`Осмотреть ${item.name}`);
    }
  }, []);

  // Клик по технике → подстановка в input
  const handleTechniqueClick = useCallback((ct: CharacterTechnique) => {
    setInput(`Применить ${ct.technique.name}`);
  }, []);

  // Клик по навыку → подстановка в input
  const handleSkillClick = useCallback((cs: CharacterSkill) => {
    const name = cs.skill?.nameRu || cs.skill?.name || cs.skillId;
    setInput(`Информация о навыке ${name}`);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white relative">
      <SideMenu activePanel={activePanel} setActivePanel={setActivePanel} />

      {/* Панели */}
      <div className="relative">
        <CharacterPanel isOpen={activePanel === "character"} onClose={handleClosePanel} />
        <InventoryPanel isOpen={activePanel === "inventory"} onClose={handleClosePanel} onItemClick={handleItemClick} />
        <TechniquesPanel isOpen={activePanel === "techniques"} onClose={handleClosePanel} onTechniqueClick={handleTechniqueClick} />
        <SkillsPanel isOpen={activePanel === "skills"} onClose={handleClosePanel} onSkillClick={handleSkillClick} />
        <MapPanel isOpen={activePanel === "map"} onClose={handleClosePanel} />
        <QuestsPanel isOpen={activePanel === "quests"} onClose={handleClosePanel} />
        <RelationsPanel isOpen={activePanel === "relations"} onClose={handleClosePanel} />
      </div>

      {/* Хедер */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 flex-shrink-0 ml-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-lg font-semibold text-amber-400 flex-shrink-0">🌸 Cultivation Simulator</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700 min-w-[90px]" onClick={handleTogglePause}>
              {isPaused ? "▶️ Запуск" : "⏸️ Пауза"}
            </Button>
            <Button variant="outline" size="sm" className="border-emerald-600 text-emerald-400 hover:bg-emerald-900/30 min-w-[150px]" onClick={onSaveAndExit}>
              💾 Сохранить и выйти
            </Button>
            <Button variant="outline" size="sm" className="border-amber-600 text-amber-400 hover:bg-amber-900/30 min-w-[120px]" onClick={onNewGame}>
              🔄 Новая игра
            </Button>
          </div>
        </div>
      </header>

      <StatusBar />

      {/* Основная область */}
      <div className="flex-1 overflow-y-auto p-4 flex justify-center ml-12">
        <div className="w-full max-w-[100ch]">
          {messages.map((message) => (
            <MessageBubble key={String(message.id)} message={message} />
          ))}
          {isLoading && (
            <div className="flex justify-start mb-3">
              <div className="bg-slate-700/50 border border-slate-600/30 p-3 rounded-lg">
                <div className="text-sm text-slate-400 animate-pulse">📖 Рассказчик думает...</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Подсказки команд */}
      <div className="px-4 py-1 text-xs text-slate-500 border-t border-slate-700/50 flex justify-center ml-12">
        <div className="max-w-[100ch] w-full">
          Команды: !! (действие ГГ) | -- (запрос мира) | --- (строгий режим) | --ПМ (проверка мира)
        </div>
      </div>

      {/* Поле ввода */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50 flex justify-center ml-12">
        <div className="w-full max-w-[100ch] flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Введите действие или команду..."
            className="flex-1 bg-slate-700 border-slate-600 focus:border-amber-500/50"
            disabled={isLoading}
          />
          <Button className="bg-amber-600 hover:bg-amber-700" onClick={handleSend} disabled={isLoading || !input.trim()}>
            Отправить
          </Button>
        </div>
      </div>
    </div>
  );
}
