import type { ChemistryQuestionInstance } from "../types";
import { ChemEquation, ChemStructuredEquation } from "./ChemFormula";
import { ChemistryStem } from "./ChemistryStem";
import { GenericQuestionView } from "./GenericQuestionView";
import { QuestionInputs } from "./QuestionInputs";

interface ChemistryQuestionViewProps {
    instance: ChemistryQuestionInstance;
    review: boolean;
    headingLevel: "h2" | "h3";
    inputsHeadingLevel: "h3" | "h4";
}

/**
 * Chemistry view: the prompt leads, then the choices through the shared
 * question renderer. When the payload includes structured equations, each
 * choice is drawn as a formula so subscripts read correctly. Review stays
 * neutral until the answer is revealed; generated previews show the answer.
 */
export function ChemistryQuestionView({
    instance,
    review,
    headingLevel,
    inputsHeadingLevel,
}: ChemistryQuestionViewProps) {
    const Heading = headingLevel;
    const InputsHeading = inputsHeadingLevel;
    const concept = "context" in instance.parameters;
    const plainStem = concept || "reactant_1_mmol" in instance.parameters;
    const inputs = {
        ...instance.parameters,
        ...(concept ? {} : { reaction_id: instance.reaction_id }),
        seed: instance.seed,
    };
    const structuredChoices =
        Array.isArray(instance.choices_structured) &&
        instance.choices_structured.length > 0
            ? instance.choices_structured
            : null;

    return (
        <>
            {plainStem ? (
                <ChemistryStem
                    as={headingLevel}
                    className="min-w-0 break-words text-lg font-semibold"
                    question={instance.question}
                />
            ) : (
                <Heading className="min-w-0 break-words text-lg font-semibold">
                    <ChemEquation equation={instance.question} />
                </Heading>
            )}

            <GenericQuestionView
                payload={instance}
                review={review}
                optionRenderer={
                    structuredChoices
                        ? (value, index) => {
                              const equation = structuredChoices[index];
                              if (equation) {
                                  return (
                                      <ChemStructuredEquation
                                          equation={equation}
                                          label={
                                              typeof value === "string"
                                                  ? value
                                                  : undefined
                                          }
                                      />
                                  );
                              }
                              return undefined;
                          }
                        : undefined
                }
            />

            {!review && (
                <section aria-label="Question inputs" className="space-y-1">
                    <InputsHeading className="text-sm font-medium">Inputs</InputsHeading>
                    <QuestionInputs inputs={inputs} />
                </section>
            )}
        </>
    );
}
