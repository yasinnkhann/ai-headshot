import { LandingPage } from "../components/LandingPage";
import { PhotoStudio } from "../components/PhotoStudio";
import { useStudio } from "../hooks/use-studio";
import { Cpu, RefreshCw, Sparkles } from "lucide-react";

export default function Home() {
  const studio = useStudio();
  const localConnected = Boolean(
    studio.localHealth?.ok && studio.localHealth.mfluxInstalled,
  );

  const handleReset = () => {
    studio.resetStudio();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0f]/85 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={studio.hasPhoto ? handleReset : undefined}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold tracking-tight">
              AI <span className="text-indigo-400">Photo Studio</span>
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Live Local AI Status Indicator */}
          <div
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/70"
            title={
              localConnected
                ? "Connected to local Apple Silicon mflux server ($0 unlimited)"
                : "Start 'npm run local-ai' on your Mac for unlimited local AI edits"
            }
          >
            <span
              className={
                localConnected
                  ? "h-2 w-2 rounded-full bg-emerald-400 animate-pulse"
                  : "h-2 w-2 rounded-full bg-white/30"
              }
            />
            <Cpu className="h-3.5 w-3.5 text-white/50" />
            <span>{localConnected ? "Local Mac AI: Ready" : "Local AI: Offline"}</span>
          </div>

          {studio.hasPhoto && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-medium text-white/90 hover:bg-white/10 hover:text-white transition cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 text-indigo-400" />
              New Photo
            </button>
          )}
        </div>
      </header>

      {!studio.hasPhoto ? (
        <LandingPage
          uploadStatus={studio.uploadStatus}
          uploadError={studio.uploadError}
          localHealth={studio.localHealth}
          onUploadError={studio.handleUploadError}
          onUploadStart={studio.handleUploadStart}
          onUploadSuccess={studio.handleUploadSuccess}
          onLocalOnlyUpload={studio.handleLocalOnlyUpload}
          onSelectSample={studio.loadSamplePhoto}
        />
      ) : (
        <PhotoStudio
          publicId={studio.publicId}
          originalPreviewUrl={studio.originalPreviewUrl}
          activeResultUrl={studio.activeResultUrl}
          cloudResultUrl={studio.cloudResultUrl}
          localResultUrl={studio.localResultUrl}
          hasCloudEdits={studio.hasCloudEdits}
          engine={studio.engine}
          onEngineChange={studio.setEngine}
          localHealth={studio.localHealth}
          onRefreshLocalHealth={studio.refreshLocalHealth}
          localModel={studio.localModel}
          onLocalModelChange={studio.setLocalModel}
          localResolution={studio.localResolution}
          onLocalResolutionChange={studio.setLocalResolution}
          localAutoMask={studio.localAutoMask}
          onLocalAutoMaskChange={studio.setLocalAutoMask}
          localEnhancePrompt={studio.localEnhancePrompt}
          onLocalEnhancePromptChange={studio.setLocalEnhancePrompt}
          localVerify={studio.localVerify}
          onLocalVerifyChange={studio.setLocalVerify}
          localJob={studio.localJob}
          localLastPrompt={studio.localLastPrompt}
          chainLocalEdits={studio.chainLocalEdits}
          onChainLocalEditsChange={studio.setChainLocalEdits}
          onRunLocalPrompt={studio.runLocalAiPrompt}
          onCancelLocalJob={studio.cancelActiveLocalJob}
          layers={studio.layers}
          estimatedCredits={studio.estimatedCredits}
          onAddLayer={studio.addLayer}
          onToggleLayer={studio.toggleLayer}
          onRemoveLayer={studio.removeLayer}
          onClearLayers={studio.clearLayers}
          onApplySmartCloudPrompt={studio.applySmartCloudPrompt}
          onApplyPreset={studio.applyPreset}
          aspectRatio={studio.aspectRatio}
          onAspectRatioChange={studio.setAspectRatio}
          activeFilter={studio.activeFilter}
          onFilterChange={studio.setActiveFilter}
          microTuning={studio.microTuning}
          onMicroTuningChange={studio.setMicroTuning}
          history={studio.history}
          onAddToHistory={studio.addToHistory}
          onRestoreHistory={studio.restoreHistoryItem}
          onRemoveHistory={studio.removeHistoryItem}
        />
      )}
    </div>
  );
}
