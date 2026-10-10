import React, { useEffect, useState } from 'react';
import { Moon, Sun, LogOut, Menu, MessageSquare, ShieldCheck, Bell, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Navbar = ({
    toggleSidebar,
    isConnected = true,
    totalUnreadCount = 0,
    notifications = [],
    onOpenNotification,
    onClearNotifications,
}) => {
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [userInitials, setUserInitials] = useState('U');
    const [userInfo, setUserInfo] = useState(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        try {
            const raw = localStorage.getItem('userInfo');
            const stored = raw ? JSON.parse(raw) : null;
            if (stored) {
                setUserInfo(stored);
                const displayName = stored.name || stored.username || (stored.email ? stored.email.split('@')[0] : 'User');
                const initials = displayName
                    .split(' ')
                    .map(n => (n && n[0]) ? n[0] : '')
                    .join('')
                    .toUpperCase()
                    .substring(0, 2);
                setUserInitials(initials || 'U');
            }
        } catch {
            setUserInfo(null);
        }
    }, []);

    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };

    const handleLogout = () => {
        localStorage.removeItem('userInfo');
        localStorage.removeItem('activeChat');
        navigate('/login');
    };

    const displayName = userInfo?.name || userInfo?.username || (userInfo?.email ? userInfo.email.split('@')[0] : 'User');

    return (
        <nav className="h-16 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4 sm:px-6 z-40 transition-colors">
            {/* Left - Mobile Menu Toggle & Brand */}
            <div className="flex items-center space-x-3">
                <button
                    onClick={toggleSidebar}
                    className="p-2 md:hidden text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    aria-label="Toggle Navigation"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <div className="flex items-center space-x-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent leading-none">
                                PulseChat
                            </span>
                            <span className="hidden sm:inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                                Real-Time
                            </span>
                        </div>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">
                            Live Messaging Platform
                        </p>
                    </div>
                </div>
            </div>

            {/* Right - Live Status, Notifications, Theme Toggle & User Profile */}
            <div className="flex items-center space-x-2 sm:space-x-3">
                {/* Connection Status Badge */}
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
                    <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                    <span className="text-gray-600 dark:text-gray-300 font-medium hidden sm:inline">
                        {isConnected ? 'Connected' : 'Connecting'}
                    </span>
                </div>

                {/* Notifications Bell Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                        className={`relative p-2 rounded-lg transition-colors ${
                            isNotificationOpen
                                ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                        title="Notifications"
                    >
                        <Bell className="w-5 h-5" />
                        {totalUnreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-600 text-[10px] font-extrabold text-white shadow-xs animate-bounce">
                                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                            </span>
                        )}
                    </button>

                    {isNotificationOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsNotificationOpen(false)}
                            />
                            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden transform transition-all animate-in fade-in duration-150">
                                <div className="p-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/40">
                                    <div className="flex items-center space-x-2">
                                        <Bell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-200">
                                            Notifications
                                        </h3>
                                    </div>
                                    {notifications.length > 0 && (
                                        <button
                                            onClick={() => {
                                                if (onClearNotifications) onClearNotifications();
                                            }}
                                            className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                                        >
                                            Clear All
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700/50">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-gray-400">
                                            <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/70 mb-2" />
                                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                                                All caught up!
                                            </p>
                                            <p className="text-[11px] text-gray-400 mt-0.5">
                                                No new messages from other members.
                                            </p>
                                        </div>
                                    ) : (
                                        notifications.map((notif) => (
                                            <div
                                                key={notif.id}
                                                onClick={() => {
                                                    if (onOpenNotification) onOpenNotification(notif);
                                                    setIsNotificationOpen(false);
                                                }}
                                                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer flex items-start space-x-2.5"
                                            >
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                                                    {(notif.senderName || 'U').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                                                            {notif.senderName}
                                                        </h4>
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                                        {notif.content}
                                                    </p>
                                                    <span className="inline-block text-[9px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
                                                        {notif.roomId?.includes('_') ? 'Direct Message' : `#${notif.roomId}`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Dark/Light Mode Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                >
                    {theme === 'light' ? (
                        <Moon className="w-5 h-5" />
                    ) : (
                        <Sun className="w-5 h-5 text-amber-400" />
                    )}
                </button>

                {/* Profile Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center space-x-2 p-1 pl-1 pr-2 rounded-full border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors focus:outline-none"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                            {userInitials}
                        </div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-200 hidden md:inline max-w-[100px] truncate">
                            {displayName}
                        </span>
                    </button>

                    {isProfileOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setIsProfileOpen(false)}
                            />
                            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 p-4 transform transition-all animate-in fade-in duration-150">
                                <div className="flex items-center space-x-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                        {userInitials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                            {displayName}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {userInfo?.email || 'user@example.com'}
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-3 space-y-1">
                                    <div className="flex items-center px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400">
                                        <ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" />
                                        Authenticated Session
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center px-2 py-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <LogOut className="w-4 h-4 mr-2" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
