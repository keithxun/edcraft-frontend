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
        expect(screen.queryByText("/ai-authoring/job-1")).not.toBeInTheDocument();
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
