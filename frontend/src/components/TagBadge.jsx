/**
 * A tiny pill shown below a dot when a text tag exists.
 * Truncates to ~12 chars with ellipsis.
 */
export default function TagBadge({ tag }) {
    if (!tag) return null;

    // Hardcap the visual display to 4 characters to guarantee no collisions
    const display = tag.slice(0, 4);

    return (
        <span
            className="absolute top-full left-1/2 -translate-x-1/2 z-10 block text-center mt-1 whitespace-nowrap"
            style={{
                fontSize: '9px',
                fontWeight: 500,
                letterSpacing: '0.02em',
                color: 'var(--fg-muted)',
                lineHeight: 1.2,
            }}
            title={tag}
        >
            {display}
        </span>
    );
}
