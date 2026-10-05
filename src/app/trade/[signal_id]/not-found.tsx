import Link from "next/link";

export default function SignalNotFound() {
  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Signal not found</h1>
      <p className="text-sm text-muted">No signal with that id exists in the tracker.</p>
      <p>
        <Link href="/" className="text-sm underline underline-offset-4">
          Back to the dashboard
        </Link>
      </p>
    </main>
  );
}
