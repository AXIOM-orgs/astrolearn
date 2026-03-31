'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { UserPlus, X, Search, Loader2, Check } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTranslations, useLocale } from 'next-intl';

interface FriendProfile {
    id: string;
    username: string;
    nickname: string | null;
    fullname: string | null;
    avatar_url: string | null;
}

interface InviteFriendsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    roomCode: string;
    sessionId: string;
}

export function InviteFriendsDialog({ isOpen, onClose, roomCode, sessionId }: InviteFriendsDialogProps): React.JSX.Element | null {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [friends, setFriends] = useState<FriendProfile[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [invitingStatus, setInvitingStatus] = useState<Record<string, 'idle' | 'loading' | 'invited'>>({});
    const t = useTranslations('Lobby');
    const locale = useLocale();
    const isArabic = locale === 'ar';

    // Fetch mutual friends from Supabase
    const fetchFriends = useCallback(async () => {
        if (!profile?.id) return;

        setLoadingFriends(true);
        setFetchError(null);

        try {
            // Step 1: Get people the current user follows (requester = me)
            const { data: iFollow, error: iFollowError } = await supabase
                .from('friendships')
                .select('addressee_id')
                .eq('requester_id', profile.id)
                .eq('status', 'accepted');

            if (iFollowError) {
                console.error('Error fetching following:', iFollowError);
                setFetchError(t('gagalMemuat') + ' ' + t('player'));
                return;
            }

            // Step 2: Get people who follow the current user (addressee = me)
            const { data: followMe, error: followMeError } = await supabase
                .from('friendships')
                .select('requester_id')
                .eq('addressee_id', profile.id)
                .eq('status', 'accepted');

            if (followMeError) {
                console.error('Error fetching followers:', followMeError);
                setFetchError(t('gagalMemuat') + ' ' + t('player'));
                return;
            }

            // Step 3: Find mutual friends (intersection - saling follow)
            const iFollowIds = new Set((iFollow || []).map(f => f.addressee_id));
            const followMeIds = new Set((followMe || []).map(f => f.requester_id));
            const mutualFriendIds = [...iFollowIds].filter(id => followMeIds.has(id));

            if (mutualFriendIds.length === 0) {
                setFriends([]);
                return;
            }

            // Step 4: Fetch mutual friend profiles
            const { data: profiles, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, nickname, fullname, avatar_url')
                .in('id', mutualFriendIds);

            if (profilesError) {
                console.error('Error fetching profiles:', profilesError);
                setFetchError(t('gagalMemuat') + ' ' + t('player'));
                return;
            }

            setFriends(profiles || []);
        } catch (err) {
            console.error('Error fetching friends:', err);
            setFetchError(t('gagalMemuat') + ' ' + t('player'));
        } finally {
            setLoadingFriends(false);
        }
    }, [profile?.id]);

    // Fetch friends when dialog opens
    useEffect(() => {
        if (isOpen && profile?.id) {
            fetchFriends();
            setInvitingStatus({});
            setSearchQuery('');
        }
    }, [isOpen, profile?.id, fetchFriends]);

    // Keyboard escape handler
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Get display name for a friend
    const getDisplayName = (friend: FriendProfile): string => {
        return friend.nickname || friend.fullname || friend.username || 'Unknown';
    };

    // Filter friends by search query
    const filteredFriends = friends.filter(f => {
        const displayName = getDisplayName(f);
        const q = searchQuery.toLowerCase();
        return (
            displayName.toLowerCase().includes(q) ||
            f.username.toLowerCase().includes(q)
        );
    });

    // Handle invite action
    const handleInvite = async (friendId: string) => {
        if (!profile?.id) return;

        setInvitingStatus(prev => ({ ...prev, [friendId]: 'loading' }));

        try {
            const hostName = profile.nickname || profile.username || 'Someone';

            // Insert notification with correct schema
            const { error } = await supabase
                .from('notifications')
                .insert({
                    user_id: friendId,
                    actor_id: profile.id,
                    type: 'sessionFriend',
                    entity_type: 'session',
                    entity_id: sessionId,
                    content: JSON.stringify({
                        message: `${hostName} invited you to join a game!`,
                        roomCode: roomCode,
                    }),
                    is_read: false,
                    from_group_id: null,
                });

            if (error) {
                console.error('Failed to send notification:', error.message);
                setInvitingStatus(prev => ({ ...prev, [friendId]: 'idle' }));
                return;
            }

            setInvitingStatus(prev => ({ ...prev, [friendId]: 'invited' }));
            toast(t('invited'), 'success');
        } catch (err) {
            console.error('Error inviting friend:', err);
            setInvitingStatus(prev => ({ ...prev, [friendId]: 'idle' }));
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div className="cyan-dialog-overlay" onClick={handleBackdropClick}>
            {/* Main Dialog Container */}
            <div className="cyan-dialog-content">

                {/* Header */}
                <div className="cyan-dialog-header" dir={isArabic ? 'rtl' : 'ltr'}>
                    <h2 className="cyan-dialog-title">
                        <UserPlus size={28} />
                        {t('inviteFriends')}
                    </h2>
                </div>

                <button
                    onClick={onClose}
                    className="cyan-dialog-close-button"
                    title="Close"
                >
                    <X size={20} />
                </button>

                {/* Body */}
                <div className="flex flex-col z-10">
                    {/* Search Bar */}
                    <div className="cyan-dialog-search-wrapper">
                        <input
                            type="text"
                            placeholder={t('findFriend')}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && setSearchQuery(searchQuery)}
                            className="font-orbitron"
                            dir={isArabic ? 'rtl' : 'ltr'}
                        />
                        <button
                            className="search-icon-btn"
                            onClick={() => setSearchQuery(searchQuery)}
                        >
                            <Search size={18} />
                        </button>
                    </div>

                    <div className="cyan-dialog-list-container">
                        <div className="flex flex-col gap-2 max-h-[320px] overflow-y-auto overflow-x-hidden pr-2 scrollbar-custom">

                            {/* Loading State */}
                            {loadingFriends && (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#00d4ff]">
                                    <Loader2 size={32} className="animate-spin" />
                                    <span className="font-orbitron text-sm tracking-widest uppercase text-white/40">{t('loadingFriends')}</span>
                                </div>
                            )}

                            {/* Error State */}
                            {!loadingFriends && fetchError && (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-red-400">
                                    <X size={32} className="opacity-50" />
                                    <span className="font-orbitron text-sm tracking-widest uppercase">{fetchError}</span>
                                    <button
                                        onClick={fetchFriends}
                                        className="mt-2 px-4 py-1.5 rounded-md font-orbitron text-[0.7rem] font-bold tracking-wider bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
                                    >
                                        {t('retry')}
                                    </button>
                                </div>
                            )}

                            {/* Friends List */}
                            {!loadingFriends && !fetchError && filteredFriends.map(friend => {
                                const status = invitingStatus[friend.id] || 'idle';
                                const displayName = getDisplayName(friend);

                                return (
                                    <div key={friend.id} className="flex items-center justify-between group-card">

                                        <div className="flex items-center gap-3">
                                            {/* Avatar */}
                                            <div className="w-9 h-9 rounded-full border border-[#00d4ff]/30 bg-[#00d4ff]/10 flex items-center justify-center overflow-hidden shrink-0">
                                                {friend.avatar_url ? (
                                                    <img
                                                        src={friend.avatar_url}
                                                        alt={displayName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <UserPlus size={16} className="text-[#00d4ff]/70" />
                                                )}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-white font-bold font-orbitron text-[0.85rem] tracking-wide drop-shadow-md">{displayName}</span>
                                                <span className="text-white/40 font-orbitron text-[0.7rem]">@{friend.username}</span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleInvite(friend.id)}
                                            disabled={status !== 'idle'}
                                            className={`btn-invite-action ${status === 'invited' ? 'invited' : ''} ${status === 'loading' ? 'loading' : ''}`}
                                        >
                                            {status === 'idle' && t('invite')}
                                            {status === 'loading' && <Loader2 size={14} className="animate-spin" />}
                                            {status === 'invited' && (
                                                <span>{t('invited')}</span>
                                            )}
                                        </button>

                                    </div>
                                );
                            })}

                            {/* Empty State */}
                            {!loadingFriends && !fetchError && filteredFriends.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/30">
                                    <Search size={32} className="opacity-50" />
                                    <span className="font-orbitron text-sm tracking-widest uppercase">
                                        {friends.length === 0 ? t('noFriendsYet') : t('noFriendsFound')}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
