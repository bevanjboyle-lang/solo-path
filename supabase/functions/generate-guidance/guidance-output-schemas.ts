// generate-guidance/guidance-output-schemas.ts
//
// Per-module strict json_schema definitions for OpenAI response_format enforcement.
// Each schema is built dynamically from the module's output_structure field in the
// canonical guidance_modules.json (via modules-library-rich.ts).
//
// Why dynamic build: there are 25 modules, each with a different output shape.
// Hardcoding 25 schema constants would duplicate the canonical data. Building from
// the rich module library at runtime keeps a single source of truth.
//
// OpenAI strict-mode constraints (per ADR-019 / report-schema.ts pattern):
//   - additionalProperties: false on every object
//   - Every property must appear in `required`
//   - Optional fields use nullable union type instead of being optional

import type { RichModule } from "../_shared/modules-library-rich.ts";

export interface GuidanceOutputSchema {
  name: string;
  strict: true;
  schema: {
    type: "object";
    additionalProperties: false;
    required: string[];
    properties: Record<string, { type: string | string[]; description?: string }>;
  };
}

/**
 * Build a strict json_schema for a module's output based on its output_structure field.
 *
 * Every key in output_structure becomes a required string field. The optional
 * artefact_summary field (added in v26 Phase 2 for frontend rendering hints) is
 * always included as a nullable string.
 */
export function buildModuleOutputSchema(module: RichModule): GuidanceOutputSchema {
  const outputStructure = module.output_structure || {};
  const requiredKeys = Object.keys(outputStructure);

  const properties: Record<string, { type: string | string[]; description?: string }> = {};

  // Each canonical output_structure key becomes a required string field.
  // The output_structure entry value is treated as the description (model sees it
  // via the schema and via the module definition in the user message).
  for (const key of requiredKeys) {
    properties[key] = {
      type: "string",
      description: outputStructure[key],
    };
  }

  // v26 Phase 2 addition: artefact_summary as nullable string. Set when the model
  // wants the frontend to render the output as a rich artefact card.
  properties.artefact_summary = {
    type: ["string", "null"],
    description: "Optional one-paragraph summary suitable for the frontend artefact card heading. Null if the structured output is sufficient on its own.",
  };

  return {
    name: `guidance_module_${module.id}_output`,
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [...requiredKeys, "artefact_summary"],
      properties,
    },
  };
}
