import React, { useState, useRef, useEffect } from 'react';
import { AnsibleComputer, AnsibleRun } from './types';
import { runAnsibleShell } from './AnsibleComputersTab/hooks/useAnsibleComputers';

interface AnsibleShellTabProps {
    computers: AnsibleComputer[];
    selectedIds: Set<string>;
    runs: AnsibleRun[];
    onRefresh: () => void;
    externalRun?: { runId: string; action: string; targets: string[] } | null;
    onExternalRunConsumed?: () => void;
}

interface ShellLine {
    id: string;
    type: 'input' | 'output' | 'error' | 'system';
    text: string;
    timestamp: Date;
}

function stripAnsi(text: string): string {
    // eslint-disable-next-line no-control-regex
    return text.replace(/\x1b\[[0-9;]*m/g, '');
}

export const AnsibleShellTab: React.FC<AnsibleShellTabProps> = ({ computers: _computers, selectedIds, runs, onRefresh, externalRun, onExternalRunConsumed: _onExternalRunConsumed }) => {
    const [command, setCommand] = useState('');
    const [lines, setLines] = useState<ShellLine[]>([]);
    const [executing, setExecuting] = useState(false);
    const [lastRunId, setLastRunId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [lastOutputLength, setLastOutputLength] = useState(0); // Track how much output we've already shown
    const scrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (externalRun && externalRun.runId && externalRun.runId !== lastRunId) {
            setLines([]);
            const actionLabels: Record<string, string> = {
                'update_workers': 'Update Workers',
                'install_workers': 'Install Workers',
                'restart_computer': 'Reboot',
                'test_ssh': 'Test SSH',
            };
            const actionLabel = actionLabels[externalRun.action] || externalRun.action;
            addLine('input', `$ [Azione: ${actionLabel}]`);
            addLine('system', `Esecuzione su ${externalRun.targets.length} computer: ${externalRun.targets.join(', ')}...`);
            addLine('system', `Comando inviato correttamente (Run ID: ${externalRun.runId}). Attendi i log di esecuzione...`);
            setLastRunId(externalRun.runId);
            setExecuting(true);
        }
    }, [externalRun, lastRunId]);

    // Watch for run updates - shows incremental output during execution
    useEffect(() => {
        if (!lastRunId) return;
        const currentRun = runs.find(r => r.run_id === lastRunId || (r as any).id === lastRunId);
        
        if (currentRun) {
            // Show incremental output (preamble + run output; backend may embed preamble in output when completed)
            const rawOutput = (currentRun.preamble || '') + (currentRun.output || '');
            if (rawOutput) {
                const fullOutput = stripAnsi(rawOutput);
                // Only add new lines that we haven't shown yet
                if (fullOutput.length > lastOutputLength) {
                    const newOutput = fullOutput.substring(lastOutputLength);
                    if (newOutput.trim()) {
                        // Split into lines and add each one
                        const newLines = newOutput.split('\n').filter(line => line.trim());
                        newLines.forEach(line => {
                            addLine('output', line);
                        });
                    }
                    setLastOutputLength(fullOutput.length);
                }
            }
            
            // Check if run is complete
            if (currentRun.status !== 'running' && currentRun.status !== 'pending') {
                if (currentRun.status === 'failed' || (currentRun.return_code !== undefined && currentRun.return_code !== 0)) {
                    addLine('error', `Comando terminato con errore (RC: ${currentRun.return_code ?? '?'})`);
                } else {
                    addLine('system', 'Comando completato con successo.');
                }
                setLastRunId(null);
                setExecuting(false);
                setLastOutputLength(0); // Reset for next run
            }
        }
    }, [runs, lastRunId, lastOutputLength]);

    // Fast polling when executing
    useEffect(() => {
        if (!executing || !lastRunId) return;
        const pollInterval = setInterval(() => {
            onRefresh();
        }, 2000);
        return () => clearInterval(pollInterval);
    }, [executing, lastRunId, onRefresh]);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [lines]);

    const addLine = (type: ShellLine['type'], text: string) => {
        setLines((prev: ShellLine[]) => [...prev, {
            id: Math.random().toString(36).substring(7),
            type,
            text,
            timestamp: new Date()
        }]);
    };

    const handleCopy = async () => {
        if (lines.length === 0) {
            return;
        }
        const text = lines.map(l => `[${l.timestamp.toLocaleTimeString([], { hour12: false })}] ${l.text}`).join('\n');
        try {
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
            // Try fallback method
            try {
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.left = '-999999px';
                textArea.style.top = '-999999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);
                if (successful) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                }
            } catch (fallbackErr) {
                console.error('Fallback copy also failed:', fallbackErr);
            }
        }
    };

    const handleRun = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!command.trim() || executing) return;

        const targets = Array.from(selectedIds);
        if (targets.length === 0) {
            addLine('error', 'Errore: Nessun computer selezionato. Torna alla scheda "Computer" per selezionarne almeno uno.');
            return;
        }

        const cmd = command.trim();
        setCommand('');
        setExecuting(true);
        setLines([]);
        addLine('input', `$ ${cmd}`);
        addLine('system', `Esecuzione su ${targets.length} computer: ${targets.join(', ')}...`);

        try {
            const { run_id } = await runAnsibleShell(cmd, targets);
            addLine('system', `Comando inviato correttamente (Run ID: ${run_id}). Attendi i log di esecuzione...`);
            setLastRunId(run_id);
            onRefresh();
        } catch (err) {
            addLine('error', `Errore nell'invio del comando: ${err instanceof Error ? err.message : 'Errore sconosciuto'}`);
            setExecuting(false);
        }
    };

    const clearTerminal = () => setLines([]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseLeave = () => setMousePos(null);

    const glowStyle = mousePos ? {
        background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(139, 92, 246, 0.06), transparent 40%)`,
    } : {};

    return (
        <div 
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group relative flex flex-col h-[600px] bg-slate-950 rounded-2xl border border-white/5 overflow-hidden shadow-2xl"
            style={glowStyle}
        >
            {/* Cursor-following edge glow */}
            <div 
                className="absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-300"
                style={mousePos ? {
                    background: `radial-gradient(100px 100px at ${mousePos.x}px ${mousePos.y}px, rgba(139, 92, 246, 0.15), transparent 70%)`,
                    maskImage: 'linear-gradient(to right, black 0%, transparent 3%, transparent 97%, black 100%)',
                    WebkitMaskImage: 'linear-gradient(to right, black 0%, transparent 3%, transparent 97%, black 100%)',
                } : {}}
            />
            <div className="relative flex flex-col h-full">
                {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                        <div className="size-3 rounded-full bg-red-500/80" />
                        <div className="size-3 rounded-full bg-amber-500/80" />
                        <div className="size-3 rounded-full bg-emerald-500/80" />
                    </div>
                    <span className="text-xs font-mono text-slate-400 ml-2">ssh-terminal — {selectedIds.size} target</span>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleCopy}
                        className="text-[10px] uppercase tracking-wider font-bold text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
                        title="Copia log output"
                    >
                        <span className="material-symbols-rounded text-[14px]">{copied ? 'done' : 'content_copy'}</span>
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                        onClick={clearTerminal}
                        className="text-[10px] uppercase tracking-wider font-bold text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>

            {/* Terminal Output */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-auto p-4 font-mono text-sm bg-black/20 scrollbar-hide"
            >
                {lines.length === 0 ? (
                    <div className="text-slate-600 italic">
                        Terminal pronto. Seleziona i computer nella scheda precedente e digita un comando sotto.
                    </div>
                ) : (
                    <div className="space-y-1">
                        {lines.map((line: ShellLine) => (
                            <div key={line.id} className="flex gap-2">
                                <span className="text-slate-600 shrink-0 select-none">
                                    [{line.timestamp.toLocaleTimeString([], { hour12: false })}]
                                </span>
                                <span className={`break-all ${line.type === 'input' ? 'text-emerald-400 font-bold' :
                                    line.type === 'error' ? 'text-red-400' :
                                        line.type === 'system' ? 'text-primary/80 italic' :
                                            'text-slate-300'
                                    }`}>
                                    {line.text}
                                </span>
                            </div>
                        ))}
                        {executing && (
                            <div className="flex gap-2 animate-pulse">
                                <span className="text-slate-600 select-none">
                                    [{new Date().toLocaleTimeString([], { hour12: false })}]
                                </span>
                                <span className="text-primary italic">Esecuzione in corso...</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Terminal Input */}
            <form
                onSubmit={handleRun}
                className="p-3 bg-slate-900/80 border-t border-white/5 flex gap-3"
            >
                <div className="flex-1 relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold select-none">$</span>
                    <input
                        type="text"
                        value={command}
                        onChange={e => setCommand(e.target.value)}
                        disabled={executing}
                        placeholder="Digita un comando SSH (es: uptime, df -h, ls /tmp)..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg py-2 pl-8 pr-4 text-emerald-400 font-mono text-sm focus:border-primary/50 outline-none transition-all disabled:opacity-50"
                        autoFocus
                    />
                </div>
                <button
                    type="submit"
                    disabled={executing || !command.trim()}
                    className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-slate-800 text-white rounded-lg font-bold text-sm transition-all flex items-center gap-2"
                >
                    <span className="material-symbols-rounded text-[18px]">terminal</span>
                    Esegui
                </button>
            </form>
            </div>
        </div>
    );
};
