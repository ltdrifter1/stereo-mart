'use client';

/**
 * Soft atmospheric grade over the cel room — vignette + ambient glow wash.
 * pointer-events: none; never blocks the scene. Respects reduced motion.
 */
export default function FilmFX({ reduceMotion = false }: { reduceMotion?: boolean }) {
  return (
    <div className={`fx-layer${reduceMotion ? ' is-static' : ''}`} aria-hidden>
      <div className="fx-glow fx-glow-a" />
      <div className="fx-glow fx-glow-b" />
      <div className="fx-glow fx-glow-c" />
      <div className="fx-edge" />
      <div className="fx-scanlines" />
      <div className="fx-grain" />
    </div>
  );
}
