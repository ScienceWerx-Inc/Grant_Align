/**
 * Tolerant structured output for smaller models.
 *
 * The prompts ask for prose in some fields and short tag lists in others.
 * Larger models respect that; smaller ones routinely answer a "who do you
 * serve" field with a nested object of sub-answers, or a tag list with an array
 * of `{name, description}` objects, or a dollar amount as "$50,000". All are
 * reasonable readings of the instruction, and all fail a strict schema.
 *
 * Rejecting them costs the whole turn - an interview answer the user already
 * typed is lost and they are asked the same question twice - so instead the
 * schema handed to the model leaves these fields untyped, and the shapes are
 * normalized here after the call.
 *
 * Why not `z.preprocess`: Genkit validates the model's raw output against the
 * JSON Schema derived from the Zod type BEFORE parsing it, and preprocessing
 * does not affect that derived schema. A preprocessed string field still
 * publishes `"type": "string"` and still fails validation on an object, with
 * the preprocessor never running. Leaving the field untyped in the schema is
 * the only place this can be fixed.
 *
 * Nothing here invents content; it only reshapes what came back.
 */

import { z } from 'genkit';

export type FieldKind = 'prose' | 'tags' | 'count' | 'bool';

export interface FieldSpec {
  kind: FieldKind;
  description: string;
}

export type FieldSpecs = Record<string, FieldSpec>;

/** Flattens any model output into a single readable string. */
export function flatten(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);

  if (Array.isArray(value)) {
    return value.map(flatten).filter(Boolean).join('; ');
  }

  if (typeof value === 'object') {
    // `{ ages: "18-64", referral: "walk-in" }` reads better as
    // "ages: 18-64. referral: walk-in" than as raw JSON.
    return Object.entries(value as Record<string, unknown>)
      .map(([key, val]) => {
        const rendered = flatten(val);
        if (!rendered) return '';
        const label = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
        return `${label}: ${rendered}`;
      })
      .filter(Boolean)
      .join('. ');
  }

  return String(value);
}

export function toTags(value: unknown): string[] {
  if (value === null || value === undefined) return [];

  // Comma-splitting applies ONLY when the model returned a single string
  // instead of an array - that is the case it was written for. Splitting the
  // elements of a real array corrupts them instead: "Frederick County, MD"
  // becomes two separate geographies, and an exclusion of "grant requests
  // under $2,500" becomes "grant requests under $2" plus a stray "500".
  if (Array.isArray(value)) {
    return value
      .map(item => flatten(item).trim())
      .filter(Boolean)
      .slice(0, 25);
  }

  return flatten(value)
    .split(',')
    .map(text => text.trim())
    .filter(Boolean)
    .slice(0, 25);
}

/** Largest value the Int columns these feed can hold. */
const INT4_MAX = 2_147_483_647;

/** Parses "$50,000", "50000", "about 50k" and 50000 alike. */
export function toCount(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number') {
    return Number.isFinite(value) && Math.abs(value) <= INT4_MAX ? value : undefined;
  }

  // A model asked for a single amount often answers a range, sometimes as an
  // array. Stringifying [50000, 25000] gives "50000,25000", and stripping the
  // comma below would silently fuse it into 5000025000 - a number that then
  // fails to insert, taking the whole donor's criteria down with it. Take the
  // first element and let the range live in cycleNotes instead.
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = toCount(item);
      if (parsed !== undefined) return parsed;
    }
    return undefined;
  }

  const text = String(value).toLowerCase().replace(/[$,\s]/g, '');

  // Unanchored: models write "about 50k" and "up to 1.5m" as often as "50000",
  // and an anchored match reads the first of those as 50.
  const millions = /(\d+(?:\.\d+)?)m\b/.exec(text);
  if (millions) return Math.round(Number(millions[1]) * 1_000_000);
  const thousands = /(\d+(?:\.\d+)?)k\b/.exec(text);
  if (thousands) return Math.round(Number(thousands[1]) * 1000);

  const digits = /-?\d+(\.\d+)?/.exec(text);
  if (!digits) return undefined;
  const parsed = Number(digits[0]);

  // Anything past INT4 is a parsing artefact, not a grant size. Dropping it
  // beats letting the insert fail and lose every other field in the record.
  return Number.isFinite(parsed) && Math.abs(parsed) <= INT4_MAX ? parsed : undefined;
}

function toBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1'].includes(text)) return true;
  if (['false', 'no', 'n', '0'].includes(text)) return false;
  return undefined;
}

const HINT: Record<FieldKind, string> = {
  prose: 'Plain prose, not an object or a list.',
  tags: 'A flat array of short strings.',
  count: 'A plain number, digits only, no currency symbol.',
  bool: 'true or false.',
};

/**
 * Builds the schema handed to the model: every field untyped, so validation
 * cannot reject a shape that `normalize` would happily have accepted. The
 * descriptions still tell the model exactly what is wanted, which is what
 * actually steers the output.
 */
export function lenientSchema(fields: FieldSpecs) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [name, spec] of Object.entries(fields)) {
    shape[name] = z.any().optional().describe(`${spec.description} ${HINT[spec.kind]}`);
  }
  return z.object(shape);
}

/** Coerces a raw model object into the shapes the database expects. */
export function normalize(fields: FieldSpecs, raw: unknown): Record<string, unknown> {
  const input = (raw ?? {}) as Record<string, unknown>;
  const out: Record<string, unknown> = {};

  for (const [name, spec] of Object.entries(fields)) {
    const value = input[name];
    switch (spec.kind) {
      case 'prose': {
        const text = flatten(value);
        if (text) out[name] = text;
        break;
      }
      case 'tags': {
        const list = toTags(value);
        if (list.length > 0) out[name] = list;
        break;
      }
      case 'count': {
        const num = toCount(value);
        if (num !== undefined) out[name] = num;
        break;
      }
      case 'bool': {
        const bool = toBool(value);
        if (bool !== undefined) out[name] = bool;
        break;
      }
    }
  }

  return out;
}
