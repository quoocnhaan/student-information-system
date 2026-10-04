import { useId, useState, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "katex/dist/katex.min.css";

type OcrMarkdownEditorProps = {
  page: number;
  value: string;
  onChange: (value: string) => void;
};

function isSafeLink(href: string | undefined): boolean {
  if (!href) return false;
  try {
    const url = new URL(href, window.location.origin);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

export function OcrMarkdownEditor({ page, value, onChange }: OcrMarkdownEditorProps) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const baseId = useId();
  const editTabId = `${baseId}-edit`;
  const previewTabId = `${baseId}-preview`;

  function moveTab(event: KeyboardEvent<HTMLButtonElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setTab((current) => {
      if (event.key === "Home") return "edit";
      if (event.key === "End") return "preview";
      return current === "edit" ? "preview" : "edit";
    });
  }

  return <div className="ocr-editor">
    <div className="editor-tabs" role="tablist" aria-label="OCR draft view">
      <button
        id={editTabId}
        className={tab === "edit" ? "editor-tab is-selected" : "editor-tab"}
        type="button"
        role="tab"
        aria-selected={tab === "edit"}
        aria-controls={`${baseId}-panel`}
        tabIndex={tab === "edit" ? 0 : -1}
        onClick={() => setTab("edit")}
        onKeyDown={moveTab}
      >Edit Markdown</button>
      <button
        id={previewTabId}
        className={tab === "preview" ? "editor-tab is-selected" : "editor-tab"}
        type="button"
        role="tab"
        aria-selected={tab === "preview"}
        aria-controls={`${baseId}-panel`}
        tabIndex={tab === "preview" ? 0 : -1}
        onClick={() => setTab("preview")}
        onKeyDown={moveTab}
      >Preview</button>
    </div>
    <div
      id={`${baseId}-panel`}
      className="ocr-editor-panel"
      role="tabpanel"
      aria-labelledby={tab === "edit" ? editTabId : previewTabId}
    >
      {tab === "edit" ? <textarea
        className="ocr-text ocr-text-editor"
        aria-label={`OCR Markdown for page ${page}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      /> : <div className="markdown-preview">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}
          components={{
            a: ({ href, children }) => isSafeLink(href)
              ? <a href={href} target="_blank" rel="noreferrer">{children}</a>
              : <span>{children}</span>,
            img: ({ alt }) => <span className="ocr-image-placeholder">[Image: {alt ?? "OCR image"}]</span>,
          }}
        >{value}</ReactMarkdown>
      </div>}
    </div>
  </div>;
}
