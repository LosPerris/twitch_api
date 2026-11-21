import { Circle, WifiOff, Loader2 } from 'lucide-react';
import { useTranslation } from '@/core/i18n/I18nContext';
import type { OverlayTool } from '@/features/overlay/lib/types';
import { useOverlayPanelStatus } from '@/features/overlay/hooks/useOverlayPanelStatus';
import { hoverSubtleBorderedRow } from '@/core/utils/tw';

export function OverlayConnectionBadge({
    tool,
    active = true,
    compact = false
}: {
    tool: OverlayTool;
    active?: boolean;
    compact?: boolean;
}) {
    const { t } = useTranslation();
    const bT = t.overlay.badge;
    const { status, retry, retrying } = useOverlayPanelStatus(tool, active);

    const label =
        status === 'connected'
            ? bT.connected
            : status === 'connecting'
              ? bT.connecting
              : status === 'unauthorized'
                ? bT.unauthorized
                : bT.noSignal;

    const tone =
        status === 'connected'
            ? 'text-success'
            : status === 'connecting'
              ? 'text-text-muted'
              : 'text-warning';

    const Icon =
        status === 'connected' ? Circle : status === 'connecting' ? Loader2 : WifiOff;

    return (
        <button
            type="button"
            onClick={() => {
                if (status !== 'connected') retry();
            }}
            disabled={retrying || status === 'connected'}
            title={label}
            aria-label={label}
            className={
                compact
                    ? `inline-flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-transparent px-2 text-[0.75rem] font-semibold ${tone} ${hoverSubtleBorderedRow} disabled:opacity-100`
                    : `inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-transparent px-2.5 py-1.5 text-[0.75rem] font-semibold ${tone} ${hoverSubtleBorderedRow}`
            }
        >
            <Icon
                className={`size-3.5 shrink-0 ${status === 'connected' ? 'fill-current' : ''} ${
                    status === 'connecting' || retrying ? 'animate-spin' : ''
                }`}
                aria-hidden
            />
            <span className={compact ? 'hidden sm:inline' : undefined}>{label}</span>
        </button>
    );
}
