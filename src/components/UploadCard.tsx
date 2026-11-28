import { AlertCircle, ImageIcon, Loader2, ShieldCheck, Upload } from "lucide-react";
import type { CloudinaryUploadResult, SamplePhoto, UploadStatus } from "../types";
import { useDropzone } from "react-dropzone";
import { cn } from "../lib/utils";
import { useState } from "react";
import { uploadImageToCloudinary } from "../cloudinary/upload-direct";
import { fileToDataUrl } from "../lib/local-ai";
import { SAMPLE_PHOTOS } from "../lib/studio-engine";

const ACCEPT = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
};

interface UploadCardProps {
  uploadStatus: UploadStatus;
  uploadError: string | null;
  onUploadError: (error: Error) => void;
  onUploadStart: () => void;
  onUploadSuccess: (result: CloudinaryUploadResult) => void;
  onLocalOnlyUpload?: (dataUrl: string) => void;
  onSelectSample?: (sample: SamplePhoto) => void;
  preferLocalOnly?: boolean;
  compact?: boolean;
}

export default function UploadCard({
  uploadStatus,
  uploadError,
  onUploadError,
  onUploadStart,
  onUploadSuccess,
  onLocalOnlyUpload,
  onSelectSample,
  preferLocalOnly = false,
  compact = false,
}: UploadCardProps) {
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File) => {
    onUploadStart();
    setProgress(0);
    try {
      // Try Cloudinary so BOTH Cloud Tools and Local AI work seamlessly
      const result = await uploadImageToCloudinary(file, setProgress);
      onUploadSuccess(result);
    } catch (error) {
      // If Cloudinary fails (or offline) and local handler exists, still open the photo locally!
      if (onLocalOnlyUpload) {
        try {
          const dataUrl = await fileToDataUrl(file);
          onLocalOnlyUpload(dataUrl);
          return;
        } catch {
          // Fall through to report original error
        }
      }
      onUploadError(
        error instanceof Error
          ? error
          : new Error("Upload failed. Check your network or Cloudinary settings."),
      );
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      onUploadError(new Error("Please upload a JPG, PNG, or WEBP image."));
      return;
    }

    const file = acceptedFiles[0];
    if (preferLocalOnly && onLocalOnlyUpload) {
      onUploadStart();
      fileToDataUrl(file)
        .then(onLocalOnlyUpload)
        .catch(() => uploadFile(file));
      return;
    }

    uploadFile(file);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    multiple: false,
    disabled: uploadStatus === "uploading",
  });

  const isUploading = uploadStatus === "uploading";

  const handleSampleClick = (e: React.MouseEvent, sample: SamplePhoto) => {
    e.stopPropagation();
    if (onSelectSample) {
      onSelectSample(sample);
      return;
    }
    onUploadSuccess({
      public_id: sample.publicId,
      resource_type: "image",
      secure_url: sample.secureUrl,
      url: sample.secureUrl,
      width: sample.width,
      height: sample.height,
      format: "jpg",
      bytes: 338794,
      created_at: new Date().toISOString(),
    });
  };

  const dropzoneContent = (
    <div
      {...getRootProps()}
      className={cn(
        "glass-card relative flex cursor-pointer flex-col items-center gap-4 p-7 transition border border-white/10 hover:border-indigo-500/45 hover:bg-white/[0.06]",
        isDragActive && "border-indigo-500 bg-indigo-500/10 scale-[1.01]",
        isUploading && "pointer-events-none opacity-80",
        compact ? "rounded-2xl" : "p-10",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
        {isUploading ? (
          <Loader2 className="h-7 w-7 animate-spin" />
        ) : (
          <ImageIcon className="h-7 w-7" />
        )}
      </div>

      <div className="text-center">
        <p className="text-base font-semibold text-white">
          Drop any photo here to start editing
        </p>
        <p className="mt-1 text-xs text-white/50">
          Portraits, products, travel, rooms — JPG, PNG, or WEBP
        </p>
        {preferLocalOnly && (
          <p className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-300">
            <ShieldCheck className="h-3 w-3" />
            Private Local Mode · Photos stay 100% on your Mac
          </p>
        )}
      </div>

      {isUploading && (
        <div className="w-full max-w-xs space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${Math.max(progress, 8)}%` }}
            />
          </div>
          <p className="text-center text-xs text-white/60">
            Uploading... {progress > 0 ? `${progress}%` : ""}
          </p>
        </div>
      )}

      {!isUploading && (
        <div className="flex flex-col items-center gap-3 w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white cursor-pointer shadow-lg shadow-indigo-600/25",
              "transition hover:bg-indigo-500",
            )}
          >
            <Upload className="h-4 w-4" />
            Choose Photo
          </button>

          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
            <span className="text-[11px] text-white/40 mr-0.5">
              Or try a sample:
            </span>
            {SAMPLE_PHOTOS.map((sample) => (
              <button
                key={sample.id}
                type="button"
                onClick={(e) => handleSampleClick(e, sample)}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400/40 transition cursor-pointer"
              >
                ⚡ {sample.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-xs text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  );

  if (compact) {
    return dropzoneContent;
  }

  return (
    <section id="upload" className="px-4 py-12">
      <div className="mx-auto max-w-2xl">{dropzoneContent}</div>
    </section>
  );
}
