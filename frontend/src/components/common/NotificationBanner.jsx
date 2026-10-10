import React, { useEffect, useState } from 'react';
import { MessageSquare, X, ArrowRight, Bell } from 'lucide-react';

const NotificationBanner = ({ notification, onOpenChat, onDismiss }) => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (notification) {
            setVisible(true);
            const timer = setTimeout(() => {
                setVisible(false);
                setTimeout(onDismiss, 300); // allow exit animation
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification, onDismiss]);

    if (!notification) return null;

    const senderInitial = (notification.senderName || 'U').charAt(0).toUpperCase();

    return (
        <div
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 transition-all duration-300 ease-out ${
                visible ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-6 opacity-0 scale-95'
            }`}
        >
            <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl border border-blue-500/30 dark:border-blue-400/20 ring-4 ring-blue-500/10 flex items-center justify-between gap-3">
                {/* Left - Avatar & Details */}
                <div
                    onClick={() => {
                        onOpenChat(notification);
                        onDismiss();
                    }}
                    className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer group"
                >
                    <div className="relative flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:scale-105 transition-transform">
                            {senderInitial}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-white dark:border-gray-800 animate-ping" />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-white dark:border-gray-800" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                            <h4 className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {notification.senderName}
                            </h4>
                            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                                {notification.chatTitle || (notification.roomId?.includes('_') ? 'Direct Message' : `#${notification.roomId}`)}
                            </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5">
                            {notification.content}
                        </p>
                    </div>
                </div>

                {/* Right - Action Button & Dismiss */}
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                        onClick={() => {
                            onOpenChat(notification);
                            onDismiss();
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors flex items-center space-x-1 shadow-sm"
                    >
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => {
                            setVisible(false);
                            setTimeout(onDismiss, 200);
                        }}
                        className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Close notification"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default NotificationBanner;
