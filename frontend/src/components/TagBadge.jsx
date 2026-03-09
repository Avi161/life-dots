/**
 * A tiny pill shown below a dot when a text tag exists.
 * Truncates to ~12 chars with ellipsis.
 */
export default function TagBadge({ tag }) {
    if (!tag) return null;
    const display = tag.length > 12 ? tag.slice(0, 11) + '…' : tag;
    return (
        <span
            style={{
                fontSize: '9px',
                fontWeight: 500,
                letterSpacing: '0.02em',
                color: 'var(--fg-muted)',
                whiteSpace: 'normal',
                wordBreak: 'break-word',
                maxWidth: '64px',
                width: 'max-content',
                display: 'block',
                textAlign: 'center',
                lineHeight: 1.2,
                marginTop: '4px',
                position: 'absolute',
                top: '100%',
                zIndex: 10,
            }}
            title={tag}
        >
            {display}
        </span>
    );
}
