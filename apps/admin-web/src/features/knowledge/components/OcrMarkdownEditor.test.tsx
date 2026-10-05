// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OcrMarkdownEditor } from "./OcrMarkdownEditor";

describe("OcrMarkdownEditor", () => {
  it("edits Markdown and safely previews headings and OCR HTML tables", () => {
    const onChange = vi.fn();
    render(
      <OcrMarkdownEditor
        page={1}
        value={"# Corrected title\n\n<table><tr><td>OCR table</td></tr></table>\n\n<script>window.hacked = true</script>"}
        onChange={onChange}
      />,
    );

    fireEvent.change(screen.getByRole("textbox", { name: "OCR Markdown for page 1" }), {
      target: { value: "# New title" },
    });
    expect(onChange).toHaveBeenCalledWith("# New title");

    fireEvent.click(screen.getByRole("tab", { name: "Preview" }));

    expect(screen.getByRole("heading", { name: "Corrected title" })).toBeInTheDocument();
    expect(screen.getByText("OCR table").closest("table")).toBeInTheDocument();
    expect(screen.queryByText("window.hacked = true")).not.toBeInTheDocument();
  });
});
