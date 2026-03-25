'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Sword,
  Package,
  Loader2,
  Shield,
  Shirt,
} from 'lucide-react';
import { RARITY_TEXT_COLORS } from '@/types/rarity';
import { ELEMENT_LUCIDE_ICONS, type Element } from '@/lib/constants/elements';
import { 
  TECHNIQUE_GRADE_CONFIGS, 
  type TechniqueGrade,
  type EquipmentGrade,
} from '@/types/grade';

// Создаём React элементы для иконок элементов
const ELEMENT_ICONS: Record<string, React.ReactNode> = {
  fire: <ELEMENT_LUCIDE_ICONS.fire className="w-4 h-4 text-orange-400" />,
  water: <ELEMENT_LUCIDE_ICONS.water className="w-4 h-4 text-blue-400" />,
  earth: <ELEMENT_LUCIDE_ICONS.earth className="w-4 h-4 text-amber-600" />,
  air: <ELEMENT_LUCIDE_ICONS.air className="w-4 h-4 text-cyan-300" />,
  lightning: <ELEMENT_LUCIDE_ICONS.lightning className="w-4 h-4 text-yellow-400" />,
  void: <ELEMENT_LUCIDE_ICONS.void className="w-4 h-4 text-purple-400" />,
  neutral: <ELEMENT_LUCIDE_ICONS.neutral className="w-4 h-4 text-gray-400" />,
};

interface GeneratedObjectsViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ==================== ТЕХНИКИ ====================

// Типы подтехник для разных категорий
type CombatSubtype = 'melee_strike' | 'melee_weapon' | 'ranged_projectile' | 'ranged_beam' | 'ranged_aoe';
type DefenseSubtype = 'block' | 'dodge' | 'parry' | 'absorb' | 'reflect';
type CurseSubtype = 'direct' | 'area' | 'chain';
type PoisonSubtype = 'contact' | 'ingestion' | 'inhalation';

interface TechniqueModifiers {
  effects: {
    burning?: boolean;
    freezing?: boolean;
    slow?: boolean;
    stun?: boolean;
    poison?: boolean;
    heal?: boolean;
    shield?: boolean;
    buff?: boolean;
    debuff?: boolean;
    leech?: boolean;
    aoe?: boolean;
    pierce?: boolean;
    knockback?: boolean;
  };
  effectValues: {
    burningDamage?: number;
    burningDuration?: number;
    freezingDuration?: number;
    slowPercent?: number;
    slowDuration?: number;
    stunDuration?: number;
    poisonDamage?: number;
    poisonDuration?: number;
    healAmount?: number;
    shieldHP?: number;
    shieldDuration?: number;
    buffStat?: string;
    buffAmount?: number;
    buffDuration?: number;
    debuffStat?: string;
    debuffAmount?: number;
    debuffDuration?: number;
    leechPercent?: number;
    aoeRadius?: number;
    piercePercent?: number;
    knockbackDistance?: number;
  };
  penalties: {
    selfDamage?: number;
    qiCostMultiplier?: number;
    healthCost?: number;
    cooldownMultiplier?: number;
    fatigueCost?: number;
    rangePenalty?: number;
  };
  bonuses: {
    damageMultiplier?: number;
    castSpeedMultiplier?: number;
    rangeMultiplier?: number;
    critChance?: number;
    critDamage?: number;
    efficiencyBonus?: number;
  };
}

interface TechniqueStatRequirements {
  strength?: number;
  agility?: number;
  intelligence?: number;
  conductivity?: number;
}

interface DamageFalloffRange {
  fullDamage: number;
  halfDamage: number;
  max: number;
}

interface Technique {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: string;
  subtype?: CombatSubtype | DefenseSubtype | CurseSubtype | PoisonSubtype;
  element: string;
  level: number;
  rarity: string;
  /** Грейд техники (новая система Матрёшка) */
  grade?: TechniqueGrade;
  baseDamage: number;
  baseQiCost: number;
  baseRange: number;
  baseDuration: number;
  baseCapacity: number;
  minCultivationLevel: number;
  statRequirements?: TechniqueStatRequirements;
  weaponCategory?: string;
  weaponType?: string;
  damageFalloff?: DamageFalloffRange;
  isRangedQi?: boolean;
  modifiers?: TechniqueModifiers;
  computed: {
    finalDamage: number;
    finalQiCost: number;
    finalRange: number;
    finalDuration: number;
    activeEffects: { type: string; value: number; duration?: number }[];
  };
  meta?: {
    seed: number;
    template: string;
    generatedAt: string;
    generatorVersion: string;
  };
}

// ==================== ФОРМАЦИИ ====================

interface Formation {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  type: 'defensive' | 'offensive' | 'support' | 'special';
  shape: string;
  level: number;
  rarity: string;
  /** Грейд формации (новая система Матрёшка) */
  grade?: TechniqueGrade;
  positions: Array<{
    x: number;
    y: number;
    role: 'leader' | 'core' | 'support' | 'auxiliary';
  }>;
  effects: {
    damageReduction?: number;
    damageSharing?: number;
    shieldHP?: number;
    damageBonus?: number;
    critChance?: number;
    attackSpeed?: number;
    qiRegen?: number;
    hpRegen?: number;
    fatigueReduction?: number;
    range?: number;
    duration?: number;
  };
  requirements: {
    minParticipants: number;
    maxParticipants: number;
    minCultivationLevel: number;
  };
  qiCostPerMinute: number;
  setupTime: number;
}

// ==================== ЭКИПИРОВКА ====================

// V1 формат (старый)
interface EquipmentItemV1 {
  id: string;
  name: string;
  nameEn?: string;
  description: string;
  type: string;           // weapon, armor, accessory, consumable, qi_stone, charger
  category: string;       // weapon_sword, armor_torso, etc.
  rarity: string;
  icon?: string;
  
  // Размеры
  sizeWidth?: number;
  sizeHeight?: number;
  
  // Статы (v1)
  stats?: {
    damage?: number;
    defense?: number;
    qiBonus?: number;
    healthBonus?: number;
    fatigueReduction?: number;
  };
  
  // Эффекты
  effects?: Array<{
    type: string;
    value: number;
    duration?: number;
  }>;
  
  // Требования
  requirements?: {
    level?: number;
    strength?: number;
    agility?: number;
    intelligence?: number;
  };
  
  // Стоимость
  value?: number;
  currency?: string;
}

// V2 формат (архитектура "Матрёшка")
interface EquipmentItemV2 {
  id: string;
  name: string;
  type: string;
  level: number;
  
  // Материал
  materialId: string;
  material?: {
    id: string;
    name: string;
    tier: number;
    category: string;
  };
  
  // Грейд
  grade: string;  // damaged, common, refined, perfect, transcendent
  gradeConfig?: {
    grade: string;
    name: string;
    color: string;
    damageMultiplier: number;
    durabilityMultiplier: number;
  };
  
  // Эффективные параметры (v2)
  effectiveStats?: {
    damage: number;
    defense: number;
    qiConductivity: number;
    weight: number;
  };
  
  // Прочность
  durability?: {
    current: number;
    max: number;
    condition: string;
    repairCount: number;
  };
  
  // Бонусы
  bonuses?: Array<{
    id: string;
    type: string;
    category: string;
    value: number;
    isMultiplier: boolean;
    source: string;
  }>;
  
  // Специальные эффекты
  specialEffects?: string[];
  
  // Требования
  requirements?: {
    level?: number;
    strength?: number;
    agility?: number;
    intelligence?: number;
    vitality?: number;
  };
  
  // Описание и стоимость
  description?: string;
  value?: number;
  icon?: string;
  rarity?: string; // Для совместимости с v1 отображением
}

// Объединённый тип
type EquipmentItem = EquipmentItemV1 & Partial<EquipmentItemV2>;



const ITEM_TYPE_NAMES: Record<string, string> = {
  weapon: '⚔️ Оружие',
  armor: '🛡️ Броня',
  accessory: '💎 Аксессуар',
  consumable: '💊 Расходник',
  qi_stone: '✨ Камень Ци',
  charger: '⚡ Зарядник',
};

const ITEM_CATEGORY_NAMES: Record<string, string> = {
  // Оружие
  weapon_sword: '🗡️ Меч',
  weapon_saber: '⚔️ Сабля',
  weapon_spear: '🔱 Копьё',
  weapon_staff: '🪄 Посох',
  weapon_fan: '🪭 Веер',
  weapon_bow: '🏹 Лук',
  // Броня
  armor_head: '🪖 Шлем',
  armor_torso: '👕 Доспех',
  armor_legs: '👖 Поножи',
  armor_feet: '👢 Сапоги',
  armor_hands: '🧤 Перчатки',
  // Аксессуары
  accessory_ring: '💍 Кольцо',
  accessory_necklace: '📿 Ожерелье',
  accessory_bracelet: '🎰 Браслет',
};

// ELEMENT_ICONS импортируется из @/lib/constants/elements

const TYPE_NAMES: Record<string, string> = {
  combat: '⚔️ Атакующая',
  defense: '🛡️ Защитная',
  cultivation: '🧘 Культивация',
  support: '✨ Поддержка',
  movement: '🏃 Перемещение',
  sensory: '👁️ Восприятие',
  healing: '💚 Исцеление',
  curse: '💀 Проклятие',
  poison: '☠️ Отравление',
};

const FORMATION_TYPE_NAMES: Record<string, string> = {
  defensive: '🛡️ Защитная',
  offensive: '⚔️ Атакующая',
  support: '💚 Поддержка',
  special: '✨ Специальная',
};

// RARITY_COLORS импортируется из @/types/rarity

export function GeneratedObjectsViewer({ open, onOpenChange }: GeneratedObjectsViewerProps) {
  // Техники
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [filteredTechniques, setFilteredTechniques] = useState<Technique[]>([]);
  const [selectedTechnique, setSelectedTechnique] = useState<Technique | null>(null);
  
  // Формации
  const [formations, setFormations] = useState<Formation[]>([]);
  const [filteredFormations, setFilteredFormations] = useState<Formation[]>([]);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  
  // Экипировка
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<EquipmentItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<EquipmentItem | null>(null);
  
  // Общее
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState<'none' | 'techniques' | 'formations' | 'items' | 'both'>('none');
  const [activeTab, setActiveTab] = useState<'techniques' | 'formations' | 'items'>('techniques');
  
  // Фильтры техник
  const [techSearch, setTechSearch] = useState('');
  const [techLevelFilter, setTechLevelFilter] = useState<string>('all');
  const [techTypeFilter, setTechTypeFilter] = useState<string>('all');
  const [techElementFilter, setTechElementFilter] = useState<string>('all');
  const [techGradeFilter, setTechGradeFilter] = useState<string>('all');
  
  // Фильтры формаций
  const [formSearch, setFormSearch] = useState('');
  const [formLevelFilter, setFormLevelFilter] = useState<string>('all');
  const [formTypeFilter, setFormTypeFilter] = useState<string>('all');
  const [formGradeFilter, setFormGradeFilter] = useState<string>('all');
  
  // Фильтры экипировки
  const [itemSearch, setItemSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [itemRarityFilter, setItemRarityFilter] = useState<string>('all');

  // Применяем фильтры техник
  useEffect(() => {
    if (techniques.length === 0) return;
    
    let filtered = [...techniques];
    
    if (techSearch) {
      const searchLower = techSearch.toLowerCase();
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchLower) ||
        t.nameEn.toLowerCase().includes(searchLower) ||
        t.id.toLowerCase().includes(searchLower)
      );
    }
    
    if (techLevelFilter !== 'all') {
      filtered = filtered.filter(t => t.level === parseInt(techLevelFilter));
    }
    
    if (techTypeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === techTypeFilter);
    }
    
    if (techElementFilter !== 'all') {
      filtered = filtered.filter(t => t.element === techElementFilter);
    }
    
    // Фильтр по Grade (новая система)
    if (techGradeFilter !== 'all') {
      filtered = filtered.filter(t => t.grade === techGradeFilter);
    }
    
    setFilteredTechniques(filtered);
  }, [techniques, techSearch, techLevelFilter, techTypeFilter, techElementFilter, techGradeFilter]);

  // Применяем фильтры формаций
  useEffect(() => {
    if (formations.length === 0) return;
    
    let filtered = [...formations];
    
    if (formSearch) {
      const searchLower = formSearch.toLowerCase();
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(searchLower) ||
        f.id.toLowerCase().includes(searchLower)
      );
    }
    
    if (formLevelFilter !== 'all') {
      filtered = filtered.filter(f => f.level === parseInt(formLevelFilter));
    }
    
    if (formTypeFilter !== 'all') {
      filtered = filtered.filter(f => f.type === formTypeFilter);
    }
    
    // Фильтр по Grade для формаций
    if (formGradeFilter !== 'all') {
      filtered = filtered.filter(f => f.grade === formGradeFilter);
    }
    
    setFilteredFormations(filtered);
  }, [formations, formSearch, formLevelFilter, formTypeFilter, formGradeFilter]);

  // Применяем фильтры экипировки
  useEffect(() => {
    if (items.length === 0) return;
    
    let filtered = [...items];
    
    if (itemSearch) {
      const searchLower = itemSearch.toLowerCase();
      filtered = filtered.filter(i => 
        i.name.toLowerCase().includes(searchLower) ||
        i.id.toLowerCase().includes(searchLower) ||
        (i.nameEn?.toLowerCase().includes(searchLower))
      );
    }
    
    if (itemTypeFilter !== 'all') {
      filtered = filtered.filter(i => i.type === itemTypeFilter);
    }
    
    if (itemRarityFilter !== 'all') {
      filtered = filtered.filter(i => i.rarity === itemRarityFilter);
    }
    
    setFilteredItems(filtered);
  }, [items, itemSearch, itemTypeFilter, itemRarityFilter]);

  const loadTechniques = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generator/techniques?action=list');
      const data = await res.json();
      if (data.success) {
        setTechniques(data.techniques);
        setLoaded(prev => prev === 'formations' || prev === 'both' ? 'both' : 'techniques');
      }
    } catch (error) {
      console.error('Failed to load techniques:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFormations = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generator/formations?action=list');
      const data = await res.json();
      if (data.success) {
        setFormations(data.formations);
        setLoaded(prev => prev === 'techniques' || prev === 'items' || prev === 'both' ? 'both' : 'formations');
      }
    } catch (error) {
      console.error('Failed to load formations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/generator/equipment?action=list');
      const data = await res.json();
      if (data.success) {
        setItems(data.items);
        setLoaded(prev => prev === 'techniques' || prev === 'formations' || prev === 'both' || prev === 'npcs' ? 'both' : 'items');
      }
    } catch (error) {
      console.error('Failed to load items:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [techRes, formRes, itemsRes] = await Promise.all([
        fetch('/api/generator/techniques?action=list'),
        fetch('/api/generator/formations?action=list'),
        fetch('/api/generator/equipment?action=list'),
      ]);
      
      const techData = await techRes.json();
      const formData = await formRes.json();
      const itemsData = await itemsRes.json();
      
      if (techData.success) setTechniques(techData.techniques);
      if (formData.success) setFormations(formData.formations);
      if (itemsData.success) setItems(itemsData.items);
      
      setLoaded('both');
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-amber-400">
            📦 Сгенерированные объекты
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'techniques' | 'formations' | 'items')} className="w-full">
          <div className="flex items-center justify-between mb-3">
            <TabsList className="bg-slate-800">
              <TabsTrigger value="techniques" className="text-xs">
                ⚔️ Техники ({loaded !== 'none' ? techniques.length : '-'})
              </TabsTrigger>
              <TabsTrigger value="items" className="text-xs">
                🎒 Экипировка ({loaded !== 'none' ? items.length : '-'})
              </TabsTrigger>
              <TabsTrigger value="formations" className="text-xs">
                🛡️ Формации ({loaded !== 'none' ? formations.length : '-'})
              </TabsTrigger>
            </TabsList>
            
            <Button
              onClick={loadAll}
              disabled={loading}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Package className="w-4 h-4" />
              )}
              {loaded !== 'none' ? 'Обновить' : 'Загрузить всё'}
            </Button>
          </div>

          {/* ==================== ТЕХНИКИ ==================== */}
          <TabsContent value="techniques" className="mt-0">
            <div className="flex gap-4 h-[60vh]">
              {/* Список */}
              <div className="w-1/2 flex flex-col min-h-0">
                {/* Фильтры */}
                <div className="mb-3 space-y-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                      <Input
                        value={techSearch}
                        onChange={(e) => setTechSearch(e.target.value)}
                        placeholder="Поиск по названию или ID..."
                        className="pl-8 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={techLevelFilter} onValueChange={setTechLevelFilter}>
                      <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Уровень" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все уровни</SelectItem>
                        {Array.from({ length: 9 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            Ур. {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={techTypeFilter} onValueChange={setTechTypeFilter}>
                      <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Тип" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="combat">⚔️ Атакующая</SelectItem>
                        <SelectItem value="defense">🛡️ Защитная</SelectItem>
                        <SelectItem value="cultivation">🧘 Культивация</SelectItem>
                        <SelectItem value="support">✨ Поддержка</SelectItem>
                        <SelectItem value="movement">🏃 Перемещение</SelectItem>
                        <SelectItem value="sensory">👁️ Восприятие</SelectItem>
                        <SelectItem value="healing">💚 Исцеление</SelectItem>
                        <SelectItem value="curse">💀 Проклятие</SelectItem>
                        <SelectItem value="poison">☠️ Отравление</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={techElementFilter} onValueChange={setTechElementFilter}>
                      <SelectTrigger className="w-28 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Элемент" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="fire">🔥 Огонь</SelectItem>
                        <SelectItem value="water">💧 Вода</SelectItem>
                        <SelectItem value="earth">🪨 Земля</SelectItem>
                        <SelectItem value="air">💨 Воздух</SelectItem>
                        <SelectItem value="lightning">⚡ Молния</SelectItem>
                        <SelectItem value="void">🌑 Пустота</SelectItem>
                        <SelectItem value="neutral">⚪ Нейтральный</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Grade Filter - новая система Матрёшка */}
                    <Select value={techGradeFilter} onValueChange={setTechGradeFilter}>
                      <SelectTrigger className="w-28 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Grade" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все Grade</SelectItem>
                        {Object.entries(TECHNIQUE_GRADE_CONFIGS).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            <span className={config.color}>{config.icon} {config.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Результаты */}
                {techniques.length > 0 ? (
                  <>
                    <div className="text-xs text-slate-400 mb-2 flex-shrink-0">
                      Найдено: {filteredTechniques.length} из {techniques.length}
                    </div>

                    <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
                      {loading ? (
                        <div className="p-4 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Загрузка...
                        </div>
                      ) : filteredTechniques.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          Нет объектов, соответствующих фильтрам
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-700">
                          {filteredTechniques.slice(0, 500).map((tech) => (
                            <div
                              key={tech.id}
                              onClick={() => setSelectedTechnique(tech)}
                              className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                                selectedTechnique?.id === tech.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {ELEMENT_ICONS[tech.element]}
                                  <span className="text-sm font-medium text-white">{tech.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs border-slate-500 text-white">
                                    Ур. {tech.level}
                                  </Badge>
                                  {/* Grade Badge - новая система Матрёшка */}
                                  {tech.grade && (
                                    <Badge 
                                      variant="outline" 
                                      className={`text-xs border-current ${TECHNIQUE_GRADE_CONFIGS[tech.grade as TechniqueGrade]?.color || 'text-gray-400'}`}
                                      style={{ borderColor: TECHNIQUE_GRADE_CONFIGS[tech.grade as TechniqueGrade]?.colorHex }}
                                    >
                                      {TECHNIQUE_GRADE_CONFIGS[tech.grade as TechniqueGrade]?.icon} {TECHNIQUE_GRADE_CONFIGS[tech.grade as TechniqueGrade]?.name}
                                    </Badge>
                                  )}
                                  {/* Rarity indicator - deprecated, для старых объектов */}
                                  {!tech.grade && (
                                    <span className={`text-xs ${RARITY_TEXT_COLORS[tech.rarity]}`}>
                                      {tech.rarity === 'legendary' ? '★' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {TYPE_NAMES[tech.type]} • {tech.id}
                                {tech.computed.finalDamage > 0 && ` • Урон: ${tech.computed.finalDamage}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-slate-700 rounded-lg">
                    <Sword className="w-16 h-16 text-slate-600 mb-4" />
                    <p className="text-slate-400 mb-2 text-center">
                      Нажмите "Загрузить всё" для отображения данных
                    </p>
                    <p className="text-xs text-slate-500 text-center">
                      Или сгенерируйте техники в Настройках → Генератор
                    </p>
                  </div>
                )}
              </div>

              {/* Детали техники */}
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 h-full overflow-hidden flex flex-col">
                {selectedTechnique ? (
                  <ScrollArea className="flex-1 h-full">
                    <div className="space-y-4 pr-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {ELEMENT_ICONS[selectedTechnique.element]}
                        <h3 className="text-xl font-bold text-white">{selectedTechnique.name}</h3>
                      </div>
                      <p className="text-sm text-slate-400">{selectedTechnique.nameEn}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="border-slate-500 text-white">
                        {TYPE_NAMES[selectedTechnique.type]}
                      </Badge>
                      {selectedTechnique.subtype && (
                        <Badge variant="outline" className="border-purple-500 text-purple-400">
                          {selectedTechnique.subtype}
                        </Badge>
                      )}
                      <Badge variant="outline" className="border-slate-500 text-white">
                        Уровень {selectedTechnique.level}
                      </Badge>
                      <Badge className={`
                        ${selectedTechnique.rarity === 'common' ? 'bg-slate-600' : ''}
                        ${selectedTechnique.rarity === 'uncommon' ? 'bg-green-600' : ''}
                        ${selectedTechnique.rarity === 'rare' ? 'bg-blue-600' : ''}
                        ${selectedTechnique.rarity === 'legendary' ? 'bg-amber-600' : ''}
                      `}>
                        {selectedTechnique.rarity}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-300">{selectedTechnique.description}</p>

                    {/* Базовые параметры */}
                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                      <h4 className="text-sm font-medium text-amber-400">Базовые параметры</h4>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Базовый урон:</span>
                          <span className="text-red-400">{selectedTechnique.baseDamage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Базовая Ци:</span>
                          <span className="text-cyan-400">{selectedTechnique.baseQiCost}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Базовая дальность:</span>
                          <span className="text-green-400">{selectedTechnique.baseRange} м</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Базовая длительность:</span>
                          <span className="text-purple-400">{selectedTechnique.baseDuration} сек</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Базовая ёмкость:</span>
                          <span className="text-amber-400">{selectedTechnique.baseCapacity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Мин. ур. культивации:</span>
                          <span className="text-white">{selectedTechnique.minCultivationLevel}</span>
                        </div>
                      </div>
                    </div>

                    {/* Итоговые параметры */}
                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                      <h4 className="text-sm font-medium text-amber-400">Итоговые параметры</h4>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Финальный урон:</span>
                          <span className="text-red-400 font-bold">{selectedTechnique.computed.finalDamage}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Финальная Ци:</span>
                          <span className="text-cyan-400 font-bold">{selectedTechnique.computed.finalQiCost}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Финальная дальность:</span>
                          <span className="text-green-400 font-bold">{selectedTechnique.computed.finalRange} м</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Финальная длительность:</span>
                          <span className="text-purple-400 font-bold">{selectedTechnique.computed.finalDuration} сек</span>
                        </div>
                      </div>
                    </div>

                    {/* Требования к характеристикам */}
                    {selectedTechnique.statRequirements && Object.keys(selectedTechnique.statRequirements).length > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Требования к характеристикам</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedTechnique.statRequirements.strength && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Сила:</span>
                              <span className="text-red-400">{selectedTechnique.statRequirements.strength}</span>
                            </div>
                          )}
                          {selectedTechnique.statRequirements.agility && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ловкость:</span>
                              <span className="text-green-400">{selectedTechnique.statRequirements.agility}</span>
                            </div>
                          )}
                          {selectedTechnique.statRequirements.intelligence && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Интеллект:</span>
                              <span className="text-blue-400">{selectedTechnique.statRequirements.intelligence}</span>
                            </div>
                          )}
                          {selectedTechnique.statRequirements.conductivity && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Проводимость:</span>
                              <span className="text-cyan-400">{selectedTechnique.statRequirements.conductivity}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Оружие */}
                    {(selectedTechnique.weaponCategory || selectedTechnique.weaponType) && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Требования к оружию</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedTechnique.weaponCategory && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Категория:</span>
                              <span className="text-white">{selectedTechnique.weaponCategory}</span>
                            </div>
                          )}
                          {selectedTechnique.weaponType && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Тип:</span>
                              <span className="text-white">{selectedTechnique.weaponType}</span>
                            </div>
                          )}
                          {selectedTechnique.isRangedQi && (
                            <div className="flex justify-between col-span-2">
                              <span className="text-slate-400">Дистанционная Ци:</span>
                              <span className="text-cyan-400">Да</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Падение урона */}
                    {selectedTechnique.damageFalloff && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Падение урона</h4>
                        
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div className="flex flex-col">
                            <span className="text-slate-400 text-xs">Полный урон</span>
                            <span className="text-green-400">{selectedTechnique.damageFalloff.fullDamage} м</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-400 text-xs">Половина урона</span>
                            <span className="text-yellow-400">{selectedTechnique.damageFalloff.halfDamage} м</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-400 text-xs">Макс. дальность</span>
                            <span className="text-red-400">{selectedTechnique.damageFalloff.max} м</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Модификаторы: Эффекты */}
                    {selectedTechnique.modifiers?.effects && Object.values(selectedTechnique.modifiers.effects).some(Boolean) && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Эффекты модификаторов</h4>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(selectedTechnique.modifiers.effects)
                            .filter(([_, active]) => active)
                            .map(([effect]) => (
                              <Badge key={effect} variant="outline" className="border-purple-500 text-purple-400">
                                {effect}
                              </Badge>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Значения эффектов */}
                    {selectedTechnique.modifiers?.effectValues && Object.keys(selectedTechnique.modifiers.effectValues).length > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Значения эффектов</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedTechnique.modifiers.effectValues.burningDamage && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Урон горением:</span>
                              <span className="text-orange-400">{selectedTechnique.modifiers.effectValues.burningDamage}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.effectValues.burningDuration && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Длительность горения:</span>
                              <span className="text-orange-400">{selectedTechnique.modifiers.effectValues.burningDuration} сек</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.effectValues.freezingDuration && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Длительность заморозки:</span>
                              <span className="text-blue-400">{selectedTechnique.modifiers.effectValues.freezingDuration} сек</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.effectValues.slowPercent && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Замедление:</span>
                              <span className="text-cyan-400">{selectedTechnique.modifiers.effectValues.slowPercent}%</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.effectValues.stunDuration && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Длительность оглушения:</span>
                              <span className="text-yellow-400">{selectedTechnique.modifiers.effectValues.stunDuration} сек</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.effectValues.poisonDamage && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Урон ядом:</span>
                              <span className="text-green-400">{selectedTechnique.modifiers.effectValues.poisonDamage}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.effectValues.healAmount && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Исцеление:</span>
                              <span className="text-green-400">{selectedTechnique.modifiers.effectValues.healAmount}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.effectValues.shieldHP && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Щит HP:</span>
                              <span className="text-blue-400">{selectedTechnique.modifiers.effectValues.shieldHP}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.effectValues.leechPercent && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Вампиризм:</span>
                              <span className="text-red-400">{selectedTechnique.modifiers.effectValues.leechPercent}%</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.effectValues.aoeRadius && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Радиус AoE:</span>
                              <span className="text-purple-400">{selectedTechnique.modifiers.effectValues.aoeRadius} м</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.effectValues.knockbackDistance && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Отбрасывание:</span>
                              <span className="text-white">{selectedTechnique.modifiers.effectValues.knockbackDistance} м</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Штрафы */}
                    {selectedTechnique.modifiers?.penalties && Object.keys(selectedTechnique.modifiers.penalties).length > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-red-400">⚠️ Штрафы</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedTechnique.modifiers.penalties.selfDamage && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Самоурон:</span>
                              <span className="text-red-400">{selectedTechnique.modifiers.penalties.selfDamage}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.penalties.qiCostMultiplier && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Множитель Ци:</span>
                              <span className="text-red-400">×{selectedTechnique.modifiers.penalties.qiCostMultiplier}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.penalties.healthCost && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Стоимость HP:</span>
                              <span className="text-red-400">{selectedTechnique.modifiers.penalties.healthCost}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.penalties.cooldownMultiplier && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Множитель кулдауна:</span>
                              <span className="text-red-400">×{selectedTechnique.modifiers.penalties.cooldownMultiplier}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.penalties.fatigueCost && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Стоимость усталости:</span>
                              <span className="text-red-400">{selectedTechnique.modifiers.penalties.fatigueCost}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.penalties.rangePenalty && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Штраф дальности:</span>
                              <span className="text-red-400">-{selectedTechnique.modifiers.penalties.rangePenalty}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Бонусы */}
                    {selectedTechnique.modifiers?.bonuses && Object.keys(selectedTechnique.modifiers.bonuses).length > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-green-400">✨ Бонусы</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedTechnique.modifiers.bonuses.damageMultiplier && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Множитель урона:</span>
                              <span className="text-green-400">×{selectedTechnique.modifiers.bonuses.damageMultiplier}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.bonuses.castSpeedMultiplier && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Скорость каста:</span>
                              <span className="text-green-400">×{selectedTechnique.modifiers.bonuses.castSpeedMultiplier}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.bonuses.rangeMultiplier && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Множитель дальности:</span>
                              <span className="text-green-400">×{selectedTechnique.modifiers.bonuses.rangeMultiplier}</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.bonuses.critChance && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Шанс крита:</span>
                              <span className="text-green-400">+{selectedTechnique.modifiers.bonuses.critChance}%</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.bonuses.critDamage && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Урон крита:</span>
                              <span className="text-green-400">+{selectedTechnique.modifiers.bonuses.critDamage}%</span>
                            </div>
                          )}
                          {selectedTechnique.modifiers.bonuses.efficiencyBonus && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Эффективность:</span>
                              <span className="text-green-400">+{selectedTechnique.modifiers.bonuses.efficiencyBonus}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Активные эффекты (computed) */}
                    {selectedTechnique.computed.activeEffects.length > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Активные эффекты</h4>
                        <div className="space-y-1">
                          {selectedTechnique.computed.activeEffects.map((effect, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="border-purple-500 text-purple-400">
                                {effect.type}
                              </Badge>
                              <span className="text-white">{effect.value}</span>
                              {effect.duration && (
                                <span className="text-slate-400 text-xs">({effect.duration} сек)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Мета-информация */}
                    {selectedTechnique.meta && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Мета-информация</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Seed:</span>
                            <span className="text-slate-300">{selectedTechnique.meta.seed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Шаблон:</span>
                            <span className="text-slate-300">{selectedTechnique.meta.template}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-slate-400">Сгенерировано:</span>
                            <span className="text-slate-300 text-xs">{selectedTechnique.meta.generatedAt}</span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-slate-400">Версия генератора:</span>
                            <span className="text-slate-300">{selectedTechnique.meta.generatorVersion}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ID */}
                    <div className="text-xs text-slate-500">
                      ID: {selectedTechnique.id}
                    </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Sword className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите технику для просмотра</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== ЭКИПИРОВКА ==================== */}
          <TabsContent value="items" className="mt-0">
            <div className="flex gap-4 h-[60vh]">
              {/* Список */}
              <div className="w-1/2 flex flex-col min-h-0">
                {/* Фильтры */}
                <div className="mb-3 space-y-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                      <Input
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder="Поиск по названию или ID..."
                        className="pl-8 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
                      <SelectTrigger className="w-36 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Тип" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="weapon">⚔️ Оружие</SelectItem>
                        <SelectItem value="armor">🛡️ Броня</SelectItem>
                        <SelectItem value="accessory">💎 Аксессуар</SelectItem>
                        <SelectItem value="consumable">💊 Расходник</SelectItem>
                        <SelectItem value="qi_stone">✨ Камень Ци</SelectItem>
                        <SelectItem value="charger">⚡ Зарядник</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={itemRarityFilter} onValueChange={setItemRarityFilter}>
                      <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Редкость" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="common">⬜ Обычный</SelectItem>
                        <SelectItem value="uncommon">🟩 Необычный</SelectItem>
                        <SelectItem value="rare">🟦 Редкий</SelectItem>
                        <SelectItem value="epic">🟪 Эпический</SelectItem>
                        <SelectItem value="legendary">🟨 Легендарный</SelectItem>
                        <SelectItem value="mythic">🟥 Мифический</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Результаты */}
                {items.length > 0 ? (
                  <>
                    <div className="text-xs text-slate-400 mb-2 flex-shrink-0">
                      Найдено: {filteredItems.length} из {items.length}
                    </div>

                    <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
                      {loading ? (
                        <div className="p-4 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Загрузка...
                        </div>
                      ) : filteredItems.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          Нет объектов, соответствующих фильтрам
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-700">
                          {filteredItems.slice(0, 500).map((item) => (
                            <div
                              key={item.id}
                              onClick={() => setSelectedItem(item)}
                              className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                                selectedItem?.id === item.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{item.icon}</span>
                                  <span className="text-sm font-medium text-white">{item.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs border-slate-500 text-white">
                                    {ITEM_TYPE_NAMES[item.type]?.split(' ')[0]}
                                  </Badge>
                                  <span className={`text-xs ${RARITY_TEXT_COLORS[item.rarity || (item as any).grade]}`}>
                                    {(item.rarity === 'legendary' || item.rarity === 'mythic' || (item as any).grade === 'transcendent') ? '★' : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {(item as any).material?.name || ITEM_CATEGORY_NAMES[item.category] || item.category} • {item.id}
                                {/* V1 stats */}
                                {item.stats?.damage && ` • Урон: ${item.stats.damage}`}
                                {item.stats?.defense && ` • Защита: ${item.stats.defense}`}
                                {/* V2 effectiveStats */}
                                {(item as any).effectiveStats?.damage && ` • Урон: ${(item as any).effectiveStats.damage}`}
                                {(item as any).effectiveStats?.defense && ` • Защита: ${(item as any).effectiveStats.defense}`}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-slate-700 rounded-lg">
                    <Shirt className="w-16 h-16 text-slate-600 mb-4" />
                    <p className="text-slate-400 mb-2 text-center">
                      Нажмите "Загрузить всё" для отображения данных
                    </p>
                    <p className="text-xs text-slate-500 text-center">
                      Или сгенерируйте экипировку в Настройки → Экипировка
                    </p>
                  </div>
                )}
              </div>

              {/* Детали экипировки */}
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 h-full overflow-hidden flex flex-col">
                {selectedItem ? (
                  <ScrollArea className="flex-1 h-full">
                    <div className="space-y-4 pr-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{selectedItem.icon}</span>
                        <h3 className="text-xl font-bold text-white">{selectedItem.name}</h3>
                      </div>
                      <p className="text-sm text-slate-400">{selectedItem.nameEn || selectedItem.id}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="border-slate-500 text-white">
                        {ITEM_TYPE_NAMES[selectedItem.type]}
                      </Badge>
                      <Badge variant="outline" className="border-slate-500 text-white">
                        {ITEM_CATEGORY_NAMES[selectedItem.category] || selectedItem.category}
                      </Badge>
                      <Badge className={`
                        ${selectedItem.rarity === 'common' ? 'bg-slate-600' : ''}
                        ${selectedItem.rarity === 'uncommon' ? 'bg-green-600' : ''}
                        ${selectedItem.rarity === 'rare' ? 'bg-blue-600' : ''}
                        ${selectedItem.rarity === 'epic' ? 'bg-purple-600' : ''}
                        ${selectedItem.rarity === 'legendary' ? 'bg-amber-600' : ''}
                        ${selectedItem.rarity === 'mythic' ? 'bg-red-600' : ''}
                      `}>
                        {selectedItem.rarity}
                      </Badge>
                      <Badge variant="outline" className="border-slate-500 text-white">
                        {selectedItem.sizeWidth}×{selectedItem.sizeHeight}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-300">{selectedItem.description}</p>

                    {/* Статы */}
                    {selectedItem.stats && Object.keys(selectedItem.stats).length > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Характеристики</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedItem.stats.damage && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Урон:</span>
                              <span className="text-red-400">{selectedItem.stats.damage}</span>
                            </div>
                          )}
                          {selectedItem.stats.defense && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Защита:</span>
                              <span className="text-blue-400">{selectedItem.stats.defense}</span>
                            </div>
                          )}
                          {selectedItem.stats?.qiBonus && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Бонус Ци:</span>
                              <span className="text-cyan-400">+{selectedItem.stats.qiBonus}</span>
                            </div>
                          )}
                          {selectedItem.stats?.healthBonus && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Бонус HP:</span>
                              <span className="text-green-400">+{selectedItem.stats.healthBonus}</span>
                            </div>
                          )}
                          {selectedItem.stats?.fatigueReduction && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Снижение усталости:</span>
                              <span className="text-green-400">{selectedItem.stats.fatigueReduction}%</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* V2: Эффективные параметры (effectiveStats) */}
                    {selectedItem.effectiveStats && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Характеристики (v2)</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedItem.effectiveStats.damage > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Урон:</span>
                              <span className="text-red-400">{selectedItem.effectiveStats.damage}</span>
                            </div>
                          )}
                          {selectedItem.effectiveStats.defense > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Защита:</span>
                              <span className="text-blue-400">{selectedItem.effectiveStats.defense}</span>
                            </div>
                          )}
                          {selectedItem.effectiveStats.qiConductivity > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Проводимость Ци:</span>
                              <span className="text-cyan-400">{selectedItem.effectiveStats.qiConductivity}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-slate-400">Вес:</span>
                            <span className="text-slate-300">{selectedItem.effectiveStats.weight}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* V2: Материал */}
                    {selectedItem.material && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Материал</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-amber-500 text-amber-400">
                            T{selectedItem.material.tier}
                          </Badge>
                          <span className="text-white">{selectedItem.material.name}</span>
                        </div>
                      </div>
                    )}

                    {/* V2: Прочность */}
                    {selectedItem.durability && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Прочность</h4>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Состояние:</span>
                            <span className={`font-medium ${
                              selectedItem.durability.condition === 'pristine' ? 'text-green-400' :
                              selectedItem.durability.condition === 'good' ? 'text-blue-400' :
                              selectedItem.durability.condition === 'worn' ? 'text-yellow-400' :
                              selectedItem.durability.condition === 'damaged' ? 'text-orange-400' :
                              'text-red-400'
                            }`}>
                              {selectedItem.durability.condition}
                            </span>
                          </div>
                          <div className="w-full bg-slate-600 rounded-full h-2">
                            <div 
                              className="h-2 rounded-full bg-gradient-to-r from-green-500 to-green-400"
                              style={{ width: `${(selectedItem.durability.current / selectedItem.durability.max) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-slate-400">
                            <span>{selectedItem.durability.current}/{selectedItem.durability.max}</span>
                            <span>Ремонтов: {selectedItem.durability.repairCount}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* V2: Грейд (вместо rarity) */}
                    {selectedItem.grade && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Качество</h4>
                        <Badge className={`
                          ${selectedItem.grade === 'damaged' ? 'bg-slate-600' : ''}
                          ${selectedItem.grade === 'common' ? 'bg-gray-600' : ''}
                          ${selectedItem.grade === 'refined' ? 'bg-blue-600' : ''}
                          ${selectedItem.grade === 'perfect' ? 'bg-purple-600' : ''}
                          ${selectedItem.grade === 'transcendent' ? 'bg-amber-600' : ''}
                        `}>
                          {selectedItem.gradeConfig?.name || selectedItem.grade}
                        </Badge>
                        {selectedItem.gradeConfig && (
                          <p className="text-xs text-slate-400 mt-1">
                            Множитель урона: ×{selectedItem.gradeConfig.damageMultiplier}
                          </p>
                        )}
                      </div>
                    )}

                    {/* V2: Бонусы */}
                    {selectedItem.bonuses && selectedItem.bonuses.length > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Бонусы</h4>
                        <div className="space-y-1">
                          {selectedItem.bonuses.map((bonus, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="border-purple-500 text-purple-400">
                                {bonus.type}
                              </Badge>
                              <span className="text-white">
                                {bonus.isMultiplier ? `×${bonus.value}` : `+${bonus.value}`}
                              </span>
                              <span className="text-xs text-slate-500">({bonus.source})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Эффекты (V1) */}
                    {selectedItem.effects && selectedItem.effects.length > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Эффекты</h4>
                        <div className="space-y-1">
                          {selectedItem.effects.map((effect, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Badge variant="outline" className="border-purple-500 text-purple-400">
                                {effect.type}
                              </Badge>
                              <span className="text-white">{effect.value}</span>
                              {effect.duration && (
                                <span className="text-slate-400 text-xs">({effect.duration} сек)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Требования */}
                    {selectedItem.requirements && Object.keys(selectedItem.requirements).length > 0 && (
                      <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                        <h4 className="text-sm font-medium text-amber-400">Требования</h4>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {selectedItem.requirements.level && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Уровень:</span>
                              <span className="text-white">{selectedItem.requirements.level}</span>
                            </div>
                          )}
                          {selectedItem.requirements.strength && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Сила:</span>
                              <span className="text-white">{selectedItem.requirements.strength}</span>
                            </div>
                          )}
                          {selectedItem.requirements.agility && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ловкость:</span>
                              <span className="text-white">{selectedItem.requirements.agility}</span>
                            </div>
                          )}
                          {selectedItem.requirements.intelligence && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Интеллект:</span>
                              <span className="text-white">{selectedItem.requirements.intelligence}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Стоимость */}
                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                      <h4 className="text-sm font-medium text-amber-400">Стоимость</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-bold">{selectedItem.value}</span>
                        <span className="text-slate-400 text-sm">
                          {selectedItem.currency === 'spirit_stones' ? 'spirit stones' : selectedItem.currency}
                        </span>
                      </div>
                    </div>

                    {/* ID */}
                    <div className="text-xs text-slate-500">
                      ID: {selectedItem.id}
                    </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Shirt className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите предмет для просмотра</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ==================== ФОРМАЦИИ ==================== */}
          <TabsContent value="formations" className="mt-0">
            <div className="flex gap-4 h-[60vh]">
              {/* Список */}
              <div className="w-1/2 flex flex-col min-h-0">
                {/* Фильтры */}
                <div className="mb-3 space-y-2 flex-shrink-0">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-2 top-2 w-4 h-4 text-slate-400" />
                      <Input
                        value={formSearch}
                        onChange={(e) => setFormSearch(e.target.value)}
                        placeholder="Поиск по названию или ID..."
                        className="pl-8 bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Select value={formLevelFilter} onValueChange={setFormLevelFilter}>
                      <SelectTrigger className="w-24 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Уровень" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все уровни</SelectItem>
                        {Array.from({ length: 9 }, (_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            Ур. {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={formTypeFilter} onValueChange={setFormTypeFilter}>
                      <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-xs text-white">
                        <SelectValue placeholder="Тип" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700">
                        <SelectItem value="all">Все типы</SelectItem>
                        <SelectItem value="defensive">🛡️ Защитная</SelectItem>
                        <SelectItem value="offensive">⚔️ Атакующая</SelectItem>
                        <SelectItem value="support">💚 Поддержка</SelectItem>
                        <SelectItem value="special">✨ Специальная</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Результаты */}
                {formations.length > 0 ? (
                  <>
                    <div className="text-xs text-slate-400 mb-2 flex-shrink-0">
                      Найдено: {filteredFormations.length} из {formations.length}
                    </div>

                    <ScrollArea className="flex-1 min-h-0 border border-slate-700 rounded-lg">
                      {loading ? (
                        <div className="p-4 text-center text-slate-400">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          Загрузка...
                        </div>
                      ) : filteredFormations.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                          Нет объектов, соответствующих фильтрам
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-700">
                          {filteredFormations.slice(0, 500).map((form) => (
                            <div
                              key={form.id}
                              onClick={() => setSelectedFormation(form)}
                              className={`p-2 cursor-pointer hover:bg-slate-800/50 transition-colors ${
                                selectedFormation?.id === form.id ? 'bg-amber-900/20 border-l-2 border-amber-500' : ''
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-4 h-4 text-amber-400" />
                                  <span className="text-sm font-medium text-white">{form.name}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Badge variant="outline" className="text-xs border-slate-500 text-white">
                                    Ур. {form.level}
                                  </Badge>
                                  <span className={`text-xs ${RARITY_TEXT_COLORS[form.rarity]}`}>
                                    {form.rarity === 'legendary' ? '★' : ''}
                                  </span>
                                </div>
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {FORMATION_TYPE_NAMES[form.type]} • {form.id} • {form.requirements.minParticipants}-{form.requirements.maxParticipants} участников
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center border border-slate-700 rounded-lg">
                    <Shield className="w-16 h-16 text-slate-600 mb-4" />
                    <p className="text-slate-400 mb-2 text-center">
                      Нажмите "Загрузить всё" для отображения данных
                    </p>
                    <p className="text-xs text-slate-500 text-center">
                      Или сгенерируйте формации в Настройках → Формации
                    </p>
                  </div>
                )}
              </div>

              {/* Детали формации */}
              <div className="w-1/2 bg-slate-800/30 rounded-lg p-4 h-full overflow-hidden flex flex-col">
                {selectedFormation ? (
                  <ScrollArea className="flex-1 h-full">
                    <div className="space-y-4 pr-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-5 h-5 text-amber-400" />
                        <h3 className="text-xl font-bold text-white">{selectedFormation.name}</h3>
                      </div>
                      <p className="text-sm text-slate-400">{selectedFormation.id}</p>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="outline" className="border-slate-500 text-white">
                        {FORMATION_TYPE_NAMES[selectedFormation.type]}
                      </Badge>
                      <Badge variant="outline" className="border-slate-500 text-white">
                        Уровень {selectedFormation.level}
                      </Badge>
                      <Badge variant="outline" className="border-slate-500 text-white">
                        Форма: {selectedFormation.shape}
                      </Badge>
                      <Badge className={`
                        ${selectedFormation.rarity === 'common' ? 'bg-slate-600' : ''}
                        ${selectedFormation.rarity === 'uncommon' ? 'bg-green-600' : ''}
                        ${selectedFormation.rarity === 'rare' ? 'bg-blue-600' : ''}
                        ${selectedFormation.rarity === 'legendary' ? 'bg-amber-600' : ''}
                      `}>
                        {selectedFormation.rarity}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-300">{selectedFormation.description}</p>

                    {/* Требования */}
                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                      <h4 className="text-sm font-medium text-amber-400">Требования</h4>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Участников:</span>
                          <span className="text-white">{selectedFormation.requirements.minParticipants}-{selectedFormation.requirements.maxParticipants}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Мин. ур. культивации:</span>
                          <span className="text-white">{selectedFormation.requirements.minCultivationLevel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Ци/мин:</span>
                          <span className="text-cyan-400">{selectedFormation.qiCostPerMinute}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Время установки:</span>
                          <span className="text-white">{selectedFormation.setupTime} мин</span>
                        </div>
                      </div>
                    </div>

                    {/* Эффекты */}
                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                      <h4 className="text-sm font-medium text-amber-400">Эффекты</h4>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {selectedFormation.effects.damageReduction && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Снижение урона:</span>
                            <span className="text-green-400">{selectedFormation.effects.damageReduction}%</span>
                          </div>
                        )}
                        {selectedFormation.effects.damageBonus && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Бонус урона:</span>
                            <span className="text-red-400">{selectedFormation.effects.damageBonus}%</span>
                          </div>
                        )}
                        {selectedFormation.effects.shieldHP && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Щит:</span>
                            <span className="text-blue-400">{selectedFormation.effects.shieldHP} HP</span>
                          </div>
                        )}
                        {selectedFormation.effects.critChance && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Шанс крита:</span>
                            <span className="text-yellow-400">{selectedFormation.effects.critChance}%</span>
                          </div>
                        )}
                        {selectedFormation.effects.qiRegen && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Реген Ци:</span>
                            <span className="text-cyan-400">{selectedFormation.effects.qiRegen}/мин</span>
                          </div>
                        )}
                        {selectedFormation.effects.hpRegen && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Реген HP:</span>
                            <span className="text-green-400">{selectedFormation.effects.hpRegen}/мин</span>
                          </div>
                        )}
                        {selectedFormation.effects.range && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Радиус:</span>
                            <span className="text-purple-400">{selectedFormation.effects.range} м</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Позиции */}
                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                      <h4 className="text-sm font-medium text-amber-400">Позиции ({selectedFormation.positions.length})</h4>
                      
                      <div className="flex flex-wrap gap-1">
                        {selectedFormation.positions.map((pos, i) => (
                          <Badge 
                            key={i} 
                            variant="outline" 
                            className={`
                              ${pos.role === 'leader' ? 'border-amber-500 text-amber-400' : ''}
                              ${pos.role === 'core' ? 'border-blue-500 text-blue-400' : ''}
                              ${pos.role === 'support' ? 'border-green-500 text-green-400' : ''}
                              ${pos.role === 'auxiliary' ? 'border-slate-500 text-slate-400' : ''}
                            `}
                          >
                            {pos.role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Выберите формацию для просмотра</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
