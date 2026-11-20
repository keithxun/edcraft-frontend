import { Badge } from "@/components/ui/badge";
import type { AuthoringQuestionPayload } from "../types";
import { showsDomainView } from "../domains";
import { BiologyQuestionView } from "./BiologyQuestionView";
import { CodeQuestionView } from "./CodeQuestionView";
import { ChemistryQuestionView } from "./ChemistryQuestionView";
import { EvidenceDetails } from "./EvidenceDetails";
import { GenericQuestionView } from "./GenericQuestionView";
import { MathQuestionView } from "./MathQuestionView";
import { PhysicsStimulus } from "./PhysicsStimulus";
import { QuestionFigure } from "./QuestionFigure";
import {
    buildQuestionFields,
    isBiologyQuestionPayload,
    isChemistryQuestionPayload,
    isCodeQuestionPayload,
    isMathQuestionPayload,
    isRecord,
} from "./questionPayload";

interface PreviewQuestionProps {
    instance: AuthoringQuestionPayload;
    /** Authoring domain from the request, preview or batch envelope. */
    domain: string;
    headingLevel?: "h2" | "h3";
    /**
     * Review shows the student view and no answer revealed. Generated questions
     * also show their inputs and raw data inline.
     */
    variant?: "review" | "generated";
}

/**
 * Domain dispatcher for a generated question. The code renderer is one view;
 * unknown domains get the shared question/choice fallback.
 */
export function PreviewQuestion({
    instance,
    domain,
    headingLevel = "h2",
    variant = "generated",
}: PreviewQuestionProps) {
    const review = variant === "review";
    const Heading = headingLevel;
    const InputsHeading = headingLevel === "h2" ? "h3" : "h4";
    const fields = buildQuestionFields(instance);
    const codeInstance = isCodeQuestionPayload(instance) ? instance : null;
    const mathInstance = isMathQuestionPayload(instance) ? instance : null;
    const biologyInstance = isBiologyQuestionPayload(instance) ? instance : null;
    const chemistryInstance = isChemistryQuestionPayload(instance) ? instance : null;
    // A specialised view needs both its domain and its payload envelope; other
    // domains take the generic fallback.
    const showCode = codeInstance !== null && showsDomainView(domain, "code");
    const showMath = mathInstance !== null && showsDomainView(domain, "math");
    const showBiology =
        biologyInstance !== null && showsDomainView(domain, "biology");
    const showChemistry =
        chemistryInstance !== null && showsDomainView(domain, "chemistry");
    const payload: unknown = instance;
    const physics = domain === "physics" && isRecord(payload) ? payload : null;
    const wrapsPhysicsPrompt =
        physics?.target === "h2_statement_set" || physics?.target === "h2_task";
    const h2Explanation =
        domain === "biology" &&
        isRecord(instance) &&
        "case_id" in instance &&
        "explanation" in instance &&
        typeof instance.case_id === "string" &&
        typeof instance.explanation === "string"
            ? instance.explanation
            : null;
    const showsPromptInView = showMath || showBiology || showChemistry;

    return (
        <article className={review ? "space-y-4" : "space-y-4 rounded-lg border p-4"}>
            {showsPromptInView ? (
                !review && (
                    <div className="flex justify-end">
                        <Badge variant="default">Draft for review</Badge>
                    </div>
                )
            ) : (
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <Heading className={wrapsPhysicsPrompt
                        ? "min-w-0 whitespace-pre-wrap text-base font-medium"
                        : "min-w-0 text-base font-medium"}>
                        {fields.text}
                    </Heading>
                    {!review && <Badge variant="default">Draft for review</Badge>}
                </div>
            )}

            {domain === "biology" && isRecord(instance) && "figure" in instance && (
                <QuestionFigure figure={instance.figure} />
            )}
            {physics && <PhysicsStimulus value={physics.stimulus} />}

            {!review && (
                <p className="text-xs text-muted-foreground">
                    The correct choice is highlighted below.
                </p>
            )}

            {showChemistry && chemistryInstance ? (
                <ChemistryQuestionView
                    instance={chemistryInstance}
                    review={review}
                    headingLevel={headingLevel}
                    inputsHeadingLevel={InputsHeading}
                />
            ) : showMath && mathInstance ? (
                <MathQuestionView
                    instance={mathInstance}
                    review={review}
                    headingLevel={headingLevel}
                    inputsHeadingLevel={InputsHeading}
                />
            ) : showBiology && biologyInstance ? (
                <BiologyQuestionView
                    instance={biologyInstance}
                    review={review}
                    headingLevel={headingLevel}
                    inputsHeadingLevel={InputsHeading}
                />
            ) : showCode ? (
                <CodeQuestionView
                    instance={codeInstance}
                    review={review}
                    inputsHeadingLevel={InputsHeading}
                />
            ) : (
                <GenericQuestionView payload={instance} review={review} />
            )}

            {h2Explanation && (
                <details className="rounded-md border p-3" open={!review}>
                    <summary className="cursor-pointer text-sm font-medium">
                        How the answer is worked out
                    </summary>
                    <p className="pt-3 text-sm">{h2Explanation}</p>
                </details>
            )}

            {!review && (
                <EvidenceDetails
                    summary="Raw question data"
                    value={instance}
                    variant="structured"
                />
            )}
        </article>
    );
}
