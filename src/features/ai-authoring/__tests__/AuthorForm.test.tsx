import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { AuthorForm } from "../components/AuthorForm";
import { createAuthoringJob, getJudgeCompatibility } from "../services/ai-authoring.service";
import type { AuthoringCapabilities, AuthoringRetryPrefill, JudgeCompatibility } from "../types";
import { capabilities, connectionCapabilities } from "./fixtures";

vi.mock("../services/ai-authoring.service", () => ({
    getAuthoringCapabilities: vi.fn(),
    getJudgeCompatibility: vi.fn(),
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
    it("adds the verified family scope while preserving the educator's prompt", async () => {
        const example = "H2 topic 1.2. Binary search.";
        renderForm(undefined, {
            ...capabilities,
            syllabus_prompts: {code: {"1.2 · Fundamental algorithms": example}},
        });
        const user = userEvent.setup();
        await user.type(screen.getByLabelText("Prompt"), "Include a sorted array.");
        await user.selectOptions(screen.getByLabelText("Add an H2 topic to the prompt"), example);
        expect(screen.getByLabelText("Prompt")).toHaveValue(example + "\nInclude a sorted array.");
    });

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
        vi.mocked(getJudgeCompatibility).mockResolvedValue({
            difficulty: { status: "compatible", provider: "openai", model: "gpt-test" },
            relevance: { status: "compatible", provider: "openai", model: "configured-judge" },
        });
        vi.mocked(createAuthoringJob).mockResolvedValue({
            job_id: "job-1",
            status_url: "/ai-authoring/jobs/job-1",
        });
    });

    afterEach(cleanup);

    it("shows the fallback check and model before submitting the original selection", async () => {
        vi.mocked(getJudgeCompatibility).mockResolvedValueOnce({
            difficulty: { status: "fallback", provider: "openai", model: "gpt-mini" },
            relevance: { status: "compatible", provider: "openai", model: "configured-judge" },
        });
        const user = userEvent.setup();
        renderForm(undefined, connectionCapabilities);

        expect(await screen.findByText(/Difficulty will use OpenAI gpt-mini/)).toBeVisible();
        expect(screen.getByRole("button", { name: "Advanced settings" })).toHaveAttribute("aria-expanded", "false");
        expect(createAuthoringJob).not.toHaveBeenCalled();

        await user.type(screen.getByLabelText("Prompt"), "Create a loop question.");
        await user.click(screen.getByRole("button", { name: "Create question" }));
        await waitFor(() => {
            expect(createAuthoringJob).toHaveBeenCalledWith(expect.objectContaining({
                connection_id: "connection-1",
                model: "gpt-test",
            }));
        });
    });

    it("blocks submission during a model change and ignores the old compatibility response", async () => {
        let resolveFirst!: (result: JudgeCompatibility) => void;
        let resolveSecond!: (result: JudgeCompatibility) => void;
        const first = new Promise<JudgeCompatibility>((resolve) => { resolveFirst = resolve; });
        const second = new Promise<JudgeCompatibility>((resolve) => { resolveSecond = resolve; });
        vi.mocked(getJudgeCompatibility).mockImplementation(({ model }) =>
            model === "gpt-other" ? second : first,
        );
        const user = userEvent.setup();
        renderForm(undefined, connectionCapabilities);
        await waitFor(() => expect(getJudgeCompatibility).toHaveBeenCalled());
        await user.type(screen.getByLabelText("Prompt"), "Create a loop question.");
        await openAdvanced();
        await user.click(screen.getByRole("combobox", { name: "Model" }));
        await user.click(screen.getByRole("option", { name: "gpt-other" }));
        const create = screen.getByRole("button", { name: "Create question" });

        expect(create).toBeDisabled();
        await act(async () => {
            fireEvent.submit(create.closest("form")!);
            resolveFirst({
                difficulty: { status: "fallback", provider: "openai", model: "obsolete-fallback" },
                relevance: { status: "compatible", provider: "openai", model: "configured-judge" },
            });
        });
        expect(createAuthoringJob).not.toHaveBeenCalled();
        expect(screen.queryByText(/obsolete-fallback/)).not.toBeInTheDocument();
        expect(create).toBeDisabled();

        await act(async () => {
            resolveSecond({
                difficulty: { status: "compatible", provider: "openai", model: "gpt-other" },
                relevance: { status: "fallback", provider: "openai", model: "gpt-mini" },
            });
        });
        expect(await screen.findByText(/Relevance will use OpenAI gpt-mini/)).toBeVisible();
        expect(create).toBeEnabled();
    });

    it("combines both checks in one message when they use the same fallback", async () => {
        const fallback = { status: "fallback", provider: "soclaas", model: "x-test-2" } as const;
        vi.mocked(getJudgeCompatibility).mockResolvedValueOnce({
            difficulty: fallback,
            relevance: fallback,
        });
        renderForm(undefined, connectionCapabilities);

        expect(await screen.findByText("Difficulty and relevance will use SoCLaaS x-test-2.")).toBeVisible();
        expect(screen.getAllByText(/x-test-2/)).toHaveLength(1);
    });

    it("explains unknown and unavailable checks while allowing the user to continue", async () => {
        vi.mocked(getJudgeCompatibility).mockResolvedValueOnce({
            difficulty: { status: "unknown", provider: "openai", model: "gpt-test" },
            relevance: { status: "unavailable", provider: "openai", model: "configured-judge" },
        });
        renderForm(undefined, connectionCapabilities);

        expect(await screen.findByText(/Difficulty model compatibility is unknown\. A fallback may be used/)).toBeVisible();
        expect(screen.getByText(/Relevance check may be skipped/)).toBeVisible();
        expect(screen.getByRole("button", { name: "Create question" })).toBeEnabled();
    });

    it("lets the user retry when the compatibility request fails", async () => {
        vi.mocked(getJudgeCompatibility).mockRejectedValueOnce(new Error("Offline"));
        const user = userEvent.setup();
        renderForm();

        const retry = await screen.findByRole("button", { name: "Retry compatibility check" });
        const create = screen.getByRole("button", { name: "Create question" });
        expect(create).toBeDisabled();
        await user.click(retry);
        await waitFor(() => expect(create).toBeEnabled());
    });

    it("reuses fresh results only for the same author and advisory selections", async () => {
        const user = userEvent.setup();
        vi.mocked(getJudgeCompatibility).mockResolvedValueOnce({
            difficulty: { status: "fallback", provider: "openai", model: "gpt-mini" },
            relevance: { status: "compatible", provider: "openai", model: "configured-judge" },
        });
        renderForm(undefined, connectionCapabilities);
        const fallback = /Difficulty will use OpenAI gpt-mini/;

        expect(await screen.findByText(fallback)).toBeVisible();
        await openAdvanced();
        await user.click(screen.getByRole("combobox", { name: "Difficulty check" }));
        await user.click(screen.getByRole("option", { name: /My OpenAI/ }));
        await waitFor(() => expect(getJudgeCompatibility).toHaveBeenLastCalledWith({
            connection_id: "connection-1",
            model: "gpt-test",
            judges: { difficulty: { connection_id: "connection-1", model: "gpt-test" } },
        }, expect.any(AbortSignal)));
        expect(screen.queryByText(fallback)).not.toBeInTheDocument();

        await user.click(screen.getByRole("combobox", { name: "Difficulty check" }));
        await user.click(screen.getByRole("option", { name: "Same as question model" }));
        expect(await screen.findByText(fallback)).toBeVisible();
        expect(getJudgeCompatibility).toHaveBeenCalledTimes(2);
    });

    it("refreshes an expired check on submission and shows the new warning before creating", async () => {
        const user = userEvent.setup();
        renderForm(undefined, connectionCapabilities);
        const create = screen.getByRole("button", { name: "Create question" });
        await waitFor(() => expect(create).toBeEnabled());
        await user.type(screen.getByLabelText("Prompt"), "Create a loop question.");
        vi.mocked(getJudgeCompatibility).mockResolvedValueOnce({
            difficulty: { status: "compatible", provider: "openai", model: "gpt-test" },
            relevance: { status: "fallback", provider: "openai", model: "gpt-mini" },
        });
        vi.spyOn(Date, "now").mockReturnValue(Date.now() + 60_001);

        await user.click(create);

        expect(await screen.findByText("Relevance will use OpenAI gpt-mini.")).toBeVisible();
        expect(screen.getByText("Review the model check and submit again.")).toBeVisible();
        expect(createAuthoringJob).not.toHaveBeenCalled();
        await user.click(create);
        await waitFor(() => expect(createAuthoringJob).toHaveBeenCalledTimes(1));
    });

    it("checks the completed model name when the user enters it manually", async () => {
        const user = userEvent.setup();
        renderForm(undefined, {
            ...connectionCapabilities,
            connections: connectionCapabilities.connections?.map((connection) => ({
                ...connection,
                models: [],
            })),
        });
        await waitFor(() => expect(screen.getByRole("button", { name: "Create question" })).toBeEnabled());
        await openAdvanced();
        const model = screen.getByLabelText("Model");
        await user.clear(model);
        await user.type(model, "manual-model");

        expect(screen.getByRole("button", { name: "Create question" })).toBeDisabled();
        await waitFor(() => expect(getJudgeCompatibility).toHaveBeenLastCalledWith({
            connection_id: "connection-1",
            model: "manual-model",
        }, expect.any(AbortSignal)));
        expect(getJudgeCompatibility).toHaveBeenCalledTimes(2);
    });

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
        expect(screen.getByLabelText("Wrong choices (distractors)")).toHaveValue(2);
        expect(screen.queryByText("Prefilled")).not.toBeInTheDocument();

        await openAdvanced();
        expect(screen.getByRole("combobox", { name: "Question model" })).toHaveTextContent(
            "Default authoring model",
        );
    });

    it("keeps the normal defaults when there is no prefill", async () => {
        renderForm();

        expect(screen.getByLabelText("Prompt")).toHaveValue("");
        expect(screen.getByRole("radio", { name: "Easy" })).toBeChecked();
        expect(screen.getByLabelText("Wrong choices (distractors)")).toHaveValue(3);
        expect(screen.queryByText("Prefilled")).not.toBeInTheDocument();
    });

    it("shows the saved excerpts on retry and submits them with the updated prompt", async () => {
        const materials = {
            lecture: [{ document: "lecture.pdf", pages: [1], text: "Indexed lists" }],
            exam: { document: "exam.pdf", pages: [2], text: "Find the last element." },
        };
        renderForm({ prompt: "Create a list question.", difficulty: "easy", num_distractors: 3, materials });
        const user = userEvent.setup();
        await user.click(screen.getByText("Source excerpts"));
        expect(screen.getByText("Find the last element.")).toBeVisible();
        const prompt = screen.getByLabelText("Prompt");
        await user.clear(prompt);
        await user.type(prompt, "Ask for the return value of a list function.");
        await user.click(screen.getByRole("button", { name: "Create question" }));
        await waitFor(() => {
            expect(createAuthoringJob).toHaveBeenLastCalledWith(expect.objectContaining({
                prompt: "Ask for the return value of a list function.",
                materials,
            }));
        });
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

    it("submits a user-entered distractor count", async () => {
        const user = userEvent.setup();
        renderForm(undefined, connectionCapabilities);

        const distractors = screen.getByLabelText("Wrong choices (distractors)");
        await user.clear(distractors);
        await user.type(distractors, "6");
        await user.type(screen.getByLabelText("Prompt"), "Create a loop question.");
        await user.click(screen.getByRole("button", { name: "Create question" }));

        await waitFor(() => {
            expect(createAuthoringJob).toHaveBeenCalledWith(
                expect.objectContaining({ num_distractors: 6 }),
            );
        });
    });

    it("rejects a distractor count outside the supported range", async () => {
        const user = userEvent.setup();
        renderForm(undefined, connectionCapabilities);

        const distractors = screen.getByLabelText("Wrong choices (distractors)");
        await user.clear(distractors);
        await user.type(distractors, "11");
        await user.type(screen.getByLabelText("Prompt"), "Create a loop question.");
        await user.click(screen.getByRole("button", { name: "Create question" }));

        expect(
            await screen.findByText("Enter at most 10 wrong choices."),
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

    it("shows both checks inheriting the question model when there is no override", async () => {
        renderForm(undefined, { ...connectionCapabilities, judge: null });
        await openAdvanced();
        for (const name of ["Difficulty check", "Relevance check"]) {
            expect(screen.getByRole("combobox", { name })).toHaveTextContent("Same as question model");
        }
    });

    it("shows an explicit server override for relevance", async () => {
        renderForm(undefined, connectionCapabilities);
        await openAdvanced();

        expect(screen.getByRole("combobox", { name: "Difficulty check" })).toHaveTextContent(
            "Same as question model",
        );
        expect(screen.getByRole("combobox", { name: "Relevance check" })).toHaveTextContent(
            "Server override (Default judge)",
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
