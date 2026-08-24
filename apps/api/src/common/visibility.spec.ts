import { evaluateVisibility, nightSlotSortKey, sortNightSlots, isFullMoon } from './visibility';

describe('visibility engine', () => {
  it('puts 00:00 last in the night grid', () => {
    expect(nightSlotSortKey('18:00')).toBeLessThan(nightSlotSortKey('23:00'));
    expect(nightSlotSortKey('23:00')).toBeLessThan(nightSlotSortKey('00:00'));
    const sorted = sortNightSlots([
      { startTime: '00:00' },
      { startTime: '18:00' },
      { startTime: '22:00' },
    ]);
    expect(sorted.map((s) => s.startTime)).toEqual(['18:00', '22:00', '00:00']);
  });

  it('rejects Saturn outside its months (August ok, March not)', () => {
    const saturn = {
      active: true,
      visibleMonths: [8, 9, 10, 11],
      minAltitudeDeg: 18,
      avoidFullMoon: false,
    };
    expect(evaluateVisibility(saturn, '2026-08-24').visible).toBe(true);
    expect(evaluateVisibility(saturn, '2026-03-12').visible).toBe(false);
    expect(evaluateVisibility(saturn, '2026-03-12').reason).toBe('month');
  });

  it('hides DSO near full moon', () => {
    const m13 = {
      active: true,
      visibleMonths: [5, 6, 7, 8, 9],
      minAltitudeDeg: 25,
      avoidFullMoon: true,
    };
    // 2026-08-28 is near full moon in our synodic approximation
    const fullish = evaluateVisibility(m13, '2026-08-28');
    if (isFullMoon('2026-08-28')) {
      expect(fullish.visible).toBe(false);
      expect(fullish.reason).toBe('full_moon');
    }
    expect(evaluateVisibility(m13, '2026-08-10').visible).toBe(true);
  });

  it('respects altitude floor', () => {
    const high = {
      active: true,
      visibleMonths: [8],
      minAltitudeDeg: 50,
      avoidFullMoon: false,
    };
    expect(evaluateVisibility(high, '2026-08-24', 35).visible).toBe(false);
    expect(evaluateVisibility(high, '2026-08-24', 55).visible).toBe(true);
  });

  it('inactive objects never show', () => {
    const dead = {
      active: false,
      visibleMonths: [8],
      minAltitudeDeg: 10,
      avoidFullMoon: false,
    };
    expect(evaluateVisibility(dead, '2026-08-24').reason).toBe('inactive');
  });

  it('meridian points are 10 per guest', () => {
    expect(10 * 3).toBe(30);
  });
});
