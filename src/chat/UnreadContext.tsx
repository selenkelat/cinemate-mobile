import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { chatApi, type ConversationSummaryDto } from '@/api/chat';

interface UnreadContextValue {
  totalUnread: number;
  // Independent refetch — used where the caller doesn't already have a fresh conversations list
  // in hand (cold start, after marking a conversation read).
  refreshUnread: () => Promise<void>;
  // Reuses a list the caller just fetched for its own purposes (the chat inbox screen), so
  // switching to the Chat tab doesn't fire two identical GETs back to back.
  reportUnread: (conversations: ConversationSummaryDto[]) => void;
}

const UnreadContext = createContext<UnreadContextValue | null>(null);

export function UnreadProvider({ children }: PropsWithChildren) {
  const [totalUnread, setTotalUnread] = useState(0);

  const reportUnread = useCallback((conversations: ConversationSummaryDto[]) => {
    setTotalUnread(conversations.reduce((sum, c) => sum + c.unreadCount, 0));
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const conversations = await chatApi.getConversations();
      reportUnread(conversations);
    } catch (err) {
      // Best-effort — the badge is decorative, so a failed refresh just leaves the last known
      // count in place rather than surfacing an error anywhere.
      console.error('Refresh unread count failed:', err);
    }
  }, [reportUnread]);

  // Only mounted under (app)/_layout.tsx's auth gate, so a signed-in user is guaranteed here.
  useEffect(() => {
    refreshUnread();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount, intentionally
  }, []);

  const value = useMemo(() => ({ totalUnread, refreshUnread, reportUnread }), [totalUnread, refreshUnread, reportUnread]);

  return <UnreadContext.Provider value={value}>{children}</UnreadContext.Provider>;
}

export function useUnread() {
  const ctx = useContext(UnreadContext);
  if (!ctx) throw new Error('useUnread must be used within an UnreadProvider');
  return ctx;
}
