'use client';

import React, { useState, useCallback } from 'react';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { useEditorStore, CanvasObject } from '@/stores/editorStore';
import { useObjectsArray } from '@/hooks/useObjectsArray';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { extractFilenameFromPath } from '@/lib/api';
import {
  Sun,
  Contrast,
  Droplets,
  Focus,
  Zap,
  RotateCcw,
} from 'lucide-react';

interface FilterConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  min: number;
  max: number;
  default: number;
  step: number;
}

const FILTERS: FilterConfig[] = [
  { id: 'brightness', label: 'Brightness', icon: <Sun className="w-4 h-4" />, min: -100, max: 100, default: 0, step: 1 },
  { id: 'contrast', label: 'Contrast', icon: <Contrast className="w-4 h-4" />, min: -100, max: 100, default: 0, step: 1 },
  { id: 'saturation', label: 'Saturation', icon: <Droplets className="w-4 h-4" />, min: -100, max: 100, default: 0, step: 1 },
  { id: 'blur', label: 'Blur', icon: <Focus className="w-4 h-4" />, min: 0, max: 20, default: 0, step: 0.5 },
  { id: 'sharpen', label: 'Sharpen', icon: <Zap className="w-4 h-4" />, min: 0, max: 5, default: 0, step: 0.1 },
  { id: 'pixelation', label: 'Pixelation', icon: <Focus className="w-4 h-4" />, min: 0, max: 50, default: 0, step: 1 },
];

const PRESETS: { name: string; values: Record<string, number> }[] = [
  { name: 'Vintage', values: { brightness: 10, contrast: 20, saturation: -30 } },
  { name: 'B&W', values: { saturation: -100 } },
  { name: 'Warm', values: { brightness: 5, saturation: 20 } },
  { name: 'Cool', values: { brightness: 5, saturation: -10, contrast: 10 } },
  { name: 'Dramatic', values: { contrast: 40, saturation: -20, vignette: 50 } },
  { name: 'Soft', values: { brightness: 10, blur: 5, contrast: -10 } },
];

export default function FilterPanel() {
  const { selectedIds, updateObject } = useEditorStore();
  const objects = useObjectsArray();
  const { applyFilter } = useImageProcessor();
  const [values, setValues] = useState<Record<string, number>>({});
  const [isApplying, setIsApplying] = useState(false);

  const selectedObject = objects.find((obj) => selectedIds[0] === obj.id);
  const isImageSelected = selectedObject?.type === 'image';

  const handleFilterChange = useCallback(
    async (filterId: string, value: number) => {
      setValues((prev) => ({ ...prev, [filterId]: value }));

      if (!selectedObject?.src || !isImageSelected) return;

      setIsApplying(true);
      try {
        const filename = extractFilenameFromPath(selectedObject.src);
        
        const result = await applyFilter(filename, {
          type: filterId,
          value,
        });

        // Update object with new image URL
        updateObject(selectedObject.id, {
          src: result.url,
        });
      } catch (error) {
        console.error('Filter error:', error);
      } finally {
        setIsApplying(false);
      }
    },
    [selectedObject, isImageSelected, applyFilter, updateObject]
  );

  const handleReset = useCallback(() => {
    setValues({});
  }, []);

  const handlePresetApply = useCallback(
    (preset: typeof PRESETS[0]) => {
      setValues((prev) => ({ ...prev, ...preset.values }));
      // Apply all preset values
      Object.entries(preset.values).forEach(([filterId, value]) => {
        handleFilterChange(filterId, value);
      });
    },
    [handleFilterChange]
  );

  if (!isImageSelected) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">Select an image to apply filters</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filters</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleReset}
          disabled={isApplying}
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Reset
        </Button>
      </div>

      {/* Presets */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-muted-foreground">Presets</h4>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((preset) => (
            <Button
              key={preset.name}
              variant="outline"
              size="sm"
              onClick={() => handlePresetApply(preset)}
              disabled={isApplying}
              className="text-xs"
            >
              {preset.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Filter Sliders */}
      <div className="space-y-3">
        {FILTERS.map((filter) => (
          <div key={filter.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {filter.icon}
                <span className="text-xs font-medium">{filter.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {values[filter.id] ?? filter.default}
              </span>
            </div>
            <Slider
              min={filter.min}
              max={filter.max}
              step={filter.step}
              value={[values[filter.id] ?? filter.default]}
              onValueChange={([v]) => setValues((prev) => ({ ...prev, [filter.id]: v }))}
              onValueCommit={([v]) => handleFilterChange(filter.id, v)}
              disabled={isApplying}
            />
          </div>
        ))}
      </div>

      {isApplying && (
        <div className="text-center text-xs text-muted-foreground">
          Applying filter...
        </div>
      )}
    </div>
  );
}
