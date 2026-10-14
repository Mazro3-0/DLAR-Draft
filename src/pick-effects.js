// The first state after joining/rejoining is a baseline, never a new pick.
export function createPickTracker() {
  let previous = null;
  return {
    observe(snapshot, { initial = false } = {}) {
      const next = new Map(
        (snapshot?.steps || []).map((s) => [s.id, s.heroId]),
      );
      const picks =
        previous && !initial
          ? (snapshot?.steps || []).filter(
              (s) =>
                s.selectionType === "pick" &&
                s.heroId &&
                previous.get(s.id) !== s.heroId,
            )
          : [];
      previous = next;
      return picks;
    },
    reset() {
      previous = null;
    },
  };
}

const SILENCE =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICA";

// One reusable audio element prevents simultaneous hero lines from overlapping.
export function createVoicePlayer({
  createAudio = () => new Audio(),
  schedule = setTimeout,
  cancel = clearTimeout,
  onBlocked = () => {},
} = {}) {
  const audio = createAudio();
  audio.preload = "auto";
  let enabled = false,
    volume = 0.7,
    queue = [],
    busy = false,
    timer,
    generation = 0,
    disposed = false;
  function clear() {
    generation++;
    cancel(timer);
    audio.pause();
    audio.onended = audio.onerror = null;
    queue = [];
    busy = false;
  }
  function next() {
    if (busy || !enabled || disposed || !queue.length) return;
    busy = true;
    const token = ++generation;
    audio.src = queue.shift();
    audio.volume = volume;
    const done = () => {
      if (token !== generation || disposed) return;
      cancel(timer);
      audio.pause();
      busy = false;
      next();
    };
    audio.onended = audio.onerror = done;
    timer = schedule(done, 10000);
    Promise.resolve(audio.play()).catch((error) => {
      if (token !== generation || disposed) return;
      if (error?.name === "NotAllowedError") {
        clear();
        onBlocked(true);
      } else done();
    });
  }
  return {
    configure(settings) {
      enabled = settings.enabled;
      volume = Math.max(0, Math.min(1, settings.volume));
      audio.volume = volume;
      if (!enabled) clear();
    },
    enqueue(url) {
      if (!enabled || disposed || !url) return;
      if (queue.length < 12) queue.push(url);
      next();
    },
    async unlock() {
      clear();
      const token = generation;
      audio.src = SILENCE;
      try {
        await audio.play();
        if (token !== generation || disposed) return false;
        audio.pause();
        onBlocked(false);
        return true;
      } catch {
        if (!disposed) onBlocked(true);
        return false;
      }
    },
    clear,
    dispose() {
      clear();
      disposed = true;
      audio.removeAttribute("src");
    },
  };
}
