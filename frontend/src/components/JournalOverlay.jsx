import { useEffect, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, CheckSquare, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import { Extension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExt from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import FontFamily from '@tiptap/extension-font-family';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import useLocalJournal from '../hooks/useLocalJournal';

const BackspaceListFix = Extension.create({
    name: 'backspaceListFix',
    priority: 1000,
    addKeyboardShortcuts() {
        return {
            Backspace: () => {
                const { state } = this.editor;
                const { selection } = state;
                if (!selection.empty) return false;
                if (selection.$anchor.parentOffset !== 0) return false;

                const parent = selection.$anchor.parent;
                if (parent.type.name === 'paragraph' && parent.textContent.length === 0) {
                    if (this.editor.isActive('listItem') || this.editor.isActive('taskItem')) {
                        // Lift out of list items
                        return this.editor.commands.liftListItem('listItem') || this.editor.commands.liftListItem('taskItem');
                    }
                }
                return false;
            },
        };
    },
});

const FontSize = Extension.create({
    name: 'fontSize',
    addOptions() { return { types: ['textStyle'] }; },
    addGlobalAttributes() {
        return [
            {
                types: this.options.types,
                attributes: {
                    fontSize: {
                        default: null,
                        parseHTML: element => element.style.fontSize?.replace(/['"]+/g, ''),
                        renderHTML: attributes => {
                            if (!attributes.fontSize) return {};
                            return { style: `font-size: ${attributes.fontSize}` };
                        },
                    },
                },
            },
        ];
    },
    addCommands() {
        return {
            setFontSize: fontSize => ({ chain }) => chain().setMark('textStyle', { fontSize }).run(),
            unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
        };
    },
});

const TEXT_COLORS = [
    { label: 'Default', value: 'var(--fg)', css: 'var(--fg)' },
    { label: 'Muted', value: '#888888', css: '#888888' },
    { label: 'Blue', value: 'rgba(59,130,246,0.8)', css: 'rgba(59,130,246,0.8)' },
    { label: 'Red', value: 'rgba(239,68,68,0.8)', css: 'rgba(239,68,68,0.8)' },
];

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

function ToolbarButton({ active, onClick, children, title }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className="journal-toolbar-btn"
            style={{
                backgroundColor: active ? 'var(--control-hover)' : 'transparent',
                color: active ? 'var(--fg)' : 'var(--fg-muted)',
            }}
        >
            {children}
        </button>
    );
}

function ColorSwatch({ color, active, onClick }) {
    return (
        <button
            type="button"
            onClick={onClick}
            title={color.label}
            className="journal-color-swatch"
            style={{
                backgroundColor: color.css,
                outline: active ? `2px solid ${color.css}` : 'none',
                outlineOffset: '2px',
            }}
        />
    );
}

const FONT_OPTIONS = [
    { value: 'Inter, sans-serif', label: 'Inter' },
    { value: 'Arial, sans-serif', label: 'Arial' },
    { value: 'Times New Roman, Times, serif', label: 'Times New Roman' },
    { value: 'Georgia, serif', label: 'Georgia' },
    { value: 'Courier New, Courier, monospace', label: 'Courier New' },
];

const SIZE_OPTIONS = [
    { value: '10px', label: '10' },
    { value: '12px', label: '12' },
    { value: '14px', label: '14' },
    { value: '16px', label: '16' },
    { value: '18px', label: '18' },
    { value: '20px', label: '20' },
    { value: '24px', label: '24' },
    { value: '30px', label: '30' },
];

// Strip quotes to normalize font names (TipTap's parseHTML strips them)
const normalizeFont = (f) => (f ? f.replace(/['"]+ /g, '').replace(/['"]+ /g, '').replace(/['"]/g, '') : f);

// Resolve 'default' to actual values
const resolveFont = (f) => (f && f !== 'default' ? normalizeFont(f) : 'Inter, sans-serif');
const resolveSize = (s) => (s && s !== 'default' ? s : '14px');

export default function JournalOverlay({ contextKey, displayTitle, onClose, journalFont = 'default', journalFontSize = 'default' }) {
    const { content, setContent, saveStatus, forceSave, isLoading } = useLocalJournal(contextKey);
    const [, forceUpdate] = useState(0);

    const defaultFont = resolveFont(journalFont);
    const defaultSize = resolveSize(journalFontSize);

    const handleClose = useCallback(() => {
        forceSave();
        onClose();
    }, [forceSave, onClose]);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({ heading: false }),
            UnderlineExt,
            TextStyle,
            Color,
            FontSize,
            FontFamily,
            TaskList,
            TaskItem.configure({ nested: true }),
            BackspaceListFix,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'journal-link',
                },
                autolink: true,
            }),
        ],
        content: content || '',
        onUpdate: ({ editor: ed }) => {
            setContent(ed.getHTML());
        },
        onTransaction: () => {
            forceUpdate(x => x + 1);
        },
        editorProps: {
            attributes: {
                class: 'journal-editor-content',
            },
            handleKeyDown: (view, event) => {
                // Auto-apply default font/size as inline marks when typing at unmarked position
                if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                    const { state } = view;
                    const attrs = state.storedMarks
                        ? Object.fromEntries(state.storedMarks.flatMap(m => m.type.name === 'textStyle' ? [['fontFamily', m.attrs.fontFamily], ['fontSize', m.attrs.fontSize]] : []))
                        : (state.selection.$from.marks() || []).reduce((acc, m) => {
                            if (m.type.name === 'textStyle') {
                                if (m.attrs.fontFamily) acc.fontFamily = m.attrs.fontFamily;
                                if (m.attrs.fontSize) acc.fontSize = m.attrs.fontSize;
                            }
                            return acc;
                        }, {});
                    
                    const needsFont = !attrs.fontFamily;
                    const needsSize = !attrs.fontSize;
                    
                    if (needsFont || needsSize) {
                        const markAttrs = {};
                        if (needsFont) markAttrs.fontFamily = defaultFont;
                        if (needsSize) markAttrs.fontSize = defaultSize;
                        // Merge with existing textStyle attrs
                        const existing = attrs;
                        const merged = { ...existing, ...markAttrs };
                        // Set combined stored mark
                        const markType = state.schema.marks.textStyle;
                        if (markType) {
                            const mark = markType.create(merged);
                            view.dispatch(state.tr.addStoredMark(mark));
                        }
                    }
                }
                return false; // Let TipTap handle the keypress normally
            },
        },
    });

    // Update content cleanly if it arrives late from network
    useEffect(() => {
        if (editor && !isLoading && content !== undefined) {
            const currentHTML = editor.getHTML();
            if (currentHTML !== content) {
                editor.commands.setContent(content || '');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contextKey, isLoading]);

    // Close on Escape
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [handleClose]);

    // Focus editor on open
    useEffect(() => {
        const timer = setTimeout(() => editor?.commands.focus('end'), 150);
        return () => clearTimeout(timer);
    }, [editor]);

    const statusLabel =
        saveStatus === 'saving'
            ? 'Saving…'
            : saveStatus === 'saved'
                ? 'Saved ✓'
                : '';

    const isColorActive = (colorValue) => {
        if (!editor) return false;
        return editor.isActive('textStyle', { color: colorValue });
    };

    // Current cursor font/size (from mark or fallback to default)
    const cursorFont = normalizeFont(editor?.getAttributes('textStyle').fontFamily) || defaultFont;
    const cursorSize = editor?.getAttributes('textStyle').fontSize || defaultSize;

    if (!editor) return null;

    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center journal-backdrop"
            onClick={handleClose}
            {...BACKDROP}
        >
            <motion.div
                className="journal-panel"
                onClick={(e) => e.stopPropagation()}
                {...PANEL}
            >
                <div className="journal-header flex flex-row items-center justify-between gap-3 !pb-0 w-full" style={{ paddingBottom: 0 }}>
                    <div className="flex items-center justify-between w-full">
                        <div>
                            <h2
                                className="text-base sm:text-lg font-semibold tracking-tight"
                                style={{ color: 'var(--fg)' }}
                            >
                                {displayTitle}
                            </h2>
                            <p
                                className="text-[10px] font-light tracking-wide"
                                style={{
                                    color: 'var(--fg-muted)',
                                    marginTop: '2px',
                                    minHeight: '14px',
                                    transition: 'opacity 0.2s ease',
                                    opacity: statusLabel ? 1 : 0,
                                }}
                            >
                                {statusLabel || '\u00A0'}
                            </p>
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
                                aria-label="Save and close journal"
                                title="Save & Close"
                            >
                                <Check size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="journal-toolbar">
                    <div className="journal-toolbar-group">
                        <select
                            className="journal-toolbar-select"
                            style={{ minWidth: '110px' }}
                            value={cursorFont}
                            onChange={(e) => {
                                editor.chain().focus().setFontFamily(e.target.value).run();
                            }}
                            title="Font Family"
                        >
                            {FONT_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}{opt.value === defaultFont ? ' (Default)' : ''}
                                </option>
                            ))}
                        </select>

                        <select
                            className="journal-toolbar-select"
                            value={cursorSize}
                            onChange={(e) => {
                                editor.chain().focus().setFontSize(e.target.value).run();
                            }}
                            title="Font Size"
                        >
                            {SIZE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}{opt.value === defaultSize ? ' (Default)' : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="journal-toolbar-divider" />

                    {/* Formatting */}
                    <div className="journal-toolbar-group">
                        <ToolbarButton
                            active={editor.isActive('bold')}
                            onClick={() => editor.chain().focus().toggleBold().run()}
                            title="Bold"
                        >
                            <Bold size={14} />
                        </ToolbarButton>
                        <ToolbarButton
                            active={editor.isActive('italic')}
                            onClick={() => editor.chain().focus().toggleItalic().run()}
                            title="Italic"
                        >
                            <Italic size={14} />
                        </ToolbarButton>
                        <ToolbarButton
                            active={editor.isActive('underline')}
                            onClick={() => editor.chain().focus().toggleUnderline().run()}
                            title="Underline"
                        >
                            <UnderlineIcon size={14} />
                        </ToolbarButton>
                    </div>

                    <div className="journal-toolbar-divider" />

                    {/* Alignment */}
                    <div className="journal-toolbar-group">
                        <ToolbarButton
                            active={editor.isActive({ textAlign: 'left' })}
                            onClick={() => editor.chain().focus().setTextAlign('left').run()}
                            title="Align Left"
                        >
                            <AlignLeft size={14} />
                        </ToolbarButton>
                        <ToolbarButton
                            active={editor.isActive({ textAlign: 'center' })}
                            onClick={() => editor.chain().focus().setTextAlign('center').run()}
                            title="Align Center"
                        >
                            <AlignCenter size={14} />
                        </ToolbarButton>
                        <ToolbarButton
                            active={editor.isActive({ textAlign: 'right' })}
                            onClick={() => editor.chain().focus().setTextAlign('right').run()}
                            title="Align Right"
                        >
                            <AlignRight size={14} />
                        </ToolbarButton>
                    </div>

                    <div className="journal-toolbar-divider" />

                    {/* Lists */}
                    <div className="journal-toolbar-group">
                        <ToolbarButton
                            active={editor.isActive('bulletList')}
                            onClick={() => editor.chain().focus().toggleBulletList().run()}
                            title="Bullet List"
                        >
                            <List size={14} />
                        </ToolbarButton>
                        <ToolbarButton
                            active={editor.isActive('orderedList')}
                            onClick={() => editor.chain().focus().toggleOrderedList().run()}
                            title="Numbered List"
                        >
                            <ListOrdered size={14} />
                        </ToolbarButton>
                        <ToolbarButton
                            active={editor.isActive('taskList')}
                            onClick={() => editor.chain().focus().toggleTaskList().run()}
                            title="Checklist"
                        >
                            <CheckSquare size={14} />
                        </ToolbarButton>
                    </div>

                    <div className="journal-toolbar-divider" />

                    {/* Color swatches */}
                    <div className="journal-toolbar-group" style={{ paddingLeft: '4px' }}>
                        {TEXT_COLORS.map((c) => (
                            <ColorSwatch
                                key={c.label}
                                color={c}
                                active={isColorActive(c.value)}
                                onClick={() => {
                                    if (c.label === 'Default') {
                                        editor.chain().focus().unsetColor().run();
                                    } else {
                                        editor.chain().focus().setColor(c.value).run();
                                    }
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Editor */}
                <div className="journal-editor-wrapper relative" style={{ minHeight: '300px' }}>
                    {/* Loading Overlay */}
                    {isLoading && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center rounded-b-md" style={{ backgroundColor: 'var(--bg)' }}>
                            <span className="text-sm font-medium animate-pulse" style={{ color: 'var(--fg-muted)' }}>Loading...</span>
                        </div>
                    )}
                    <EditorContent editor={editor} className="h-full" />
                </div>
            </motion.div>
        </motion.div>
    );
}
