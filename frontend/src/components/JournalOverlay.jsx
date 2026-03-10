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

export default function JournalOverlay({ contextKey, displayTitle, onClose }) {
    const { content, setContent, saveStatus, forceSave } = useLocalJournal(contextKey);
    const [, forceUpdate] = useState(0); // Used to ensure toolbar active states update instantly

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
        ],
        content: content || '',
        onUpdate: ({ editor: ed }) => {
            setContent(ed.getHTML());
        },
        onTransaction: () => {
            // Force re-render on selection/format changes so toolbar updates immediately
            forceUpdate(x => x + 1);
        },
        editorProps: {
            attributes: {
                class: 'journal-editor-content',
            },
        },
    });

    // Sync content when contextKey changes (editor might already exist)
    useEffect(() => {
        if (editor && content !== undefined) {
            const currentHTML = editor.getHTML();
            // Only set content if it actually differs (avoid cursor jump)
            if (currentHTML !== content) {
                editor.commands.setContent(content || '');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contextKey]);

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

    const isColorActive = useCallback(
        (colorValue) => {
            if (!editor) return false;
            return editor.isActive('textStyle', { color: colorValue });
        },
        [editor],
    );

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
                {/* Header */}
                <div className="journal-header">
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
                                color: 'var(--fg)', // slightly darker than fg-muted to emphasize done
                                flexShrink: 0,
                            }}
                            onMouseEnter={(e) =>
                                (e.target.style.backgroundColor = 'rgba(74, 222, 128, 0.1)') // Subtly green hover
                            }
                            onMouseLeave={(e) =>
                                (e.target.style.backgroundColor = 'var(--control-bg)')
                            }
                            aria-label="Save and close journal"
                            title="Save & Close"
                        >
                            <Check size={16} style={{ color: 'var(--color-green, #4ade80)' }} />
                        </button>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-full transition-colors duration-200"
                            style={{
                                backgroundColor: 'var(--control-bg)',
                                color: 'var(--fg-muted)',
                                flexShrink: 0,
                            }}
                            onMouseEnter={(e) =>
                                (e.target.style.backgroundColor = 'var(--control-hover)')
                            }
                            onMouseLeave={(e) =>
                                (e.target.style.backgroundColor = 'var(--control-bg)')
                            }
                            aria-label="Close journal"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="journal-toolbar">
                    <div className="journal-toolbar-group">
                        <select
                            className="journal-toolbar-select"
                            style={{ minWidth: '110px' }}
                            value={editor.getAttributes('textStyle').fontFamily || 'default'}
                            onChange={(e) => {
                                if (e.target.value === 'default') {
                                    editor.chain().focus().unsetFontFamily().run();
                                } else {
                                    editor.chain().focus().setFontFamily(e.target.value).run();
                                }
                            }}
                            title="Font Family"
                        >
                            <option value="default">Inter (Default)</option>
                            <option value="Arial, sans-serif">Arial</option>
                            <option value="'Times New Roman', Times, serif">Times New Roman</option>
                            <option value="Georgia, serif">Georgia</option>
                            <option value="'Courier New', Courier, monospace">Courier New</option>
                        </select>

                        <select
                            className="journal-toolbar-select"
                            value={editor.getAttributes('textStyle').fontSize || 'default'}
                            onChange={(e) => {
                                if (e.target.value === 'default') {
                                    editor.chain().focus().unsetFontSize().run();
                                } else {
                                    editor.chain().focus().setFontSize(e.target.value).run();
                                }
                            }}
                            title="Font Size"
                        >
                            <option value="10px">10</option>
                            <option value="12px">12</option>
                            <option value="default">14</option>
                            <option value="16px">16</option>
                            <option value="18px">18</option>
                            <option value="20px">20</option>
                            <option value="24px">24</option>
                            <option value="30px">30</option>
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
                <div className="journal-editor-wrapper">
                    <EditorContent editor={editor} />
                </div>
            </motion.div>
        </motion.div>
    );
}
