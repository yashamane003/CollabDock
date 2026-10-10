import React, { useState, useEffect, useRef } from 'react';
import {
    Send, UserPlus, X, Search, Hash, Users, Info, Smile, CheckCheck
} from 'lucide-react';
import axios from 'axios';

const quickEmojis = ['👍', '❤️', '🚀', '😂', '🎉', '🔥', '👀'];

const Chat = ({ activeChat, socket, isConnected, onlineUserIds = [] }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [userInfo, setUserInfo] = useState(null);
    const [roomId, setRoomId] = useState('general');
    const [typingUsers, setTypingUsers] = useState(new Set());
    const [isTyping, setIsTyping] = useState(false);
    const [showInfoPanel, setShowInfoPanel] = useState(false);

    // Group Member Invite State
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteSearch, setInviteSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [inviteLoading, setInviteLoading] = useState(false);

    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    // Load logged in user with safe parsing
    useEffect(() => {
        try {
            const raw = localStorage.getItem('userInfo');
            if (raw) {
                setUserInfo(JSON.parse(raw));
            }
        } catch {
            setUserInfo(null);
        }
    }, []);

    // Determine Room ID based on activeChat safely
    useEffect(() => {
        if (!activeChat) return;

        let calculatedRoomId = 'general';
        if (activeChat.type === 'room') {
            calculatedRoomId = activeChat.id || 'general';
        } else if (activeChat.type === 'group') {
            calculatedRoomId = (activeChat.id || activeChat._id || 'general').toString();
        } else if (activeChat.type === 'dm') {
            const myId = (userInfo?._id || userInfo?.id || '').toString();
            const otherId = (activeChat.id || activeChat._id || '').toString();
            if (myId && otherId) {
                calculatedRoomId = [myId, otherId].sort().join('_');
            } else {
                calculatedRoomId = otherId || 'general';
            }
        }
        setRoomId(calculatedRoomId);
        setTypingUsers(new Set());
    }, [activeChat, userInfo]);

    // Fetch messages for current room & manage socket room subscription
    useEffect(() => {
        if (!roomId || !userInfo?.token) return;

        // Fetch message history
        const fetchMessages = async () => {
            try {
                const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
                const res = await axios.get(`http://localhost:5000/api/messages/${roomId}`, config);
                setMessages(Array.isArray(res?.data) ? res.data : []);
            } catch (error) {
                console.error('Failed to fetch messages:', error);
                setMessages([]);
            }
        };

        fetchMessages();

        if (socket && isConnected) {
            socket.emit('join_room', roomId);
        }

        return () => {
            if (socket) {
                socket.emit('leave_room', roomId);
            }
        };
    }, [roomId, userInfo?.token, socket, isConnected]);

    // Socket Event Listeners (receive_message, typing, stop_typing)
    useEffect(() => {
        if (!socket) return;

        const handleReceiveMessage = (msg) => {
            if (msg && msg.roomId === roomId) {
                setMessages((prev) => Array.isArray(prev) ? [...prev, msg] : [msg]);
            }
        };

        const handleUserTyping = (data) => {
            if (data && data.roomId === roomId && data.userName) {
                setTypingUsers((prev) => new Set(prev).add(data.userName));
            }
        };

        const handleUserStopTyping = (data) => {
            if (data && data.roomId === roomId && data.userName) {
                setTypingUsers((prev) => {
                    const next = new Set(prev);
                    next.delete(data.userName);
                    return next;
                });
            }
        };

        socket.on('receive_message', handleReceiveMessage);
        socket.on('user_typing', handleUserTyping);
        socket.on('user_stop_typing', handleUserStopTyping);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('user_typing', handleUserTyping);
            socket.off('user_stop_typing', handleUserStopTyping);
        };
    }, [socket, roomId]);

    // Auto-scroll on new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typingUsers]);

    // Typing emission handler
    const handleInputChange = (e) => {
        setNewMessage(e.target.value);

        if (!socket || !userInfo) return;

        const myName = userInfo.name || userInfo.username || 'User';

        if (!isTyping) {
            setIsTyping(true);
            socket.emit('typing', { roomId, userName: myName });
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
            socket.emit('stop_typing', { roomId, userName: myName });
        }, 1500);
    };

    // Send Message
    const handleSendMessage = (e) => {
        if (e) e.preventDefault();
        const trimmed = newMessage.trim();
        if (!trimmed || !userInfo) return;

        const myId = (userInfo._id || userInfo.id || '').toString();
        const myName = userInfo.name || userInfo.username || 'User';

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        setIsTyping(false);
        if (socket) {
            socket.emit('stop_typing', { roomId, userName: myName });
        }

        const msgPayload = {
            roomId,
            sender: myId,
            senderName: myName,
            content: trimmed,
            timestamp: new Date().toISOString(),
        };

        if (socket && isConnected) {
            socket.emit('send_message', msgPayload);
        }

        // Optimistic UI update
        setMessages((prev) => [...(Array.isArray(prev) ? prev : []), { ...msgPayload, _id: 'temp_' + Date.now() }]);
        setNewMessage('');
    };

    // Handle Quick Emoji insert
    const insertEmoji = (emoji) => {
        setNewMessage((prev) => prev + emoji);
    };

    // Search users to invite to group
    useEffect(() => {
        if (!showInviteModal || !inviteSearch.trim() || !userInfo?.token) {
            setSearchResults([]);
            return;
        }

        const timeout = setTimeout(async () => {
            setInviteLoading(true);
            try {
                const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
                const res = await axios.get(
                    `http://localhost:5000/api/users?search=${encodeURIComponent(inviteSearch)}`,
                    config
                );
                setSearchResults(Array.isArray(res?.data) ? res.data : []);
            } catch (err) {
                console.error(err);
            } finally {
                setInviteLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeout);
    }, [inviteSearch, showInviteModal, userInfo?.token]);

    const handleInviteUser = async (userId) => {
        try {
            const config = { headers: { Authorization: `Bearer ${userInfo.token}` } };
            const groupId = activeChat?.id || activeChat?._id;
            await axios.put(`http://localhost:5000/api/groups/${groupId}/add`, { userId }, config);
            alert('User successfully added to group!');
            setShowInviteModal(false);
            setInviteSearch('');
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || 'Failed to add user');
        }
    };

    const formatMessageTime = (isoString) => {
        if (!isoString) return '';
        try {
            const date = new Date(isoString);
            return isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {
            return '';
        }
    };

    const currentUserId = (userInfo?._id || userInfo?.id || '').toString();
    const groupHostId = (activeChat?.host?._id || activeChat?.host?.id || activeChat?.host || '').toString();
    const isHost = activeChat?.type === 'group' && currentUserId && (groupHostId === currentUserId);

    const safeOnlineIds = Array.isArray(onlineUserIds) ? onlineUserIds.map(String) : [];
    const dmUserId = (activeChat?.id || activeChat?._id || '').toString();
    const isDMOnline = activeChat?.type === 'dm' && dmUserId && safeOnlineIds.includes(dmUserId);

    const safeMessages = Array.isArray(messages) ? messages : [];

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 transition-colors relative">
            {/* 1. Chat Header */}
            <div className="h-16 px-4 sm:px-6 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex items-center justify-between z-20">
                <div className="flex items-center space-x-3 min-w-0">
                    {/* Chat Icon / Avatar */}
                    {activeChat?.type === 'room' && (
                        <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm shadow-xs">
                            <Hash className="w-5 h-5" />
                        </div>
                    )}
                    {activeChat?.type === 'group' && (
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 flex items-center justify-center font-bold text-sm shadow-xs">
                            <Users className="w-5 h-5" />
                        </div>
                    )}
                    {activeChat?.type === 'dm' && (
                        <div className="relative">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                                {activeChat?.name ? activeChat.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <span
                                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${isDMOnline ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                                    }`}
                            />
                        </div>
                    )}

                    {/* Chat Name & Subtitle */}
                    <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                                {activeChat?.type === 'room' ? `#${activeChat.name}` : activeChat?.name || 'Conversation'}
                            </h2>
                            {activeChat?.type === 'group' && (
                                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 px-2 py-0.5 rounded-full font-medium">
                                    Group
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {activeChat?.type === 'room' && (activeChat.description || 'Public Channel')}
                            {activeChat?.type === 'group' && (activeChat.description || 'Group Conversation')}
                            {activeChat?.type === 'dm' && (isDMOnline ? 'Active Now' : 'Offline')}
                        </p>
                    </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center space-x-2">
                    {/* Invite Button for Group Host */}
                    {activeChat?.type === 'group' && isHost && (
                        <button
                            onClick={() => setShowInviteModal(true)}
                            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors shadow-xs"
                            title="Invite members"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Add Member</span>
                        </button>
                    )}

                    {/* Info Drawer Toggle */}
                    <button
                        onClick={() => setShowInfoPanel(!showInfoPanel)}
                        className={`p-2 rounded-lg transition-colors ${showInfoPanel
                            ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300'
                            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        title="Chat Info"
                    >
                        <Info className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Main Stage with Messages and Optional Info Panel */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* 2. Messages List Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3.5">
                        {safeMessages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-500 mb-3">
                                    <Hash className="w-7 h-7" />
                                </div>
                                <h3 className="text-base font-bold text-gray-700 dark:text-gray-300">
                                    No messages yet
                                </h3>
                                <p className="text-xs text-gray-400 max-w-xs mt-1">
                                    Start the conversation! Send a message below to say hello.
                                </p>
                            </div>
                        ) : (
                            safeMessages.map((msg, index) => {
                                const msgSenderId = (msg.sender?._id || msg.sender?.id || msg.sender || '').toString();
                                const isMe = Boolean(currentUserId && msgSenderId && currentUserId === msgSenderId);
                                const displayName = msg.senderName || 'Anonymous';
                                const senderInitial = displayName.charAt(0).toUpperCase() || '?';

                                return (
                                    <div
                                        key={msg._id || index}
                                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                                    >
                                        {!isMe && (
                                            <div className="flex items-center space-x-1.5 mb-1 px-1">
                                                <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                                                    {senderInitial}
                                                </div>
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                                    {displayName}
                                                </span>
                                                {activeChat?.type === 'group' && groupHostId && groupHostId === msgSenderId && (
                                                    <span className="text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full font-medium">
                                                        Host
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-gray-400">
                                                    {formatMessageTime(msg.timestamp || msg.createdAt)}
                                                </span>
                                            </div>
                                        )}

                                        <div
                                            className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed break-words shadow-xs ${isMe
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-tr-xs'
                                                : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-tl-xs border border-gray-100 dark:border-gray-700/60'
                                                }`}
                                        >
                                            {msg.content}
                                        </div>

                                        {isMe && (
                                            <div className="flex items-center space-x-1 mt-1 px-1 text-[10px] text-gray-400">
                                                <span>{formatMessageTime(msg.timestamp || msg.createdAt)}</span>
                                                <CheckCheck className="w-3 h-3 text-blue-500" />
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}

                        {/* Live Typing Indicator */}
                        {typingUsers.size > 0 && (
                            <div className="flex items-center space-x-2 text-xs text-gray-400 italic px-2 py-1">
                                <div className="flex space-x-1 items-center bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                                    <span className="text-gray-500 dark:text-gray-400 font-medium">
                                        {Array.from(typingUsers).join(', ')} {typingUsers.size === 1 ? 'is' : 'are'} typing
                                    </span>
                                    <span className="typing-dot bg-blue-500 ml-1" />
                                    <span className="typing-dot bg-blue-500" />
                                    <span className="typing-dot bg-blue-500" />
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Reactions Bar */}
                    <div className="px-4 sm:px-6 pt-1 flex items-center space-x-1.5">
                        <span className="text-[10px] text-gray-400 font-medium flex items-center mr-1">
                            <Smile className="w-3 h-3 mr-1" /> Quick:
                        </span>
                        {quickEmojis.map((emoji) => (
                            <button
                                key={emoji}
                                type="button"
                                onClick={() => insertEmoji(emoji)}
                                className="text-xs hover:scale-125 transition-transform p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>

                    {/* 3. Message Input Area */}
                    <div className="p-3 sm:p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
                        <form
                            onSubmit={handleSendMessage}
                            className="flex items-center space-x-2 bg-gray-50 dark:bg-gray-800/80 rounded-2xl p-1.5 border border-gray-200 dark:border-gray-700/60 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all"
                        >
                            <input
                                type="text"
                                value={newMessage}
                                onChange={handleInputChange}
                                placeholder={
                                    activeChat?.type === 'room'
                                        ? `Message #${activeChat?.name || 'room'}...`
                                        : `Message ${activeChat?.name || 'chat'}...`
                                }
                                className="flex-1 bg-transparent px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
                                autoFocus
                            />

                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-sm shadow-blue-500/20 flex-shrink-0"
                                aria-label="Send Message"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                </div>

                {/* 4. Chat Info Slide-over Panel */}
                {showInfoPanel && (
                    <div className="w-72 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 overflow-y-auto z-10 flex flex-col">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 mb-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                                Details
                            </h3>
                            <button
                                onClick={() => setShowInfoPanel(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="text-center mb-6">
                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 mx-auto flex items-center justify-center text-white font-bold text-xl shadow-md shadow-blue-500/20 mb-2">
                                {activeChat?.name ? activeChat.name.charAt(0).toUpperCase() : '#'}
                            </div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                                {activeChat?.name}
                            </h4>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {activeChat?.description || (activeChat?.type === 'room' ? 'Community Channel' : 'Active Conversation')}
                            </p>
                        </div>

                        {activeChat?.type === 'group' && (
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                                        Members ({Array.isArray(activeChat.members) ? activeChat.members.length : 1})
                                    </span>
                                    <div className="mt-2 space-y-1">
                                        {(Array.isArray(activeChat.members) ? activeChat.members : []).map((member, i) => {
                                            const memberId = (member?._id || member?.id || member || '').toString();
                                            const memberName = member?.name || member?.username || 'Member';
                                            const isOnline = memberId ? safeOnlineIds.includes(memberId) : false;
                                            return (
                                                <div
                                                    key={memberId || i}
                                                    className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-xs"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white font-bold text-[10px] flex items-center justify-center">
                                                            {memberName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="font-medium text-gray-800 dark:text-gray-200">
                                                            {memberName}
                                                        </span>
                                                    </div>
                                                    <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {isHost && (
                                    <button
                                        onClick={() => setShowInviteModal(true)}
                                        className="w-full py-2 px-3 text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center space-x-1.5"
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                        <span>Invite User to Group</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 5. Invite User Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700 mb-3">
                            <h3 className="text-sm font-bold text-gray-800 dark:text-white">
                                Add People to Group
                            </h3>
                            <button
                                onClick={() => setShowInviteModal(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="relative mb-3">
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={inviteSearch}
                                onChange={(e) => setInviteSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                autoFocus
                            />
                            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                        </div>

                        <div className="max-h-56 overflow-y-auto space-y-1">
                            {inviteLoading ? (
                                <p className="text-xs text-center text-gray-400 py-3">Searching...</p>
                            ) : searchResults.length > 0 ? (
                                searchResults.map((user) => (
                                    <button
                                        key={user._id || user.id}
                                        onClick={() => handleInviteUser(user._id || user.id)}
                                        className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/60 rounded-xl flex items-center justify-between transition-colors"
                                    >
                                        <div className="flex items-center space-x-2.5 min-w-0">
                                            <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-bold text-xs flex items-center justify-center">
                                                {(user.name || user.username || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                                                    {user.name || user.username || user.email}
                                                </p>
                                                <p className="text-[10px] text-gray-400 truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[11px] font-semibold text-blue-600 hover:underline">
                                            Add
                                        </span>
                                    </button>
                                ))
                            ) : (
                                inviteSearch && (
                                    <p className="text-xs text-center text-gray-400 py-3">
                                        No matching users found
                                    </p>
                                )
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;
