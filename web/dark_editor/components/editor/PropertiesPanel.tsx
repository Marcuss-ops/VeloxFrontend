'use client';

import React from 'react';
import { useEditorStore, CanvasObject } from '@/stores/editorStore';
import { resolveEditorAssetUrl, uploadImage, translateText } from '@/lib/api';
import { fontFamilies, type FontKey } from '@/lib/fonts';
import { Settings, Lock, Sparkles, Type, Globe, ShieldAlert, Move, Scaling, Palette, Image as ImageIcon, Upload, X, Languages } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { Section, Field, FieldRow, NumberField, ColorSwatch, Toggle, PropertySlider, RotationDial } from './properties/ui';
import DropShadowPanel from './properties/DropShadowPanel';

const FONT_FAMILIES: Array<{ label: string; value: FontKey; css: string }> = (Object.keys(fontFamilies) as FontKey[]).map((key) => ({
  label: key,
  value: key,
  css: fontFamilies[key],
}));

const FONT_WEIGHTS = [
  { label: 'Light', value: '300' },
  { label: 'Regular', value: '400' },
  { label: 'Medium', value: '500' },
  { label: 'SemiBold', value: '600' },
  { label: 'Bold', value: '700' },
  { label: 'Extra Bold', value: '800' },
  { label: 'Black', value: '900' },
] as const;

const LANGUAGES = [
  { code: 'it', label: 'Italian' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ru', label: 'Russian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'tr', label: 'Turkish' },
  { code: 'pl', label: 'Polish' },
] as const;

export default function PropertiesPanel() {
  const { objects, selectedIds, updateObject } = useEditorStore();
  const [targetLang, setTargetLang] = React.useState('en');
  const [isTranslating, setIsTranslating] = React.useState(false);

  const selectedObject = selectedIds.length === 1
    ? objects.find((obj) => obj.id === selectedIds[0])
    : null;

  const { updateObjectLive, saveToHistory } = useEditorStore();

  const handleTranslate = async () => {
    if (!selectedObject || selectedObject.type !== 'text' || !selectedObject.text) return;
    setIsTranslating(true);
    try {
      const res = await translateText({ text: selectedObject.text, target_language: targetLang });
      if (res.translated_text) updateObject(selectedObject.id, { text: res.translated_text });
    } catch (err) {
      console.error('Failed to translate:', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleImageFillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadImage(file);
      handleChange('imageFill', { src: resolveEditorAssetUrl(data.url), scale: 1, offsetX: 0, offsetY: 0 });
    } catch (err) {
      console.error('Failed to upload image fill:', err);
    }
  };

  if (!selectedObject) {
    return (
      <div className="properties-panel flex flex-col h-full bg-white text-black">
        <div className="border-b border-black/[0.08] px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg border border-black/[0.08] bg-[#f7f7f5] p-1.5">
              <Settings className="h-3.5 w-3.5 text-[#111111]" />
            </div>
            <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#111111]">Properties</h3>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#6e6e73]">
            {selectedIds.length === 0
              ? 'Seleziona un oggetto per modificarne le proprietà.'
              : `${selectedIds.length} oggetti selezionati`}
          </p>
        </div>
        <div className="mt-auto border-t border-black/[0.08] p-5">
          <button disabled className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white py-2.5 text-sm font-bold text-[#6e6e73] opacity-40">
            <Lock className="w-4 h-4" /> Lock Selection
          </button>
        </div>
      </div>
    );
  }

  const handleChange = (field: keyof CanvasObject, value: unknown) => {
    updateObject(selectedObject.id, { [field]: value });
  };

  const handleLiveChange = (field: keyof CanvasObject, value: unknown) => {
    updateObjectLive(selectedObject.id, { [field]: value });
  };

  const commitChanges = () => saveToHistory();

  return (
    <div className="properties-panel flex flex-col h-full bg-white text-black">
      {/* Header */}
      <div className="border-b border-black/[0.08] px-5 py-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="shrink-0 rounded-lg border border-black/[0.08] bg-[#f7f7f5] p-1.5">
            <Settings className="h-3.5 w-3.5 text-[#111111]" />
          </div>
          <h3 className="text-[11px] font-black uppercase tracking-[0.14em] text-[#111111]">Properties</h3>
        </div>
        <p className="mt-2 truncate text-xs text-[#6e6e73]">
          {selectedObject.type === 'text' ? `Text: "${selectedObject.text || ''}"` : `${selectedObject.type}: ${selectedObject.name}`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5 scrollbar-thin scrollbar-thumb-black/15 scrollbar-track-transparent">
        {/* Position & Size */}
        <Section icon={<Move className="w-3.5 h-3.5" />} title="Position & Size">
          <FieldRow>
            <PropertySlider
              label="Width"
              min={10}
              max={1920}
              value={Math.round(selectedObject.width * (selectedObject.scaleX || 1))}
              onChange={(val) => handleLiveChange('scaleX', val / selectedObject.width)}
              onBlur={commitChanges}
            />
            <PropertySlider
              label="Height"
              min={10}
              max={1080}
              value={Math.round(selectedObject.height * (selectedObject.scaleY || 1))}
              onChange={(val) => handleLiveChange('scaleY', val / selectedObject.height)}
              onBlur={commitChanges}
            />
          </FieldRow>
          <FieldRow>
            <PropertySlider
              label="X"
              min={-500}
              max={1920}
              value={Math.round(selectedObject.x)}
              onChange={(val) => handleLiveChange('x', val)}
              onBlur={commitChanges}
            />
            <PropertySlider
              label="Y"
              min={-500}
              max={1080}
              value={Math.round(selectedObject.y)}
              onChange={(val) => handleLiveChange('y', val)}
              onBlur={commitChanges}
            />
          </FieldRow>
          <RotationDial
            value={Math.round(selectedObject.rotation || 0)}
            onChange={(val) => handleLiveChange('rotation', val)}
            onBlur={commitChanges}
          />
        </Section>

        {/* Typography */}
        {selectedObject.type === 'text' && (
          <Section icon={<Type className="w-3.5 h-3.5" />} title="Typography">
            <Field label="Font Family">
              <Select value={selectedObject.fontFamily || 'Arial'} onValueChange={(v) => handleChange('fontFamily', v)}>
                <SelectTrigger className="w-full justify-between rounded-lg border border-black/[0.12] bg-white text-[#111111]"><SelectValue /></SelectTrigger>
                <SelectContent className="border border-black/10 bg-white text-[#111111] shadow-xl">
                  {FONT_FAMILIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      <span style={{ fontFamily: f.css }}>{f.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Font Weight">
              <Select value={selectedObject.fontWeight || '400'} onValueChange={(v) => handleChange('fontWeight', v)}>
                <SelectTrigger className="w-full justify-between rounded-lg border border-black/[0.12] bg-white text-[#111111]"><SelectValue /></SelectTrigger>
                <SelectContent className="border border-black/10 bg-white text-[#111111] shadow-xl">
                  {FONT_WEIGHTS.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-xs">
              <span className="font-semibold text-black">Translate in batch</span>
              <input
                type="checkbox"
                checked={selectedObject.translate !== false}
                onChange={(event) => handleChange('translate', event.target.checked)}
                className="h-4 w-4 accent-black"
              />
            </label>
            <FieldRow>
              <PropertySlider
                label="Size"
                min={8}
                max={300}
                value={selectedObject.fontSize || 24}
                onChange={(val) => handleChange('fontSize', val)}
              />
              <PropertySlider
                label="Letter Spacing"
                min={-10}
                max={50}
                value={selectedObject.letterSpacing ?? 0}
                onChange={(val) => handleChange('letterSpacing', val)}
              />
            </FieldRow>
            <FieldRow>
              <PropertySlider
                label="Line Height"
                min={0.5}
                max={3.0}
                step={0.1}
                value={selectedObject.lineHeight ?? 1}
                onChange={(val) => handleChange('lineHeight', val)}
              />
              <div />
            </FieldRow>
            <Field label="Solid Color">
              <ColorSwatch value={selectedObject.fill || '#ffffff'} onChange={(v) => { handleChange('fill', v); if (selectedObject.imageFill) handleChange('imageFill', undefined); }} />
            </Field>
            <Field label="Image Fill">
              {selectedObject.imageFill ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-[38px] flex-1 items-center overflow-hidden rounded-lg border border-black/[0.12] bg-white px-3">
                    <ImageIcon className="mr-2 h-4 w-4 shrink-0 text-[#111111]" />
                    <span className="truncate text-xs text-[#4c4c50]">Attached</span>
                  </div>
                  <button onClick={() => handleChange('imageFill', undefined)} className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-black/[0.12] bg-white text-[#111111] transition hover:bg-[#f2f2ef]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-black/15 bg-white text-[#4c4c50] transition hover:border-black/35 hover:bg-[#f7f7f5]">
                  <Upload className="h-4 w-4 text-[#111111]" />
                  <span className="text-sm">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageFillUpload} />
                </label>
              )}
            </Field>
            {selectedObject.imageFill && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-black/[0.08] bg-[#f7f7f5] p-3">
                <NumberField label="Scale" step={0.1} value={selectedObject.imageFill.scale} onChange={(val) => handleChange('imageFill', { ...selectedObject.imageFill!, scale: val })} />
                <NumberField label="Offset Y" value={selectedObject.imageFill.offsetY} onChange={(val) => handleChange('imageFill', { ...selectedObject.imageFill!, offsetY: val })} />
              </div>
            )}
          </Section>
        )}

        {/* Opacity */}
        <Section icon={<Scaling className="w-3.5 h-3.5" />} title="Opacity">
          <PropertySlider
            label="Opacity"
            min={0}
            max={100}
            value={Math.round((selectedObject.opacity ?? 1) * 100)}
            suffix="%"
            onChange={(val) => handleLiveChange('opacity', Math.max(0, Math.min(100, val)) / 100)}
            onBlur={commitChanges}
          />
        </Section>

        {/* Image Crop Effects (Feather & Reset) */}
        {selectedObject.type === 'image' && (selectedObject.cropRect || selectedObject.cropPathPoints) && (
          <Section icon={<ImageIcon className="h-3.5 w-3.5" />} title="Crop Effects">
            <Field label="Feather (Bordi Sfumati)">
              <div className="space-y-2">
                <div className="relative h-2 overflow-hidden rounded-full bg-black/[0.10]">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-[#111111]" style={{ width: `${((selectedObject.feather ?? 0) / 50) * 100}%` }} />
                  <input type="range" min={0} max={50} step={1} value={selectedObject.feather ?? 0}
                    onChange={(e) => handleLiveChange('feather', parseInt(e.target.value))} onMouseUp={commitChanges}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                </div>
                <div className="flex justify-between text-[10px] font-medium tabular-nums text-[#6e6e73]">
                  <span>0px</span>
                  <span className="font-bold text-[#111111]">{selectedObject.feather ?? 0}px</span>
                  <span>50px</span>
                </div>
              </div>
            </Field>
            
            <button onClick={() => {
              handleChange('cropRect', undefined);
              handleChange('cropPathPoints', undefined);
              handleChange('cropMode', undefined);
              handleChange('feather', 0);
            }}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-black/[0.12] bg-white py-2.5 text-xs font-bold text-[#111111] transition hover:bg-[#f2f2ef]">
              Reset Crop
            </button>
          </Section>
        )}

        {/* Drop Shadow */}
        <DropShadowPanel object={selectedObject} onUpdate={handleChange} />

        {/* Advanced Effects */}
        {selectedObject.type === 'text' && (
          <Section icon={<Sparkles className="w-3.5 h-3.5" />} title="Advanced Effects">
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-black/[0.08] bg-[#f7f7f5] p-3">
                <span className="text-xs font-semibold text-[#111111]">Text Shadow</span>
                <Toggle on={!!selectedObject.textShadow} onChange={() => handleChange('textShadow', selectedObject.textShadow ? undefined : { offsetX: 2, offsetY: 2, blur: 4, color: '#000000' })} />
              </div>
              {selectedObject.textShadow && (
                <div className="flex flex-col gap-3 rounded-xl border border-black/[0.08] bg-[#f7f7f5] p-3">
                  <PropertySlider label="Offset X" min={-50} max={50} value={selectedObject.textShadow.offsetX} onChange={(val) => handleChange('textShadow', { ...selectedObject.textShadow!, offsetX: val })} />
                  <PropertySlider label="Offset Y" min={-50} max={50} value={selectedObject.textShadow.offsetY} onChange={(val) => handleChange('textShadow', { ...selectedObject.textShadow!, offsetY: val })} />
                  <PropertySlider label="Blur" min={0} max={100} value={selectedObject.textShadow.blur} onChange={(val) => handleChange('textShadow', { ...selectedObject.textShadow!, blur: val })} />
                  <div className="mt-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e6e73]">Shadow Color</label>
                    <ColorSwatch value={selectedObject.textShadow.color} onChange={(v) => handleChange('textShadow', { ...selectedObject.textShadow!, color: v })} compact />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl border border-black/[0.08] bg-[#f7f7f5] p-3">
                <span className="text-xs font-semibold text-[#111111]">Text Stroke</span>
                <Toggle on={!!selectedObject.textStroke} onChange={() => handleChange('textStroke', selectedObject.textStroke ? undefined : { width: 2, color: '#000000' })} />
              </div>
              {selectedObject.textStroke && (
                <div className="flex flex-col gap-3 rounded-xl border border-black/[0.08] bg-[#f7f7f5] p-3">
                  <PropertySlider label="Width" min={0} max={20} value={selectedObject.textStroke.width} onChange={(val) => handleChange('textStroke', { ...selectedObject.textStroke!, width: val })} />
                  <div className="mt-1">
                    <label className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e6e73]">Stroke Color</label>
                    <ColorSwatch value={selectedObject.textStroke.color} onChange={(v) => handleChange('textStroke', { ...selectedObject.textStroke!, color: v })} compact />
                  </div>
                </div>
              )}
            </div>
          </Section>
        )}

        {/* Shape Fill */}
        {(selectedObject.type === 'rect' || selectedObject.type === 'circle') && (
          <Section icon={<Palette className="w-3.5 h-3.5" />} title="Shape">
            <Field label="Solid Fill">
              <ColorSwatch value={selectedObject.fill || '#3b82f6'} onChange={(v) => { handleChange('fill', v); if (selectedObject.imageFill) handleChange('imageFill', undefined); }} />
            </Field>
            <Field label="Image Fill">
              {selectedObject.imageFill ? (
                <div className="flex items-center gap-2">
                  <div className="flex h-[38px] flex-1 items-center overflow-hidden rounded-lg border border-black/[0.12] bg-white px-3">
                    <ImageIcon className="mr-2 h-4 w-4 shrink-0 text-[#111111]" />
                    <span className="truncate text-xs text-[#4c4c50]">Attached</span>
                  </div>
                  <button onClick={() => handleChange('imageFill', undefined)} className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-black/[0.12] bg-white text-[#111111] transition hover:bg-[#f2f2ef]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex h-[38px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-black/15 bg-white text-[#4c4c50] transition hover:border-black/35 hover:bg-[#f7f7f5]">
                  <Upload className="h-4 w-4 text-[#111111]" />
                  <span className="text-sm">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageFillUpload} />
                </label>
              )}
            </Field>
            {selectedObject.imageFill && (
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-black/[0.08] bg-[#f7f7f5] p-3">
                <NumberField label="Scale" step={0.1} value={selectedObject.imageFill.scale} onChange={(val) => handleChange('imageFill', { ...selectedObject.imageFill!, scale: val })} />
                <NumberField label="Offset Y" value={selectedObject.imageFill.offsetY} onChange={(val) => handleChange('imageFill', { ...selectedObject.imageFill!, offsetY: val })} />
              </div>
            )}
          </Section>
        )}
      </div>

      {/* Lock button */}
      <div className="shrink-0 border-t border-black/[0.08] bg-white px-5 py-4">
        <button onClick={() => handleChange('locked', !selectedObject.locked)}
          className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            selectedObject.locked
              ? 'border border-black/20 bg-[#f7f7f5] text-[#111111] hover:bg-[#eeeeeb]'
              : 'border border-[#111111] bg-[#111111] text-white hover:bg-[#333333] active:scale-[0.99]'
          }`}>
          <Lock className="w-4 h-4" />
          {selectedObject.locked ? 'Unlock Layer' : 'Lock Layer'}
        </button>
      </div>
    </div>
  );
}
