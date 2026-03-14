'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TrainingType, StatName } from '@/types/stat-development';

interface TrainingSelectionProps {
  availableTypes: TrainingType[];
  selectedType: TrainingType | null;
  onSelect: (type: TrainingType) => void;
  currentFatigue: { physical: number; mental: number };
  targetStat: StatName;
}

const TRAINING_INFO: Record<TrainingType, { name: string; mult: number; risk: string }> = {
  classical: { name: 'Classical', mult: 1.0, risk: 'low' },
  focused: { name: 'Focused', mult: 1.2, risk: 'medium' },
  extreme: { name: 'Extreme', mult: 1.5, risk: 'high' },
};

const RISK_COLORS: Record<string, string> = { 
  low: 'text-green-500', 
  medium: 'text-yellow-500', 
  high: 'text-red-500' 
};

export function TrainingSelection({ 
  availableTypes, 
  selectedType, 
  onSelect, 
  currentFatigue 
}: TrainingSelectionProps) {
  const isCriticalFatigue = currentFatigue.physical >= 80 || currentFatigue.mental >= 80;

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        <div className="text-sm font-medium">🏋️ Select training type</div>
        <div className="grid grid-cols-3 gap-3">
          {availableTypes.map((type) => {
            const info = TRAINING_INFO[type];
            return (
              <Button 
                key={type} 
                variant={selectedType === type ? 'default' : 'outline'} 
                className="h-auto py-3 flex flex-col items-center gap-1" 
                onClick={() => onSelect(type)} 
                disabled={isCriticalFatigue && type === 'extreme'}
              >
                <span className="font-medium text-sm">{info.name}</span>
                <span className="text-xs text-muted-foreground">×{info.mult}</span>
                <span className={`text-xs ${RISK_COLORS[info.risk]}`}>
                  {info.risk === 'low' ? 'Low risk' : info.risk === 'medium' ? 'Medium risk' : 'High risk'}
                </span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
