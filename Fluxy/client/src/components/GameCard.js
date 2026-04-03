import React, { useState, useRef, useEffect, useMemo } from "react";
import { generateGameThumbnail } from "../utils/gameUtils";

function LazyImage({ src, alt, className, fallbackName }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef(null);
  const fallback = useMemo(() => generateGameThumbnail(fallbackName || alt || "Game"), [fallbackName, alt]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && imgRef.current) {
          imgRef.current.src = src;
        }
      },
      { rootMargin: "100px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  if (error || !src) {
    return <img src={fallback} alt={alt} className={className} loading="lazy" />;
  }

  return (
    <>
      {!loaded && (
        <div className="game-thumb-placeholder">
          <div className="spinner" />
        </div>
      )}
      <img
        ref={imgRef}
        alt={alt}
        className={className}
        style={{ display: loaded ? "block" : "none" }}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </>
  );
}

export default function GameCard({ game, onClick }) {
  const title = game.title || game.name || "Untitled";

  return (
    <div className="game-card animate-up" onClick={() => onClick(game)}>
      <LazyImage src={game.thumbnail} alt={title} className="game-thumb" fallbackName={title} />
      {game.featured && <span className="game-badge badge-featured">Featured</span>}
      {game.trending && !game.featured && <span className="game-badge badge-trending">Hot</span>}
      <div className="game-info">
        <div className="game-title">{title}</div>
        <div className="game-desc">{game.description}</div>
        <div className="game-meta">
          <span className="game-category">{game.category}</span>
          <span className="game-plays">{(game.play_count || 0).toLocaleString()} plays</span>
        </div>
      </div>
    </div>
  );
}
