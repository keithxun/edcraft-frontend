import type { UseFormReturn } from "react-hook-form";
import type { ProviderConnection } from "@/features/model-connections/types";
import type {
    AuthoringFormValues,
    AuthoringModelField,
    AuthoringModelSourceField,
} from "../authorFormSchema";
import type { AuthoringModelProfile } from "../types";
import { ModelPicker } from "./ModelPicker";

interface ModelPickerFieldProps {
    form: UseFormReturn<AuthoringFormValues>;
    connections: ProviderConnection[];
    profiles: AuthoringModelProfile[];
    sourceField: AuthoringModelSourceField;
    modelField: AuthoringModelField;
    /** Called after the user picks a source or model, to clear a stale "missing" warning. */
    onMissingCleared: () => void;
    disabled?: boolean;
    idPrefix?: string;
    label?: string;
    allowInherit?: boolean;
    inheritLabel?: string;
}

/**
 * Wires one ModelPicker to a source/model pair on the authoring form.
 * The three pickers on the form (question, difficulty check, relevance check)
 * differ only in their field names and labels.
 */
export function ModelPickerField({
    form,
    connections,
    profiles,
    sourceField,
    modelField,
    onMissingCleared,
    disabled = false,
    idPrefix,
    label,
    allowInherit,
    inheritLabel,
}: ModelPickerFieldProps) {
    return (
        <ModelPicker
            connections={connections}
            profiles={profiles}
            source={form.watch(sourceField)}
            model={form.watch(modelField)}
            onSourceChange={(nextSource, nextModel) => {
                form.setValue(sourceField, nextSource, {
                    shouldValidate: true,
                });
                form.setValue(modelField, nextModel, {
                    shouldValidate: true,
                });
                onMissingCleared();
            }}
            onModelChange={(nextModel) => {
                form.setValue(modelField, nextModel, {
                    shouldValidate: true,
                });
                onMissingCleared();
            }}
            sourceError={form.formState.errors[sourceField]?.message}
            modelError={form.formState.errors[modelField]?.message}
            disabled={disabled}
            idPrefix={idPrefix}
            label={label}
            allowInherit={allowInherit}
            inheritLabel={inheritLabel}
        />
    );
}
