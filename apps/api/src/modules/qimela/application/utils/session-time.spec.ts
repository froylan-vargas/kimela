import { getFloatingNow, toFloatingTimestampDateInTimeZone } from './session-time';

describe('session-time utils', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('converts an absolute instant to floating Mexico City wall-clock time', () => {
    const date = new Date('2026-04-21T23:50:00.000Z');

    expect(toFloatingTimestampDateInTimeZone(date, 'America/Mexico_City')).toEqual(
      new Date('2026-04-21T17:50:00.000Z'),
    );
  });

  it('gets floating now using the qimela time zone instead of server local time', () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-21T23:50:00.000Z').getTime());

    expect(getFloatingNow()).toEqual(new Date('2026-04-21T17:50:00.000Z'));
  });
});
