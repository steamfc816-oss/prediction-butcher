import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  competition: string;
  onCompetitionChange: (v: string) => void;
  maxScore: number | '';
  onMaxScoreChange: (v: number | '') => void;
}

const MatchConfig: React.FC<Props> = ({ competition, onCompetitionChange, maxScore, onMaxScoreChange }) => {
  return (
    <div className="space-y-3 p-3 rounded-lg bg-card border border-border">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Compétition</Label>
        <Input
          value={competition}
          onChange={(e) => onCompetitionChange(e.target.value)}
          placeholder="Ligue des Champions"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Total de Buts Maximum</Label>
        <Input
          type="number"
          min="1"
          value={maxScore}
          onChange={(e) => onMaxScoreChange(e.target.value === '' ? '' : parseInt(e.target.value))}
          placeholder="Ex: 4 (Pour les 2 équipes)"
          className="h-8 text-sm"
        />
      </div>
    </div>
  );
};

export default MatchConfig;
