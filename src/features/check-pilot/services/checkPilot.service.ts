import { axiosInstance } from "@/api/axiosInstance";
import type {
    CheckRecord,
    CreatePilotTemplateInput,
    PilotApprovalInput,
    PilotBatch,
    PilotGenerateInput,
    PilotTemplateRecord,
} from "../types";

const BASE = "/ai-authoring/check-pilot";
// Template authoring can run two bounded repair attempts plus qualification in
// a worker. The shared axios instance defaults to 30 seconds, which is shorter
// than the server-side bound.
const AUTHOR_TIMEOUT_MS = 180_000;
const GENERATE_TIMEOUT_MS = 60_000;

function segment(value: string): string {
    // Keep an identifier a single path segment even if a malformed record id
    // contains a slash or traversal sequence.
    return encodeURIComponent(value);
}

function jsonBody<T>(data: T) {
    return {
        headers: { "Content-Type": "application/json" },
        data,
    };
}

/** Drop absent optional fields so exactly one model source is sent. */
function createRequestBody(input: CreatePilotTemplateInput): CreatePilotTemplateInput {
    const body: CreatePilotTemplateInput = { prompt: input.prompt };
    if (input.model_profile !== undefined) body.model_profile = input.model_profile;
    if (input.connection_id !== undefined) body.connection_id = input.connection_id;
    if (input.model !== undefined) body.model = input.model;
    if (input.num_distractors !== undefined) body.num_distractors = input.num_distractors;
    return body;
}

export async function createPilotTemplate(
    input: CreatePilotTemplateInput,
): Promise<PilotTemplateRecord> {
    const response = await axiosInstance<PilotTemplateRecord>({
        url: `${BASE}/templates`,
        method: "POST",
        ...jsonBody(createRequestBody(input)),
        timeout: AUTHOR_TIMEOUT_MS,
    });
    return response.data;
}

export async function listPilotTemplates(): Promise<PilotTemplateRecord[]> {
    const response = await axiosInstance<PilotTemplateRecord[]>({
        url: `${BASE}/templates`,
        method: "GET",
    });
    return response.data;
}

export async function getPilotTemplate(templateId: string): Promise<PilotTemplateRecord> {
    const response = await axiosInstance<PilotTemplateRecord>({
        url: `${BASE}/templates/${segment(templateId)}`,
        method: "GET",
    });
    return response.data;
}

export async function listPilotChecks(): Promise<CheckRecord[]> {
    const response = await axiosInstance<CheckRecord[]>({
        url: `${BASE}/checks`,
        method: "GET",
    });
    return response.data;
}

export async function getPilotCheck(checkId: string): Promise<CheckRecord> {
    const response = await axiosInstance<CheckRecord>({
        url: `${BASE}/checks/${segment(checkId)}`,
        method: "GET",
    });
    return response.data;
}

export async function decidePilotTemplate(
    templateId: string,
    input: PilotApprovalInput,
): Promise<PilotTemplateRecord> {
    const response = await axiosInstance<PilotTemplateRecord>({
        url: `${BASE}/templates/${segment(templateId)}/approval`,
        method: "POST",
        ...jsonBody(input),
    });
    return response.data;
}

export async function generatePilotBatch(
    templateId: string,
    input: PilotGenerateInput,
): Promise<PilotBatch> {
    const response = await axiosInstance<PilotBatch>({
        url: `${BASE}/templates/${segment(templateId)}/generate`,
        method: "POST",
        ...jsonBody(input),
        timeout: GENERATE_TIMEOUT_MS,
    });
    return response.data;
}
