import { useState } from "react";
import type { MaterialPracticeBatch, MaterialPracticeQuestion } from "@/api/models";
import { Button } from "@/components/ui/button";
import { materialPageUrl } from "../hooks/useMaterialPdf";
import type { MaterialPdf } from "../hooks/useMaterialPdf";

interface MaterialQuestionSetViewProps {
    result: MaterialPracticeBatch;
    sources: { pdf: MaterialPdf; pages: number[] }[];
    examReference: string;
    onReplay: () => void;
}

function MaterialQuestion({ question, number }: {
    question: MaterialPracticeQuestion;
    number: number;
}) {
    const [revealed, setRevealed] = useState(false);

    return (
        <li className="space-y-3 rounded-lg border bg-card p-4">
            <h4 className="text-sm font-semibold">Question {number}</h4>
            <pre className="whitespace-pre-wrap break-words font-mono text-sm">{question.stem}</pre>
            <ol className="ml-6 list-[upper-alpha] space-y-1.5 text-sm">
                {question.options.map((option, index) => (
                    <li key={index} className="whitespace-pre-wrap break-words">{option}</li>
                ))}
            </ol>
            <Button type="button" size="sm" variant="outline" aria-expanded={revealed} onClick={() => setRevealed(!revealed)}>
                {revealed ? "Hide answer" : "Reveal answer"}
            </Button>
            {revealed && (
                <div className="space-y-1 rounded-md bg-muted p-3 text-sm">
                    <p className="whitespace-pre-wrap font-medium">
                        {String.fromCharCode(65 + question.correct_index)}. {question.options[question.correct_index]}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{question.explanation}</p>
                </div>
            )}
        </li>
    );
}

export function MaterialQuestionSetView({ result, sources, examReference, onReplay }: MaterialQuestionSetViewProps) {
    return (
        <section aria-label="Generated questions" className="space-y-4 border-t pt-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                    <h3 className="font-semibold">Generated questions</h3>
                    <div className="flex flex-wrap gap-x-4 text-sm text-muted-foreground">
                        <span>Seed {result.seed}</span>
                        {result.generator_version !== undefined && <span>Generator version {result.generator_version}</span>}
                    </div>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={onReplay}>Replay set</Button>
            </div>
            <div className="space-y-2 rounded-lg bg-muted p-3 text-sm">
                <h4 className="font-medium">Source references</h4>
                <p>{examReference}</p>
                <ul className="flex flex-wrap gap-x-4 gap-y-1">
                    {sources.flatMap(({ pdf, pages }) => pages.map((page) => (
                        <li key={`${pdf.url}/${page}`} className="break-words">
                            <a
                                href={materialPageUrl(pdf.url, page)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary underline underline-offset-2"
                            >
                                {pdf.file.name}, page {page}
                            </a>
                        </li>
                    )))}
                </ul>
            </div>
            <ol className="grid gap-4 lg:grid-cols-2">
                {result.questions.map((question, index) => (
                    <MaterialQuestion key={index} question={question} number={index + 1} />
                ))}
            </ol>
        </section>
    );
}
