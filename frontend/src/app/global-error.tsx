"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="bg-[#eef8da] text-[#123b21]">
        <main className="flex min-h-screen items-center justify-center p-6 text-center">
          <div>
            <h1 className="text-xl font-extrabold">SocialPulse is waking up</h1>
            <button onClick={() => reset()} className="mt-5 rounded-xl bg-[#123b21] px-5 py-2 text-sm font-bold text-white">Reload</button>
          </div>
        </main>
      </body>
    </html>
  );
}
