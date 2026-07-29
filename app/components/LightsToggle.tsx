'use client';

/**
 * Toggle between lights-on / lights-off panorama — balmingtiger lamp hotspot.
 */
export default function LightsToggle({
  visible,
  lightsOn,
  onToggle,
}: {
  visible: boolean;
  lightsOn: boolean;
  onToggle: () => void;
}) {
  if (!visible) return null;

  return (
    <button
      type="button"
      className={`lights-control${lightsOn ? '' : ' is-off'}`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      aria-pressed={!lightsOn}
      aria-label={lightsOn ? 'Turn lights off' : 'Turn lights on'}
      data-cursor="click"
      title={lightsOn ? 'Lights off' : 'Lights on'}
    >
      {lightsOn ? 'LIGHTS' : 'LIGHTS OFF'}
    </button>
  );
}
