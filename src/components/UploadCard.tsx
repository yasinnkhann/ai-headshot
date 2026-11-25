import { AlertCircle, ImageIcon, Loader2 } from "lucide-react";
import type { UploadStatus } from "../types";
import { useDropzone } from "react-dropzone";
import { cn } from "../lib/utils";
import { useState } from "react";
import { uploadImageToCloudinary } from "../cloudinary/upload-direct";
import type { CloudinaryUploadResult } from "../cloudinary/UploadWidget";

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
  onUseSample?: () => void;
  compact?: boolean;
}

export default function UploadCard({
  uploadStatus,
  uploadError,
  onUploadError,
  onUploadStart,
  onUploadSuccess,
  onUseSample,
  compact = false,
}: UploadCardProps) {
  const [progress, setProgress] = useState(0);

  const uploadFile = async (file: File) => {
    onUploadStart();
    setProgress(0);
    try {
      const result = await uploadImageToCloudinary(file, setProgress);
      onUploadSuccess(result);
    } catch (error) {
      onUploadError(
        error instanceof Error ? error : new Error("Upload failed. Check your network or Cloudinary settings."),
      );
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) {
      onUploadError(new Error("Please upload a JPG, PNG, or WEBP image."));
      return;
    }

    uploadFile(acceptedFiles[0]);
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxFiles: 1,
    multiple: false,
    disabled: uploadStatus === "uploading",
  });

  const isUploading = uploadStatus === "uploading";

  const handleUseSample = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUseSample) {
      onUseSample();
      return;
    }
    onUploadSuccess({
      public_id: "samples/people/smiling-man",
      resource_type: "image",
      secure_url: "https://res.cloudinary.com/dwbhfydeg/image/upload/samples/people/smiling-man.jpg",
      url: "http://res.cloudinary.com/dwbhfydeg/image/upload/samples/people/smiling-man.jpg",
      width: 849,
      height: 565,
      format: "jpg",
      bytes: 338794,
      created_at: new Date().toISOString(),
    });
  };

  const dropzoneContent = (
    <div
      {...getRootProps()}
      className={cn(
        "glass-card relative flex cursor-pointer flex-col items-center gap-5 p-8 transition border border-white/10 hover:border-indigo-500/40 hover:bg-white/[0.07]",
        isDragActive && "border-indigo-500 bg-indigo-500/10",
        isUploading && "pointer-events-none opacity-80",
        compact ? "rounded-2xl" : "p-10",
      )}
    >
      <input {...getInputProps()} />
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
        {isUploading ? (
          <Loader2 className="h-8 w-8 animate-spin" />
        ) : (
          <ImageIcon className="h-8 w-8" />
        )}
      </div>

      <div className="text-center">
        <p className="text-base font-semibold text-white">Drag & drop your selfie</p>
        <p className="mt-1 text-xs text-white/50">
          or click to browse · JPG, PNG, or WEBP (up to 10MB)
        </p>
      </div>

      {isUploading && (
        <div className="w-full max-w-xs space-y-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${Math.max(progress, 5)}%` }}
            />
          </div>
          <p className="text-center text-xs text-white/60">
            Uploading... {progress > 0 ? `${progress}%` : ""}
          </p>
        </div>
      )}

      {!isUploading && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white cursor-pointer shadow-lg shadow-indigo-600/20",
              "transition hover:bg-indigo-500",
            )}
          >
            Browse files
          </button>

          <button
            type="button"
            onClick={handleUseSample}
            className="text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-4 transition cursor-pointer"
          >
            ⚡ Try sample selfie
          </button>
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
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-2 text-center text-2xl font-semibold">
          Upload Your Selfie
        </h2>
        <p className="mb-8 text-center text-white/60">
          Drag, drop, or click to upload your photo
        </p>
        {dropzoneContent}
      </div>
    </section>
  );
}
