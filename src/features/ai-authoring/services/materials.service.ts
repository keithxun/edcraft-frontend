import { api } from "@/api/client";
import type { MaterialExcerpts, MaterialPracticeRequest } from "@/api/models";

export async function extractMaterialPages(file: File) {
    const response = await api.uploadPdfPagesAiAuthoringMaterialsPagesPost({ file });
    return response.data;
}

export async function proposeMaterialMatch(excerpts: MaterialExcerpts) {
    const response = await api.proposeMaterialTaskAiAuthoringMaterialsProposePost(excerpts);
    return response.data;
}

export async function generateMaterialQuestions(request: MaterialPracticeRequest) {
    const response = await api.generateMaterialPracticeAiAuthoringMaterialsGeneratePost(request);
    return response.data;
}
