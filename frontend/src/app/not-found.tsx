import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eef8da] p-6 text-center text-[#123b21]">
      <div>
        <p className="text-5xl font-black">404</p>
        <h1 className="mt-3 text-xl font-extrabold">This path has not bloomed yet</h1>
        <Link href="/" className="mt-5 inline-block rounded-xl bg-[#123b21] px-5 py-2 text-sm font-bold text-white">Back home</Link>
      </div>
    </main>
  );
}
