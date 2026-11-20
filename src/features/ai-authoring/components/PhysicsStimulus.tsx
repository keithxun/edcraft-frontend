import { useId } from "react";
import { isRecord } from "./questionPayload";

type Point = [number, number];
type Series = { label: string; points: Point[] };
type DiagramNode = [string, number, number];
type Edge = [string, string, string, boolean];

function isPoint(value: unknown): value is Point {
    return Array.isArray(value) && value.length === 2 &&
        value.every((item) => typeof item === "number" && Number.isFinite(item));
}

function isSeries(value: unknown): value is Series {
    return isRecord(value) && typeof value.label === "string" &&
        Array.isArray(value.points) && value.points.length >= 2 && value.points.every(isPoint);
}

function isNode(value: unknown): value is DiagramNode {
    return Array.isArray(value) && value.length === 3 &&
        typeof value[0] === "string" && isPoint(value.slice(1));
}

function isEdge(value: unknown): value is Edge {
    return Array.isArray(value) && value.length === 4 &&
        value.slice(0, 3).every((item) => typeof item === "string") &&
        typeof value[3] === "boolean";
}

function scale(values: number[], start: number, end: number) {
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    return (value: number) => minimum === maximum
        ? (start + end) / 2
        : start + ((value - minimum) / (maximum - minimum)) * (end - start);
}

function StimulusTable({ headings, rows }: { headings: string[]; rows: string[][] }) {
    return (
        <div className="max-w-full overflow-x-auto">
            <table className="border-collapse text-sm">
                <thead><tr>{headings.map((heading, index) => (
                    <th key={index} scope="col" className="border px-3 py-1 text-left">{heading}</th>
                ))}</tr></thead>
                <tbody>{rows.map((row, index) => (
                    <tr key={index}>{row.map((cell, column) => (
                        <td key={column} className="border px-3 py-1">{cell}</td>
                    ))}</tr>
                ))}</tbody>
            </table>
        </div>
    );
}

const COLOURS = ["#3b82f6", "#d97706", "#16a34a", "#dc2626", "#8b5cf6"];

function Graph({ series, xLabel, yLabel }: { series: Series[]; xLabel: string; yLabel: string }) {
    const points = series.flatMap((item) => item.points);
    const x = scale(points.map((point) => point[0]), 68, 460);
    const y = scale(points.map((point) => point[1]), 245, 28);
    const xs = [...new Set(points.map((point) => point[0]))].sort((a, b) => a - b);
    const ys = [...new Set(points.map((point) => point[1]))].sort((a, b) => a - b);
    return (
        <figure className="space-y-2">
            <svg viewBox="0 0 500 305" role="img" aria-label={`${yLabel} against ${xLabel}`} className="w-full max-w-xl">
                <line x1="67" y1="245" x2="469" y2="245" stroke="currentColor" />
                <line x1="67" y1="245" x2="67" y2="17" stroke="currentColor" />
                {ys.some((value) => value < 0) && ys.some((value) => value > 0) && (
                    <line x1="67" y1={y(0)} x2="469" y2={y(0)} stroke="currentColor"
                        strokeOpacity="0.6" strokeDasharray="4 3" />
                )}
                <text x="270" y="295" textAnchor="middle" fill="currentColor" fontSize="13">{xLabel}</text>
                <text x="12" y="130" textAnchor="middle" transform="rotate(-90 12 130)" fill="currentColor" fontSize="13">{yLabel}</text>
                {xs.filter((_, index) => xs.length < 10 || index % 2 === 0).map((value) => (
                    <g key={value}>
                        <line x1={x(value)} y1="245" x2={x(value)} y2="252" stroke="currentColor" />
                        <text x={x(value)} y="266" textAnchor="middle" fill="currentColor" fontSize="10">{value}</text>
                    </g>
                ))}
                {ys.filter((_, index) => ys.length < 10 || index % 2 === 0).map((value) => (
                    <text key={value} x="62" y={y(value) + 4} textAnchor="end" fill="currentColor" fontSize="10">{value}</text>
                ))}
                {series.map((trace, index) => (
                    <g key={index} fill={COLOURS[index % COLOURS.length]}>
                        <polyline fill="none" stroke={COLOURS[index % COLOURS.length]} strokeWidth="2"
                            strokeDasharray={index ? `${index + 3} ${index + 2}` : undefined}
                            points={trace.points.map(([a, b]) => `${x(a)},${y(b)}`).join(" ")} />
                        {trace.points.map(([a, b], point) => <circle key={point} cx={x(a)} cy={y(b)} r="3" />)}
                    </g>
                ))}
            </svg>
            <ul aria-label="Graph legend" className="flex flex-wrap gap-3 text-xs">
                {series.map((trace, index) => <li key={index}>
                    <span aria-hidden="true" style={{ color: COLOURS[index % COLOURS.length] }}>
                        {index ? "┄" : "━"}
                    </span>{" "}{trace.label}
                </li>)}
            </ul>
            <details>
                <summary className="text-xs">Graph coordinates</summary>
                <StimulusTable headings={["Series", xLabel, yLabel]} rows={series.flatMap(
                    (trace) => trace.points.map(([a, b]) => [trace.label, String(a), String(b)]),
                )} />
            </details>
        </figure>
    );
}

const COMPONENTS = {
    resistor: ["M-16 0H-12V-6H12V6H-12V0 M12 0H16", "rectangle with leads"],
    variable_resistor: ["M-16 0H-12V-6H12V6H-12V0 M12 0H16 M-14 11L14 -11V-5 M14 -11H8", "rectangle crossed by an arrow"],
    cell: ["M-16 0H-3 M-3 -11V11 M3 -6V6 M3 0H16", "one long and one short perpendicular line"],
    battery: ["M-16 0H-9 M-9 -11V11 M-3 -6V6 M3 -11V11 M9 -6V6 M9 0H16", "two alternating pairs of long and short perpendicular lines"],
    diode: ["M-16 0H-8 M-8 -8V8L7 0Z M7 -9V9 M7 0H16", "triangle pointing at a perpendicular line"],
    switch_open: ["M-16 0H-8 M-8 0L9 -8 M8 0H16", "tilted lever with a gap between contacts"],
    switch_closed: ["M-16 0H16 M-9 -2V2 M9 -2V2", "lever joining two marked contacts"],
    lamp: ["M-16 0H-10A10 10 0 1 1 10 0A10 10 0 1 1 -10 0 M10 0H16 M-6 -6L6 6 M-6 6L6 -6", "circle containing a cross"],
    ammeter: ["M-16 0H-10A10 10 0 1 1 10 0A10 10 0 1 1 -10 0 M10 0H16 M-4 5L0 -5L4 5 M-2 1H2", "circle containing A"],
    voltmeter: ["M-16 0H-10A10 10 0 1 1 10 0A10 10 0 1 1 -10 0 M10 0H16 M-4 -5L0 5L4 -5", "circle containing V"],
    capacitor: ["M-16 0H-3 M-3 -9V9 M3 -9V9 M3 0H16", "two equal parallel lines"],
    thermistor: ["M-16 0H-12V-6H12V6H-12V0 M12 0H16 M-15 10H-8L12 -10", "rectangle crossed by a line with a bent end"],
    ldr: ["M-16 0H-10V-4H10V4H-10V0 M10 0H16 M-15 -13L-7 -7V-11 M-7 -7H-11 M-7 -15L1 -9V-13 M1 -9H-3", "rectangle with two arrows pointing toward it"],
} as const;

type Components = Record<string, keyof typeof COMPONENTS>;

function isComponents(value: unknown): value is Components {
    return isRecord(value) && Object.entries(value).every(([index, name]) =>
        /^(0|[1-9]\d?)$/.test(index) && typeof name === "string" && Object.hasOwn(COMPONENTS, name),
    );
}

function Diagram({ nodes, edges, components = {} }: {
    nodes: DiagramNode[]; edges: Edge[]; components?: Components;
}) {
    const id = useId();
    const xs = nodes.map((node) => node[1]);
    const ys = nodes.map((node) => node[2]);
    const centreX = (Math.min(...xs) + Math.max(...xs)) / 2;
    const centreY = (Math.min(...ys) + Math.max(...ys)) / 2;
    const factor = Math.min(
        408 / (Math.max(...xs) - Math.min(...xs) || 1),
        170 / (Math.max(...ys) - Math.min(...ys) || 1),
    );
    const x = (value: number) => 250 + (value - centreX) * factor;
    const y = (value: number) => 125 - (value - centreY) * factor;
    const positions = new Map(nodes.map(([name, a, b]) => [name, [x(a), y(b)]]));
    return (
        <figure className="space-y-2">
            <svg viewBox="0 0 500 255" role="img" aria-label="Labelled Physics schematic" className="w-full max-w-xl">
                <defs><marker id={id} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
                    <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="currentColor" />
                </marker></defs>
                {edges.map(([from, to, label, arrow], index) => {
                    const start = positions.get(from);
                    const end = positions.get(to);
                    if (!start || !end) return null;
                    const dx = end[0] - start[0];
                    const dy = end[1] - start[1];
                    const middleX = (start[0] + end[0]) / 2;
                    const middleY = (start[1] + end[1]) / 2;
                    const symbol = components[index];
                    return <g key={index}>
                        {symbol ? <g transform={`translate(${middleX} ${middleY}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`}
                            fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d={`M${-Math.hypot(dx, dy) / 2} 0H-16 M16 0H${Math.hypot(dx, dy) / 2}`} />
                            <path d={COMPONENTS[symbol][0]} />
                        </g> : <line x1={start[0]} y1={start[1]} x2={end[0]} y2={end[1]} stroke="currentColor"
                            markerEnd={arrow ? `url(#${id})` : undefined} />}
                        <text x={middleX + (symbol && Math.abs(dy) > Math.abs(dx) ? 15 : 0)}
                            y={middleY - (symbol ? 16 : 8)}
                            textAnchor="middle" fill="currentColor" fontSize="12">{label}</text>
                    </g>;
                })}
                {nodes.map(([name, a, b]) => <g key={name}>
                    <circle cx={x(a)} cy={y(b)} r="3" fill="currentColor" />
                    <text x={x(a)} y={y(b) + 17} fill="currentColor" textAnchor="middle" fontSize="12">{name}</text>
                </g>)}
            </svg>
            <details>
                <summary className="text-xs">Schematic labels and positions</summary>
                <StimulusTable headings={["Point", "Horizontal position", "Vertical position"]} rows={
                    nodes.map(([label, a, b]) => [label, String(a), String(b)])
                } />
                <ul className="list-inside list-disc text-xs">{edges.map(([from, to, label, arrow], index) => (
                    <li key={index}>{from} {arrow ? "→" : "—"} {to}{label ? ` · ${label}` : ""}
                        {components[index] ? ` · ${COMPONENTS[components[index]][1]}` : ""}
                    </li>
                ))}</ul>
            </details>
        </figure>
    );
}

export function PhysicsStimulus({ value }: { value: unknown }) {
    if (!isRecord(value)) return null;
    if (value.kind === "graph" && typeof value.x === "string" && typeof value.y === "string"
        && Array.isArray(value.series) && value.series.length && value.series.every(isSeries)) {
        return <Graph series={value.series} xLabel={value.x} yLabel={value.y} />;
    }
    if (value.kind === "diagram" && Array.isArray(value.nodes) && value.nodes.length
        && value.nodes.every(isNode) && Array.isArray(value.edges) && value.edges.every(isEdge)) {
        return <Diagram nodes={value.nodes} edges={value.edges}
            components={isComponents(value.components) ? value.components : undefined} />;
    }
    if (value.kind === "table" && Array.isArray(value.headers)
        && value.headers.every((heading) => typeof heading === "string") && Array.isArray(value.rows)
        && value.rows.every((row) => Array.isArray(row) && row.every((item) => typeof item === "string"))) {
        return <StimulusTable headings={value.headers} rows={value.rows} />;
    }
    return null;
}
