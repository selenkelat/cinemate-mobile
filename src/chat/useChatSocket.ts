import { useCallback, useEffect, useRef, useState } from 'react';

import type { MessageDto } from '@/api/chat';
import { useAuth } from '@/auth/AuthContext';
import { API_BASE_URL } from '@/config';

export type ChatSocketStatus = 'connecting' | 'open' | 'closed';

// RN's global WebSocket accepts a third `options.headers` argument at runtime
// (react-native/Libraries/WebSocket/WebSocket.js), but the TS declaration in scope here is the
// 2-arg DOM lib one — cast to the real signature instead of widening the constructor call.
// Verified live against this backend (WS header spike, 2026-09-14): a header-bearing handshake
// gets a real 101, a token-less one a real 401 — no ?access_token= fallback needed here.
type RNWebSocketCtor = new (
  url: string,
  protocols?: string | string[],
  options?: { headers?: Record<string, string> },
) => WebSocket;
const RNWebSocket = WebSocket as unknown as RNWebSocketCtor;

// Owns the raw connection lifecycle for one conversation. The server has exactly one frame
// shape in both directions ({"body": "..."} out, MessageDto in — echo to sender or live push to
// the peer) — there's no other message type to dispatch on.
export function useChatSocket(otherUserId: number, enabled: boolean, onMessage: (message: MessageDto) => void) {
  const { getAccessToken, refreshAccessToken } = useAuth();
  const [status, setStatus] = useState<ChatSocketStatus>('connecting');
  const [closeReason, setCloseReason] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  const connect = useCallback(
    (token: string | null) => {
      setStatus('connecting');
      setCloseReason(null);

      const wsUrl = `${API_BASE_URL.replace(/^http/, 'ws')}/ws/chat/${otherUserId}`;
      const socket = new RNWebSocket(wsUrl, undefined, { headers: { Authorization: `Bearer ${token}` } });
      socketRef.current = socket;

      socket.onopen = () => setStatus('open');

      socket.onmessage = (event) => {
        try {
          onMessageRef.current(JSON.parse(event.data as string) as MessageDto);
        } catch (err) {
          console.error('Malformed chat frame:', err);
        }
      };

      socket.onclose = (event) => {
        setStatus('closed');
        setCloseReason(event.reason || null);
      };

      // A rejected handshake (400/403/404, before upgrade) fires this before onclose — RN
      // doesn't reliably surface the HTTP status here, so onclose's reason is what's actually
      // shown to the user; this exists only so an error doesn't go fully unhandled.
      socket.onerror = () => {};
    },
    [otherUserId],
  );

  useEffect(() => {
    if (!enabled) return;

    // getAccessToken is stable across renders (AuthContext memoizes it with user/isLoading,
    // and it reads a ref at call time regardless) — safe to call without listing as a dep.
    connect(getAccessToken());

    return () => {
      socketRef.current?.close();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getAccessToken intentionally omitted, see above
  }, [enabled, connect]);

  const send = useCallback((body: string) => {
    socketRef.current?.send(JSON.stringify({ body }));
  }, []);

  const reconnect = useCallback(async () => {
    const token = await refreshAccessToken();
    connect(token);
  }, [connect, refreshAccessToken]);

  return { status, closeReason, send, reconnect };
}
