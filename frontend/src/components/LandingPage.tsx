"use client";

import { ArrowRight, MessageCircle, Users, Sparkles, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export function LandingPage() {
  const router = useRouter();
  return (
    <main className="min-h-[calc(100vh-4rem)] overflow-hidden bg-[#0A100D] text-[#F6F2EA]">
      <section className="relative mx-auto max-w-7xl px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <div className="pointer-events-none absolute -left-32 top-12 h-72 w-72 rounded-full bg-[#FF5A36]/20 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-[#14E3A4]/15 blur-3xl" />
        <div className="relative grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#14E3A4]/30 bg-[#14E3A4]/10 px-4 py-2 text-xs font-bold tracking-[.18em] text-[#14E3A4] uppercase">
              <Sparkles className="h-4 w-4" /> Your people. Your pulse.
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[.98] tracking-[-.055em] sm:text-7xl">
              Post it. Talk it out. <span className="text-[#FF5A36]">Build your people.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#C8D0C9]">
              SocialPulse is a real-time social space for sharing moments, finding your communities, and keeping conversations close.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <button onClick={() => router.push("/register")} className="inline-flex items-center gap-2 rounded-full bg-[#FF5A36] px-6 py-3.5 font-black text-white shadow-lg shadow-[#FF5A36]/20 transition hover:-translate-y-0.5 hover:bg-[#ff704f]">
                Get started <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => router.push("/login")} className="rounded-full border border-white/20 px-6 py-3.5 font-bold text-[#F6F2EA] transition hover:bg-white/10">
                Log in
              </button>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-[#A9B4AC]">
              <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#14E3A4]" /> Real accounts only</span>
              <span className="flex items-center gap-2"><Users className="h-4 w-4 text-[#FFB020]" /> Real communities</span>
            </div>
          </div>
          <div className="relative min-h-[390px]">
            <div className="absolute left-0 top-5 w-64 rotate-[-7deg] rounded-3xl border border-white/15 bg-white/[.08] p-5 shadow-2xl backdrop-blur-xl sm:left-8">
              <div className="text-xs font-bold text-[#FFB020]">CREATE</div>
              <div className="mt-5 h-24 rounded-2xl bg-gradient-to-br from-[#FF5A36] to-[#F2A488]" />
              <p className="mt-4 text-sm font-bold">Share the moment while it is happening.</p>
            </div>
            <div className="absolute right-0 top-28 w-64 rotate-[7deg] rounded-3xl border border-white/15 bg-white/[.08] p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-[#14E3A4]"><MessageCircle className="h-4 w-4" /> CHAT</div>
              <div className="mt-5 space-y-2"><div className="ml-auto h-8 w-36 rounded-2xl rounded-br-sm bg-[#14E3A4]" /><div className="h-8 w-44 rounded-2xl rounded-bl-sm bg-white/15" /></div>
              <p className="mt-4 text-sm font-bold">Conversations that feel close.</p>
            </div>
            <div className="absolute bottom-0 left-16 w-64 rotate-[3deg] rounded-3xl border border-white/15 bg-white/[.08] p-5 shadow-2xl backdrop-blur-xl sm:left-28">
              <div className="text-xs font-bold text-[#FF5A36]">COMMUNITIES</div>
              <div className="mt-5 flex -space-x-3"><div className="h-12 w-12 rounded-full bg-[#FF5A36] ring-4 ring-[#101812]" /><div className="h-12 w-12 rounded-full bg-[#FFB020] ring-4 ring-[#101812]" /><div className="h-12 w-12 rounded-full bg-[#14E3A4] ring-4 ring-[#101812]" /></div>
              <p className="mt-4 text-sm font-bold">Find the people who get it.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="border-t border-white/10 bg-white/[.03] px-6 py-14 sm:px-10 lg:px-16">
        <div className="mx-auto grid max-w-7xl gap-5 md:grid-cols-3">
          {[{ icon: Sparkles, title: "Create", text: "Posts, photos, stories, and live moments that are yours." }, { icon: MessageCircle, title: "Chat", text: "Fast direct and group conversations with media and voice notes." }, { icon: Users, title: "Communities", text: "Build real groups and pages around what matters to you." }].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-3xl border border-white/10 bg-black/20 p-7"><Icon className="h-6 w-6 text-[#FFB020]" /><h2 className="mt-5 text-2xl font-black">{title}</h2><p className="mt-2 leading-7 text-[#A9B4AC]">{text}</p></div>
          ))}
        </div>
      </section>
    </main>
  );
}
