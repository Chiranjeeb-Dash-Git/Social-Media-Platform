"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef8da] p-6 text-[#123b21]">
      <div className="rounded-[20px] border border-[#123b21]/15 bg-white/70 p-8 text-center shadow-xl backdrop-blur">
        <h1 className="text-xl font-extrabold">This garden needs a moment</h1>
        <p className="mt-2 text-sm text-[#4d6656]">Something went wrong while loading this page.</p>
        <button onClick={() => reset()} className="mt-5 rounded-xl bg-[#123b21] px-5 py-2 text-sm font-bold text-[#eafbe4]">
          Try again
        </button>
      </div>
    </main>
  );
}
