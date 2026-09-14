import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";

import { OverlayProvider } from "../ui/overlay";
import { H3PromptEditor } from "./H3PromptEditor";
import type { PromptAsset } from "./PromptAssetEditor";

const assets: PromptAsset[] = [
  {
    id: "asset-1",
    name: "林澜 · 雨夜造型",
    kind: "subject",
    reference: "<Subject 1>",
    detail: "角色素材",
    tone: "amber",
  },
  {
    id: "asset-2",
    name: "旧港口仓库外景",
    kind: "picture",
    reference: "<Picture 1>",
    detail: "场景素材",
    tone: "blue",
  },
];

function Harness() {
  const [value, setValue] = useState("仓库门口 ");
  return (
    <OverlayProvider>
      <H3PromptEditor
        value={value}
        onChange={setValue}
        assets={assets}
        ariaLabel="用户提示词"
        viewMode="visual"
      />
      <output data-testid="prompt-value">{value}</output>
    </OverlayProvider>
  );
}

describe("H3PromptEditor visual asset mentions", () => {
  it("typing @ opens the asset menu and inserts the selected reference", () => {
    render(<Harness />);
    const editor = screen.getByRole("textbox", { name: "用户提示词可视化" });

    editor.textContent = "仓库门口 @";
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    fireEvent.input(editor);

    expect(screen.getByRole("listbox", { name: "引用任务资产" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /林澜 · 雨夜造型/ }));

    expect(screen.getByTestId("prompt-value")).toHaveTextContent("仓库门口 <Subject 1>");
  });
});
