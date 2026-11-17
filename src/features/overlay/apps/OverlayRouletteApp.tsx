import { useOverlayMirror } from '@/features/overlay/hooks/useOverlayMirror';
import { useRouletteOverlayVisible } from '@/features/overlay/hooks/useOverlayVisibilityClock';
import { RouletteWheelDisplay } from '@/features/tools/roulette/RouletteWheelDisplay';
import { OverlayAppearanceRoot } from '@/features/overlay/components/OverlayAppearanceRoot';
import { OverlayConnectionBanners } from '@/features/overlay/components/OverlayConnectionBanners';
import { OverlaySessionGate } from '@/features/overlay/components/OverlaySessionGate';
import { OverlaySessionProvider } from '@/features/overlay/components/OverlaySessionProvider';
import { isOverlayColorValue, safeOverlayUrlColor } from '@/features/overlay/lib/overlayAppearance';
import { ErrorBoundary } from '@/shared/ui/ErrorBoundary';
import type { RouletteOverlayState } from '@/features/overlay/lib/types';
import type { Session } from '@/core/config/config';
import { I18nProvider, useTranslation } from '@/core/i18n/I18nContext';

function OverlayRouletteContent({ session }: { session: Session }) {
    const { state, connected, stale, unauthorized, retrying, retry } = useOverlayMirror('roulette', session);
    const rouletteState = state as RouletteOverlayState;
    const visible = useRouletteOverlayVisible(rouletteState);

    if (!visible) {
        return <div className="min-h-screen" aria-hidden />;
    }

    const urlColor = safeOverlayUrlColor();
    const stateColor =
        rouletteState.wheelColor && isOverlayColorValue(rouletteState.wheelColor)
            ? rouletteState.wheelColor
            : undefined;
    const effectiveColor = stateColor || urlColor || undefined;

    return (
        <OverlayAppearanceRoot>
            <div className="flex min-h-screen items-center justify-center overflow-hidden p-4">
                <div className="flex flex-col items-center gap-2">
                    <OverlayConnectionBanners
                        connected={connected}
                        stale={stale}
                        unauthorized={unauthorized}
                        retrying={retrying}
                        onRetry={retry}
                    />
                    <RouletteWheelDisplay
                        chatters={rouletteState.chatters}
                        wheelRotation={rouletteState.wheelRotation}
                        wheelTransition={rouletteState.wheelTransition}
                        isSpinning={rouletteState.isSpinning}
                        winner={rouletteState.winner}
                        lastSpinCount={rouletteState.lastSpinCount}
                        wheelColor={effectiveColor}
                        variant="overlay"
                    />
                </div>
            </div>
        </OverlayAppearanceRoot>
    );
}

function OverlayRouletteApp() {
    return (
        <OverlaySessionGate>
            {(session) => <OverlayRouletteContent session={session} />}
        </OverlaySessionGate>
    );
}

function OverlayRouletteBoundary() {
    const { t } = useTranslation();
    return (
        <ErrorBoundary
            title={t.overlay.apps.rouletteErrorTitle}
            retryLabel={t.common.retry}
            hint={t.common.errorBoundary.hint}
            hintDev={t.common.errorBoundary.hintDev}
        >
            <OverlayRouletteApp />
        </ErrorBoundary>
    );
}

/** Raíz única para Astro (un solo client:only — SessionProvider envuelve el árbol). */
export function OverlayRouletteRoot() {
    return (
        <I18nProvider>
            <OverlaySessionProvider requireAuth>
                <OverlayRouletteBoundary />
            </OverlaySessionProvider>
        </I18nProvider>
    );
}
