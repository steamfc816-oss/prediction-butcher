import React, { useCallback, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface Props {
  label: string;
  name: string;
  color: string;
  scriptedGoals: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onImageChange: (image: HTMLImageElement | null) => void;
  onScriptedGoalsChange: (minutes: string) => void;
}

const TeamConfig: React.FC<Props> = ({ 
  label, name, color, scriptedGoals, onNameChange, onColorChange, onImageChange, onScriptedGoalsChange 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => onImageChange(img);
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, [onImageChange]);

  return (
    <div className="space-y-2 p-3 rounded-lg bg-card border border-border">
      <h3 className="text-sm font-bold text-foreground" style={{ color }}>{label}</h3>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Nom</Label>
        <Input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nom de l'équipe"
          className="h-8 text-sm"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Écusson</Label>
        <div className="flex gap-2 items-center">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 text-xs"
            onClick={() => fileInputRef.current?.click()}
          >
            Choisir image
          </Button>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Couleur</Label>
            <input
              type="color"
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="space-y-1.5 mt-2">
          <Label className="text-xs text-muted-foreground">Buts (Minutes)</Label>
          <Input
            value={scriptedGoals}
            onChange={(e) => onScriptedGoalsChange(e.target.value)}
            placeholder="ex: 12, 45, 89"
            className="h-8 text-sm placeholder:text-muted-foreground/50"
          />
        </div>
      </div>
    </div>
  );
};

export default TeamConfig;
