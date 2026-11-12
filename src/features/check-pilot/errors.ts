import { ApiError } from "@/api/axiosInstance";

const FALLBACK_VALIDATION_MESSAGE =
    "The request could not be checked. Review the form and try again.";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function safeDetail(detail: unknown): string | null {
    if (typeof detail === "string") {
        const trimmed = detail.trim();
        if (!trimmed) return null;
        // FastAPI validation details are normally arrays. If a string happens
        // to contain JSON, keep the raw structured value away from React.
        if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
            try {
                const parsed: unknown = JSON.parse(trimmed);
                if (typeof parsed === "object" && parsed !== null) return null;
            } catch {
                // A normal message that merely starts with a bracket.
            }
        }
        return trimmed;
    }
    if (Array.isArray(detail)) return null;
    if (isRecord(detail) && typeof detail.message === "string") {
        return detail.message.trim() || null;
    }
    return null;
}

export function getCheckPilotErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof ApiError) {
        if (error.status === 401) return "Please sign in to continue.";
        if (error.status === 404) {
            return "This private template or check was not found or is not yours.";
        }
        if (error.status === 409) {
            return "The template or check changed, or the approval is stale. Reload the latest version.";
        }
        if (error.status === 422) {
            return safeDetail(error.detail) ?? FALLBACK_VALIDATION_MESSAGE;
        }
        if (error.status === 429) {
            return "The check service is busy. Wait for the current request to finish and try again.";
        }
        if (error.status >= 500) {
            return "The check service could not complete the request. Try again.";
        }
        return safeDetail(error.detail) ?? fallback;
    }
    if (error instanceof Error) {
        return safeDetail(error.message) ?? fallback;
    }
    return fallback;
}
