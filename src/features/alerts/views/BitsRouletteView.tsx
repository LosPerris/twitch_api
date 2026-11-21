import { useEffect, useMemo, useState } from 'react';
import { Gift, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { API_ENDPOINTS } from '@/core/config/config';
import { apiFetch } from '@/core/auth';
import { useRequiredSession } from '@/core/session/useSession';
import { useTranslation } from '@/core/i18n/I18nContext';
import { useToast } from '@/shared/ui/toast/ToastProvider';
import { OverlayConnectionBadge } from '@/features/overlay/components/OverlayConnectionBadge';
import { OverlayUrlButton } from '@/features/overlay/components/OverlayUrlButton';
import { ToolPanelHeader } from '@/features/tools/components/ToolPanelHeader';
import { SelectField } from '@/shared/ui/SelectField';
import { InfoTooltip } from '@/shared/ui/InfoTooltip';
import { BitsRouletteSkeleton } from '@/shared/ui/skeletons/BitsRouletteSkeleton';
import {
    btnSecondary,
    fadeIn,
    themeActiveChip,
    themeIdleChip,
    toolConfigControl,
    toolConfigInput,
    toolHeaderIconBtn,
    toolPanelShell
} from '@/core/utils/tw';
import { useToolFocus } from '@/features/dashboard/lib/ui/ToolFocusContext';
import {
    readBitsRoulettePrefs,
    writeBitsRoulettePrefs
} from '@/features/alerts/lib/bitsRoulettePrefs';
import { UpdateTwitchPermissionsCallout } from '@/features/dashboard/components/UpdateTwitchPermissions';
import {
    BITS_IMAGE_URL_MAX,
    BITS_MESSAGE_TEMPLATE_MAX,
    BITS_ROULETTE_OPTIONS_MIN,
    isValidBitsImageUrl,
    maxBitsRouletteOptionsForRole,
    normalizeImageUrl,
    normalizeMessageTemplate,
    normalizePrizeOptions,
    type BitsMatchMode,
    type BitsReactionMode,
    type BitsRouletteUrlConfig
} from '@/features/alerts/lib/bitsRouletteUrl';
import { useDashboardPanel } from '@/features/dashboard/providers/DashboardPanelProvider';

interface BitsAlertSubscription {
    enabled: boolean;
    eventsubId: string | null;
}

export function BitsRouletteView({ active = true }: { active?: boolean }) {
    const session = useRequiredSession();
    const { profile } = useDashboardPanel();
    const { t } = useTranslation();
    const aT = t.alerts.bitsRoulette;
    const { showToast } = useToast();
    const { focusMode } = useToolFocus();

    const maxOptions = useMemo(() => {
        if (typeof profile?.maxBitsRouletteOptions === 'number') {
            return profile.maxBitsRouletteOptions;
        }
        return maxBitsRouletteOptionsForRole(profile?.role);
    }, [profile?.maxBitsRouletteOptions, profile?.role]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [enabled, setEnabled] = useState(false);
    const initial = useMemo(
        () => readBitsRoulettePrefs(session.userId, maxOptions),
        [session.userId, maxOptions]
    );
    const [threshold, setThreshold] = useState(initial.threshold);
    const [matchMode, setMatchMode] = useState<BitsMatchMode>(initial.matchMode);
    const [options, setOptions] = useState<string[]>(initial.options);
    const [cooldownSec, setCooldownSec] = useState(initial.cooldownSec);
    const [announceChat, setAnnounceChat] = useState(initial.announceChat);
    const [reactionMode, setReactionMode] = useState<BitsReactionMode>(initial.reactionMode);
    const [imageUrl, setImageUrl] = useState(initial.imageUrl);
    const [messageTemplate, setMessageTemplate] = useState(initial.messageTemplate);
    const [imageUrlDraft, setImageUrlDraft] = useState(initial.imageUrl);
    const [imageUrlError, setImageUrlError] = useState(false);

    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        void (async () => {
            try {
                const data = await apiFetch<{ subscription: BitsAlertSubscription }>(
                    API_ENDPOINTS.ALERTS_BITS_ROULETTE,
                    session,
                    { method: 'GET' }
                );
                if (cancelled) return;
                setEnabled(Boolean(data.subscription?.enabled));
                const cfg = readBitsRoulettePrefs(session.userId, maxOptions);
                setThreshold(cfg.threshold);
                setMatchMode(cfg.matchMode);
                setOptions(cfg.options);
                setCooldownSec(cfg.cooldownSec);
                setAnnounceChat(cfg.announceChat);
                setReactionMode(cfg.reactionMode);
                setImageUrl(cfg.imageUrl);
                setImageUrlDraft(cfg.imageUrl);
                setMessageTemplate(cfg.messageTemplate);
            } catch {
                if (!cancelled) showToast(aT.loadError, 'error');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, session.userId, maxOptions]);

    useEffect(() => {
        setOptions((prev) => {
            if (prev.length <= maxOptions) return prev;
            return prev.slice(0, maxOptions);
        });
    }, [maxOptions]);

    const saveLocalConfig = () => {
        const prev = readBitsRoulettePrefs(session.userId, maxOptions);
        const cleaned = normalizePrizeOptions(options, maxOptions);
        let nextImageUrl = imageUrl;
        const nextMessage = normalizeMessageTemplate(messageTemplate);

        if (reactionMode === 'roulette') {
            if (cleaned.length < BITS_ROULETTE_OPTIONS_MIN) {
                showToast(aT.optionsMin, 'warning');
                return;
            }
        }
        if (reactionMode === 'image') {
            const normalized = normalizeImageUrl(imageUrlDraft);
            if (!normalized) {
                setImageUrlError(true);
                showToast(aT.imageUrlError, 'warning');
                return;
            }
            nextImageUrl = normalized;
            setImageUrl(normalized);
            setImageUrlDraft(normalized);
            setImageUrlError(false);
        }

        const next: BitsRouletteUrlConfig = {
            ...prev,
            threshold,
            matchMode,
            options: cleaned,
            cooldownSec,
            announceChat,
            reactionMode,
            imageUrl: nextImageUrl,
            messageTemplate: nextMessage
        };
        setOptions(cleaned);
        setMessageTemplate(nextMessage);
        writeBitsRoulettePrefs(session.userId, next);
        showToast(aT.savedLocal, 'success');
    };

    const reactionModes: { id: BitsReactionMode; label: string }[] = [
        { id: 'roulette', label: aT.reactionModeRoulette },
        { id: 'message', label: aT.reactionModeMessage },
        { id: 'image', label: aT.reactionModeImage }
    ];

    const previewImageUrl = normalizeImageUrl(imageUrlDraft);

    const toggleEnabled = async (nextEnabled: boolean) => {
        setSaving(true);
        try {
            const data = await apiFetch<{
                subscription: BitsAlertSubscription;
                localOnly?: boolean;
                message?: string;
            }>(API_ENDPOINTS.ALERTS_BITS_ROULETTE, session, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: nextEnabled })
            });
            setEnabled(Boolean(data.subscription?.enabled));
            if (data.localOnly && data.message) {
                showToast(data.message, 'info');
            } else {
                showToast(nextEnabled ? aT.enabledOn : aT.enabledOff, 'success');
            }
        } catch (err) {
            const raw = err instanceof Error ? err.message : '';
            const needsPerms =
                /permisos|permissions|permiss|bits/i.test(raw) &&
                /actualiz|update|atualiz/i.test(raw);
            showToast(needsPerms ? aT.permissionsError : raw || aT.saveError, 'error');
        } finally {
            setSaving(false);
        }
    };

    const testSpin = async () => {
        setTesting(true);
        try {
            await apiFetch(API_ENDPOINTS.ALERTS_BITS_ROULETTE_TEST, session, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bits: threshold })
            });
            showToast(aT.testOk, 'success');
        } catch (err) {
            const msg = err instanceof Error ? err.message : aT.testError;
            showToast(msg, 'error');
        } finally {
            setTesting(false);
        }
    };

    if (loading) {
        return <BitsRouletteSkeleton />;
    }

    return (
        <div className={`${toolPanelShell(focusMode)} ${focusMode ? '' : fadeIn}`}>
            <ToolPanelHeader
                icon={Gift}
                title={aT.title}
                description={aT.desc}
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
                            onChange={(e) => void toggleEnabled(e.target.checked)}
                            className="size-3.5 shrink-0 accent-primary"
                        />
                        {aT.enabled}
                    </label>
                }
                config={
                    <>
                        <div className={toolConfigControl}>
                            <span className="text-text-muted">{aT.threshold}</span>
                            <input
                                type="number"
                                min={1}
                                max={100000}
                                value={threshold}
                                onChange={(e) => setThreshold(Number(e.target.value) || 1)}
                                className="h-6 w-16 rounded-md border-0 bg-transparent px-1 text-[0.8125rem] text-text-main outline-none"
                                aria-label={aT.threshold}
                            />
                        </div>
                        <div className={toolConfigControl}>
                            <span className="text-text-muted">{aT.matchMode}</span>
                            <SelectField
                                value={matchMode}
                                onChange={(e) => setMatchMode(e.target.value as BitsMatchMode)}
                                aria-label={aT.matchMode}
                                options={[
                                    { value: 'exact', label: aT.matchExact },
                                    { value: 'min', label: aT.matchMin }
                                ]}
                            />
                        </div>
                        <div className={toolConfigControl}>
                            <span className="text-text-muted">{aT.cooldown}</span>
                            <input
                                type="number"
                                min={5}
                                max={3600}
                                value={cooldownSec}
                                onChange={(e) => setCooldownSec(Number(e.target.value) || 45)}
                                className="h-6 w-14 rounded-md border-0 bg-transparent px-1 text-[0.8125rem] text-text-main outline-none"
                                aria-label={aT.cooldown}
                            />
                        </div>
                    </>
                }
                trailing={
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setAnnounceChat((prev) => {
                                    const next = !prev;
                                    const cfg = readBitsRoulettePrefs(session.userId, maxOptions);
                                    writeBitsRoulettePrefs(session.userId, {
                                        ...cfg,
                                        announceChat: next
                                    });
                                    showToast(
                                        next ? aT.announceChatOn : aT.announceChatOff,
                                        'info'
                                    );
                                    return next;
                                });
                            }}
                            title={
                                announceChat
                                    ? `${aT.announceChat} · ${aT.announceChatHint}`
                                    : aT.announceChat
                            }
                            aria-pressed={announceChat}
                            aria-label={aT.announceChat}
                            className={`${toolHeaderIconBtn} ${
                                announceChat ? 'bg-primary/10 text-primary' : ''
                            }`}
                        >
                            <MessageSquare className="size-4" />
                        </button>
                        <OverlayConnectionBadge tool="bits-roulette" active={active} compact />
                        <OverlayUrlButton tool="bits-roulette" compact />
                        <InfoTooltip text={aT.triggerHint} />
                    </>
                }
            />

            <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <UpdateTwitchPermissionsCallout
                    hints={['bits']}
                    message={aT.permissionsNeeded}
                    className="mb-4"
                />

                <div className="mb-5">
                    <p className="mb-2 text-[0.7rem] font-bold uppercase tracking-wide text-text-muted">
                        {aT.reactionMode}
                    </p>
                    <div
                        className="flex w-full items-center gap-1 rounded-xl border border-border-subtle bg-bg-secondary p-1"
                        role="tablist"
                        aria-label={aT.reactionMode}
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
                            {aT.messageTemplate}
                        </label>
                        <input
                            type="text"
                            value={messageTemplate}
                            maxLength={BITS_MESSAGE_TEMPLATE_MAX}
                            onChange={(e) => setMessageTemplate(e.target.value)}
                            placeholder={aT.messageTemplateHint}
                            className={`${toolConfigInput} w-full`}
                        />
                        <p className="mt-1.5 text-[0.65rem] text-text-muted">{aT.messageTemplateHint}</p>
                    </div>
                ) : null}

                {reactionMode === 'image' ? (
                    <div className="mb-5 text-left">
                        <label className="mb-2 block text-[0.7rem] font-bold uppercase tracking-wide text-text-muted">
                            {aT.imageUrl}
                        </label>
                        <input
                            type="url"
                            value={imageUrlDraft}
                            maxLength={BITS_IMAGE_URL_MAX}
                            onChange={(e) => {
                                setImageUrlDraft(e.target.value);
                                setImageUrlError(
                                    e.target.value.trim().length > 0 &&
                                        !isValidBitsImageUrl(e.target.value)
                                );
                            }}
                            placeholder={aT.imageUrlPlaceholder}
                            aria-invalid={imageUrlError}
                            className={`${toolConfigInput} w-full ${imageUrlError ? 'ring-1 ring-warning/60' : ''}`}
                        />
                        {imageUrlError ? (
                            <p className="mt-1.5 text-[0.65rem] text-warning">{aT.imageUrlError}</p>
                        ) : (
                            <p className="mt-1.5 text-[0.65rem] text-text-muted">{aT.imageUrlPlaceholder}</p>
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

                {reactionMode === 'roulette' ? (
                <div className="text-left">
                    <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-[0.7rem] font-bold uppercase tracking-wide text-text-muted">
                            {aT.optionsTitle} ({options.length}/{maxOptions})
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                setOptions((prev) =>
                                    prev.length >= maxOptions
                                        ? prev
                                        : [...prev, `Premio ${prev.length + 1}`]
                                )
                            }
                            disabled={options.length >= maxOptions}
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-text hover:bg-primary/10 disabled:opacity-40"
                        >
                            <Plus className="size-3.5" aria-hidden />
                            {aT.addOption}
                        </button>
                    </div>
                    <p className="mb-2 text-[0.7rem] text-text-muted">
                        {aT.optionsMaxHint
                            .replace('{max}', String(maxOptions))
                            .replace('{plan}', profile?.roleLabel || 'Default')}
                    </p>
                    <ul className="space-y-0 overflow-hidden rounded-lg border border-border-strong bg-bg-secondary p-1">
                        {options.map((opt, index) => (
                            <li
                                key={index}
                                className="flex items-center gap-2 border-b border-border-subtle px-2 py-1.5 last:border-0"
                            >
                                <input
                                    type="text"
                                    value={opt}
                                    maxLength={40}
                                    onChange={(e) =>
                                        setOptions((prev) =>
                                            prev.map((item, i) =>
                                                i === index ? e.target.value : item
                                            )
                                        )
                                    }
                                    className={`${toolConfigInput} flex-1 border-0 bg-transparent hover:bg-transparent focus:bg-transparent`}
                                    aria-label={`${aT.optionsTitle} ${index + 1}`}
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setOptions((prev) =>
                                            prev.length <= BITS_ROULETTE_OPTIONS_MIN
                                                ? prev
                                                : prev.filter((_, i) => i !== index)
                                        )
                                    }
                                    disabled={options.length <= BITS_ROULETTE_OPTIONS_MIN}
                                    className="rounded-lg p-2 text-text-muted hover:bg-white/[0.04] hover:text-text-main disabled:opacity-40"
                                    aria-label={aT.removeOption}
                                >
                                    <Trash2 className="size-3.5" aria-hidden />
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
                ) : null}

                <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={saveLocalConfig}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                    >
                        {aT.save}
                    </button>
                    <button
                        type="button"
                        onClick={() => void testSpin()}
                        disabled={testing}
                        className={btnSecondary}
                    >
                        {testing ? aT.testing : aT.testSpin}
                    </button>
                </div>
            </div>
        </div>
    );
}
