import React, { useState, useEffect, useRef } from 'react';
import { AnsibleRun } from './types';
import { SummaryEvent, AnimatedDots, SummaryEventLine, stripAnsi, formatDuration } from './AnsibleProgressSteps';

interface AnsibleOperationProgressProps {
    isVisible: boolean;
    action: string;
    targets: string[];
    runId: string | null;
    runs: AnsibleRun[];
    onClose: () => void;
    onRefresh: () => void;
}

const actionConfig: Record<string, { 
    title: string; 
    icon: string; 
    color: string; 
    bgColor: string;
    borderColor: string;
    description: string;
}> = {
    'update_workers': {
        title: 'Aggiornamento Workers',
        icon: 'upgrade',
        color: 'text-violet-400',
        bgColor: 'bg-violet-500/10',
        borderColor: 'border-violet-500/30',
        description: 'Sincronizzazione codice e riavvio servizi'
    },
    'install_workers': {
        title: 'Installazione Workers',
        icon: 'build',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/30',
        description: 'Installazione completa dipendenze e configurazione'
    },
    'preflight_workers': {
        title: 'Preflight Check',
        icon: 'flight_takeoff',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        description: 'Verifica SSH, disco, Python, ffmpeg e stato worker'
    },
    'restart_computer': {
        title: 'Riavvio Servers',
        icon: 'power_settings_new',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        description: 'Riavvio sicuro dei server selezionati'
    },
    'test_ssh': {
        title: 'Test SSH',
        icon: 'terminal',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        description: 'Verifica connettività SSH'
    }
};

export const AnsibleOperationProgress: React.FC<AnsibleOperationProgressProps> = ({
    isVisible,
    action,
    targets,
    runId,
    runs,
    onClose,
    onRefresh
}) => {
    const [globalProgress, setGlobalProgress] = useState(0);
    const [currentPhase, setCurrentPhase] = useState('Inizializzazione...');
    const [isComplete, setIsComplete] = useState(false);
    const [hasErrors, setHasErrors] = useState(false);
    const [summaryEvents, setSummaryEvents] = useState<SummaryEvent[]>([]);
    const [completedHosts, setCompletedHosts] = useState(0);
    const [failedHosts, setFailedHosts] = useState(0);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const startTimeRef = useRef<Date | null>(null);
    const processedOutputRef = useRef<string>('');
    const eventsContainerRef = useRef<HTMLDivElement>(null);
    const lastProgressLogRef = useRef<Date | null>(null);

    const config = actionConfig[action] || actionConfig['update_workers'];

    // Initialize
    useEffect(() => {
        if (isVisible && targets.length > 0) {
            startTimeRef.current = new Date();
            lastProgressLogRef.current = null;
            setGlobalProgress(0);
            setCurrentPhase('Inizializzazione...');
            setIsComplete(false);
            setHasErrors(false);
            setSummaryEvents([]);
            setCompletedHosts(0);
            setFailedHosts(0);
            setElapsedSeconds(0);
            processedOutputRef.current = '';
            
            // Add initial events
            const now = new Date();
            const initialEvents: SummaryEvent[] = [
                {
                    id: 'init',
                    type: 'info',
                    message: `🚀 Avvio operazione su ${targets.length} target`,
                    timestamp: now
                },
                {
                    id: 'targets',
                    type: 'info',
                    message: `📍 Target: ${targets.join(', ')}`,
                    timestamp: new Date(now.getTime() + 100)
                },
                {
                    id: 'config',
                    type: 'info',
                    message: `⚙️ Configurazione: ${config.title}`,
                    timestamp: new Date(now.getTime() + 200)
                },
                {
                    id: 'start',
                    type: 'task',
                    message: `Connessione SSH in corso...`,
                    timestamp: new Date(now.getTime() + 300)
                }
            ];
            setSummaryEvents(initialEvents);
        }
    }, [isVisible, targets, config.title]);

    // Timer for elapsed seconds
    useEffect(() => {
        if (!isVisible || isComplete) return;
        
        const timer = setInterval(() => {
            if (startTimeRef.current) {
                const elapsed = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000);
                setElapsedSeconds(elapsed);
            }
        }, 1000);
        
        return () => clearInterval(timer);
    }, [isVisible, isComplete]);

    // Periodic progress summary (every 60 seconds)
    useEffect(() => {
        if (!isVisible || isComplete || !startTimeRef.current) return;
        
        const progressInterval = setInterval(() => {
            const now = new Date();
            
            // Add progress summary every 60 seconds
            if (lastProgressLogRef.current === null || 
                (now.getTime() - lastProgressLogRef.current.getTime()) >= 60000) {
                
                lastProgressLogRef.current = now;
                
                const pendingCount = targets.length - completedHosts - failedHosts;
                const progressPercent = Math.round(((completedHosts + failedHosts) / targets.length) * 100);
                
                setSummaryEvents(prev => [...prev, {
                    id: `progress-${Date.now()}`,
                    type: 'progress',
                    message: `📊 Progresso: ${completedHosts} completati, ${pendingCount} in corso (${progressPercent}%)`,
                    timestamp: now
                }]);
            }
        }, 10000); // Check every 10 seconds
        
        return () => clearInterval(progressInterval);
    }, [isVisible, isComplete, targets.length, completedHosts, failedHosts]);

    // Poll for updates
    useEffect(() => {
        if (!isVisible || !runId || isComplete) return;
        
        const pollInterval = setInterval(() => {
            onRefresh();
        }, 1500);
        
        return () => clearInterval(pollInterval);
    }, [isVisible, runId, isComplete, onRefresh]);

    // Process run updates
    useEffect(() => {
        if (!runId) return;
        
        const currentRun = runs.find(r => r.run_id === runId || (r as any).id === runId);
        if (!currentRun) return;

        const output = stripAnsi((currentRun.preamble || '') + (currentRun.output || ''));
        
        // Only process new output
        if (output.length > processedOutputRef.current.length) {
            const newOutput = output.slice(processedOutputRef.current.length);
            processedOutputRef.current = output;
            
            // Parse and add summary events
            const lines = newOutput.split('\n').filter(l => l.trim());
            const newEvents: SummaryEvent[] = [];
            
            for (const line of lines) {
                // Parse PLAY [name]
                const playMatch = line.match(/PLAY \[(.+?)\]/);
                if (playMatch) {
                    newEvents.push({
                        id: `play-${Date.now()}-${Math.random()}`,
                        type: 'play',
                        message: `🎭 Play: ${playMatch[1]}`,
                        timestamp: new Date()
                    });
                }
                
                // Parse TASK [name]
                const taskMatch = line.match(/TASK \[(.+?)\]/);
                if (taskMatch) {
                    newEvents.push({
                        id: `task-${Date.now()}-${Math.random()}`,
                        type: 'task',
                        message: `▶ ${taskMatch[1]}`,
                        timestamp: new Date()
                    });
                    setCurrentPhase(taskMatch[1]);
                }
                
                // Parse ok: [host] or changed: [host]
                const successMatch = line.match(/(ok|changed):\s*\[([^\]]+)\]/);
                if (successMatch) {
                    setCompletedHosts(prev => prev + 1);
                    newEvents.push({
                        id: `success-${Date.now()}-${Math.random()}`,
                        type: 'host_success',
                        message: `✅ ${successMatch[2]} completato`,
                        timestamp: new Date()
                    });
                }
                
                // Parse failed: [host]
                const failedMatch = line.match(/(failed|unreachable):\s*\[([^\]]+)\]/);
                if (failedMatch) {
                    setFailedHosts(prev => prev + 1);
                    newEvents.push({
                        id: `failed-${Date.now()}-${Math.random()}`,
                        type: 'host_failed',
                        message: `❌ ${failedMatch[2]} fallito`,
                        timestamp: new Date()
                    });
                }
            }
            
            if (newEvents.length > 0) {
                setSummaryEvents(prev => [...prev, ...newEvents].slice(-30));
            }
        }

        // Check completion
        if (currentRun.status !== 'running' && currentRun.status !== 'pending') {
            if (!isComplete) {
                setIsComplete(true);
                setGlobalProgress(100);
                
                if (currentRun.status === 'failed' || (currentRun.return_code !== undefined && currentRun.return_code !== 0)) {
                    setHasErrors(true);
                    setCurrentPhase('Completato con errori');
                } else {
                    setHasErrors(false);
                    setCurrentPhase('Completato con successo');
                    setCompletedHosts(targets.length);
                }
                
                // Add completion events
                const completeEvents: SummaryEvent[] = [
                    {
                        id: `complete-stats-${Date.now()}`,
                        type: 'info',
                        message: `📊 Riepilogo: ${targets.length - failedHosts} successi, ${failedHosts} fallimenti`,
                        timestamp: new Date()
                    },
                    {
                        id: `complete-${Date.now()}`,
                        type: 'complete',
                        message: hasErrors ? '⚠️ Operazione completata con errori' : '🎉 Operazione completata con successo',
                        timestamp: new Date()
                    }
                ];
                setSummaryEvents(prev => [...prev, ...completeEvents]);
            }
        }
    }, [runs, runId, isComplete, targets.length, hasErrors, failedHosts]);

    // Update global progress
    useEffect(() => {
        if (!isComplete && targets.length > 0) {
            const progress = Math.round(((completedHosts + failedHosts) / targets.length) * 100);
            setGlobalProgress(Math.min(99, progress)); // Keep at 99 until complete
        }
    }, [completedHosts, failedHosts, targets.length, isComplete]);

    // Auto-scroll events
    useEffect(() => {
        if (eventsContainerRef.current) {
            eventsContainerRef.current.scrollTop = eventsContainerRef.current.scrollHeight;
        }
    }, [summaryEvents]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
            <div className="w-full max-w-xl bg-slate-900/95 rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl ${config.bgColor} border ${config.borderColor}`}>
                                <span className={`material-symbols-rounded text-2xl ${config.color} ${
                                    isComplete ? (hasErrors ? '' : 'animate-bounce') : 'animate-pulse'
                                }`}>
                                    {isComplete ? (hasErrors ? 'error' : 'check_circle') : config.icon}
                                </span>
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">{config.title}</h2>
                                <p className="text-sm text-slate-400">
                                    {targets.length} target • {formatDuration(elapsedSeconds)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                            <span className="material-symbols-rounded text-slate-400">close</span>
                        </button>
                    </div>
                </div>

                {/* Progress Section */}
                <div className="px-6 py-5">
                    {/* Status Text */}
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-base text-slate-300 flex items-center">
                            {currentPhase}
                            {!isComplete && <AnimatedDots />}
                        </span>
                        <span className="text-lg font-mono text-white font-bold">{globalProgress}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-500 ease-out ${
                                isComplete
                                    ? (hasErrors 
                                        ? 'bg-gradient-to-r from-red-500 to-orange-500' 
                                        : 'bg-gradient-to-r from-emerald-400 to-green-400 animate-pulse')
                                    : 'bg-gradient-to-r from-violet-500 to-pink-500'
                            }`}
                            style={{ width: `${globalProgress}%` }}
                        />
                    </div>

                    {/* Mini Stats */}
                    <div className="flex items-center justify-center gap-8 mt-4 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full bg-emerald-500" />
                            <span className="text-slate-400">{completedHosts} completati</span>
                        </div>
                        {failedHosts > 0 && (
                            <div className="flex items-center gap-2">
                                <span className="size-2.5 rounded-full bg-red-500" />
                                <span className="text-red-400">{failedHosts} falliti</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <span className="size-2.5 rounded-full bg-amber-500 animate-pulse" />
                            <span className="text-slate-400">{targets.length - completedHosts - failedHosts} in corso</span>
                        </div>
                    </div>
                </div>

                {/* Summary Events */}
                <div 
                    ref={eventsContainerRef}
                    className="px-4 py-3 max-h-64 overflow-y-auto border-t border-white/5 bg-black/20"
                >
                    <div className="space-y-1">
                        {summaryEvents.map((event, index) => (
                            <SummaryEventLine 
                                key={event.id} 
                                event={event} 
                                isNew={index === summaryEvents.length - 1 && !isComplete}
                            />
                        ))}
                    </div>
                </div>

                {/* Footer */}
                {isComplete && (
                    <div className="px-6 py-4 border-t border-white/5 bg-black/10">
                        <button
                            onClick={onClose}
                            className={`w-full py-3 rounded-xl font-medium text-sm transition-all ${
                                hasErrors
                                    ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                                    : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                            }`}
                        >
                            {hasErrors ? 'Chiudi (con errori)' : 'Chiudi'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnsibleOperationProgress;