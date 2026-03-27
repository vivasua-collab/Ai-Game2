/**
 * Inventory Scene - Overlay UI for inventory management
 * 
 * Features:
 * - Body doll with HP bars for each part
 * - Equipment slots (head, torso, hands, legs, feet, accessories)
 * - Inventory grid with items
 * - Item interaction (use, equip)
 */

import { eventBusClient } from '@/lib/game/event-bus/client';

// ============================================
// CONSTANTS
// ============================================

export const INVENTORY_CELL_SIZE = 40;
export const INVENTORY_COLS = 7;
export const INVENTORY_ROWS = 7;

// Цвета статуса частей тела
export const BODY_STATUS_COLORS: Record<string, number> = {
  healthy: 0x22c55e,
  damaged: 0xeab308,
  crippled: 0xf97316,
  paralyzed: 0xef4444,
  critical: 0xdc2626,
  severed: 0x78350f,
};

// ============================================
// INTERFACES
// ============================================

// Интерфейс для элемента инвентаря (синхронизирован с PhaserGame.tsx)
export interface PhaserInventoryItem {
  id: string;
  name: string;
  nameId?: string;
  description?: string;
  type: "material" | "artifact" | "consumable" | "equipment" | "spirit_stone";
  rarity?: "common" | "uncommon" | "rare" | "legendary";
  icon?: string;
  quantity: number;
  isConsumable: boolean;
  useAction?: string;
  equipmentSlot?: string;
  isEquipped?: boolean;
  effects?: Record<string, number>;
  weight?: number;
  value?: number;
  stackable?: boolean;
  maxStack?: number;
  sizeWidth?: number;
  sizeHeight?: number;
  posX?: number;
  posY?: number;
}

// Конфигурация частей тела для схематичной куклы
export interface BodyPartConfig {
  id: string;
  name: string;
  x: number;
  y: number;
  hpBarOffset: { x: number; y: number };
  slotOffset: { x: number; y: number };
  equipmentSlot: string;
}

// Демо данные HP для частей тела
export interface BodyPartHP {
  functional: { current: number; max: number };
  structural: { current: number; max: number };
  status: string;
}

// ============================================
// CONFIG DATA
// ============================================

export const BODY_PARTS_CONFIG: BodyPartConfig[] = [
  { id: 'head', name: 'Голова', x: 100, y: 25, hpBarOffset: { x: 0, y: -20 }, slotOffset: { x: 0, y: 0 }, equipmentSlot: 'head' },
  { id: 'torso', name: 'Торс', x: 100, y: 75, hpBarOffset: { x: 0, y: -20 }, slotOffset: { x: 0, y: 0 }, equipmentSlot: 'torso' },
  { id: 'left_arm', name: 'Левая рука', x: 50, y: 70, hpBarOffset: { x: -25, y: 0 }, slotOffset: { x: -20, y: 10 }, equipmentSlot: 'left_hand' },
  { id: 'right_arm', name: 'Правая рука', x: 150, y: 70, hpBarOffset: { x: 25, y: 0 }, slotOffset: { x: 20, y: 10 }, equipmentSlot: 'right_hand' },
  { id: 'left_leg', name: 'Левая нога', x: 80, y: 130, hpBarOffset: { x: -20, y: 5 }, slotOffset: { x: 0, y: 20 }, equipmentSlot: 'legs' },
  { id: 'right_leg', name: 'Правая нога', x: 120, y: 130, hpBarOffset: { x: 20, y: 5 }, slotOffset: { x: 0, y: 20 }, equipmentSlot: 'legs' },
];

export const DEMO_BODY_HP: Record<string, BodyPartHP> = {
  head: { functional: { current: 100, max: 100 }, structural: { current: 100, max: 100 }, status: 'healthy' },
  torso: { functional: { current: 60, max: 150 }, structural: { current: 80, max: 100 }, status: 'damaged' },
  left_arm: { functional: { current: 25, max: 80 }, structural: { current: 70, max: 100 }, status: 'crippled' },
  right_arm: { functional: { current: 80, max: 80 }, structural: { current: 100, max: 100 }, status: 'healthy' },
  left_leg: { functional: { current: 90, max: 100 }, structural: { current: 100, max: 100 }, status: 'healthy' },
  right_leg: { functional: { current: 45, max: 100 }, structural: { current: 85, max: 100 }, status: 'damaged' },
};

// ============================================
// SCENE CONFIG
// ============================================

// Глобальная ссылка на инвентарь (устанавливается из PhaserGame.tsx)
let inventoryGetter: (() => PhaserInventoryItem[]) | null = null;

/**
 * Set the inventory getter function
 * Called from PhaserGame.tsx to provide access to global inventory
 */
export function setInventoryGetter(getter: () => PhaserInventoryItem[]): void {
  inventoryGetter = getter;
}

/**
 * Get current inventory items
 */
function getInventory(): PhaserInventoryItem[] {
  return inventoryGetter?.() || [];
}

/**
 * Create the Inventory Scene configuration
 * This is the Phaser scene config for the inventory overlay
 */
export const InventorySceneConfig = {
  key: 'InventoryScene',

  create(this: Phaser.Scene) {
    const scene = this as Phaser.Scene;
    const width = scene.cameras.main.width;
    const height = scene.cameras.main.height;
    
    // === ФОН (полупрозрачный) ===
    const bg = scene.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.85);
    bg.setInteractive();
    
    // === КОНТЕЙНЕР ИНВЕНТАРЯ ===
    const panelWidth = 750;
    const panelHeight = 480;
    const panelX = (width - panelWidth) / 2;
    const panelY = (height - panelHeight) / 2;
    
    // Панель инвентаря
    const panel = scene.add.rectangle(
      panelX + panelWidth / 2, 
      panelY + panelHeight / 2, 
      panelWidth, 
      panelHeight, 
      0x1a1a2e, 
      0.98
    );
    panel.setStrokeStyle(2, 0xfbbf24);
    
    // === ЗАГОЛОВОК ===
    scene.add.text(panelX + 20, panelY + 15, '📦 ИНВЕНТАРЬ', {
      fontSize: '18px',
      color: '#fbbf24',
      fontFamily: 'Arial',
    });
    
    // Закрыть по клику на крестик
    const closeBtn = scene.add.text(panelX + panelWidth - 30, panelY + 10, '✕', {
      fontSize: '20px',
      color: '#ef4444',
      fontFamily: 'Arial',
    });
    closeBtn.setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => {
      scene.scene.stop('InventoryScene');
    });
    closeBtn.on('pointerover', () => closeBtn.setColor('#fbbf24'));
    closeBtn.on('pointerout', () => closeBtn.setColor('#ef4444'));
    
    // === ЛЕВАЯ ПАНЕЛЬ: КУКЛА И ЭКИПИРОВКА ===
    const leftPanelX = panelX + 15;
    const leftPanelY = panelY + 45;
    const leftPanelWidth = 210;
    const leftPanelHeight = 420;
    
    // Фон левой панели
    const leftPanel = scene.add.rectangle(
      leftPanelX + leftPanelWidth / 2,
      leftPanelY + leftPanelHeight / 2,
      leftPanelWidth,
      leftPanelHeight,
      0x0f0f1a,
      0.9
    );
    leftPanel.setStrokeStyle(1, 0x3a3a5a);
    
    // === СХЕМАТИЧНАЯ КУКЛА ТЕЛА ===
    const dollX = leftPanelX + leftPanelWidth / 2;
    const dollY = leftPanelY + 100;
    
    // Рисуем схематичную куклу с Graphics
    const dollGraphics = scene.add.graphics();
    
    // Голова (круг)
    const headHp = DEMO_BODY_HP.head;
    const headColor = BODY_STATUS_COLORS[headHp.status] || BODY_STATUS_COLORS.healthy;
    dollGraphics.fillStyle(headColor, 0.8);
    dollGraphics.fillCircle(dollX, dollY, 20);
    dollGraphics.lineStyle(2, 0xffffff, 0.5);
    dollGraphics.strokeCircle(dollX, dollY, 20);
    
    // Торс (прямоугольник)
    const torsoHp = DEMO_BODY_HP.torso;
    const torsoColor = BODY_STATUS_COLORS[torsoHp.status] || BODY_STATUS_COLORS.healthy;
    dollGraphics.fillStyle(torsoColor, 0.8);
    dollGraphics.fillRect(dollX - 25, dollY + 30, 50, 60);
    dollGraphics.lineStyle(2, 0xffffff, 0.5);
    dollGraphics.strokeRect(dollX - 25, dollY + 30, 50, 60);
    
    // Левая рука (прямоугольник)
    const leftArmHp = DEMO_BODY_HP.left_arm;
    const leftArmColor = BODY_STATUS_COLORS[leftArmHp.status] || BODY_STATUS_COLORS.healthy;
    dollGraphics.fillStyle(leftArmColor, 0.8);
    dollGraphics.fillRect(dollX - 50, dollY + 35, 20, 50);
    dollGraphics.lineStyle(2, 0xffffff, 0.5);
    dollGraphics.strokeRect(dollX - 50, dollY + 35, 20, 50);
    
    // Правая рука (прямоугольник)
    const rightArmHp = DEMO_BODY_HP.right_arm;
    const rightArmColor = BODY_STATUS_COLORS[rightArmHp.status] || BODY_STATUS_COLORS.healthy;
    dollGraphics.fillStyle(rightArmColor, 0.8);
    dollGraphics.fillRect(dollX + 30, dollY + 35, 20, 50);
    dollGraphics.lineStyle(2, 0xffffff, 0.5);
    dollGraphics.strokeRect(dollX + 30, dollY + 35, 20, 50);
    
    // Левая нога (прямоугольник)
    const leftLegHp = DEMO_BODY_HP.left_leg;
    const leftLegColor = BODY_STATUS_COLORS[leftLegHp.status] || BODY_STATUS_COLORS.healthy;
    dollGraphics.fillStyle(leftLegColor, 0.8);
    dollGraphics.fillRect(dollX - 20, dollY + 95, 15, 45);
    dollGraphics.lineStyle(2, 0xffffff, 0.5);
    dollGraphics.strokeRect(dollX - 20, dollY + 95, 15, 45);
    
    // Правая нога (прямоугольник)
    const rightLegHp = DEMO_BODY_HP.right_leg;
    const rightLegColor = BODY_STATUS_COLORS[rightLegHp.status] || BODY_STATUS_COLORS.healthy;
    dollGraphics.fillStyle(rightLegColor, 0.8);
    dollGraphics.fillRect(dollX + 5, dollY + 95, 15, 45);
    dollGraphics.lineStyle(2, 0xffffff, 0.5);
    dollGraphics.strokeRect(dollX + 5, dollY + 95, 15, 45);
    
    // === HP БАРЫ НА ЧАСТЯХ ТЕЛА ===
    const hpBarWidth = 30;
    const hpBarHeight = 4;
    
    // Функция для рисования HP бара
    const drawHpBar = (x: number, y: number, hp: BodyPartHP) => {
      // Функциональный HP (фон + заполнение)
      scene.add.rectangle(x, y, hpBarWidth, hpBarHeight, 0x000000, 0.9);
      const funcPercent = hp.functional.current / hp.functional.max;
      scene.add.rectangle(
        x - hpBarWidth / 2 + (hpBarWidth * funcPercent) / 2,
        y,
        Math.max(1, hpBarWidth * funcPercent),
        hpBarHeight,
        0xdc2626,
        1
      );
      
      // Структурный HP (фон + заполнение)
      scene.add.rectangle(x, y + 5, hpBarWidth, hpBarHeight, 0x000000, 0.9);
      const structPercent = hp.structural.current / hp.structural.max;
      scene.add.rectangle(
        x - hpBarWidth / 2 + (hpBarWidth * structPercent) / 2,
        y + 5,
        Math.max(1, hpBarWidth * structPercent),
        hpBarHeight,
        0x6b7280,
        1
      );
    };
    
    // HP бары для каждой части
    drawHpBar(dollX, dollY - 25, headHp); // Голова
    drawHpBar(dollX, dollY + 25, torsoHp); // Торс
    drawHpBar(dollX - 55, dollY + 55, leftArmHp); // Левая рука
    drawHpBar(dollX + 55, dollY + 55, rightArmHp); // Правая рука
    drawHpBar(dollX - 25, dollY + 115, leftLegHp); // Левая нога
    drawHpBar(dollX + 25, dollY + 115, rightLegHp); // Правая нога
    
    // === СЛОТЫ ЭКИПИРОВКИ ПО КРАЯМ ПАНЕЛИ ===
    const slotSize = 36;
    const slotSpacing = 42;
    
    // Иконки слотов
    const slotIcons: Record<string, string> = {
      head: '🧢',
      torso: '👕',
      left_hand: '🛡️',
      right_hand: '⚔️',
      legs: '👖',
      feet: '👞',
      accessory1: '💍',
      accessory2: '📿',
      back: '🧥',
    };
    
    // Названия слотов
    const slotNames: Record<string, string> = {
      head: 'Голова',
      torso: 'Броня',
      left_hand: 'Левая',
      right_hand: 'Правая',
      legs: 'Ноги',
      feet: 'Обувь',
      accessory1: 'Аксес.1',
      accessory2: 'Аксес.2',
      back: 'Спина',
    };
    
    // ЛЕВАЯ КОЛОНКА слотов (сверху вниз)
    const leftSlots = ['head', 'torso', 'legs', 'feet'];
    const leftColumnX = leftPanelX + 25;
    const leftColumnStartY = leftPanelY + 55;
    
    leftSlots.forEach((slotId, index) => {
      const slotY = leftColumnStartY + index * slotSpacing;
      
      // Фон слота
      const slotBg = scene.add.rectangle(leftColumnX, slotY, slotSize, slotSize, 0x1a1a2e, 0.95);
      slotBg.setStrokeStyle(2, 0x4a4a6a);
      slotBg.setInteractive({ useHandCursor: true });
      
      // Иконка слота
      scene.add.text(leftColumnX, slotY - 2, slotIcons[slotId] || '📦', {
        fontSize: '18px'
      }).setOrigin(0.5);
      
      // Название слота (под иконкой)
      scene.add.text(leftColumnX, slotY + 14, slotNames[slotId] || slotId, {
        fontSize: '7px',
        color: '#9ca3af'
      }).setOrigin(0.5);
      
      // Hover эффект
      slotBg.on('pointerover', () => {
        slotBg.setStrokeStyle(2, 0xfbbf24);
      });
      slotBg.on('pointerout', () => {
        slotBg.setStrokeStyle(2, 0x4a4a6a);
      });
      
      // Данные слота
      slotBg.setData('slotId', slotId);
    });
    
    // ПРАВАЯ КОЛОНКА слотов (сверху вниз)
    const rightSlots = ['right_hand', 'left_hand', 'accessory1', 'accessory2'];
    const rightColumnX = leftPanelX + leftPanelWidth - 25;
    const rightColumnStartY = leftPanelY + 55;
    
    rightSlots.forEach((slotId, index) => {
      const slotY = rightColumnStartY + index * slotSpacing;
      
      // Фон слота
      const slotBg = scene.add.rectangle(rightColumnX, slotY, slotSize, slotSize, 0x1a1a2e, 0.95);
      slotBg.setStrokeStyle(2, 0x4a4a6a);
      slotBg.setInteractive({ useHandCursor: true });
      
      // Иконка слота
      scene.add.text(rightColumnX, slotY - 2, slotIcons[slotId] || '📦', {
        fontSize: '18px'
      }).setOrigin(0.5);
      
      // Название слота (под иконкой)
      scene.add.text(rightColumnX, slotY + 14, slotNames[slotId] || slotId, {
        fontSize: '7px',
        color: '#9ca3af'
      }).setOrigin(0.5);
      
      // Hover эффект
      slotBg.on('pointerover', () => {
        slotBg.setStrokeStyle(2, 0xfbbf24);
      });
      slotBg.on('pointerout', () => {
        slotBg.setStrokeStyle(2, 0x4a4a6a);
      });
      
      // Данные слота
      slotBg.setData('slotId', slotId);
    });
    
    // Легенда HP баров
    const legendY = leftPanelY + leftPanelHeight - 20;
    const legendX = leftPanelX + 15;
    
    // Функ. HP
    scene.add.rectangle(legendX, legendY, 12, 4, 0xdc2626);
    scene.add.text(legendX + 10, legendY, 'Функ', { fontSize: '8px', color: '#9ca3af' }).setOrigin(0, 0.5);
    
    // Структ. HP
    scene.add.rectangle(legendX + 50, legendY, 12, 4, 0x6b7280);
    scene.add.text(legendX + 60, legendY, 'Струк', { fontSize: '8px', color: '#9ca3af' }).setOrigin(0, 0.5);
    
    // Статусы
    scene.add.circle(legendX + 110, legendY, 4, BODY_STATUS_COLORS.healthy);
    scene.add.text(legendX + 118, legendY, 'OK', { fontSize: '8px', color: '#22c55e' }).setOrigin(0, 0.5);
    
    scene.add.circle(legendX + 145, legendY, 4, BODY_STATUS_COLORS.damaged);
    scene.add.text(legendX + 153, legendY, 'Повр', { fontSize: '8px', color: '#eab308' }).setOrigin(0, 0.5);
    
    // === ПРАВАЯ ПАНЕЛЬ: СЕТКА ИНВЕНТАРЯ ===
    const rightPanelX = panelX + 240;
    const rightPanelY = panelY + 50;
    const gridWidth = INVENTORY_COLS * INVENTORY_CELL_SIZE;
    const gridHeight = INVENTORY_ROWS * INVENTORY_CELL_SIZE;
    
    // Фон сетки
    const gridBg = scene.add.rectangle(
      rightPanelX + gridWidth / 2,
      rightPanelY + gridHeight / 2,
      gridWidth + 10,
      gridHeight + 10,
      0x0f0f1a,
      0.9
    );
    gridBg.setStrokeStyle(1, 0x3a3a5a);
    
    // === СЕТКА ИНВЕНТАРЯ ===
    const gridCells: { x: number; y: number; cell: Phaser.GameObjects.Rectangle }[] = [];
    
    for (let row = 0; row < INVENTORY_ROWS; row++) {
      for (let col = 0; col < INVENTORY_COLS; col++) {
        const cellX = rightPanelX + col * INVENTORY_CELL_SIZE + INVENTORY_CELL_SIZE / 2;
        const cellY = rightPanelY + row * INVENTORY_CELL_SIZE + INVENTORY_CELL_SIZE / 2;
        
        const cell = scene.add.rectangle(
          cellX, cellY,
          INVENTORY_CELL_SIZE - 2,
          INVENTORY_CELL_SIZE - 2,
          0x1a1a2e,
          0.9
        );
        cell.setStrokeStyle(1, 0x3a3a5a);
        cell.setInteractive({ useHandCursor: true });
        
        // Hover эффект
        cell.on('pointerover', () => {
          cell.setFillStyle(0x2a2a4e, 1);
        });
        cell.on('pointerout', () => {
          cell.setFillStyle(0x1a1a2e, 0.9);
        });
        
        gridCells.push({ x: col, y: row, cell });
      }
    }
    
    // === ПРЕДМЕТЫ ИЗ ГЛОБАЛЬНОГО ИНВЕНТАРЯ ===
    const items = getInventory();
    
    // Маппинг типов предметов на иконки
    const typeToIcon: Record<string, string> = {
      pill: '💊',
      elixir: '🧴',
      stone: '💎',
      scroll: '📜',
      weapon: '🗡️',
      armor: '👘',
      accessory: '💍',
      material: '🪨',
      material_qi_stone: '💎',
      herb: '🌿',
      food: '🍖',
      book: '📖',
      key: '🔑',
      consumable: '🧪',
      artifact: '⚡',
      equipment: '🛡️',
      spirit_stone: '💎',
      default: '📦',
    };
    
    // Маппинг rarity на цвета
    const rarityToColor: Record<string, number> = {
      mythic: 0xef4444,    // red
      legendary: 0xfbbf24, // amber/gold
      epic: 0xa855f7,      // purple
      rare: 0x3b82f6,      // blue
      uncommon: 0x22c55e,  // green
      common: 0x6b7280,    // gray
    };
    
    // Разделяем предметы на инвентарь и экипировку
    const backpackItems = items.filter(item => !item.isEquipped);
    const equippedItems = items.filter(item => item.isEquipped);
    
    // Отображаем экипированные предметы на слоты
    equippedItems.forEach(item => {
      const slotId = item.equipmentSlot;
      if (!slotId) return;
      
      // Находим слот по ID и обновляем его
      // (слоты уже созданы выше)
    });
    
    // Отображаем предметы в рюкзаке
    backpackItems.forEach((item, index) => {
      const col = item.posX ?? (index % INVENTORY_COLS);
      const row = item.posY ?? Math.floor(index / INVENTORY_COLS);
      
      if (row >= INVENTORY_ROWS) return; // Не выходим за границы сетки
      
      const cellX = rightPanelX + col * INVENTORY_CELL_SIZE + INVENTORY_CELL_SIZE / 2;
      const cellY = rightPanelY + row * INVENTORY_CELL_SIZE + INVENTORY_CELL_SIZE / 2;
      
      // Рамка редкости
      const rarityColor = rarityToColor[item.rarity || 'common'] || rarityToColor.common;
      const rarityBorder = scene.add.rectangle(cellX, cellY, INVENTORY_CELL_SIZE - 4, INVENTORY_CELL_SIZE - 4, 0x1a1a2e, 1);
      rarityBorder.setStrokeStyle(2, rarityColor);
      
      // Иконка - приоритет: item.icon > typeToIcon[type] > default
      const icon = item.icon || typeToIcon[item.type] || typeToIcon.default;
      const iconText = scene.add.text(cellX, cellY - 3, icon, { fontSize: '20px' }).setOrigin(0.5);
      iconText.setInteractive({ useHandCursor: true });
      
      // Сохраняем данные предмета
      iconText.setData('itemData', item);
      
      // Количество
      if (item.quantity && item.quantity > 1) {
        scene.add.text(cellX + 10, cellY + 10, String(item.quantity), {
          fontSize: '10px',
          color: '#ffffff',
          fontFamily: 'Arial',
          stroke: '#000000',
          strokeThickness: 2,
        }).setOrigin(0.5);
      }
      
      // Tooltip с полным описанием
      iconText.on('pointerover', () => {
        const lines = [item.name];
        if (item.equipmentSlot) lines.push(`Слот: ${item.equipmentSlot}`);
        if (item.description) lines.push(item.description);
        if (item.quantity && item.quantity > 1) lines.push(`Количество: ${item.quantity}`);
        
        const tooltip = scene.add.text(cellX, cellY - 50, lines.join('\n'), {
          fontSize: '11px',
          color: '#ffffff',
          backgroundColor: '#000000ee',
          padding: { x: 6, y: 3 },
          align: 'center',
        }).setOrigin(0.5).setDepth(100);
        iconText.setData('tooltip', tooltip);
      });
      iconText.on('pointerout', () => {
        const tooltip = iconText.getData('tooltip') as Phaser.GameObjects.Text;
        if (tooltip) tooltip.destroy();
      });
      
      // Клик - использовать/экипировать через Event Bus
      iconText.on('pointerdown', async () => {
        try {
          let result;
          
          if (item.isConsumable) {
            // Использовать расходник через шину
            result = await eventBusClient.useItem(item.id, 1);
          } else if (item.equipmentSlot) {
            // Экипировать через шину
            result = await eventBusClient.equipItem(item.id, item.equipmentSlot);
          }
          
          if (result?.success) {
            // Показываем эффект успеха
            const successText = scene.add.text(cellX, cellY - 30, '✓', {
              fontSize: '16px',
              color: '#22c55e',
              fontFamily: 'Arial',
            }).setOrigin(0.5).setDepth(200);
            
            scene.tweens.add({
              targets: successText,
              y: cellY - 50,
              alpha: 0,
              duration: 800,
              onComplete: () => successText.destroy(),
            });
            
            // Отправляем window event для React (чтобы обновить store)
            window.dispatchEvent(new CustomEvent('inventory:changed', { 
              detail: { action: item.isConsumable ? 'use' : 'equip', itemId: item.id }
            }));
          } else if (result?.error) {
            // Показываем ошибку
            const errorText = scene.add.text(cellX, cellY - 30, result.error, {
              fontSize: '11px',
              color: '#ef4444',
              fontFamily: 'Arial',
              backgroundColor: '#000000aa',
              padding: { x: 4, y: 2 },
            }).setOrigin(0.5).setDepth(200);
            
            scene.tweens.add({
              targets: errorText,
              y: cellY - 50,
              alpha: 0,
              duration: 1500,
              onComplete: () => errorText.destroy(),
            });
          }
        } catch (error) {
          console.error('[Inventory] Event Bus error:', error);
        }
      });
    });
    
    // Вычисляем статистику инвентаря
    const totalWeight = items.reduce((sum, item) => sum + (item.weight || 0) * item.quantity, 0);
    const usedSlots = backpackItems.length;
    const totalSlots = INVENTORY_COLS * INVENTORY_ROWS;
    
    // === СТАТУС БАР (вес) ===
    const statusY = panelY + panelHeight - 25;
    scene.add.text(panelX + 20, statusY, `⚖️ Вес: ${totalWeight.toFixed(1)} / 50.0 кг`, {
      fontSize: '11px',
      color: '#9ca3af',
      fontFamily: 'Arial',
    });
    
    scene.add.text(panelX + 200, statusY, `📦 Слоты: ${usedSlots} / ${totalSlots}`, {
      fontSize: '11px',
      color: '#9ca3af',
      fontFamily: 'Arial',
    });
    
    // === ПОДСКАЗКА ===
    scene.add.text(panelX + panelWidth - 100, statusY, '[I] или [ESC] - закрыть', {
      fontSize: '10px',
      color: '#6b7280',
      fontFamily: 'Arial',
    }).setOrigin(0.5, 0);
    
    // === ОБРАБОТКА КЛАВИШ ===
    scene.input.keyboard?.on('keydown-I', () => {
      scene.scene.stop('InventoryScene');
    });
    
    scene.input.keyboard?.on('keydown-ESC', () => {
      scene.scene.stop('InventoryScene');
    });
  },
};
