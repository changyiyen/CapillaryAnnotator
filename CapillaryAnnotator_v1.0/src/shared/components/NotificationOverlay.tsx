import React, { useEffect } from 'react';

interface NotificationOverlayProps {
    message: string | null;
    onDismiss: () => void;
}

export const NotificationOverlay: React.FC<NotificationOverlayProps> = ({ message, onDismiss }) => {
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => {
                onDismiss();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [message, onDismiss]);

    if (!message) return null;

    return (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in">
            <div className="bg-gray-900 bg-opacity-90 text-white px-6 py-3 rounded-lg shadow-lg border border-gray-700">
                <p className="text-sm font-medium whitespace-nowrap">{message}</p>
            </div>
        </div>
    );
};
