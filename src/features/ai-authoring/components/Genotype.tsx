import { genotypeLabel } from "./genotypeLabel";

interface GenotypeProps {
    /** A genotype token such as "Pp" or "PP". */
    genotype: string;
    className?: string;
}

/**
 * A genotype token with each allele letter in italics, as genetics text does.
 * The visible letters are hidden from screen readers so the token is announced
 * once as "genotype Pp" instead of as separate letters.
 */
export function Genotype({ genotype, className }: GenotypeProps) {
    return (
        <span className={className} role="img" aria-label={genotypeLabel(genotype)}>
            <span aria-hidden="true">
                {Array.from(genotype).map((allele, index) => (
                    <i key={index}>{allele}</i>
                ))}
            </span>
        </span>
    );
}
