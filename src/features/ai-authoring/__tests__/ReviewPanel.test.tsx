import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, useLocation } from "react-router-dom";
import { ApiError } from "@/api/axiosInstance";
import { ReviewPanel } from "../components/ReviewPanel";
import {
    decideAuthoringApproval,
    getAuthoringPreview,
} from "../services/ai-authoring.service";
import type {
    AuthoringApproval,
    AuthoringReview,
    CodeQuestionInstance,
    CodeTemplateCandidate,
} from "../types";
import {
    approvedReview,
    needsReviewReview,
    preview,
    stubReview,
    technicalFailureReview,
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
    PreviewQuestion: ({ instance }: { instance: { question: { question: string } } }) => (
        <div>{instance.question.question}</div>
    ),
}));

const approval: AuthoringApproval = {
    decision: "approved",
    artifact_sha256: "a".repeat(64),
    reviewer: "teacher@example.com",
    note: null,
    decided_at: "2026-11-03T00:00:00Z",
};

function CreatePageProbe() {
    const location = useLocation();
    const prefill = (
        location.state as { authoringPrefill?: { prompt?: string } } | null
    )?.authoringPrefill;
    return <div>Create page prefill: {prefill?.prompt ?? "none"}</div>;
}

function renderPanel(review: AuthoringReview, onStaleArtifact = vi.fn()) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
        <QueryClientProvider client={client}>
            <MemoryRouter initialEntries={["/ai-authoring/job-1"]}>
                <CreatePageProbe />
                <ReviewPanel
                    jobId="job-1"
                    review={review}
                    result={null}
                    onStaleArtifact={onStaleArtifact}
                />
            </MemoryRouter>
        </QueryClientProvider>,
    );
    return { onStaleArtifact };
}

async function openTechnicalDetails() {
    const summary = await screen.findByText("Technical details", { selector: "summary" });
    const details = summary.closest("details");
    expect(details).not.toBeNull();
    if (!details) throw new Error("Technical details disclosure was not rendered.");
    expect(details).not.toHaveAttribute("open");
    await userEvent.setup().click(summary);
    return details;
}

describe("ReviewPanel", () => {
    beforeEach(() => {
        vi.mocked(getAuthoringPreview).mockResolvedValue(preview);
        vi.mocked(decideAuthoringApproval).mockResolvedValue(approval);
    });

    afterEach(cleanup);

    it("allows approval when advisory feedback differs and keeps it neutral", async () => {
        renderPanel(unapprovedReview);

        expect(await screen.findByText(previewInstanceQuestion())).toBeInTheDocument();
        expect(screen.getByText("Example question")).toBeInTheDocument();
        expect(screen.getByText("Difficulty differs")).toBeInTheDocument();
        expect(screen.getByText("Relevance not checked")).toBeInTheDocument();

        const advisory = screen.getByText("Difficulty differs").closest("[data-advisory]");
        expect(advisory).toHaveClass("bg-muted/30");
        expect(screen.getByRole("button", { name: "Approve question" })).toBeEnabled();
    });

    it("keeps raw identifiers inside a closed technical disclosure", async () => {
        renderPanel(unapprovedReview);

        const summary = await screen.findByText("Technical details", { selector: "summary" });
        const details = summary.closest("details");
        expect(details).not.toHaveAttribute("open");
        expect(
            within(details as HTMLElement).getAllByText(unapprovedReview.artifact_sha256!).length,
        ).toBeGreaterThan(0);
        expect(screen.getByRole("button", { name: "Approve question" })).toBeEnabled();
    });

    it("keeps the reviewer identifier out of the primary approval summary", async () => {
        renderPanel(approvedReview);

        expect(await screen.findByText(/Approved on/)).toBeInTheDocument();
        const technical = screen.getByText("Technical details", { selector: "summary" }).closest("details");
        expect(technical).not.toBeNull();
        expect(
            within(technical as HTMLElement).getAllByText(approval.reviewer),
        ).toHaveLength(1);
        expect(screen.getAllByText(approval.reviewer)).toHaveLength(1);

        const details = await openTechnicalDetails();
        expect(details).toHaveTextContent(approval.reviewer);
    });

    it("shows the specific approval blocker and links it to the approve button", async () => {
        renderPanel(technicalFailureReview);

        const blocker = await screen.findByText(
            'The technical check "Answers and wrong choices" needs attention. Create a new question and try again.',
        );
        expect(blocker).toHaveAttribute("id", "approval-blocker");

        const approve = screen.getByRole("button", { name: "Approve question" });
        expect(approve).toBeDisabled();
        expect(approve).toHaveAttribute("aria-describedby", blocker.id);
        expect(
            screen.queryByText(/Approval is unavailable until the technical checks pass/i),
        ).not.toBeInTheDocument();
        expect(screen.getAllByText("Answers and wrong choices").length).toBeGreaterThan(0);
    });

    it("shows the original request with its settings", () => {
        renderPanel(approvedReview);

        expect(screen.getByText("Your request")).toBeInTheDocument();
        const card = screen
            .getByText("Your request")
            .closest('[data-slot="card"]') as HTMLElement;
        expect(
            within(card).getByText("Write a question about summing a list."),
        ).toBeInTheDocument();
        expect(within(card).getByText("Code · Easy · 4 choices · default")).toBeInTheDocument();
    });

    it("shows a stub-domain request and generic template without code assumptions", () => {
        renderPanel(stubReview);

        const requestCard = screen
            .getByText("Your request")
            .closest('[data-slot="card"]') as HTMLElement;
        expect(
            within(requestCard).getByText("Stub · Easy · 4 choices · default"),
        ).toBeInTheDocument();

        const previewCard = screen
            .getByText("Example question")
            .closest('[data-slot="card"]') as HTMLElement;
        expect(within(previewCard).getByText("Template fields")).toBeInTheDocument();
        expect(
            within(previewCard).queryByLabelText("Template code"),
        ).not.toBeInTheDocument();
    });

    it("shows only the reject action when the version is already approved", () => {
        renderPanel(approvedReview);

        expect(screen.getByText(/Approved on/)).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /Approve/i }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Reject question" })).toBeInTheDocument();
    });

    it("offers a prefilled new question after a rejection", async () => {
        const user = userEvent.setup();
        renderPanel({
            ...approvedReview,
            approval: { ...approval, decision: "rejected" },
        });

        expect(screen.getByText(/Rejected on/)).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: /Reject/i }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Approve question" })).toBeInTheDocument();

        await user.click(
            screen.getByRole("link", { name: "Create a new question" }),
        );

        expect(
            await screen.findByText(
                "Create page prefill: Write a question about summing a list.",
            ),
        ).toBeInTheDocument();
    });

    it("sends the exact artifact digest without a review note", async () => {
        const user = userEvent.setup();
        renderPanel(unapprovedReview);

        expect(screen.queryByLabelText(/review note/i)).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Approve question" }));

        await waitFor(() => {
            expect(decideAuthoringApproval).toHaveBeenCalledWith("job-1", {
                artifact_sha256: unapprovedReview.artifact_sha256,
                decision: "approved",
                note: null,
            });
        });
    });

    it("sends an optional rejection reason with the exact digest", async () => {
        const user = userEvent.setup();
        renderPanel(unapprovedReview);

        await user.click(screen.getByRole("button", { name: "Reject question" }));
        await user.type(
            screen.getByLabelText("Reason (optional)"),
            "The difficulty label says medium but I asked for easy.",
        );
        await user.click(screen.getByRole("button", { name: "Confirm rejection" }));

        await waitFor(() => {
            expect(decideAuthoringApproval).toHaveBeenCalledWith("job-1", {
                artifact_sha256: unapprovedReview.artifact_sha256,
                decision: "rejected",
                note: "The difficulty label says medium but I asked for easy.",
            });
        });
    });

    it("shows the decided version beside the decision and links to technical details", () => {
        renderPanel(approvedReview);

        expect(screen.getByText(/Approved version/)).toBeInTheDocument();
        expect(
            screen.getByText(`${approvedReview.artifact_sha256!.slice(0, 12)}…`),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("link", { name: "Technical details" }),
        ).toHaveAttribute("href", "#technical-details");
    });

    it("reports a stale digest and asks the page to refresh", async () => {
        vi.mocked(decideAuthoringApproval).mockRejectedValue(
            new ApiError(409, "The artifact changed; refresh the review before deciding."),
        );
        const user = userEvent.setup();
        const { onStaleArtifact } = renderPanel(approvedReview);

        await user.click(screen.getByRole("button", { name: "Reject question" }));
        await user.click(screen.getByRole("button", { name: "Confirm rejection" }));

        await waitFor(() => expect(onStaleArtifact).toHaveBeenCalledOnce());
        expect(
            await screen.findByText(/changed or is no longer usable/i),
        ).toBeInTheDocument();
    });

    it("renders a FastAPI 422 detail array as a readable message without crashing", async () => {
        const error = new ApiError(422, "Unprocessable Entity");
        Object.defineProperty(error, "detail", {
            value: [
                {
                    loc: ["body", "seed"],
                    msg: "Input should be greater than or equal to 0",
                },
            ],
        });
        vi.mocked(getAuthoringPreview).mockRejectedValue(error);

        renderPanel(approvedReview);

        expect(
            await screen.findByText(
                /body.seed: Input should be greater than or equal to 0/,
                undefined,
                { timeout: 5000 },
            ),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Retry sample" })).toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Refresh evidence" }),
        ).not.toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Checks" })).toBeInTheDocument();
    });

    it("clears a cached preview and offers only evidence refresh for a stale 409", async () => {
        const user = userEvent.setup();
        const { onStaleArtifact } = renderPanel(approvedReview);
        expect(await screen.findByText(previewInstanceQuestion())).toBeInTheDocument();

        vi.mocked(getAuthoringPreview).mockRejectedValue(
            new ApiError(409, "The artifact changed; refresh the review before deciding."),
        );
        await user.click(screen.getByRole("button", { name: "Randomize" }));

        expect(
            await screen.findByText("Sample could not be loaded", undefined, { timeout: 5000 }),
        ).toBeInTheDocument();
        expect(screen.queryByText(previewInstanceQuestion())).not.toBeInTheDocument();
        expect(
            screen.queryByRole("button", { name: "Retry sample" }),
        ).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Refresh evidence" }));
        expect(onStaleArtifact).toHaveBeenCalledOnce();
    });

    it("requests another variation when Randomize is clicked", async () => {
        const user = userEvent.setup();
        renderPanel(approvedReview);
        await screen.findByText(previewInstanceQuestion());

        expect(getAuthoringPreview).toHaveBeenCalledWith("job-1", 0);
        expect(screen.getByText("Seed 0")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Randomize" }));

        await waitFor(() => {
            const seeds = vi.mocked(getAuthoringPreview).mock.calls.map((call) => call[1]);
            expect(seeds.some((seed) => seed !== 0)).toBe(true);
        });
        expect(screen.queryByText("Seed 0")).not.toBeInTheDocument();
        expect(screen.queryByText("Preview options")).not.toBeInTheDocument();
    });

    it("shows the relevance score in the advisory and keeps the reason in technical details", async () => {
        renderPanel({
            ...approvedReview,
            relevance: {
                advisory: true,
                status: "assessed",
                unavailable: false,
                score: 0.42,
                threshold: 0.5,
                relevant: false,
                reason: "Off topic.",
                error_code: null,
            },
        });

        expect(await screen.findByText("May not match the request")).toBeInTheDocument();
        const advisory = screen
            .getByText("May not match the request")
            .closest("[data-advisory]");
        expect(advisory).not.toBeNull();
        expect(within(advisory as HTMLElement).getByText("0.42")).toBeInTheDocument();
        expect(within(advisory as HTMLElement).getByText("Threshold 0.50")).toBeInTheDocument();
        expect(within(advisory as HTMLElement).queryByText("Off topic.")).not.toBeInTheDocument();
        expect(screen.queryByText("Not relevant")).not.toBeInTheDocument();

        const details = await openTechnicalDetails();
        expect(details).toHaveTextContent("Off topic.");
    });

    it("labels the reasoning fallback as the reasoning assessment", async () => {
        renderPanel({
            ...approvedReview,
            difficulty: {
                ...approvedReview.difficulty!,
                assessment_path: "reasoning",
                confidence: 0.72,
                confidence_source: "self_reported",
            },
        });

        const advisory = screen.getByText("Difficulty differs").closest("[data-advisory]");
        expect(advisory).not.toBeNull();
        expect(within(advisory as HTMLElement).getByText("72%")).toBeInTheDocument();
        expect(
            within(advisory as HTMLElement).getByText("Source: reasoning assessment"),
        ).toBeInTheDocument();
    });

    it("labels the forced-choice path as the decision model", async () => {
        renderPanel({
            ...approvedReview,
            difficulty: {
                ...approvedReview.difficulty!,
                assessment_path: "decision",
                confidence: 0.91,
                confidence_source: "first_token_label_mass",
            },
        });

        const advisory = screen.getByText("Difficulty differs").closest("[data-advisory]");
        expect(advisory).not.toBeNull();
        expect(
            within(advisory as HTMLElement).getByText("Source: decision model"),
        ).toBeInTheDocument();
    });

    it("renders a draft template as a question with code and choices", async () => {
        renderPanel(needsReviewReview);
        expect(await screen.findByText("Draft · checks failed")).toBeInTheDocument();

        const card = screen.getByText("Example question").closest("[data-slot='card']");
        expect(card).not.toBeNull();
        const template = within(card as HTMLElement);
        const candidate = needsReviewReview.candidate as CodeTemplateCandidate;

        expect(
            template.getByText(/This draft did not pass technical checks/),
        ).toBeInTheDocument();
        expect(template.getByLabelText("Template code").textContent).toBe(candidate.code);
        expect(template.getByText(candidate.question_template)).toBeInTheDocument();
        expect(template.getAllByText("sum(values)").length).toBeGreaterThan(0);
        expect(template.getAllByText("len(values)").length).toBeGreaterThan(0);
        expect(template.getByText("Confuses the list length with its sum.")).toBeInTheDocument();
        expect(
            template.queryByText("Why the other choices are wrong"),
        ).not.toBeInTheDocument();
        expect(
            template.getByText("Confuses the list length with its sum.").parentElement,
        ).toHaveClass("p-3");
        expect(
            template.queryByRole("button", { name: "Show Answer" }),
        ).not.toBeInTheDocument();
        expect(template.getByText("✓")).toBeInTheDocument();
        expect(template.queryByText("Answer:")).not.toBeInTheDocument();
        expect(template.queryByText(/Correct option/)).not.toBeInTheDocument();
        expect(template.queryByText("Template ID")).not.toBeInTheDocument();
        expect(
            template.queryByRole("columnheader", { name: "Values" }),
        ).not.toBeInTheDocument();
    });

    it("keeps template metadata inside technical details", async () => {
        renderPanel(approvedReview);
        await screen.findByText(previewInstanceQuestion());

        const details = await openTechnicalDetails();
        expect(within(details).getByText("Template details")).toBeInTheDocument();
        expect(
            within(details).getAllByText(approvedReview.template!.template_id).length,
        ).toBeGreaterThan(0);
        expect(within(details).getByRole("columnheader", { name: "Name" })).toBeInTheDocument();
    });

    it("labels a historical candidate inside technical details", async () => {
        renderPanel({ ...approvedReview, candidate_is_historical_attempt: true });

        const details = await openTechnicalDetails();
        expect(
            within(details).getByText(/Earlier drafts are kept for reference/),
        ).toBeInTheDocument();
    });

    it("renders the main column card titles as h2 headings", async () => {
        renderPanel(approvedReview);

        expect(
            await screen.findByRole("heading", { level: 2, name: "Your request" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { level: 2, name: "Example question" }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole("heading", { level: 2, name: "Checks" }),
        ).toBeInTheDocument();
    });

    it("shows exactly one Checks heading", async () => {
        renderPanel(approvedReview);

        expect(
            await screen.findByRole("heading", { name: "Checks" }),
        ).toBeInTheDocument();
        expect(
            screen.getAllByRole("heading", { name: "Checks" }),
        ).toHaveLength(1);
    });

    it("keeps mismatch warnings out of the review page because advisories show them", async () => {
        renderPanel({
            ...unapprovedReview,
            warnings: ["DIFFICULTY_MISMATCH", "RELEVANCE_MISMATCH"],
        });

        expect(await screen.findByText("Difficulty differs")).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "Warnings" }),
        ).not.toBeInTheDocument();
    });

    it("hides mismatch-only warnings after approval", async () => {
        renderPanel({
            ...approvedReview,
            warnings: ["DIFFICULTY_MISMATCH", "RELEVANCE_MISMATCH"],
        });

        expect(await screen.findByText(/Approved on/)).toBeInTheDocument();
        expect(
            screen.queryByRole("heading", { name: "Warnings" }),
        ).not.toBeInTheDocument();
    });

    it("keeps duplicate warnings after approval", async () => {
        renderPanel({
            ...approvedReview,
            warnings: ["Duplicate warning for RELEVANCE_MISMATCH"],
        });

        const heading = await screen.findByRole("heading", { name: "Warnings" });
        const panel = heading.closest("div");
        expect(panel).not.toBeNull();
        expect(
            within(panel as HTMLElement).getByText(
                "Duplicate warning for RELEVANCE_MISMATCH",
            ),
        ).toBeVisible();
    });
});

function previewInstanceQuestion(): string {
    return (preview.question as CodeQuestionInstance).question.question;
}
