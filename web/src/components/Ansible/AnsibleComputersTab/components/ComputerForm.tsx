import React, { useState } from 'react';
import { AnsibleComputer } from '../../types';
import { saveAnsibleComputer } from '../hooks/useAnsibleComputers';

interface ComputerFormProps {
    editing?: AnsibleComputer | null;
    onSaved: (computer: AnsibleComputer) => void;
    onCancel: () => void;
}

export function ComputerForm({ editing, onSaved, onCancel }: ComputerFormProps) {
    const [host, setHost] = useState(editing?.host ?? '');
    const [ansibleUser, setAnsibleUser] = useState(editing?.ansible_user ?? 'pierone');
    const [group, setGroup] = useState(editing?.group ?? '');
    const [tags, setTags] = useState(editing?.tags?.join(', ') ?? '');
    const [notes, setNotes] = useState(editing?.notes ?? '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!host.trim()) return;
        setSaving(true);
        setError(null);
        try {
            const payload: Partial<AnsibleComputer> = {
                host: host.trim(),
                ansible_user: ansibleUser.trim() || 'pierone',
                group: group.trim(),
                tags: tags.split(',').map(t => t.trim()).filter(Boolean),
                notes: notes.trim(),
            };
            if (editing?.id) {
                payload.id = editing.id;
            }
            const saved = await saveAnsibleComputer(payload);
            onSaved(saved);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Errore durante il salvataggio');
        } finally {
            setSaving(false);
        }
    };

    const formStyle: React.CSSProperties = {
        background: 'rgba(15, 15, 20, 0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 14,
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
    };

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '10px 14px',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10,
        color: '#f8fafc',
        fontSize: 13,
        outline: 'none',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: 11,
        fontWeight: 600,
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: 4,
    };

    return (
        <form onSubmit={handleSubmit} style={formStyle}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f8fafc' }}>
                {editing ? `Modifica ${editing.id}` : 'Aggiungi Computer'}
            </div>

            {error && (
                <div style={{ fontSize: 12, color: '#ef4444', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                    {error}
                </div>
            )}

            <div>
                <div style={labelStyle}>Host *</div>
                <input
                    type="text"
                    value={host}
                    onChange={e => setHost(e.target.value)}
                    placeholder="es. 192.168.1.100 o nome-host"
                    style={inputStyle}
                    required
                />
            </div>

            <div>
                <div style={labelStyle}>Utente SSH</div>
                <input
                    type="text"
                    value={ansibleUser}
                    onChange={e => setAnsibleUser(e.target.value)}
                    placeholder="pierone"
                    style={inputStyle}
                />
            </div>

            <div>
                <div style={labelStyle}>Gruppo</div>
                <input
                    type="text"
                    value={group}
                    onChange={e => setGroup(e.target.value)}
                    placeholder="es. workers"
                    style={inputStyle}
                />
            </div>

            <div>
                <div style={labelStyle}>Tag (separati da virgola)</div>
                <input
                    type="text"
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="es. gpu, high-memory"
                    style={inputStyle}
                />
            </div>

            <div>
                <div style={labelStyle}>Note</div>
                <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Note opzionali..."
                    style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }}
                />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{
                        padding: '8px 18px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                        color: '#94a3b8',
                        cursor: 'pointer',
                        fontSize: 13,
                    }}
                >
                    Annulla
                </button>
                <button
                    type="submit"
                    disabled={saving || !host.trim()}
                    style={{
                        padding: '8px 18px',
                        background: saving ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.6)',
                        border: '1px solid rgba(139,92,246,0.4)',
                        borderRadius: 10,
                        color: '#f8fafc',
                        cursor: saving || !host.trim() ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                        fontWeight: 600,
                        opacity: saving || !host.trim() ? 0.6 : 1,
                    }}
                >
                    {saving ? 'Salvataggio...' : (editing ? 'Salva' : 'Aggiungi')}
                </button>
            </div>
        </form>
    );
}