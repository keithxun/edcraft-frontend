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
// Older backends expose no combined check-pilot bound; their default was 185 s.
const DEFAULT_CHECK_PILOT_SERVER_TIMEOUT_SECONDS = 185;
// Leave the browser waiting after the server's own deadline so its 504 wins.
export const CHECK_PILOT_TRANSPORT_MARGIN_MS = 15_000;
const GENERATE_TIMEOUT_MS = 60_000;

export function checkPilotTimeoutMs(serverTimeoutSeconds?: number | null): number {
    const seconds =
        typeof serverTimeoutSeconds === "number" &&
        Number.isFinite(serverTimeoutSeconds) &&
        serverTimeoutSeconds > 0
            ? serverTimeoutSeconds
            : DEFAULT_CHECK_PILOT_SERVER_TIMEOUT_SECONDS;
    return Math.ceil(seconds * 1000) + CHECK_PILOT_TRANSPORT_MARGIN_MS;
}

export interface CheckPilotRequestOptions {
    /** Client wait in milliseconds; defaults to the server bound plus margin. */
    timeoutMs?: number;
}

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

/**
 * A rejection can target a draft with no qualified check. Omit the check digest
 * entirely rather than sending null or an empty string, which the wire contract
 * would reject as a malformed digest.
 */
function approvalRequestBody(input: PilotApprovalInput): PilotApprovalInput {
    const body: PilotApprovalInput = {
        template_sha256: input.template_sha256,
        decision: input.decision,
    };
    const checkSha = input.check_sha256?.trim();
    if (checkSha) body.check_sha256 = checkSha;
    return body;
}

export async function createPilotTemplate(
    input: CreatePilotTemplateInput,
    options: CheckPilotRequestOptions = {},
): Promise<PilotTemplateRecord> {
    const response = await axiosInstance<PilotTemplateRecord>({
        url: `${BASE}/templates`,
        method: "POST",
        ...jsonBody(createRequestBody(input)),
        timeout: options.timeoutMs ?? checkPilotTimeoutMs(),
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
        ...jsonBody(approvalRequestBody(input)),
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
