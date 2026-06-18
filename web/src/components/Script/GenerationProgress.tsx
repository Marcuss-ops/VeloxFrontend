interface ProgressSectionProps {
  label: string;
  percent: number;
  status: string;
  logs: string[];
  icon: string;
  colorClass: string;
}

function ProgressSection({ label, percent, status, logs, icon, colorClass }: ProgressSectionProps) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-lg ${colorClass}`}>{icon}</span>
          <span className="text-sm font-semibold text-slate-300">{label}</span>
        </div>
        <span className="text-xs text-slate-500">{status}</span>
      </div>
      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${colorClass.replace('text-', 'bg-')}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {logs.length > 0 && (
        <div className="mt-2 text-[10px] text-slate-500 font-mono">
          {logs.slice(-3).map((log, i) => (
            <div key={i}>{log}</div>
          ))}
        </div>
      )}
    </div>
  );
}

interface GenerationProgressProps {
  scripting?: { percent: number; status: string; logs: string[] };
  voiceover?: { percent: number; status: string; logs: string[] };
  global?: number;
}

const DEFAULT_SECTION = { percent: 0, status: 'In attesa...', logs: [] };

export function GenerationProgress({ scripting = DEFAULT_SECTION, voiceover = DEFAULT_SECTION, global = 0 }: GenerationProgressProps) {
  // Ensure we have fallback data if null is passed explicitly
  const s = scripting || DEFAULT_SECTION;
  const v = voiceover || DEFAULT_SECTION;

  return (
    <div className="space-y-4">
      {/* Global Progress */}
      <div className="text-center mb-4">
        <span className="text-2xl font-bold text-white">{global}%</span>
        <p className="text-xs text-slate-500">Progresso Totale</p>
      </div>
      
      {/* Script Progress */}
      <ProgressSection
        label="Script"
        percent={s.percent ?? 0}
        status={s.status ?? 'In attesa...'}
        logs={s.logs ?? []}
        icon="description"
        colorClass="text-blue-400"
      />
      
      {/* Voiceover Progress */}
      <ProgressSection
        label="Voiceover"
        percent={v.percent ?? 0}
        status={v.status ?? 'In attesa...'}
        logs={v.logs ?? []}
        icon="graphic_eq"
        colorClass="text-purple-400"
      />
    </div>
  );
}

export default GenerationProgress;