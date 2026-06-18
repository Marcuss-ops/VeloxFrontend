import React from 'react';

// Types
interface BundleDir {
    name: string;
    type: 'folder' | 'root_files';
    size: number;
    size_formatted: string;
    file_count: number;
}

interface BundleInfo {
    exists: boolean;
    filename: string;
    version: string;
    build_id: string;
    size: number;
    size_formatted: string;
    sha256: string;
    created_at: string;
    file_count: number;
    top_dirs: BundleDir[];
    manifest?: Record<string, unknown>;
    runtime?: {
        refactored_root?: boolean;
        node?: boolean;
        npm?: boolean;
        remotion_project?: boolean;
        remotion_worker_bin?: boolean;
        voiceover_deps?: boolean;
    };
}

const formatDateTime = (iso?: string): string => {
    if (!iso) return '\u2014';
    try {
        return new Date(iso).toLocaleString('it-IT', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return '\u2014';
    }
};

// Section Badge Component
const SectionBadge: React.FC<{
    label: string;
    status: 'ok' | 'warning' | 'error' | 'unknown';
    detail?: string;
}> = ({ label, status, detail }) => {
    const statusColors = {
        ok: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        error: 'bg-red-500/20 text-red-400 border-red-500/30',
        unknown: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    };

    const statusIcons = {
        ok: 'check_circle',
        warning: 'warning',
        error: 'cancel',
        unknown: 'help',
    };

    return (
        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs border ${statusColors[status]}`}>
            <span className="material-symbols-rounded text-[14px]">{statusIcons[status]}</span>
            <span>{label}</span>
            {detail && <span className="opacity-70">({detail})</span>}
        </div>
    );
};

// Section Card Component
const SectionCard: React.FC<{
    title: string;
    icon: string;
    iconColor: string;
    children: React.ReactNode;
    collapsed?: boolean;
    onToggle?: () => void;
}> = ({ title, icon, iconColor, children, collapsed = false, onToggle }) => (
    <div className="bg-card-dark border border-border-dark rounded-xl overflow-hidden">
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors"
        >
            <div className="flex items-center gap-2">
                <span className={`material-symbols-rounded ${iconColor}`}>{icon}</span>
                <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
            </div>
            <span className={`material-symbols-rounded text-text-muted transition-transform ${collapsed ? '' : 'rotate-180'}`}>
                expand_more
            </span>
        </button>
        {!collapsed && (
            <div className="px-4 pb-4 border-t border-border-dark/50">
                {children}
            </div>
        )}
    </div>
);

// Analysis item type
interface AnalysisItem {
    exists: boolean;
    size?: string;
    count?: number;
    status: 'ok' | 'warning' | 'error' | 'unknown';
}

export interface BundleInfoPanelProps {
    bundleInfo: BundleInfo | null;
    loading: boolean;
    error: string | null;
    analysis: Record<string, AnalysisItem>;
    runtime: Record<string, boolean | undefined>;
    collapsedSections: Record<string, boolean>;
    toggleSection: (section: string) => void;
    regenerateResult: { ok: boolean; message: string } | null;
    handleRegenerate: () => void;
    fetchBundleInfo: () => void;
    regenerating: boolean;
    setCurrentPath: (path: string) => void;
    setRegenerateResult: (result: { ok: boolean; message: string } | null) => void;
}

export const BundleInfoPanel: React.FC<BundleInfoPanelProps> = ({
    bundleInfo,
    loading,
    error,
    analysis,
    runtime,
    collapsedSections,
    toggleSection,
    regenerateResult,
    handleRegenerate,
    fetchBundleInfo,
    regenerating,
    setCurrentPath,
    setRegenerateResult,
}) => {
    if (loading) {
        return (
            <div className="bg-card-dark border border-border-dark rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-rounded text-primary animate-pulse">inventory_2</span>
                    <h3 className="text-lg font-bold text-text-primary">Bundle Explorer</h3>
                </div>
                <div className="space-y-3 animate-pulse">
                    {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded-lg" />)}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-card-dark border border-red-500/30 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                    <span className="material-symbols-rounded text-red-400">error</span>
                    <h3 className="text-lg font-bold text-text-primary">Bundle Explorer</h3>
                </div>
                <div className="text-red-400 text-sm">{error}</div>
                <button onClick={() => fetchBundleInfo()} className="mt-3 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm">
                    Riprova
                </button>
            </div>
        );
    }

    if (!bundleInfo) return null;

    return (
        <div className="space-y-6">
            {/* Header Card */}
            <div className="bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/30 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-border-dark/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-rounded text-primary text-[28px]">inventory_2</span>
                            <div>
                                <h3 className="text-lg font-bold text-text-primary">Bundle Explorer</h3>
                                <p className="text-xs text-text-muted">
                                    Versione {bundleInfo.version} &bull; Build {bundleInfo.build_id?.slice(0, 8) || 'N/A'} &bull; Generato {formatDateTime(bundleInfo.created_at)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Regenerate Button */}
                            <button
                                onClick={handleRegenerate}
                                disabled={regenerating}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                    regenerating
                                        ? 'bg-amber-500/20 text-amber-400 cursor-wait'
                                        : 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 border border-violet-500/30'
                                }`}
                            >
                                <span className={`material-symbols-rounded text-[18px] ${regenerating ? 'animate-spin' : ''}`}>
                                    {regenerating ? 'sync' : 'build'}
                                </span>
                                <span>{regenerating ? 'Rigenerazione...' : 'Rigenera Bundle'}</span>
                            </button>
                            <div className="text-right">
                                <div className="text-lg font-bold text-emerald-400">{bundleInfo.size_formatted ?? (typeof bundleInfo.size === 'number' ? `${(bundleInfo.size / 1024 / 1024).toFixed(1)} MB` : '\u2014')}</div>
                                <div className="text-xs text-text-muted">{(bundleInfo.file_count ?? 0).toLocaleString()} file</div>
                            </div>
                            <button
                                onClick={() => fetchBundleInfo()}
                                className="p-2 rounded-lg hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors"
                                title="Aggiorna info"
                            >
                                <span className="material-symbols-rounded">refresh</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-4 md:grid-cols-8 gap-px bg-border-dark/50">
                    {analysis.venv && (
                        <div className="bg-card-dark p-3 text-center hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setCurrentPath('venv')}>
                            <span className={`material-symbols-rounded ${analysis.venv.exists ? 'text-emerald-400' : 'text-amber-400'}`}>
                                {analysis.venv.exists ? 'check_circle' : 'warning'}
                            </span>
                            <div className="text-[10px] text-text-muted mt-1">venv</div>
                        </div>
                    )}
                    {analysis.source && (
                        <div className="bg-card-dark p-3 text-center hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setCurrentPath('src')}>
                            <span className={`material-symbols-rounded ${analysis.source.exists ? 'text-emerald-400' : 'text-red-400'}`}>
                                {analysis.source.exists ? 'code' : 'error'}
                            </span>
                            <div className="text-[10px] text-text-muted mt-1">codice</div>
                        </div>
                    )}
                    {analysis.remotion && (
                        <div className="bg-card-dark p-3 text-center hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setCurrentPath('Remotion')}>
                            <span className={`material-symbols-rounded ${analysis.remotion.exists ? 'text-violet-400' : 'text-slate-400'}`}>
                                movie
                            </span>
                            <div className="text-[10px] text-text-muted mt-1">Remotion</div>
                        </div>
                    )}
                    {analysis.config && (
                        <div className="bg-card-dark p-3 text-center hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setCurrentPath('config')}>
                            <span className={`material-symbols-rounded ${analysis.config.exists ? 'text-blue-400' : 'text-slate-400'}`}>
                                settings
                            </span>
                            <div className="text-[10px] text-text-muted mt-1">config</div>
                        </div>
                    )}
                    {analysis.tests && (
                        <div className="bg-card-dark p-3 text-center hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setCurrentPath('tests')}>
                            <span className={`material-symbols-rounded ${analysis.tests.exists ? 'text-emerald-400' : 'text-amber-400'}`}>
                                science
                            </span>
                            <div className="text-[10px] text-text-muted mt-1">tests</div>
                        </div>
                    )}
                    {analysis.scripts && (
                        <div className="bg-card-dark p-3 text-center hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setCurrentPath('scripts')}>
                            <span className={`material-symbols-rounded ${analysis.scripts.exists ? 'text-blue-400' : 'text-slate-400'}`}>
                                terminal
                            </span>
                            <div className="text-[10px] text-text-muted mt-1">scripts</div>
                        </div>
                    )}
                    {analysis.assets && (
                        <div className="bg-card-dark p-3 text-center hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setCurrentPath('assets')}>
                            <span className={`material-symbols-rounded ${analysis.assets.exists ? 'text-pink-400' : 'text-slate-400'}`}>
                                perm_media
                            </span>
                            <div className="text-[10px] text-text-muted mt-1">assets</div>
                        </div>
                    )}
                    <div className="bg-card-dark p-3 text-center hover:bg-white/5 transition-colors cursor-pointer" onClick={() => setCurrentPath('')}>
                        <span className="material-symbols-rounded text-slate-400">folder_open</span>
                        <div className="text-[10px] text-text-muted mt-1">tutto</div>
                    </div>
                </div>

                {/* Runtime Status */}
                <div className="px-6 py-4 border-t border-border-dark/50">
                    <div className="text-[10px] text-text-muted mb-2 uppercase tracking-wider">Runtime inclusi nel bundle</div>
                    <div className="flex flex-wrap gap-2">
                        <SectionBadge
                            label="Node.js"
                            status={runtime.node ? 'ok' : 'error'}
                            detail={runtime.node ? 'bundle' : 'missing'}
                        />
                        <SectionBadge
                            label="npm"
                            status={runtime.npm ? 'ok' : 'warning'}
                            detail={runtime.npm ? 'bundle' : 'missing'}
                        />
                        <SectionBadge
                            label="Remotion Project"
                            status={runtime.remotion_project ? 'ok' : 'warning'}
                            detail={runtime.remotion_project ? 'bundle' : 'missing'}
                        />
                        <SectionBadge
                            label="Remotion Worker"
                            status={runtime.remotion_worker_bin ? 'ok' : 'warning'}
                            detail={runtime.remotion_worker_bin ? 'bin' : 'missing'}
                        />
                        <SectionBadge
                            label="Voices"
                            status={runtime.voiceover_deps ? 'ok' : 'warning'}
                            detail={runtime.voiceover_deps ? 'deps' : 'missing'}
                        />
                        <SectionBadge
                            label="Refactored root"
                            status={runtime.refactored_root ? 'ok' : 'error'}
                            detail={runtime.refactored_root ? 'ok' : 'missing'}
                        />
                    </div>
                </div>
            </div>

            {/* Sections Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Structure Section */}
                <SectionCard
                    title="Struttura Cartelle"
                    icon="account_tree"
                    iconColor="text-blue-400"
                    collapsed={collapsedSections.structure}
                    onToggle={() => toggleSection('structure')}
                >
                    <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                <span className="material-symbols-rounded text-blue-400">code</span>
                                <span className="text-text-secondary">src/ &rarr; codice principale</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                <span className="material-symbols-rounded text-amber-400">settings</span>
                                <span className="text-text-secondary">config/ &rarr; configurazioni</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                <span className="material-symbols-rounded text-emerald-400">science</span>
                                <span className="text-text-secondary">tests/ &rarr; test</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                <span className="material-symbols-rounded text-pink-400">perm_media</span>
                                <span className="text-text-secondary">assets/ &rarr; risorse</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                <span className="material-symbols-rounded text-violet-400">terminal</span>
                                <span className="text-text-secondary">scripts/ &rarr; utility</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                                <span className="material-symbols-rounded text-red-400">description</span>
                                <span className="text-text-secondary">logs/ &rarr; log runtime</span>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* Dependencies Section */}
                <SectionCard
                    title="Dipendenze"
                    icon="extension"
                    iconColor="text-purple-400"
                    collapsed={collapsedSections.dependencies}
                    onToggle={() => toggleSection('dependencies')}
                >
                    <div className="mt-3 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-text-secondary">Python Runtime</span>
                            <SectionBadge label="requirements.txt" status="ok" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-text-secondary">Dev/Test Dependencies</span>
                            <SectionBadge label="dev-requirements.txt" status="unknown" />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-text-secondary">Lock File</span>
                            <SectionBadge label="Pipfile.lock" status="unknown" />
                        </div>
                        <div className="mt-2 p-3 bg-black/30 rounded-lg">
                            <div className="text-[10px] text-text-muted mb-2">DIPENDENZE PRINCIPALI</div>
                            <div className="space-y-1 text-xs font-mono text-text-secondary">
                                <div>fastapi &ge; 0.100.0</div>
                                <div>uvicorn &ge; 0.23.0</div>
                                <div>pydantic &ge; 2.0.0</div>
                                <div>moviepy &ge; 1.0.3</div>
                                <div>openai-whisper &ge; 20231117</div>
                            </div>
                        </div>
                    </div>
                </SectionCard>

                {/* venv Section */}
                <SectionCard
                    title="Virtual Environment"
                    icon="python"
                    iconColor="text-yellow-400"
                    collapsed={collapsedSections.venv}
                    onToggle={() => toggleSection('venv')}
                >
                    <div className="mt-3">
                        {analysis.venv?.exists ? (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                                    <span className="text-sm text-text-secondary">Dimensione</span>
                                    <span className="text-sm text-text-primary font-medium">{analysis.venv.size}</span>
                                </div>
                                <div className="flex items-center justify-between p-2 bg-white/5 rounded">
                                    <span className="text-sm text-text-secondary">File</span>
                                    <span className="text-sm text-text-primary font-medium">{analysis.venv.count != null ? Number(analysis.venv.count).toLocaleString() : '\u2014'}</span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <SectionBadge label="Presente" status="ok" />
                                    <SectionBadge label="Isolato" status="ok" />
                                </div>
                            </div>
                        ) : (
                            <div className="text-amber-400 text-sm flex items-center gap-2">
                                <span className="material-symbols-rounded">warning</span>
                                <span>venv non incluso nel bundle</span>
                            </div>
                        )}
                    </div>
                </SectionCard>

                {/* Tests Section */}
                <SectionCard
                    title="Test & Copertura"
                    icon="science"
                    iconColor="text-emerald-400"
                    collapsed={collapsedSections.tests}
                    onToggle={() => toggleSection('tests')}
                >
                    <div className="mt-3 space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                            <div className="text-center p-2 bg-white/5 rounded">
                                <div className="text-lg font-bold text-emerald-400">--</div>
                                <div className="text-[10px] text-text-muted">Unit Tests</div>
                            </div>
                            <div className="text-center p-2 bg-white/5 rounded">
                                <div className="text-lg font-bold text-blue-400">--</div>
                                <div className="text-[10px] text-text-muted">Integration</div>
                            </div>
                            <div className="text-center p-2 bg-white/5 rounded">
                                <div className="text-lg font-bold text-violet-400">--%</div>
                                <div className="text-[10px] text-text-muted">Coverage</div>
                            </div>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-emerald-500" style={{ width: '0%' }}></div>
                        </div>
                        <div className="text-xs text-text-muted">
                            Esegui <code className="bg-black/30 px-1 rounded">pytest --cov</code> per generare il report
                        </div>
                    </div>
                </SectionCard>

                {/* Health Check Section */}
                <SectionCard
                    title="Health Check Pre-Run"
                    icon="health_and_safety"
                    iconColor="text-green-400"
                    collapsed={collapsedSections.health}
                    onToggle={() => toggleSection('health')}
                >
                    <div className="mt-3 space-y-2">
                        {[
                            { name: 'Python 3.10+', icon: 'terminal', status: 'unknown' },
                            { name: 'pip installato', icon: 'download', status: 'unknown' },
                            { name: 'ffmpeg disponibile', icon: 'movie', status: 'unknown' },
                            { name: 'cartelle necessarie', icon: 'folder', status: 'unknown' },
                            { name: 'permessi scrittura', icon: 'edit', status: 'unknown' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-rounded text-slate-400 text-[16px]">{item.icon}</span>
                                    <span className="text-sm text-text-secondary">{item.name}</span>
                                </div>
                                <span className="material-symbols-rounded text-slate-400 text-[16px]">help</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* Health Check Pre-Bundle */}
                <SectionCard
                    title="Health Check Pre-Bundle"
                    icon="inventory_2"
                    iconColor="text-violet-400"
                    collapsed={collapsedSections.healthBundle}
                    onToggle={() => toggleSection('healthBundle')}
                >
                    <div className="mt-3 space-y-2">
                        {[
                            { name: 'worker_code.zip presente', icon: 'folder_zip', status: 'unknown' },
                            { name: 'Spazio disco sufficiente', icon: 'storage', status: 'unknown' },
                            { name: 'Directory bundle scrivibile', icon: 'folder_open', status: 'unknown' },
                            { name: 'Node.js / npm (build)', icon: 'terminal', status: 'unknown' },
                            { name: 'Zip valido / integrità', icon: 'verified', status: 'unknown' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-2 bg-white/5 rounded">
                                <div className="flex items-center gap-2">
                                    <span className="material-symbols-rounded text-slate-400 text-[16px]">{item.icon}</span>
                                    <span className="text-sm text-text-secondary">{item.name}</span>
                                </div>
                                <span className="material-symbols-rounded text-slate-400 text-[16px]">help</span>
                            </div>
                        ))}
                    </div>
                </SectionCard>

                {/* Riferimento checklist: vive nel bundle (BundleRemote), non in UI */}
                <SectionCard
                    title="Deploy worker remoto"
                    icon="checklist"
                    iconColor="text-amber-400"
                    collapsed={collapsedSections.deployChecklist}
                    onToggle={() => toggleSection('deployChecklist')}
                >
                    <div className="mt-3 text-sm text-text-muted">
                        La checklist deploy (Preflight, Provisioning, Self-test, Heartbeat, Smoke job, ONLINE, Monitor) è nel bundle: <code className="bg-black/30 px-1 rounded">RemoteCodex/DEPLOY_WORKER_CHECKLIST.md</code>. Usala sul remoto o da Ansible dopo l'installazione.
                    </div>
                </SectionCard>

                {/* Changelog Section */}
                <SectionCard
                    title="Changelog"
                    icon="history"
                    iconColor="text-orange-400"
                    collapsed={collapsedSections.changelog}
                    onToggle={() => toggleSection('changelog')}
                >
                    <div className="mt-3">
                        <div className="text-xs text-text-muted mb-2">
                            Versione {bundleInfo.version} &bull; {formatDateTime(bundleInfo.created_at)}
                        </div>
                        <div className="space-y-2 text-xs">
                            <div className="flex gap-2">
                                <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[10px]">ADD</span>
                                <span className="text-text-secondary">Bundle Explorer UI</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px]">FIX</span>
                                <span className="text-text-secondary">Migliorata struttura cartelle</span>
                            </div>
                            <div className="flex gap-2">
                                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">CHANGE</span>
                                <span className="text-text-secondary">Aggiornato requirements.txt</span>
                            </div>
                        </div>
                        <button className="mt-3 text-xs text-primary hover:underline">
                            Vedi CHANGELOG.md completo &rarr;
                        </button>
                    </div>
                </SectionCard>
            </div>

            {/* Regenerate Result Toast */}
            {regenerateResult && (
                <div className={`fixed bottom-4 right-4 z-50 max-w-md p-4 rounded-xl border shadow-lg ${
                    regenerateResult.ok
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                        : 'bg-red-500/20 border-red-500/30 text-red-400'
                }`}>
                    <div className="flex items-start gap-3">
                        <span className="material-symbols-rounded">
                            {regenerateResult.ok ? 'check_circle' : 'error'}
                        </span>
                        <div className="flex-1">
                            <div className="font-medium">{regenerateResult.ok ? 'Bundle Rigenerato' : 'Errore'}</div>
                            <div className="text-sm opacity-80 mt-1">{regenerateResult.message}</div>
                        </div>
                        <button
                            onClick={() => setRegenerateResult(null)}
                            className="opacity-70 hover:opacity-100"
                        >
                            <span className="material-symbols-rounded text-[18px]">close</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Manifest Details */}
            {bundleInfo.manifest && (
                <details className="bg-card-dark border border-border-dark rounded-xl group">
                    <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm text-text-secondary hover:text-text-primary">
                        <span className="material-symbols-rounded text-[16px] group-open:rotate-90 transition-transform">chevron_right</span>
                        <span>Manifest Completo (JSON)</span>
                    </summary>
                    <pre className="p-4 text-xs text-text-muted overflow-x-auto font-mono border-t border-border-dark">
                        {JSON.stringify(bundleInfo.manifest, null, 2)}
                    </pre>
                </details>
            )}
        </div>
    );
};

export default BundleInfoPanel;