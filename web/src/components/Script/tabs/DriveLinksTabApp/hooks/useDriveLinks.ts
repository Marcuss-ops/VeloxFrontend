import { useState, useEffect, useCallback } from 'react';
import { DriveLink } from '../../../utils/driveLinks';

export const useDriveLinks = () => {
    const [links, setLinks] = useState<DriveLink[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedLink, setSelectedLink] = useState<DriveLink | null>(null);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    // Form states
    const [showAddForm, setShowAddForm] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [isMasterMode, setIsMasterMode] = useState(false);
    const [newLink, setNewLink] = useState({
        name: '',
        link: '',
        parentId: '',
        language: ''
    });

    // Edit states
    const [editingLink, setEditingLink] = useState<DriveLink | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const linksRes = await fetch('/api/v1/drive-links');
            if (linksRes.ok) {
                const linksData = await linksRes.json();
                setLinks(linksData.folders || linksData.links || []);
            }
        } catch (e) {
            console.error('Failed to load drive data:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleAddLink = useCallback(async () => {
        if (!newLink.name.trim() || !newLink.link.trim()) return;

        setIsAdding(true);
        try {
            const res = await fetch('/api/v1/drive-links/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newLink.name,
                    link: newLink.link,
                    parentId: newLink.parentId || undefined,
                    language: newLink.language || undefined
                }),
            });

            if (res.ok) {
                await res.json();
                await loadData();
                setNewLink({ name: '', link: '', parentId: '', language: '' });
                setShowAddForm(false);
            }
        } catch (e) {
            console.error('Failed to add link:', e);
        } finally {
            setIsAdding(false);
        }
    }, [newLink, loadData]);

    const handleUpdateLink = useCallback(async () => {
        if (!editingLink) return;

        setIsUpdating(true);
        try {
            const res = await fetch(`/api/v1/drive-links/${editingLink.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editingLink.name,
                    link: editingLink.link,
                    parentId: editingLink.parentId,
                    language: editingLink.language
                }),
            });

            if (res.ok) {
                const data = await res.json();
                setLinks(prev => prev.map(l => l.id === editingLink.id ? data.link : l));
                setEditingLink(null);
            }
        } catch (e) {
            console.error('Failed to update link:', e);
        } finally {
            setIsUpdating(false);
        }
    }, [editingLink]);

    const handleDeleteLink = useCallback(async (linkId: string) => {
        if (!confirm('Sei sicuro di voler eliminare questo link?')) return;

        try {
            const res = await fetch(`/api/v1/drive-links/${linkId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setLinks(prev => prev.filter(l => l.id !== linkId));
                if (selectedLink?.id === linkId) {
                    setSelectedLink(null);
                }
            }
        } catch (e) {
            console.error('Failed to delete link:', e);
        }
    }, [selectedLink]);

    const toggleFolder = useCallback((folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    }, []);

    const getChildren = useCallback((parentId: string) => {
        return links.filter(l => l.parentId === parentId);
    }, [links]);

    const getRootLinks = useCallback(() => {
        return links.filter(l => !l.parentId);
    }, [links]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return {
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
    };
};