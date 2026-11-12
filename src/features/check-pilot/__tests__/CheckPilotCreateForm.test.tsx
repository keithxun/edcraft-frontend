import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "@/api/axiosInstance";
import { CheckPilotCreateForm } from "../components/CheckPilotCreateForm";
import { createPilotTemplate } from "../services/checkPilot.service";
import type { PilotTemplateRecord } from "../types";
import {
    capabilities,
    connectionCapabilities,
} from "@/features/ai-authoring/__tests__/fixtures";
import { templateRecord } from "./fixtures";

vi.mock("../services/checkPilot.service", () => ({
    createPilotTemplate: vi.fn(),
    listPilotTemplates: vi.fn(),
    getPilotTemplate: vi.fn(),
    listPilotChecks: vi.fn(),
    getPilotCheck: vi.fn(),
    decidePilotTemplate: vi.fn(),
    generatePilotBatch: vi.fn(),
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

function renderForm(
    formCapabilities = capabilities,
    onCreated?: (record: PilotTemplateRecord) => void,
) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <CheckPilotCreateForm
                    capabilities={formCapabilities}
                    onCreated={onCreated}
                />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe("CheckPilotCreateForm", () => {
    beforeEach(() => {
        vi.mocked(createPilotTemplate).mockReset();
        vi.mocked(createPilotTemplate).mockResolvedValue(templateRecord());
    });

    afterEach(cleanup);

    it("shows the supported pilot scope before submit", () => {
        renderForm();

        expect(screen.getByText(/Univariate real polynomials in x/)).toBeInTheDocument();
        expect(screen.getByText(/degree at most 5/i)).toBeInTheDocument();
        expect(screen.getByText(/bounded integer coefficients/i)).toBeInTheDocument();
        expect(screen.getByText(/sampled, not exhaustive/i)).toBeInTheDocument();
        expect(screen.getByRole("combobox", { name: "Check-author model" })).toHaveTextContent(
            "Default authoring model",
        );
    });

    it("authors with the existing profile selection and explicit wrong-choice count", async () => {
        const user = userEvent.setup();
        const onCreated = vi.fn();
        renderForm(capabilities, onCreated);

        await user.type(
            screen.getByLabelText("Template request"),
            "Differentiate bounded cubic polynomials.",
        );
        const distractors = screen.getByLabelText("Wrong choices per question");
        await user.clear(distractors);
        await user.type(distractors, "2");
        await user.click(screen.getByRole("button", { name: "Author template" }));

        await waitFor(() => {
            expect(createPilotTemplate).toHaveBeenCalledWith({
                prompt: "Differentiate bounded cubic polynomials.",
                model_profile: "default",
                num_distractors: 2,
            });
        });
        expect(onCreated).toHaveBeenCalledWith(templateRecord());
    });

    it("narrows the global distractors maximum to the pilot limit while keeping three", async () => {
        const user = userEvent.setup();
        renderForm();

        const distractors = screen.getByLabelText("Wrong choices per question");
        expect(distractors).toHaveAttribute("max", "5");
        expect(distractors).toHaveValue(3);
        expect(screen.getByText(/1–5 wrong choices/i)).toBeInTheDocument();
        expect(screen.getByText(/pilot accepts at most 5 wrong choices/i)).toBeInTheDocument();

        await user.type(screen.getByLabelText("Template request"), "Differentiate.");
        await user.click(screen.getByRole("button", { name: "Author template" }));

        await waitFor(() => {
            expect(createPilotTemplate).toHaveBeenCalledWith({
                prompt: "Differentiate.",
                model_profile: "default",
                num_distractors: 3,
            });
        });
    });

    it("rejects a value above the pilot limit even when global authoring allows it", async () => {
        const user = userEvent.setup();
        renderForm();

        const distractors = screen.getByLabelText("Wrong choices per question");
        await user.clear(distractors);
        await user.type(distractors, "6");
        await user.type(screen.getByLabelText("Template request"), "Differentiate.");
        await user.click(screen.getByRole("button", { name: "Author template" }));

        expect(await screen.findByText("Enter at most 5 wrong choices.")).toBeInTheDocument();
        expect(createPilotTemplate).not.toHaveBeenCalled();
    });

    it("reuses a BYOK connection and its selected model", async () => {
        const user = userEvent.setup();
        renderForm(connectionCapabilities);

        await user.type(screen.getByLabelText("Template request"), "Differentiate.");
        await user.click(screen.getByRole("button", { name: "Author template" }));

        await waitFor(() => {
            expect(createPilotTemplate).toHaveBeenCalledWith({
                prompt: "Differentiate.",
                connection_id: "connection-1",
                model: "gpt-test",
                num_distractors: 3,
            });
        });
    });

    it("shows a pending state and does not submit twice", async () => {
        const pending = deferred<PilotTemplateRecord>();
        vi.mocked(createPilotTemplate).mockReturnValue(pending.promise);
        const user = userEvent.setup();
        renderForm();

        await user.type(screen.getByLabelText("Template request"), "Differentiate.");
        await user.click(screen.getByRole("button", { name: "Author template" }));

        const pendingButton = screen.getByRole("button", {
            name: "Authoring template…",
        });
        expect(pendingButton).toBeDisabled();
        await user.click(pendingButton);
        expect(createPilotTemplate).toHaveBeenCalledTimes(1);

        await act(async () => {
            pending.resolve(templateRecord());
        });
    });

    it("surfaces safe server errors without losing the form values", async () => {
        vi.mocked(createPilotTemplate).mockRejectedValue(
            new ApiError(422, "prompt must be at most 4000 characters"),
        );
        const user = userEvent.setup();
        renderForm();

        await user.type(screen.getByLabelText("Template request"), "Differentiate.");
        await user.click(screen.getByRole("button", { name: "Author template" }));

        expect(
            await screen.findByText("prompt must be at most 4000 characters"),
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Template request")).toHaveValue("Differentiate.");
    });

    it("points to model connections when no check-author model exists", () => {
        renderForm({ ...capabilities, model_profiles: [], connections: [] });

        expect(screen.getByText("No check-author model configured")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Add a model connection" })).toHaveAttribute(
            "href",
            "/settings/model-connections",
        );
    });
});
