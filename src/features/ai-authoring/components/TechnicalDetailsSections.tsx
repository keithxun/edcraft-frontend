import {
    checkLabel,
    checkName,
    findingText,
    statusLabel,
} from "../checkMetadata";
import { capitalize, modelLabel } from "../format";
import { domainLabel } from "../domains";
import { warningText } from "../warnings";
import type {
    AuthoringCheck,
    AuthoringDifficultyOutcome,
    AuthoringRelevanceOutcome,
    AuthoringRequest,
    ValidationLimits,
} from "../types";

// Stock reasons from edcraft_validator application/template_difficulty.py and the relevance assessor.
const STOCK_DIFFICULTY_REASONS = new Set([
    "forced decision from first-token label probabilities",
]);

const STOCK_RELEVANCE_REASONS = new Set(["advisory relevance assessment completed"]);

function isStockReason(reason: string, stock: Set<string>): boolean {
    return stock.has(reason.trim().toLowerCase().replace(/\.$/, ""));
}

function subjectLabel(domain: string): string {
    if (domain === "code") return "Programming";
    if (domain === "math") return "Mathematics";
    return domainLabel(domain);
}

function DetailRows({ rows }: { rows: Array<[string, string]> }) {
    return (
        <dl className="grid gap-x-4 gap-y-1 text-xs @sm:grid-cols-[minmax(8rem,auto)_1fr]">
            {rows.map(([label, value]) => (
                <div key={label} className="contents">
                    <dt className="font-medium text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 break-words">{value}</dd>
                </div>
            ))}
        </dl>
    );
}

/** The original request with the field names an educator sees elsewhere. */
export function RequestDetails({ request }: { request: AuthoringRequest }) {
    const rows: Array<[string, string]> = [
        ["Subject", subjectLabel(request.domain)],
        ["Difficulty", capitalize(request.difficulty)],
        ["Wrong choices", String(request.num_distractors)],
        ["Model profile", modelLabel(request)],
    ];
    if (request.connection_id) {
        rows.push(["Model source", "Connection"]);
    }

    return (
        <div className="space-y-2 text-xs">
            <p className="whitespace-pre-wrap break-words text-sm">{request.prompt}</p>
            <DetailRows rows={rows} />
        </div>
    );
}

/** Every recorded check with its friendly name, status and findings. */
export function ChecksDetails({ checks }: { checks: AuthoringCheck[] }) {
    if (checks.length === 0) {
        return <p className="text-xs text-muted-foreground">None</p>;
    }

    return (
        <ul className="space-y-2">
            {checks.map((check, index) => {
                const findings = check.findings ?? [];
                return (
                    <li
                        key={`${check.tool}-${index}`}
                        className="rounded border bg-background/60 p-2"
                    >
                        <p className="text-xs font-medium">{checkLabel(check)}</p>
                        <p className="text-xs text-muted-foreground">
                            {statusLabel(check.status)}
                        </p>
                        {check.error && (
                            <p className="mt-1 break-words text-xs text-destructive">
                                {check.error}
                            </p>
                        )}
                        {findings.map((finding, findingIndex) => (
                            <p
                                key={`${finding.code}-${findingIndex}`}
                                className="mt-1 break-words text-xs text-muted-foreground"
                            >
                                {findingText(finding)}
                            </p>
                        ))}
                    </li>
                );
            })}
        </ul>
    );
}

/** A difficulty result with plain wording and the judge's method. */
export function DifficultyDetails({ outcome }: { outcome: AuthoringDifficultyOutcome }) {
    const requested = outcome.requested_difficulty;
    const estimated = outcome.estimated_difficulty;
    const assessed =
        Boolean(estimated) &&
        outcome.decision !== "unavailable" &&
        outcome.status !== "error";
    const differs =
        outcome.decision === "advisory_mismatch" ||
        (Boolean(requested && estimated) && requested !== estimated);
    const result = assessed ? (differs ? "Does not match" : "Matches") : "Not assessed";
    const confidence =
        outcome.confidence !== null && outcome.confidence !== undefined
            ? `${Math.round(outcome.confidence * 100)}%`
            : null;

    let source: string | null = null;
    let decided: string | null = null;
    if (outcome.assessment_path === "decision") {
        source = "decision model";
        decided =
            confidence !== null
                ? `The decision model picked a level directly, with ${confidence} confidence from its answer probabilities.`
                : "The decision model picked a level directly.";
    } else if (outcome.assessment_path === "reasoning") {
        source = "reasoning assessment";
        decided = "The judge model reasoned through the rubric before deciding.";
    }

    const rows: Array<[string, string]> = [
        ["Requested difficulty", requested ? capitalize(requested) : "Not set"],
        ["Estimated difficulty", estimated ? capitalize(estimated) : "Not assessed"],
        ["Result", result],
    ];
    if (confidence !== null) rows.push(["Confidence", confidence]);

    const reason =
        outcome.reason && !isStockReason(outcome.reason, STOCK_DIFFICULTY_REASONS)
            ? outcome.reason
            : null;

    return (
        <div className="space-y-2">
            <DetailRows rows={rows} />
            {source !== null && (
                <p className="text-xs text-muted-foreground">Source: {source}</p>
            )}
            {decided !== null && <p className="text-xs">{decided}</p>}
            {reason !== null && (
                <p className="break-words text-xs text-muted-foreground">{reason}</p>
            )}
        </div>
    );
}

/** A relevance result with its score, threshold and plain verdict. */
export function RelevanceDetails({ outcome }: { outcome: AuthoringRelevanceOutcome }) {
    const hasScore = outcome.score !== null && outcome.score !== undefined;
    const hasVerdict = outcome.relevant !== null && outcome.relevant !== undefined;
    const unavailable =
        outcome.unavailable === true ||
        outcome.status === "unavailable" ||
        (!hasScore && !hasVerdict);
    const score = outcome.score;
    const threshold = outcome.threshold;
    const scoreLine =
        score !== null && score !== undefined
            ? `Relevance score ${score.toFixed(3)}${
                  threshold !== null && threshold !== undefined
                      ? ` (threshold ${threshold.toFixed(3)})`
                      : ""
              }`
            : null;
    const result = unavailable
        ? "Not assessed"
        : outcome.relevant === true
          ? "Relevant"
          : outcome.relevant === false
            ? "Not relevant"
            : "Not assessed";
    const reason =
        outcome.reason && !isStockReason(outcome.reason, STOCK_RELEVANCE_REASONS)
            ? outcome.reason
            : null;

    return (
        <div className="space-y-1 text-xs">
            {scoreLine !== null && <p className="text-sm">{scoreLine}</p>}
            <p className="text-sm">Result: {result}</p>
            {reason !== null && (
                <p className="break-words text-muted-foreground">{reason}</p>
            )}
        </div>
    );
}

/** How much of the finite domain was checked and the run's budgets. */
export function ValidationLimitsDetails({ limits }: { limits: ValidationLimits }) {
    const checked = limits.examples_checked;
    const declared = limits.declared_domain_size;
    const everyCombination =
        limits.whole_domain === true &&
        checked !== null &&
        checked !== undefined &&
        declared !== null &&
        declared !== undefined &&
        checked >= declared;
    const coverage =
        checked !== null && checked !== undefined
            ? declared !== null && declared !== undefined
                ? `Examples checked: ${checked} of ${declared} combinations${
                      everyCombination ? " (every combination)" : ""
                  }`
                : `Examples checked: ${checked}`
            : null;

    const budget: string[] = [];
    if (limits.max_examples !== null && limits.max_examples !== undefined) {
        budget.push(`${limits.max_examples} combinations`);
    }
    if (
        limits.max_execution_calls !== null &&
        limits.max_execution_calls !== undefined
    ) {
        budget.push(`${limits.max_execution_calls} calls`);
    }
    if (limits.timeout_seconds !== null && limits.timeout_seconds !== undefined) {
        budget.push(`${limits.timeout_seconds} s`);
    }

    return (
        <div className="space-y-1 text-xs">
            {coverage !== null && <p>{coverage}</p>}
            {budget.length > 0 && <p>Limits: {budget.join(", ")}</p>}
        </div>
    );
}

/** Review warning codes as sentences, keeping unknown codes as they are. */
export function WarningsDetails({ warnings }: { warnings: string[] }) {
    return (
        <ul className="list-disc space-y-1 pl-4 text-xs">
            {warnings.map((warning, index) => (
                <li key={`${warning}-${index}`} className="break-words">
                    {warningText(warning)}
                </li>
            ))}
        </ul>
    );
}

/** Fixed plan steps use check names when the step is a tool identifier. */
export function FixedPlanDetails({ steps }: { steps: string[] }) {
    return (
        <ul className="list-disc space-y-1 pl-4 text-xs">
            {steps.map((step, index) => (
                <li key={`${step}-${index}`} className="break-words">
                    {step.includes("_") ? checkName(step) : step}
                </li>
            ))}
        </ul>
    );
}
