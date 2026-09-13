import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

import { mockProjectAssets } from "../../mock/assets";
import { AssetPickerDialog } from "./AssetPickerDialog";

describe("AssetPickerDialog", () => {
  it("filters by tags, previews project-relative paths, and confirms a multi-selection", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<AssetPickerDialog open assets={mockProjectAssets} initialBindings={[]} onClose={vi.fn()} onConfirm={onConfirm} />);

    await user.type(screen.getByRole("textbox", { name: "搜索素材" }), "雨声");
    const rainAsset = screen.getByRole("option", { name: /雨声与远处汽笛/ });
    expect(screen.getAllByRole("option")).toHaveLength(1);
    await user.click(within(rainAsset).getByRole("button", { name: /预览/ }));
    expect(screen.getByRole("complementary", { name: "素材预览" })).toHaveTextContent("assets/audio/harbor-rain.wav");
    await user.click(within(rainAsset).getAllByRole("button")[1]);
    await user.click(screen.getByRole("button", { name: "添加到分镜" }));

    expect(onConfirm).toHaveBeenCalledWith([{ assetId: "asset-rain-audio", role: "audio" }]);
  });

  it("does not mutate bindings when Cancel is used", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<AssetPickerDialog open assets={mockProjectAssets} initialBindings={[]} onClose={onClose} onConfirm={onConfirm} />);

    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
