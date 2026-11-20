import { api } from "@/api/client";
import type { MaterialExcerpts, MaterialPage, MaterialPracticeRequest, MaterialRetrievalRequest } from "@/api/models";

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

export async function suggestMaterialTopics(pages: MaterialPage[]) {
    const response = await api.listMaterialTopicsAiAuthoringMaterialsTopicsPost({ pages });
    return response.data;
}

export async function retrieveMaterialEvidence(request: MaterialRetrievalRequest) {
    const response = await api.retrieveMaterialEvidenceAiAuthoringMaterialsRetrievePost(request);
    return response.data;
}
