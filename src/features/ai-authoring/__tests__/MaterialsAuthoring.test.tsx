import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApiError } from "@/api/axiosInstance";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MaterialsAuthoring } from "../components/MaterialsAuthoring";
import AiAuthoringPage from "../pages/AiAuthoringPage";
import {
    createAuthoringJob,
    getAuthoringCapabilities,
    listAuthoringJobs,
} from "../services/ai-authoring.service";
import {
    extractMaterialPages,
    retrieveMaterialEvidence,
    suggestMaterialTopics,
} from "../services/materials.service";
import { capabilities } from "./fixtures";

vi.mock("../services/materials.service");
vi.mock("../services/ai-authoring.service", () => ({
    getAuthoringCapabilities: vi.fn(),
    listAuthoringJobs: vi.fn(),
    createAuthoringJob: vi.fn(),
}));

const onContinue = vi.fn();

async function retrieveEvidence(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole("button", { name: "Retrieve evidence" }));
    await screen.findByRole("group", { name: "Lecture evidence" });
}

async function selectSources(user: ReturnType<typeof userEvent.setup>, lecture = "lecture.pdf", exam = "exam.pdf") {
    await user.upload(screen.getByLabelText("Lecture PDFs"), new File(["lecture"], lecture, { type: "application/pdf" }));
    await user.upload(screen.getByLabelText("Past-paper PDF"), new File(["exam"], exam, { type: "application/pdf" }));
    await user.click(await within(screen.getByRole("group", { name: `${lecture} pages` })).findByRole("checkbox", { name: "Page 2" }));
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
        vi.mocked(getAuthoringCapabilities).mockImplementation(() => new Promise(() => {}));
        vi.mocked(listAuthoringJobs).mockResolvedValue([]);
        vi.mocked(suggestMaterialTopics).mockResolvedValue({ topics: ["Lists"] });
        vi.mocked(retrieveMaterialEvidence).mockImplementation(async ({ pages, selected }) => ({
            topics: [],
            evidence: (selected ?? []).map((reference) => ({
                ...reference,
                text: pages.find(({ document, page }) => document === reference.document && page === reference.page)?.text ?? "",
                score: null,
            })),
        }));
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

    it("submits reviewed sources and question settings through the ordinary job flow", async () => {
        vi.mocked(getAuthoringCapabilities).mockResolvedValue(capabilities);
        vi.mocked(extractMaterialPages)
            .mockResolvedValueOnce({ pages: ["Lecture introduction", "Worked list example"] })
            .mockResolvedValueOnce({ pages: ["Given xs = [3].\n(b) Trace the list after append."] });
        vi.mocked(createAuthoringJob).mockResolvedValue({
            job_id: "uploaded-job",
            status_url: "/ai-authoring/uploaded-job",
        });
        const user = userEvent.setup();
        render(
            <QueryClientProvider client={new QueryClient()}>
                <MemoryRouter initialEntries={["/ai-authoring"]}>
                    <Routes>
                        <Route path="/ai-authoring" element={<AiAuthoringPage />} />
                        <Route path="/ai-authoring/uploaded-job" element={<h1>Job review</h1>} />
                    </Routes>
                </MemoryRouter>
            </QueryClientProvider>,
        );

        await screen.findByLabelText("Prompt");
        await user.click(screen.getByRole("button", { name: "From module materials" }));
        await user.selectOptions(screen.getByLabelText("Subject"), "code");
        await selectSources(user, "module.pdf", "module.pdf");
        await retrieveEvidence(user);
        fireEvent.change(screen.getByLabelText("module.pdf, page 2 excerpt"), {
            target: { value: "Reviewed list example" },
        });
        await user.click(screen.getByRole("button", { name: "Continue to question settings" }));
        expect(screen.getByRole("button", { name: "From module materials" }))
            .toHaveAttribute("aria-pressed", "true");
        const excerpts = screen.getByText("Source excerpts");
        await user.click(excerpts);
        expect(within(excerpts.parentElement!).getByText("Reviewed list example")).toBeVisible();
        expect(screen.getByText("Lecture · module.pdf · Page 2")).toBeVisible();
        expect(screen.getByText("Past paper · module.pdf · Page 1")).toBeVisible();
        await user.click(screen.getByRole("radio", { name: "Hard" }));
        await user.click(screen.getByRole("button", { name: "Create question" }));

        expect(await screen.findByRole("heading", { name: "Job review" })).toBeVisible();
        expect(createAuthoringJob).toHaveBeenCalledWith(expect.objectContaining({
            domain: "code",
            prompt: expect.stringContaining("Q2(b)"),
            difficulty: "hard",
            materials: {
                lecture: [{ document: "module.pdf", pages: [2], text: "Reviewed list example", edited: true }],
                exam: { document: "module.pdf", pages: [1], text: "(b) Trace the list after append.", edited: true },
            },
        }));
    });

    it("rejects an overlong source name before extraction and shows the backend page limit", async () => {
        const user = userEvent.setup();
        render(<MaterialsAuthoring domains={["code"]} onContinue={onContinue} />);
        const lectures = screen.getByLabelText("Lecture PDFs");
        await user.upload(lectures, new File(["lecture"], "a".repeat(297) + ".pdf", { type: "application/pdf" }));
        expect(screen.getByRole("alert")).toHaveTextContent("filename up to 300 characters");
        expect(extractMaterialPages).not.toHaveBeenCalled();

        vi.mocked(extractMaterialPages).mockRejectedValueOnce(
            new ApiError(413, "Upload a PDF with at most 300 pages."),
        );
        await user.upload(lectures, new File(["lecture"], "long.pdf", { type: "application/pdf" }));
        expect(await screen.findByText("Upload a PDF with at most 300 pages.")).toBeVisible();
        expect(screen.getByRole("button", { name: "Retrieve evidence" })).toBeDisabled();
    });

    it("hands the exact edited lecture, selected exam question, and chosen subject to authoring", async () => {
        const user = userEvent.setup();
        render(<MaterialsAuthoring domains={["code", "physics"]} onContinue={onContinue} />);
        await selectSources(user);
        await retrieveEvidence(user);
        const next = screen.getByRole("button", { name: "Continue to question settings" });
        expect(next).toBeDisabled();
        await user.selectOptions(screen.getByLabelText("Subject"), "code");
        fireEvent.change(screen.getByLabelText("lecture.pdf, page 2 excerpt"), { target: { value: "Edited evidence." } });
        await user.click(next);
        expect(onContinue).toHaveBeenCalledWith({
            domain: "code", prompt: expect.stringContaining("Q2(b)"),
            materials: {
                lecture: [{ document: "lecture.pdf", pages: [2], text: "Edited evidence.", edited: true }],
                exam: { document: "exam.pdf", pages: [1], text: "(b) Trace the list after append.", edited: true },
            },
        });
    });

    it("accepts a shared stem and an exact subpart from different PDF pages", async () => {
        vi.mocked(extractMaterialPages).mockResolvedValueOnce({ pages: ["Overview", "Loop trace lecture"] });
        vi.mocked(extractMaterialPages).mockResolvedValueOnce({ pages: [
            "Given a loop, trace count.",
            "(b) Show the final value.\n(c) Explain the output.",
        ] });
        const user = userEvent.setup();
        render(<MaterialsAuthoring domains={["code"]} onContinue={onContinue} />);
        await user.selectOptions(screen.getByLabelText("Subject"), "code");
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

        await user.click(screen.getByRole("button", { name: "Continue to question settings" }));
        expect(onContinue).toHaveBeenLastCalledWith(expect.objectContaining({
            materials: expect.objectContaining({
                exam: { document: "exam.pdf", pages: [1, 2], text: "Given a loop, trace count.\n\n(b) Show the final value.", edited: false },
            }),
        }));
    });

    it("clears unverified exam text when a source page is removed", async () => {
        const user = userEvent.setup();
        render(<MaterialsAuthoring domains={["code"]} onContinue={onContinue} />);
        await user.selectOptions(screen.getByLabelText("Subject"), "code");
        await selectSources(user);
        await retrieveEvidence(user);
        const sharedStem = screen.getByLabelText("Shared stem (optional)");
        const question = screen.getByLabelText("Question or subpart");
        fireEvent.change(sharedStem, { target: { value: "Given xs = [3]." } });
        const pages = within(screen.getByRole("group", { name: "Past-paper pages" }));

        await user.click(pages.getByRole("checkbox", { name: "Page 2" }));
        expect(sharedStem).toHaveValue("Given xs = [3].");
        expect(question).toHaveValue("(b) Trace the list after append.");
        await user.click(screen.getByRole("button", { name: "Continue to question settings" }));

        await user.click(pages.getByRole("checkbox", { name: "Page 1" }));

        expect(pages.getByRole("checkbox", { name: "Page 2" })).toBeChecked();
        expect(sharedStem).toHaveValue("");
        expect(question).toHaveValue("");
        expect(screen.getByRole("button", { name: "Continue to question settings" })).toBeEnabled();
        expect(screen.queryByRole("button", { name: "Generate five MCQs" })).not.toBeInTheDocument();
    });

    it("limits the combined exam selection independently of the lecture excerpt", async () => {
        const user = userEvent.setup();
        render(<MaterialsAuthoring domains={["code"]} onContinue={onContinue} />);
        await user.selectOptions(screen.getByLabelText("Subject"), "code");
        await selectSources(user);
        await retrieveEvidence(user);
        fireEvent.change(screen.getByLabelText("lecture.pdf, page 2 excerpt"), { target: { value: "L".repeat(25_000) } });
        fireEvent.change(screen.getByLabelText("Shared stem (optional)"), { target: { value: "S".repeat(23_997) } });
        const question = screen.getByLabelText("Question or subpart");
        const propose = screen.getByRole("button", { name: "Continue to question settings" });

        fireEvent.change(question, { target: { value: "QQ" } });
        expect(propose).toBeDisabled();
        expect(screen.getByRole("alert")).toHaveTextContent("24,000 characters");
        fireEvent.change(question, { target: { value: "Q" } });
        expect(propose).toBeEnabled();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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
        render(<MaterialsAuthoring domains={["code"]} onContinue={onContinue} />);
        await user.selectOptions(screen.getByLabelText("Subject"), "code");
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
        expect(screen.getByRole("region", { name: "notes.pdf source" })).toBeVisible();
        expect(screen.getByRole("region", { name: "notes.pdf (upload 2) source" })).toBeVisible();
        expect(screen.getByLabelText("notes.pdf (upload 2), page 1 excerpt")).toHaveValue("Chain rule example");
        await user.click(screen.getByRole("button", { name: "Continue to question settings" }));
        expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({
            materials: { lecture: [{ document: "notes.pdf (upload 2)", pages: [1], text: "Chain rule example", edited: false }], exam: null },
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
        render(<MaterialsAuthoring domains={["code"]} onContinue={onContinue} />);
        await user.selectOptions(screen.getByLabelText("Subject"), "code");
        await selectSources(user);
        await user.click(screen.getByRole("button", { name: "Retrieve evidence" }));
        fireEvent.change(screen.getByLabelText("Question or subpart"), { target: { value: "Trace the list." } });
        const [request] = vi.mocked(retrieveMaterialEvidence).mock.calls[0];
        await act(async () => finishRetrieval({ topics: [], evidence: [{ ...request.pages[1], score: null }] }));

        expect(screen.getByLabelText("lecture.pdf, page 2 excerpt")).toHaveValue("Worked list example");
        await user.click(screen.getByRole("button", { name: "Continue to question settings" }));
        expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({
            materials: expect.objectContaining({ exam: expect.objectContaining({ text: "Trace the list." }) }),
        }));
    });

    it("keeps explicit page selection across distinct PDFs and discards stale retrieval results", async () => {
        let finishRetrieval!: (value: Awaited<ReturnType<typeof retrieveMaterialEvidence>>) => void;
        vi.mocked(retrieveMaterialEvidence).mockReturnValueOnce(new Promise((resolve) => {
            finishRetrieval = resolve;
        }));
        const user = userEvent.setup();
        render(<MaterialsAuthoring domains={["code"]} onContinue={onContinue} />);
        await user.selectOptions(screen.getByLabelText("Subject"), "code");
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
        expect(screen.getByRole("button", { name: "Continue to question settings" })).toBeDisabled();
    });
});
