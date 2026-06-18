import React from 'react';
import { useDriveLinks } from './hooks/useDriveLinks';
import { DriveLinkList } from './components/DriveLinkList';
import { DriveLinkFormDialog } from './components/DriveLinkFormDialog';

export const DriveLinksTabApp: React.FC = () => {
    const {
        links,
        isLoading,
        selectedLink,
        expandedFolders,
        showAddForm,
        isAdding,
        isMasterMode,
        newLink,
        editingLink,
        isUpdating,
        setSelectedLink,
        setShowAddForm,
        setIsMasterMode,
        setNewLink,
        setEditingLink,
        handleAddLink,
        handleUpdateLink,
        handleDeleteLink,
        toggleFolder,
        getChildren,
        getRootLinks,
    } = useDriveLinks();

    const handleNewLinkChange = (field: string, value: string) => {
        setNewLink(prev => ({ ...prev, [field]: value }));
    };

    const handleEditingLinkChange = (field: string, value: string) => {
        setEditingLink(prev => prev ? { ...prev, [field]: value } : null);
    };

    const handleAddSubfolder = (parentId: string) => {
        setNewLink(prev => ({ ...prev, parentId }));
        setIsMasterMode(false);
        setShowAddForm(true);
    };

    const rootLinks = getRootLinks();

    return (
        <div className="relative w-full max-w-7xl mx-auto animate-fadeIn px-4 py-6">
            <div className="flex flex-col gap-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
                            <span className="material-symbols-outlined text-sky-400 text-xl">link</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white uppercase tracking-wide">Drive Links</h2>
                            <p className="text-xs text-slate-500">Gestisci i link e le cartelle Google Drive</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => {
                                setNewLink({ name: '', link: '', parentId: '', language: '' });
                                setIsMasterMode(true);
                                setShowAddForm(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 transition-all text-sm font-semibold"
                        >
                            <span className="material-symbols-outlined text-lg">folder_special</span>
                            Nuovo Master
                        </button>
                        <button
                            onClick={() => {
                                setNewLink({ name: '', link: '', parentId: '', language: '' });
                                setIsMasterMode(false);
                                setShowAddForm(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 hover:bg-sky-500/30 transition-all text-sm font-semibold"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Aggiungi Link
                        </button>
                    </div>
                </div>

                {/* Master Folders Overview */}
                {rootLinks.length > 0 && (
                    <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 p-6 shadow-xl shadow-black/20 backdrop-blur">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                <span className="material-symbols-outlined text-emerald-400 text-xl">cloud</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-wide">Master Folders</h3>
                                <p className="text-xs text-slate-500">Cartelle principali del sistema ({rootLinks.length} totali)</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {rootLinks.map((link) => {
                                const childCount = getChildren(link.id).length;
                                return (
                                    <div
                                        key={link.id}
                                        className={`p-4 bg-slate-950/50 rounded-xl border transition-all cursor-pointer ${
                                            selectedLink?.id === link.id
                                                ? 'border-emerald-500/50 bg-emerald-500/10'
                                                : 'border-white/5 hover:border-emerald-500/30'
                                        }`}
                                        onClick={() => {
                                            setSelectedLink(link);
                                            if (childCount > 0) {
                                                toggleFolder(link.id);
                                            }
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-emerald-400">folder_special</span>
                                            <span className="text-sm font-semibold text-white truncate">{link.name}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 truncate font-mono">{link.id.slice(0, 20)}...</p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {childCount} sottocartelle
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Links Tree */}
                    <div className="lg:col-span-2">
                        <DriveLinkList
                            links={links}
                            isLoading={isLoading}
                            selectedLink={selectedLink}
                            expandedFolders={expandedFolders}
                            onSelectLink={setSelectedLink}
                            onToggleFolder={toggleFolder}
                            onEditLink={setEditingLink}
                            onDeleteLink={handleDeleteLink}
                            getChildren={getChildren}
                        />
                    </div>

                    {/* Right Panel: Form / Details / Empty */}
                    <div className="rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900/70 shadow-xl shadow-black/20 backdrop-blur">
                        <DriveLinkFormDialog
                            showAddForm={showAddForm}
                            isMasterMode={isMasterMode}
                            newLink={newLink}
                            isAdding={isAdding}
                            editingLink={editingLink}
                            isUpdating={isUpdating}
                            selectedLink={selectedLink}
                            links={links}
                            onNewLinkChange={handleNewLinkChange}
                            onAddLink={handleAddLink}
                            onCancelAdd={() => setShowAddForm(false)}
                            onEditingLinkChange={handleEditingLinkChange}
                            onUpdateLink={handleUpdateLink}
                            onCancelEdit={() => setEditingLink(null)}
                            onCloseDetails={() => setSelectedLink(null)}
                            onEditLink={setEditingLink}
                            onAddSubfolder={handleAddSubfolder}
                            getChildren={getChildren}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};