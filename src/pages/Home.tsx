import { AdvancedImage, lazyload, placeholder } from "@cloudinary/react";
import { Hero } from "../components/Hero";
import UploadCard from "../components/UploadCard";
import { useHeadshot } from "../hooks/use-headshot";
import TransformationGrid from "../components/TransformationGrid";
import ResultPreview from "../components/ResultPreview";
import ExportActions from "../components/ExportActions";
import { RefreshCw } from "lucide-react";

export default function Home() {
  const headshot = useHeadshot();

  const handleReset = () => {
    headshot.resetUpload();
    setTimeout(() => {
      document.getElementById("upload")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="text-lg font-bold">
          <span>
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

      {!headshot.hasUpload && <Hero />}

      <UploadCard
        uploadStatus={headshot.uploadStatus}
        uploadError={headshot.uploadError}
        onUploadError={headshot.handleUploadError}
        onUploadStart={headshot.handleUploadStart}
        onUploadSuccess={headshot.handleUploadSuccess}
      />

      {headshot.hasUpload && headshot.originalImage && (
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

      {headshot.hasUpload && (
        <TransformationGrid
          title="Choose a Headshot Style"
          presets={headshot.presetImages}
          originalImage={headshot.originalImage}
          selectedPresetId={headshot.selectedPresetId}
          onSelect={headshot.selectPreset}
          onGenerateCustom={headshot.generateCustomPreset}
          customPreset={headshot.customPreset}
        />
      )}

      {headshot.hasUpload && (
        <ResultPreview
          originalImage={headshot.originalImage}
          selectedImage={headshot.selectedImage}
          selectedPreset={headshot.selectedPreset}
          aspectRatio={headshot.aspectRatio}
          onAspectRatioChange={headshot.setAspectRatio}
        />
      )}

      {headshot.hasUpload && headshot.publicId && headshot.selectedPreset && (
        <ExportActions
          publicId={headshot.publicId}
          selectedPreset={headshot.selectedPreset}
          aspectRatio={headshot.aspectRatio}
        />
      )}
    </div>
  );
}
