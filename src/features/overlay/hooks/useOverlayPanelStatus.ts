import { useCallback, useEffect, useRef, useState } from 'react';
import { useRequiredSession } from '@/core/session/useSession';
import {
    hasOverlayPollCredentials,
    overlaySessionKey
} from '@/features/overlay/lib/credentials';
import { overlayAuthHeaders, overlayStatePollUrl } from '@/features/overlay/lib/overlayApi';
import type { OverlayTool } from '@/features/overlay/lib/types';
import { OVERLAY_POLL_IDLE_MS } from '@/features/overlay/lib/overlayStateUtils';
import { getSharedSupabaseClient } from '@/core/realtime/client';

export type OverlayPanelLinkStatus = 'connecting' | 'connected' | 'no_signal' | 'unauthorized';

const STALE_MS = Math.max(12_000, Math.round(OVERLAY_POLL_IDLE_MS * 1.5));

function isAbortError(err: unknown): boolean {
    return (
        (err instanceof DOMException && err.name === 'AbortError') ||
        (err instanceof Error && err.name === 'AbortError')
    );
}

/**
 * Estado del enlace overlay desde el panel (API/KV/realtime).
 * No prueba que OBS esté abierto; solo que el canal de estado responde.
 */
export function useOverlayPanelStatus(
    tool: OverlayTool,
    active = true
): {
    status: OverlayPanelLinkStatus;
    lastSyncAt: number | null;
    retry: () => void;
    retrying: boolean;
} {
    const session = useRequiredSession();
    const sessionKey = overlaySessionKey(session);
    const [connected, setConnected] = useState(false);
    const [stale, setStale] = useState(true);
    const [unauthorized, setUnauthorized] = useState(false);
    const [booted, setBooted] = useState(false);
    const [retrying, setRetrying] = useState(false);
    const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
    const [realtimeChannel, setRealtimeChannel] = useState<{ topic: string; event: string } | null>(
        null
    );
    const [realtimeLive, setRealtimeLive] = useState(false);
    const lastPollAtRef = useRef(0);
    const realtimeLiveRef = useRef(false);
    realtimeLiveRef.current = realtimeLive;

    const markOk = useCallback(
        (hasState: boolean) => {
            const now = Date.now();
            lastPollAtRef.current = now;
            setConnected(true);
            setUnauthorized(false);
            setLastSyncAt(now);
            setStale(tool !== 'bits-roulette' && !hasState && !realtimeLiveRef.current ? true : false);
            setBooted(true);
        },
        [tool]
    );

    const poll = useCallback(
        async (signal?: AbortSignal, opts?: { manual?: boolean }) => {
            if (!active || !hasOverlayPollCredentials(session)) return;
            if (opts?.manual) setRetrying(true);
            try {
                const res = await fetch(overlayStatePollUrl(tool, session), {
                    headers: overlayAuthHeaders(session),
                    cache: 'no-store',
                    signal
                });
                if (signal?.aborted) return;
                if (!res.ok) {
                    setConnected(false);
                    setStale(true);
                    setUnauthorized(res.status === 401 || res.status === 403);
                    setBooted(true);
                    return;
                }
                const data = (await res.json()) as {
                    state: unknown | null;
                    realtime?: { topic: string; event: string };
                };
                if (signal?.aborted) return;
                if (data.realtime?.topic) {
                    const next = data.realtime;
                    setRealtimeChannel((prev) =>
                        prev?.topic === next.topic && prev.event === next.event ? prev : next
                    );
                }
                markOk(data.state != null);
            } catch (err) {
                if (signal?.aborted || isAbortError(err)) return;
                setConnected(false);
                setStale(true);
                setBooted(true);
            } finally {
                if (opts?.manual) setRetrying(false);
            }
        },
        [active, session, tool, markOk]
    );

    const pollRef = useRef(poll);
    pollRef.current = poll;

    const retry = useCallback(() => {
        void poll(undefined, { manual: true });
    }, [poll]);

    useEffect(() => {
        if (!active || !hasOverlayPollCredentials(session)) return;
        const ac = new AbortController();
        void poll(ac.signal);
        return () => ac.abort();
    }, [active, sessionKey, poll, session]);

    useEffect(() => {
        if (!active || !realtimeChannel) return;
        let cancelled = false;
        let cleanup: (() => void) | null = null;

        void (async () => {
            const client = await getSharedSupabaseClient();
            if (!client || cancelled) return;
            const channel = client
                .channel(realtimeChannel.topic, { config: { broadcast: { self: false } } })
                .on('broadcast', { event: realtimeChannel.event }, () => {
                    lastPollAtRef.current = Date.now();
                    setConnected(true);
                    setStale(false);
                    setLastSyncAt(Date.now());
                })
                .subscribe((status) => {
                    if (cancelled) return;
                    setRealtimeLive(status === 'SUBSCRIBED');
                    if (status === 'SUBSCRIBED') {
                        const ac = new AbortController();
                        void pollRef.current(ac.signal);
                    }
                });
            cleanup = () => {
                void client.removeChannel(channel);
            };
            if (cancelled) cleanup();
        })();

        return () => {
            cancelled = true;
            cleanup?.();
            setRealtimeLive(false);
        };
    }, [active, realtimeChannel]);

    useEffect(() => {
        if (!active) return;
        const id = window.setInterval(() => {
            if (realtimeLiveRef.current) {
                setStale(false);
                return;
            }
            if (!lastPollAtRef.current) return;
            setStale(Date.now() - lastPollAtRef.current > STALE_MS);
        }, 1000);
        return () => window.clearInterval(id);
    }, [active]);

    useEffect(() => {
        if (!active || !hasOverlayPollCredentials(session) || realtimeLive) return;
        const id = window.setInterval(() => {
            void pollRef.current();
        }, OVERLAY_POLL_IDLE_MS);
        return () => window.clearInterval(id);
    }, [active, session, realtimeLive, sessionKey]);

    let status: OverlayPanelLinkStatus = 'connecting';
    if (!booted) status = 'connecting';
    else if (unauthorized) status = 'unauthorized';
    else if (connected && !stale) status = 'connected';
    else status = 'no_signal';

    return { status, lastSyncAt, retry, retrying };
}
