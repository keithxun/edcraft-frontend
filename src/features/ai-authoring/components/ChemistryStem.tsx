const REDUCTION_HEADER = "| Standard reduction half-equation | E° / V |";
const REDUCTION_MARKER = `\n\n${REDUCTION_HEADER}\n| --- | --- |\n`;

interface ChemistryStemProps {
    question: string;
    as?: "h2" | "h3" | "p";
    className?: string;
}

export function ChemistryStem({
    question,
    as: Text = "p",
    className,
}: ChemistryStemProps) {
    const [lead, data] = question.split(REDUCTION_MARKER, 2);
    const [rowText, task] = data?.split("\n\n", 2) ?? [];
    const rows = rowText?.split("\n").map((line) =>
        /^\| ([^|]+) \| ([+−-]\d+\.\d{2}) \|$/.exec(line),
    );
    if (!rows?.length || !task?.trim() || rows.some((row) => row === null)) {
        return <Text className={className}>{question}</Text>;
    }

    return (
        <div className="space-y-2">
            <Text className={className}>{lead}</Text>
            <div className="overflow-x-auto">
                <table
                    aria-label="Standard reduction potentials"
                    className="w-full border-collapse text-left text-sm"
                >
                    <thead>
                        <tr className="border-b">
                            <th scope="col" className="p-2">
                                Standard reduction half-equation
                            </th>
                            <th scope="col" className="p-2 text-right">
                                E° / V
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={index} className="border-b">
                                <td className="p-2">{row?.[1]}</td>
                                <td className="p-2 text-right tabular-nums">{row?.[2]}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p>{task.trim()}</p>
        </div>
    );
}
