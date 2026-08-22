'use client';

// Composition root: the editor's behavior lives in the extracted hooks
// (useEditorProjectSession, useEditorAutosave,
// useEditorTabs) and its UI lives in EditorWorkspace.
// This file only mounts the workspace.
import EditorWorkspace from './components/EditorWorkspace';

export default function EditorPage() {
  return <EditorWorkspace />;
}
