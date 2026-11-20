import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'HeatShield · Choose your role' };

const card = 'flex min-h-48 flex-col gap-3 rounded-sheet border-2 border-ink bg-paper p-6 shadow-lift active:translate-y-[2px] active:shadow-none';

function BoardIcon() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="3"><rect x="5" y="8" width="38" height="26" rx="2" /><path d="M17 42h14M24 34v8M12 16h8v6h-8zM24 16h12M24 24h12" /></svg>;
}
function PhoneIcon() {
  return <svg aria-hidden="true" viewBox="0 0 48 48" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="3"><rect x="13" y="4" width="22" height="40" rx="4" /><path d="M21 38h6M18 13h5v5h-5zM25 13h5v5h-5zM18 20h5v5h-5z" /></svg>;
}

export default function StartPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-4xl flex-col justify-center gap-6 bg-paper px-4 py-8 text-ink sm:px-6">
      <Link href="/" className="text-lg font-semibold">HeatShield</Link>
      <h1 className="text-[clamp(2rem,5vw,3rem)] font-semibold leading-tight tracking-[-0.03em]">Who is using this screen?</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/supervisor" className={card}>
          <BoardIcon />
          <span className="text-2xl font-semibold">I&apos;m a supervisor</span>
          <span className="text-lg">Start the shift on a laptop or tablet. Your crew scans the QR code to join.</span>
        </Link>
        <Link href="/worker" className={card}>
          <PhoneIcon />
          <span className="text-2xl font-semibold">I&apos;m a worker</span>
          <span className="text-lg">Scan your supervisor&apos;s QR code with your phone camera.</span>
        </Link>
      </div>
      <p className="text-base text-muted">
        Just looking? <Link href="/demo" className="font-semibold text-ink underline underline-offset-4">Run the 15 July demo</Link>: no phone needed.
      </p>
    </main>
  );
}
