import React, { useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Props {
  label: string;
  name: string;
  color: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onImageChange: (img: HTMLImageElement) => void;
}

const TeamConfig: React.FC<Props> = ({ label, name, color, onNameChange, onColorChange, onImageChange }) => {
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
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Écusson</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Couleur</Label>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-0 p-0 bg-transparent"
          />
        </div>
      </div>
    </div>
  );
};

export default TeamConfig;
