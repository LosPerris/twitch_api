import type { LucideIcon } from 'lucide-react';

import type { ReactNode } from 'react';

type SimpleEmptyStateProps = {
    icon: LucideIcon;
    label: string;
    description?: string;
    action?: ReactNode;
    className?: string;
};

/** Empty simple: icono + una línea (y opcional subtítulo/CTA) centrados. */
export function SimpleEmptyState({
    icon: Icon,
    label,
    description,
    action,
    className = ''
}: SimpleEmptyStateProps) {
    return (
        <div
            className={`flex flex-col items-center justify-center text-text-muted ${className}`.trim()}
        >
            <Icon className="mb-4 h-12 w-12 opacity-50" aria-hidden strokeWidth={1.5} />
            <p className="text-sm font-medium">{label}</p>
            {description ? (
                <p className="mt-1 max-w-[16rem] text-center text-[0.75rem] leading-relaxed opacity-80">
                    {description}
                </p>
            ) : null}
            {action ? <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
        </div>
    );
}
