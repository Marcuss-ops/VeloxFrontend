import React, { useState, useEffect, useCallback } from 'react';
import { bundleApi, ApiError } from '../../lib/api';
import { BundleFileTree } from './BundleFileTree';
import { BundleInfoPanel } from './BundleInfoPanel';

// Types
interface BundleFile {
    name: string;
    size: number;
    size_formatted: string;
    compressed: number;
}

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

export const BundleExplorer: React.FC = () => {
    const [bundleInfo, setBundleInfo] = useState<BundleInfo | null>(null);
    const [currentPath, setCurrentPath] = useState<string>('');
    const [currentFiles, setCurrentFiles] = useState<BundleFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filesLoading, setFilesLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [regenerating, setRegenerating] = useState(false);
    const [regenerateResult, setRegenerateResult] = useState<{ ok: boolean; message: string } | null>(null);

    // Collapsed sections state
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        structure: false,
        dependencies: false,
        venv: true,
        tests: true,
        health: false,
        healthBundle: true,
        deployChecklist: false,
        changelog: true,
    });

    const toggleSection = (section: string) => {
        setCollapsedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const fetchBundleInfo = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await bundleApi.info();
            setBundleInfo(data);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Errore caricamento bundle';
            const is404 = err instanceof ApiError && err.status === 404;
            setError(is404 || msg.includes('404')
                ? 'Bundle non trovato. Genera il bundle con il pulsante sopra o verifica che worker_code.zip sia presente sul server.'
                : msg);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchFiles = useCallback(async (path: string) => {
        try {
            setFilesLoading(true);
            const data = await bundleApi.files(path, 100);
            setCurrentFiles(data.files || []);
        } catch (err) {
            console.error('[BundleExplorer] Error fetching files:', err);
        } finally {
            setFilesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBundleInfo();
    }, [fetchBundleInfo]);

    useEffect(() => {
        if (currentPath !== undefined) {
            fetchFiles(currentPath);
        }
    }, [currentPath, fetchFiles]);

    const handleNavigate = (path: string) => {
        setCurrentPath(path);
    };

    // Regenerate bundle
    const handleRegenerate = async () => {
        try {
            setRegenerating(true);
            setRegenerateResult(null);
            const result = await bundleApi.regenerate();
            setRegenerateResult({ ok: result.ok, message: result.message });
            if (result.ok) {
                // Refresh bundle info after regeneration
                await fetchBundleInfo();
            }
        } catch (err) {
            setRegenerateResult({
                ok: false,
                message: err instanceof Error ? err.message : 'Errore rigenerazione bundle'
            });
        } finally {
            setRegenerating(false);
        }
    };

    // Analyze bundle structure
    const analyzeBundle = () => {
        if (!bundleInfo?.top_dirs) return {};

        const dirs = bundleInfo.top_dirs;
        const analysis: Record<string, { exists: boolean; size?: string; count?: number; status: 'ok' | 'warning' | 'error' | 'unknown' }> = {};

        // Check for key directories
        const venvDir = dirs.find(d => d.name === 'venv' || d.name === '.venv');
        analysis.venv = {
            exists: !!venvDir,
            size: venvDir?.size_formatted,
            count: venvDir?.file_count,
            status: venvDir ? 'ok' : 'warning'
        };

        const srcDir = dirs.find(d => d.name === 'src' || d.name === 'refactored' || d.name === 'code');
        analysis.source = {
            exists: !!srcDir,
            size: srcDir?.size_formatted,
            count: srcDir?.file_count,
            status: srcDir ? 'ok' : 'error'
        };

        const configDir = dirs.find(d => d.name === 'config' || d.name === 'conf');
        analysis.config = {
            exists: !!configDir,
            size: configDir?.size_formatted,
            count: configDir?.file_count,
            status: configDir ? 'ok' : 'unknown'
        };

        const testsDir = dirs.find(d => d.name === 'tests' || d.name === 'test');
        analysis.tests = {
            exists: !!testsDir,
            size: testsDir?.size_formatted,
            count: testsDir?.file_count,
            status: testsDir ? 'ok' : 'warning'
        };

        const scriptsDir = dirs.find(d => d.name === 'scripts' || d.name === 'script');
        analysis.scripts = {
            exists: !!scriptsDir,
            size: scriptsDir?.size_formatted,
            count: scriptsDir?.file_count,
            status: scriptsDir ? 'ok' : 'unknown'
        };

        const remotionDir = dirs.find(d => d.name === 'Remotion' || d.name === 'remotion');
        analysis.remotion = {
            exists: !!remotionDir,
            size: remotionDir?.size_formatted,
            count: remotionDir?.file_count,
            status: remotionDir ? 'ok' : 'unknown'
        };

        const assetsDir = dirs.find(d => d.name === 'assets' || d.name === 'media_assets');
        analysis.assets = {
            exists: !!assetsDir,
            size: assetsDir?.size_formatted,
            count: assetsDir?.file_count,
            status: assetsDir ? 'ok' : 'unknown'
        };

        return analysis;
    };

    const analysis = analyzeBundle();
    const runtime = bundleInfo?.runtime || {};

    return (
        <div className="space-y-6">
            <BundleInfoPanel
                bundleInfo={bundleInfo}
                loading={loading}
                error={error}
                analysis={analysis}
                runtime={runtime}
                collapsedSections={collapsedSections}
                toggleSection={toggleSection}
                regenerateResult={regenerateResult}
                handleRegenerate={handleRegenerate}
                fetchBundleInfo={fetchBundleInfo}
                regenerating={regenerating}
                setCurrentPath={setCurrentPath}
                setRegenerateResult={setRegenerateResult}
            />
            <BundleFileTree
                currentPath={currentPath}
                currentFiles={currentFiles}
                filesLoading={filesLoading}
                onNavigate={handleNavigate}
                setCurrentPath={setCurrentPath}
            />
        </div>
    );
};

export default BundleExplorer;