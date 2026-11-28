import { useState, useEffect } from "react";
import {
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
  onRecheckConnection?: () => Promise<LocalAiHealth | null | void>;
}

type SetupTab = "quickstart" | "autostart" | "cloud";

export function LocalSetupModal({
  isOpen,
  localHealth,
  onClose,
  onSwitchToCloud,
  onRecheckConnection,
}: LocalSetupModalProps) {
  const [activeTab, setActiveTab] = useState<SetupTab>("quickstart");
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const isConnected = Boolean(localHealth?.ok && localHealth.mfluxInstalled);

  // Poll local health every 2 seconds while modal is open
  useEffect(() => {
    if (!isOpen || !onRecheckConnection) return;
    const interval = setInterval(() => {
      void onRecheckConnection();
    }, 2000);
    return () => clearInterval(interval);
  }, [isOpen, onRecheckConnection]);

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
      setTimeout(() => setIsChecking(false), 500);
    }
  };

  const quickstartCmd = "git clone https://github.com/yasinnkhann/alterx.git && cd alterx && npm run local-ai";
  const autostartCmd = "cd alterx && bash local-server/install-autostart.sh";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0d0e17] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4.5 bg-white/[0.02]">
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
                  : "bg-amber-400/80",
              )}
            />
            <span className="font-medium text-white/90">
              {isConnected
                ? "Status: Connected & Ready!"
                : "Status: Offline (Listening on 127.0.0.1:8787...)"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualCheck}
              disabled={isChecking}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-white/80 hover:bg-white/10 transition cursor-pointer"
            >
              <RefreshCw className={cn("h-3 w-3", isChecking && "animate-spin text-emerald-400")} />
              <span>{isChecking ? "Checking..." : "Recheck"}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
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

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isConnected ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                <Check className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-white">Your Mac is Connected &amp; Ready!</h4>
              <p className="text-xs text-white/70 max-w-md mx-auto">
                FLUX.2 Klein 4B and Qwen 2.1 Turbo are running directly on your Apple Silicon chip.
                All photo edits are 100% private and save into{" "}
                <code className="text-emerald-300 font-mono">
                  {localHealth?.galleryDir || "~/Pictures/Alterx"}
                </code>.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-600/30 transition cursor-pointer"
              >
                Start Prompting in Studio
              </button>
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

                <div className="relative rounded-xl border border-white/15 bg-black/70 p-3.5 font-mono text-xs text-emerald-300 leading-normal overflow-x-auto">
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

                <div className="flex items-center gap-2 text-xs font-semibold text-white pt-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[10px]">
                    2
                  </span>
                  <span>Keep Terminal open — Alterx will connect instantly!</span>
                </div>
                <p className="text-xs text-white/60 pl-7 leading-relaxed">
                  As soon as the server logs <code className="text-emerald-300 font-mono">Listening on 127.0.0.1:8787</code>,
                  this webpage will automatically detect it without refreshing.
                </p>
              </div>

              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.05] p-3.5 flex items-start gap-2.5 text-xs text-indigo-200/90">
                <HelpCircle className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
                <span>
                  <strong>First run note:</strong> The first edit downloads the lightweight MLX weights (~4GB)
                  from Hugging Face and caches them on your Mac for instant future generations.
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
                <span className="text-xs font-semibold text-white">Run this once in your terminal:</span>
                <div className="relative rounded-xl border border-white/15 bg-black/70 p-3.5 font-mono text-xs text-indigo-300 leading-normal overflow-x-auto">
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
                <p>• Automatically manages memory and releases GPU when idle.</p>
                <p>• To uninstall later, run <code className="text-white font-mono">npm run local-ai:uninstall-autostart</code>.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-purple-500/25 bg-purple-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Laptop className="h-4 w-4 text-purple-300" />
                  <h4 className="text-sm font-semibold text-white">Not on a Mac? No Problem!</h4>
                </div>
                <p className="text-xs text-white/75 leading-relaxed">
                  You do not need to install anything or run terminal commands to use Alterx.
                  Our <strong>Cloud Photoshop</strong> mode runs directly in the cloud on high-speed GPUs.
                </p>
              </div>

              <div className="space-y-2.5 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Works on Windows, Linux, Chromebook, iPhone, iPad, &amp; Android</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-400" />
                  <span>Generative background replacement, object erase, and outfit swapping</span>
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
                    Switch to Cloud Photoshop (Zero Setup)
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
