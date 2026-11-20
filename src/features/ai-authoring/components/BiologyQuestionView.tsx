import type { BiologyQuestionInstance } from "../types";
import { Genotype } from "./Genotype";
import { GenericQuestionView } from "./GenericQuestionView";
import { PunnettSquare } from "./PunnettSquare";
import { QuestionInputs } from "./QuestionInputs";

interface BiologyQuestionViewProps {
    instance: BiologyQuestionInstance;
    review: boolean;
    headingLevel: "h2" | "h3";
    inputsHeadingLevel: "h3" | "h4";
}

function Distribution({
    title,
    entries,
    genotypeKeys = false,
}: {
    title: string;
    entries: Array<[string, string]>;
    genotypeKeys?: boolean;
}) {
    return (
        <div className="space-y-1">
            <p className="text-sm font-medium">{title}</p>
            <dl className="space-y-0.5 text-sm">
                {entries.map(([key, value]) => (
                    <div key={key} className="flex flex-wrap gap-x-2">
                        <dt>{genotypeKeys ? <Genotype genotype={key} /> : key}</dt>
                        <dd className="text-muted-foreground">{value}</dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

/**
 * Genetics view: the prompt leads, then the choices through the shared question
 * renderer. Generated previews also show how the answer is worked out, with the
 * parents, the Punnett square and the genotype and phenotype distributions.
 */
export function BiologyQuestionView({
    instance,
    review,
    headingLevel,
    inputsHeadingLevel,
}: BiologyQuestionViewProps) {
    const Heading = headingLevel;
    const InputsHeading = inputsHeadingLevel;
    const inputs = { ...instance.parameters, seed: instance.seed };
    const genotypes = Object.entries(instance.genotype_distribution ?? {});
    const phenotypes = Object.entries(instance.phenotype_distribution ?? {});
    const hasDistributions = genotypes.length > 0 || phenotypes.length > 0;

    return (
        <>
            <Heading className="min-w-0 break-words text-lg font-semibold">
                {instance.question}
            </Heading>

            <GenericQuestionView payload={instance} review={review} />

            {/* Review keeps the working collapsed, because it reveals the answer. */}
            <details className="rounded-md border p-3" open={!review}>
                <summary className="cursor-pointer text-sm font-medium">
                    How the answer is worked out
                </summary>
                <section
                    aria-label="How the answer is worked out"
                    className="space-y-3 pt-3"
                >

                    <dl className="grid gap-x-4 gap-y-1 text-sm @sm:grid-cols-[minmax(6rem,auto)_1fr]">
                        <div className="contents">
                            <dt className="font-medium text-muted-foreground">Parents</dt>
                            <dd className="min-w-0 break-words">
                                <Genotype genotype={instance.cross.parent1} /> crossed
                                with <Genotype genotype={instance.cross.parent2} />
                            </dd>
                        </div>
                    </dl>

                    <PunnettSquare
                        punnett={instance.punnett}
                        parent1={instance.cross.parent1}
                        parent2={instance.cross.parent2}
                    />

                    {hasDistributions && (
                        <div className="grid gap-4 @sm:grid-cols-2">
                            {genotypes.length > 0 && (
                                <Distribution
                                    title="Genotypes"
                                    entries={genotypes}
                                    genotypeKeys
                                />
                            )}
                            {phenotypes.length > 0 && (
                                <Distribution title="Phenotypes" entries={phenotypes} />
                            )}
                        </div>
                    )}
                </section>
            </details>

            {!review && (
                <section aria-label="Question inputs" className="space-y-1">
                    <InputsHeading className="text-sm font-medium">Inputs</InputsHeading>
                    <QuestionInputs inputs={inputs} />
                </section>
            )}
        </>
    );
}
