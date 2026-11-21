import { useEffect, useState } from 'react';
import { Heart, UserPlus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { API_ENDPOINTS } from '@/core/config/config';
import { apiFetch } from '@/core/auth';
import { useRequiredSession } from '@/core/session/useSession';
import { useTranslation } from '@/core/i18n/I18nContext';
import { useToast } from '@/shared/ui/toast/ToastProvider';
import { ToolPanelHeader } from '@/features/tools/components/ToolPanelHeader';
import { InfoTooltip } from '@/shared/ui/InfoTooltip';
import { BitsRouletteSkeleton } from '@/shared/ui/skeletons/BitsRouletteSkeleton';
import {
    fadeIn,
    themeActiveChip,
    themeIdleChip,
    toolConfigInput,
    toolPanelShell
} from '@/core/utils/tw';
import { useToolFocus } from '@/features/dashboard/lib/ui/ToolFocusContext';
import {
    EVENT_IMAGE_URL_MAX,
    EVENT_MESSAGE_TEMPLATE_MAX,
    type EventAlertKind,
    type EventReactionMode,
    isValidEventImageUrl,
    normalizeEventImageUrl,
    normalizeEventMessageTemplate
} from '@/features/alerts/lib/eventAlertTypes';

const KIND_META: Record<EventAlertKind, { icon: LucideIcon; i18nKey: 'follow' | 'subscribe' | 'raid' }> = {
    follow: { icon: UserPlus, i18nKey: 'follow' },
    subscribe: { icon: Heart, i18nKey: 'subscribe' },
    raid: { icon: Users, i18nKey: 'raid' }
};

interface EventAlertSubscription {
    enabled: boolean;
    eventsubId: string | null;
    reactionMode: EventReactionMode;
    messageTemplate: string;
    imageUrl: string;
}

export function EventAlertView({
    kind,
    active = true
}: {
    kind: EventAlertKind;
    active?: boolean;
}) {
    const session = useRequiredSession();
    const { t } = useTranslation();
    const evT = t.alerts.eventAlert[KIND_META[kind].i18nKey];
    const { showToast } = useToast();
    const { focusMode } = useToolFocus();
    const Icon = KIND_META[kind].icon;

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const [reactionMode, setReactionMode] = useState<EventReactionMode>('message');
    const [messageTemplate, setMessageTemplate] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageUrlDraft, setImageUrlDraft] = useState('');
    const [imageUrlError, setImageUrlError] = useState(false);

    const endpoint = API_ENDPOINTS.eventAlert(kind);

    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        void (async () => {
            try {
                const data = await apiFetch<{ subscription: EventAlertSubscription }>(
                    endpoint,
                    session,
                    { method: 'GET' }
                );
                if (cancelled) return;
                const sub = data.subscription;
                setEnabled(Boolean(sub?.enabled));
                setReactionMode(sub?.reactionMode === 'image' ? 'image' : 'message');
                setMessageTemplate(sub?.messageTemplate || '');
                setImageUrl(sub?.imageUrl || '');
                setImageUrlDraft(sub?.imageUrl || '');
            } catch {
                if (!cancelled) showToast(evT.loadError, 'error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, session.userId, kind]);

    const persistConfig = async (patch: {
        enabled?: boolean;
        reactionMode?: EventReactionMode;
        messageTemplate?: string;
        imageUrl?: string;
    }) => {
        setSaving(true);
        try {
            const data = await apiFetch<{
                subscription: EventAlertSubscription;
                localOnly?: boolean;
                message?: string;
            }>(endpoint, session, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch)
            });
            setEnabled(Boolean(data.subscription?.enabled));
            setReactionMode(
                data.subscription?.reactionMode === 'image' ? 'image' : 'message'
            );
            setMessageTemplate(data.subscription?.messageTemplate || '');
            setImageUrl(data.subscription?.imageUrl || '');
            setImageUrlDraft(data.subscription?.imageUrl || '');
            if (patch.enabled === true) {
                if (data.localOnly && data.message) {
                    showToast(data.message, 'info');
                } else {
                    showToast(evT.enabledOn, 'success');
                }
            } else if (patch.enabled === false) {
                showToast(evT.enabledOff, 'success');
            } else {
                showToast(evT.saved, 'success');
            }
        } catch (err) {
            const raw = err instanceof Error ? err.message : '';
            showToast(raw || evT.saveError, 'error');
        } finally {
            setSaving(false);
        }
    };

    const saveConfig = () => {
        let nextImage = imageUrl;
        if (reactionMode === 'image') {
            const normalized = normalizeEventImageUrl(imageUrlDraft);
            if (!normalized) {
                setImageUrlError(true);
                showToast(evT.imageUrlError, 'warning');
                return;
            }
            nextImage = normalized;
            setImageUrl(normalized);
            setImageUrlDraft(normalized);
            setImageUrlError(false);
        }
        void persistConfig({
            reactionMode,
            messageTemplate: normalizeEventMessageTemplate(messageTemplate),
            imageUrl: nextImage
        });
    };

    const reactionModes: { id: EventReactionMode; label: string }[] = [
        { id: 'message', label: evT.reactionModeMessage },
        { id: 'image', label: evT.reactionModeImage }
    ];

    const previewImageUrl = normalizeEventImageUrl(imageUrlDraft);

    if (loading) {
        return <BitsRouletteSkeleton />;
    }

    return (
        <div className={`${toolPanelShell(focusMode)} ${focusMode ? '' : fadeIn}`}>
            <ToolPanelHeader
                icon={Icon}
                title={evT.title}
                description={evT.desc}
                primaryAction={
                    <label
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[0.75rem] font-medium transition ${
                            enabled
                                ? 'border-success/30 bg-success/10 text-success'
                                : 'border-border-subtle text-text-muted hover:bg-white/[0.02] hover:text-text-main'
                        } ${saving ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                        <input
                            type="checkbox"
                            checked={enabled}
                            disabled={saving}
                            onChange={(e) =>
                                void persistConfig({
                                    enabled: e.target.checked,
                                    reactionMode,
                                    messageTemplate: normalizeEventMessageTemplate(messageTemplate),
                                    imageUrl
                                })
                            }
                            className="size-3.5 shrink-0 accent-primary"
                        />
                        {evT.enabled}
                    </label>
                }
                trailing={<InfoTooltip text={evT.hint} />}
            />

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <p className="mb-4 rounded-lg border border-border-subtle bg-bg-secondary/60 px-3 py-2 text-[0.7rem] text-text-muted">
                    {evT.overlayLaterNote}
                </p>

                <div className="mb-5">
                    <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-text-muted">
                        {evT.reactionMode}
                    </p>
                    <div
                        className="flex w-full items-center gap-1 rounded-xl border border-border-subtle bg-bg-secondary p-1"
                        role="tablist"
                        aria-label={evT.reactionMode}
                    >
                        {reactionModes.map(({ id, label }) => {
                            const selected = reactionMode === id;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    role="tab"
                                    aria-selected={selected}
                                    onClick={() => setReactionMode(id)}
                                    className={`flex-1 rounded-lg py-2.5 text-[0.75rem] font-medium ${
                                        selected ? themeActiveChip : themeIdleChip
                                    }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {reactionMode === 'message' ? (
                    <div className="mb-5 text-left">
                        <label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-wide text-text-muted">
                            {evT.messageTemplate}
                        </label>
                        <input
                            type="text"
                            value={messageTemplate}
                            maxLength={EVENT_MESSAGE_TEMPLATE_MAX}
                            onChange={(e) => setMessageTemplate(e.target.value)}
                            placeholder={evT.messageTemplateHint}
                            className={`${toolConfigInput} w-full`}
                        />
                        <p className="mt-1.5 text-[0.65rem] text-text-muted">{evT.messageTemplateHint}</p>
                    </div>
                ) : null}

                {reactionMode === 'image' ? (
                    <div className="mb-5 text-left">
                        <label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-wide text-text-muted">
                            {evT.imageUrl}
                        </label>
                        <input
                            type="url"
                            value={imageUrlDraft}
                            maxLength={EVENT_IMAGE_URL_MAX}
                            onChange={(e) => {
                                setImageUrlDraft(e.target.value);
                                setImageUrlError(
                                    e.target.value.trim().length > 0 &&
                                        !isValidEventImageUrl(e.target.value)
                                );
                            }}
                            placeholder={evT.imageUrlPlaceholder}
                            aria-invalid={imageUrlError}
                            className={`${toolConfigInput} w-full ${imageUrlError ? 'ring-1 ring-warning/60' : ''}`}
                        />
                        {imageUrlError ? (
                            <p className="mt-1.5 text-[0.65rem] text-warning">{evT.imageUrlError}</p>
                        ) : (
                            <p className="mt-1.5 text-[0.65rem] text-text-muted">{evT.imageStoredNote}</p>
                        )}
                        {previewImageUrl ? (
                            <div className="mt-3 overflow-hidden rounded-lg border border-border-subtle bg-bg-secondary p-2">
                                <img
                                    src={previewImageUrl}
                                    alt=""
                                    className="mx-auto max-h-40 w-auto max-w-full object-contain"
                                />
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <button
                    type="button"
                    onClick={saveConfig}
                    disabled={saving}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-50"
                >
                    {saving ? evT.saving : evT.save}
                </button>
            </div>
        </div>
    );
}