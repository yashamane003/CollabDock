import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Navbar from '../components/Navbar';
import ChatList from '../components/chat/ChatList';
import Chat from '../components/chat/Chat';

const ENDPOINT = 'http://localhost:5000';

const getDefaultChat = () => ({
    type: 'room',
    id: 'general',
    name: 'general',
    description: 'Main community hub'
});

const Dashboard = () => {
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [onlineUserIds, setOnlineUserIds] = useState([]);
    const socketRef = useRef(null);

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

    // Initialize Socket.io connection
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

        return () => {
            socket.disconnect();
        };
    }, [currentUser?.token]);

    const handleSelectChat = (chat) => {
        if (chat) {
            setActiveChat(chat);
            setIsSidebarOpen(false); // Auto close sidebar on mobile
        }
    };

    if (!currentUser || !currentUser.token) {
        return null;
    }

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden">
            {/* Top Navigation */}
            <Navbar
                toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                isConnected={isConnected}
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
                    />
                </div>

                {/* Left Sidebar - Mobile Drawer */}
                <div
                    className={`fixed inset-y-0 left-0 z-40 w-80 max-w-[85vw] bg-white dark:bg-gray-900 md:hidden shadow-2xl transform transition-transform duration-200 ease-in-out flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        }`}
                >
                    <ChatList
                        activeChat={activeChat}
                        onSelectChat={handleSelectChat}
                        onlineUserIds={onlineUserIds}
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
