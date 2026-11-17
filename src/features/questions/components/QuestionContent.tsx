import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface QuestionContentProps {
    questionText?: string;
    questionType: string;
    options?: unknown[];
    /** Optional per-option explanation, shown under each option once revealed. */
    optionExplanations?: Array<string | undefined>;
    correctIndices?: number[];
    answer?: unknown;
    hideAnswerButton?: boolean;
    /** Start with the answer revealed. Useful for review-only previews. */
    showAnswerByDefault?: boolean;
    /** Skip the separate answer box; the correct options stay highlighted. */
    hideAnswerSummary?: boolean;
    /**
     * Optional display hook for structured values. Callers can supply their own
     * renderer while this shared component stays unaware of domain-specific
     * answer shapes. Without it, values keep the original text/JSON display.
     */
    renderValue?: (value: unknown) => ReactNode;
    /**
     * Optional per-option renderer. The index lets callers pair an option with
     * a parallel value, such as its LaTeX source, without changing the shared
     * option layout. Falls back to `renderValue`.
     */
    renderOption?: (value: unknown, index: number) => ReactNode;
}

export function QuestionContent({
    questionText,
    questionType,
    options,
    optionExplanations,
    correctIndices,
    answer,
    hideAnswerButton = false,
    showAnswerByDefault = false,
    hideAnswerSummary = false,
    renderValue,
    renderOption,
}: QuestionContentProps) {
    const [showAnswer, setShowAnswer] = useState(showAnswerByDefault);

    // Convert option to string for display
    const formatOption = (option: unknown): string => {
        if (typeof option === "string") return option;
        if (typeof option === "number") return String(option);
        if (Array.isArray(option)) return JSON.stringify(option);
        if (typeof option === "object" && option !== null) return JSON.stringify(option, null, 2);
        return String(option);
    };

    // Format answer for display
    const formatAnswer = (ans: unknown): string => {
        if (typeof ans === "string") return ans;
        if (typeof ans === "number") return String(ans);
        if (Array.isArray(ans)) return JSON.stringify(ans, null, 2);
        if (typeof ans === "object" && ans !== null) return JSON.stringify(ans, null, 2);
        return String(ans);
    };

    // Get letter label for option (A, B, C, ...)
    const getOptionLabel = (index: number): string => {
        return String.fromCharCode(65 + index);
    };

    // Check if an option is correct
    const isCorrectOption = (index: number): boolean => {
        return correctIndices?.includes(index) ?? false;
    };

    const isMCQOrMRQ = questionType === "mcq" || questionType === "mrq";
    const hasOptions = isMCQOrMRQ && options && Array.isArray(options) && options.length > 0;

    return (
        <div className="space-y-4 whitespace-pre-wrap">
            {/* Question Text */}
            {questionText && <div className="text-base font-normal whitespace-pre-wrap">{questionText}</div>}

            {/* Options for MCQ/MRQ */}
            {hasOptions && (
                <div className="space-y-2">
                    {options.map((option, index) => (
                        <div
                            key={index}
                            className={`p-3 rounded-md border transition-colors ${
                                showAnswer && isCorrectOption(index)
                                    ? "bg-green-50 dark:bg-green-950 border-green-500 dark:border-green-700"
                                    : "bg-muted/50 border-border"
                            }`}
                        >
                            <div className="flex flex-wrap items-start gap-2">
                                <span className="font-semibold">{getOptionLabel(index)}.</span>
                                <div
                                    className={
                                        showAnswer && isCorrectOption(index)
                                            ? "text-green-700 dark:text-green-400 font-medium"
                                            : "text-foreground"
                                    }
                                >
                                    {renderOption
                                        ? renderOption(option, index)
                                        : renderValue
                                          ? renderValue(option)
                                          : formatOption(option)}
                                </div>
                                {showAnswer && isCorrectOption(index) && (
                                    <span className="text-green-600 dark:text-green-400">✓</span>
                                )}
                            </div>
                            {showAnswer && optionExplanations?.[index] && (
                                <p className="mt-2 border-t border-border/60 pt-2 text-xs text-muted-foreground">
                                    {optionExplanations[index]}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Show/Hide Answer Button */}
            {!hideAnswerButton && (
                <div>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setShowAnswer(!showAnswer)}
                    >
                        {showAnswer ? "Hide Answer" : "Show Answer"}
                    </Button>
                </div>
            )}

            {/* Answer Section */}
            {showAnswer && !hideAnswerSummary && (
                <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-500 dark:border-green-700 rounded-md">
                    <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-2">
                        Answer:
                    </h4>

                    {/* For MCQ/MRQ, show correct option labels */}
                    {hasOptions && correctIndices && correctIndices.length > 0 && (
                        <div className="mb-2">
                            <p className="text-green-700 dark:text-green-400 text-sm">
                                Correct option{correctIndices.length > 1 ? "s" : ""}:{" "}
                                {correctIndices.map((idx) => getOptionLabel(idx)).join(", ")}
                            </p>
                        </div>
                    )}

                    {/* Show the actual answer text */}
                    {answer !== undefined && (
                        <div className="bg-background p-2 rounded border border-green-200 dark:border-green-800">
                            <div className="text-foreground text-sm whitespace-pre-wrap">
                                {renderValue ? renderValue(answer) : formatAnswer(answer)}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
