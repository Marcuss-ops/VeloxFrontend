import React, { useState, useRef, useEffect } from 'react';

interface RemoteProgress {
  step: string;
  message: string;
  progress: number;
  isError?: boolean;
}

interface RemoteStatusPanelProps {
  progress?: RemoteProgress;
  logs?: string[];
  isOpen?: boolean;
}

const DEFAULT_PROGRESS: RemoteProgress = {
  step: 'IDLE',
  message: 'In attesa di generazione...',
  progress: 0,
  isError: false,
};

export function RemoteStatusPanel({ progress = DEFAULT_PROGRESS, logs = [], isOpen = true }: RemoteStatusPanelProps) {
  const [expanded, setExpanded] = useState(isOpen);
  const logRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs to bottom when new logs arrive
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  // Determine status styling
  const statusColor = progress.isError 
    ? 'text-red-400 bg-red-500/20' 
    : progress.step === 'DONE' 
      ? 'text-green-400 bg-green-500/20' 
      : 'text-blue-400 bg-blue-500/20';

  const statusIcon = progress.isError 
    ? 'error' 
    : progress.step === 'DONE' 
      ? 'check_circle' 
      : 'cloud_sync';

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    setExpanded(!expanded);
  };

  return (
    <div className="w-full mb-6">
      <details 
        className="group bg-slate-900/90 border border-slate-700/50 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm" 
        open={expanded}
      >
        <summary 
          className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors select-none list-none"
          onClick={handleToggle}
        >
          <div className="flex items-center gap-4">
            <div className={`relative flex items-center justify-center w-8 h-8 rounded-full ${statusColor.split(' ')[1]}`}>
              <span 
                className={`material-symbols-outlined text-xl ${progress.step !== 'DONE' && !progress.isError ? 'animate-pulse' : ''}`}
              >
                {statusIcon}
              </span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                Stato Generazione Remota
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>
                  {progress.step || 'IDLE'}
                </span>
              </h3>
              <p className={`text-xs mt-0.5 ${progress.isError ? 'text-red-400' : 'text-slate-400'}`}>
                {progress.message || 'In attesa...'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  progress.isError ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${progress.progress}%` }}
              />
            </div>
            <span className="material-symbols-outlined text-slate-500 group-open:rotate-180 transition-transform">
              expand_more
            </span>
          </div>
        </summary>
        
        <div className="border-t border-slate-800/50 p-0">
          <div 
            ref={logRef}
            className="font-mono text-[10px] text-slate-500 max-h-40 overflow-y-auto p-4 bg-black/20 custom-scrollbar"
          >
            {logs.length === 0 ? (
              <div className="text-slate-600 italic">Nessun log disponibile</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </div>
      </details>
    </div>
  );
}

export default RemoteStatusPanel;