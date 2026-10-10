import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Navbar from '../components/Navbar';
import ChatList from '../components/chat/ChatList';
import Chat from '../components/chat/Chat';
import NotificationBanner from '../components/common/NotificationBanner';

const ENDPOINT = 'http://localhost:5000';

const getDefaultChat = () => ({
    type: 'room',
    id: 'general',
    name: 'general',
    description: 'Main community hub'
});

const getRoomIdForChat = (chat, myId) => {
    if (!chat) return 'general';
    if (chat.type === 'room') return chat.id || 'general';
    if (chat.type === 'group') return (chat.id || chat._id || 'general').toString();
    if (chat.type === 'dm') {
        const otherId = (chat.id || chat._id || '').toString();
        if (myId && otherId) {
            return [myId.toString(), otherId].sort().join('_');
        }
        return otherId || 'general';
    }
    return (chat.id || chat._id || 'general').toString();
};

const Dashboard = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUserIds, setOnlineUserIds] = useState([]);
    const [unreadCounts, setUnreadCounts] = useState({});
    const [notifications, setNotifications] = useState([]);
    const [activeBannerNotification, setActiveBannerNotification] = useState(null);

    const socketRef = useRef(null);
    const activeChatRef = useRef(null);

    // Safe retrieval of currentUser
    const [currentUser, setCurrentUser] = useState(() => {
        try {
            const raw = localStorage.getItem('userInfo');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    // Safe retrieval of activeChat
    const [activeChat, setActiveChat] = useState(() => {
        try {
            const savedChat = localStorage.getItem('activeChat');
            if (savedChat) {
                const parsed = JSON.parse(savedChat);
                if (parsed && (parsed.id || parsed._id)) return parsed;
            }
        } catch {
            // fallback
        }
        return getDefaultChat();
    });

    // Keep activeChatRef synced
    useEffect(() => {
        activeChatRef.current = activeChat;
    }, [activeChat]);

    // Protect route: Redirect to /login if not authenticated
    useEffect(() => {
        if (!currentUser || !currentUser.token) {
            navigate('/login');
        }
    }, [currentUser, navigate]);

    // Persist activeChat
    useEffect(() => {
        if (activeChat) {
            try {
                localStorage.setItem('activeChat', JSON.stringify(activeChat));
            } catch {
                // ignore
            }
        }
    }, [activeChat]);

    // Initialize Socket.io connection and notification handling
    useEffect(() => {
        if (!currentUser?.token) return;

        const socket = io(ENDPOINT, {
            transports: ['websocket', 'polling'],
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('setup', currentUser);
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        socket.on('online_users', (userIds) => {
            setOnlineUserIds(Array.isArray(userIds) ? userIds : []);
        });

        // Incoming message handler for notifications and unread badges
        socket.on('receive_message', (msg) => {
            if (!msg || !msg.roomId) return;

            const currentUserId = (currentUser?._id || currentUser?.id || '').toString();
            const senderId = (msg.sender || '').toString();

            // Do not notify user about their own messages
            if (senderId && senderId === currentUserId) return;

            const currentActiveRoom = getRoomIdForChat(activeChatRef.current, currentUserId);

            // If the user is currently viewing this exact chat, no notification banner needed
            if (msg.roomId === currentActiveRoom) return;

            // Increment unread count for the sender / room
            setUnreadCounts((prev) => {
                const next = { ...prev };
                next[msg.roomId] = (next[msg.roomId] || 0) + 1;
                return next;
            });

            // Format notification item
            const notifItem = {
                id: msg._id || 'notif_' + Date.now(),
                senderName: msg.senderName || 'Someone',
                senderId: msg.sender,
                content: msg.content,
                roomId: msg.roomId,
                timestamp: msg.timestamp || new Date().toISOString(),
            };

            // Prepend to notification list (max 20)
            setNotifications((prev) => [
                notifItem,
                ...prev.filter((n) => n.id !== notifItem.id).slice(0, 19),
            ]);

            // Show top in-app notification banner
            setActiveBannerNotification(notifItem);
        });

        return () => {
            socket.disconnect();
        };
    }, [currentUser?.token]);

    const handleSelectChat = (chat) => {
        if (!chat) return;
        setActiveChat(chat);
        setIsSidebarOpen(false); // Auto close sidebar on mobile

        // Clear unread count for this selected chat
        const myId = (currentUser?._id || currentUser?.id || '').toString();
        const targetRoomId = getRoomIdForChat(chat, myId);
        const chatId = (chat.id || chat._id || '').toString();

        setUnreadCounts((prev) => {
            if (!prev[targetRoomId] && !prev[chatId]) return prev;
            const next = { ...prev };
            delete next[targetRoomId];
            delete next[chatId];
            return next;
        });

        // Dismiss active banner if it belongs to this room
        setActiveBannerNotification((prev) => {
            if (prev && (prev.roomId === targetRoomId || prev.senderId === chatId)) {
                return null;
            }
            return prev;
        });
    };

    const handleOpenNotification = (notif) => {
        if (!notif) return;
        const roomId = notif.roomId || '';
        const myId = (currentUser?._id || currentUser?.id || '').toString();

        let targetChat = null;
        if (['general', 'random', 'announcements', 'tech-talk'].includes(roomId)) {
            targetChat = {
                type: 'room',
                id: roomId,
                name: roomId,
                description: 'Community channel',
            };
        } else if (roomId.includes('_')) {
            const participants = roomId.split('_');
            const otherUserId = participants.find((id) => id !== myId) || notif.senderId;
            targetChat = {
                type: 'dm',
                id: otherUserId,
                name: notif.senderName || 'Direct Message',
            };
        } else {
            targetChat = {
                type: 'group',
                id: roomId,
                name: notif.senderName ? `${notif.senderName}'s Group` : 'Group Chat',
            };
        }

        handleSelectChat(targetChat);
    };

    const totalUnreadCount = Object.values(unreadCounts).reduce((acc, c) => acc + (c || 0), 0);

    if (!currentUser || !currentUser.token) {
        return null;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden relative">
            {/* Top In-App Notification Toast Banner */}
            <NotificationBanner
                notification={activeBannerNotification}
                onOpenChat={handleOpenNotification}
                onDismiss={() => setActiveBannerNotification(null)}
            />

            {/* Top Navigation */}
            <Navbar
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                isConnected={isConnected}
                totalUnreadCount={totalUnreadCount}
                notifications={notifications}
                onOpenNotification={handleOpenNotification}
                onClearNotifications={() => setNotifications([])}
            />

            {/* Main Application Body */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Mobile Backdrop Overlay */}
                {isSidebarOpen && (
                    <div
                        className="fixed inset-0 z-30 bg-black/40 backdrop-blur-xs md:hidden transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Left Sidebar - Desktop */}
                <div className="hidden md:flex flex-col w-80 lg:w-88 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 h-full">
                    <ChatList
                        activeChat={activeChat}
                        onSelectChat={handleSelectChat}
                        onlineUserIds={onlineUserIds}
                        unreadCounts={unreadCounts}
                    />
                </div>

                {/* Left Sidebar - Mobile Drawer */}
                <div
                    className={`fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] bg-white dark:bg-gray-900 md:hidden shadow-2xl transform transition-transform duration-200 ease-in-out flex flex-col ${
                        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                >
                    <ChatList
                        activeChat={activeChat}
                        onSelectChat={handleSelectChat}
                        onlineUserIds={onlineUserIds}
                        unreadCounts={unreadCounts}
                    />
                </div>

                {/* Center / Right Chat View */}
                <div className="flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-gray-900">
                    <Chat
                        activeChat={activeChat}
                        socket={socketRef.current}
                        isConnected={isConnected}
                        onlineUserIds={onlineUserIds}
                    />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
