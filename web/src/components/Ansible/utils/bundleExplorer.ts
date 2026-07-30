export const formatDateTime = (iso?: string): string => {
    if (!iso) return '—';
    try {
        return new Date(iso).toLocaleString('it-IT', {
            dateStyle: 'medium',
            timeStyle: 'short',
        });
    } catch {
        return '—';
    }
};

export interface BundleDir {
    name: string;
    type: 'folder' | 'root_files';
    size: number;
    size_formatted: string;
    file_count: number;
}

export interface BundleInfo {
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

export interface BundleAnalysis {
    [key: string]: {
        exists: boolean;
        size?: string;
        count?: number;
        status: 'ok' | 'warning' | 'error' | 'unknown';
    };
}

export const analyzeBundle = (topDirs: BundleDir[]): BundleAnalysis => {
    const dirs = topDirs;
    const analysis: BundleAnalysis = {};

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
