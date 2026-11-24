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
}

export default function UploadCard({
  uploadStatus,
  uploadError,
  onUploadError,
  onUploadStart,
  onUploadSuccess,
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

  return (
    <section id="upload" className="px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <h2 className="mb-2 text-center text-2xl font-semibold">
          Upload Your Selfie
        </h2>
        <p className="mb-8 text-center text-white/60">
          Drag, drop, or click to upload your photo
        </p>

        <div
          {...getRootProps()}
          className={cn(
            "glass-card relative flex cursor-pointer flex-col items-center gap-6 p-10 transition border border-white/10 hover:border-indigo-500/40",
            isDragActive && "border-indigo-500 bg-indigo-500/10",
            isUploading && "pointer-events-none opacity-80",
          )}
        >
          <input {...getInputProps()} />
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400">
            {isUploading ? (
              <Loader2 className="h-10 w-10 animate-spin" />
            ) : (
              <ImageIcon className="h-10 w-10" />
            )}
          </div>

          <div className="text-center">
            <p className="text-lg font-medium">Drag & drop your selfie</p>
            <p className="mt-1 text-sm text-white/50">
              or click to browse · JPG, PNG, or WEBP
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
            <div
              className="flex items-center gap-3"
              onClick={(e) => {
                e.stopPropagation();
                open();
              }}
            >
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white cursor-pointer",
                  "transition hover:bg-indigo-500",
                )}
              >
                Browse files
              </button>
            </div>
          )}

          {uploadError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {uploadError}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
