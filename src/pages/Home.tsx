import { AdvancedImage, lazyload, placeholder } from "@cloudinary/react";
import { LandingPage } from "../components/LandingPage";
import { useHeadshot } from "../hooks/use-headshot";
import TransformationGrid from "../components/TransformationGrid";
import { WardrobeStudio } from "../components/WardrobeStudio";
import ResultPreview from "../components/ResultPreview";
import { HeadshotGallery } from "../components/HeadshotGallery";
import ExportActions from "../components/ExportActions";
import { RefreshCw, Sparkles } from "lucide-react";
import type { CloudinaryUploadResult } from "../cloudinary/UploadWidget";

const SAMPLE_IMAGE_RESULT: CloudinaryUploadResult = {
  public_id: "samples/people/smiling-man",
  resource_type: "image",
  secure_url: "https://res.cloudinary.com/dwbhfydeg/image/upload/samples/people/smiling-man.jpg",
  url: "http://res.cloudinary.com/dwbhfydeg/image/upload/samples/people/smiling-man.jpg",
  width: 849,
  height: 565,
  format: "jpg",
  bytes: 338794,
  created_at: new Date().toISOString(),
};

export default function Home() {
  const headshot = useHeadshot();

  const handleUseSample = () => {
    headshot.handleUploadSuccess(SAMPLE_IMAGE_RESULT);
  };

  const handleTryPreset = (presetId: string) => {
    headshot.handleUploadSuccess(SAMPLE_IMAGE_RESULT);
    headshot.selectPreset(presetId);
  };

  const handleReset = () => {
    headshot.resetUpload();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-bold">
            AI <span className="text-indigo-400">Headshot</span>
          </span>
        </div>

        {headshot.hasUpload && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium text-white/90 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
            Upload Different Photo
          </button>
        )}
      </header>

      {!headshot.hasUpload ? (
        <LandingPage
          uploadStatus={headshot.uploadStatus}
          uploadError={headshot.uploadError}
          onUploadError={headshot.handleUploadError}
          onUploadStart={headshot.handleUploadStart}
          onUploadSuccess={headshot.handleUploadSuccess}
          onUseSample={handleUseSample}
          onTryPreset={handleTryPreset}
        />
      ) : (
        <main className="pb-16">
          {headshot.originalImage && (
            <section className="px-4 py-6">
              <div className="mx-auto max-w-sm text-center">
                <div className="mb-3 flex items-center justify-between px-1">
                  <h3 className="text-sm font-semibold text-white/90">Your Uploaded Selfie</h3>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Change
                  </button>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/30 shadow-lg">
                  <AdvancedImage
                    cldImg={headshot.originalImage}
                    plugins={[placeholder({ mode: "blur" }), lazyload()]}
                    alt="Original Upload"
                    className="mx-auto w-full object-cover"
                  />
                </div>
              </div>
            </section>
          )}

          <TransformationGrid
            title="Choose a Headshot Style"
            presets={headshot.presetImages}
            originalImage={headshot.originalImage}
            selectedPresetId={headshot.selectedPresetId}
            onSelect={headshot.selectPreset}
            onGenerateCustom={headshot.generateCustomPreset}
            customPreset={headshot.customPreset}
          />

          <WardrobeStudio
            activeWardrobe={headshot.activeWardrobe}
            onWardrobeChange={headshot.setActiveWardrobe}
          />

          <ResultPreview
            originalImage={headshot.originalImage}
            selectedImage={headshot.selectedImage}
            selectedPreset={headshot.selectedPreset}
            aspectRatio={headshot.aspectRatio}
            onAspectRatioChange={headshot.setAspectRatio}
            activeFilter={headshot.activeFilter}
            onFilterChange={headshot.setActiveFilter}
            activeWardrobe={headshot.activeWardrobe}
            onAddToGallery={headshot.addToGallery}
          />

          <HeadshotGallery
            gallery={headshot.gallery}
            activeUrl={headshot.selectedImage?.toURL()}
            onSelect={headshot.restoreGalleryItem}
            onRemove={headshot.removeFromGallery}
          />

          {headshot.publicId && headshot.selectedPreset && (
            <ExportActions
              publicId={headshot.publicId}
              selectedPreset={headshot.selectedPreset}
              aspectRatio={headshot.aspectRatio}
              filter={headshot.activeFilter}
              wardrobe={headshot.activeWardrobe}
            />
          )}
        </main>
      )}
    </div>
  );
}
