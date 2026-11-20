import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MaterialPracticeBatch } from "@/api/models";
import { MaterialsAuthoring } from "../components/MaterialsAuthoring";
import AiAuthoringPage from "../pages/AiAuthoringPage";
import {
    extractMaterialPages,
    generateMaterialQuestions,
    proposeMaterialMatch,
    retrieveMaterialEvidence,
    suggestMaterialTopics,
} from "../services/materials.service";

vi.mock("../services/materials.service");
vi.mock("../services/ai-authoring.service", () => ({
    getAuthoringCapabilities: vi.fn(() => new Promise(() => {})),
}));

const match = { family: "list_trace", task: "Trace list changes", reason: "Both sources use list tracing." };
const questions = Array.from({ length: 5 }, (_, index) => ({
    stem: `Trace variant ${index + 1}.`,
    options: ["Keep the original list", "Append an item"],
    correct_index: 1,
    explanation: "Appending adds an item at the end.",
}));

function practiceBatch(seed: number, sources: MaterialPracticeBatch["sources"] = []): MaterialPracticeBatch {
    return { questions, seed, validator_revision: "fixture-revision", generator_version: 2, sources, input_sha256: "fixture-receipt" };
}

async function retrieveEvidence(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Retrieve evidence" }));
    await screen.findByRole("group", { name: "Lecture evidence" });
}

async function selectSources(user: ReturnType<typeof userEvent.setup>) {
    await user.upload(screen.getByLabelText("Lecture PDFs"), new File(["lecture"], "lecture.pdf", { type: "application/pdf" }));
    await user.upload(screen.getByLabelText("Past-paper PDF"), new File(["exam"], "exam.pdf", { type: "application/pdf" }));
    await user.click(await within(screen.getByRole("group", { name: "lecture.pdf pages" })).findByRole("checkbox", { name: "Page 2" }));
    await user.click(await within(screen.getByRole("group", { name: "Past-paper pages" })).findByRole("checkbox", { name: "Page 1" }));
    await user.type(screen.getByLabelText("Topic"), "Lists");
    await user.type(screen.getByLabelText("Exam question reference"), "Q2(b)");
    fireEvent.change(screen.getByLabelText("Question or subpart"), { target: { value: "(b) Trace the list after append." } });
}

describe("MaterialsAuthoring", () => {
    beforeEach(() => {
        vi.stubGlobal("URL", Object.assign(class extends URL {}, {
            createObjectURL: vi.fn((file: File) => `blob:${file.name}`),
            revokeObjectURL: vi.fn(),
        }));
        vi.mocked(extractMaterialPages).mockImplementation(async (file) =>
            file.name === "lecture.pdf"
                ? { pages: ["Lecture introduction", "Worked list example"] }
                : { pages: ["Given xs = [3].\n(a) Define a list.\n(b) Trace the list after append.", "Another question"] },
        );
        vi.clearAllMocks();
        vi.mocked(suggestMaterialTopics).mockResolvedValue({ topics: ["Lists"] });
        vi.mocked(retrieveMaterialEvidence).mockImplementation(async ({ pages, selected }) => ({
            topics: [],
            evidence: (selected ?? []).map((reference) => ({
                ...reference,
                text: pages.find(({ document, page }) => document === reference.document && page === reference.page)?.text ?? "",
                score: null,
            })),
        }));
        vi.mocked(proposeMaterialMatch).mockResolvedValue(match);
        vi.mocked(generateMaterialQuestions).mockImplementation(async ({ seed, sources }) => practiceBatch(seed, sources));
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
    });

    it("opens the materials mode from the AI authoring page", async () => {
        const user = userEvent.setup();
        render(
            <QueryClientProvider client={new QueryClient()}>
                <MemoryRouter initialEntries={["/ai-authoring"]}>
                    <AiAuthoringPage />
                </MemoryRouter>
            </QueryClientProvider>,
        );

        expect(screen.getByRole("button", { name: "From a description" })).toHaveAttribute("aria-pressed", "true");
        await user.click(screen.getByRole("button", { name: "From module materials" }));
        expect(screen.getByRole("heading", { name: "Generate from module materials" })).toBeVisible();
        expect(screen.getByText("Loading question settings…")).not.toBeVisible();
    });

    it("binds the selected subject to reviewed evidence and resets approval if it changes", async () => {
        const user = userEvent.setup();
        render(<MaterialsAuthoring domains={["code", "physics"]} />);
        const subject = screen.getByLabelText("Subject");
        expect(within(subject).queryByRole("option", { name: "Biology" })).toBeNull();
        await user.selectOptions(subject, "code");
        await selectSources(user);
        await retrieveEvidence(user);
        await user.click(screen.getByRole("button", { name: "Propose a task" }));
        expect(proposeMaterialMatch).toHaveBeenCalledWith(expect.objectContaining({ domain: "code" }));
        await user.click(await screen.findByRole("button", { name: "Confirm task" }));
        await user.click(screen.getByRole("button", { name: "Generate five MCQs" }));
        expect(generateMaterialQuestions).toHaveBeenCalledWith(expect.objectContaining({ domain: "code" }));
        await user.selectOptions(subject, "physics");
        expect(screen.queryByRole("button", { name: "Replay set" })).toBeNull();
        expect(screen.getByRole("button", { name: "Propose a task" })).toBeEnabled();
    });

    it("proposes from exact excerpts, generates after confirmation, and replays with visible sources", async () => {
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        await user.click(screen.getByText("View original lecture.pdf"));
        expect(screen.getByTitle("lecture.pdf, page 2")).toHaveAttribute("src", "blob:lecture.pdf#page=2");
        const extractedPage = screen.getByLabelText("Extracted past-paper page 1");
        expect(extractedPage).toBeInstanceOf(HTMLTextAreaElement);
        (extractedPage as HTMLTextAreaElement).setSelectionRange(0, "Given xs = [3].".length);
        await user.click(screen.getByRole("button", { name: "Add selection to shared stem" }));
        expect(screen.getByLabelText("Shared stem (optional)")).toHaveValue("Given xs = [3].");
        await retrieveEvidence(user);
        fireEvent.change(screen.getByLabelText("lecture.pdf, page 2 excerpt"), { target: { value: "Edited list example" } });
        expect(within(screen.getByRole("group", { name: "Lecture evidence" })).getByText("Edited excerpt")).toBeVisible();

        await user.click(screen.getByRole("button", { name: "Propose a task" }));
        expect(await screen.findByText("Trace list changes")).toBeInTheDocument();
        const reviewedExcerpts = {
            lecture: "Edited list example",
            topic: "Lists",
            exam: "Given xs = [3].\n\n(b) Trace the list after append.",
            sources: [
                { document: "1: lecture.pdf", page: 2, role: "lecture", edited: true },
                { document: "1: exam.pdf", page: 1, role: "exam", edited: true },
            ],
        };
        expect(proposeMaterialMatch).toHaveBeenCalledWith(reviewedExcerpts);
        expect(screen.queryByRole("button", { name: "Generate five MCQs" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Confirm task" }));
        fireEvent.change(screen.getByLabelText("Replay seed"), { target: { value: "23" } });
        await user.click(screen.getByRole("button", { name: "Generate five MCQs" }));
        expect(await screen.findByText("Trace variant 5.")).toBeInTheDocument();
        const lectureCitation = screen.getByRole("link", { name: "lecture.pdf, page 2" });
        expect(lectureCitation).toHaveAttribute("href", "blob:lecture.pdf#page=2");
        expect(lectureCitation.closest("li")).toHaveTextContent("(edited excerpt)");
        expect(screen.getByRole("link", { name: "exam.pdf, page 1" })).toHaveAttribute("href", "blob:exam.pdf#page=1");
        expect(screen.getByText("Q2(b)")).toBeInTheDocument();
        expect(screen.getByText("Seed 23")).toBeInTheDocument();
        expect(screen.queryByText("Appending adds an item at the end.")).not.toBeInTheDocument();
        await user.click(screen.getAllByRole("button", { name: "Reveal answer" })[0]);
        expect(screen.getByText("Appending adds an item at the end.")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Replay set" }));
        expect(await screen.findByText("Trace variant 5.")).toBeInTheDocument();
        expect(generateMaterialQuestions).toHaveBeenCalledTimes(2);
        const frozenRequest = { ...reviewedExcerpts, family: "list_trace", seed: 23 };
        expect(generateMaterialQuestions).toHaveBeenNthCalledWith(1, frozenRequest);
        expect(generateMaterialQuestions).toHaveBeenNthCalledWith(2, frozenRequest);
    });

    it("shows the explanation for a mismatch and prevents confirmation", async () => {
        vi.mocked(proposeMaterialMatch).mockResolvedValueOnce({ family: null, task: "", reason: "The selected question assesses recursion." });
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        await retrieveEvidence(user);

        await user.click(screen.getByRole("button", { name: "Propose a task" }));

        expect(await screen.findByText("The selected question assesses recursion.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Confirm task" })).not.toBeInTheDocument();
    });

    it("requires a new confirmation when the selected supported task changes", async () => {
        vi.mocked(proposeMaterialMatch).mockResolvedValueOnce({
            family: "recursive-max",
            task: "Trace recursive maximum",
            reason: "The exam combines both halves using maximum.",
            alternatives: [{
                family: "recursive-sum-squares",
                task: "Trace recursive sum of squares",
                reason: "The lecture applies the same split to a sum of squares.",
            }],
        });
        vi.mocked(generateMaterialQuestions).mockResolvedValueOnce(practiceBatch(0));
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        await retrieveEvidence(user);
        await user.click(screen.getByRole("button", { name: "Propose a task" }));

        expect(await screen.findByRole("radio", { name: "Trace recursive maximum" })).toBeChecked();
        await user.click(screen.getByRole("button", { name: "Confirm task" }));
        await user.click(screen.getByRole("radio", { name: "Trace recursive sum of squares" }));
        expect(screen.queryByRole("button", { name: "Generate five MCQs" })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Confirm task" }));
        await user.click(screen.getByRole("button", { name: "Generate five MCQs" }));

        expect(await screen.findByText("Generator version 2")).toBeInTheDocument();
        expect(generateMaterialQuestions).toHaveBeenLastCalledWith(expect.objectContaining({ family: "recursive-sum-squares" }));
    });

    it("ignores a late proposal after the exact exam selection changes", async () => {
        let finishProposal!: (value: typeof match) => void;
        vi.mocked(proposeMaterialMatch).mockReturnValueOnce(new Promise((resolve) => {
            finishProposal = resolve;
        }));
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        await retrieveEvidence(user);

        await user.click(screen.getByRole("button", { name: "Propose a task" }));
        fireEvent.change(screen.getByLabelText("Question or subpart"), { target: { value: "(a) Define a list." } });
        await act(async () => finishProposal(match));

        expect(screen.queryByText("Trace list changes")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Confirm task" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Propose a task" })).toBeEnabled();
    });

    it("accepts a shared stem and an exact subpart from different PDF pages", async () => {
        vi.mocked(extractMaterialPages).mockResolvedValueOnce({ pages: ["Overview", "Loop trace lecture"] });
        vi.mocked(extractMaterialPages).mockResolvedValueOnce({ pages: [
            "Given a loop, trace count.",
            "(b) Show the final value.\n(c) Explain the output.",
        ] });
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        await retrieveEvidence(user);
        fireEvent.change(screen.getByLabelText("Question or subpart"), { target: { value: "" } });
        const sharedPage = screen.getByLabelText<HTMLTextAreaElement>("Extracted past-paper page 1");
        sharedPage.setSelectionRange(0, sharedPage.value.length);
        await user.click(screen.getByRole("button", { name: "Add selection to shared stem" }));

        await user.click(within(screen.getByRole("group", { name: "Past-paper pages" })).getByRole("checkbox", { name: "Page 2" }));
        const questionPage = screen.getByLabelText<HTMLTextAreaElement>("Extracted past-paper page 2");
        questionPage.setSelectionRange(0, questionPage.value.indexOf("\n"));
        await user.click(screen.getByRole("button", { name: "Add selection to question" }));

        await user.click(screen.getByRole("button", { name: "Propose a task" }));
        expect(proposeMaterialMatch).toHaveBeenLastCalledWith({
            lecture: "Loop trace lecture",
            topic: "Lists",
            exam: "Given a loop, trace count.\n\n(b) Show the final value.",
            sources: [
                { document: "1: lecture.pdf", page: 2, role: "lecture", edited: false },
                { document: "1: exam.pdf", page: 1, role: "exam", edited: false },
                { document: "1: exam.pdf", page: 2, role: "exam", edited: false },
            ],
        });
    });

    it("clears unverified exam text when a source page is removed", async () => {
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        await retrieveEvidence(user);
        const sharedStem = screen.getByLabelText("Shared stem (optional)");
        const question = screen.getByLabelText("Question or subpart");
        fireEvent.change(sharedStem, { target: { value: "Given xs = [3]." } });
        const pages = within(screen.getByRole("group", { name: "Past-paper pages" }));

        await user.click(pages.getByRole("checkbox", { name: "Page 2" }));
        expect(sharedStem).toHaveValue("Given xs = [3].");
        expect(question).toHaveValue("(b) Trace the list after append.");
        await user.click(screen.getByRole("button", { name: "Propose a task" }));
        await user.click(await screen.findByRole("button", { name: "Confirm task" }));

        await user.click(pages.getByRole("checkbox", { name: "Page 1" }));

        expect(pages.getByRole("checkbox", { name: "Page 2" })).toBeChecked();
        expect(sharedStem).toHaveValue("");
        expect(question).toHaveValue("");
        expect(screen.getByRole("button", { name: "Propose a task" })).toBeEnabled();
        expect(screen.queryByRole("button", { name: "Generate five MCQs" })).not.toBeInTheDocument();
    });

    it("limits the combined exam selection independently of the lecture excerpt", async () => {
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        await retrieveEvidence(user);
        fireEvent.change(screen.getByLabelText("lecture.pdf, page 2 excerpt"), { target: { value: "L".repeat(25_000) } });
        fireEvent.change(screen.getByLabelText("Shared stem (optional)"), { target: { value: "S".repeat(23_997) } });
        const question = screen.getByLabelText("Question or subpart");
        const propose = screen.getByRole("button", { name: "Propose a task" });

        fireEvent.change(question, { target: { value: "QQ" } });
        expect(propose).toBeDisabled();
        expect(screen.getByRole("alert")).toHaveTextContent("24,000 characters");
        fireEvent.change(question, { target: { value: "Q" } });
        expect(propose).toBeEnabled();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("ignores a late generated set after a selected lecture page changes", async () => {
        let finishGeneration!: (value: MaterialPracticeBatch) => void;
        vi.mocked(generateMaterialQuestions).mockReturnValueOnce(new Promise((resolve) => {
            finishGeneration = resolve;
        }));
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        await retrieveEvidence(user);
        await user.click(screen.getByRole("button", { name: "Propose a task" }));
        await user.click(await screen.findByRole("button", { name: "Confirm task" }));
        await user.click(screen.getByRole("button", { name: "Generate five MCQs" }));
        await user.click(within(screen.getByRole("group", { name: "lecture.pdf pages" })).getByRole("checkbox", { name: "Page 1" }));
        await act(async () => finishGeneration(practiceBatch(0)));

        expect(screen.queryByRole("region", { name: "Generated questions" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Generate five MCQs" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Propose a task" })).toBeDisabled();
    });

    it("uses a suggested topic and current collection only without a past paper", async () => {
        const user = userEvent.setup();
        vi.mocked(suggestMaterialTopics).mockResolvedValueOnce({ topics: ["Chain rule"] });
        vi.mocked(retrieveMaterialEvidence).mockImplementationOnce(async ({ pages }) => ({
            topics: [],
            evidence: [{ ...pages[2], score: 0.9 }],
        }));
        vi.mocked(extractMaterialPages).mockImplementation(async (file) =>
            file.size === 1 ? { pages: ["Derivative basics", "Power rule"] } : { pages: ["Chain rule example"] },
        );
        render(<MaterialsAuthoring />);
        await user.type(screen.getByLabelText("Module name (optional)"), "MA1521");
        await user.upload(screen.getByLabelText("Lecture PDFs"), [
            new File(["A"], "notes.pdf", { type: "application/pdf" }),
            new File(["BB"], "notes.pdf", { type: "application/pdf" }),
        ]);
        await user.click(screen.getByRole("button", { name: "Suggest topics" }));
        await user.click(await screen.findByRole("button", { name: "Chain rule" }));
        expect(screen.getByLabelText("Topic")).toHaveValue("Chain rule");

        await user.selectOptions(screen.getByLabelText("Evidence retrieval"), "semantic");
        await retrieveEvidence(user);
        const [request] = vi.mocked(retrieveMaterialEvidence).mock.calls[0];
        expect(request).toMatchObject({ topic: "Chain rule", strategy: "semantic", selected: [], limit: 3 });
        expect(request.pages.map(({ text }) => text)).toEqual(["Derivative basics", "Power rule", "Chain rule example"]);
        expect(new Set(request.pages.map(({ document }) => document)).size).toBe(2);
        expect(screen.getByLabelText("notes.pdf, page 1 excerpt")).toHaveValue("Chain rule example");
        await user.click(screen.getByRole("button", { name: "Propose a task" }));
        await user.click(await screen.findByRole("button", { name: "Confirm task" }));
        await user.click(screen.getByRole("button", { name: "Generate five MCQs" }));
        const result = await screen.findByRole("region", { name: "Generated questions" });
        expect(within(result).getByRole("link", { name: "notes.pdf, page 1" })).toBeVisible();
        expect(generateMaterialQuestions).toHaveBeenLastCalledWith(expect.objectContaining({
            lecture: "Chain rule example", exam: "", topic: "Chain rule",
            sources: [{ document: "2: notes.pdf", page: 1, role: "lecture", edited: false }],
        }));

        await user.click(screen.getByRole("button", { name: "New collection" }));
        expect(screen.getByLabelText("Topic")).toHaveValue("");
        expect(screen.getByLabelText("Module name (optional)")).toHaveValue("");
        expect(screen.queryByRole("region", { name: "Generated questions" })).not.toBeInTheDocument();
        expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
        expect(screen.getByRole("button", { name: "Suggest topics" })).toBeDisabled();
    });

    it("keeps lecture retrieval pending while editing the optional exam excerpt", async () => {
        let finishRetrieval!: (value: Awaited<ReturnType<typeof retrieveMaterialEvidence>>) => void;
        vi.mocked(retrieveMaterialEvidence).mockReturnValueOnce(new Promise((resolve) => {
            finishRetrieval = resolve;
        }));
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        await user.click(screen.getByRole("button", { name: "Retrieve evidence" }));
        fireEvent.change(screen.getByLabelText("Question or subpart"), { target: { value: "Trace the list." } });
        const [request] = vi.mocked(retrieveMaterialEvidence).mock.calls[0];
        await act(async () => finishRetrieval({ topics: [], evidence: [{ ...request.pages[1], score: null }] }));

        expect(screen.getByLabelText("lecture.pdf, page 2 excerpt")).toHaveValue("Worked list example");
        await user.click(screen.getByRole("button", { name: "Propose a task" }));
        expect(proposeMaterialMatch).toHaveBeenLastCalledWith(expect.objectContaining({
            lecture: "Worked list example", exam: "Trace the list.", topic: "Lists",
        }));
    });

    it("keeps explicit page selection across distinct PDFs and discards stale retrieval results", async () => {
        let finishRetrieval!: (value: Awaited<ReturnType<typeof retrieveMaterialEvidence>>) => void;
        vi.mocked(retrieveMaterialEvidence).mockReturnValueOnce(new Promise((resolve) => {
            finishRetrieval = resolve;
        }));
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        const input = screen.getByLabelText("Lecture PDFs");
        await user.upload(input, new File(["lecture"], "lecture.pdf", { type: "application/pdf" }));
        await user.upload(input, new File(["lecture2"], "lecture2.pdf", { type: "application/pdf" }));
        await user.type(screen.getByLabelText("Topic"), "Iteration");
        for (const name of ["lecture.pdf pages", "lecture2.pdf pages"]) {
            const pages = within(screen.getByRole("group", { name }));
            await user.click(await pages.findByRole("checkbox", { name: "Page 1" }));
        }
        await user.click(screen.getByRole("button", { name: "Retrieve evidence" }));
        const [request] = vi.mocked(retrieveMaterialEvidence).mock.calls[0];
        expect(request).toMatchObject({ topic: "Iteration", strategy: "selected" });
        expect(request.selected).toEqual([
            { document: request.pages[0].document, page: 1 },
            { document: request.pages[2].document, page: 1 },
        ]);
        await user.selectOptions(screen.getByLabelText("Evidence retrieval"), "keyword");
        await act(async () => finishRetrieval({
            topics: [],
            evidence: [{ ...request.pages[0], score: null }],
        }));

        expect(screen.queryByRole("group", { name: "Lecture evidence" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Propose a task" })).toBeDisabled();
    });
});
