"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-xl font-semibold">Tracker database is unreachable</h1>
      <p className="mt-2 text-sm text-muted">
        The paper P&amp;L could not be loaded, so no figures are shown. The database may be paused or
        temporarily offline.
      </p>
      <button
        onClick={() => retry()}
        className="mt-6 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium hover:bg-chip"
      >
        Try again
      </button>
    </main>
  );
}
