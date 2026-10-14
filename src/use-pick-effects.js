import { useEffect, useRef, useState } from "react";
import { createPickTracker, createVoicePlayer } from "./pick-effects.js";
import heroes from "./heroes.json";

const roster = Object.fromEntries(heroes.map((hero) => [hero.id, hero]));

export function usePickEffects(
  snapshot,
  identity,
  initialSnapshots,
  config,
  overlay,
) {
  const [flashes, setFlashes] = useState({});
  const [previewSound, setPreviewSound] = useState(false);
  const [soundBlocked, setSoundBlocked] = useState(false);
  const tracker = useRef(createPickTracker());
  const previousIdentity = useRef(identity);
  const timers = useRef(new Map());
  const player = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const voice = createVoicePlayer({
      createAudio: () => audioRef.current,
      onBlocked: setSoundBlocked,
    });
    player.current = voice;
    const pending = timers.current;
    return () => {
      voice.dispose();
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  useEffect(() => {
    player.current.configure({
      enabled: config.voiceLines && (overlay || previewSound),
      volume: config.voiceVolume / 100,
    });
  }, [config.voiceLines, config.voiceVolume, overlay, previewSound]);

  useEffect(() => {
    if (previousIdentity.current !== identity) {
      previousIdentity.current = identity;
      tracker.current.reset();
      timers.current.forEach(clearTimeout);
      timers.current.clear();
      setFlashes({});
      player.current.clear();
    }
    const picks = tracker.current.observe(snapshot, {
      initial: initialSnapshots.current.has(snapshot),
    });
    for (const pick of picks) {
      const hero = roster[pick.heroId];
      if (config.pickEffects) {
        clearTimeout(timers.current.get(pick.id));
        setFlashes((current) => ({ ...current, [pick.id]: pick.heroId }));
        timers.current.set(
          pick.id,
          setTimeout(() => {
            setFlashes((current) => {
              const next = { ...current };
              delete next[pick.id];
              return next;
            });
            timers.current.delete(pick.id);
          }, 2000),
        );
      }
      const lines = hero?.voiceLines || [];
      if (lines.length)
        player.current.enqueue(lines[Math.floor(Math.random() * lines.length)]);
    }
  }, [snapshot, identity, initialSnapshots, config.pickEffects]);

  // Warm the small portrait variants before their first two-second appearance.
  useEffect(() => {
    const images = heroes.flatMap((hero) =>
      [hero.gloatImage, hero.criticalImage].filter(Boolean).map((src) => {
        const image = new Image();
        image.src = src;
        return image;
      }),
    );
    return () =>
      images.forEach((image) => {
        image.src = "";
      });
  }, []);

  const enableSound = async () => {
    if (await player.current.unlock()) setPreviewSound(true);
  };
  const togglePreviewSound = () => {
    if (previewSound) setPreviewSound(false);
    else void enableSound();
  };
  return {
    flashes,
    previewSound,
    soundBlocked,
    enableSound,
    togglePreviewSound,
    audioRef,
  };
}
