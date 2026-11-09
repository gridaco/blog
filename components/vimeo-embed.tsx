/** Preserves the player options used by the original Grida blog. */
export function VimeoEmbed({
  videoId,
  title = "Video",
  autoplay = true,
  muted = true,
  loop = true,
}: {
  videoId: string;
  title?: string;
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
}) {
  const params = new URLSearchParams({
    badge: "0",
    autopause: "0",
    player_id: "0",
    app_id: "58479",
    autoplay: autoplay ? "1" : "0",
    muted: muted ? "1" : "0",
    loop: loop ? "1" : "0",
  });
  return (
    <div className="vimeo-embed">
      <iframe
        src={`https://player.vimeo.com/video/${videoId}?${params.toString()}`}
        title={title}
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}

export default VimeoEmbed;
