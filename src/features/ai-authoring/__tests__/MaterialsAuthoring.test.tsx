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

async function selectSources(user: ReturnType<typeof userEvent.setup>) {
    await user.upload(screen.getByLabelText("Lecture PDF"), new File(["lecture"], "lecture.pdf", { type: "application/pdf" }));
    await user.upload(screen.getByLabelText("Past-paper PDF"), new File(["exam"], "exam.pdf", { type: "application/pdf" }));
    await user.click(await within(screen.getByRole("group", { name: "Lecture pages" })).findByRole("checkbox", { name: "Page 2" }));
    await user.click(await within(screen.getByRole("group", { name: "Past-paper pages" })).findByRole("checkbox", { name: "Page 1" }));
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
        vi.mocked(proposeMaterialMatch).mockResolvedValue(match);
        vi.mocked(generateMaterialQuestions).mockImplementation(async ({ seed }) => ({ questions, seed, generator_version: 2 }));
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
        await user.click(screen.getByRole("button", { name: "From CS1010E materials" }));
        expect(screen.getByRole("heading", { name: "Generate from CS1010E materials" })).toBeVisible();
        expect(screen.getByText("Loading question settings…")).not.toBeVisible();
    });

    it("proposes from exact excerpts, generates after confirmation, and replays with visible sources", async () => {
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        await user.click(screen.getByText("View original Lecture PDF"));
        expect(screen.getByTitle("Lecture PDF, page 2")).toHaveAttribute("src", "blob:lecture.pdf#page=2");
        const extractedPage = screen.getByLabelText("Extracted past-paper page 1");
        expect(extractedPage).toBeInstanceOf(HTMLTextAreaElement);
        (extractedPage as HTMLTextAreaElement).setSelectionRange(0, "Given xs = [3].".length);
        await user.click(screen.getByRole("button", { name: "Add selection to shared stem" }));
        expect(screen.getByLabelText("Shared stem (optional)")).toHaveValue("Given xs = [3].");
        fireEvent.change(screen.getByLabelText("Lecture page 2 excerpt"), { target: { value: "Edited list example" } });

        await user.click(screen.getByRole("button", { name: "Propose a match" }));
        expect(await screen.findByText("Trace list changes")).toBeInTheDocument();
        expect(proposeMaterialMatch).toHaveBeenCalledWith({
            lecture: "Edited list example",
            exam: "Given xs = [3].\n\n(b) Trace the list after append.",
        });
        expect(screen.queryByRole("button", { name: "Generate five MCQs" })).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Confirm match" }));
        fireEvent.change(screen.getByLabelText("Replay seed"), { target: { value: "23" } });
        await user.click(screen.getByRole("button", { name: "Generate five MCQs" }));
        expect(await screen.findByText("Trace variant 5.")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "lecture.pdf, page 2" })).toHaveAttribute("href", "blob:lecture.pdf#page=2");
        expect(screen.getByRole("link", { name: "exam.pdf, page 1" })).toHaveAttribute("href", "blob:exam.pdf#page=1");
        expect(screen.getByText("Q2(b)")).toBeInTheDocument();
        expect(screen.getByText("Seed 23")).toBeInTheDocument();
        expect(screen.queryByText("Appending adds an item at the end.")).not.toBeInTheDocument();
        await user.click(screen.getAllByRole("button", { name: "Reveal answer" })[0]);
        expect(screen.getByText("Appending adds an item at the end.")).toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "Replay set" }));
        expect(await screen.findByText("Trace variant 5.")).toBeInTheDocument();
        expect(generateMaterialQuestions).toHaveBeenCalledTimes(2);
        expect(generateMaterialQuestions).toHaveBeenLastCalledWith({
            lecture: "Edited list example",
            exam: "Given xs = [3].\n\n(b) Trace the list after append.",
            family: "list_trace",
            seed: 23,
        });
    });

    it("shows the explanation for a mismatch and prevents confirmation", async () => {
        vi.mocked(proposeMaterialMatch).mockResolvedValueOnce({ family: null, task: "", reason: "The selected question assesses recursion." });
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);

        await user.click(screen.getByRole("button", { name: "Propose a match" }));

        expect(await screen.findByText("The selected question assesses recursion.")).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Confirm match" })).not.toBeInTheDocument();
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
        vi.mocked(generateMaterialQuestions).mockResolvedValueOnce({ questions, seed: 0, generator_version: 2 });
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        await user.click(screen.getByRole("button", { name: "Propose a match" }));

        expect(await screen.findByRole("radio", { name: "Trace recursive maximum" })).toBeChecked();
        await user.click(screen.getByRole("button", { name: "Confirm match" }));
        await user.click(screen.getByRole("radio", { name: "Trace recursive sum of squares" }));
        expect(screen.queryByRole("button", { name: "Generate five MCQs" })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Confirm match" }));
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

        await user.click(screen.getByRole("button", { name: "Propose a match" }));
        fireEvent.change(screen.getByLabelText("Question or subpart"), { target: { value: "(a) Define a list." } });
        await act(async () => finishProposal(match));

        expect(screen.queryByText("Trace list changes")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Confirm match" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Propose a match" })).toBeEnabled();
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
        fireEvent.change(screen.getByLabelText("Question or subpart"), { target: { value: "" } });
        const sharedPage = screen.getByLabelText<HTMLTextAreaElement>("Extracted past-paper page 1");
        sharedPage.setSelectionRange(0, sharedPage.value.length);
        await user.click(screen.getByRole("button", { name: "Add selection to shared stem" }));

        await user.click(within(screen.getByRole("group", { name: "Past-paper pages" })).getByRole("checkbox", { name: "Page 2" }));
        const questionPage = screen.getByLabelText<HTMLTextAreaElement>("Extracted past-paper page 2");
        questionPage.setSelectionRange(0, questionPage.value.indexOf("\n"));
        await user.click(screen.getByRole("button", { name: "Add selection to question" }));

        await user.click(screen.getByRole("button", { name: "Propose a match" }));
        expect(proposeMaterialMatch).toHaveBeenLastCalledWith({
            lecture: "Loop trace lecture",
            exam: "Given a loop, trace count.\n\n(b) Show the final value.",
        });
    });

    it("clears unverified exam text when a source page is removed", async () => {
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        const sharedStem = screen.getByLabelText("Shared stem (optional)");
        const question = screen.getByLabelText("Question or subpart");
        fireEvent.change(sharedStem, { target: { value: "Given xs = [3]." } });
        const pages = within(screen.getByRole("group", { name: "Past-paper pages" }));

        await user.click(pages.getByRole("checkbox", { name: "Page 2" }));
        expect(sharedStem).toHaveValue("Given xs = [3].");
        expect(question).toHaveValue("(b) Trace the list after append.");
        await user.click(screen.getByRole("button", { name: "Propose a match" }));
        await user.click(await screen.findByRole("button", { name: "Confirm match" }));

        await user.click(pages.getByRole("checkbox", { name: "Page 1" }));

        expect(pages.getByRole("checkbox", { name: "Page 2" })).toBeChecked();
        expect(sharedStem).toHaveValue("");
        expect(question).toHaveValue("");
        expect(screen.getByRole("button", { name: "Propose a match" })).toBeDisabled();
        expect(screen.queryByRole("button", { name: "Generate five MCQs" })).not.toBeInTheDocument();
    });

    it("limits the combined exam selection independently of the lecture excerpt", async () => {
        const user = userEvent.setup();
        render(<MaterialsAuthoring />);
        await selectSources(user);
        fireEvent.change(screen.getByLabelText("Lecture page 2 excerpt"), { target: { value: "L".repeat(25_000) } });
        fireEvent.change(screen.getByLabelText("Shared stem (optional)"), { target: { value: "S".repeat(23_997) } });
        const question = screen.getByLabelText("Question or subpart");
        const propose = screen.getByRole("button", { name: "Propose a match" });

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
        await user.click(screen.getByRole("button", { name: "Propose a match" }));
        await user.click(await screen.findByRole("button", { name: "Confirm match" }));
        await user.click(screen.getByRole("button", { name: "Generate five MCQs" }));
        await user.click(within(screen.getByRole("group", { name: "Lecture pages" })).getByRole("checkbox", { name: "Page 1" }));
        await act(async () => finishGeneration({ questions, seed: 0, generator_version: 2 }));

        expect(screen.queryByRole("region", { name: "Generated questions" })).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Generate five MCQs" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Propose a match" })).toBeEnabled();
    });
});
