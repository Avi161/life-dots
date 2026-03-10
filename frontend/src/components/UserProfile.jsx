import React, { useState, useRef, useEffect } from 'react';
import { LogIn, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UserProfile({ user, isLoggedIn, onLogin, onLogout }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!isLoggedIn) {
        return (
            <button
                onClick={onLogin}
                className="fixed top-5 right-[4.5rem] z-40 rounded-full transition-colors duration-200 flex items-center justify-center cursor-pointer select-none"
                style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: 'var(--control-bg)',
                    border: '1px solid var(--control-border)',
                    color: 'var(--fg)',
                    boxShadow: '0 2px 8px var(--shadow-color)',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--control-hover)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--control-bg)';
                }}
                aria-label="Sign in"
                title="Sign in"
                data-html2canvas-ignore="true"
            >
                <LogIn size={18} strokeWidth={2} style={{ marginLeft: '-2px' }} />
            </button>
        );
    }

    // Determine Initials
    const initial = user?.email ? user.email.charAt(0).toUpperCase() : '?';

    return (
        <div ref={containerRef} className="fixed top-5 right-[4.5rem] z-50" data-html2canvas-ignore="true">
            {/* Avatar Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-full transition-colors duration-200 flex items-center justify-center font-bold text-sm cursor-pointer select-none"
                style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: isOpen ? 'var(--control-hover)' : 'var(--control-bg)',
                    border: '1px solid var(--control-border)',
                    color: 'var(--fg)',
                    boxShadow: '0 2px 8px var(--shadow-color)',
                }}
                onMouseEnter={(e) => {
                    if (!isOpen) e.currentTarget.style.backgroundColor = 'var(--control-hover)';
                }}
                onMouseLeave={(e) => {
                    if (!isOpen) e.currentTarget.style.backgroundColor = 'var(--control-bg)';
                }}
                aria-label="User Profile"
            >
                {initial}
            </button>

            {/* Dropdown Popover */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="absolute right-0 mt-2 w-64 rounded-xl shadow-lg border overflow-hidden"
                        style={{
                            backgroundColor: 'var(--bg)',
                            borderColor: 'var(--control-border)',
                            boxShadow: '0 10px 30px var(--shadow-color)',
                        }}
                    >
                        {/* Header: Email */}
                        <div
                            className="px-4 py-3 flex items-center gap-3 border-b"
                            style={{ borderColor: 'var(--control-border)', backgroundColor: 'var(--control-bg)' }}
                        >
                            <div className="flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 w-10 h-10 shrink-0">
                                <User size={20} style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
                                    {user?.email || 'Logged In'}
                                </p>
                                <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
                                    User Profile
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-2">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onLogout();
                                }}
                                className="w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors duration-150"
                                style={{ color: 'var(--color-red, #f87171)' }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--control-hover)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                                <LogOut size={16} />
                                Sign out
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
