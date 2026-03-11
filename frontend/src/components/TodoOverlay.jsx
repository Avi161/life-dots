import { useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, CheckSquare, Square, Trash2, Plus, X } from 'lucide-react';
import { fetchTodos, createTodo, updateTodo, deleteTodo, isAuthenticated } from '../utils/api';

const BACKDROP = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.25 } },
    exit: { opacity: 0, transition: { duration: 0.2 } },
};

const PANEL = {
    initial: { opacity: 0, y: 40, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
    exit: { opacity: 0, y: 30, scale: 0.97, transition: { duration: 0.2 } },
};

export default function TodoOverlay({ contextKey, displayTitle, onClose, onTodosChanged }) {
    const [todos, setTodos] = useState([]);
    const [newTodoTask, setNewTodoTask] = useState('');
    const [todosLoading, setTodosLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        if (isAuthenticated()) {
            setTodosLoading(true);
            fetchTodos(contextKey)
                .then(data => setTodos(data || []))
                .catch(err => console.error(err))
                .finally(() => setTodosLoading(false));
        }
    }, [contextKey]);

    const handleAddTodo = async (e) => {
        e.preventDefault();
        if (!newTodoTask.trim() || !isAuthenticated()) return;
        setErrorMsg('');
        try {
            const newTodo = await createTodo(contextKey, newTodoTask.trim());
            setTodos([...todos, newTodo]);
            setNewTodoTask('');
            if (onTodosChanged) onTodosChanged();
        } catch (err) {
            console.error(err);
            setErrorMsg(err.message || 'Failed to add to-do.');
        }
    };

    const handleToggleTodo = async (todo) => {
        if (!isAuthenticated()) return;
        try {
            await updateTodo(todo.id, { is_completed: !todo.is_completed });
            setTodos(todos.map(t => t.id === todo.id ? { ...t, is_completed: !todo.is_completed } : t));
            if (onTodosChanged) onTodosChanged();
        } catch (err) {
            console.error(err);
            setErrorMsg(err.message || 'Failed to update to-do.');
        }
    };

    const handleDeleteTodo = async (id) => {
        if (!isAuthenticated()) return;
        setErrorMsg('');
        try {
            await deleteTodo(id);
            setTodos(todos.filter(t => t.id !== id));
            if (onTodosChanged) onTodosChanged();
        } catch (err) {
            console.error(err);
            setErrorMsg(err.message || 'Failed to delete to-do.');
        }
    };

    const handleClose = useCallback(() => {
        setErrorMsg('');
        onClose();
    }, [onClose]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleClose]);

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center journal-backdrop"
            onClick={handleClose}
            {...BACKDROP}
        >
            <motion.div
                className="journal-panel flex flex-col"
                onClick={(e) => e.stopPropagation()}
                {...PANEL}
                style={{ maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
            >
                <div className="journal-header flex flex-row items-center justify-between gap-3 !pb-4 border-b w-full" style={{ borderColor: 'var(--control-border)' }}>
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <h2
                                className="text-base sm:text-lg font-semibold tracking-tight"
                                style={{ color: 'var(--fg)' }}
                            >
                                {displayTitle.replace('Journal', 'To-Do List')}
                            </h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-full transition-colors duration-200"
                                style={{
                                    backgroundColor: 'var(--control-bg)',
                                    color: 'var(--fg)',
                                    flexShrink: 0,
                                }}
                                onMouseEnter={(e) =>
                                    (e.target.style.backgroundColor = 'rgba(74, 222, 128, 0.1)')
                                }
                                onMouseLeave={(e) =>
                                    (e.target.style.backgroundColor = 'var(--control-bg)')
                                }
                                aria-label="Save and close to-dos"
                                title="Save & Close"
                            >
                                <Check size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-4 flex-1 flex flex-col min-h-0">
                    <form onSubmit={handleAddTodo} className="flex gap-2 mb-4 shrink-0">
                        <input
                            type="text"
                            value={newTodoTask}
                            onChange={(e) => setNewTodoTask(e.target.value)}
                            placeholder="Add a new task..."
                            className="flex-1 rounded px-3 py-2 text-sm outline-none"
                            style={{ backgroundColor: 'var(--control-bg)', color: 'var(--fg)', border: '1px solid var(--control-border)' }}
                        />
                        <button type="submit" disabled={!isAuthenticated() || !newTodoTask.trim()} className="p-2 rounded text-white flex items-center justify-center transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100" style={{ backgroundColor: 'var(--fg)', color: 'var(--bg)' }}>
                            <Plus size={16} />
                        </button>
                    </form>

                    {errorMsg && (
                        <div className="mb-4 p-2 rounded text-sm shrink-0" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'rgb(239, 68, 68)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                            {errorMsg}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto space-y-2 pb-2">
                        {todosLoading ? (
                            <p className="text-sm text-center mt-4" style={{ color: 'var(--fg-muted)' }}>Loading...</p>
                        ) : todos.length === 0 ? (
                            <p className="text-sm text-center mt-4" style={{ color: 'var(--fg-muted)' }}>No to-dos yet.</p>
                        ) : (
                            todos.map(todo => (
                                <div key={todo.id} className="flex items-center justify-between p-2 rounded border group" style={{ borderColor: 'var(--control-border)', backgroundColor: 'var(--control-bg)' }}>
                                    <div className="flex items-center gap-3 min-w-0 flex-1">
                                        <button onClick={() => handleToggleTodo(todo)} className="shrink-0 transition-transform hover:scale-110 active:scale-95" style={{ color: todo.is_completed ? 'var(--fg-muted)' : 'var(--fg)' }}>
                                            {todo.is_completed ? <CheckSquare size={16} /> : <Square size={16} />}
                                        </button>
                                        <span className={`text-sm truncate ${todo.is_completed ? 'line-through opacity-60' : ''}`} style={{ color: 'var(--fg)' }}>
                                            {todo.task}
                                        </span>
                                    </div>
                                    <button onClick={() => handleDeleteTodo(todo.id)} className="p-1 shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:text-red-500" style={{ color: 'var(--fg-muted)' }} aria-label="Delete Todo">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
