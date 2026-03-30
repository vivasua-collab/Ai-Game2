'use client';

import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';

interface Props { 
  fromStat?: number; 
  toStat?: number; 
  currentStat?: number; 
}

function calcThreshold(stat: number): number { 
  return Math.floor(stat / 10); 
}

function calcDays(threshold: number): number { 
  return Math.ceil(threshold / 0.15); 
}

export function ThresholdTable({ fromStat = 10, toStat = 60, currentStat }: Props) {
  const rows = [];
  
  for (let stat = fromStat; stat <= toStat; stat += 5) {
    const threshold = calcThreshold(stat);
    const days = calcDays(threshold);
    const isCurrent = currentStat !== undefined && stat <= currentStat && stat + 5 > currentStat;
    
    rows.push(
      <TableRow key={stat} className={isCurrent ? 'bg-primary/10' : undefined}>
        <TableCell className="font-medium">
          {isCurrent && '▶'}{stat}
        </TableCell>
        <TableCell>{threshold.toFixed(1)}</TableCell>
        <TableCell>{days} days</TableCell>
        <TableCell className="text-muted-foreground">
          {isCurrent && '← Current'}
        </TableCell>
      </TableRow>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-medium mb-3">📈 Development thresholds</h3>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stat</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Days to +1</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{rows}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
