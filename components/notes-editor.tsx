// ═══════════════════════════════════════════════════════════
// components/notes-editor.tsx
// Restores the missing Notes editor.
// Drop into /orage/notes/[id]/page.tsx where the empty middle column is.
// 
// REQUIRES: npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-placeholder
// ═══════════════════════════════════════════════════════════

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useState } from 'react';

interface NotesEditorProps {
  noteId: string;
  initialContent: any; // TipTap JSON
  onSave: (content: any) => void | Promise<void>;
  readOnly?: boolean;
}

export function NotesEditor({ noteId, initialContent, onSave, readOnly = false }: NotesEditorProps) {
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start writing… use / for commands',
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    immediatelyRender: false, // CRITICAL: fixes hydration mismatch (yesterday's React #418 error)
    onUpdate: ({ editor }) => {
      setSaved(false);
    },
  });

  // Auto-save every 2 seconds after a change
  useEffect(() => {
    if (!editor || saved) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      await onSave(editor.getJSON());
      setSaved(true);
      setSaving(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [editor, saved, onSave]);

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-[12px] text-[#8a7860]">Loading editor…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <EditorContent
          editor={editor}
          className="prose prose-invert max-w-none focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px] [&_.ProseMirror_p]:text-[#FFE8C7] [&_.ProseMirror_h1]:text-[#E4AF7A] [&_.ProseMirror_h2]:text-[#E4AF7A] [&_.ProseMirror_h3]:text-[#E4AF7A] [&_.ProseMirror_strong]:text-[#FFD69C] [&_.ProseMirror_code]:bg-[#262019] [&_.ProseMirror_code]:text-[#E4AF7A] [&_.ProseMirror_code]:px-1 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-[#5a4f3e] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
        />
      </div>

      <div className="px-8 py-2 border-t border-[rgba(182,128,57,0.08)] text-[10px] text-[#5a4f3e] uppercase tracking-[0.1em]" style={{ fontFamily: 'Bebas Neue' }}>
        {saving ? 'Saving…' : saved ? 'Saved' : 'Unsaved changes'}
      </div>
    </div>
  );
}
