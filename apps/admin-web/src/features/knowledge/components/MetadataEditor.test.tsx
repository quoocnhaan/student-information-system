// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { MetadataEditor } from "./MetadataEditor";

afterEach(cleanup);
it("shows API major labels and persists selected keys without free text", () => {
  const onChange = vi.fn();
  render(<MetadataEditor value={{ program_scope: { type: "specific_programs", programs: ["chinese"] } }} onChange={onChange}
    options={["all", "specific_programs"]} majors={[{ key: "english", label: "English major" }, { key: "chinese", label: "Chinese major" }, { key: "non_language", label: "Non-language major" }]} />);
  const selector = screen.getByLabelText("Applicable majors") as HTMLSelectElement;
  expect(selector.multiple).toBe(true);
  expect(screen.queryByRole("option", { name: "Non-language major" })).not.toBeInTheDocument();
  selector.options[0].selected = true;
  fireEvent.change(selector);
  expect(onChange.mock.lastCall?.[0].program_scope.programs).toEqual(["english", "chinese"]);
});
