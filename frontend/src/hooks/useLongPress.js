import { useRef, useCallback } from 'react';

const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD = 10; // px — cancel if finger drifts

/**
 * Returns touch-event handlers that trigger `callback(syntheticEvent, dotIndex)`
 * after the user holds a touch for 500 ms without moving.
 *
 * Prevents page scroll while the user is holding.
 */
export default function useLongPress(callback, dotIndex) {
    const timerRef = useRef(null);
    const startPos = useRef({ x: 0, y: 0 });

    const clear = useCallback(() => {
        clearTimeout(timerRef.current);
        timerRef.current = null;
    }, []);

    const onTouchStart = useCallback(
        (e) => {
            if (!callback) return;
            const touch = e.touches[0];
            startPos.current = { x: touch.clientX, y: touch.clientY };

            timerRef.current = setTimeout(() => {
                // Build a lightweight event-like object matching what onContextMenu passes
                const syntheticEvent = {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    preventDefault: () => { },
                };
                callback(syntheticEvent, dotIndex);
                timerRef.current = null;
            }, LONG_PRESS_MS);
        },
        [callback, dotIndex],
    );

    const onTouchMove = useCallback(
        (e) => {
            if (!timerRef.current) return;
            const touch = e.touches[0];
            const dx = touch.clientX - startPos.current.x;
            const dy = touch.clientY - startPos.current.y;
            if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
                clear();
            }
        },
        [clear],
    );

    const onTouchEnd = useCallback(() => clear(), [clear]);
    const onTouchCancel = useCallback(() => clear(), [clear]);

    return { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel };
}
