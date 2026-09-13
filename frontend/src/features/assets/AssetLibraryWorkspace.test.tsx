import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { mockProjectAssets } from "../../mock/assets";
import { AssetLibraryWorkspace } from "./AssetLibraryWorkspace";

describe("AssetLibraryWorkspace", () => {
  it("searches names and tags while hiding technical identifiers by default", async () => {
    const user = userEvent.setup();
    render(<AssetLibraryWorkspace assets={mockProjectAssets} />);

    await user.type(screen.getByRole("textbox", { name: "素材搜索" }), "雨声");
    expect(screen.getByRole("button", { name: /雨声与远处汽笛/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /旧式放映机/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /雨声与远处汽笛/ }));

    const detail = screen.getByRole("complementary", { name: "素材详情" });
    expect(detail).not.toHaveTextContent("asset_id: asset-rain-audio");
    expect(detail).not.toHaveTextContent("assets/audio/harbor-rain.wav");

    await user.click(screen.getByRole("button", { name: "技术信息" }));
    expect(detail).toHaveTextContent("asset_id: asset-rain-audio");
    expect(detail).toHaveTextContent("assets/audio/harbor-rain.wav");
  });
});
