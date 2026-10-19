'use client';

import { useEffect, useState } from 'react';

const longFormat = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * A session time in the viewer's own timezone. The server does not know that
 * timezone, so the text is filled in after the page loads rather than risk
 * showing the server's clock.
 */
export default function LocalTime({ iso, className }: { iso: string; className?: string }) {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => setText(longFormat.format(new Date(iso))), [iso]);
  return (
    <time dateTime={iso} className={className}>
      {text ?? ' '}
    </time>
  );
}
