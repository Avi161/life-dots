import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarHeart, CheckSquare, Square } from 'lucide-react';
import { fetchAllTodos, updateTodo, isAuthenticated } from '../utils/api';
import { parseContextKeyToDate, formatContextKey } from '../utils/dateEngine';

export default function AllTodosModal({ isOpen, onClose, onJump, onTodosChanged }) {
    const [todos, setTodos] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadTodos = () => {
        if (!isAuthenticated()) return;
        setLoading(true);
        fetchAllTodos()
            .then(data => {
                const sorted = (data || []).sort((a, b) => {
                    return parseContextKeyToDate(a.context_key).getTime() - parseContextKeyToDate(b.context_key).getTime();
                });
                setTodos(sorted);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        if (isOpen) {
            loadTodos();
        }
    }, [isOpen]);

    const handleToggle = async (todo) => {
        try {
            await updateTodo(todo.id, { is_completed: !todo.is_completed });
            setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, is_completed: !todo.is_completed } : t));
            if (onTodosChanged) onTodosChanged();
        } catch (err) {
            console.error('Failed to update todo', err);
        }
    };

    const handleJump = (contextKey) => {
        onJump(contextKey);
        onClose();
    };

    const pending = todos.filter(t => !t.is_completed);
    const completed = todos.filter(t => t.is_completed);

    const renderTodo = (todo) => (
        <div key={todo.id} className="p-4 rounded-xl border flex items-center justify-between gap-4 transition-all hover:shadow-md" style={{ borderColor: 'var(--control-border)', backgroundColor: 'var(--control-bg)' }}>
            <button onClick={() => handleToggle(todo)} className="shrink-0 transition-transform hover:scale-110 active:scale-95" style={{ color: todo.is_completed ? 'var(--fg-muted)' : 'var(--fg)' }}>
                {todo.is_completed ? <CheckSquare size={20} /> : <Square size={20} />}
            </button>
            <div className="flex-1 min-w-0">
                <p className={`text-sm md:text-base truncate ${todo.is_completed ? 'line-through opacity-60' : ''}`} style={{ color: 'var(--fg)' }}>
                    {todo.task}
                </p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold" style={{ backgroundColor: 'var(--bg)', color: 'var(--fg-muted)', border: '1px solid var(--control-border)' }}>
                        {formatContextKey(todo.context_key)}
                    </span>
                    {todo.due_date && (
                        <p className="text-[10px] md:text-xs uppercase tracking-wider" style={{ color: 'var(--fg-muted)' }}>
                            Due: {new Date(todo.due_date).toLocaleDateString()}
                        </p>
                    )}
                </div>
            </div>
            <button
                onClick={() => handleJump(todo.context_key)}
                className="p-2 rounded shrink-0 transition-colors hover:scale-105 active:scale-95 flex items-center gap-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--control-border)', color: 'var(--fg)' }}
                title="Jump to date"
            >
                <CalendarHeart size={16} />
                <span className="hidden sm:inline">Jump</span>
            </button>
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
                    className="fixed inset-0 z-[100] flex flex-col"
                    style={{ backgroundColor: 'var(--bg)' }}
                >
                    <div className="w-full max-w-4xl mx-auto flex flex-col h-full pointer-events-auto">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--control-border)' }}>
                            <h2 className="text-xl font-semibold tracking-tight" style={{ color: 'var(--fg)' }}>
                                All To-Dos
                            </h2>
                            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors shrink-0" style={{ color: 'var(--fg-muted)' }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {loading ? (
                                <p className="text-sm text-center mt-8" style={{ color: 'var(--fg-muted)' }}>Loading...</p>
                            ) : todos.length === 0 ? (
                                <p className="text-sm text-center mt-8" style={{ color: 'var(--fg-muted)' }}>No to-dos found.</p>
                            ) : (
                                <div className="space-y-8">
                                    {pending.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--fg-muted)' }}>Pending</h3>
                                            <div className="space-y-3">
                                                {pending.map(renderTodo)}
                                            </div>
                                        </div>
                                    )}
                                    {completed.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--fg-muted)' }}>Completed</h3>
                                            <div className="space-y-3">
                                                {completed.map(renderTodo)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
