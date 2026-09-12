import "@testing-library/jest-dom/vitest";

beforeEach(() => {
  if (!document.getElementById("shotmill-overlay-root")) {
    const root = document.createElement("div");
    root.id = "shotmill-overlay-root";
    document.body.append(root);
  }
});

afterEach(() => {
  document.getElementById("shotmill-overlay-root")?.replaceChildren();
});
