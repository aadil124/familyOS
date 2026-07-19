"use client";

import React, { useState, useRef } from "react";
import axios, { CancelTokenSource } from "axios";
import { useWorkspace } from "@/providers/WorkspaceProvider";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import {
  useFamilyMembersQuery,
  useDocumentCategoriesQuery,
  useUploadSignatureMutation,
  useRegisterDocumentMutation,
} from "../services/queries";
import { Upload, FileText, X, ShieldAlert } from "lucide-react";

interface UploadWidgetProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function UploadWidget({ onSuccess, onCancel }: UploadWidgetProps) {
  const { activeFamily } = useWorkspace();
  const familyId = activeFamily?.id;

  const { data: members = [] } = useFamilyMembersQuery(familyId);
  const { data: categories = [] } = useDocumentCategoriesQuery();

  const getSignatureMutation = useUploadSignatureMutation(familyId);
  const registerMutation = useRegisterDocumentMutation(familyId);

  // File States
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [memberId, setMemberId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [dragActive, setDragActive] = useState(false);

  // Upload States
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cancelSource, setCancelSource] = useState<CancelTokenSource | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFile = (selectedFile: File) => {
    // Max size 10MB
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast.error("File size exceeds 10MB limit.");
      return false;
    }
    
    // Allowed formats
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    
    if (!allowedTypes.includes(selectedFile.type) && !selectedFile.name.endsWith(".docx") && !selectedFile.name.endsWith(".doc")) {
      toast.error("Format not supported. Please upload PDF, PNG, JPG, WEBP, or DOCX.");
      return false;
    }

    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (validateFile(droppedFile)) {
        setFile(droppedFile);
        setDisplayName(droppedFile.name.split(".")[0]);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (validateFile(selectedFile)) {
        setFile(selectedFile);
        setDisplayName(selectedFile.name.split(".")[0]);
      }
    }
  };

  const triggerUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);

    const source = axios.CancelToken.source();
    setCancelSource(source);

    try {
      // Step 1: Fetch Cloudinary direct-upload parameters signature
      const signatureData = await getSignatureMutation.mutateAsync();

      // Step 2: Upload file directly to Cloudinary using multipart/form-data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signatureData.apiKey);
      formData.append("timestamp", signatureData.timestamp.toString());
      formData.append("signature", signatureData.signature);
      formData.append("folder", signatureData.folder);
      formData.append("type", signatureData.type);
      if (signatureData.publicId) {
        formData.append("public_id", signatureData.publicId);
      }

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/auto/upload`;

      const uploadResponse = await axios.post(cloudinaryUrl, formData, {
        cancelToken: source.token,
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
          setProgress(percent);
        },
      });

      const storageAssetId = uploadResponse.data.public_id;

      // Step 3: Register document in the backend database
      await registerMutation.mutateAsync({
        storageAssetId,
        originalFileName: file.name,
        fileType: file.name.split(".").pop() || "unknown",
        fileSize: file.size,
        displayName: displayName || file.name,
        familyMemberId: memberId || undefined,
        categoryId: categoryId || undefined,
      });

      toast.success(`Document "${displayName}" uploaded successfully!`);
      
      // Reset
      setFile(null);
      setDisplayName("");
      setMemberId("");
      setCategoryId("");
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: unknown) {
      if (axios.isCancel(error)) {
        toast.info("Upload cancelled.");
      } else {
        const err = error as { response?: { data?: { message?: string } } };
        const msg = err.response?.data?.message || "Failed to upload document.";
        toast.error(msg);
      }
    } finally {
      setUploading(false);
      setCancelSource(null);
      setProgress(0);
    }
  };

  const handleCancelUpload = () => {
    if (cancelSource) {
      cancelSource.cancel();
    }
  };

  const removeFile = () => {
    setFile(null);
    setDisplayName("");
  };

  return (
    <div className="space-y-4">
      {!file ? (
        /* Drag & Drop Area */
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 select-none ${
            dragActive
              ? "border-accent bg-accent/5 scale-[1.01]"
              : "border-border/80 bg-secondary/15 hover:bg-secondary/25 hover:border-border"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx,.doc"
            className="hidden"
          />
          <div className="p-3 rounded-full bg-secondary mb-3.5 border border-border/40">
            <Upload className="h-6 w-6 text-muted-foreground/80" />
          </div>
          <h4 className="text-sm font-semibold text-foreground">Drag & Drop files here</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
            Support PDF, PNG, JPEG, WEBP, or DOCX formats (Max size: 10MB)
          </p>
        </div>
      ) : (
        /* Metadata Configuration Form before submitting upload */
        <div className="space-y-4 border border-border/60 rounded-xl p-4.5 bg-card/25 animate-in fade-in duration-200">
          <div className="flex items-start gap-3 bg-secondary/20 p-3 rounded-lg relative">
            <FileText className="h-8 w-8 text-accent shrink-0" />
            <div className="min-w-0 flex-1 pr-6 select-none">
              <h5 className="text-xs font-bold text-foreground truncate">{file.name}</h5>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Size: {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            {!uploading && (
              <button
                type="button"
                onClick={removeFile}
                className="absolute right-2.5 top-2.5 p-1 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                title="Discard file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-3.5">
            {/* Display Name Input */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs font-bold text-muted-foreground select-none">
                Display Title
              </label>
              <input
                type="text"
                placeholder="e.g. Identity Passport"
                value={displayName}
                disabled={uploading}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-secondary/20 px-3 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-ring/30 focus:ring-1 focus:ring-ring/30"
              />
            </div>

            {/* Associate Family Member Select */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs font-bold text-muted-foreground select-none">
                Assign to Family Member (Optional)
              </label>
              <select
                value={memberId}
                disabled={uploading}
                onChange={(e) => setMemberId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-secondary/20 px-3 text-xs text-foreground outline-none transition-all focus:border-ring/30 focus:ring-1 focus:ring-ring/30"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Selection */}
            <div className="flex flex-col gap-1 text-left">
              <label className="text-xs font-bold text-muted-foreground select-none">
                Document Category (Optional)
              </label>
              <select
                value={categoryId}
                disabled={uploading}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-10 rounded-lg border border-border bg-secondary/20 px-3 text-xs text-foreground outline-none transition-all focus:border-ring/30 focus:ring-1 focus:ring-ring/30"
              >
                <option value="">Unclassified</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploading && (
            <div className="space-y-1.5 select-none pt-2.5">
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ShieldAlert className="h-3.5 w-3.5 text-accent animate-pulse" />
                  Uploading attachment to Cloudinary...
                </span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action triggers */}
          <div className="flex justify-end gap-2.5 pt-2 border-t border-border/20">
            {uploading ? (
              <Button variant="outline" size="sm" onClick={handleCancelUpload}>
                Cancel Upload
              </Button>
            ) : (
              <>
                {onCancel && (
                  <Button variant="outline" size="sm" onClick={onCancel}>
                    Cancel
                  </Button>
                )}
                <Button size="sm" onClick={triggerUpload}>
                  Start Upload
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
