import {
  Sparkles,
  ShieldCheck,
  Zap,
  Camera,
  Shirt,
  Palette,
  Maximize2,
  ArrowRight,
} from "lucide-react";
import UploadCard from "./UploadCard";
import { BeforeAfterSlider } from "./BeforeAfterSlider";
import type { UploadStatus } from "../types";
import type { CloudinaryUploadResult } from "../cloudinary/UploadWidget";

interface LandingPageProps {
  uploadStatus: UploadStatus;
  uploadError: string | null;
  onUploadError: (error: Error) => void;
  onUploadStart: () => void;
  onUploadSuccess: (result: CloudinaryUploadResult) => void;
  onUseSample: () => void;
  onTryPreset: (presetId: string) => void;
}

const SAMPLE_BEFORE_URL =
  "https://res.cloudinary.com/dwbhfydeg/image/upload/c_fill,w_600,h_750,g_auto/samples/people/smiling-man.jpg";
const SAMPLE_AFTER_URL =
  "https://res.cloudinary.com/dwbhfydeg/image/upload/e_gen_background_replace:prompt_modern%20corporate%20executive%20office%20with%20bookshelves%20and%20professional%20soft%20portrait%20lighting%20bokeh/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/people/smiling-man.jpg";

const FEATURED_STYLES = [
  {
    id: "corporate-executive",
    name: "Corporate Executive",
    tagline: "Modern office with bookshelf & soft key light bokeh",
    badge: "Executive",
    imageUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/e_gen_background_replace:prompt_modern%20corporate%20executive%20office%20with%20bookshelves%20and%20professional%20soft%20portrait%20lighting%20bokeh/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/people/smiling-man.jpg",
  },
  {
    id: "studio-minimal",
    name: "Studio Minimalist",
    tagline: "Neutral grey studio backdrop with crisp rim light",
    badge: "Studio",
    imageUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/e_gen_background_replace:prompt_minimalist%20neutral%20grey%20photo%20studio%20backdrop%20soft%20rim%20lighting/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/people/smiling-man.jpg",
  },
  {
    id: "outdoor-professional",
    name: "Outdoor Professional",
    tagline: "Natural golden hour sunlight with lush garden bokeh",
    badge: "Natural",
    imageUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/e_gen_background_replace:prompt_outdoor%20garden%20with%20trees%20golden%20hour%20sunlight%20natural%20bokeh/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/people/smiling-man.jpg",
  },
  {
    id: "urban-business",
    name: "Urban Business",
    tagline: "City skyline architectural depth with soft street bokeh",
    badge: "Urban",
    imageUrl:
      "https://res.cloudinary.com/dwbhfydeg/image/upload/e_gen_background_replace:prompt_modern%20city%20skyline%20architectural%20depth%20soft%20street%20bokeh%20business%20district/c_fill,w_600,h_750,g_auto/f_auto/q_auto/samples/people/smiling-man.jpg",
  },
];

export function LandingPage({
  uploadStatus,
  uploadError,
  onUploadError,
  onUploadStart,
  onUploadSuccess,
  onUseSample,
  onTryPreset,
}: LandingPageProps) {
  const scrollToUpload = () => {
    document.getElementById("upload-dropzone")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative overflow-hidden">
      {/* Background radial glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.22),transparent_70%)]" />

      {/* HERO SECTION */}
      <section className="relative px-4 pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-14">
            {/* Left Column: Value Prop & Compact Upload */}
            <div className="lg:col-span-7">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs sm:text-sm font-medium text-indigo-300">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                AI-Powered Professional Headshots
              </div>

              <h1 className="mb-5 text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                Generate Studio-Quality{" "}
                <span className="gradient-text">AI Headshots</span>
                <br className="hidden sm:inline" />
                From Any Selfie
              </h1>

              <p className="mb-8 max-w-2xl text-base text-white/70 sm:text-lg">
                Turn casual smartphone selfies into polished executive portraits for LinkedIn, resumes,
                and company websites. Swap outfits, adjust lighting, and change backdrops in seconds.
              </p>

              {/* Integrated Dropzone Box */}
              <div id="upload-dropzone" className="max-w-xl">
                <UploadCard
                  uploadStatus={uploadStatus}
                  uploadError={uploadError}
                  onUploadError={onUploadError}
                  onUploadStart={onUploadStart}
                  onUploadSuccess={onUploadSuccess}
                  onUseSample={onUseSample}
                  compact={true}
                />
              </div>

              {/* Trust & Guarantee Badges */}
              <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-white/60">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>100% Private & Secure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-indigo-400" />
                  <span>Generates in ~10 seconds</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Camera className="h-4 w-4 text-sky-400" />
                  <span>4K High-Res Export</span>
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
                      Live AI Transformation
                    </span>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Interactive
                  </span>
                </div>

                {/* Comparison Slider */}
                <BeforeAfterSlider
                  beforeImageUrl={SAMPLE_BEFORE_URL}
                  afterImageUrl={SAMPLE_AFTER_URL}
                  beforeAlt="Original casual selfie"
                  afterAlt="AI enhanced corporate headshot"
                  className="rounded-xl"
                />

                <div className="mt-3 flex items-center justify-between px-1 text-xs text-white/60">
                  <span>↔ Drag slider to compare</span>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">
                      👔 Executive Suit
                    </span>
                    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/80">
                      🏢 Office Bokeh
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POPULAR STYLES SHOWCASE */}
      <section className="border-t border-white/10 bg-white/[0.015] px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
              Tailored Lighting & Environments
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Explore Popular Headshot Styles
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-white/60">
              Choose from executive boardrooms, clean studio backdrops, and natural golden hour lighting
              calibrated for high-impact professional profiles.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_STYLES.map((style) => (
              <div
                key={style.id}
                className="glass-card group overflow-hidden border border-white/10 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-500/10 flex flex-col"
              >
                <div className="relative aspect-[4/5] overflow-hidden bg-black/40">
                  <img
                    src={style.imageUrl}
                    alt={style.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 rounded-full bg-black/70 px-2.5 py-0.5 text-[11px] font-medium text-white/90 backdrop-blur-md border border-white/10">
                    {style.badge}
                  </div>
                </div>

                <div className="p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-white group-hover:text-indigo-300 transition">
                      {style.name}
                    </h3>
                    <p className="mt-1 text-xs text-white/60 line-clamp-2">
                      {style.tagline}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onTryPreset(style.id)}
                    className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/5 py-2 px-3 text-xs font-semibold text-white/90 hover:bg-indigo-600 hover:text-white transition cursor-pointer border border-white/10 hover:border-transparent"
                  >
                    <span>Try this style</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STUDIO CAPABILITIES & FEATURES */}
      <section className="border-t border-white/10 px-4 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need for the Perfect Portrait
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm sm:text-base text-white/60">
              Powered by Cloudinary Generative AI to deliver natural reflections, true-to-life lighting,
              and photorealistic wardrobe transitions.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="glass-card p-8 border border-white/10 transition hover:border-indigo-500/30">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                <Shirt className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">AI Wardrobe & Outfit Studio</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Swap your casual t-shirt into a charcoal wool blazer, a formal navy suit and silk tie,
                or a sleek tech turtleneck without ever changing clothes.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-8 border border-white/10 transition hover:border-indigo-500/30">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                <Palette className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">Custom Backdrop Studio</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Choose from curated studio presets or describe any environment you want. Our generative
                background replace engine handles depth of field and rim lighting automatically.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-8 border border-white/10 transition hover:border-indigo-500/30">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
                <Maximize2 className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">LinkedIn & Resume Ready</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                One-click toggle between 1:1 square for LinkedIn profile avatars and 4:5 portrait for
                resumes, with subtle retouch filters and direct clipboard copying.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (3 STEPS) */}
      <section className="border-t border-white/10 bg-white/[0.015] px-4 py-16 md:py-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Three Simple Steps to Your New Headshot
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-lg">
                1
              </div>
              <h3 className="text-base font-semibold text-white">Upload Your Selfie</h3>
              <p className="mt-1 text-xs sm:text-sm text-white/60">
                Pick a clear, front-facing photo from your smartphone or computer.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-lg">
                2
              </div>
              <h3 className="text-base font-semibold text-white">Select Style & Attire</h3>
              <p className="mt-1 text-xs sm:text-sm text-white/60">
                Choose from studio lighting, outdoor bokeh, and executive wardrobe options.
              </p>
            </div>

            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 font-bold text-lg">
                3
              </div>
              <h3 className="text-base font-semibold text-white">Export & Download</h3>
              <p className="mt-1 text-xs sm:text-sm text-white/60">
                Get high-resolution headshots sized perfectly for LinkedIn, resumes, and web.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="border-t border-white/10 px-4 py-16 md:py-20">
        <div className="mx-auto max-w-4xl">
          <div className="glass-card relative overflow-hidden p-8 sm:p-12 text-center border border-indigo-500/30 bg-gradient-to-b from-indigo-950/30 to-black/40">
            <div className="pointer-events-none absolute -top-24 -left-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-indigo-500/20 blur-3xl" />

            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Ready to Upgrade Your Professional Image?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-white/70">
              No expensive photographer or studio rental required. Generate your polished AI headshots
              right now in under a minute.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={scrollToUpload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3.5 text-sm font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/25 cursor-pointer"
              >
                Upload Your Selfie
                <ArrowRight className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={onUseSample}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-6 py-3.5 text-sm font-medium text-white hover:bg-white/15 transition cursor-pointer border border-white/10"
              >
                ⚡ Try With Sample Photo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/40">
        <p>AI Headshot · Studio-Quality Portraits Powered by Cloudinary Generative AI</p>
      </footer>
    </div>
  );
}
