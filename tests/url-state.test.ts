import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, readState, toNumber, writeState } from '../src/lib/url-state';

describe('url-state', () => {
  it('round-trips the plan example', () => {
    const s = readState('?units=250&kw=2&gj=1&gju=150');
    expect(s).toMatchObject({ mode: 'units', units: '250', kw: '2', gj: true, gju: '150' });
    expect(writeState(s)).toBe('?units=250&kw=2&gj=1&gju=150');
  });

  it('detects meter mode', () => {
    expect(readState('?prev=1200&curr=1450').mode).toBe('meter');
    expect(writeState({ ...DEFAULT_STATE, mode: 'meter', prev: '1200', curr: '1450' })).toBe('?mode=meter&prev=1200&curr=1450');
  });

  it('ignores junk values', () => {
    const s = readState('?units=<script>&kw=abc&fm=2026-13');
    expect(s.units).toBe('');
    expect(s.kw).toBe('1');
    expect(s.fm).toBe('');
  });

  it('omits defaults', () => {
    expect(writeState(DEFAULT_STATE)).toBe('');
  });

  it('toNumber', () => {
    expect(toNumber('')).toBeUndefined();
    expect(toNumber(' 12.5 ')).toBe(12.5);
    expect(toNumber('x')).toBeNaN();
  });
});
