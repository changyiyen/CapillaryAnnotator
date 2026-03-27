import { useEffect, useRef } from 'react';

interface ShortcutHandlers {
    onPreviousImage: () => void;
    onNextImage: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onPreviousTool: () => void;
    onNextTool: () => void;
    onToggleRuler: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

/**
 * Custom hook to manage keyboard shortcuts for the application.
 * Stabilizes the event listener and avoids stale closures.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
    const handlersRef = useRef(handlers);

    // Keep the handlers Ref up-to-date with every render
    useEffect(() => {
        handlersRef.current = handlers;
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if user is typing in an input or textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const key = e.key.toLowerCase();
            const h = handlersRef.current;

            switch (key) {
                case 'w':
                    e.preventDefault();
                    h.onPreviousImage();
                    break;
                case 's':
                    e.preventDefault();
                    h.onNextImage();
                    break;
                case 'z':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        if (e.shiftKey) {
                            h.onRedo();
                        } else {
                            h.onUndo();
                        }
                    }
                    break;
                case 'a':
                    e.preventDefault();
                    h.onPreviousTool();
                    break;
                case 'd':
                    e.preventDefault();
                    h.onNextTool();
                    break;
                case 'e':
                    e.preventDefault();
                    h.onToggleRuler();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []); // Only attach once
}
