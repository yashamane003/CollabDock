import React, { useState, useEffect } from 'react';
import { Users, Hash, Search, Plus, X } from 'lucide-react';
import axios from 'axios';

const ChatList = ({ activeChat, onSelectChat, onlineUserIds = [] }) => {
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'channels', 'groups', 'dms'
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);

    // Create Group State
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [creatingGroup, setCreatingGroup] = useState(false);

    // Public Channels
    const publicChannels = [
        { id: 'general', name: 'general', desc: 'Main community hub' },
        { id: 'random', name: 'random', desc: 'Casual off-topic banter' },
        { id: 'announcements', name: 'announcements', desc: 'Important project updates' },
        { id: 'tech-talk', name: 'tech-talk', desc: 'Engineering & architecture' },
    ];

    let currentUser = {};
    try {
        const raw = localStorage.getItem('userInfo');
        currentUser = raw ? JSON.parse(raw) : {};
    } catch {
        currentUser = {};
    }

    const fetchData = async () => {
        if (!currentUser?.token) return;
        setLoading(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${currentUser.token}` },
            };

            const [usersRes, groupsRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/users?search=${encodeURIComponent(search || '')}`, config),
                axios.get('http://localhost:5000/api/groups', config),
            ]);

            setUsers(Array.isArray(usersRes?.data) ? usersRes.data : []);
            setGroups(Array.isArray(groupsRes?.data) ? groupsRes.data : []);
        } catch (error) {
            console.error('Failed to fetch chats:', error);
            setUsers([]);
            setGroups([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [search]);

    const handleCreateGroup = async (e) => {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        setCreatingGroup(true);
        try {
            const config = {
                headers: { Authorization: `Bearer ${currentUser.token}` },
            };

            const { data } = await axios.post(
                'http://localhost:5000/api/groups',
                { name: newGroupName.trim(), description: newGroupDesc.trim() },
                config
            );

            if (data && data._id) {
                setGroups((prev) => [data, ...prev]);
                setNewGroupName('');
                setNewGroupDesc('');
                setShowCreateGroup(false);

                onSelectChat({
                    type: 'group',
                    id: data._id,
                    name: data.name,
                    description: data.description,
                    host: data.host?._id || data.host,
                    members: Array.isArray(data.members) ? data.members : [],
                });
            }
        } catch (error) {
            console.error('Error creating group:', error);
            alert(error.response?.data?.message || 'Failed to create group');
        } finally {
            setCreatingGroup(false);
        }
    };

    const isChatActive = (type, id) => {
        if (!activeChat || !id) return false;
        const currentActiveId = activeChat.id || activeChat._id;
        return activeChat.type === type && currentActiveId?.toString() === id?.toString();
    };

    const safeSearch = (search || '').toLowerCase().trim();

    // Safe filtered lists
    const filteredChannels = publicChannels.filter(c => {
        const name = (c.name || '').toLowerCase();
        const desc = (c.desc || '').toLowerCase();
        return name.includes(safeSearch) || desc.includes(safeSearch);
    });

    const filteredGroups = (Array.isArray(groups) ? groups : []).filter(g => {
        const name = (g.name || '').toLowerCase();
        return name.includes(safeSearch);
    });

    const filteredUsers = (Array.isArray(users) ? users : []).filter(u => {
        const name = (u.name || u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return name.includes(safeSearch) || email.includes(safeSearch);
    });

    const safeOnlineIds = Array.isArray(onlineUserIds) ? onlineUserIds.map(String) : [];

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors select-none">
            {/* Search Header */}
            <div className="p-3.5 border-b border-gray-200 dark:border-gray-800">
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search chats or users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-transparent focus:border-blue-500/50 focus:bg-white dark:focus:bg-gray-900 focus:outline-none transition-all placeholder:text-gray-400"
                    />
                    <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-gray-400" />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 mt-2.5 overflow-x-auto no-scrollbar pb-0.5">
                    {[
                        { id: 'all', label: 'All' },
                        { id: 'channels', label: 'Channels' },
                        { id: 'groups', label: 'Groups' },
                        { id: 'dms', label: 'Direct Messages' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chats List Area */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
                {/* 1. Public Channels */}
                {(activeTab === 'all' || activeTab === 'channels') && (
                    <div>
                        <div className="flex items-center justify-between px-2 mb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Channels
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                {filteredChannels.length}
                            </span>
                        </div>
                        <div className="space-y-0.5">
                            {filteredChannels.map((channel) => {
                                const active = isChatActive('room', channel.id);
                                return (
                                    <button
                                        key={channel.id}
                                        onClick={() =>
                                            onSelectChat({
                                                type: 'room',
                                                id: channel.id,
                                                name: channel.name,
                                                description: channel.desc,
                                            })
                                        }
                                        className={`w-full flex items-center px-2.5 py-2 rounded-xl text-left transition-all ${active
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium shadow-sm border border-blue-200/50 dark:border-blue-800/50'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                                            }`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-2.5 transition-colors ${active
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                            }`}>
                                            <Hash className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-semibold truncate leading-tight">
                                                #{channel.name}
                                            </p>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-tight">
                                                {channel.desc}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 2. Collaborative Groups */}
                {(activeTab === 'all' || activeTab === 'groups') && (
                    <div>
                        <div className="flex items-center justify-between px-2 mb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Groups
                            </span>
                            <button
                                onClick={() => setShowCreateGroup(true)}
                                className="flex items-center text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-0.5 rounded transition-colors"
                                title="Create Group"
                            >
                                <Plus className="w-3.5 h-3.5 mr-0.5" />
                                New
                            </button>
                        </div>

                        <div className="space-y-0.5">
                            {filteredGroups.map((group) => {
                                const groupId = group._id || group.id;
                                const active = isChatActive('group', groupId);
                                const memberCount = Array.isArray(group.members) ? group.members.length : 1;
                                return (
                                    <button
                                        key={groupId}
                                        onClick={() =>
                                            onSelectChat({
                                                type: 'group',
                                                id: groupId,
                                                name: group.name || 'Group',
                                                description: group.description,
                                                host: group.host?._id || group.host,
                                                members: Array.isArray(group.members) ? group.members : [],
                                            })
                                        }
                                        className={`w-full flex items-center px-2.5 py-2 rounded-xl text-left transition-all ${active
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium shadow-sm border border-blue-200/50 dark:border-blue-800/50'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                                            }`}
                                    >
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center mr-2.5 transition-colors ${active
                                            ? 'bg-indigo-600 text-white'
                                            : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                            }`}>
                                            <Users className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold truncate leading-tight">
                                                    {group.name || 'Group'}
                                                </p>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-normal">
                                                    {memberCount} members
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-tight">
                                                {group.description || 'Group conversation'}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredGroups.length === 0 && (
                                <div className="px-2.5 py-3 text-center bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-[11px] text-gray-400">
                                    No groups yet.{' '}
                                    <button
                                        onClick={() => setShowCreateGroup(true)}
                                        className="text-blue-500 underline font-medium"
                                    >
                                        Create one
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 3. Direct Messages */}
                {(activeTab === 'all' || activeTab === 'dms') && (
                    <div>
                        <div className="flex items-center justify-between px-2 mb-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                Direct Messages
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                {filteredUsers.length}
                            </span>
                        </div>

                        <div className="space-y-0.5">
                            {filteredUsers.map((user) => {
                                const userId = (user._id || user.id || '').toString();
                                const active = isChatActive('dm', userId);
                                const isOnline = safeOnlineIds.includes(userId);
                                const displayName = user.name || user.username || user.email?.split('@')[0] || 'User';
                                const initial = displayName.charAt(0).toUpperCase() || '?';

                                return (
                                    <button
                                        key={userId || user.email}
                                        onClick={() =>
                                            onSelectChat({
                                                type: 'dm',
                                                id: userId,
                                                name: displayName,
                                                email: user.email,
                                            })
                                        }
                                        className={`w-full flex items-center px-2.5 py-2 rounded-xl text-left transition-all ${active
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium shadow-sm border border-blue-200/50 dark:border-blue-800/50'
                                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                                            }`}
                                    >
                                        <div className="relative mr-2.5 flex-shrink-0">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                {initial}
                                            </div>
                                            <span
                                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-900 ${isOnline ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                                                    }`}
                                                title={isOnline ? 'Online' : 'Offline'}
                                            />
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold truncate leading-tight">
                                                    {displayName}
                                                </p>
                                                <span
                                                    className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${isOnline
                                                        ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60'
                                                        : 'text-gray-400 dark:text-gray-500'
                                                        }`}
                                                >
                                                    {isOnline ? 'Online' : 'Offline'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate leading-tight">
                                                {user.email || ''}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                            {filteredUsers.length === 0 && !loading && (
                                <div className="px-2.5 py-3 text-center text-[11px] text-gray-400 italic">
                                    No users found
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Create Group Modal */}
            {showCreateGroup && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-5 border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-700 mb-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Users className="w-4 h-4" />
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                                    Create New Group
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowCreateGroup(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateGroup} className="space-y-3.5">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Group Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Project Alpha, Designers"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                    className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                                    Topic / Description
                                </label>
                                <textarea
                                    rows="2"
                                    placeholder="What is this group about?"
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                    className="w-full text-xs px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none"
                                />
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateGroup(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newGroupName.trim() || creatingGroup}
                                    className="px-4 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors shadow-sm shadow-blue-500/20"
                                >
                                    {creatingGroup ? 'Creating...' : 'Create Group'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatList;
