import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarHeart } from 'lucide-react';
import { fetchAllJournals, isAuthenticated } from '../utils/api';
import { parseContextKeyToDate, formatContextKey } from '../utils/dateEngine';
import { highlightText, matchesSearch } from '../utils/searchUtils';
import SearchBar from './SearchBar';

export default function AllJournalsModal({ isOpen, onClose, onJump }) {
    const [journals, setJournals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        if (isOpen && isAuthenticated()) {
            setLoading(true);
            fetchAllJournals()
                .then(data => {
                    const sorted = (data || []).sort((a, b) => {
                        return parseContextKeyToDate(b.context_key).getTime() - parseContextKeyToDate(a.context_key).getTime();
                    });
                    setJournals(sorted);
                })
                .catch(err => console.error(err))
                .finally(() => setLoading(false));
        }
        if (!isOpen) setSearchText('');
    }, [isOpen]);

    const stripHtml = (html) => {
        let doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        });
    };

    const strippedCache = useMemo(
        () => journals.map(j => ({ ...j, _stripped: stripHtml(j.content) })),
        [journals]
    );

    const filteredJournals = useMemo(
        () => strippedCache.filter(j => matchesSearch(j._stripped, searchText)),
        [strippedCache, searchText]
    );

    const handleJump = (contextKey) => {
        onJump(contextKey);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[100] flex flex-col"
                    style={{ backgroundColor: 'var(--bg)' }}
                >
                    <div className="w-full max-w-4xl mx-auto flex flex-col h-full pointer-events-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--control-border)' }}>
                            <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
                                All Journals
                            </h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0" style={{ color: 'var(--fg-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Search */}
                        {!loading && journals.length > 0 && (
                            <div className="px-6 pt-4 shrink-0">
                                <SearchBar
                                    value={searchText}
                                    onChange={setSearchText}
                                    placeholder="Search journals..."
                                />
                            </div>
                        )}

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {loading ? (
                                <p className="text-sm text-center mt-8" style={{ color: 'var(--fg-muted)' }}>Loading...</p>
                            ) : journals.length === 0 ? (
                                <p className="text-sm text-center mt-8" style={{ color: 'var(--fg-muted)' }}>No journal entries found.</p>
                            ) : filteredJournals.length === 0 ? (
                                <p className="text-sm text-center mt-8" style={{ color: 'var(--fg-muted)' }}>No matching entries.</p>
                            ) : (
                                <div className="space-y-4">
                                    {filteredJournals.map(j => (
                                        <div key={j.id} className="p-4 rounded-xl border flex flex-col gap-2 transition-all hover:shadow-md" style={{ borderColor: 'var(--control-border)', backgroundColor: 'var(--control-bg)' }}>
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--fg-muted)' }}>
                                                        {formatContextKey(j.context_key)}
                                                    </p>
                                                    {searchText.trim() ? (
                                                        <p
                                                            className="text-sm line-clamp-3 leading-relaxed journal-search-result"
                                                            style={{ color: 'var(--fg)' }}
                                                            dangerouslySetInnerHTML={{ __html: highlightText(j._stripped, searchText) }}
                                                        />
                                                    ) : (
                                                        <p className="text-sm line-clamp-3 leading-relaxed" style={{ color: 'var(--fg)' }}>
                                                            {j._stripped}
                                                        </p>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleJump(j.context_key)}
                                                    className="p-2 rounded shrink-0 transition-colors hover:scale-105 active:scale-95 flex items-center gap-2 text-sm font-medium"
                                                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--control-border)', color: 'var(--fg)' }}
                                                    title="Jump to date"
                                                >
                                                    <CalendarHeart size={16} />
                                                    <span className="hidden sm:inline">Jump</span>
                                                </button>
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
