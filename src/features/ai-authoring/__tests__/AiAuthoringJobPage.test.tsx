import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "@/api/axiosInstance";
import AiAuthoringJobPage from "../pages/AiAuthoringJobPage";
import {
    createAuthoringJob,
    decideAuthoringApproval,
    getAuthoringCapabilities,
    getAuthoringJob,
    getAuthoringPreview,
    getAuthoringReview,
} from "../services/ai-authoring.service";
import {
    approvedReview,
    capabilities,
    completedJob,
    failedJob,
    failedReview,
    failedWithDraftReview,
    needsReviewJob,
    needsReviewReview,
    preview,
    unapprovedReview,
} from "./fixtures";

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

vi.mock("../components/ReadOnlyCode", () => ({
    ReadOnlyCode: ({ code, label }: { code: string; label: string }) => (
        <pre aria-label={label}>{code}</pre>
    ),
}));

vi.mock("../components/PreviewQuestion", () => ({
    PreviewQuestion: ({ instance }: { instance: { seed: number } }) => (
        <div>Preview for seed {instance.seed}</div>
    ),
}));

function OpenJob2Button() {
    const navigate = useNavigate();
    return (
        <button type="button" onClick={() => navigate("/ai-authoring/job-2")}>
            Open job 2
        </button>
    );
}

function CreatePageProbe() {
    const location = useLocation();
    const prefill = (
        location.state as { authoringPrefill?: { prompt?: string } } | null
    )?.authoringPrefill;
    return <div>Create page prefill: {prefill?.prompt}</div>;
}

function renderJobPage() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={["/ai-authoring/job-1"]}>
                <OpenJob2Button />
                <Routes>
                    <Route path="/ai-authoring" element={<CreatePageProbe />} />
                    <Route path="/ai-authoring/:jobId" element={<AiAuthoringJobPage />} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe("AiAuthoringJobPage", () => {
    beforeEach(() => {
        vi.mocked(getAuthoringJob).mockResolvedValue(completedJob);
        vi.mocked(getAuthoringReview).mockResolvedValue(approvedReview);
        vi.mocked(getAuthoringCapabilities).mockResolvedValue(capabilities);
        vi.mocked(getAuthoringPreview).mockResolvedValue(preview);
        vi.mocked(decideAuthoringApproval).mockResolvedValue({
            decision: "approved",
            artifact_sha256: "a".repeat(64),
            reviewer: "teacher@example.com",
            note: null,
            decided_at: "2026-11-03T00:00:00Z",
        });
    });

    afterEach(cleanup);

    it("resumes the job from the URL without creating another job", async () => {
        renderJobPage();

        expect(await screen.findByRole("heading", { name: "Checks" })).toBeInTheDocument();
        expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
        expect(screen.getByRole("link", { name: "Create question set" })).toBeInTheDocument();
        expect(getAuthoringJob).toHaveBeenCalledWith("job-1");
        expect(getAuthoringReview).toHaveBeenCalledWith("job-1");
        expect(createAuthoringJob).not.toHaveBeenCalled();
        expect(screen.queryByRole("list", { name: "Request clauses" })).not.toBeInTheDocument();
        expect(screen.queryByText("/ai-authoring/job-1")).not.toBeInTheDocument();
    });

    it("shows every H2 request clause with citations and inspection guidance", async () => {
        vi.mocked(getAuthoringReview).mockResolvedValue({
            ...unapprovedReview,
            request: {
                ...unapprovedReview.request,
                prompt: "Ask for the complete merged sequence from two concrete runs;\nHide record identities until the final step.",
            },
            template: {
                template_id: "h2-merge-output",
                candidate: {
                    subject: "code",
                    family: "1.2.merge-output",
                    authoring_mode: "Parameterised H2 family",
                    family_capabilities: ["concrete_runs", "complete_merged_run"],
                    quoted_requirements: [
                        {
                            value: "complete_merged_run",
                            wording: "Ask for the complete merged sequence from two concrete runs;",
                        },
                    ],
                },
            },
            relevance: {
                ...unapprovedReview.relevance!,
                unavailable: false,
                status: "assessed",
                relevant: true,
            },
        });
        renderJobPage();

        const clauses = await screen.findByRole("list", { name: "Request clauses" });
        const [first, second] = within(clauses).getAllByRole("listitem");
        expect(first).toHaveTextContent("Ask for the complete merged sequence from two concrete runs;");
        expect(first).toHaveTextContent("Cited capabilities · complete merged run");
        expect(second).toHaveTextContent("Hide record identities until the final step.");
        expect(second).toHaveTextContent("Needs teacher inspection");
        expect(screen.getByText("Parameterised H2 family", { selector: "dd" })).toBeVisible();
        expect(screen.getByText("Verified family capabilities")).toBeVisible();
        expect(screen.getByText("concrete runs, complete merged run")).toBeVisible();
        expect(screen.getByText("Compare each clause with the question and choices, including clauses with citations.")).toBeVisible();
        expect(screen.getByText("Automated relevance check passed")).toBeInTheDocument();
        expect(screen.queryByText("Matches the request")).not.toBeInTheDocument();
    });

    it("keeps uncited H2 clauses available to inspect in a saved review without capability metadata", async () => {
        vi.mocked(getAuthoringReview).mockResolvedValue({
            ...approvedReview,
            request: {
                ...approvedReview.request,
                prompt: "Use merge sort. Ask for the next pair of heads.",
            },
            template: {
                template_id: "h2-archived-merge",
                candidate: {
                    subject: "code",
                    family: "1.2.merge-sort",
                },
                case_previews: [
                    { case_id: "1.2.merge-sort/0", question: "Which heads are compared next?", answer: "4 and 5" },
                ],
            },
            candidate: {
                subject: "code",
                family: "1.2.merge-sort",
                quoted_requirements: [{ value: "next_heads", wording: "Ask for the next pair of heads." }],
            },
            candidate_is_historical_attempt: true,
        });
        renderJobPage();

        const clauses = await screen.findByRole("list", { name: "Request clauses" });
        const [first, second] = within(clauses).getAllByRole("listitem");
        expect(within(first).getByText("Use merge sort.")).toBeVisible();
        expect(within(first).getByText("Needs teacher inspection")).toBeVisible();
        expect(within(second).getByText("Ask for the next pair of heads.")).toBeVisible();
        expect(within(second).getByText("Needs teacher inspection")).toBeVisible();
        expect(screen.getByText("Capability details are unavailable for this family.")).toBeVisible();
        expect(screen.getByText("Which heads are compared next?")).toBeVisible();
        expect(screen.getByRole("link", { name: "Create question set" })).toBeVisible();
    });

    it("shows the verified H2 family’s routine-versus-hard guidance before approval", async () => {
        const scopeNote = "This selection preserves the requested routine operation. Review the displayed choices before using it as a hard question.";
        vi.mocked(getAuthoringReview).mockResolvedValue({
            ...unapprovedReview,
            domain: "math",
            request: {
                ...unapprovedReview.request,
                domain: "math",
                difficulty: "hard",
                prompt: "Ask students to find an unbiased estimate of variance from summary totals.",
            },
            template: {
                template_id: "h2-variance-totals",
                candidate: {
                    subject: "math",
                    family: "6.4.variance-totals",
                    authoring_mode: "Parameterised H2 family",
                    family_capabilities: ["summary_totals", "unbiased_variance"],
                    difficulty_scope_note: scopeNote,
                },
            },
        });
        renderJobPage();

        expect(await screen.findByText(scopeNote, { selector: "p" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Approve question" })).toBeEnabled();
    });

    it("shows the agreed review status in the header", async () => {
        vi.mocked(getAuthoringReview).mockResolvedValue(unapprovedReview);
        renderJobPage();

        expect(await screen.findByText("Ready for review")).toBeInTheDocument();
        expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    });

    it("shows a rejected decision in the header", async () => {
        vi.mocked(getAuthoringReview).mockResolvedValue({
            ...unapprovedReview,
            approval: {
                decision: "rejected",
                artifact_sha256: unapprovedReview.artifact_sha256!,
                reviewer: "teacher@example.com",
                note: null,
                decided_at: "2026-11-03T00:00:00Z",
            },
        });
        renderJobPage();

        const rejected = await screen.findAllByText("Rejected");
        expect(
            rejected.some((node) => node.className.includes("bg-destructive")),
        ).toBe(true);
    });

    it("sends a failed request back to the create page with its fields prefilled", async () => {
        vi.mocked(getAuthoringJob).mockResolvedValue(failedJob);
        vi.mocked(getAuthoringReview).mockResolvedValue(failedReview);
        const user = userEvent.setup();
        renderJobPage();

        expect(await screen.findByText("Question creation failed")).toBeInTheDocument();
        expect(await screen.findByText("Failed")).toBeInTheDocument();
        await user.click(await screen.findByRole("link", { name: "Retry request" }));

        expect(
            await screen.findByText(`Create page prefill: ${failedReview.request.prompt}`),
        ).toBeInTheDocument();
        expect(createAuthoringJob).not.toHaveBeenCalled();
    });

    it("explains a failed job that produced no draft", async () => {
        vi.mocked(getAuthoringJob).mockResolvedValue(failedJob);
        vi.mocked(getAuthoringReview).mockResolvedValue(failedReview);
        renderJobPage();

        expect(
            await screen.findByText(
                "The model did not write a question for this request. It may be outside what EdCraft supports. Try rephrasing it or choose another model.",
            ),
        ).toBeInTheDocument();
        expect(screen.queryByText("Draft · checks failed")).not.toBeInTheDocument();
        expect(screen.queryByLabelText("Template code")).not.toBeInTheDocument();
        expect(
            screen.queryByText(
                "The model's revision could not be read. The last draft and the checks it failed are shown below.",
            ),
        ).not.toBeInTheDocument();
    });

    it("shows the latest draft and each failed check when a failed job has one", async () => {
        vi.mocked(getAuthoringJob).mockResolvedValue(failedJob);
        vi.mocked(getAuthoringReview).mockResolvedValue(failedWithDraftReview);
        renderJobPage();

        expect(
            await screen.findByText(
                "The model's revision could not be read. The last draft and the checks it failed are shown below.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByText("Draft · checks failed")).toBeInTheDocument();
        const templateCode = screen.getByLabelText("Template code");
        expect(templateCode).toHaveTextContent("def latest_draft(values):");
        expect(templateCode).not.toHaveTextContent("older_draft");

        const checksHeading = screen.getByRole("heading", { name: "Checks" });
        const checksPanel = checksHeading.closest("details");
        expect(checksPanel).not.toBeNull();
        const checks = within(checksPanel as HTMLElement);
        expect(checks.getByText("Answers and wrong choices")).toBeInTheDocument();
        expect(
            checks.getByText("A sampled example failed to execute."),
        ).toBeInTheDocument();
        expect(checks.getByText("Question template")).toBeInTheDocument();
        expect(
            checks.getByText("The question template has no placeholder."),
        ).toBeInTheDocument();

        expect(screen.getByText("Authoring attempts (2)")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Retry request" })).toBeInTheDocument();
    });

    it("shows the backend message with a draft for a non-generation error", async () => {
        vi.mocked(getAuthoringJob).mockResolvedValue({
            ...failedJob,
            error: {
                code: "AUTHORING_TIMEOUT",
                message: "Authoring timed out before the job produced a result.",
            },
        });
        vi.mocked(getAuthoringReview).mockResolvedValue(failedWithDraftReview);
        renderJobPage();

        expect(
            await screen.findByText(
                "Authoring timed out before the job produced a result. The last draft and the checks it failed are shown below.",
            ),
        ).toBeInTheDocument();
        expect(screen.getByText("Draft · checks failed")).toBeInTheDocument();
    });

    it("keeps a specific timeout message for a failed job", async () => {
        vi.mocked(getAuthoringJob).mockResolvedValue({
            ...failedJob,
            error: {
                code: "AUTHORING_TIMEOUT",
                message: "Authoring timed out before the job produced a result.",
            },
        });
        vi.mocked(getAuthoringReview).mockResolvedValue(failedReview);
        renderJobPage();

        expect(
            await screen.findByText("Authoring timed out before the job produced a result."),
        ).toBeInTheDocument();
    });

    it("offers retry when a completed job still needs review", async () => {
        vi.mocked(getAuthoringJob).mockResolvedValue(needsReviewJob);
        vi.mocked(getAuthoringReview).mockResolvedValue(needsReviewReview);
        renderJobPage();

        expect(await screen.findByRole("link", { name: "Retry request" })).toBeInTheDocument();
        expect(
            screen.queryByText("Technical checks did not pass"),
        ).not.toBeInTheDocument();
        expect(screen.getAllByText("Needs review").length).toBeGreaterThan(0);
        expect(
            screen.getAllByText("The generated template failed technical checks.").length,
        ).toBeGreaterThan(0);
        expect(screen.getByText("Draft · checks failed")).toBeInTheDocument();
        expect(screen.getByText(/This draft did not pass technical checks/)).toBeInTheDocument();
        expect(screen.getByLabelText("Template code")).toHaveTextContent("def list_sum");
    });

    it("hides cached review actions when the review refresh fails", async () => {
        const user = userEvent.setup();
        renderJobPage();

        await screen.findByRole("heading", { name: "Checks" });

        vi.mocked(getAuthoringReview).mockRejectedValue(new ApiError(503, "Review unavailable."));
        vi.mocked(decideAuthoringApproval).mockRejectedValue(
            new ApiError(409, "The artifact changed; refresh the review before deciding."),
        );

        await user.click(screen.getByRole("button", { name: "Reject question" }));
        await user.click(screen.getByRole("button", { name: "Confirm rejection" }));

        expect(
            await screen.findByText("The question changed", undefined, { timeout: 5000 }),
        ).toBeInTheDocument();
        expect(
            await screen.findByText("Review could not be loaded", undefined, {
                timeout: 5000,
            }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Reject question" }),
        ).not.toBeInTheDocument();
        expect(screen.queryByText("Preview for seed 0")).not.toBeInTheDocument();
    });

    it("does not carry a stale notice to a different job route", async () => {
        vi.mocked(decideAuthoringApproval).mockRejectedValue(
            new ApiError(409, "The artifact changed; refresh the review before deciding."),
        );
        const user = userEvent.setup();
        renderJobPage();

        await screen.findByRole("button", { name: "Reject question" });
        await user.click(screen.getByRole("button", { name: "Reject question" }));
        await user.click(screen.getByRole("button", { name: "Confirm rejection" }));
        expect(await screen.findByText("The question changed")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Open job 2" }));

        expect(getAuthoringJob).toHaveBeenCalledWith("job-2");
        await waitFor(() =>
            expect(screen.queryByText("The question changed")).not.toBeInTheDocument(),
        );
    });
});
