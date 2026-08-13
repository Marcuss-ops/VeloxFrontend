/**
 * Cross-repo contract lock between the OpenAPI schema
 * YouTubeEditorSessionPublishResponse (vendored at
 * web/dark_editor/api/openapi.yaml) and the TS interface
 * PublishYouTubeEditorSessionResponse (in
 * web/dark_editor/lib/api/bff/youtube/types.ts).
 *
 * The Go half of this contract lives at:
 *   InstaeditLogin/pkg/api/youtube_editor_sessions_contract_test.go
 *
 * Both halves run in their respective CI workflows. If the
 * OpenAPI schema changes, the Go DTO changes, or the TS
 * interface drifts, this test fails.
 *
 * The `status` field is checked explicitly because the SPA's
 * BroadcastChannel listener does `if (msg.status === 'published')`
 * and silently fails if the field is dropped.
 *
 * Three naming conventions exist on purpose:
 *   OpenAPI: YouTubeEditorSessionPublishResponse  (PascalCase, OAS)
 *   Go DTO:  publishYouTubeEditorSessionResponse  (snake_case, Go)
 *   TS type: PublishYouTubeEditorSessionResponse  (PascalCase, TS)
 *
 * The contract test bridges them and only insists on identical
 * FIELD SHAPES (same field names; this MVP does not enforce
 * optionality or type compatibility — that is a follow-up).
 *
 * RUN IN CI via: npm run validate in web/dark_editor (which runs
 * `tsc --noEmit && vitest run && next lint --dir lib`). The
 * VeloxFrontend `.github/workflows/integration-fast.yml` workflow
 * gates deploys on this command.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';

const OPENAPI_SCHEMA_NAME = 'YouTubeEditorSessionPublishResponse';
const TS_INTERFACE_NAME = 'PublishYouTubeEditorSessionResponse';

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

type OpenAPIDocument = {
  components?: {
    schemas?: Record<string, OpenAPISchema | undefined>;
  };
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
  const doc = yaml.load(content) as OpenAPIDocument;
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
 * The brace counter handles nested braces (e.g., union types
 * inside the field declaration are not a concern since the test
 * only relies on the OUTER brace pair of the interface body).
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
    // matches the actual TypeScript expression that future
    // type-shape checks would regex-parse. Without this, a future
    // 4th it() block (e.g. a type-shape mirror of the request test)
    // would see type='string;' for `public_url: string;` and miss
    // every allowlist branch.
    const m = line.match(/^(\w+?)(\?)?:\s*(.+)$/);
    if (m) {
      const type = m[3].trim().replace(/;$/, '');
      fields.set(m[1], { type, optional: m[2] === '?' });
    }
  }
  return fields;
}

describe('PublishYouTubeEditorSessionResponse contract lock', () => {
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

  it('every TS field optionality matches the OpenAPI required array', () => {
    // STRICT optionality parity: TS `?` must match OpenAPI
    // (not in `required:`) AND vice versa. The cross-repo
    // contract lock is: TS `?` ↔ OpenAPI NOT in `required:`
    // ↔ Go `omitempty`. Drift on any side fails the build.
    //
    // Schema context: `actual_privacy` + `youtube_sync_status`
    // are server-side `omitempty` and not in OpenAPI `required:`
    // → TS side marks them `?` (callers may receive `undefined`
    // when the orchestrator's videos.list read-back hasn't
    // completed). The 4 other fields are required on all 3 sides.
    //
    // OpenAPI's `nullable: true` is independent of `required:` —
    // a required+nullable field IS required on the wire (the
    // payload MUST include the key, possibly null). This check
    // does not consult `nullable`; only the `required:` array
    // drives the wire-shape contract.
    const required = new Set(schema.required ?? []);
    for (const [name, field] of tsFields.entries()) {
      const oaOptional = !required.has(name);
      const tsOptional = field.optional;
      if (oaOptional !== tsOptional) {
        // One-shot descriptive failure (the first mismatch tells
        // the contributor exactly which field is wrong;
        // subsequent drifts land in the next commit's run).
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

  it('specifically includes the `status` field on both sides', () => {
    expect(
      openAPIFields,
      `FIELD MISSING: 'status' is required in OpenAPI ${OPENAPI_SCHEMA_NAME} — ` +
        `the SPA's BroadcastChannel listener does ` +
        `\`if (msg.status === 'published')\` and silently fails if the field is dropped.`
    ).toContain('status');
    expect(
      tsFields.has('status'),
      `FIELD MISSING: 'status' is required in TS type ${TS_INTERFACE_NAME}.`
    ).toBe(true);
  });

  it('the OpenAPI status field is type=string', () => {
    const status = schema.properties['status'];
    if (status) {
      expect(
        status.type,
        `FIELD TYPE: OpenAPI 'status' must be type=string, got ${status.type}`
      ).toBe('string');
    }
  });
});
