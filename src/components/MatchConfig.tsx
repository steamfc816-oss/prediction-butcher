import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  competition: string;
  onCompetitionChange: (v: string) => void;
}

const MatchConfig: React.FC<Props> = ({ competition, onCompetitionChange }) => {
  return (
    <div className="space-y-1.5 p-3 rounded-lg bg-card border border-border">
      <Label className="text-xs text-muted-foreground">Compétition</Label>
      <Input
        value={competition}
        onChange={(e) => onCompetitionChange(e.target.value)}
        placeholder="Ligue des Champions"
        className="h-8 text-sm"
      />
    </div>
  );
};

export default MatchConfig;
