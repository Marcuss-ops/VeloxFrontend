/**
 * Cross-repo contract lock between the OpenAPI schema
 * YouTubeEditorSessionPublishRequest (vendored at
 * web/dark_editor/api/openapi.yaml) and the TS interface
 * PublishYouTubeEditorSessionRequest (in
 * web/dark_editor/lib/api/bff/youtube/types.ts).
 *
 * The Go half of this contract lives at:
 *   InstaeditLogin/pkg/api/youtube_editor_sessions_contract_test.go
 *   (TestPublishRequestContract_OpenAPI_Matches_DTO)
 *
 * The response contract (response-side) lives in:
 *   VeloxFrontend/web/dark_editor/__tests__/publishResponseContract.test.ts
 *
 * Both halves run in their respective CI workflows. If the OpenAPI
 * schema changes, the Go DTO changes, or the TS interface drifts,
 * this test fails.
 *
 * Unlike the response, this request has NO required fields in the
 * OpenAPI and ALL fields are optional on both the Go side (every
 * field carries `,omitempty`) and the TS side (every field uses
 * `?:`). The contract test therefore enforces that EVERY FIELD STAYS
 * OPTIONAL across all three sources — if the SPA ever flips a field
 * to required (drops `?`) without first updating the OpenAPI
 * `required:` array AND removing `,omitempty` on the Go DTO, this
 * test fails and forces a coordinated change.
 *
 * Three naming conventions exist on purpose:
 *   OpenAPI: YouTubeEditorSessionPublishRequest  (PascalCase, OAS)
 *   Go DTO:  publishYouTubeEditorSessionRequest  (snake_case, Go)
 *   TS type: PublishYouTubeEditorSessionRequest  (PascalCase, TS)
 *
 * The contract test bridges them and only insists on identical
 * FIELD SHAPES (name + optionality; type compatibility is the Go
 * test's job — see typeCompatibleOpenAPI).
 *
 * RUN IN CI via: npm run validate in web/dark_editor (which runs
 * `tsc --noEmit && vitest run`). The VeloxFrontend
 * `.github/workflows/integration-fast.yml` workflow gates deploys
 * on this command.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

const OPENAPI_SCHEMA_NAME = 'YouTubeEditorSessionPublishRequest';
const TS_INTERFACE_NAME = 'PublishYouTubeEditorSessionRequest';

const VENDORED_OPENAPI_PATH = path.resolve(
  __dirname,
  '../api/openapi.yaml'
);
const TS_INTERFACE_PATH = path.resolve(
  __dirname,
  '../lib/api/bff/youtube/types.ts'
);

type OpenAPIProperty = {
  type: string;
  format?: string;
  enum?: unknown[];
  nullable?: boolean;
  description?: string;
};

type OpenAPISchema = {
  type: string;
  required?: string[];
  properties: Record<string, OpenAPIProperty>;
};

type TSField = {
  type: string;
  optional: boolean;
};

/**
 * Load the OpenAPI schema from the vendored copy. Fails the test
 * (by throw) if the file is missing or the schema is not present.
 */
function loadOpenAPISchema(): OpenAPISchema {
  if (!fs.existsSync(VENDORED_OPENAPI_PATH)) {
    throw new Error(
      `Vendored OpenAPI missing at ${VENDORED_OPENAPI_PATH} — re-copy ` +
        `InstaeditLogin/api/openapi.yaml here (see header comment in ` +
        `the file for the sync procedure).`
    );
  }
  const content = fs.readFileSync(VENDORED_OPENAPI_PATH, 'utf8');
  const doc = yaml.load(content) as any;
  const schema = doc?.components?.schemas?.[OPENAPI_SCHEMA_NAME];
  if (!schema) {
    const available = Object.keys(doc?.components?.schemas ?? {});
    throw new Error(
      `Schema ${OPENAPI_SCHEMA_NAME} not found in vendored OpenAPI. ` +
        `Available schemas: ${available.join(', ')}`
    );
  }
  if (!schema.properties) {
    throw new Error(
      `Schema ${OPENAPI_SCHEMA_NAME} has no properties in vendored OpenAPI`
    );
  }
  return schema as OpenAPISchema;
}

/**
 * Parse a TS interface declaration into a Map<fieldName, TSField>.
 * Skips blank lines, comments, and continuation lines. Handles
 * both `field: type` and `field?: type` (optional) syntax.
 *
 * The brace counter handles nested braces (e.g., Record<...> gets
 * balanced correctly because the interface body's opening { and
 * closing } are the boundary — generic params wrap their own
 * angle-brackets, not braces).
 */
function parseTSInterface(): Map<string, TSField> {
  const content = fs.readFileSync(TS_INTERFACE_PATH, 'utf8');
  const headerRe = new RegExp(`interface\\s+${TS_INTERFACE_NAME}\\s*\\{`);
  const headerMatch = content.match(headerRe);
  if (!headerMatch || headerMatch.index === undefined) {
    throw new Error(
      `Interface ${TS_INTERFACE_NAME} not found at ${TS_INTERFACE_PATH}`
    );
  }
  const bodyStart = headerMatch.index + headerMatch[0].length;
  let depth = 1;
  let i = bodyStart;
  while (i < content.length && depth > 0) {
    const c = content[i];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  if (depth !== 0) {
    throw new Error(`Unbalanced braces in ${TS_INTERFACE_NAME}`);
  }
  const body = content.slice(bodyStart, i - 1);
  const fields = new Map<string, TSField>();
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (
      line === '' ||
      line.startsWith('//') ||
      line.startsWith('*') ||
      line.startsWith('/*')
    ) {
      continue;
    }
    // Match `field_name: type` or `field_name?: type`. The capture
    // group `(.+)$` greedily eats the trailing `;` (every TS field
    // declaration ends in one); strip it so the captured type
    // matches the actual TypeScript expression that `tsTypeToOAType`
    // regex-parses. Without this, `title?: string;` would be
    // captured as type="string;" and miss every allowlist branch.
    const m = line.match(/^(\w+?)(\?)?:\s*(.+)$/);
    if (m) {
      const type = m[3].trim().replace(/;$/, '');
      fields.set(m[1], { type, optional: m[2] === '?' });
    }
  }
  return fields;
}

describe('PublishYouTubeEditorSessionRequest contract lock', () => {
  const schema = loadOpenAPISchema();
  const tsFields = parseTSInterface();
  const openAPIFields = Object.keys(schema.properties);

  it('every OpenAPI field exists in the TS type', () => {
    for (const name of openAPIFields) {
      expect(
        tsFields.has(name),
        `DRIFT: OpenAPI field '${name}' is missing from TS type ${TS_INTERFACE_NAME}. ` +
          `Add the field to the interface or update the OpenAPI schema.`
      ).toBe(true);
    }
  });

  it('every TS field exists in the OpenAPI', () => {
    for (const name of tsFields.keys()) {
      expect(
        name in schema.properties,
        `DRIFT: TS field '${name}' is missing from OpenAPI ${OPENAPI_SCHEMA_NAME}. ` +
          `Add the field to the OpenAPI schema or remove it from the TS type.`
      ).toBe(true);
    }
  });

  it('every TS field OPTIONALITY matches the OpenAPI required array', () => {
    // STRICT optionality parity (mirrors the response test).
    // The request side currently has every field marked optional
    // on all 3 sides (no OpenAPI `required:` array, all Go fields
    // have `,omitempty`, every TS field uses `?:`), so this check
    // is currently a pass-through. It catches any future drift where
    // one side flips a field to required without the other two
    // following.
    //
    // NOTE: This it() runs alongside the looser
    // "every TS field stays optional" guardrail it() below — that
    // one enforces the all-optional-by-convention business rule for
    // backward-compat with legacy 4-field callers; THIS one enforces
    // the per-field optional ↔ required ↔ omitempty parity contract.
    // Both can coexist; flipping one does not subsume the other.
    const required = new Set(schema.required ?? []);
    for (const [name, field] of tsFields.entries()) {
      const oaOptional = !required.has(name);
      const tsOptional = field.optional;
      if (oaOptional !== tsOptional) {
        expect(
          tsOptional,
          `FIELD OPTIONALITY DRIFT: field '${name}': ` +
            `TS optional=${tsOptional}, OpenAPI requires=${!oaOptional}. ` +
            `Contract: TS \`?\` ↔ OpenAPI NOT in \`required:\` ↔ Go \`,omitempty\` ` +
            `(all three sides must agree). Full OpenAPI required: [${Array.from(required).join(', ')}].`
        ).toBe(!oaOptional);
        return;
      }
    }
  });

  it('every TS field stays optional', () => {
    // The publish request is operator-typed — none of the fields are
    // strictly required. If the SPA ever flips a field to required
    // (dropping `?`) this test fails and forces the author to also
    // update the OpenAPI `required:` array and remove `,omitempty`
    // on the Go DTO side. Keeping all sides optional keeps the
    // publish payload backward-compatible with the legacy 4-field
    // shape ({title, description, privacy_status, publish_at}).
    for (const [name, field] of tsFields.entries()) {
      expect(
        field.optional,
        `FIELD OPTIONALITY: TS field '${name}' is declared as REQUIRED ` +
          `(no '?'). The OpenAPI ${OPENAPI_SCHEMA_NAME} schema has no ` +
          `'required:' entries and the Go DTO marks every field as ` +
          `'omitempty'. Keeping all sides optional keeps the publish ` +
          `payload backward-compatible — flip the contract on all ` +
          `three sides in lockstep.`
      ).toBe(true);
    }
  });

  it('every TS field TYPE maps to the OpenAPI `type`', () => {
    // Closes the parity gap with the Go half (which runs
    // typeCompatibleOpenAPI per field). The MVP covers every shape
    // present in the current contract:
    //   - string (incl. `string | null` and literal unions)
    //   - Array<X>, X[]                  → 'array'
    //   - Record<K, V>                   → 'object'
    // Unknown TS shapes fail with `expect(...).not.toBeNull()` so
    // Vitest reports them through the regular matcher pipeline
    // rather than as an uncaught exception.
    for (const [name, field] of tsFields.entries()) {
      const oaProp = schema.properties[name];
      if (!oaProp) continue; // covered by the parity test above
      const expected = tsTypeToOAType(field.type);
      expect(
        expected,
        `FIELD TYPE: TS field '${name}' has TS type '${field.type}' ` +
          `which has no TS→OpenAPI type mapping registered. Update ` +
          `tsTypeToOAType() to cover this shape (current allowlist: ` +
          `'string' | literal union | 'string | null' | 'X[]' / 'Array<X>' | 'Record<K, V>').`
      ).not.toBeNull();
      expect(
        oaProp.type,
        `FIELD TYPE: TS field '${name}' has TS type '${field.type}' ` +
          `which maps to OpenAPI type='${expected}', but OpenAPI ` +
          `declares type='${oaProp.type}'`
      ).toBe(expected as string);
    }
  });
});

/**
 * Map a TS field type expression to the OpenAPI `type` value it
 * represents on the wire. Returns null when the shape isn't covered
 * by the MVP allowlist — caller throws so the contract test fails
 * loudly and the author updates this allowlist in lockstep.
 *
 * MVP coverage (every shape present in YouTubeEditorSessionPublishRequest):
 *   - 'string', 'string | null'                                       → 'string'
 *   - `'public' | 'unlisted' | 'private'` (literal unions)            → 'string'
 *   - 'string[]', 'Array<X>'                                          → 'array'
 *   - 'Record<K, V>'                                                  → 'object'
 */
function tsTypeToOAType(tsType: string): string | null {
  const s = tsType.trim();

  // Strip `| null` nullable markers first; downstream checks treat
  // `string | null` the same as `string`.
  const cleaned = s.replace(/\s*\|\s*null\b/g, '').trim();

  // String literal unions: `'a' | 'b' | ...`
  if (/^['"`][^'"`]*['"`](\s*\|\s*['"`][^'"`]*['"`])*$/.test(cleaned)) {
    return 'string';
  }

  // Bare `string` (or a union starting with string after stripping | null)
  if (/^string(\s*\|\s*string)*$/.test(cleaned)) {
    return 'string';
  }

  // Record<K, V> → object
  if (/^Record\s*</.test(cleaned)) {
    return 'object';
  }

  // Array<X> or X[]
  if (/^Array\s*</.test(cleaned) || /\[\s*\]$/.test(cleaned)) {
    return 'array';
  }

  return null;
}
