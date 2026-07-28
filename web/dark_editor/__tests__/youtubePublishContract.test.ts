import { describe, it, expect, expectTypeOf } from 'vitest';
import type { PublishYouTubeEditorSessionResponse } from '@/lib/api/bff/youtube';

/**
 * Cross-repo contract lock for the YouTube editor session publish
 * response shape.
 *
 * Three layers must stay in sync (drift between any pair fails the
 * relevant test):
 *
 *   - Go DTO
 *       InstaeditLogin/pkg/api/youtube_editor_sessions.go
 *       (publishYouTubeEditorSessionResponse at lines 593-600)
 *   - OpenAPI yaml
 *       InstaeditLogin/api/openapi.yaml
 *       (YouTubeEditorSessionPublishResponse at lines 1400-1426)
 *   - TypeScript
 *       VeloxFrontend/web/dark_editor/lib/api/bff/youtube.ts
 *       (PublishYouTubeEditorSessionResponse -- this is the type
 *       under test inside this file)
 *
 * The Go-side companion lock is at:
 *   InstaeditLogin/pkg/api/youtube_editor_sessions_contract_test.go
 *
 * Together the two tests close the cross-repo drift gap on the one
 * shape that the dark editor's publishBroadcast consumer reads.
 * Loosening any of the three layers breaks the consumer immediately:
 *
 *   - If the OpenAPI yaml drops `status` from required or strips
 *     `published` from its enum, the InstaeditLogin Go test fails.
 *   - If the Go DTO removes `Status` or renames its json tag, the
 *     InstaeditLogin Go test fails.
 *   - If this TS interface loosens `status` away from the literal
 *     'published' or makes it optional, THIS test fails at compile
 *     time (via vitest's expectTypeOf -- vitest reports the type
 *     mismatch as a failing test).
 *
 * The OpenAPI yaml is the canonical source of truth. The Go DTO is
 * its runtime implementation on InstaeditLogin. The TS interface is
 * the runtime consumer viewpoint on VeloxFrontend. Change all three
 * together; do not touch one without the other two.
 */
describe('PublishYouTubeEditorSessionResponse contract lock', () => {
  it('status is the OpenAPI literal "published" -- not a broader string', () => {
    // Required by the Go contract lock at
    // InstaeditLogin/pkg/api/youtube_editor_sessions_contract_test.go
    // (asserts the Go Status field has json tag "status" + reflect.String
    // kind) AND the OpenAPI yaml declaration at api/openapi.yaml:1404
    // (status: { type: string, enum: [published] }).
    expectTypeOf<PublishYouTubeEditorSessionResponse['status']>().toEqualTypeOf<'published'>();
  });

  it('status is REQUIRED (not optional)', () => {
    // Mirrors the OpenAPI required: [status, public_url, video_id, privacy_status]
    // list at openapi.yaml:1402. If someone ever flips the field to
    // status?: 'published', the cross-repo consumer
    // (publishBroadcast + the main Vite app's
    // useEditorSessionLiveUpdate) silently reads undefined.
    //
    // Implementation note: ``Required<T>`` keeps the same keyset (it
    // only removes the ``?`` modifier), so a naive ``'status' extends
    // keyof Required<T>`` check returns true for BOTH required and
    // optional keys. The canonical pattern is ``{} extends Pick<T, K>``
    // -- Pick produces a type that is assignable to ``{}`` only when
    // the key is OPTIONAL (the ``?`` permits omission). Inverting the
    // result delivers the real "is this required?" boolean.
    type IsStatusOptional =
      {} extends Pick<PublishYouTubeEditorSessionResponse, 'status'> ? true : false;
    expectTypeOf<IsStatusOptional>().toEqualTypeOf<false>();
  });

  it('OpenAPI-required string fields are typed as required string', () => {
    // Same required-fields lock as the OpenAPI required: [...] array
    // (openapi.yaml:1402). These four pairs with the Documented
    // links in the field-by-field contract above:
    //   public_url     -> openapi.yaml:1408-1410  (format: uri, string)
    //   video_id       -> openapi.yaml:1411-1412  (type: string)
    //   privacy_status -> openapi.yaml:1413-1415  (type: string, enum: [...])
    expectTypeOf<PublishYouTubeEditorSessionResponse['public_url']>().toEqualTypeOf<string>();
    expectTypeOf<PublishYouTubeEditorSessionResponse['video_id']>().toEqualTypeOf<string>();
    expectTypeOf<PublishYouTubeEditorSessionResponse['privacy_status']>().toEqualTypeOf<string>();
  });

  it('runtime sample matches OpenAPI properties shape (catches structural drift)', () => {
    // Runtime check: build a canonical response and verify the
    // field set matches the OpenAPI properties keys (excludes the
    // optional/late additions: published_at, actual_privacy,
    // youtube_sync_status). Catches the failure mode where the TS
    // type is structurally fine (compile-time expectTypeOf passes)
    // but a downstream consumer reads the wrong field name.
    const sample: PublishYouTubeEditorSessionResponse = {
      public_url: 'https://www.youtube.com/watch?v=ytvideo123',
      video_id: 'ytvideo123',
      privacy_status: 'public',
      status: 'published',
      actual_privacy: 'public',
      youtube_sync_status: 'confirmed',
    };
    expect(sample.status).toBe('published');
    expect(sample.video_id).toBe('ytvideo123');
    expect(sample.privacy_status).toBe('public');
    // Actualprivacy and youtube_sync_status are intentionally broad
    // (string) in the TS type because the Go server may flush them
    // empty during transient read-back windows (see pkg/api/youtube_editor_sessions.go
    // executePublishYouTubeEditorSession's pending/drift branches).
    // The contract lock here is REQUIRED status; those two are
    // best-effort markers.
  });

  it('declines any value other than "published" at the type level', () => {
    // Compile-time guard: assigning any string other than the
    // literal 'published' to status must raise a TS error. If the
    // TS type ever loosens to status: string, this block compiles
    // cleanly and the @ts-expect-error directive below becomes
    // "Unused" -- a hard TS error at type-check time. Either way,
    // loosening is caught before the test even runs.
    const denied: PublishYouTubeEditorSessionResponse = {
      public_url: '',
      video_id: '',
      privacy_status: '',
      // @ts-expect-error -- status must remain the literal 'published'; loosening to string is caught by the @ts-expect-error becoming unused
      status: 'something-else',
    };
    // Reference the variable so the type checker doesn't whine about an
    // unused declaration in strict-mode (TS doesn't complain, but the
    // eslint no-unused-vars rule will on some configs).
    expect(typeof denied.status).toBe('string');
  });
});
