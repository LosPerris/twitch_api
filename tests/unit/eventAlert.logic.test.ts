import { describe, expect, it } from '@jest/globals';
import { eventsubTypeToKind, renderEventAlertMessage } from '../../backend/src/features/alerts/eventAlert.logic';

describe('eventAlert.logic', () => {
    it('renders placeholders', () => {
        expect(renderEventAlertMessage('Hi {name}!', { name: 'Ada' })).toBe('Hi Ada!');
        expect(renderEventAlertMessage('Raid {name} {viewers}', { name: 'Bob', viewers: 42 })).toBe(
            'Raid Bob 42'
        );
    });

    it('maps EventSub types', () => {
        expect(eventsubTypeToKind('channel.follow')).toBe('follow');
        expect(eventsubTypeToKind('channel.cheer')).toBeNull();
    });
});