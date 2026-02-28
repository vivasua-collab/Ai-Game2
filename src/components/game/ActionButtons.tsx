/**
 * Action Buttons Component
 * 
 * Quick action buttons for 2D game mode.
 */

'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RestDialog } from './RestDialog';
import { StatusDialog } from './StatusDialog';
import { TechniquesDialog } from './TechniquesDialog';
import { GameMenuDialog } from './GameMenuDialog';
import { InventoryDialog } from './InventoryDialog';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { GeneratedObjectsViewer } from '@/components/settings/GeneratedObjectsViewer';
import { EventBusTest } from './EventBusTest';
import { Settings, Activity, Menu } from 'lucide-react';

interface ActionButtonsProps {
  className?: string;
}

export function ActionButtons({ className = '' }: ActionButtonsProps) {
  const [restOpen, setRestOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [techniquesOpen, setTechniquesOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [generatedObjectsOpen, setGeneratedObjectsOpen] = useState(false);
  const [eventBusOpen, setEventBusOpen] = useState(false);

  // Слушатель события открытия меню игры
  useEffect(() => {
    const handleOpenGameMenu = () => setGameMenuOpen(true);
    window.addEventListener('openGameMenu', handleOpenGameMenu);
    return () => window.removeEventListener('openGameMenu', handleOpenGameMenu);
  }, []);

  return (
    <>
      <div className={`flex gap-2 flex-wrap ${className}`}>
        <Button
          variant="outline"
          size="sm"
          className="border-amber-600/50 text-amber-400 hover:bg-amber-900/30 h-9"
          onClick={() => setStatusOpen(true)}
        >
          📊 Статус
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-green-600/50 text-green-400 hover:bg-green-900/30 h-9"
          onClick={() => setRestOpen(true)}
        >
          ⏸️ Отдых
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-purple-600/50 text-purple-400 hover:bg-purple-900/30 h-9"
          onClick={() => setTechniquesOpen(true)}
        >
          ⚔️ Техники
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-blue-600/50 text-blue-400 hover:bg-blue-900/30 h-9"
          onClick={() => setInventoryOpen(true)}
        >
          🎒 Инвентарь
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-600/50 text-slate-400 hover:bg-slate-900/30 h-9"
          disabled
          title="В разработке"
        >
          🗺️ Карта
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-cyan-600/50 text-cyan-400 hover:bg-cyan-900/30 h-9"
          onClick={() => setEventBusOpen(true)}
          title="Тест Event Bus"
        >
          <Activity className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-orange-600/50 text-orange-400 hover:bg-orange-900/30 h-9"
          onClick={() => setGameMenuOpen(true)}
          title="Меню игры (Сохранить, Читы, Редактор тела)"
        >
          <Menu className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-600/50 text-slate-400 hover:bg-slate-900/30 h-9"
          onClick={() => setSettingsOpen(true)}
          title="Настройки"
        >
          <Settings className="w-4 h-4" />
        </Button>
      </div>

      <RestDialog
        open={restOpen}
        onOpenChange={setRestOpen}
      />

      <StatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
      />

      <TechniquesDialog
        open={techniquesOpen}
        onOpenChange={setTechniquesOpen}
      />

      <InventoryDialog
        open={inventoryOpen}
        onOpenChange={setInventoryOpen}
      />

      <GameMenuDialog
        open={gameMenuOpen}
        onOpenChange={setGameMenuOpen}
      />

      <EventBusTest
        open={eventBusOpen}
        onOpenChange={setEventBusOpen}
      />

      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onOpenGeneratedObjects={() => {
          setSettingsOpen(false);
          setGeneratedObjectsOpen(true);
        }}
      />

      <GeneratedObjectsViewer
        open={generatedObjectsOpen}
        onOpenChange={setGeneratedObjectsOpen}
      />
    </>
  );
}
