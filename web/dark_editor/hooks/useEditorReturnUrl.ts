'use client';

import { useEffect, useState } from 'react';
import { editorReturnToUrl } from '@/lib/editor-runtime';

export interface UseEditorReturnUrlReturn {
  returnUrl: string;
  groupId?: number;
}

/**
 * useEditorReturnUrl — owns the destination of the in-editor Home / back
 * pill. The launch URL carries a relative `return_to` (stamped by the
 * InstaEdit SPA, e.g. `/app/covers?group=7`) so the user lands back on
 * the exact Copertine hub of the group they opened the editor from. Read
 * in an effect so server-rendered markup never differs from the client
 * value.
 */
export function useEditorReturnUrl(): UseEditorReturnUrlReturn {
  const [returnUrl, setReturnUrl] = useState<string>(editorReturnToUrl);
  const [groupId, setGroupId] = useState<number | undefined>();

  useEffect(() => {
    setReturnUrl(editorReturnToUrl());
    const raw = new URLSearchParams(window.location.search).get('return_to');
    const parsed = raw ? Number(new URL(raw, window.location.origin).searchParams.get('group')) : NaN;
    setGroupId(Number.isInteger(parsed) && parsed > 0 ? parsed : undefined);
  }, []);

  return { returnUrl, groupId };
}
