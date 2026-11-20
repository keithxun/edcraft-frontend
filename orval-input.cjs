// Pydantic exposes JsonValue as an empty OpenAPI schema. Spell out its JSON
// alternatives so Orval preserves nulls and recursively typed graph data.
module.exports = function prepareSchema(document) {
  const schemas = document.components?.schemas;
  if (schemas?.JsonValue && Object.keys(schemas.JsonValue).length === 0) {
    const value = { $ref: '#/components/schemas/JsonValue' };
    schemas.JsonValue = {
      anyOf: [
        { type: 'string' }, { type: 'number' }, { type: 'boolean' }, { type: 'null' },
        { type: 'array', items: value },
        { type: 'object', additionalProperties: value },
      ],
    };
  }

  // Orval names this anonymous enum "undefinedItem" unless it has a component.
  const evidence = schemas?.ReviewCasePreview?.properties?.key_evidence?.anyOf
    ?.find((variant) => variant.type === 'array');
  if (evidence?.items?.enum) {
    schemas.ReviewKeyEvidence = evidence.items;
    evidence.items = { $ref: '#/components/schemas/ReviewKeyEvidence' };
  }
  return document;
};
