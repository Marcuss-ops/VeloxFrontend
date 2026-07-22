'use client';

import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';

const FORMATS = [
  { value: 'png', label: 'PNG - Lossless', description: 'Best for graphics with transparency' },
  { value: 'jpeg', label: 'JPEG - Compressed', description: 'Best for photos, smaller file size' },
  { value: 'webp', label: 'WebP - Modern', description: 'Best for web, good compression' },
];

export interface FormatQualitySectionProps {
  format: string;
  setFormat: (format: string) => void;
  quality: number;
  setQuality: (quality: number) => void;
}

export function FormatQualitySection({
  format,
  setFormat,
  quality,
  setQuality,
}: FormatQualitySectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <label htmlFor="export-format" className="text-sm font-medium">
          Format
        </label>
        <Select value={format} onValueChange={setFormat}>
          <SelectTrigger id="export-format" className="w-full">
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            {FORMATS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {FORMATS.find((item) => item.value === format)?.description}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="export-quality" className="text-sm font-medium">
          Quality: {quality}%
        </label>
        <Slider
          id="export-quality"
          value={[quality]}
          onValueChange={(value) => setQuality(value[0])}
          min={10}
          max={100}
          step={1}
        />
      </div>
    </div>
  );
}

export default FormatQualitySection;
