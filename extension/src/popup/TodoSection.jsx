import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus } from 'lucide-react';
import { loadTodos, saveTodos } from '../utils/storage.js';

let todoIdCounter = Date.now();
function nextId() { return `todo_${++todoIdCounter}`; }

export default function TodoSection() {
    const [todos, setTodos] = useState([]);
    const [newText, setNewText] = useState('');
    const [loaded, setLoaded] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        loadTodos().then((stored) => {
            setTodos(stored);
            setLoaded(true);
        });
    }, []);

    useEffect(() => {
        if (!loaded) return;
        saveTodos(todos);
    }, [todos, loaded]);

    const addTodo = useCallback(() => {
        const text = newText.trim();
        if (!text) return;
        setTodos((prev) => [...prev, { id: nextId(), text, done: false, createdAt: Date.now() }]);
        setNewText('');
        inputRef.current?.focus();
    }, [newText]);

    const toggleTodo = useCallback((id) => {
        setTodos((prev) => prev.map((t) => t.id === id ? { ...t, done: !t.done } : t));
    }, []);

    const deleteTodo = useCallback((id) => {
        setTodos((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const handleKeyDown = (e) => { if (e.key === 'Enter') addTodo(); };

    const pending = todos.filter((t) => !t.done);
    const done = todos.filter((t) => t.done);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px', gap: 10 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--fg)', letterSpacing: '-0.01em' }}>
                    Todos
                </span>
                {pending.length > 0 && (
                    <span style={{
                        background: 'var(--fg)',
                        color: 'var(--bg)',
                        borderRadius: 20,
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 6px',
                    }}>
                        {pending.length}
                    </span>
                )}
            </div>

            {/* Todo list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                {todos.length === 0 && (
                    <p style={{ fontSize: 13, color: 'var(--fg-muted)', fontWeight: 300, paddingTop: 4 }}>
                        No todos yet. Add one below.
                    </p>
                )}

                {/* Pending */}
                {pending.map((todo) => (
                    <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
                ))}

                {/* Divider between pending and done */}
                {done.length > 0 && pending.length > 0 && (
                    <div style={{ height: 1, background: 'var(--control-border)', margin: '6px 0' }} />
                )}

                {/* Done */}
                {done.map((todo) => (
                    <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
                ))}
            </div>

            {/* Add todo input */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    background: 'var(--control-bg)',
                    border: '1px solid var(--control-border)',
                    borderRadius: 9,
                    padding: '7px 10px',
                    flexShrink: 0,
                }}
            >
                <Plus size={13} style={{ color: 'var(--fg-muted)', flexShrink: 0 }} />
                <input
                    ref={inputRef}
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a todo…"
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        outline: 'none',
                        fontSize: 13,
                        color: 'var(--fg)',
                        fontFamily: 'inherit',
                        caretColor: 'var(--fg)',
                    }}
                />
                {newText.trim() && (
                    <button
                        onClick={addTodo}
                        style={{
                            background: 'var(--fg)',
                            color: 'var(--bg)',
                            border: 'none',
                            borderRadius: 5,
                            padding: '2px 8px',
                            fontSize: 11.5,
                            fontWeight: 500,
                            fontFamily: 'inherit',
                            cursor: 'pointer',
                            flexShrink: 0,
                        }}
                    >
                        Add
                    </button>
                )}
            </div>
        </div>
    );
}

function TodoItem({ todo, onToggle, onDelete }) {
    return (
        <div className="todo-item">
            <input
                type="checkbox"
                className="todo-checkbox"
                checked={todo.done}
                onChange={() => onToggle(todo.id)}
            />
            <span className={`todo-text ${todo.done ? 'done' : ''}`}>{todo.text}</span>
            <button className="todo-del-btn" onClick={() => onDelete(todo.id)} aria-label="Delete todo">
                <X size={13} />
            </button>
        </div>
    );
}
