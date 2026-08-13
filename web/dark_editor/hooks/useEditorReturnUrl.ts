'use client';

import { useEffect, useState } from 'react';
import { editorReturnToUrl } from '@/lib/editor-runtime';

export interface UseEditorReturnUrlReturn {
  returnUrl: string;
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

  useEffect(() => {
    setReturnUrl(editorReturnToUrl());
  }, []);

  return { returnUrl };
}
