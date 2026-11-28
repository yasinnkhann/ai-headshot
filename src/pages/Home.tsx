import { useState } from "react";
import { LandingPage } from "../components/LandingPage";
import { LocalGalleryModal } from "../components/LocalGalleryModal";
import { PhotoStudio } from "../components/PhotoStudio";
import { useStudio } from "../hooks/use-studio";
import { Cpu, Images, RefreshCw, Sparkles } from "lucide-react";

export default function Home() {
  const studio = useStudio();
  const [galleryOpen, setGalleryOpen] = useState(false);
  const localConnected = Boolean(
    studio.localHealth?.ok && studio.localHealth.mfluxInstalled,
  );

  const handleReset = () => {
    studio.resetStudio();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenGallery = () => {
    setGalleryOpen(true);
    void studio.refreshGallery();
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0f]/85 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <button
          type="button"
          onClick={studio.hasPhoto ? handleReset : undefined}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 text-indigo-400 border border-indigo-500/30 group-hover:border-indigo-400/50 transition">
            <Sparkles className="h-4 w-4 text-indigo-400 group-hover:rotate-12 transition-transform duration-300" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-white">
              Alter<span className="text-indigo-400">x</span>
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Persistent Local Studio Library Button */}
          {localConnected && (
            <button
              type="button"
              onClick={handleOpenGallery}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 transition cursor-pointer"
              title="Open auto-saved local studio renders from ~/Pictures/Alterx"
            >
              <Images className="h-3.5 w-3.5 text-emerald-400" />
              <span>Library</span>
              <span className="rounded-full bg-black/35 px-1.5 py-0.5 text-[10px] font-mono text-emerald-300">
                {studio.galleryItems.length || studio.localHealth?.galleryCount || 0}
              </span>
            </button>
          )}

          {/* Live Local AI Status Indicator */}
          <div
            className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/70"
            title={
              localConnected
                ? studio.localHealth?.autoStartInstalled
                  ? "Connected to local Apple Silicon mflux server (Auto-Start enabled)"
                  : "Connected to local Apple Silicon mflux server ($0 unlimited)"
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
          localPreviousResultUrl={studio.localPreviousResultUrl}
          hasCloudEdits={studio.hasCloudEdits}
          engine={studio.engine}
          onEngineChange={studio.setEngine}
          localHealth={studio.localHealth}
          onRefreshLocalHealth={studio.refreshLocalHealth}
          localModel={studio.localModel}
          onLocalModelChange={studio.setLocalModel}
          localResolution={studio.localResolution}
          onLocalResolutionChange={studio.setLocalResolution}
          localStrength={studio.localStrength}
          onLocalStrengthChange={studio.setLocalStrength}
          localAutoMask={studio.localAutoMask}
          onLocalAutoMaskChange={studio.setLocalAutoMask}
          localMaskDataUrl={studio.localMaskDataUrl}
          localMaskPreviewUrl={studio.localMaskPreviewUrl}
          onSaveBrushMask={studio.saveLocalBrushMask}
          onClearBrushMask={studio.clearLocalBrushMask}
          localReferenceImages={studio.localReferenceImages}
          onAddReferenceFiles={studio.addLocalReferenceFiles}
          onRemoveReferenceImage={studio.removeLocalReferenceImage}
          onClearReferenceImages={studio.clearLocalReferenceImages}
          localNegativePrompt={studio.localNegativePrompt}
          onLocalNegativePromptChange={studio.setLocalNegativePrompt}
          localStyleMode={studio.localStyleMode}
          onLocalStyleModeChange={studio.setLocalStyleMode}
          localLoraPath={studio.localLoraPath}
          onLocalLoraPathChange={studio.setLocalLoraPath}
          localLoraScale={studio.localLoraScale}
          onLocalLoraScaleChange={studio.setLocalLoraScale}
          localSeed={studio.localSeed}
          onLocalSeedChange={studio.setLocalSeed}
          localSeedLocked={studio.localSeedLocked}
          onLocalSeedLockedChange={studio.setLocalSeedLocked}
          localLastSeed={studio.localLastSeed}
          localEnhancePrompt={studio.localEnhancePrompt}
          onLocalEnhancePromptChange={studio.setLocalEnhancePrompt}
          localVerify={studio.localVerify}
          onLocalVerifyChange={studio.setLocalVerify}
          soundAlertsEnabled={studio.soundAlertsEnabled}
          onSoundAlertsEnabledChange={studio.setSoundAlertsEnabled}
          onRequestDesktopNotifications={studio.requestDesktopNotifications}
          localJob={studio.localJob}
          localLastPrompt={studio.localLastPrompt}
          localLastOperation={studio.localLastOperation}
          chainLocalEdits={studio.chainLocalEdits}
          onChainLocalEditsChange={studio.setChainLocalEdits}
          onRunLocalPrompt={(prompt) => studio.runLocalAiPrompt(prompt)}
          onRegenerateLocalEdit={studio.regenerateLocalEdit}
          onRunLocalUpscale={studio.runLocalUpscale}
          onRunLocalCutout={studio.runLocalCutout}
          onCancelLocalJob={studio.cancelActiveLocalJob}
          onOpenGallery={handleOpenGallery}
          galleryCount={studio.galleryItems.length}
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

      {galleryOpen && (
        <LocalGalleryModal
          items={studio.galleryItems}
          galleryDir={studio.galleryDir}
          loading={studio.galleryLoading}
          canAddAsReference={studio.hasPhoto}
          onRefresh={studio.refreshGallery}
          onOpenFolder={studio.openGalleryInFinder}
          onLoadItem={studio.loadGalleryItemIntoStudio}
          onAddAsReference={(item) =>
            studio.addLocalReferenceFromUrl(
              item.prompt.slice(0, 24) || item.filename,
              item.imageUrl,
            )
          }
          onDeleteItem={studio.deleteGalleryEntry}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </div>
  );
}
