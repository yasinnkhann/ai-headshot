import { Sparkles } from "lucide-react";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pt-16 pb-8 text-center md:pt-24 md:pb-12">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.25),transparent_60%)]" />
      <div className="relative mx-auto max-w-4xl">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-sm text-indigo-300">
          <Sparkles className="h-4 w-4" />
          AI-powered professional photos
        </div>
        <h1 className="mb-6 text-4xl font-bold tracking-tight md:text-6xl">
          Generate Professional{" "}
          <span className="gradient-text">AI Headshots</span>
          <br />
          From Any Selfie
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-white/70">
          Upload a selfie, pick a style, and get a polished headshot with outfit
          and background changes in minutes.
        </p>
      </div>
    </section>
  );
}
