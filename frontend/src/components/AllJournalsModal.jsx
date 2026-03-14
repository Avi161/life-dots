import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Plus, Calendar } from 'lucide-react';
import { fetchAllJournals, isAuthenticated } from '../utils/api';
import { parseContextKeyToDate, formatContextKey, getBirthDate } from '../utils/dateEngine';
import { highlightText, matchesSearch } from '../utils/searchUtils';
import SearchBar from './SearchBar';

export default function AllJournalsModal({ isOpen, onClose, onJump, onOpenJournal }) {
    const [journals, setJournals] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // New states
    const [filterText, setFilterText] = useState('');
    const [sortBy, setSortBy] = useState('date_desc'); // 'date_desc', 'date_asc', 'edited_desc'
    const [groupMode, setGroupMode] = useState('flat'); // 'flat', 'grouped'
    
    const [showCreate, setShowCreate] = useState(false);
    const [createScope, setCreateScope] = useState('today'); // 'today', 'year', 'month', 'date', 'life'
    const [createDate, setCreateDate] = useState('');

    useEffect(() => {
        if (isOpen && isAuthenticated()) {
            setLoading(true);
            fetchAllJournals()
                .then(data => setJournals(data || []))
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
        if (!isOpen) { // Reset state on close
            setFilterText('');
            setShowCreate(false);
            setCreateScope('today');
        }
    }, [isOpen]);

    const handleCreate = () => {
        let key = 'life';
        const now = new Date();
        const birth = getBirthDate();
        const currentYearIdx = now.getFullYear() - birth.getFullYear();

        if (createScope === 'life') {
            key = 'life';
        } else if (createScope === 'year') {
            key = `year-${currentYearIdx}`;
        } else if (createScope === 'month') {
            key = `year-${currentYearIdx}-month-${now.getMonth()}`;
        } else if (createScope === 'today') {
            key = `year-${currentYearIdx}-month-${now.getMonth()}-day-${now.getDate()}`;
        } else if (createScope === 'date' && createDate) {
            const d = new Date(createDate + 'T12:00:00'); // midday to avoid timezone shifts
            const yIdx = d.getFullYear() - birth.getFullYear();
            key = `year-${yIdx}-month-${d.getMonth()}-day-${d.getDate()}`;
        }

        if (onOpenJournal) {
            onOpenJournal(key);
        }
    };

    const stripHtml = (html) => {
        let doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const strippedCache = useMemo(
        () => journals.map(j => ({ ...j, _stripped: stripHtml(j.content) })),
        [journals]
    );

    const filteredJournals = useMemo(() => {
        let result = strippedCache;
        if (filterText.trim()) {
            result = result.filter(j => {
                const textMatch = matchesSearch(j._stripped, filterText);
                const dateMatch = matchesSearch(formatContextKey(j.context_key), filterText);
                return textMatch || dateMatch;
            });
        }

        // Sort
        result.sort((a, b) => {
            let valA, valB;
            if (sortBy.startsWith('date')) {
                // Pin 'life' to the top for chronological date sorting
                if (a.context_key === 'life' && b.context_key !== 'life') return -1;
                if (b.context_key === 'life' && a.context_key !== 'life') return 1;
                if (a.context_key === 'life' && b.context_key === 'life') return 0;
            
                valA = parseContextKeyToDate(a.context_key).getTime();
                valB = parseContextKeyToDate(b.context_key).getTime();
                
                if (valA === valB) {
                    valA = new Date(a.updated_at).getTime();
                    valB = new Date(b.updated_at).getTime();
                    return sortBy === 'date_desc' ? valB - valA : valA - valB;
                }
                
                // User logic: "Newest" = youngest age (e.g. 2005), "Oldest" = oldest age (future)
                // So Newest First ('date_desc') should put smaller dates first.
                return sortBy === 'date_desc' ? valA - valB : valB - valA;

            } else if (sortBy === 'edited_desc') {
                valA = new Date(a.updated_at).getTime();
                valB = new Date(b.updated_at).getTime();

                if (valA === valB) {
                    valA = parseContextKeyToDate(a.context_key).getTime();
                    valB = parseContextKeyToDate(b.context_key).getTime();
                }
                
                // Standard chronological semantics for 'Last edited'
                return valB - valA;
            }
            return 0;
        });

        return result;
    }, [strippedCache, filterText, sortBy]);

    const getGroupForEntry = (contextKey) => {
        if (contextKey === 'life') return 'Life';
        const parts = contextKey.split('-');
        const yearIndex = parts.indexOf('year') !== -1 ? parts[parts.indexOf('year') + 1] : null;
        if (yearIndex === null) return 'Other';
        const calYear = getBirthDate().getFullYear() + parseInt(yearIndex, 10);
        return `Year ${calYear}`;
    };

    const getGranularity = (contextKey) => {
        if (contextKey === 'life') return 'life';
        const parts = contextKey.split('-');
        if (parts.length === 2) return 'year'; 
        if (parts.length === 4) return 'month'; 
        if (parts.length === 6) return 'day'; 
        return 'other';
    };

    const groupedJournals = useMemo(() => {
        if (groupMode === 'flat') return null;
        const groups = { 'Life': { life: [], year: [], month: [], day: [], other: [] } };
        filteredJournals.forEach(j => {
            const groupLabel = getGroupForEntry(j.context_key);
            if (!groups[groupLabel]) groups[groupLabel] = { life: [], year: [], month: [], day: [], other: [] };
            
            const gran = getGranularity(j.context_key);
            groups[groupLabel][gran].push(j);
        });
        
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (sortBy === 'edited_desc') {
                // If sorting by newest edit, we should find the most recently edited item in group A vs group B
                // and sort the groups based on that max metric. (Do not arbitrarily pin Life to the top)
                const getMaxEditedTime = (entriesObj) => {
                    const allEntries = [
                        ...entriesObj.life, 
                        ...entriesObj.year, 
                        ...entriesObj.month, 
                        ...entriesObj.day, 
                        ...entriesObj.other
                    ];
                    if (allEntries.length === 0) return 0;
                    return Math.max(...allEntries.map(e => new Date(e.updated_at).getTime()));
                };
                
                const timeA = getMaxEditedTime(groups[a]);
                const timeB = getMaxEditedTime(groups[b]);
                
                // Newer edits (higher timestamp) should be at top
                return timeB - timeA;
            } else {
                // Default date sorting: pull year digit from label (force Life to top in chronological view)
                if (a === 'Life') return -1;
                if (b === 'Life') return 1;
                if (a === 'Other') return 1;
                if (b === 'Other') return -1;
                
                const yearA = parseInt(a.replace('Year ', ''));
                const yearB = parseInt(b.replace('Year ', ''));
                return sortBy === 'date_desc' ? yearA - yearB : yearB - yearA;
            }
        });
        
        return sortedKeys
            .map(k => ({ label: k, content: groups[k] }))
            .filter(g => {
                const c = g.content;
                return c.life.length > 0 || c.year.length > 0 || c.month.length > 0 || c.day.length > 0 || c.other.length > 0;
            });
    }, [filteredJournals, groupMode, sortBy]);

    const handleJump = (contextKey) => {
        onJump(contextKey);
        onClose();
    };

    // Shared Entry Card Render
    const renderEntryCard = (j) => (
        <div key={j.id} className="p-4 rounded-xl border flex flex-col gap-2 transition-all hover:shadow-sm" style={{ borderColor: 'var(--control-border)', backgroundColor: 'var(--control-bg)' }}>
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="text-sm font-semibold tracking-wider" style={{ color: 'var(--fg)' }}>
                            {formatContextKey(j.context_key)}
                        </p>
                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>• edited {formatDate(j.updated_at)}</span>
                    </div>

                    <div className="mt-1">
                        {filterText.trim() ? (
                            <p
                                className="text-sm line-clamp-2 md:line-clamp-3 leading-relaxed journal-search-result"
                                style={{ color: 'var(--fg-muted)' }}
                                dangerouslySetInnerHTML={{ __html: highlightText(j._stripped.substring(0, 150) + (j._stripped.length > 150 ? '...' : ''), filterText) }}
                            />
                        ) : (
                            <p className="text-sm line-clamp-2 md:line-clamp-3 leading-relaxed" style={{ color: 'var(--fg-muted)' }}>
                                {j._stripped.substring(0, 150)}{j._stripped.length > 150 && '...'}
                            </p>
                        )}
                    </div>
                </div>
                <button
                    onClick={() => handleJump(j.context_key)}
                    className="p-2 rounded shrink-0 transition-colors hover:scale-110 active:scale-95 flex items-center gap-2 text-sm font-medium"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--control-border)', color: 'var(--fg)' }}
                    title="Go to dot"
                >
                    <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] flex flex-col pt-4 md:pt-12"
                    style={{ backgroundColor: 'var(--bg)' }}
                >
                    <div className="w-full max-w-4xl mx-auto flex flex-col h-full pointer-events-auto">
                        
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--control-border)' }}>
                            <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
                                All Journals
                            </h2>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setShowCreate(!showCreate)}
                                    className="px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80 active:scale-95"
                                    style={{ backgroundColor: 'var(--fg)', color: 'var(--bg)' }}
                                >
                                    <Plus size={16} />
                                    New Entry
                                </button>
                                <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0" style={{ color: 'var(--fg-muted)' }}>
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Inline Create Form */}
                        <AnimatePresence>
                            {showCreate && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden border-b shrink-0"
                                    style={{ borderColor: 'var(--control-border)', backgroundColor: 'var(--control-bg)' }}
                                >
                                    <div className="px-6 py-4 flex flex-col sm:flex-row gap-3 sm:items-end">
                                        <div className="flex-1 flex flex-col gap-1 w-full sm:w-auto">
                                            <label className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Scope</label>
                                            <select 
                                                value={createScope} 
                                                onChange={e => setCreateScope(e.target.value)}
                                                className="px-3 py-2 text-sm rounded bg-transparent border focus:outline-none"
                                                style={{ borderColor: 'var(--control-border)', color: 'var(--fg)' }}
                                            >
                                                <option value="today">Today</option>
                                                <option value="month">This Month</option>
                                                <option value="year">This Year</option>
                                                <option value="date">Specific Date</option>
                                                <option value="life">Life</option>
                                            </select>
                                        </div>
                                        
                                        {createScope === 'date' && (
                                            <div className="flex-1 flex flex-col gap-1 w-full sm:w-auto">
                                                <label className="text-xs font-semibold" style={{ color: 'var(--fg-muted)' }}>Date</label>
                                                <input 
                                                    type="date" 
                                                    value={createDate}
                                                    onChange={e => setCreateDate(e.target.value)}
                                                    className="px-3 py-2 text-sm rounded bg-transparent border focus:outline-none"
                                                    style={{ borderColor: 'var(--control-border)', color: 'var(--fg)' }}
                                                />
                                            </div>
                                        )}

                                        <button 
                                            onClick={handleCreate}
                                            disabled={createScope === 'date' && !createDate}
                                            className="px-4 py-2 rounded font-medium text-sm transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 w-full sm:w-auto flex items-center justify-center gap-2"
                                            style={{ backgroundColor: 'var(--fg)', color: 'var(--bg)' }}
                                        >
                                            Write
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Toolbar */}
                        {(!loading || journals.length > 0) && (
                            <div className="px-6 py-3 border-b shrink-0 flex flex-col sm:flex-row gap-3 justify-between sm:items-center" style={{ borderColor: 'var(--control-border)' }}>
                                <div className="flex gap-2 items-center flex-wrap">
                                    <select 
                                        value={sortBy} 
                                        onChange={e => setSortBy(e.target.value)}
                                        className="text-sm bg-transparent border-none outline-none font-medium cursor-pointer"
                                        style={{ color: 'var(--fg)' }}
                                    >
                                        <option value="date_desc">Newest first</option>
                                        <option value="date_asc">Oldest first</option>
                                        <option value="edited_desc">Last edited</option>
                                    </select>
                                    <span style={{ color: 'var(--control-border)' }}>|</span>
                                    <div className="flex items-center gap-1 text-sm font-medium" style={{ color: 'var(--fg)' }}>
                                        <button 
                                            onClick={() => setGroupMode('flat')}
                                            className="px-2 py-1 rounded transition-colors"
                                            style={{ backgroundColor: groupMode === 'flat' ? 'var(--control-border)' : 'transparent' }}
                                        >
                                            Flat list
                                        </button>
                                        <button 
                                            onClick={() => setGroupMode('grouped')}
                                            className="px-2 py-1 rounded transition-colors"
                                            style={{ backgroundColor: groupMode === 'grouped' ? 'var(--control-border)' : 'transparent' }}
                                        >
                                            Grouped by period
                                        </button>
                                    </div>
                                </div>
                                <div className="w-full sm:w-auto sm:min-w-[200px]">
                                    <SearchBar
                                        value={filterText}
                                        onChange={setFilterText}
                                        placeholder="Filter journals..."
                                    />
                                </div>
                            </div>
                        )}

                        {/* Content */}
                        <div className="px-6 py-4 overflow-y-auto flex-1">
                            {loading ? (
                                <p className="text-sm text-center mt-8" style={{ color: 'var(--fg-muted)' }}>Loading...</p>
                            ) : journals.length === 0 ? (
                                <div className="text-center mt-12 flex flex-col items-center">
                                    <Calendar className="mb-3 opacity-50" size={32} style={{ color: 'var(--fg-muted)' }} />
                                    <p className="text-sm mb-4" style={{ color: 'var(--fg-muted)' }}>No journal entries written yet.</p>
                                    <button 
                                        onClick={() => setShowCreate(true)}
                                        className="text-sm font-medium hover:underline"
                                        style={{ color: 'var(--fg)' }}
                                    >
                                        Create your first entry
                                    </button>
                                </div>
                            ) : filteredJournals.length === 0 ? (
                                <p className="text-sm text-center mt-8" style={{ color: 'var(--fg-muted)' }}>No matching entries.</p>
                            ) : groupMode === 'flat' ? (
                                <div className="space-y-3 pb-8">
                                    {filteredJournals.map(renderEntryCard)}
                                </div>
                            ) : (
                                <div className="space-y-8 pb-8">
                                    {groupedJournals.map(group => (
                                        <div key={group.label}>
                                            <h3 className="text-lg font-bold mb-3 tracking-tight sticky top-0 py-2 backdrop-blur-sm" style={{ color: 'var(--fg)', backgroundColor: 'color-mix(in srgb, var(--bg) 90%, transparent)' }}>
                                                {group.label}
                                            </h3>
                                            <div className="space-y-6 pt-2 pl-3 sm:pl-5 border-l-2" style={{ borderColor: 'var(--control-border)' }}>
                                                {group.content.life.length > 0 && (
                                                    <div className="space-y-3">
                                                       {group.content.life.map(renderEntryCard)}
                                                    </div>
                                                )}

                                                {group.content.year.length > 0 && (
                                                    <div className="space-y-3">
                                                        {group.label !== 'Life' && <h4 className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2" style={{ color: 'var(--fg-muted)' }}>Year Logs</h4>}
                                                        {group.content.year.map(renderEntryCard)}
                                                    </div>
                                                )}

                                                {group.content.month.length > 0 && (
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2 mt-4" style={{ color: 'var(--fg-muted)' }}>Month Logs</h4>
                                                        {group.content.month.map(renderEntryCard)}
                                                    </div>
                                                )}

                                                {group.content.day.length > 0 && (
                                                    <div className="space-y-3">
                                                        <h4 className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2 mt-4" style={{ color: 'var(--fg-muted)' }}>Day Logs</h4>
                                                        {group.content.day.map(renderEntryCard)}
                                                    </div>
                                                )}

                                                {group.content.other.length > 0 && (
                                                    <div className="space-y-3">
                                                        {group.content.other.map(renderEntryCard)}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
