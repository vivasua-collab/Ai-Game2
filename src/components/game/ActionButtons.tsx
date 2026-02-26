/**
 * Action Buttons Component
 * 
 * Quick action buttons for 2D game mode.
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RestDialog } from './RestDialog';
import { StatusDialog } from './StatusDialog';
import { TechniquesDialog } from './TechniquesDialog';

interface ActionButtonsProps {
  className?: string;
}

export function ActionButtons({ className = '' }: ActionButtonsProps) {
  const [restOpen, setRestOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [techniquesOpen, setTechniquesOpen] = useState(false);

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
          ⏸️ Отдых/Медитация
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
          disabled
          title="В разработке"
        >
          🎒 Инвентарь
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="border-cyan-600/50 text-cyan-400 hover:bg-cyan-900/30 h-9"
          disabled
          title="В разработке"
        >
          🗺️ Карта
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
    </>
  );
}
