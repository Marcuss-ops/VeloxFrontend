'use client';

import { Upload, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/Button';
import LayersPanel from '@/components/editor/LayersPanel';
import { driveAssetContentUrl } from '@/lib/api';
import { useEditorStore } from '@/stores/editorStore';
import { useUIStore } from '@/stores/uiStore';
import type { UseEditorAssetsReturn } from '@/hooks/useEditorAssets';
import type { EditorSidebarTab } from '@/hooks/useEditorSidebar';

export interface LegacySidebarPanelsProps {
  sidebarTab: EditorSidebarTab;
  setSidebarTab: (tab: EditorSidebarTab) => void;
  assets: UseEditorAssetsReturn;
}

/**
 * Dormant legacy sidebar markup, moved verbatim out of page.tsx.
 *
 * Properties and Assets now live in the contextual inspector above the
 * selected canvas object. These panels are never rendered
 * (showLegacySidebarPanels is hardcoded false) — they are kept as a safe,
 * incremental migration path while Layers remains the only sidebar surface.
 */
export default function LegacySidebarPanels({
  sidebarTab,
  setSidebarTab,
  assets,
}: LegacySidebarPanelsProps) {
  const showLegacySidebarPanels = false;
  const { addObject } = useEditorStore();
  const { addToast } = useUIStore();

  const brandPresets = [
    {
      id: 'news-badge',
      name: 'Breaking News',
      src: 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=150&q=80',
      action: () => {
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
      }
    },
    {
      id: 'live-badge',
      name: 'LIVE Indicator',
      src: 'https://images.unsplash.com/photo-1598257006458-087169a1f08d?auto=format&fit=crop&w=150&q=80',
      action: () => {
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
      }
    },
    {
      id: 'yellow-border',
      name: 'Yellow Frame',
      src: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
      action: () => {
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
      }
    },
    {
      id: 'speech-bubble',
      name: 'Speech Bubble',
      src: 'https://images.unsplash.com/photo-1533750349088-cd871a723597?auto=format&fit=crop&w=150&q=80',
      action: () => {
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
      }
    }
  ];

  return (
    <>
      {/* Sidebar Tabs */}
      <div className="hidden flex gap-1 border-b border-black/[0.08] bg-white px-2 py-2 text-[11px] font-semibold select-none">
        <button
          onClick={() => setSidebarTab('design')}
          className={`flex-1 rounded-lg py-2 text-center transition-all ${
            sidebarTab === 'design' ? 'bg-black text-white shadow-sm' : 'text-black/45 hover:bg-black/5 hover:text-black'
          }`}
        >
          Design
        </button>
        <button
          onClick={() => setSidebarTab('assets')}
          className={`flex-1 rounded-lg py-2 text-center transition-all ${
            sidebarTab === 'assets' ? 'bg-black text-white shadow-sm' : 'text-black/45 hover:bg-black/5 hover:text-black'
          }`}
        >
          Asset
        </button>
      </div>

      {/* Tab Contents */}
      <div className="hidden flex-1 overflow-y-auto min-h-0 flex flex-col">
        {showLegacySidebarPanels && sidebarTab === 'design' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div />
            <div className="border-t border-black/[0.08] flex-1 overflow-hidden flex flex-col min-h-0">
              <LayersPanel />
            </div>
          </div>
        )}

        {showLegacySidebarPanels && sidebarTab === 'assets' && (
          <div className="p-4 space-y-4 flex flex-col h-full overflow-y-auto">
            <div className="space-y-2 border-b border-black/[0.08] pb-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6e6e73]">Asset Drive PNG</h4>
                <button
                  type="button"
                  onClick={() => void assets.refreshDriveAssets()}
                  disabled={assets.driveAssetsLoading}
                  className="rounded-lg border border-black/10 px-2 py-1 text-[10px] font-semibold text-[#4c4c50] hover:bg-black/[0.04] disabled:opacity-50"
                >
                  {assets.driveAssetsLoading ? 'Carico…' : 'Aggiorna'}
                </button>
              </div>
              <input
                value={assets.driveAssetFolder}
                onChange={(event) => assets.setDriveAssetFolder(event.target.value)}
                onBlur={() => void assets.refreshDriveAssets()}
                aria-label="Cartella Drive asset PNG"
                placeholder="ID cartella Google Drive"
                className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-2 text-[11px] text-[#111111] outline-none focus:border-black/30"
              />
              {assets.driveAssetsError && <p className="text-[11px] leading-relaxed text-red-600">{assets.driveAssetsError}</p>}
              {!assets.driveAssetsLoading && !assets.driveAssetsError && assets.driveAssets.length === 0 && (
                <p className="text-[11px] text-[#6e6e73]">Nessun PNG trovato nella cartella.</p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {assets.driveAssets.map((asset) => (
                  <button
                    type="button"
                    key={asset.id}
                    onClick={() => assets.addDriveAssetToCanvas(asset)}
                    className="flex flex-col items-center gap-1 rounded-xl border border-black/[0.08] bg-white p-2 text-left hover:border-black/30 hover:bg-[#f7f7f5]"
                    title="Aggiungi al canvas"
                  >
                    <img src={asset.thumbnail_url || driveAssetContentUrl(asset)} alt="" className="h-16 w-full rounded-md object-contain bg-black/[0.03]" />
                    <span className="w-full truncate text-center text-[10px] font-semibold text-[#4c4c50]">{asset.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6e6e73]">Asset di Brand Precaricati</h4>
              <div className="grid grid-cols-2 gap-2">
                {brandPresets.map((asset) => (
                  <button
                    key={asset.id}
                    onClick={asset.action}
                    className="flex flex-col items-center gap-1 rounded-xl border border-black/[0.08] bg-white p-2 text-left transition-all hover:border-black/30 hover:bg-[#f7f7f5]"
                  >
                    <img
                      src={asset.src}
                      alt={asset.name}
                      className="w-full h-16 object-cover rounded-md"
                    />
                    <span className="w-full truncate text-center text-[10px] font-semibold text-[#4c4c50]">{asset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-black/[0.08] pt-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#6e6e73]">Carica Asset Locale</h4>
              <input
                ref={assets.customAssetInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void assets.handleCustomAssetUpload(file);
                }}
              />
              <Button
                variant="outline"
                className="w-full text-xs h-9 flex items-center justify-center gap-1.5"
                onClick={() => assets.customAssetInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" />
                Carica Nuova Immagine
              </Button>
            </div>

            {assets.customAssets.length > 0 && (
              <div className="space-y-2 border-t border-black/[0.08] pt-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6e6e73]">Asset Condivisi ({assets.customAssets.length})</h4>
                <div className="grid grid-cols-2 gap-2">
                  {assets.customAssets.map((asset) => (
                    <div
                      key={asset.id}
                      className="group relative flex flex-col items-center gap-1 rounded-xl border border-black/[0.08] bg-white p-2"
                    >
                      <button
                        onClick={() => assets.addCustomAssetToCanvas(asset)}
                        className="w-full flex flex-col items-center gap-1"
                      >
                        <img
                          src={asset.src}
                          alt={asset.name}
                          className="w-full h-16 object-cover rounded-md"
                        />
                        <span className="w-full truncate text-center text-[10px] font-semibold text-[#4c4c50]">{asset.name}</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          assets.removeCustomAsset(asset.id);
                        }}
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
        )}
      </div>
    </>
  );
}
