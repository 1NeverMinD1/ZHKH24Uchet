import { useState } from "react";
import { formatDate } from "../../utils/dates";
import { useLocale } from "../../i18n/context";
import "./_CompaniesChart.scss";

const WIDTH = 640;
const HEIGHT = 250;
const PAD_X = 36;
const PAD_TOP = 30;
const PAD_BOTTOM = 52;
const DENSE_FROM = 25;

const MONTHS = {
  ru: [
    "янв",
    "фев",
    "мар",
    "апр",
    "май",
    "июн",
    "июл",
    "авг",
    "сен",
    "окт",
    "ноя",
    "дек",
  ],
  kk: [
    "қаң",
    "ақп",
    "нау",
    "сәу",
    "мам",
    "мау",
    "шіл",
    "там",
    "қыр",
    "қаз",
    "қар",
    "жел",
  ],
};

const niceStep = (value) => {
  const raw = Math.max(value, 1) / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const fraction = raw / power;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return Math.max(1, nice * power);
};

const DenseChart = ({ points: allPoints, label }) => {
  const [hovered, setHovered] = useState(null);

  const firstFilled = allPoints.findIndex((point) => point.companies > 0);
  const start = firstFilled > 0 ? firstFilled - 1 : 0;
  const trimmed = allPoints.slice(start);
  const points = trimmed.length >= 2 ? trimmed : allPoints;

  const max = points.reduce(
    (best, point) => Math.max(best, point.companies),
    0,
  );
  const stepValue = niceStep(max);
  const top = Math.max(stepValue, Math.ceil(max / stepValue) * stepValue);
  const ticks = [];
  for (let value = 0; value <= top; value += stepValue) ticks.push(value);

  const area = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const base = HEIGHT - PAD_BOTTOM;
  const step = (WIDTH - PAD_X * 2) / (points.length - 1);
  const xOf = (index) => PAD_X + step * index;
  const yOf = (value) => base - (value / top) * area;

  let line = `M ${xOf(0)} ${yOf(points[0].companies)}`;
  for (let index = 1; index < points.length; index += 1) {
    line += ` H ${xOf(index)} V ${yOf(points[index].companies)}`;
  }
  const fill = `${line} V ${base} H ${xOf(0)} Z`;

  const activeIndex = hovered ?? points.length - 1;
  const active = points[activeIndex];
  const activeX = xOf(activeIndex);
  const activeY = yOf(active.companies);
  const tipText =
    hovered === null
      ? String(active.companies)
      : `${formatDate(active.takenOn)}: ${active.companies}`;
  const tipRight = activeX > WIDTH / 2;

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      role="img"
      aria-label={label}
      onMouseLeave={() => setHovered(null)}
    >
      {ticks.map((value) => (
        <g key={`scale-${value}`}>
          {value > 0 && (
            <line
              className="chart__grid"
              x1={PAD_X}
              x2={WIDTH - PAD_X}
              y1={yOf(value)}
              y2={yOf(value)}
            />
          )}
          <text
            className="chart__scale"
            x={PAD_X - 6}
            y={yOf(value) + 4}
            textAnchor="end"
          >
            {value}
          </text>
        </g>
      ))}

      {points.map((point, index) => {
        const isJanuary = point.takenOn.slice(5, 7) === "01";
        if (!isJanuary && index !== 0) return null;
        const x = xOf(index);
        return (
          <g key={`tick-${point.takenOn}`}>
            <line
              className="chart__tick"
              x1={x}
              x2={x}
              y1={base}
              y2={base + 6}
            />
            <text
              className="chart__label"
              x={x}
              y={base + 22}
              textAnchor="middle"
            >
              {point.takenOn.slice(0, 4)}
            </text>
          </g>
        );
      })}

      <path className="chart__area" d={fill} />
      <path className="chart__line" d={line} />
      <line
        className="chart__axis"
        x1={PAD_X}
        x2={WIDTH - PAD_X}
        y1={base}
        y2={base}
      />

      {hovered !== null && (
        <line
          className="chart__guide"
          x1={activeX}
          x2={activeX}
          y1={PAD_TOP}
          y2={base}
        />
      )}
      <circle className="chart__dot" cx={activeX} cy={activeY} r="4" />
      <text
        className="chart__value"
        x={tipRight ? activeX - 8 : activeX + 8}
        y={Math.max(activeY - 10, PAD_TOP - 8)}
        textAnchor={tipRight ? "end" : "start"}
      >
        {tipText}
      </text>

      {points.map((point, index) => (
        <rect
          key={`hit-${point.takenOn}`}
          className="chart__hit"
          x={xOf(index) - step / 2}
          y={PAD_TOP}
          width={step}
          height={area}
          onMouseEnter={() => setHovered(index)}
        />
      ))}
    </svg>
  );
};
export default function CompaniesChart({ points, label }) {
  const { locale } = useLocale();
  const months = MONTHS[locale] || MONTHS.ru;

  const max = points.reduce(
    (best, point) => Math.max(best, point.companies),
    1,
  );

  if (points.length >= DENSE_FROM) {
    return <DenseChart points={points} label={label} max={max} />;
  }

  const slot = (WIDTH - PAD_X * 2) / points.length;
  const barWidth = Math.min(90, slot * 0.6);
  const area = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const compactYears = points.length > 12;

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

        const monthIndex = Number(point.takenOn.slice(5, 7)) - 1;
        const year = point.takenOn.slice(0, 4);
        const showYear = !compactYears || index === 0 || monthIndex === 0;

        return (
          <g key={point.takenOn}>
            <title>{`${formatDate(point.takenOn)}: ${point.companies}`}</title>
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
              y={HEIGHT - PAD_BOTTOM + 18}
              textAnchor="middle"
            >
              <tspan x={center}>{months[monthIndex] || ""}</tspan>
              {showYear && (
                <tspan x={center} dy="14">
                  {year}
                </tspan>
              )}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
