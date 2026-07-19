"use client";

import React, { useState } from "react";
import { ZoomIn, ZoomOut, RotateCw, Maximize2, Minimize2, FileText, Download } from "lucide-react";

interface DocumentViewerProps {
  url: string;
  fileType: string;
  displayName: string;
  onDownload?: () => void;
}

export function DocumentViewer({ url, fileType, displayName, onDownload }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isImage = ["jpg", "jpeg", "png", "webp"].includes(fileType.toLowerCase());
  const isPdf = fileType.toLowerCase() === "pdf";

  const handleZoomIn = () => setZoom((z) => Math.min(2.5, z + 0.25));
  const handleZoomOut = () => setZoom((z) => Math.max(0.5, z - 0.25));
  const handleRotate = () => setRotation((r) => (r + 90) % 360);
  const toggleFullscreen = () => setIsFullscreen((f) => !f);

  const viewerControls = (
    <div className="flex items-center gap-1.5 p-2.5 rounded-xl border border-border bg-card/90 shadow-sm select-none z-10 glassmorphism">
      <button
        onClick={handleZoomOut}
        disabled={!isImage && !isPdf}
        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-all outline-none"
        title="Zoom Out"
      >
        <ZoomOut className="h-4.5 w-4.5" />
      </button>
      <span className="text-[10px] font-bold text-muted-foreground min-w-[36px] text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={handleZoomIn}
        disabled={!isImage && !isPdf}
        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-all outline-none"
        title="Zoom In"
      >
        <ZoomIn className="h-4.5 w-4.5" />
      </button>

      <div className="h-4 w-px bg-border/60 mx-1" />

      <button
        onClick={handleRotate}
        disabled={!isImage && !isPdf}
        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent transition-all outline-none"
        title="Rotate Clockwise"
      >
        <RotateCw className="h-4.5 w-4.5" />
      </button>

      <button
        onClick={toggleFullscreen}
        className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all outline-none"
        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Preview"}
      >
        {isFullscreen ? <Minimize2 className="h-4.5 w-4.5" /> : <Maximize2 className="h-4.5 w-4.5" />}
      </button>

      {onDownload && (
        <>
          <div className="h-4 w-px bg-border/60 mx-1" />
          <button
            onClick={onDownload}
            className="p-1.5 rounded-lg bg-accent text-white hover:scale-105 active:scale-95 transition-all outline-none"
            title="Download Original"
          >
            <Download className="h-4.5 w-4.5" />
          </button>
        </>
      )}
    </div>
  );

  const getCanvasStyles = () => {
    return {
      transform: `scale(${zoom}) rotate(${rotation}deg)`,
      transition: "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)",
    };
  };

  const renderContent = () => {
    if (isImage) {
      return (
        <div className="w-full h-full flex items-center justify-center overflow-auto p-4 max-h-[500px]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={displayName}
            style={getCanvasStyles()}
            className="max-h-full max-w-full object-contain rounded-lg shadow-md select-none pointer-events-none"
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="w-full h-full min-h-[500px] overflow-hidden rounded-lg relative">
          <iframe
            src={`${url}#toolbar=0&navpanes=0`}
            title={displayName}
            style={getCanvasStyles()}
            className="w-full h-full border-none absolute inset-0"
          />
        </div>
      );
    }

    // Default Fallback for other file types
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-secondary/10 border border-dashed border-border rounded-xl select-none">
        <FileText className="h-12 w-12 text-muted-foreground/60 mb-3" />
        <h4 className="text-sm font-semibold text-foreground">{displayName}</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
          Previews are not supported for this file extension (.{fileType.toUpperCase()}). Please download to view content.
        </p>
        {onDownload && (
          <button
            onClick={onDownload}
            className="mt-4 flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-xs font-bold text-white shadow hover:scale-[1.02] active:scale-[0.98] transition-all outline-none"
          >
            <Download className="h-4 w-4" />
            Download original
          </button>
        )}
      </div>
    );
  };

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 bg-background/98 z-50 flex flex-col p-4 animate-in fade-in duration-200">
        <div className="flex items-center justify-between pb-3 select-none">
          <h3 className="text-sm font-bold text-foreground truncate max-w-xs">{displayName}</h3>
          {viewerControls}
        </div>
        <div className="flex-1 w-full bg-secondary/20 rounded-2xl border border-border/80 flex items-center justify-center overflow-hidden relative">
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 w-full">
      <div className="flex justify-end select-none">{viewerControls}</div>
      <div className="flex-1 w-full bg-secondary/15 rounded-xl border border-border/60 flex items-center justify-center overflow-hidden min-h-[400px] relative">
        {renderContent()}
      </div>
    </div>
  );
}
