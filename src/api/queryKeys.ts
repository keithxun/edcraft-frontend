export const queryKeys = {
    // User queries
    users: {
        all: ["users"] as const,
        me: ["users", "me"] as const,
        detail: (id: string) => ["users", id] as const,
    },

    // Folder queries
    folders: {
        all: (ownerId: string) => ["folders", ownerId] as const,
        byFolder: (parentId: string) => ["folders", parentId] as const,
        root: (ownerId: string) => ["folders", ownerId, "root"] as const,
        detail: (id: string) => ["folder", id] as const,
        contents: (id: string) => ["folder", id, "contents"] as const,
        tree: (id: string) => ["folder", id, "tree"] as const,
        path: (id: string) => ["folder", id, "path"] as const,
    },

    // Assessment queries
    assessments: {
        all: (ownerId: string) => ["assessments", ownerId] as const,
        byFolder: (ownerId: string, folderId: string) =>
            ["assessments", ownerId, folderId] as const,
        detail: (id: string) => ["assessments", "detail", id] as const,
        allDetails: () => ["assessments", "detail"] as const,
    },

    // Question queries
    questions: {
        all: (ownerId: string) => ["questions", ownerId] as const,
        detail: (id: string) => ["questions", "detail", id] as const,
    },

    // Question bank queries
    questionBanks: {
        all: (ownerId: string) => ["question-banks", ownerId] as const,
        byFolder: (ownerId: string, folderId: string) =>
            ["question-banks", ownerId, folderId] as const,
        detail: (id: string) => ["question-banks", "detail", id] as const,
        allDetails: () => ["question-banks", "detail"] as const,
    },

    // Assessment template queries
    assessmentTemplates: {
        all: (ownerId: string) => ["assessment-templates", ownerId] as const,
        byFolder: (ownerId: string, folderId: string) =>
            ["assessment-templates", ownerId, folderId] as const,
        detail: (id: string) => ["assessment-templates", "detail", id] as const,
    },

    // Question template queries
    questionTemplates: {
        all: (ownerId: string) => ["question-templates", ownerId] as const,
        detail: (id: string) => ["question-templates", "detail", id] as const,
    },

    // Question template bank queries
    questionTemplateBanks: {
        all: (ownerId: string) => ["question-template-banks", ownerId] as const,
        byFolder: (ownerId: string, folderId: string) =>
            ["question-template-banks", ownerId, folderId] as const,
        detail: (id: string) => ["question-template-banks", "detail", id] as const,
        allDetails: () => ["question-template-banks", "detail"] as const,
    },

    // Collaborator queries
    collaborators: {
        byResource: (resourcePath: string, resourceId: string) =>
            ["collaborators", resourcePath, resourceId] as const,
    },

    // Shared resources queries
    sharedResources: {
        byResourcePath: (resourcePath: string) => ["shared-resources", resourcePath] as const,
    },

    // Canvas queries
    canvas: {
        courses: () => ["canvas", "courses"] as const,
        quizzes: (courseId: number) => ["canvas", "quizzes", courseId] as const,
    },

    // AI authoring queries
    aiAuthoring: {
        capabilities: () => ["ai-authoring", "capabilities"] as const,
        jobs: () => ["ai-authoring", "jobs"] as const,
        job: (id: string) => ["ai-authoring", "job", id] as const,
        review: (id: string) => ["ai-authoring", "job", id, "review"] as const,
        previewRoot: (id: string) => ["ai-authoring", "job", id, "preview"] as const,
        preview: (id: string, artifactSha256: string, seed: number) =>
            ["ai-authoring", "job", id, "preview", artifactSha256, seed] as const,
    },

    // Private reusable-check pilot queries. Owner IDs are appended by the
    // hooks so cached artifacts can never cross accounts.
    checkPilot: {
        templates: () => ["check-pilot", "templates"] as const,
        template: (id: string) => ["check-pilot", "templates", id] as const,
        checks: () => ["check-pilot", "checks"] as const,
        check: (id: string) => ["check-pilot", "checks", id] as const,
    },

    // User-owned model provider connections
    providerConnections: {
        all: () => ["provider-connections"] as const,
    },
};
