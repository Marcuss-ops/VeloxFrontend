'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import PropertiesPanel from '@/components/editor/PropertiesPanel';
import LayersPanel from '@/components/editor/LayersPanel';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import { useEditorTemplates } from '@/hooks/useEditorTemplates';
import { uploadImage } from '@/lib/api';
import { v4 as uuidv4 } from 'uuid';

interface CustomAsset {
  id: string;
  name: string;
  src: string;
}

const PRELOADED_ASSETS = [
  {
    id: 'news-badge',
    name: 'Breaking News',
    src: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'live-badge',
    name: 'LIVE Indicator',
    src: 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'yellow-border',
    name: 'Yellow Frame',
    src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
  },
  {
    id: 'speech-bubble',
    name: 'Speech Bubble',
    src: 'https://images.unsplash.com/photo-1533750349088-cd871a723597?auto=format&fit=crop&w=150&q=80',
  },
];

export default function EditorSidebar() {
  const { selectedIds, objects, addObject } = useEditorStore();
  const { addToast, setUploading } = useUIStore();

  const [sidebarTab, setSidebarTab] = useState<'design' | 'templates' | 'assets'>('design');
  const [customAssets, setCustomAssets] = useState<CustomAsset[]>([]);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const sidebarTimerRef = useRef<NodeJS.Timeout | null>(null);
  const customAssetInputRef = useRef<HTMLInputElement>(null);

  const {
    templates,
    newTemplateName,
    setNewTemplateName,
    handleSaveTemplate,
    handleApplyTemplate,
    handleDeleteTemplate,
  } = useEditorTemplates();

  useEffect(() => {
    try {
      const stored = localStorage.getItem('dark_editor_custom_assets');
      if (stored) {
        setCustomAssets(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Auto-open sidebar when an object is selected, close after 4s idle.
  useEffect(() => {
    if (selectedIds.length > 0) {
      setSidebarPinned(true);
      if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
      sidebarTimerRef.current = setTimeout(() => setSidebarPinned(false), 4000);
    } else {
      setSidebarPinned(false);
      if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
    }
    return () => {
      if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
    };
  }, [selectedIds]);

  const handleSidebarEnter = () => {
    if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
  };

  const handleSidebarLeave = () => {
    if (selectedIds.length > 0) {
      sidebarTimerRef.current = setTimeout(() => setSidebarPinned(false), 4000);
    } else {
      setSidebarPinned(false);
    }
  };

  const handleAssetUpload = async (file: File) => {
    try {
      setUploading(true);
      const res = await uploadImage(file);
      const newAsset: CustomAsset = {
        id: uuidv4(),
        name: file.name.split('.')[0],
        src:
          res.url.startsWith('http') || res.url.startsWith('data:')
            ? res.url
            : `/dark_editor_v2/${res.url}`,
      };
      const updated = [newAsset, ...customAssets];
      setCustomAssets(updated);
      localStorage.setItem('dark_editor_custom_assets', JSON.stringify(updated));
      addToast({ type: 'success', message: 'Asset caricato con successo!' });
    } catch (err) {
      addToast({ type: 'error', message: 'Errore durante il caricamento' });
    } finally {
      setUploading(false);
    }
  };

  const handleAddPreloadedAsset = (id: string) => {
    switch (id) {
      case 'news-badge':
        addObject({
          id: uuidv4(),
          type: 'rect',
          name: 'Breaking News Red Bar',
          x: 50,
          y: 300,
          width: 700,
          height: 80,
          fill: '#e11d48',
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 0.9,
          visible: true,
          locked: false,
        });
        addObject({
          id: uuidv4(),
          type: 'text',
          name: 'Breaking News Text',
          x: 70,
          y: 315,
          width: 300,
          height: 50,
          text: 'BREAKING NEWS',
          fontSize: 36,
          fontFamily: 'Impact',
          fill: '#ffffff',
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
        });
        addToast({ type: 'success', message: 'Elemento Breaking News aggiunto!' });
        break;
      case 'live-badge':
        addObject({
          id: uuidv4(),
          type: 'rect',
          name: 'LIVE Red Badge',
          x: 50,
          y: 50,
          width: 120,
          height: 50,
          fill: '#dc2626',
          borderRadius: 8,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
        });
        addObject({
          id: uuidv4(),
          type: 'text',
          name: 'LIVE Text',
          x: 75,
          y: 60,
          width: 100,
          height: 30,
          text: 'LIVE',
          fontSize: 22,
          fontFamily: 'Arial',
          fill: '#ffffff',
          fontWeight: 'bold',
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
        });
        addToast({ type: 'success', message: 'Elemento LIVE aggiunto!' });
        break;
      case 'yellow-border':
        addObject({
          id: uuidv4(),
          type: 'rect',
          name: 'Yellow Border Outline',
          x: 0,
          y: 0,
          width: 800,
          height: 450,
          fill: 'transparent',
          stroke: '#facc15',
          strokeWidth: 20,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
        });
        addToast({ type: 'success', message: 'Cornice Gialla aggiunta!' });
        break;
      case 'speech-bubble':
        addObject({
          id: uuidv4(),
          type: 'rect',
          name: 'Speech Bubble Base',
          x: 450,
          y: 80,
          width: 280,
          height: 120,
          fill: '#ffffff',
          borderRadius: 20,
          stroke: '#000000',
          strokeWidth: 4,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
        });
        addObject({
          id: uuidv4(),
          type: 'text',
          name: 'Speech Bubble Text',
          x: 470,
          y: 115,
          width: 200,
          height: 40,
          text: 'MA DAVVERO?!',
          fontSize: 24,
          fontFamily: 'Impact',
          fill: '#000000',
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          opacity: 1,
          visible: true,
          locked: false,
        });
        addToast({ type: 'success', message: 'Fumetto aggiunto!' });
        break;
    }
  };

  const handleRemoveCustomAsset = (e: React.MouseEvent, asset: CustomAsset) => {
    e.stopPropagation();
    const updated = customAssets.filter((a) => a.id !== asset.id);
    setCustomAssets(updated);
    localStorage.setItem('dark_editor_custom_assets', JSON.stringify(updated));
    addToast({ type: 'info', message: 'Asset rimosso' });
  };

  const renderDesignTab = () => (
    <div className="flex-1 flex flex-col min-h-0">
      <PropertiesPanel />
      <div className="border-t border-slate-800 flex-1 overflow-hidden flex flex-col min-h-0">
        <LayersPanel />
      </div>
    </div>
  );

  const renderTemplatesTab = () => (
    <div className="p-4 space-y-4 flex flex-col h-full overflow-y-auto">
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salva come Template</h4>
        <div className="flex items-center gap-2">
          <Input
            value={newTemplateName}
            onChange={(e) => setNewTemplateName(e.target.value)}
            placeholder="Nome template (es. Telegiornale)"
            className="h-9 text-xs"
          />
          <Button size="sm" onClick={handleSaveTemplate} disabled={objects.length === 0}>
            Salva
          </Button>
        </div>
      </div>

      <div className="border-t border-slate-800 pt-3 space-y-3">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Libreria Template ({templates.length})
        </h4>
        {templates.length === 0 ? (
          <div className="text-xs text-slate-500 italic p-2">
            Nessun template salvato. Crea uno stile e salvalo per riutilizzarlo in altre nicchie!
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div key={t.id} className="flex flex-col gap-2 border border-slate-800 rounded-lg p-2.5 bg-slate-950/40">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-200 truncate">{t.name}</div>
                  <div className="text-[10px] text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</div>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                  <Button size="xs" variant="outline" onClick={() => handleApplyTemplate(t)}>
                    Applica
                  </Button>
                  <Button size="xs" variant="destructive" onClick={() => handleDeleteTemplate(t.id)}>
                    Elimina
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderAssetsTab = () => (
    <div className="p-4 space-y-4 flex flex-col h-full overflow-y-auto">
      <div className="space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asset di Brand Precaricati</h4>
        <div className="grid grid-cols-2 gap-2">
          {PRELOADED_ASSETS.map((asset) => (
            <button
              key={asset.id}
              onClick={() => handleAddPreloadedAsset(asset.id)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-800 hover:border-primary hover:bg-primary/5 transition-all text-left bg-slate-950/20"
            >
              <img src={asset.src} alt={asset.name} className="w-full h-16 object-cover rounded-md" />
              <span className="text-[10px] font-semibold text-slate-300 truncate w-full text-center">{asset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 pt-3 space-y-2">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Carica Asset Locale</h4>
        <input
          ref={customAssetInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void handleAssetUpload(file);
          }}
        />
        <Button
          variant="outline"
          className="w-full text-xs h-9 flex items-center justify-center gap-1.5"
          onClick={() => customAssetInputRef.current?.click()}
        >
          <Upload className="w-3.5 h-3.5" />
          Carica Nuova Immagine
        </Button>
      </div>

      {customAssets.length > 0 && (
        <div className="space-y-2 border-t border-slate-800 pt-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Asset Condivisi ({customAssets.length})
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {customAssets.map((asset) => (
              <div
                key={asset.id}
                className="relative group flex flex-col items-center gap-1 p-2 rounded-lg border border-slate-800 bg-slate-950/20"
              >
                <button
                  onClick={() => {
                    addObject({
                      id: uuidv4(),
                      type: 'image',
                      name: asset.name,
                      x: 100,
                      y: 100,
                      width: 250,
                      height: 180,
                      rotation: 0,
                      scaleX: 1,
                      scaleY: 1,
                      opacity: 1,
                      visible: true,
                      locked: false,
                      src: asset.src,
                    });
                    addToast({ type: 'success', message: `Immagine ${asset.name} aggiunta!` });
                  }}
                  className="w-full flex flex-col items-center gap-1"
                >
                  <img src={asset.src} alt={asset.name} className="w-full h-16 object-cover rounded-md" />
                  <span className="text-[10px] font-semibold text-slate-300 truncate w-full text-center">
                    {asset.name}
                  </span>
                </button>
                <button
                  onClick={(e) => handleRemoveCustomAsset(e, asset)}
                  className="absolute top-1 right-1 p-1 bg-red-600/90 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Rimuovi"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <aside
      onMouseEnter={handleSidebarEnter}
      onMouseLeave={handleSidebarLeave}
      className={`sidebar-shell fixed right-0 top-0 bottom-0 w-[400px] transition-transform duration-300 ease-out flex flex-col z-30 ${
        sidebarPinned ? 'translate-x-0' : 'translate-x-[370px] hover:translate-x-0'
      }`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-[30px] flex items-center justify-center bg-white/[0.03] border-r border-white/[0.06] cursor-pointer">
        <div className="w-1.5 h-16 rounded-full bg-sky-400/55 opacity-70 shadow-[0_0_18px_rgba(56,189,248,0.2)]"></div>
      </div>
      <div
        className="pl-[30px] flex flex-col h-full bg-slate-900 border-l border-slate-800"
        onClick={handleSidebarEnter}
      >
        <div className="flex border-b border-slate-850 bg-slate-950 text-xs font-semibold select-none">
          {(['design', 'templates', 'assets'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setSidebarTab(tab)}
              className={`flex-1 py-3 text-center border-b-2 transition-all ${
                sidebarTab === tab
                  ? 'border-primary text-primary bg-slate-900/50'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          {sidebarTab === 'design' && renderDesignTab()}
          {sidebarTab === 'templates' && renderTemplatesTab()}
          {sidebarTab === 'assets' && renderAssetsTab()}
        </div>
      </div>
    </aside>
  );
}
