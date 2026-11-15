import { Badge } from "@/components/ui/badge";
import type { AuthoringQuestionPayload } from "../types";
import { showsDomainView } from "../domains";
import { CodeQuestionView } from "./CodeQuestionView";
import { EvidenceDetails } from "./EvidenceDetails";
import { GenericQuestionView } from "./GenericQuestionView";
import { MathQuestionView } from "./MathQuestionView";
import {
    buildQuestionFields,
    isCodeQuestionPayload,
    isMathQuestionPayload,
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
    // A specialised view needs both its domain and its payload envelope; other
    // domains take the generic fallback.
    const showCode = codeInstance !== null && showsDomainView(domain, "code");
    const showMath = mathInstance !== null && showsDomainView(domain, "math");

    return (
        <article className={review ? "space-y-4" : "space-y-4 rounded-lg border p-4"}>
            {showMath ? (
                !review && (
                    <div className="flex justify-end">
                        <Badge variant="default">Draft for review</Badge>
                    </div>
                )
            ) : (
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <Heading className="min-w-0 text-base font-medium">
                        {fields.text}
                    </Heading>
                    {!review && <Badge variant="default">Draft for review</Badge>}
                </div>
            )}

            {!review && (
                <p className="text-xs text-muted-foreground">
                    The correct choice is highlighted below.
                </p>
            )}

            {showMath && mathInstance ? (
                <MathQuestionView
                    instance={mathInstance}
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
