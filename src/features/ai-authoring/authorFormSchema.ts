import { z } from "zod";
import { isInheritSource, parseModelSource } from "./modelSelection";

export function createAuthoringSchema(
    minDistractors: number,
    maxDistractors: number,
) {
    return z
        .object({
            prompt: z
                .string()
                .trim()
                .min(1, "Describe the question you want to create.")
                .max(4000, "Keep the request to 4000 characters or fewer."),
            domain: z.string().min(1, "Choose a question domain."),
            difficulty: z.enum(["easy", "medium", "hard"]),
            distractors: z
                .number()
                .int("Enter a whole number of wrong choices.")
                .min(
                    minDistractors,
                    `Enter at least ${minDistractors} wrong ${minDistractors === 1 ? "choice" : "choices"}.`,
                )
                .max(
                    maxDistractors,
                    `Enter at most ${maxDistractors} wrong choices.`,
                ),
            model_source: z.string().min(1, "Choose a question-writing model."),
            model: z.string(),
            difficulty_source: z.string(),
            difficulty_model: z.string(),
            relevance_source: z.string(),
            relevance_model: z.string(),
        })
        .superRefine((values, ctx) => {
            const source = parseModelSource(values.model_source);
            if (source?.kind === "connection" && !values.model.trim()) {
                ctx.addIssue({
                    code: "custom",
                    path: ["model"],
                    message: "Choose a model for this connection.",
                });
            }
            for (const [sourceKey, modelKey] of [
                ["difficulty_source", "difficulty_model"],
                ["relevance_source", "relevance_model"],
            ] as const) {
                const selected = parseModelSource(values[sourceKey]);
                if (selected?.kind === "connection" && !values[modelKey].trim()) {
                    ctx.addIssue({
                        code: "custom",
                        path: [modelKey],
                        message: "Choose a model for this connection.",
                    });
                }
                if (!isInheritSource(values[sourceKey]) && !selected) {
                    ctx.addIssue({
                        code: "custom",
                        path: [sourceKey],
                        message: "Choose a check model or use this field's default.",
                    });
                }
            }
        });
}

export type AuthoringFormValues = z.infer<ReturnType<typeof createAuthoringSchema>>;

export type AuthoringModelSourceField =
    | "model_source"
    | "difficulty_source"
    | "relevance_source";

export type AuthoringModelField =
    | "model"
    | "difficulty_model"
    | "relevance_model";
