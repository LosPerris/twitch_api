import { Construction, Heart, UserPlus, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from '@/core/i18n/I18nContext';
import { ToolPanelHeader } from '@/features/tools/components/ToolPanelHeader';
import { SimpleEmptyState } from '@/shared/ui/SimpleEmptyState';
import { DiscordIcon } from '@/shared/ui/icons/BrandIcons';
import { fadeIn, toolPanelShell } from '@/core/utils/tw';
import { useToolFocus } from '@/features/dashboard/lib/ui/ToolFocusContext';
import { LEGAL_DISCORD_URL } from '@/features/legal/legalConstants';
import type { EventAlertKind } from '@/features/alerts/lib/eventAlertTypes';

const KIND_META: Record<
    EventAlertKind,
    { icon: LucideIcon; i18nKey: 'follow' | 'subscribe' | 'raid' }
> = {
    follow: { icon: UserPlus, i18nKey: 'follow' },
    subscribe: { icon: Heart, i18nKey: 'subscribe' },
    raid: { icon: Users, i18nKey: 'raid' }
};

export function EventAlertView({
    kind
}: {
    kind: EventAlertKind;
    active?: boolean;
}) {
    const { t } = useTranslation();
    const evT = t.alerts.eventAlert[KIND_META[kind].i18nKey];
    const soon = t.alerts.eventAlert.comingSoon;
    const { focusMode } = useToolFocus();
    const Icon = KIND_META[kind].icon;

    return (
        <div className={`${toolPanelShell(focusMode)} ${focusMode ? '' : fadeIn}`}>
            <ToolPanelHeader icon={Icon} title={evT.title} description={evT.desc} />

            <div
                className={`flex items-center justify-center p-8 ${focusMode ? 'min-h-0 flex-1' : 'min-h-[16rem]'}`}
            >
                <SimpleEmptyState
                    icon={Construction}
                    label={soon.title}
                    description={soon.body}
                    action={
                        <a
                            href={LEGAL_DISCORD_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-secondary px-3 py-2 text-[0.8125rem] font-semibold text-text-main no-underline transition hover:border-border-strong hover:bg-white/[0.02]"
                        >
                            <DiscordIcon className="size-4" />
                            {soon.discordCta}
                        </a>
                    }
                />
            </div>
        </div>
    );
}
