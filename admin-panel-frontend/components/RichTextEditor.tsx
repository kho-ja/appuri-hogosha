"use client";

import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  value: string; // Controlled value
  onChange: (value: string) => void; // Change handler
  modules?: Record<string, unknown>; // Optional modules for customization
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  modules: _modules,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Placeholder.configure({
        placeholder: "Type something here...",
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || "", false);
    }
  }, [editor, value]);

  const setLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", previousUrl || "");

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  return (
    <div className="rounded-md border bg-background">
      <div className="flex flex-wrap gap-2 border-b p-2">
        <Button
          type="button"
          size="sm"
          variant={editor?.isActive("bold") ? "default" : "outline"}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          Bold
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor?.isActive("italic") ? "default" : "outline"}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          Italic
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor?.isActive("underline") ? "default" : "outline"}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          Underline
        </Button>
        <Button
          type="button"
          size="sm"
          variant={editor?.isActive("link") ? "default" : "outline"}
          onClick={setLink}
        >
          Link
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            editor?.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          Clear
        </Button>
      </div>
      <EditorContent editor={editor} className="min-h-[160px] p-3" />
    </div>
  );
};

export default RichTextEditor;
