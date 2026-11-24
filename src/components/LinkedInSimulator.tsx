import { useState } from "react";
import { CheckCircle2, MapPin, Users, Edit3, ShieldCheck } from "lucide-react";
import { cn } from "../lib/utils";

interface LinkedInSimulatorProps {
  headshotUrl: string;
  className?: string;
}

export function LinkedInSimulator({
  headshotUrl,
  className = "",
}: LinkedInSimulatorProps) {
  const [openToWork, setOpenToWork] = useState(true);
  const [name, setName] = useState("Alex Morgan");
  const [headline, setHeadline] = useState(
    "Senior Product Engineer & AI Specialist · Building high-impact products",
  );
  const [isEditing, setIsEditing] = useState(false);

  return (
    <div className={cn("w-full max-w-xl mx-auto flex flex-col items-center", className)}>
      {/* SIMULATOR CONTROLS BAR */}
      <div className="mb-4 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setOpenToWork((prev) => !prev)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer border",
            openToWork
              ? "border-emerald-500 bg-emerald-500/20 text-emerald-300"
              : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10",
          )}
        >
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              openToWork ? "bg-emerald-400 animate-pulse" : "bg-white/30",
            )}
          />
          #OpenToWork Ring {openToWork ? "On" : "Off"}
        </button>

        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 transition cursor-pointer"
        >
          <Edit3 className="h-3.5 w-3.5 text-indigo-400" />
          {isEditing ? "Done Editing" : "Edit Name & Title"}
        </button>
      </div>

      {/* LINKEDIN CARD CONTAINER */}
      <div className="w-full overflow-hidden rounded-2xl bg-[#1b1f23] text-white shadow-2xl border border-white/10">
        {/* BANNER */}
        <div className="relative h-32 sm:h-36 w-full bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-400 via-transparent to-transparent" />
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm border border-white/10">
            <span className="font-bold text-[#0a66c2]">in</span>
            <span>Profile Preview</span>
          </div>
        </div>

        {/* PROFILE BODY */}
        <div className="relative px-6 pb-6 pt-0">
          {/* AVATAR WRAPPER */}
          <div className="relative -mt-16 sm:-mt-20 mb-3 flex items-end justify-between">
            <div className="relative">
              {/* Optional #OpenToWork Green Ring */}
              <div
                className={cn(
                  "relative h-28 w-28 sm:h-32 sm:w-32 rounded-full overflow-hidden shadow-xl border-4 transition-all",
                  openToWork
                    ? "border-emerald-500 ring-4 ring-emerald-500/30"
                    : "border-[#1b1f23]",
                )}
              >
                <img
                  src={headshotUrl}
                  alt={name}
                  className="h-full w-full object-cover"
                />
              </div>

              {openToWork && (
                <div className="absolute -bottom-1 inset-x-0 mx-auto w-max rounded-full bg-emerald-600 px-2 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase shadow-md border border-emerald-400/40">
                  #OpenToWork
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0a66c2] px-4 py-1.5 text-xs font-semibold text-white shadow-md">
                Open to
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#0a66c2] px-4 py-1.5 text-xs font-semibold text-[#70b5f9]">
                More
              </span>
            </div>
          </div>

          {/* EDIT FIELDS OR STATIC DISPLAY */}
          {isEditing ? (
            <div className="space-y-3 my-3 p-3 rounded-xl bg-black/40 border border-white/10">
              <div>
                <label className="text-[11px] font-medium text-white/50 block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#0a66c2]"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-white/50 block mb-1">
                  Professional Headline
                </label>
                <input
                  type="text"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  className="w-full rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#0a66c2]"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white/95">{name}</h3>
                <CheckCircle2 className="h-4 w-4 text-[#70b5f9]" />
                <span className="text-xs text-white/50 font-normal">· 1st</span>
              </div>
              <p className="text-xs sm:text-sm text-white/80 leading-snug">
                {headline}
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-white/40" />
                  San Francisco Bay Area
                </span>
                <span>·</span>
                <span className="flex items-center gap-1 text-[#70b5f9] font-medium">
                  <Users className="h-3.5 w-3.5" />
                  500+ connections
                </span>
              </div>
            </div>
          )}

          {/* OPEN TO WORK NOTICE CARD */}
          {openToWork && (
            <div className="mt-4 rounded-xl bg-[#282d33] p-3 text-xs border border-white/5 flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-white/90">
                  Open to work: Software Engineering, Product roles
                </p>
                <p className="text-[11px] text-white/50 mt-0.5">
                  All LinkedIn members can see you are open to job opportunities.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
