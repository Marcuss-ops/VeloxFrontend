'use client';

import React from 'react';
import { useEditorStore, CanvasObject } from '@/stores/editorStore';
import { selectSingleSelectedObject } from '@/lib/editorSelectors';
import { uploadImage } from '@/lib/api';
import { fontFamilies, type FontKey } from '@/lib/fonts';
import { Settings, Lock, Sparkles, Type, Move, Scaling, Palette, Image as ImageIcon, Upload, X } from 'lucide-react';
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


export default function PropertiesPanel() {
  const { selectedIds, updateObject } = useEditorStore();
  const selectedObject = useEditorStore((state) => selectSingleSelectedObject(state));

  const { updateObjectLive, saveToHistory } = useEditorStore();

  const handleImageFillUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await uploadImage(file);
      handleChange('imageFill', { src: data.url, scale: 1, offsetX: 0, offsetY: 0 });
    } catch (err) {
      console.error('Failed to upload image fill:', err);
    }
  };

  if (!selectedObject) {
    return (
      <div className="flex flex-col h-full bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.10),_transparent_56%),radial-gradient(circle_at_bottom_left,_rgba(15,23,42,0.30),_transparent_58%),linear-gradient(180deg,_rgba(6,11,20,0.98),_rgba(8,13,23,0.94))] backdrop-blur-xl">
        <div className="sidebar-section shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-sky-500/10 p-1.5 ring-1 ring-sky-400/15">
              <Settings className="w-3.5 h-3.5 text-sky-200" />
            </div>
            <h3 className="sidebar-section-title">Properties</h3>
          </div>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            {selectedIds.length === 0
              ? 'Seleziona un oggetto per modificarne le proprietà.'
              : `${selectedIds.length} oggetti selezionati`}
          </p>
        </div>
        <div className="p-5 border-t border-white/[0.06] mt-auto">
          <button disabled className="w-full py-2.5 bg-white/[0.03] ring-1 ring-white/[0.06] opacity-40 cursor-not-allowed rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-slate-500">
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
    <div className="flex flex-col h-full bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.12),_transparent_56%),radial-gradient(circle_at_bottom_left,_rgba(15,23,42,0.34),_transparent_50%),linear-gradient(180deg,_rgba(6,11,20,0.98),_rgba(8,13,23,0.94))] backdrop-blur-xl">
      {/* Header */}
      <div className="sidebar-section shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="rounded-lg bg-sky-500/10 p-1.5 ring-1 ring-sky-400/15 shrink-0">
            <Settings className="w-3.5 h-3.5 text-sky-200" />
          </div>
          <h3 className="sidebar-section-title">Properties</h3>
        </div>
        <p className="mt-2 text-xs text-slate-400 truncate">
          {selectedObject.type === 'text' ? `Text: "${selectedObject.text || ''}"` : `${selectedObject.type}: ${selectedObject.name}`}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-7 scrollbar-thin scrollbar-thumb-sky-400/20 scrollbar-track-transparent">
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
                <SelectTrigger className="w-full justify-between"><SelectValue /></SelectTrigger>
                <SelectContent>
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
                <SelectTrigger className="w-full justify-between"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FONT_WEIGHTS.map((w) => <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
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
                  <div className="h-[38px] flex-1 rounded-xl bg-white/[0.04] ring-1 ring-white/10 flex items-center px-3 overflow-hidden">
                    <ImageIcon className="w-4 h-4 text-sky-200 mr-2 shrink-0" />
                    <span className="text-xs truncate text-slate-300">Attached</span>
                  </div>
                  <button onClick={() => handleChange('imageFill', undefined)} className="h-[38px] w-[38px] shrink-0 flex items-center justify-center rounded-xl bg-rose-500/10 ring-1 ring-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-[38px] rounded-xl bg-white/[0.04] ring-1 ring-white/10 cursor-pointer hover:bg-sky-400/10 hover:ring-sky-400/35 transition-all">
                  <Upload className="w-4 h-4 text-slate-300" />
                  <span className="text-sm text-slate-300">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageFillUpload} />
                </label>
              )}
            </Field>
            {selectedObject.imageFill && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
                <NumberField label="Scale" step={0.1} value={selectedObject.imageFill.scale} onChange={(val) => handleChange('imageFill', { ...selectedObject.imageFill!, scale: val })} />
                <NumberField label="Offset Y" value={selectedObject.imageFill.offsetY} onChange={(val) => handleChange('imageFill', { ...selectedObject.imageFill!, offsetY: val })} />
              </div>
            )}
          </Section>
        )}

        {/* Opacity */}
        <Section icon={<Scaling className="w-3.5 h-3.5" />} title="Opacity">
          <div className="space-y-2">
            <div className="relative h-2 rounded-full bg-white/[0.05] ring-1 ring-white/10 overflow-hidden">
              <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full" style={{ width: `${(selectedObject.opacity ?? 1) * 100}%` }} />
              <input type="range" min={0} max={1} step={0.01} value={selectedObject.opacity ?? 1}
                onChange={(e) => handleLiveChange('opacity', parseFloat(e.target.value))} onMouseUp={commitChanges}
                className="absolute inset-0 w-full opacity-0 cursor-pointer" />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-medium tabular-nums">
              <span>0%</span>
              <span className="text-sky-200 font-bold">{Math.round((selectedObject.opacity ?? 1) * 100)}%</span>
              <span>100%</span>
            </div>
          </div>
        </Section>

        {/* Image Crop Effects (Feather & Reset) */}
        {selectedObject.type === 'image' && (selectedObject.cropRect || selectedObject.cropPathPoints) && (
          <Section icon={<ImageIcon className="w-3.5 h-3.5 text-sky-200" />} title="Crop Effects">
            <Field label="Feather (Bordi Sfumati)">
              <div className="space-y-2">
                <div className="relative h-2 rounded-full bg-white/[0.05] ring-1 ring-white/10 overflow-hidden">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full" style={{ width: `${((selectedObject.feather ?? 0) / 50) * 100}%` }} />
                  <input type="range" min={0} max={50} step={1} value={selectedObject.feather ?? 0}
                    onChange={(e) => handleLiveChange('feather', parseInt(e.target.value))} onMouseUp={commitChanges}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer" />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-medium tabular-nums">
                  <span>0px</span>
                  <span className="text-sky-200 font-bold">{selectedObject.feather ?? 0}px</span>
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
              className="w-full mt-2 py-2.5 bg-rose-500/10 ring-1 ring-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-all rounded-xl text-xs font-bold flex items-center justify-center gap-2">
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
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
                <span className="text-xs font-semibold text-slate-200">Text Shadow</span>
                <Toggle on={!!selectedObject.textShadow} onChange={() => handleChange('textShadow', selectedObject.textShadow ? undefined : { offsetX: 2, offsetY: 2, blur: 4, color: '#000000' })} />
              </div>
              {selectedObject.textShadow && (
                <div className="flex flex-col gap-3 p-3 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
                  <PropertySlider label="Offset X" min={-50} max={50} value={selectedObject.textShadow.offsetX} onChange={(val) => handleChange('textShadow', { ...selectedObject.textShadow!, offsetX: val })} />
                  <PropertySlider label="Offset Y" min={-50} max={50} value={selectedObject.textShadow.offsetY} onChange={(val) => handleChange('textShadow', { ...selectedObject.textShadow!, offsetY: val })} />
                  <PropertySlider label="Blur" min={0} max={100} value={selectedObject.textShadow.blur} onChange={(val) => handleChange('textShadow', { ...selectedObject.textShadow!, blur: val })} />
                  <div className="mt-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">Shadow Color</label>
                    <ColorSwatch value={selectedObject.textShadow.color} onChange={(v) => handleChange('textShadow', { ...selectedObject.textShadow!, color: v })} compact />
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
                <span className="text-xs font-semibold text-slate-200">Text Stroke</span>
                <Toggle on={!!selectedObject.textStroke} onChange={() => handleChange('textStroke', selectedObject.textStroke ? undefined : { width: 2, color: '#000000' })} />
              </div>
              {selectedObject.textStroke && (
                <div className="flex flex-col gap-3 p-3 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
                  <PropertySlider label="Width" min={0} max={20} value={selectedObject.textStroke.width} onChange={(val) => handleChange('textStroke', { ...selectedObject.textStroke!, width: val })} />
                  <div className="mt-1">
                    <label className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 mb-1 block">Stroke Color</label>
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
                  <div className="h-[38px] flex-1 rounded-xl bg-white/[0.04] ring-1 ring-white/10 flex items-center px-3 overflow-hidden">
                    <ImageIcon className="w-4 h-4 text-violet-300 mr-2 shrink-0" />
                    <span className="text-xs truncate text-slate-300">Attached</span>
                  </div>
                  <button onClick={() => handleChange('imageFill', undefined)} className="h-[38px] w-[38px] shrink-0 flex items-center justify-center rounded-xl bg-rose-500/10 ring-1 ring-rose-500/30 text-rose-300 hover:bg-rose-500/20 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 h-[38px] rounded-xl bg-white/[0.04] ring-1 ring-white/10 cursor-pointer hover:bg-white/[0.08] hover:ring-violet-500/40 transition-all">
                  <Upload className="w-4 h-4 text-slate-300" />
                  <span className="text-sm text-slate-300">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageFillUpload} />
                </label>
              )}
            </Field>
            {selectedObject.imageFill && (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
                <NumberField label="Scale" step={0.1} value={selectedObject.imageFill.scale} onChange={(val) => handleChange('imageFill', { ...selectedObject.imageFill!, scale: val })} />
                <NumberField label="Offset Y" value={selectedObject.imageFill.offsetY} onChange={(val) => handleChange('imageFill', { ...selectedObject.imageFill!, offsetY: val })} />
              </div>
            )}
          </Section>
        )}
      </div>

      {/* Lock button */}
      <div className="px-5 py-4 border-t border-white/[0.06] shrink-0">
        <button onClick={() => handleChange('locked', !selectedObject.locked)}
          className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
            selectedObject.locked
              ? 'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/20'
              : 'bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 text-violet-200 ring-1 ring-violet-500/30 hover:from-violet-500/30 hover:to-fuchsia-500/30 active:scale-[0.99]'
          }`}>
          <Lock className="w-4 h-4" />
          {selectedObject.locked ? 'Unlock Layer' : 'Lock Layer'}
        </button>
      </div>
    </div>
  );
}
