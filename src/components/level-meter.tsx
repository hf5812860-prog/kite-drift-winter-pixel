import { useEffect, useRef } from "react";

const BARS = 12;

export function LevelMeter({
  stream,
  active,
}: {
  stream: MediaStream | null;
  active: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    const bars = root ? [...root.querySelectorAll<HTMLElement>("[data-bar]")] : [];
    const rest = () => {
      for (const bar of bars) bar.style.transform = "scaleY(0.16)";
    };
    if (!root || !stream || !active) {
      rest();
      return;
    }
    const audio = new AudioContext();
    void audio.resume();
    const source = audio.createMediaStreamSource(stream);
    const analyser = audio.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);
    const bins = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;
    let last = 0;
    const tick = (time: number) => {
      raf = requestAnimationFrame(tick);
      if (time - last < 70) return;
      last = time;
      analyser.getByteFrequencyData(bins);
      bars.forEach((bar, index) => {
        const start = Math.floor((index / bars.length) * bins.length);
        const end = Math.max(start + 1, Math.floor(((index + 1) / bars.length) * bins.length));
        let sum = 0;
        for (let i = start; i < end; i++) sum += bins[i] ?? 0;
        const avg = sum / (end - start) / 255;
        bar.style.transform = `scaleY(${(0.16 + avg * 0.84).toFixed(3)})`;
      });
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void audio.close();
      rest();
    };
  }, [stream, active]);

  return (
    <div ref={ref} className="flex h-8 items-end gap-1" aria-hidden="true">
      {Array.from({ length: BARS }, (_, index) => (
        <span
          key={index}
          data-bar=""
          className="h-full w-1 origin-bottom rounded-full bg-brass"
          style={{ transform: "scaleY(0.16)" }}
        />
      ))}
    </div>
  );
}
