import { Genotype } from "./Genotype";

interface PunnettSquareProps {
    /** Cells by row and column: punnett[i][j] combines parent1[i] and parent2[j]. */
    punnett: string[][];
    parent1: string;
    parent2: string;
}

/**
 * A small accessible Punnett square. Gametes from parent 1 label the rows and
 * gametes from parent 2 label the columns, so every cell reads as their union.
 */
export function PunnettSquare({ punnett, parent1, parent2 }: PunnettSquareProps) {
    const rowGametes = Array.from(parent1);
    const columnGametes = Array.from(parent2);
    const columnCount = Math.max(
        columnGametes.length,
        ...punnett.map((row) => row.length),
        1,
    );

    return (
        <div className="w-fit max-w-full overflow-x-auto">
            <table className="border-collapse text-center text-sm">
                <caption className="mb-2 text-left text-xs text-muted-foreground">
                    Punnett square for a cross between {parent1} and {parent2}.
                </caption>
                <thead>
                    <tr>
                        <th scope="col" className="border p-2">
                            <span className="sr-only">Gametes</span>
                        </th>
                        {Array.from({ length: columnCount }, (_, index) => (
                            <th
                                key={index}
                                scope="col"
                                className="border p-2 font-semibold"
                            >
                                {columnGametes[index] !== undefined && (
                                    <i>{columnGametes[index]}</i>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {punnett.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            <th scope="row" className="border p-2 font-semibold">
                                {rowGametes[rowIndex] !== undefined && (
                                    <i>{rowGametes[rowIndex]}</i>
                                )}
                            </th>
                            {Array.from({ length: columnCount }, (_, columnIndex) => (
                                <td key={columnIndex} className="border p-2">
                                    {row[columnIndex] !== undefined && (
                                        <Genotype genotype={row[columnIndex]} />
                                    )}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
