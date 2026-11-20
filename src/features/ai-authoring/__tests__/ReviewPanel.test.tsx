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
    biologyReview,
    needsReviewReview,
    physicsReview,
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

    it("shows each eligible curated question and its key before approval", () => {
        renderPanel({
            ...unapprovedReview,
            template: {
                ...unapprovedReview.template!,
                case_previews: [
                    { case_id: "a", question: "Find the first area.", answer: "12", superseded_by: null },
                    { case_id: "b", question: "Find the second area.", answer: "18", choices: ["9", "18", "36"], superseded_by: null },
                ],
            },
        });
        const cases = within(screen.getByRole("region", {name: "Questions eligible for approval"}));
        expect(cases.getAllByRole("listitem")).toHaveLength(5);
        expect(cases.getByText("36")).toBeVisible();
        expect(cases.getByText("Find the second area.")).toBeVisible();
        expect(cases.getByText("18")).toBeVisible();
    });

    it.each(["math", "code"])("shows seed zero as a sampled %s variant", (domain) => {
        renderPanel({
            ...unapprovedReview,
            domain,
            request: { ...unapprovedReview.request, domain },
            template: {
                ...unapprovedReview.template!,
                case_previews: [{
                    case_id: "seed-0",
                    seed: 0,
                    question: "Choose the result for this input.",
                    answer: "18",
                    superseded_by: null,
                }],
            },
        });

        const variants = within(screen.getByRole("region", { name: "Sampled question variants" }));
        expect(variants.getByRole("heading", { name: "Seed 0" })).toBeVisible();
        expect(variants.getByText("Choose the result for this input.")).toBeVisible();
        expect(variants.getByText("18")).toBeVisible();
    });

    it("explains an unsupported request without presenting an approval decision", () => {
        vi.mocked(getAuthoringPreview).mockClear();
        renderPanel({
            ...unapprovedReview,
            domain: "physics",
            request: { ...unapprovedReview.request, domain: "physics" },
            artifact_id: null,
            artifact_sha256: null,
            template: null,
            checks: [],
            error: {
                code: "UNSUPPORTED_REQUEST",
                message: "This request needs hands-on work or original measurements.",
            },
        });
        const notice = screen.getByRole("alert", { name: "Unsupported request" });
        expect(within(notice).getByText("This request needs hands-on work or original measurements.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Approve question" })).not.toBeInTheDocument();
        expect(screen.queryByText("Review problem")).not.toBeInTheDocument();
        expect(getAuthoringPreview).not.toHaveBeenCalled();
    });

    it("shows every checked Physics scenario and its correct statement set before approval", () => {
        vi.mocked(getAuthoringPreview).mockClear();
        renderPanel({
            ...unapprovedReview,
            domain: "physics",
            request: { ...unapprovedReview.request, domain: "physics" },
            template: {
                ...unapprovedReview.template!,
                case_previews: [
                    {
                        case_id: "3c-1",
                        outcome: "3(c)",
                        question: "Assess the first motion graph.\n\nWhich statements are correct?",
                        answer: "A and D only",
                        choices: ["A and D only", "D only", "A, B and D only", "All four statements"],
                        incorrect_statements_example: {
                            question: "Use that graph again. Which listed statements are incorrect?",
                            answer: "C only",
                            choices: ["C only", "A and C only", "B and C only", "None of the statements"],
                        },
                        stimulus: {
                            kind: "graph",
                            x: "Time / s",
                            y: "Velocity / m/s",
                            series: [{ label: "Cart", points: [[0, 0], [2, 4]] }],
                        },
                    },
                    {
                        case_id: "3c-2",
                        outcome: "3(c)",
                        question: "Assess the second motion graph.",
                        answer: "B only",
                        choices: ["B only", "A and B only", "None of the statements", "B and C only"],
                        incorrect_statements_example: {
                            question: "Use the second graph. Which listed statements are incorrect?",
                            answer: "A and C only",
                            choices: ["A and C only", "C only", "A, B and C only", "A only"],
                        },
                        stimulus: {
                            kind: "graph",
                            x: "Time / s",
                            y: "Position / m",
                            series: [{ label: "Cart", points: [[0, 0], [2, 8]] }],
                        },
                    },
                ],
            },
        });
        const cases = screen.getByRole("region", { name: "Checked scenarios" });
        expect(within(cases).getAllByText("3(c)")).toHaveLength(2);
        expect(within(cases).getByText(/Assess the first motion graph/)).toBeInTheDocument();
        expect(within(cases).getByText("Assess the second motion graph.")).toBeInTheDocument();
        expect(within(cases).getByText("A and D only")).toBeInTheDocument();
        expect(within(cases).getByText("B only")).toBeInTheDocument();
        const [firstChoices, firstAlternate, secondChoices, secondAlternate] = within(cases).getAllByRole("list", { name: "Example answer choices" });
        expect(within(firstChoices).getAllByRole("listitem")).toHaveLength(4);
        expect(within(secondChoices).getAllByRole("listitem")).toHaveLength(4);
        expect(within(firstChoices).getByText("A and D only").closest("li")).toHaveTextContent("Correct answer");
        expect(within(firstChoices).getByText("D only").closest("li")).not.toHaveTextContent("Correct answer");
        expect(within(secondChoices).getByText("None of the statements")).toBeInTheDocument();
        expect(within(cases).getAllByRole("heading", { name: "Incorrect-statement example" })).toHaveLength(2);
        expect(within(firstAlternate).getAllByRole("listitem")).toHaveLength(4);
        expect(within(secondAlternate).getAllByRole("listitem")).toHaveLength(4);
        expect(within(firstAlternate).getByText("C only").closest("li")).toHaveTextContent("Correct answer");
        expect(within(secondAlternate).getByText("A and C only").closest("li")).toHaveTextContent("Correct answer");
        expect(within(cases).getByText(/can change with the seed/)).toBeInTheDocument();
        expect(within(cases).getByRole("img", { name: "Velocity / m/s against Time / s" })).toBeInTheDocument();
        expect(within(cases).getByRole("img", { name: "Position / m against Time / s" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Approve question" })).toBeEnabled();
        expect(getAuthoringPreview).not.toHaveBeenCalled();
    });

    it("allows approval when advisory feedback differs and keeps it neutral", async () => {
        renderPanel(unapprovedReview);

        expect(await screen.findByText(previewInstanceQuestion())).toBeInTheDocument();
        expect(screen.getByText("Example question")).toBeInTheDocument();
        expect(screen.queryByText("Checked cases")).not.toBeInTheDocument();
        expect(screen.getByText("Difficulty differs")).toBeInTheDocument();
        expect(screen.getByText("Relevance not checked")).toBeInTheDocument();

        const advisory = screen.getByText("Difficulty differs").closest("[data-advisory]");
        expect(advisory).toHaveClass("bg-muted/30");
        expect(screen.getByRole("button", { name: "Approve question" })).toBeEnabled();
    });

    it("shows a checked Physics calculation without statement-set instructions", () => {
        vi.mocked(getAuthoringPreview).mockClear();
        renderPanel({
            ...physicsReview,
            template: {
                ...physicsReview.template!,
                case_previews: [{
                    case_id: "prefixes-1",
                    question: "Convert 25 mm to metres.",
                    answer: "0.025 m",
                    choices: ["0.025 m", "0.25 m", "250 m"],
                    stimulus: null,
                    incorrect_statements_example: null,
                }],
            },
        });

        const scenarios = within(screen.getByRole("region", { name: "Checked scenarios" }));
        expect(scenarios.getByText("0.025 m").closest("li")).toHaveTextContent("Correct answer");
        expect(scenarios.queryByText(/Statement order/)).not.toBeInTheDocument();
        expect(getAuthoringPreview).not.toHaveBeenCalled();
    });

    it("shows the actual options and key for both checked Biology cases", () => {
        renderPanel({
            ...unapprovedReview,
            domain: "biology",
            request: { ...unapprovedReview.request, domain: "biology" },
            template: {
                template_id: "biology.medium.two-cases",
                candidate: { item: { schema_version: "bio-h2/1" } },
                case_previews: [
                    {
                        case_id: "dihybrid.self",
                        outcome: "2(x)",
                        question: "What fraction of RrTt × RrTt offspring is red and tall?",
                        answer: "9/16",
                        choices: ["9/16", "3/4", "1/4", "3/16"],
                    },
                    {
                        case_id: "dihybrid.test",
                        outcome: "2(x), 2(y)",
                        question: "What fraction of RrTt × rrtt offspring is white and tall?",
                        answer: "1/4",
                        choices: ["1/4", "1/2", "3/4", "3/16"],
                        figure: {
                            data_url: "data:image/png;base64,AA==",
                            alt: "Illustrated test cross",
                            credit: "EdCraft classroom schematic",
                        },
                    },
                ],
            },
        });

        const cases = screen.getByRole("region", { name: "Selected questions" });
        for (const text of [
            "What fraction of RrTt × RrTt offspring is red and tall?",
            "What fraction of RrTt × rrtt offspring is white and tall?",
            "Learning outcome 2(x), 2(y)",
        ]) {
            expect(within(cases).getByText(text)).toBeVisible();
        }
        const [first, second] = within(cases).getAllByRole("list", { name: "Answer choices" });
        for (const [list, answer, distractor] of [[first, "9/16", "1/4"], [second, "1/4", "1/2"]] as const) {
            expect(within(list).getAllByRole("listitem")).toHaveLength(4);
            expect(within(list).getByText(answer).closest("li")).toHaveTextContent("Correct answer");
            expect(within(list).getByText(distractor).closest("li")).not.toHaveTextContent("Correct answer");
        }
        expect(within(cases).getByRole("heading", { name: "dihybrid test" })).toBeVisible();
        expect(within(cases).getByRole("img", { name: "Illustrated test cross" })).toBeVisible();
        expect(screen.getByRole("button", { name: "Approve question" })).toBeEnabled();
    });

    it("shows all choices and marks one key for a current single Biology case", () => {
        renderPanel({
            ...unapprovedReview,
            domain: "biology",
            request: { ...unapprovedReview.request, domain: "biology" },
            template: {
                template_id: "biology.medium.single-case",
                candidate: { item: { schema_version: "bio-h2/1" } },
                case_previews: [{
                    case_id: "dihybrid.self",
                    question: "What fraction of the RrTt × RrTt offspring is red and tall?",
                    outcome: "2(x)",
                    answer: "9/16",
                    choices: ["9/16", "3/4", "1/4", "3/16"],
                    superseded_by: null,
                }],
            },
        });
        const cases = screen.getByRole("region", { name: "Selected questions" });
        const options = within(cases).getByRole("list", { name: "Answer choices" });
        expect(within(options).getAllByRole("listitem")).toHaveLength(4);
        expect(within(options).getByText("9/16").closest("li")).toHaveTextContent("Correct answer");
        expect(within(options).getAllByText("Correct answer")).toHaveLength(1);
        expect(within(cases).queryByRole("alert")).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Approve question" })).toBeEnabled();
    });

    it("keeps the parameterised monohybrid review on its seeded preview", () => {
        renderPanel(biologyReview);
        expect(screen.getByText("Example question")).toBeInTheDocument();
        expect(screen.queryByRole("region", { name: "Selected questions" })).not.toBeInTheDocument();
    });

    it("recommends the corrected case on an existing Biology approval", () => {
        renderPanel({
            ...approvedReview,
            domain: "biology",
            request: { ...approvedReview.request, domain: "biology" },
            template: {
                template_id: "biology.medium.archived",
                candidate: { item: { schema_version: "bio-h2/1" } },
                case_previews: [{
                    case_id: "skill.cell.osmosis",
                    question: "In which direction does water move on balance?",
                    answer: "Towards lower water potential",
                    choices: ["Towards lower water potential", "Towards higher water potential"],
                    figure: {
                        data_url: "data:image/png;base64,AA==",
                        alt: "Archived classroom diagram",
                        credit: "EdCraft classroom schematic",
                    },
                    superseded_by: "skill.cell.osmosis_gradient",
                }],
            },
        });
        const cases = screen.getByRole("region", { name: "Selected questions" });
        const notice = within(cases).getByRole("alert");
        expect(notice).toHaveTextContent("Author the corrected Biology case");
        expect(notice).toHaveTextContent("skill.cell.osmosis_gradient");
        expect(within(cases).getByRole("img", { name: "Archived classroom diagram" })).toBeVisible();
        expect(screen.getByRole("link", { name: "Create question set" })).toBeVisible();
    });

    it("shows every checked case and key beside the example question", async () => {
        renderPanel({
            ...unapprovedReview,
            domain: "chemistry",
            request: { ...unapprovedReview.request, domain: "chemistry" },
            template: {
                ...unapprovedReview.template!,
                case_previews: [
                    {
                        case_id: "atom-a",
                        outcome: null,
                        question: "How many neutrons are in aluminium-27?",
                        answer: "14",
                        choices: ["13", "14", "15", "40"],
                        key_source: "catalogue",
                        key_evidence: ["separate_reference", "external_blind"],
                    },
                    {
                        case_id: "ion-b",
                        outcome: null,
                        question: "How many electrons are in a chloride ion?",
                        answer: "18",
                        choices: ["18", "16", "17", "37"],
                        key_source: "catalogue",
                    },
                ],
            },
        });

        expect(await screen.findByText(previewInstanceQuestion())).toBeInTheDocument();
        expect(screen.getByText("Checked cases")).toBeInTheDocument();
        const atomCase = screen.getByText("How many neutrons are in aluminium-27?").closest("li")!;
        expect(atomCase).toHaveTextContent("Answer 14");
        expect(atomCase).toHaveTextContent("Separate reference solution");
        expect(atomCase).toHaveTextContent("Independent blinded answer check");
        expect(within(atomCase).getAllByRole("listitem").map((choice) => choice.textContent))
            .toEqual(["13", "14", "15", "40"]);
        const ionCase = screen.getByText("How many electrons are in a chloride ion?").closest("li");
        expect(ionCase).toHaveTextContent("Answer 18");
        expect(ionCase).toHaveTextContent("Catalogue key only");
        expect(screen.getByRole("button", { name: "Approve question" })).toBeEnabled();
        expect(screen.getByText(/separate solution checks cover only a subset/i)).toBeInTheDocument();
    });

    it("explains an unsupported format without presenting it as a system error", () => {
        renderPanel({
            ...needsReviewReview,
            error: {
                code: "UNSUPPORTED_REQUEST",
                message: "Equipment handling requires direct observation.",
            },
        });
        const notice = screen.getByText("Unsupported question format").closest("[role=alert]");
        expect(notice).toHaveTextContent("Equipment handling requires direct observation.");
        expect(screen.queryByText("Create a new question if this persists.")).not.toBeInTheDocument();
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
