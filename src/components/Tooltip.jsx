import { createPortal } from 'react-dom';

export default function Tooltip({ text, x, y }) {
    return createPortal(
        <div
            className="tooltip visible"
            style={{
                left: `${x}px`,
                top: `${y}px`,
                transform: 'translate(-50%, -100%)',
            }}
        >
            {text}
        </div>,
        document.body
    );
}
