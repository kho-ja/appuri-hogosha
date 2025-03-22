import React from "react";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";

// Dynamically import ReactQuill to disable SSR
const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

interface RichTextEditorProps {
  value: string; // Controlled value
  onChange: (value: string) => void; // Change handler
  modules?: any; // Optional modules for customization
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  modules,
}) => {
  return (
    <div>
      <ReactQuill
        theme="snow"
        value={value} // Controlled value
        onChange={onChange} // Trigger onChange from props
        modules={
          modules || {
            toolbar: [["bold", "italic", "underline"], ["link"], ["clean"]],
          }
        }
        formats={["bold", "italic", "underline", "link"]}
        placeholder="Type something here..."
      />
    </div>
  );
};

export default RichTextEditor;
