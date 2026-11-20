import { Fragment } from "react";
import type { ChemistryEquationTerm, ChemistryStructuredEquation } from "../types";
import { equationParts, formulaParts, type FormulaPart } from "./chemistryRender";

interface ChemFormulaProps {
    formula: string;
    className?: string;
}

interface ChemEquationProps {
    equation: string;
    className?: string;
}

interface ChemStructuredEquationProps {
    equation: ChemistryStructuredEquation;
    /** Plain choice text, so the accessible name matches the payload string. */
    label?: string;
    className?: string;
}

function FormulaText({ parts }: { parts: FormulaPart[] }) {
    return (
        <>
            {parts.map((part, index) =>
                part.kind === "sub" ? (
                    <sub key={index}>{part.value}</sub>
                ) : (
                    <Fragment key={index}>{part.value}</Fragment>
                ),
            )}
        </>
    );
}

/**
 * A chemical formula with subscript counts. The accessible name stays the plain
 * formula, and the parts are rendered as React text rather than injected HTML,
 * so a malicious payload is shown literally.
 */
export function ChemFormula({ formula, className }: ChemFormulaProps) {
    return (
        <span className={className} aria-label={formula}>
            <FormulaText parts={formulaParts(formula)} />
        </span>
    );
}

/**
 * A rendered equation whose formulas gain subscripts while coefficients,
 * operators and spacing stay as authored. The accessible name is the plain
 * equation text.
 */
export function ChemEquation({ equation, className }: ChemEquationProps) {
    return (
        <span className={className} aria-label={equation}>
            {equationParts(equation).map((token, index) =>
                token.kind === "formula" ? (
                    <FormulaText key={index} parts={token.parts} />
                ) : (
                    <Fragment key={index}>{token.value}</Fragment>
                ),
            )}
        </span>
    );
}

function StructuredSide({ terms }: { terms: ChemistryEquationTerm[] }) {
    return (
        <>
            {terms.map((term, index) => (
                <Fragment key={`${term.formula}-${index}`}>
                    {index > 0 ? " + " : null}
                    {term.coefficient !== 1 ? `${term.coefficient} ` : null}
                    <ChemFormula formula={term.formula} />
                </Fragment>
            ))}
        </>
    );
}

function structuredEquationText(equation: ChemistryStructuredEquation): string {
    const side = (terms: ChemistryEquationTerm[]) =>
        terms
            .map((term) =>
                term.coefficient === 1
                    ? term.formula
                    : `${term.coefficient} ${term.formula}`,
            )
            .join(" + ");
    return `${side(equation.reactants)} → ${side(equation.products)}`;
}

/**
 * A balanced equation from `choices_structured`. Coefficients of one are
 * omitted, as they are in the plain choice string, and each formula gains its
 * subscripts. The accessible name stays the plain choice so the structured
 * view and the answer text agree.
 */
export function ChemStructuredEquation({
    equation,
    label,
    className,
}: ChemStructuredEquationProps) {
    return (
        <span
            className={className}
            aria-label={label ?? structuredEquationText(equation)}
        >
            <StructuredSide terms={equation.reactants} />
            {" → "}
            <StructuredSide terms={equation.products} />
        </span>
    );
}
