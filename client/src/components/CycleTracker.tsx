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

const phaseStrokeColors: Record<string, string> = {
  menstrual: "stroke-[hsl(350,65%,55%)]",
  follicular: "stroke-[hsl(145,50%,45%)]",
  ovulatory: "stroke-[hsl(35,85%,55%)]",
  luteal: "stroke-[hsl(265,50%,55%)]",
};

const phaseTextColors: Record<string, string> = {
  menstrual: "text-[hsl(350,65%,55%)]",
  follicular: "text-[hsl(145,50%,45%)]",
  ovulatory: "text-[hsl(35,85%,55%)]",
  luteal: "text-[hsl(265,50%,55%)]",
};

const phaseBgColors: Record<string, string> = {
  menstrual: "bg-[hsl(350,65%,55%)]",
  follicular: "bg-[hsl(145,50%,45%)]",
  ovulatory: "bg-[hsl(35,85%,55%)]",
  luteal: "bg-[hsl(265,50%,55%)]",
};

export default function CycleTracker({ cycleDay, cycleLength, phase }: CycleTrackerProps) {
  const progress = cycleDay / cycleLength;
  const circumference = 2 * Math.PI * 70;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="relative flex flex-col items-center gap-3" data-testid="cycle-tracker">
      <div className="relative w-[180px] h-[180px]">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle
            className="fill-none stroke-muted"
            cx="80"
            cy="80"
            r="70"
            strokeWidth="8"
          />
          <circle
            className={`fill-none ${phaseStrokeColors[phase]}`}
            cx="80"
            cy="80"
            r="70"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold leading-none text-foreground" data-testid="text-cycle-day">{cycleDay}</span>
          <span className="text-xs uppercase tracking-wide text-muted-foreground mt-1">Day</span>
        </div>
      </div>
      <div className="flex gap-1 py-2 w-full" data-testid="phase-timeline">
        {(["menstrual", "follicular", "ovulatory", "luteal"] as const).map((p) => (
          <div
            key={p}
            className={`flex-1 h-1.5 rounded-full ${phaseBgColors[p]} ${p === phase ? "opacity-100" : "opacity-30"} transition-opacity duration-300`}
          />
        ))}
      </div>
      <span
        className={`text-sm font-semibold capitalize ${phaseTextColors[phase]}`}
        data-testid="text-cycle-phase"
      >
        {phaseLabels[phase]} Phase
      </span>
    </div>
  );
}
