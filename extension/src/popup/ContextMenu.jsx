import React, { useState, useEffect, useRef } from 'react';
import { PALETTE } from '../utils/dotMeta.js';

export default function ContextMenu({ x, y, dotId, meta, onUpdate, onClose }) {
    const [tag, setTag] = useState(meta.tag ?? '');
    const menuRef = useRef(null);
    const inputRef = useRef(null);

    // Adjust position to stay within the popup
    const adjustedX = Math.min(x, 380 - 170);
    const adjustedY = Math.min(y, 580);

    useEffect(() => {
        function handleClick(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                handleClose();
            }
        }
        function handleKey(e) {
            if (e.key === 'Escape') handleClose();
            if (e.key === 'Enter') handleClose();
        }
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [tag]);

    useEffect(() => {
        // Focus tag input
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const handleClose = () => {
        onUpdate(dotId, { color: meta.color, tag: tag.trim() || null });
        onClose();
    };

    const setColor = (color) => {
        onUpdate(dotId, { color, tag: tag.trim() || null });
        onClose();
    };

    const clearColor = () => {
        onUpdate(dotId, { color: null, tag: tag.trim() || null });
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{ left: adjustedX, top: adjustedY }}
        >
            {/* Color swatches */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {PALETTE.map((c) => (
                    <button
                        key={c}
                        className="swatch-btn"
                        style={{
                            backgroundColor: c,
                            outline: meta.color === c ? `2px solid ${c}` : 'none',
                            outlineOffset: 2,
                        }}
                        onClick={() => setColor(c)}
                        title={c}
                    />
                ))}
                <button className="swatch-clear" onClick={clearColor} title="Clear color">
                    ×
                </button>
            </div>

            <div style={{ height: 1, background: 'var(--control-border)', margin: '0 -2px' }} />

            {/* Tag input */}
            <input
                ref={inputRef}
                className="ctx-tag-input"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Add a tag…"
                maxLength={40}
            />
        </div>
    );
}
