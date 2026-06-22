let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

/** Libera áudio após gesto do usuário (política dos navegadores). */
export function unlockAlertAudio() {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
}

/** Alerta sonoro curto para queda de conectividade. */
export function playOfflineAlertSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const play = () => {
    const t0 = ctx.currentTime;
    const notes = [880, 660, 880];

    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = notes[i];
      osc.connect(gain);
      gain.connect(ctx.destination);

      const start = t0 + i * 0.22;
      const end = start + 0.18;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.start(start);
      osc.stop(end);
    }
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(play).catch(() => {});
    return;
  }
  play();
}

/** Alerta sonoro para veículo entrando no raio de uma unidade. */
export function playProximityAlertSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const play = () => {
    const t0 = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99];

    for (let i = 0; i < notes.length; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = notes[i];
      osc.connect(gain);
      gain.connect(ctx.destination);

      const start = t0 + i * 0.16;
      const end = start + 0.14;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.start(start);
      osc.stop(end);
    }
  };

  if (ctx.state === "suspended") {
    void ctx.resume().then(play).catch(() => {});
    return;
  }
  play();
}
