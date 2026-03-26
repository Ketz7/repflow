"use client";

import { extractYouTubeId } from "@/lib/utils";

interface YouTubeEmbedProps {
  url: string;
  className?: string;
}

export default function YouTubeEmbed({ url, className }: YouTubeEmbedProps) {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;

  return (
    <div className={`relative w-full rounded-xl overflow-hidden aspect-video bg-surface ${className || ""}`}>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`}
        title="Exercise video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="absolute inset-0 w-full h-full"
      />
    </div>
  );
}
