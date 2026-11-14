import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthorForm } from "../components/AuthorForm";
import { createAuthoringJob } from "../services/ai-authoring.service";
import type { AuthoringCapabilities, AuthoringRetryPrefill } from "../types";
import { capabilities, connectionCapabilities } from "./fixtures";

vi.mock("../services/ai-authoring.service", () => ({
    getAuthoringCapabilities: vi.fn(),
    createAuthoringJob: vi.fn(),
    listAuthoringJobs: vi.fn(),
    getAuthoringJob: vi.fn(),
    getAuthoringReview: vi.fn(),
    getAuthoringPreview: vi.fn(),
    decideAuthoringApproval: vi.fn(),
    generateAuthoringBatch: vi.fn(),
}));

function renderForm(
    prefill?: AuthoringRetryPrefill,
    formCapabilities: AuthoringCapabilities = capabilities,
) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter
                initialEntries={[
                    {
                        pathname: "/ai-authoring",
                        state: prefill ? { authoringPrefill: prefill } : null,
                    },
                ]}
            >
                <AuthorForm capabilities={formCapabilities} />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

async function openAdvanced() {
    await userEvent
        .setup()
        .click(screen.getByRole("button", { name: "Advanced settings" }));
}

describe("AuthorForm", () => {
    beforeAll(() => {
        Object.defineProperty(Element.prototype, "hasPointerCapture", {
            configurable: true,
            value: () => false,
        });
        Element.prototype.setPointerCapture = vi.fn();
        Element.prototype.releasePointerCapture = vi.fn();
        Element.prototype.scrollIntoView = vi.fn();
    });

    beforeEach(() => {
        vi.mocked(createAuthoringJob).mockResolvedValue({
            job_id: "job-1",
            status_url: "/ai-authoring/jobs/job-1",
        });
    });

    afterEach(cleanup);

    it("prefills the prompt and settings from a failed request", async () => {
        renderForm({
            prompt: "Write a question about nested loops.",
            difficulty: "hard",
            num_distractors: 2,
            model_profile: "default",
        });

        expect(screen.getByLabelText("Prompt")).toHaveValue(
            "Write a question about nested loops.",
        );
        expect(screen.getByRole("radio", { name: "Hard" })).toBeChecked();
        expect(screen.queryByText("Prefilled")).not.toBeInTheDocument();

        await openAdvanced();
        expect(screen.getByLabelText("Choices")).toHaveValue(3);
        expect(screen.getByRole("combobox", { name: "Question model" })).toHaveTextContent(
            "Default authoring model",
        );
    });

    it("keeps the normal defaults when there is no prefill", async () => {
        renderForm();

        expect(screen.getByLabelText("Prompt")).toHaveValue("");
        expect(screen.getByRole("radio", { name: "Easy" })).toBeChecked();
        expect(screen.queryByText("Prefilled")).not.toBeInTheDocument();

        await openAdvanced();
        expect(screen.getByLabelText("Choices")).toHaveValue(4);
    });

    it("submits with the selected connection and default model", async () => {
        const user = userEvent.setup();
        renderForm(undefined, connectionCapabilities);

        await openAdvanced();
        expect(screen.getByRole("combobox", { name: "Question model" })).toHaveTextContent(
            "My OpenAI",
        );
        expect(screen.getByRole("combobox", { name: "Model" })).toHaveTextContent(
            "gpt-test",
        );

        await user.type(screen.getByLabelText("Prompt"), "Create a loop question.");
        await user.click(screen.getByRole("button", { name: "Create question" }));

        await waitFor(() => {
            expect(createAuthoringJob).toHaveBeenCalledWith({
                domain: "code",
                prompt: "Create a loop question.",
                difficulty: "easy",
                num_distractors: 3,
                connection_id: "connection-1",
                model: "gpt-test",
            });
        });
    });

    it("offers enabled domains and submits the selected one", async () => {
        const user = userEvent.setup();
        renderForm(undefined, {
            ...connectionCapabilities,
            enabled_domains: ["code", "stub"],
        });

        expect(screen.getByRole("combobox", { name: "Domain" })).toHaveTextContent("Code");
        await user.click(screen.getByRole("combobox", { name: "Domain" }));
        await user.click(screen.getByRole("option", { name: "Stub" }));

        await user.type(screen.getByLabelText("Prompt"), "Create an even-number question.");
        await user.click(screen.getByRole("button", { name: "Create question" }));

        await waitFor(() => {
            expect(createAuthoringJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    domain: "stub",
                    prompt: "Create an even-number question.",
                }),
            );
        });
    });

    it("submits the mathematics domain when selected", async () => {
        const user = userEvent.setup();
        renderForm(undefined, {
            ...connectionCapabilities,
            enabled_domains: ["code", "math"],
        });

        await user.click(screen.getByRole("combobox", { name: "Domain" }));
        await user.click(screen.getByRole("option", { name: "Mathematics" }));

        await user.type(screen.getByLabelText("Prompt"), "Create a linear equation question.");
        await user.click(screen.getByRole("button", { name: "Create question" }));

        await waitFor(() => {
            expect(createAuthoringJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    domain: "math",
                    prompt: "Create a linear equation question.",
                }),
            );
        });
    });

    it("hides the domain selector when only one domain is enabled", () => {
        renderForm();

        expect(
            screen.queryByRole("combobox", { name: "Domain" }),
        ).not.toBeInTheDocument();
    });

    it("submits a user-entered choice count", async () => {
        const user = userEvent.setup();
        renderForm(undefined, connectionCapabilities);

        await openAdvanced();
        const choices = screen.getByLabelText("Choices");
        await user.clear(choices);
        await user.type(choices, "7");
        await user.type(screen.getByLabelText("Prompt"), "Create a loop question.");
        await user.click(screen.getByRole("button", { name: "Create question" }));

        await waitFor(() => {
            expect(createAuthoringJob).toHaveBeenCalledWith(
                expect.objectContaining({ num_distractors: 6 }),
            );
        });
    });

    it("rejects a choice count outside the supported range", async () => {
        const user = userEvent.setup();
        renderForm(undefined, connectionCapabilities);

        await openAdvanced();
        const choices = screen.getByLabelText("Choices");
        await user.clear(choices);
        await user.type(choices, "12");
        await user.type(screen.getByLabelText("Prompt"), "Create a loop question.");
        await user.click(screen.getByRole("button", { name: "Create question" }));

        expect(
            await screen.findByText("Enter at most 11 choices."),
        ).toBeInTheDocument();
        expect(createAuthoringJob).not.toHaveBeenCalled();
    });

    it("lets the user pick another discovered model", async () => {
        const user = userEvent.setup();
        renderForm(undefined, connectionCapabilities);

        await openAdvanced();
        await user.click(screen.getByRole("combobox", { name: "Model" }));
        await user.click(screen.getByRole("option", { name: "gpt-other" }));
        await user.type(screen.getByLabelText("Prompt"), "Create a loop question.");
        await user.click(screen.getByRole("button", { name: "Create question" }));

        await waitFor(() => {
            expect(createAuthoringJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    connection_id: "connection-1",
                    model: "gpt-other",
                }),
            );
        });
    });

    it("defaults difficulty to the question model and relevance to the server judge", async () => {
        renderForm(undefined, connectionCapabilities);
        await openAdvanced();

        expect(screen.getByRole("combobox", { name: "Difficulty check" })).toHaveTextContent(
            "Same as question model",
        );
        expect(screen.getByRole("combobox", { name: "Relevance check" })).toHaveTextContent(
            "Server default (Default judge)",
        );
    });

    it("submits a separate model for one advisory check", async () => {
        const user = userEvent.setup();
        renderForm(undefined, connectionCapabilities);
        await openAdvanced();

        await user.click(screen.getByRole("combobox", { name: "Difficulty check" }));
        await user.click(screen.getByRole("option", { name: /My OpenAI/ }));
        const modelPickers = screen.getAllByRole("combobox", { name: "Model" });
        expect(modelPickers).toHaveLength(2);
        await user.click(modelPickers[1]);
        await user.click(screen.getByRole("option", { name: "gpt-other" }));

        await user.type(screen.getByLabelText("Prompt"), "Create a loop question.");
        await user.click(screen.getByRole("button", { name: "Create question" }));

        await waitFor(() => {
            expect(createAuthoringJob).toHaveBeenCalledWith(
                expect.objectContaining({
                    judges: {
                        difficulty: {
                            connection_id: "connection-1",
                            model: "gpt-other",
                        },
                    },
                }),
            );
        });
    });

    it("prefills advisory check models from a failed job", async () => {
        renderForm(
            {
                prompt: "Retry this.",
                difficulty: "medium",
                num_distractors: 3,
                connection_id: "connection-1",
                model: "gpt-test",
                judges: {
                    relevance: {
                        connection_id: "connection-1",
                        model: "gpt-other",
                    },
                },
            },
            connectionCapabilities,
        );
        await openAdvanced();

        expect(screen.getByRole("combobox", { name: "Difficulty check" })).toHaveTextContent(
            "Same as question model",
        );
        expect(screen.getByRole("combobox", { name: "Relevance check" })).toHaveTextContent(
            "My OpenAI",
        );
        expect(screen.getAllByRole("combobox", { name: "Model" })[1]).toHaveTextContent(
            "gpt-other",
        );
    });

    it("prefills a connection selection from a failed job", async () => {
        renderForm(
            {
                prompt: "Retry this.",
                difficulty: "medium",
                num_distractors: 3,
                connection_id: "connection-1",
                model: "gpt-other",
            },
            connectionCapabilities,
        );
        await openAdvanced();

        expect(screen.getByRole("combobox", { name: "Model" })).toHaveTextContent(
            "gpt-other",
        );
    });

    it("links to model connections when nothing is configured", () => {
        renderForm(undefined, {
            ...capabilities,
            model_profiles: [],
            connections: [],
        });

        expect(screen.getByRole("link", { name: "Add a model connection" })).toHaveAttribute(
            "href",
            "/settings/model-connections",
        );
    });
});
