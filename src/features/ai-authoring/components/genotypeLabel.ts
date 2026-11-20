/**
 * Screen readers often ignore letter case, so "PP" and "Pp" would sound the
 * same. The label spells each allele with its case.
 */
export function genotypeLabel(genotype: string): string {
    const alleles = Array.from(genotype).map((allele) =>
        allele === allele.toUpperCase() ? `capital ${allele}` : `small ${allele}`,
    );
    return `genotype ${alleles.join(" ")}`;
}
