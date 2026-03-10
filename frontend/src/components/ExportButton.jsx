import { useCallback } from 'react';
import { toPng } from 'html-to-image';
import { Download } from 'lucide-react';

export default function ExportButton({ targetRef }) {
    const handleExport = useCallback(async () => {
        if (!targetRef.current) return;

        const el = targetRef.current;
        const padding = 60;

        try {
            const dataUrl = await toPng(el, {
                backgroundColor:
                    document.documentElement.getAttribute('data-theme') === 'dark'
                        ? '#000000'
                        : '#ffffff',
                pixelRatio: 2,
                quality: 1,
                width: el.scrollWidth + padding * 2,
                height: el.scrollHeight + padding * 2,
                style: {
                    width: `${el.scrollWidth}px`,
                    height: `${el.scrollHeight}px`,
                    maxWidth: 'none',
                    padding: `${padding}px`,
                    margin: '0',
                    overflow: 'visible',
                },
            });

            const link = document.createElement('a');
            link.download = `life-in-dots-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Export failed:', err);
        }
    }, [targetRef]);

    return (
        <button
            onClick={handleExport}
            className="p-2 rounded-full transition-colors duration-200"
            style={{
                backgroundColor: 'var(--control-bg)',
                color: 'var(--fg)',
            }}
            onMouseEnter={(e) =>
                (e.target.style.backgroundColor = 'var(--control-hover)')
            }
            onMouseLeave={(e) =>
                (e.target.style.backgroundColor = 'var(--control-bg)')
            }
            aria-label="Export as wallpaper"
        >
            <Download size={16} />
        </button>
    );
}
