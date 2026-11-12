import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/api/axiosInstance";
import { useUserStore } from "@/shared/stores/user.store";
import CheckPilotPage from "../pages/CheckPilotPage";
import {
    getPilotCheck,
    getPilotTemplate,
    listPilotChecks,
    listPilotTemplates,
} from "../services/checkPilot.service";
import { getAuthoringCapabilities } from "@/features/ai-authoring/services/ai-authoring.service";
import { capabilities, makeUser } from "@/features/ai-authoring/__tests__/fixtures";
import { checkRecord, failedDraftTemplate, templateRecord } from "./fixtures";

vi.mock("../services/checkPilot.service", () => ({
    createPilotTemplate: vi.fn(),
    listPilotTemplates: vi.fn(),
    getPilotTemplate: vi.fn(),
    listPilotChecks: vi.fn(),
    getPilotCheck: vi.fn(),
    decidePilotTemplate: vi.fn(),
    generatePilotBatch: vi.fn(),
}));

vi.mock("@/features/ai-authoring/services/ai-authoring.service", () => ({
    getAuthoringCapabilities: vi.fn(),
    createAuthoringJob: vi.fn(),
    listAuthoringJobs: vi.fn(),
    getAuthoringJob: vi.fn(),
    getAuthoringReview: vi.fn(),
    getAuthoringPreview: vi.fn(),
    decideAuthoringApproval: vi.fn(),
    generateAuthoringBatch: vi.fn(),
}));

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

function renderPage() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={["/ai-authoring/check-pilot"]}>
                <CheckPilotPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
    return client;
}

describe("CheckPilotPage", () => {
    beforeEach(() => {
        useUserStore.getState().logout();
        act(() => useUserStore.getState().setUser(makeUser("user-a", "Alice")));
        vi.mocked(getAuthoringCapabilities).mockReset();
        vi.mocked(getAuthoringCapabilities).mockResolvedValue(capabilities);
        vi.mocked(listPilotTemplates).mockReset();
        vi.mocked(listPilotChecks).mockReset();
        vi.mocked(getPilotTemplate).mockReset();
        vi.mocked(getPilotCheck).mockReset();
        vi.mocked(listPilotTemplates).mockResolvedValue([]);
        vi.mocked(listPilotChecks).mockResolvedValue([]);
        vi.mocked(getPilotTemplate).mockResolvedValue(templateRecord());
        vi.mocked(getPilotCheck).mockResolvedValue(checkRecord);
    });

    afterEach(cleanup);

    it("distinguishes loading from an empty private library", async () => {
        const templates = deferred<ReturnType<typeof templateRecord>[]>();
        const checks = deferred<(typeof checkRecord)[]>();
        vi.mocked(listPilotTemplates).mockReturnValue(templates.promise);
        vi.mocked(listPilotChecks).mockReturnValue(checks.promise);

        renderPage();

        expect(screen.getByText("Loading saved templates…")).toBeInTheDocument();
        expect(screen.getByText("Loading qualified checks…")).toBeInTheDocument();

        await act(async () => {
            templates.resolve([]);
            checks.resolve([]);
        });

        expect(await screen.findByText("No saved templates yet.")).toBeInTheDocument();
        expect(screen.getByText("No qualified checks yet.")).toBeInTheDocument();
        expect(screen.queryByText("Loading saved templates…")).not.toBeInTheDocument();
    });

    it("shows library errors separately with retry actions", async () => {
        vi.mocked(listPilotTemplates).mockRejectedValue(new ApiError(500, "store failed"));
        vi.mocked(listPilotChecks).mockRejectedValue(new ApiError(500, "store failed"));

        renderPage();

        expect(
            await screen.findByText("Saved templates could not be loaded"),
        ).toBeInTheDocument();
        expect(screen.getByText("Qualified checks could not be loaded")).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: "Retry" })).toHaveLength(2);
    });

    it("opens a persisted template, readable recipe, reuse indicator and evidence", async () => {
        const record = templateRecord({ reused_check: true });
        vi.mocked(listPilotTemplates).mockResolvedValue([record]);
        vi.mocked(listPilotChecks).mockResolvedValue([checkRecord]);
        const user = userEvent.setup();
        renderPage();

        await user.click(
            await screen.findByRole("button", {
                name: /Differentiate bounded cubic polynomials/,
            }),
        );

        await waitFor(() => expect(getPilotTemplate).toHaveBeenCalledWith("template-1"));
        expect(await screen.findByText("Reused saved check")).toBeInTheDocument();
        expect(
            (await screen.findAllByText("Bounded polynomial derivative check")).length,
        ).toBeGreaterThan(0);
        expect(
            await screen.findByText("Differentiate each term, then combine like terms."),
        ).toBeInTheDocument();
        expect(await screen.findByText("differentiate_term_v1")).toBeInTheDocument();
        expect(
            (await screen.findAllByText("No counterexample found in sampled cases."))
                .length,
        ).toBeGreaterThan(0);
        expect(
            (await screen.findAllByText("48 of at most 100")).length,
        ).toBeGreaterThan(0);
        expect(screen.getByRole("button", { name: "Approve template" })).toBeInTheDocument();
        expect(screen.getAllByText("Awaiting review").length).toBeGreaterThan(0);
        expect(screen.getByRole("button", { name: "Generate questions" })).toBeDisabled();
    });

    it("shows failed draft check evidence when no qualified check was saved", async () => {
        const draft = failedDraftTemplate();
        vi.mocked(listPilotTemplates).mockResolvedValue([draft]);
        vi.mocked(getPilotTemplate).mockResolvedValue(draft);
        const user = userEvent.setup();
        renderPage();

        await user.click(
            await screen.findByRole("button", {
                name: /Differentiate bounded quadratic polynomials/,
            }),
        );

        await waitFor(() => expect(getPilotTemplate).toHaveBeenCalledWith(draft.template_id));
        expect(await screen.findByText("Draft check qualification")).toBeInTheDocument();
        expect(screen.getByText("Sampled checks failed")).toBeInTheDocument();
        expect(screen.getByText("Preserved counterexample")).toBeInTheDocument();
        expect(screen.getByText(/candidate derivative dropped a term/i)).toBeInTheDocument();
        expect(screen.getByText("Draft check scope")).toBeInTheDocument();
        expect(screen.getByText("Max degree")).toBeInTheDocument();
        expect(screen.getByText("Draft check provenance")).toBeInTheDocument();
        expect(screen.getByText("check-author")).toBeInTheDocument();
        expect(
            screen.getAllByText(/no saved qualified check/i).length,
        ).toBeGreaterThan(0);
        expect(
            screen.getByText(/cannot be approved or used for generation/i),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Approve template" })).toBeDisabled();
        expect(screen.getByRole("button", { name: "Generate questions" })).toBeDisabled();
    });

    it("selects a qualified check from the check library and shows its definition", async () => {
        vi.mocked(listPilotChecks).mockResolvedValue([checkRecord]);
        const user = userEvent.setup();
        renderPage();

        await user.click(
            await screen.findByRole("button", {
                name: /Bounded polynomial derivative check/,
            }),
        );

        expect(await screen.findByText("Check provenance")).toBeInTheDocument();
        expect(screen.getByText("split_polynomial_terms")).toBeInTheDocument();
        expect(screen.getByText("check_engine")).toBeInTheDocument();
        expect(screen.getByText("1.2.0")).toBeInTheDocument();
    });

    it("never shows another owner's cached template while their list is pending", async () => {
        const aliceTemplates = deferred<ReturnType<typeof templateRecord>[]>();
        const bobTemplates = deferred<ReturnType<typeof templateRecord>[]>();
        vi.mocked(listPilotTemplates)
            .mockReturnValueOnce(aliceTemplates.promise)
            .mockReturnValueOnce(bobTemplates.promise);

        renderPage();

        await act(async () => {
            aliceTemplates.resolve([
                templateRecord({ prompt: "Alice private polynomial prompt" }),
            ]);
        });
        expect(
            await screen.findByText("Alice private polynomial prompt"),
        ).toBeInTheDocument();

        act(() => useUserStore.getState().setUser(makeUser("user-b", "Bob")));

        await waitFor(() =>
            expect(
                screen.queryByText("Alice private polynomial prompt"),
            ).not.toBeInTheDocument(),
        );
        expect(screen.getByText("Loading saved templates…")).toBeInTheDocument();
        expect(listPilotTemplates).toHaveBeenCalledTimes(2);

        await act(async () => {
            bobTemplates.resolve([templateRecord({ prompt: "Bob private polynomial prompt" })]);
        });
        expect(
            await screen.findByText("Bob private polynomial prompt"),
        ).toBeInTheDocument();
        expect(
            screen.queryByText("Alice private polynomial prompt"),
        ).not.toBeInTheDocument();
    });

    it("clears a selected template when the signed-in owner changes", async () => {
        const record = templateRecord();
        const bobTemplates = deferred<ReturnType<typeof templateRecord>[]>();
        vi.mocked(listPilotTemplates)
            .mockReturnValueOnce(Promise.resolve([record]))
            .mockReturnValueOnce(bobTemplates.promise);
        const user = userEvent.setup();
        renderPage();

        await user.click(
            await screen.findByRole("button", {
                name: /Differentiate bounded cubic polynomials/,
            }),
        );
        expect(
            await screen.findByText("Differentiate each term, then combine like terms."),
        ).toBeInTheDocument();

        act(() => useUserStore.getState().setUser(makeUser("user-b", "Bob")));

        await waitFor(() =>
            expect(
                screen.queryByText("Differentiate each term, then combine like terms."),
            ).not.toBeInTheDocument(),
        );
        expect(screen.getByText("Loading saved templates…")).toBeInTheDocument();
        expect(getPilotTemplate).toHaveBeenCalledTimes(1);

        await act(async () => {
            bobTemplates.resolve([]);
        });
    });
});
