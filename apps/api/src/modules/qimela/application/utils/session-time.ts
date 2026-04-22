function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function padMilliseconds(value: number): string {
  return String(value).padStart(3, '0');
}

const DEFAULT_QIMELA_TIME_ZONE = process.env.QIMELA_TIME_ZONE ?? 'America/Mexico_City';

export function toFloatingTimestampDate(date: Date): Date {
  return new Date(
    Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    ),
  );
}

function getTimeZoneParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.get('year')),
    month: Number(values.get('month')),
    day: Number(values.get('day')),
    hour: Number(values.get('hour')),
    minute: Number(values.get('minute')),
    second: Number(values.get('second')),
  };
}

export function toFloatingTimestampDateInTimeZone(date: Date, timeZone: string): Date {
  const parts = getTimeZoneParts(date, timeZone);

  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      date.getUTCMilliseconds(),
    ),
  );
}

export function getFloatingNow(timeZone = DEFAULT_QIMELA_TIME_ZONE): Date {
  return toFloatingTimestampDateInTimeZone(new Date(Date.now()), timeZone);
}

export function formatFloatingIso(date: Date): string {
  return [
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${padMilliseconds(date.getUTCMilliseconds())}`,
  ].join('');
}
