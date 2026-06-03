interface Props {
  timerMs: number;
  maxMs: number;
  syllable?: string;
}

const RADIUS = 50;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function Bomb({ timerMs, maxMs, syllable }: Props) {
  const ratio = Math.max(0, Math.min(1, timerMs / maxMs));
  const offset = CIRCUMFERENCE * (1 - ratio);
  const secs = timerMs / 1000;

  // Color transitions: green → yellow → orange → red
  let strokeColor = '#00ff88';
  if (ratio < 0.6) strokeColor = '#ffe000';
  if (ratio < 0.35) strokeColor = '#ff9000';
  if (ratio < 0.2) strokeColor = '#ff3366';

  const isDanger = ratio < 0.35;
  const isCritical = ratio < 0.2;

  const dangerClass = isCritical ? 'critical' : isDanger ? 'danger' : '';

  return (
    <div className={`bomb-wrapper ${dangerClass}`}>
      <div className="bomb-ring-container">
        <svg className="bomb-ring-svg" viewBox="0 0 120 120">
          <circle className="bomb-ring-bg" cx="60" cy="60" r={RADIUS} />
          <circle
            className="bomb-ring-progress"
            cx="60"
            cy="60"
            r={RADIUS}
            style={{
              strokeDasharray: CIRCUMFERENCE,
              strokeDashoffset: offset,
              stroke: strokeColor,
            }}
          />
        </svg>
        <div className="bomb-body">
          <span className="bomb-emoji" role="img" aria-label="pommi">
            💣
          </span>
          {syllable && <div className="bomb-syllable-overlay">{syllable}</div>}
          <span className="bomb-time" style={{ color: strokeColor }}>
            {secs.toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  );
}
