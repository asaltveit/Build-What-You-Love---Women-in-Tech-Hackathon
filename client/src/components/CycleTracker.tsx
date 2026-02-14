import "@/styles/bem-components.css";

interface CycleTrackerProps {
  cycleDay: number;
  cycleLength: number;
  phase: "menstrual" | "follicular" | "ovulatory" | "luteal";
}

const phaseLabels: Record<string, string> = {
  menstrual: "Menstrual",
  follicular: "Follicular",
  ovulatory: "Ovulatory",
  luteal: "Luteal",
};

export default function CycleTracker({ cycleDay, cycleLength, phase }: CycleTrackerProps) {
  const progress = cycleDay / cycleLength;
  const circumference = 2 * Math.PI * 70;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="cycle-tracker" data-testid="cycle-tracker">
      <div className="cycle-tracker__ring">
        <svg viewBox="0 0 160 160">
          <circle
            className="cycle-tracker__ring-bg"
            cx="80"
            cy="80"
            r="70"
          />
          <circle
            className={`cycle-tracker__ring-progress cycle-tracker__ring-progress--${phase}`}
            cx="80"
            cy="80"
            r="70"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="cycle-tracker__center">
          <span className="cycle-tracker__day" data-testid="text-cycle-day">{cycleDay}</span>
          <span className="cycle-tracker__label">Day</span>
        </div>
      </div>
      <div className="phase-timeline" data-testid="phase-timeline">
        {(["menstrual", "follicular", "ovulatory", "luteal"] as const).map((p) => (
          <div
            key={p}
            className={`phase-timeline__segment phase-timeline__segment--${p} ${
              p === phase ? "phase-timeline__segment--active" : ""
            }`}
          />
        ))}
      </div>
      <span
        className={`cycle-tracker__phase cycle-tracker__phase--${phase}`}
        data-testid="text-cycle-phase"
      >
        {phaseLabels[phase]} Phase
      </span>
    </div>
  );
}
