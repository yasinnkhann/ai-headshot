import { useState, useEffect } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Cpu,
  HelpCircle,
  Laptop,
  Play,
  RefreshCw,
  Terminal,
  X,
  Zap,
} from "lucide-react";
import { cn } from "../lib/utils";
import type { LocalAiHealth } from "../types";

interface LocalSetupModalProps {
  isOpen: boolean;
  localHealth: LocalAiHealth | null;
  onClose: () => void;
  onSwitchToCloud?: () => void;
  onSwitchToLocal?: () => void;
  onRecheckConnection?: () => Promise<LocalAiHealth | null | void>;
}

type SetupTab = "quickstart" | "autostart" | "cloud";

export function LocalSetupModal({
  isOpen,
  localHealth,
  onClose,
  onSwitchToCloud,
  onSwitchToLocal,
  onRecheckConnection,
}: LocalSetupModalProps) {
  const [activeTab, setActiveTab] = useState<SetupTab>("quickstart");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const isServerRunning = Boolean(localHealth?.ok);
  const isConnected = Boolean(localHealth?.ok && localHealth.mfluxInstalled);
  const isMissingMflux = isServerRunning && !isConnected;

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Event-driven only: recheck once when user returns from Terminal while waiting to connect
  useEffect(() => {
    if (!isOpen || isConnected || !onRecheckConnection) return;
    const handleFocus = () => {
      void onRecheckConnection();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [isOpen, isConnected, onRecheckConnection]);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2500);
  };

  const handleManualCheck = async () => {
    if (!onRecheckConnection || isChecking) return;
    setIsChecking(true);
    try {
      await onRecheckConnection();
    } finally {
      setTimeout(() => setIsChecking(false), 350);
    }
  };

  const quickstartCmd =
    "git clone https://github.com/yasinnkhann/alterx.git && cd alterx && npm run local-ai";
  const mfluxInstallCmd = "uv tool install --upgrade mflux";
  const autostartCmd = "cd alterx && npm run local-ai:install-autostart";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0d0e17] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Local Mac AI Setup Guide
                </h3>
                <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                  $0 Unlimited
                </span>
              </div>
              <p className="text-xs text-white/50">
                Run FLUX.2 &amp; Qwen 2.1 directly on your Apple Silicon GPU
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close setup guide"
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Status Banner */}
        <div className="border-b border-white/10 px-6 py-3 bg-black/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full",
                isConnected
                  ? "bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50"
                  : isMissingMflux
                    ? "bg-amber-400 animate-pulse"
                    : "bg-white/30",
              )}
            />
            <span className="font-medium text-white/90">
              {isConnected
                ? "Connected & Ready (Apple Silicon MLX)"
                : isMissingMflux
                  ? "Local Bridge Running — mflux Not Installed Yet"
                  : "Not Running Yet — Click Recheck After Starting in Terminal"}
            </span>
          </div>

          <button
            type="button"
            onClick={handleManualCheck}
            disabled={isChecking}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/85 hover:bg-white/10 transition cursor-pointer"
          >
            <RefreshCw
              className={cn(
                "h-3 w-3",
                isChecking && "animate-spin text-emerald-400",
              )}
            />
            <span>{isChecking ? "Checking..." : "Recheck Now"}</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        {!isConnected && (
          <div className="flex border-b border-white/10 px-6 bg-white/[0.01]">
            <button
              type="button"
              onClick={() => setActiveTab("quickstart")}
              className={cn(
                "px-4 py-3 text-xs font-semibold transition border-b-2 cursor-pointer",
                activeTab === "quickstart"
                  ? "border-emerald-500 text-emerald-300"
                  : "border-transparent text-white/60 hover:text-white",
              )}
            >
              <span className="flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5" />
                1-Minute Quickstart
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("autostart")}
              className={cn(
                "px-4 py-3 text-xs font-semibold transition border-b-2 cursor-pointer",
                activeTab === "autostart"
                  ? "border-indigo-500 text-indigo-300"
                  : "border-transparent text-white/60 hover:text-white",
              )}
            >
              <span className="flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5" />
                Background Daemon
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cloud")}
              className={cn(
                "px-4 py-3 text-xs font-semibold transition border-b-2 cursor-pointer",
                activeTab === "cloud"
                  ? "border-purple-500 text-purple-300"
                  : "border-transparent text-white/60 hover:text-white",
              )}
            >
              <span className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-indigo-400" />
                No Mac? Use Cloud
              </span>
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isConnected ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-3.5">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Check className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-white">
                Your Mac is Connected &amp; Ready!
              </h4>
              <p className="text-xs text-white/70 max-w-md mx-auto leading-relaxed">
                FLUX.2 Klein 4B and Qwen 2.1 Turbo are ready on your Apple Silicon GPU.
                Photos stay 100% private on your Mac and auto-save to{" "}
                <code className="text-emerald-300 font-mono">
                  {localHealth?.galleryDir || "~/Pictures/Alterx"}
                </code>
                .
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-white/65">
                <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                  Auto-Start:{" "}
                  <strong className="text-white">
                    {localHealth?.autoStartInstalled ? "Installed" : "Manual"}
                  </strong>
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                  Ollama:{" "}
                  <strong className="text-white">
                    {localHealth?.ollama?.connected ? "Connected" : "Optional"}
                  </strong>
                </span>
                <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1">
                  Saved Library:{" "}
                  <strong className="text-white">
                    {localHealth?.galleryCount ?? 0} photos
                  </strong>
                </span>
              </div>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onSwitchToLocal?.();
                    onClose();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  Use Local Mac AI Now
                </button>
              </div>
            </div>
          ) : isMissingMflux ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-100/90 space-y-1">
                  <p className="font-semibold text-white">
                    Good news: Your local bridge is running on port 8787!
                  </p>
                  <p className="text-amber-100/75 leading-relaxed">
                    One final step: install the <code className="text-white font-mono">mflux</code>{" "}
                    Apple Silicon engine so Alterx can run FLUX.2 &amp; Qwen 2.1 locally.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-white">
                  Run this in Terminal, then click Recheck Now:
                </span>
                <div className="relative rounded-xl border border-white/15 bg-black/70 p-3.5 pr-20 font-mono text-xs text-emerald-300 overflow-x-auto">
                  <code>{mfluxInstallCmd}</code>
                  <button
                    type="button"
                    onClick={() => handleCopy(mfluxInstallCmd, "mflux")}
                    className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-sans font-medium text-white transition cursor-pointer"
                  >
                    {copiedCmd === "mflux" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-white/50">
                  Or run <code className="text-white/80 font-mono">npm run local-ai</code> — the updated quickstart script installs <code className="text-white/80 font-mono">mflux</code> automatically.
                </p>
              </div>
            </div>
          ) : activeTab === "quickstart" ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-white/75 leading-relaxed">
                <span className="font-semibold text-white">Requirements:</span> Any Mac with an Apple
                Silicon processor (<strong className="text-emerald-300">M1, M2, M3, M4, or M5</strong>
                ) with macOS 13+ and Python 3.10+.
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                    1
                  </span>
                  <span>Open Terminal on your Mac and paste this command:</span>
                </div>

                <div className="relative rounded-xl border border-white/15 bg-black/70 p-3.5 pr-20 font-mono text-xs text-emerald-300 leading-normal overflow-x-auto">
                  <code>{quickstartCmd}</code>
                  <button
                    type="button"
                    onClick={() => handleCopy(quickstartCmd, "quick")}
                    className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-sans font-medium text-white transition cursor-pointer"
                  >
                    {copiedCmd === "quick" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs font-semibold text-white pt-1">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                    2
                  </span>
                  <span>Switch back to this tab — Alterx connects automatically!</span>
                </div>
                <p className="text-xs text-white/60 pl-7 leading-relaxed">
                  The quickstart script automatically checks/installs{" "}
                  <code className="text-emerald-300 font-mono">mflux</code> and boots the local bridge on{" "}
                  <code className="text-emerald-300 font-mono">127.0.0.1:8787</code>. Only{" "}
                  <code className="text-white/80 font-mono">alterx.vercel.app</code> and{" "}
                  <code className="text-white/80 font-mono">localhost</code> are allowed to connect.
                </p>
              </div>

              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-3.5 flex items-start gap-2.5 text-xs text-indigo-200/90">
                <HelpCircle className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                <span>
                  <strong>First run note:</strong> Your first edit downloads the quantized MLX model
                  weights (~4GB) from Hugging Face and caches them on disk so future edits run locally offline.
                </span>
              </div>
            </div>
          ) : activeTab === "autostart" ? (
            <div className="space-y-4">
              <p className="text-xs text-white/70 leading-relaxed">
                Prefer not to keep a terminal window open? Install the native macOS LaunchAgent so
                the Alterx local engine boots silently in the background whenever you log in.
              </p>

              <div className="space-y-2">
                <span className="text-xs font-semibold text-white">
                  Run this once in your terminal:
                </span>
                <div className="relative rounded-xl border border-white/15 bg-black/70 p-3.5 pr-20 font-mono text-xs text-indigo-300 leading-normal overflow-x-auto">
                  <code>{autostartCmd}</code>
                  <button
                    type="button"
                    onClick={() => handleCopy(autostartCmd, "auto")}
                    className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-white/10 hover:bg-white/20 px-2.5 py-1 text-[11px] font-sans font-medium text-white transition cursor-pointer"
                  >
                    {copiedCmd === "auto" ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/60 space-y-1.5">
                <p>• Automatically releases GPU memory whenever no render is active.</p>
                <p>
                  • To uninstall later, run{" "}
                  <code className="text-white font-mono">
                    npm run local-ai:uninstall-autostart
                  </code>
                  .
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-purple-500/25 bg-purple-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-purple-300" />
                  <h4 className="text-sm font-semibold text-white">
                    Not on a Mac? No Problem!
                  </h4>
                </div>
                <p className="text-xs text-white/75 leading-relaxed">
                  You don&apos;t need to install anything or touch a terminal to use Alterx.
                  <strong> Cloud Photoshop</strong> runs right in your browser on high-speed cloud GPUs.
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Works on Windows, Linux, Chromebook, iPhone, iPad, &amp; Android</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Generative background replacement, Magic Eraser, and outfit swapping</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Zero downloads, zero setup, ready right now</span>
                </div>
              </div>

              {onSwitchToCloud && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onSwitchToCloud();
                      onClose();
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-5 py-3 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 transition cursor-pointer"
                  >
                    <Zap className="h-4 w-4" />
                    Continue with Cloud Photoshop (Zero Setup)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-3.5 bg-black/30 flex items-center justify-between text-xs text-white/50">
          <span>Alterx · Local MLX &amp; Cloud Hybrid</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-white/10 hover:bg-white/15 px-4 py-1.5 text-xs font-medium text-white transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
