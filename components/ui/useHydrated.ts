'use client';

import { useEffect, useState } from 'react';

/**
 * False until the page's JavaScript is running. A form's submit button uses it
 * to stay disabled until then: pressed earlier (easy on a slow phone), the
 * browser would submit the plain HTML form instead, reloading the page and
 * clearing what was typed.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
