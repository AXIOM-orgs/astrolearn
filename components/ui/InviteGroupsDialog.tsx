'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Users, X, Search, Loader2, Check, Crown, Shield, User } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTranslations, useLocale } from 'next-intl';

interface GroupMember {
    user_id?: string;
    id?: string;
    role: 'owner' | 'admin' | 'member';
    joined_at?: string;
}

interface Group {
    id: string;
    name: string;
    description: string | null;
    avatar_url: string | null;
    cover_url: string | null;
    creator_id: string;
    members: GroupMember[];
    activities: any[];
    category: string | null;
}

interface InviteGroupsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    roomCode: string;
    sessionId: string;
}

export function InviteGroupsDialog({ isOpen, onClose, roomCode, sessionId }: InviteGroupsDialogProps): React.JSX.Element | null {
    const { profile } = useAuth();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [groups, setGroups] = useState<Group[]>([]);
    const [loadingGroups, setLoadingGroups] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [invitingStatus, setInvitingStatus] = useState<Record<string, 'idle' | 'loading' | 'invited'>>({});
    const t = useTranslations('Lobby');
    const locale = useLocale();
    const isArabic = locale === 'ar';

    // Fetch groups the user has joined
    const fetchGroups = useCallback(async () => {
        if (!profile?.id) return;

        setLoadingGroups(true);
        setFetchError(null);

        try {
            const { data, error } = await supabase
                .from('groups')
                .select('id, name, description, avatar_url, cover_url, creator_id, members, activities, category')
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching groups:', error);
                setFetchError(t('gagalMemuat') + ' groups');
                return;
            }

            // Client-side filter: only groups where user is owner or admin
            const myGroups = (data || []).filter((g) => {
                const members = Array.isArray(g.members) ? g.members : [];
                const member = members.find(
                    (m: GroupMember) => m.user_id === profile.id || m.id === profile.id
                );
                return member && (member.role === 'owner' || member.role === 'admin');
            });

            setGroups(myGroups);
        } catch (err) {
            console.error('Error fetching groups:', err);
            setFetchError(t('gagalMemuat') + ' groups');
        } finally {
            setLoadingGroups(false);
        }
    }, [profile?.id]);

    // Fetch groups when dialog opens
    useEffect(() => {
        if (isOpen && profile?.id) {
            fetchGroups();
            // Reset invite statuses when dialog re-opens
            setInvitingStatus({});
            setSearchQuery('');
        }
    }, [isOpen, profile?.id, fetchGroups]);

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

    // Get current user's role in a group
    const getUserRole = (group: Group): 'owner' | 'admin' | 'member' => {
        if (!profile?.id || !group.members) return 'member';
        const member = group.members.find(
            (m: GroupMember) => m.user_id === profile.id || m.id === profile.id
        );
        return member?.role || 'member';
    };

    // Check if user can invite (owner or admin only)
    const canInvite = (group: Group): boolean => {
        const role = getUserRole(group);
        return role === 'owner' || role === 'admin';
    };

    // Filter groups by search query
    const filteredGroups = groups.filter(g =>
        g.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Handle invite action
    const handleInvite = async (groupId: string) => {
        if (!profile?.id) return;

        setInvitingStatus(prev => ({ ...prev, [groupId]: 'loading' }));

        try {
            // Find the group to get its current activities
            const group = groups.find(g => g.id === groupId);
            if (!group) throw new Error('Group not found');

            // Create activity entry for the invite
            const inviteActivity = {
                type: 'game_invite',
                user_id: profile.id,
                username: profile.username || profile.nickname || 'Unknown',
                room_code: roomCode,
                created_at: new Date().toISOString(),
                message: t('inviteActivityMessage', { code: roomCode })
            };

            // Update group activities with the new invite
            const { error } = await supabase
                .from('groups')
                .update({
                    activities: [...(Array.isArray(group.activities) ? group.activities : []), inviteActivity]
                } as any)
                .eq('id', groupId);

            if (error) {
                console.error('Error sending invite:', error);
                setInvitingStatus(prev => ({ ...prev, [groupId]: 'idle' }));
                return;
            }

            // Bulk insert notifications for all group members (except the inviter)


            // DEBUG: Log raw members data from JSONB
            console.log('[DEBUG] group.members raw:', JSON.stringify(group.members, null, 2));
            console.log('[DEBUG] profile.id (inviter):', profile.id);
            console.log('[DEBUG] sessionId:', sessionId);

            const memberIds = (group.members || [])
                .map((m: GroupMember) => m.user_id || m.id)
                .filter((uid): uid is string => !!uid && uid !== profile.id);

            console.log('[DEBUG] memberIds after filter:', memberIds);

            if (memberIds.length > 0) {
                const notificationRows = memberIds.map((uid: string) => ({
                    user_id: uid,
                    actor_id: profile.id,
                    type: 'sessionGroup',
                    entity_type: 'session',
                    entity_id: sessionId,
                    is_read: false,
                    from_group_id: groupId,
                }));

                console.log('[DEBUG] notificationRows:', JSON.stringify(notificationRows, null, 2));

                const { error: notifError, data: notifData } = await supabase
                    .from('notifications')
                    .insert(notificationRows)
                    .select();

                console.log('[DEBUG] notification insert result:', { data: notifData, error: notifError });

                if (notifError) {
                    console.error('Failed to send group notifications:', notifError.message);
                }
            } else {
                console.warn('[DEBUG] No memberIds to notify! All filtered out.');
            }

            setInvitingStatus(prev => ({ ...prev, [groupId]: 'invited' }));
            toast(t('invited'), 'success');
        } catch (err) {
            console.error('Error inviting group:', err);
            setInvitingStatus(prev => ({ ...prev, [groupId]: 'idle' }));
        }
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Role icon & badge
    const RoleBadge = ({ role }: { role: 'owner' | 'admin' | 'member' }) => {
        const config = {
            owner: { icon: <Crown size={12} />, label: t('owner'), color: 'text-[#FFD700]', bg: 'bg-[#FFD700]/10 border-[#FFD700]/30' },
            admin: { icon: <Shield size={12} />, label: t('admin'), color: 'text-[#00d4ff]', bg: 'bg-[#00d4ff]/10 border-[#00d4ff]/30' },
            member: { icon: <User size={12} />, label: t('member'), color: 'text-white/50', bg: 'bg-white/5 border-white/10' },
        };
        const c = config[role];
        return (
            <span className={`inline-flex items-center gap-1.5 !px-2 py-1 rounded-md text-[0.75rem] font-orbitron tracking-wider border ${c.bg} ${c.color}`}>
                {c.label}
            </span>
        );
    };

    return (
        <div className="cyan-dialog-overlay" onClick={handleBackdropClick}>
            {/* Main Dialog Container */}
            <div className="cyan-dialog-content">

                {/* Header */}
                <div className="cyan-dialog-header" dir={isArabic ? 'rtl' : 'ltr'}>
                    <h2 className="cyan-dialog-title">
                        <Users size={28} />
                        {t('inviteGroup')}
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
                            placeholder={t('findGroup')}
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
                            {loadingGroups && (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#00d4ff]">
                                    <Loader2 size={32} className="animate-spin" />
                                    <span className="font-orbitron text-sm tracking-widest uppercase text-white/40">{t('loadingGroups')}</span>
                                </div>
                            )}

                            {/* Error State */}
                            {!loadingGroups && fetchError && (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-red-400">
                                    <X size={32} className="opacity-50" />
                                    <span className="font-orbitron text-sm tracking-widest uppercase">{fetchError}</span>
                                    <button
                                        onClick={fetchGroups}
                                        className="mt-2 px-4 py-1.5 rounded-md font-orbitron text-[0.7rem] font-bold tracking-wider bg-white/10 border border-white/20 text-white hover:bg-white/20 transition-all"
                                    >
                                        {t('retry')}
                                    </button>
                                </div>
                            )}

                            {/* Groups List */}
                            {!loadingGroups && !fetchError && filteredGroups.map(group => {
                                const status = invitingStatus[group.id] || 'idle';
                                const role = getUserRole(group);
                                const canInviteGroup = canInvite(group);
                                const memberCount = Array.isArray(group.members) ? group.members.length : 0;

                                return (
                                    <div key={group.id} className="flex items-center justify-between group-card">

                                        <div className="flex flex-col gap-1">
                                            <span className="text-white font-bold font-orbitron text-[0.9rem] tracking-wide drop-shadow-md">{group.name}</span>
                                            <div className="flex items-center gap-4 text-[0.75rem] font-orbitron flex-wrap">
                                                <div className="flex items-center gap-1.5 text-white/60">
                                                    <Users size={14} className="text-[#00d4ff]/70" />
                                                    <span>{memberCount}</span>
                                                </div>
                                                <RoleBadge role={role} />
                                            </div>
                                        </div>

                                        {canInviteGroup ? (
                                            <button
                                                onClick={() => handleInvite(group.id)}
                                                disabled={status !== 'idle'}
                                                className={`btn-invite-action ${status === 'invited' ? 'invited' : ''} ${status === 'loading' ? 'loading' : ''}`}
                                            >
                                                {status === 'idle' && t('invite')}
                                                {status === 'loading' && <Loader2 size={14} className="animate-spin" />}
                                                {status === 'invited' && (
                                                    <span>{t('invited')}</span>
                                                )}
                                            </button>
                                        ) : (
                                            <span className="px-3 py-1 rounded-md font-orbitron text-[0.65rem] font-bold tracking-wider text-white/30 bg-white/5 border border-white/10 min-w-[90px] text-center">
                                                {t('noAccess')}
                                            </span>
                                        )}

                                    </div>
                                );
                            })}

                            {/* Empty State */}
                            {!loadingGroups && !fetchError && filteredGroups.length === 0 && (
                                <div className="flex flex-col items-center justify-center py-12 gap-3 text-white/30">
                                    <Search size={32} className="opacity-50" />
                                    <span className="font-orbitron text-sm tracking-widest uppercase">
                                        {groups.length === 0 ? t('notJoinedGroup') : t('noGroupsFound')}
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
