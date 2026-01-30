import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../utils/supabase';
import { useAuth } from '../auth/context';

export function useRealtime() {
    const { user } = useAuth();
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!user?.id) return;

        console.log('[Realtime] Setting up subscriptions for user:', user.id);

        // 1. Listen for User Profile updates (Balance, Diamonds, Stats)
        const userSubscription = supabase
            .channel('public:users')
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[Realtime] User update:', payload);
                    queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
                    // Also update derived queries if necessary
                }
            )
            .subscribe();

        // 2. Listen for Submission updates (My submissions status changes)
        const submissionSubscription = supabase
            .channel('public:submissions')
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE
                    schema: 'public',
                    table: 'submissions',
                    filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                    console.log('[Realtime] Submission update:', payload);
                    queryClient.invalidateQueries({ queryKey: ['submissions'] });
                    queryClient.invalidateQueries({ queryKey: ['bountyBalance'] }); // Often tied
                }
            )
            .subscribe();

        // 3. Listen for "New Tasks" (Pending Submissions for Validators)
        // This is tricky because we want to know about submissions NOT owned by us, but RLS might block "listening" to all.
        // Assuming 'submissions' table allows public read of 'pending' tasks, or we use a separate channel.
        // For now, let's subscribe to ALL pending inserts, but filtered if possible. 
        // Supabase Realtime doesn't support complex filters deep in JSON yet, so basic table filter.
        const validatorSubscription = supabase
            .channel('public:validator_queue')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'submissions',
                    filter: 'status=eq.pending'
                },
                (payload) => {
                    // If the new submission is NOT mine, it's a potential task
                    if (payload.new.user_id !== user.id) {
                        console.log('[Realtime] New task available to validate');
                        queryClient.invalidateQueries({ queryKey: ['submissions', 'pending'] });
                    }
                }
            )
            .subscribe();

        return () => {
            console.log('[Realtime] Cleaning up subscriptions');
            supabase.removeChannel(userSubscription);
            supabase.removeChannel(submissionSubscription);
            supabase.removeChannel(validatorSubscription);
        };
    }, [user?.id, queryClient]);
}
