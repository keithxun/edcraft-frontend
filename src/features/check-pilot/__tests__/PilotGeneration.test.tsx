import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/api/axiosInstance";
import { PilotGeneration } from "../components/PilotGeneration";
import { generatePilotBatch } from "../services/checkPilot.service";
import { pilotBatch, templateRecord } from "./fixtures";

vi.mock("../services/checkPilot.service", () => ({
    createPilotTemplate: vi.fn(),
    listPilotTemplates: vi.fn(),
    getPilotTemplate: vi.fn(),
    listPilotChecks: vi.fn(),
    getPilotCheck: vi.fn(),
    decidePilotTemplate: vi.fn(),
    generatePilotBatch: vi.fn(),
}));

function renderGeneration(record = templateRecord({ approval: "approved" })) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const view = render(
        <QueryClientProvider client={client}>
            <PilotGeneration record={record} maxQuantity={20} />
        </QueryClientProvider>,
    );
    return {
        rerender: (nextRecord: ReturnType<typeof templateRecord>) =>
            view.rerender(
                <QueryClientProvider client={client}>
                    <PilotGeneration record={nextRecord} maxQuantity={20} />
                </QueryClientProvider>,
            ),
    };
}

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

describe("PilotGeneration", () => {
    beforeEach(() => {
        vi.mocked(generatePilotBatch).mockReset();
        vi.mocked(generatePilotBatch).mockResolvedValue(pilotBatch);
    });

    afterEach(cleanup);

    it("requires approval before sending a generation request", () => {
        renderGeneration(templateRecord());

        expect(screen.getByRole("button", { name: "Generate questions" })).toBeDisabled();
        expect(
            screen.getByText(/Approve this exact template and check version before generation/),
        ).toBeInTheDocument();
        expect(generatePilotBatch).not.toHaveBeenCalled();
    });

    it("generates with the seeded quantity and renders stems, options and the key", async () => {
        const user = userEvent.setup();
        renderGeneration();

        const seed = screen.getByLabelText("Seed");
        const quantity = screen.getByLabelText("Quantity");
        await user.clear(seed);
        await user.type(seed, "42");
        await user.clear(quantity);
        await user.type(quantity, "3");
        await user.click(screen.getByRole("button", { name: "Generate questions" }));

        await waitFor(() => {
            expect(generatePilotBatch).toHaveBeenCalledWith("template-1", {
                seed: 42,
                quantity: 3,
            });
        });

        expect(await screen.findByText("3x^2 + 2x + 1")).toBeInTheDocument();
        expect(screen.getAllByText("Differentiate the polynomial.")).toHaveLength(2);
        expect(screen.getByText("6x + 2")).toBeInTheDocument();
        expect(screen.getByText("6x")).toBeInTheDocument();
        expect(screen.getAllByText("3x^2")).toHaveLength(2);
        expect(screen.getAllByText("Correct")[0]).toBeInTheDocument();
        expect(screen.getByText("A. 6x + 2")).toBeInTheDocument();
        expect(screen.getByText("A. 3x^2 - 4")).toBeInTheDocument();
        expect(screen.getAllByText("Parameters")).toHaveLength(2);
        expect(screen.getAllByText(/polynomial-derivative-v1/)).toHaveLength(2);
        expect(screen.getByText(/Same seed and template reproduce this set/)).toBeInTheDocument();
    });

    it("reports a bounded shortfall without claiming the domain is exhausted", async () => {
        const user = userEvent.setup();
        renderGeneration();

        await user.click(screen.getByRole("button", { name: "Generate questions" }));

        expect(await screen.findByText(/Only 2 of 3/)).toBeInTheDocument();
        expect(
            screen.getByText(/bounded draw did not produce more distinct questions/),
        ).toBeInTheDocument();
        expect(screen.queryByText(/all possible|proves|domain is exhausted/i)).not.toBeInTheDocument();
    });

    it("shows stale approval or digest conflicts without displaying a batch", async () => {
        vi.mocked(generatePilotBatch).mockRejectedValue(
            new ApiError(409, "template approval is stale"),
        );
        const user = userEvent.setup();
        renderGeneration();

        await user.click(screen.getByRole("button", { name: "Generate questions" }));

        expect(
            await screen.findByText(/changed, or the approval is stale/i),
        ).toBeInTheDocument();
        expect(screen.queryByText("3x^2 + 2x + 1")).not.toBeInTheDocument();
    });

    it("drops a late batch if the approval changed while it was generating", async () => {
        const pending = deferred<typeof pilotBatch>();
        vi.mocked(generatePilotBatch).mockReturnValue(pending.promise);
        const user = userEvent.setup();
        const { rerender } = renderGeneration();

        await user.click(screen.getByRole("button", { name: "Generate questions" }));
        rerender(templateRecord({ approval: "rejected" }));

        await act(async () => {
            pending.resolve(pilotBatch);
        });

        expect(screen.queryByText("3x^2 + 2x + 1")).not.toBeInTheDocument();
        expect(
            screen.getByText(/Approve this exact template and check version before generation/),
        ).toBeInTheDocument();
    });
});
