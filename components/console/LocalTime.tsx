'use client';

import { useEffect, useState } from 'react';

/**
 * A date and time in the viewer's own timezone. The server does not know that
 * timezone, so the date alone (UTC) is shown until the page loads.
 */
export default function LocalTime({ iso, time = true }: { iso: string; time?: boolean }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    setText(
      new Date(iso).toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        ...(time ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' as const } : {}),
      }),
    );
  }, [iso, time]);
  return <time dateTime={iso}>{text ?? iso.slice(0, 10)}</time>;
}
