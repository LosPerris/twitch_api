import {
    appendOverlayAppearanceParams,
    overlayAppearanceStyle,
    parseOverlayAppearance,
    safeOverlayUrlColor
} from '@/features/overlay/lib/overlayAppearance';

describe('overlayAppearance', () => {
    it('parseOverlayAppearance usa defaults sin query', () => {
        const parsed = parseOverlayAppearance('');
        expect(parsed.color).toBeNull();
        expect(parsed.scale).toBe('md');
        expect(parsed.scaleValue).toBe(1);
    });

    it('parseOverlayAppearance lee color y scale de la URL', () => {
        const parsed = parseOverlayAppearance('?color=%239146ff&scale=lg&overlayToken=secret');
        expect(parsed.color).toBe('#9146ff');
        expect(parsed.scale).toBe('lg');
        expect(parsed.scaleValue).toBe(1.25);
    });

    it('appendOverlayAppearanceParams omite auto y md', () => {
        const base = 'https://example.com/overlay/questions?overlayToken=abc';
        expect(appendOverlayAppearanceParams(base, { color: 'auto', scale: 'md' })).toBe(base);
        const withParams = appendOverlayAppearanceParams(base, { color: '#ef4444', scale: 'sm' });
        expect(withParams).toContain('color=%23ef4444');
        expect(withParams).toContain('scale=sm');
        expect(withParams).toContain('overlayToken=abc');
    });

    it('overlayAppearanceStyle aplica zoom y --primary', () => {
        const style = overlayAppearanceStyle({
            color: '#00ff66',
            scale: 'lg',
            scaleValue: 1.25
        }) as Record<string, unknown>;
        expect(style.zoom).toBe(1.25);
        expect(style['--primary']).toBe('#00ff66');
    });

    it('safeOverlayUrlColor acepta hex/preset y rechaza CSS raro', () => {
        expect(safeOverlayUrlColor('?color=%239146ff')).toBe('#9146ff');
        expect(safeOverlayUrlColor('?theme=purple')).toBe('purple');
        expect(safeOverlayUrlColor('?color=%23ff007f%3Bbackground%3Aurl(x)')).toBeUndefined();
        expect(safeOverlayUrlColor('?color=red)%20url(evil)')).toBeUndefined();
    });
});
