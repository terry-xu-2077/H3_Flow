import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { mockProjectAssets } from "../../mock/assets";
import { AssetLibraryWorkspace } from "./AssetLibraryWorkspace";

describe("AssetLibraryWorkspace", () => {
  it("searches names and tags while exposing stable asset_id and project-relative path", async () => {
    const user = userEvent.setup();
    render(<AssetLibraryWorkspace assets={mockProjectAssets} />);

    await user.type(screen.getByRole("textbox", { name: "资产库搜索" }), "雨声");
    expect(screen.getByRole("button", { name: /雨声与远处汽笛/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /旧式放映机/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /雨声与远处汽笛/ }));
    expect(screen.getByRole("complementary", { name: "资产详情" })).toHaveTextContent("asset_id: asset-rain-audio");
    expect(screen.getByRole("complementary", { name: "资产详情" })).toHaveTextContent("assets/audio/harbor-rain.wav");
  });
});
