import { formatDate } from "../../utils/dates";
import "./_CompaniesChart.scss";

const WIDTH = 640;
const HEIGHT = 240;
const PAD_X = 36;
const PAD_TOP = 30;
const PAD_BOTTOM = 42;

export default function CompaniesChart({ points, label }) {
  const max = points.reduce(
    (best, point) => Math.max(best, point.companies),
    1,
  );
  const slot = (WIDTH - PAD_X * 2) / points.length;
  const barWidth = Math.min(90, slot * 0.6);
  const area = HEIGHT - PAD_TOP - PAD_BOTTOM;

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
    >
      <line
        className="chart__axis"
        x1={PAD_X}
        x2={WIDTH - PAD_X}
        y1={HEIGHT - PAD_BOTTOM}
        y2={HEIGHT - PAD_BOTTOM}
      />
      {points.map((point, index) => {
        const height = (point.companies / max) * area;
        const x = PAD_X + slot * index + (slot - barWidth) / 2;
        const y = HEIGHT - PAD_BOTTOM - height;
        const center = x + barWidth / 2;

        return (
          <g key={point.takenOn}>
            <rect
              className={`chart__bar${point.isTest ? " chart__bar--test" : ""}`}
              x={x}
              y={y}
              width={barWidth}
              height={Math.max(height, 1)}
              rx="4"
            />
            <text
              className="chart__value"
              x={center}
              y={y - 8}
              textAnchor="middle"
            >
              {point.companies}
            </text>
            <text
              className="chart__label"
              x={center}
              y={HEIGHT - PAD_BOTTOM + 20}
              textAnchor="middle"
            >
              {formatDate(point.takenOn)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
