import { useEffect, useRef, useState } from 'react';
import { PALETTE } from '../utils/dotMeta';

/**
 * Minimal right-click context menu for coloring and tagging a dot.
 *
 * Props:
 *   x, y        – screen coordinates
 *   dotId       – the unique ID of the dot being edited
 *   meta        – { color: string|null, tag: string|null } current state
 *   onUpdate    – (dotId, { color, tag }) => void
 *   onClose     – () => void
 */
export default function ContextMenu({ x, y, dotId, meta, onUpdate, onClose }) {
    const menuRef = useRef(null);
    const [tag, setTag] = useState(meta?.tag ?? '');
    const [pendingColor, setPendingColor] = useState(meta?.color ?? null);

    // Adjust position so menu doesn't overflow viewport
    const [pos, setPos] = useState({ x, y });
    useEffect(() => {
        if (!menuRef.current) return;
        const { width, height } = menuRef.current.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        setPos({
            x: x + width > vw ? x - width : x,
            y: y + height > vh ? y - height : y,
        });
    }, [x, y]);

    // Close on click outside or Escape
    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                commitAndClose();
            }
        };
        const handleKey = (e) => {
            if (e.key === 'Escape') commitAndClose();
            if (e.key === 'Enter') commitAndClose();
        };
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('touchstart', handleClick);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('touchstart', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tag, pendingColor]);

    const commitAndClose = () => {
        onUpdate(dotId, { color: pendingColor, tag: tag.trim() || null });
        onClose();
    };

    const handleColorClick = (color) => {
        const next = pendingColor === color ? null : color;
        setPendingColor(next);
    };

    const handleClear = () => {
        setPendingColor(null);
        setTag('');
        onUpdate(dotId, { color: null, tag: null });
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className="context-menu"
            style={{ left: pos.x, top: pos.y }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Color swatches */}
            <div className="context-menu-swatches">
                {PALETTE.map((color) => (
                    <button
                        key={color}
                        className="swatch-btn"
                        style={{
                            backgroundColor: color,
                            outline: pendingColor === color ? `2px solid ${color}` : 'none',
                            outlineOffset: '2px',
                        }}
                        onClick={() => handleColorClick(color)}
                        title={color}
                        type="button"
                    />
                ))}
                {/* Clear button */}
                <button
                    className="swatch-clear"
                    onClick={handleClear}
                    title="Clear color & tag"
                    type="button"
                >
                    ×
                </button>
            </div>

            {/* Divider */}
            <div className="context-menu-divider" />

            {/* Tag input */}
            <input
                className="context-menu-tag-input"
                type="text"
                placeholder="Add a tag…"
                maxLength={40}
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.stopPropagation();
                        commitAndClose();
                    }
                    if (e.key === 'Escape') {
                        e.stopPropagation();
                        commitAndClose();
                    }
                }}
                autoFocus
            />
        </div>
    );
}
