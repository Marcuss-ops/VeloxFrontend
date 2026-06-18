'use client';

import React, { useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useUIStore } from '@/stores/uiStore';
import { useEditorStore } from '@/stores/editorStore';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { getTempFileUrl } from '@/lib/api';
import { Sparkles, Loader2, Wand2, ImageIcon } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const SIZES = [
  { value: '1024x1024', label: 'Square (1024×1024)', width: 1024, height: 1024 },
  { value: '1920x1080', label: 'Landscape (1920×1080)', width: 1920, height: 1080 },
  { value: '1080x1920', label: 'Portrait (1080×1920)', width: 1080, height: 1920 },
  { value: '1280x720', label: 'HD (1280×720)', width: 1280, height: 720 },
];

const STYLE_PRESETS = [
  'Photorealistic',
  'Digital Art',
  'Oil Painting',
  'Watercolor',
  'Anime',
  '3D Render',
  'Pixel Art',
  'Abstract',
  'Minimalist',
  'Cinematic',
];

interface AIDialogProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AIDialog({ isOpen, onClose }: AIDialogProps) {
  const { showAIDialog, setAIDialog, isGenerating } = useUIStore();
  const { addObject } = useEditorStore();
  const { generate } = useImageProcessor();

  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [size, setSize] = useState('1024x1024');
  const [stylePreset, setStylePreset] = useState('');
  const [seed, setSeed] = useState<number | undefined>(undefined);

  const open = isOpen ?? showAIDialog;
  const defaultClose = useCallback(() => setAIDialog(false), [setAIDialog]);
  const handleClose = onClose ?? defaultClose;

  const selectedSize = SIZES.find((s) => s.value === size) || SIZES[0];

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    // Build full prompt with style
    let fullPrompt = prompt;
    if (stylePreset) {
      fullPrompt = `${prompt}, ${stylePreset.toLowerCase()} style`;
    }

    try {
      const result = await generate({
        prompt: fullPrompt,
        width: selectedSize.width,
        height: selectedSize.height,
        seed,
        steps: 4,
      });

      // Add generated image to canvas
      addObject({
        id: uuidv4(),
        type: 'image',
        name: `AI: ${prompt.slice(0, 20)}...`,
        x: 100,
        y: 100,
        width: selectedSize.width,
        height: selectedSize.height,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        locked: false,
        src: getTempFileUrl(result.filename),
      });

      handleClose();
      setPrompt('');
      setStylePreset('');
    } catch (error) {
      console.error('Generation failed:', error);
    }
  }, [prompt, stylePreset, selectedSize, seed, generate, addObject, handleClose]);

  const handleRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647));
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Image Generation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="w-full h-24 px-3 py-2 text-sm border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Style Preset */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Style (optional)</label>
            <div className="flex flex-wrap gap-1">
              {STYLE_PRESETS.map((style) => (
                <Button
                  key={style}
                  variant={stylePreset === style ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStylePreset(stylePreset === style ? '' : style)}
                  className="text-xs"
                >
                  {style}
                </Button>
              ))}
            </div>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Size</label>
            <Select value={size} onValueChange={setSize}>
              <SelectTrigger>
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent>
                {SIZES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Seed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Seed (optional)</label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRandomSeed}
                className="text-xs"
              >
                <Wand2 className="w-3 h-3 mr-1" />
                Random
              </Button>
            </div>
            <Input
              type="number"
              value={seed ?? ''}
              onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Random seed for reproducibility"
            />
          </div>

          {/* Preview placeholder */}
          <div className="flex items-center justify-center h-32 bg-muted rounded-md border-2 border-dashed">
            <div className="text-center text-muted-foreground">
              <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">Generated image will appear on canvas</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
