import {
  Sparkles,
  ShieldCheck,
  Zap,
  Infinity as InfinityIcon,
  Wand2,
  Layers,
  SlidersHorizontal,
  ArrowRight,
  Cpu,
} from "lucide-react";
import UploadCard from "./UploadCard";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import type {
  CloudinaryUploadResult,
  LocalAiHealth,
  SamplePhoto,
  StudioPreset,
  UploadStatus,
} from "../types";
import { CURATED_STUDIO_PRESETS, SAMPLE_PHOTOS } from "../lib/studio-engine";

interface LandingPageProps {
  uploadStatus: UploadStatus;
  uploadError: string | null;
  localHealth: LocalAiHealth | null;
  onUploadError: (error: Error) => void;
  onUploadStart: () => void;
  onUploadSuccess: (result: CloudinaryUploadResult) => void;
  onLocalOnlyUpload: (dataUrl: string) => void;
  onSelectSample: (sample: SamplePhoto, preset?: StudioPreset) => void;
  onOpenSetupModal?: () => void;
}

const SAMPLE_BEFORE_URL =
  "https://res.cloudinary.com/dwbhfydeg/image/upload/c_fill,w_600,h_750,g_auto/samples/people/smiling-man.jpg";
const SAMPLE_AFTER_URL =
  "https://res.cloudinary.com/dwbhfydeg/image/upload/e_gen_background_replace:prompt_modern%20corporate%20executive%20office%20with%20bookshelves%20and%20professional%20soft%20portrait%20lighting%20bokeh/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/people/smiling-man.jpg";

interface ShowcaseCardItem {
  id: string;
  title: string;
  tagline: string;
  badge: string;
  imageUrl: string;
  fallbackUrl: string;
  sampleId: string;
  presetId: string;
}

const SHOWCASE_CARDS: ShowcaseCardItem[] = [
  {
    id: "scene-swap",
    title: "Swap Any Scene",
    tagline: "Transport portraits or objects into executive offices, Tokyo nights, or beaches",
    badge: "Backdrop AI",
    imageUrl: SAMPLE_AFTER_URL,
    fallbackUrl: SAMPLE_BEFORE_URL,
    sampleId: "portrait-man",
    presetId: "corporate-executive",
  },
  {
    id: "object-replace",
    title: "Replace Objects & Outfits",
    tagline: "Swap shirts to blazers, furniture, or props while locking facial identity",
    badge: "Replace AI",
    imageUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/e_gen_replace:from_shirt;to_tailored%20charcoal%20grey%20wool%20blazer%20jacket%20with%20crisp%20white%20dress%20shirt/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/people/smiling-man.jpg",
    fallbackUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/e_gen_background_replace:prompt_minimalist%20neutral%20grey%20photo%20studio%20backdrop%20soft%20rim%20lighting/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/people/smiling-man.jpg",
    sampleId: "portrait-man",
    presetId: "executive-blazer",
  },
  {
    id: "product-studio",
    title: "Commercial Product Studio",
    tagline: "Turn casual product snapshots into luxury marble or obsidian studio shots",
    badge: "Product AI",
    imageUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/e_gen_background_replace:prompt_sleek%20matte%20black%20obsidian%20stone%20pedestal%20dark%20luxury%20product%20photography%20studio%20dramatic%20rim%20lighting/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/ecommerce/shoes.png",
    fallbackUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/ecommerce/shoes.png",
    sampleId: "product-shoe",
    presetId: "obsidian-pedestal",
  },
  {
    id: "magic-expand",
    title: "Recolor, Erase & Expand",
    tagline: "Recolor objects, outpaint shots to 16:9 widescreen, or erase distractions",
    badge: "Photoshop AI",
    imageUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/e_gen_recolor:prompt_bicycle;to-color_crimson/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/people/bicycle.jpg",
    fallbackUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/people/bicycle.jpg",
    sampleId: "street-bike",
    presetId: "magic-expand-16-9",
  },
];

export function LandingPage({
  uploadStatus,
  uploadError,
  localHealth,
  onUploadError,
  onUploadStart,
  onUploadSuccess,
  onLocalOnlyUpload,
  onSelectSample,
  onOpenSetupModal,
}: LandingPageProps) {
  const scrollToUpload = () => {
    document
      .getElementById("upload-dropzone")
      ?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTryCard = (card: ShowcaseCardItem) => {
    const sample =
      SAMPLE_PHOTOS.find((s) => s.id === card.sampleId) || SAMPLE_PHOTOS[0];
    const preset = CURATED_STUDIO_PRESETS.find((p) => p.id === card.presetId);
    onSelectSample(sample, preset);
  };

  const localConnected = Boolean(localHealth?.ok && localHealth.mfluxInstalled);

  return (
    <div className="relative overflow-hidden">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.22),transparent_70%)]" />

      {/* HERO SECTION */}
      <section className="relative px-4 pt-10 pb-16 md:pt-14 md:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
            {/* Left Column: Value Prop + Embedded Upload */}
            <div className="lg:col-span-7">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-indigo-300">
                  <Sparkles className="h-4 w-4 text-indigo-400" />
                  Alterx · Prompt-Driven AI Studio
                </div>

                {localConnected ? (
                  <button
                    type="button"
                    onClick={onOpenSetupModal}
                    className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition cursor-pointer"
                    title="Click for Local Mac AI hardware status"
                  >
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <Cpu className="h-3.5 w-3.5" />
                    Mac Local AI Ready (Unlimited)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenSetupModal}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-white/75 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200 transition cursor-pointer"
                    title="Click to connect or set up unlimited $0 Mac Local AI"
                  >
                    <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Optional $0 Mac Local AI</span>
                  </button>
                )}
              </div>

              <h1 className="mb-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Upload Any Photo.{" "}
                <span className="gradient-text">Tell AI to Make It</span>{" "}
                Anything.
              </h1>

              <p className="mb-8 max-w-2xl text-base text-white/70 sm:text-lg">
                Your personal, uncapped Photoshop studio. Swap scenes, replace objects,
                erase distractions, recolor anything, or run unlimited free Apple Silicon
                AI edits directly on your Mac with zero ChatGPT limits.
              </p>

              {/* Embedded Upload Dropzone */}
              <div id="upload-dropzone" className="max-w-xl">
                <UploadCard
                  uploadStatus={uploadStatus}
                  uploadError={uploadError}
                  onUploadError={onUploadError}
                  onUploadStart={onUploadStart}
                  onUploadSuccess={onUploadSuccess}
                  onLocalOnlyUpload={onLocalOnlyUpload}
                  onSelectSample={(sample) => onSelectSample(sample)}
                  preferLocalOnly={localConnected}
                  compact={true}
                />
              </div>

              {/* Trust Badges */}
              <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-white/60">
                <button
                  type="button"
                  onClick={onOpenSetupModal}
                  className="flex items-center gap-1.5 hover:text-white transition cursor-pointer"
                  title="View Mac Local AI setup guide"
                >
                  <InfinityIcon className="h-4 w-4 text-emerald-400" />
                  <span>Unlimited Local Mac AI ($0)</span>
                </button>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-indigo-400" />
                  <span>7 Surgical Cloud Photoshop Tools</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-sky-400" />
                  <span>Zero Subscriptions or Credit Cards</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Before/After Showcase */}
            <div className="lg:col-span-5">
              <div className="glass-card overflow-hidden p-4 sm:p-5 shadow-2xl border border-white/15">
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-400" />
                    <span className="text-xs sm:text-sm font-semibold text-white/90">
                      Identity-Locked AI Editing
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Interactive
                  </span>
                </div>

                <BeforeAfterSlider
                  beforeImageUrl={SAMPLE_BEFORE_URL}
                  afterImageUrl={SAMPLE_AFTER_URL}
                  beforeAlt="Original photo"
                  afterAlt="AI transformed scene"
                  className="rounded-xl"
                />

                <div className="mt-3 flex items-center justify-between px-1 text-xs text-white/60">
                  <span>↔ Drag slider to compare</span>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">
                      🪄 Replace
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">
                      🧹 Erase
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">
                      🖼️ Restyle
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CAPABILITIES SHOWCASE */}
      <section className="border-t border-white/10 bg-white/[0.015] px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <Wand2 className="h-3.5 w-3.5" />
              Not Just Headshots — Edit Anything
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Explore What You Can Create
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-white/60">
              Jump straight into the studio with any sample photo below to test layered
              Photoshop edits or unlimited local Apple Silicon transformations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SHOWCASE_CARDS.map((card) => (
              <div
                key={card.id}
                className="glass-card group overflow-hidden border border-white/10 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-black/40">
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src !== card.fallbackUrl) {
                        img.src = card.fallbackUrl;
                      }
                    }}
                  />
                  <div className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-md border border-white/10">
                    {card.badge}
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition">
                      {card.title}
                    </h3>
                    <p className="mt-1 text-xs text-white/60 line-clamp-2">
                      {card.tagline}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleTryCard(card)}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2 px-3 text-xs font-semibold text-white/90 hover:bg-indigo-600 hover:text-white transition cursor-pointer border border-white/10 hover:border-transparent"
                  >
                    <span>Try this edit</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3-PILLAR FEATURE SPOTLIGHT */}
      <section className="border-t border-white/10 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Two Powerful AI Engines, One Seamless Canvas
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-white/60">
              Switch effortlessly between unlimited local Apple Silicon AI on your Mac and
              fast cloud Photoshop layers that work from anywhere.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="glass-card p-8 border border-white/10 transition hover:border-emerald-500/30">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <Cpu className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Unlimited Local Mac AI (mflux)
              </h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Run FLUX.2 Klein 4B or Qwen Image 2.1 Turbo with built-in Auto-Masking
                directly on your Apple Silicon GPU. Zero subscriptions, zero daily limits,
                and multi-turn conversational editing.
              </p>
            </div>

            <div className="glass-card p-8 border border-white/10 transition hover:border-indigo-500/30">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Non-Destructive Cloud Layers
              </h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Stack Magic Eraser, Object Replace, Recolor, Background Swap, AI Restore,
                Transparent Cutout, and 16:9 Magic Expand as toggleable layers that leave
                untouched face pixels 100% real.
              </p>
            </div>

            <div className="glass-card p-8 border border-white/10 transition hover:border-sky-500/30">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/15 text-sky-400">
                <SlidersHorizontal className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">
                Real-Time 60fps Grading & Export
              </h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Fine-tune exposure, temperature, saturation, contrast, clarity, and
                vignette at 60fps in the browser, then export pixel-accurate PNG, JPG, or
                WEBP straight to disk or clipboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3-STEP HOW IT WORKS */}
      <section className="border-t border-white/10 bg-white/[0.015] px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              From Raw Photo to Finished Edit in 3 Steps
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-lg">
                1
              </div>
              <h3 className="text-base font-semibold text-white">Drop Any Photo</h3>
              <p className="mt-1 text-xs sm:text-sm text-white/60">
                Portraits, products, rooms, pets, or travel snapshots — anything goes.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-lg">
                2
              </div>
              <h3 className="text-base font-semibold text-white">Describe Your Vision</h3>
              <p className="mt-1 text-xs sm:text-sm text-white/60">
                Type plain English edits, target specific objects with Auto-Mask, or stack
                non-destructive layers.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-lg">
                3
              </div>
              <h3 className="text-base font-semibold text-white">Grade & Export</h3>
              <p className="mt-1 text-xs sm:text-sm text-white/60">
                Compare before & after, dial in 60fps light and color, and download or
                copy in one click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="border-t border-white/10 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="glass-card relative overflow-hidden p-8 sm:p-12 text-center border border-indigo-500/30 bg-gradient-to-b from-indigo-950/30 to-black/40">
            <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Ready to Edit Without Limits?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-white/70">
              Upload your photo now or open a sample shot to explore the full studio.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={scrollToUpload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/25 cursor-pointer"
              >
                Open Photo in Studio
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => onSelectSample(SAMPLE_PHOTOS[0])}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3.5 text-sm font-medium text-white hover:bg-white/15 transition cursor-pointer border border-white/10"
              >
                ⚡ Try With Sample Photo
              </button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/40">
        <p>
          Alterx · Powered by Local Apple Silicon MLX (mflux) &amp; Cloudinary
          Generative AI
        </p>
      </footer>
    </div>
  );
}
