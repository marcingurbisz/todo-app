import { afterEach, describe, expect, it, vi } from "vitest";
import type { RepoSettings } from "../types";
import { readFileContent } from "./github";

const settings: RepoSettings = {
  owner: "owner",
  repo: "repo",
  branch: "main",
  token: "token",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readFileContent", () => {
  it("reads a file by blob SHA so Unicode names are not part of the request URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({
        content: btoa(String.fromCharCode(...new TextEncoder().encode("zażółć gęślą jaźń"))),
        encoding: "base64",
      }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(readFileContent(settings, { sha: "abc123" })).resolves.toBe("zażółć gęślą jaźń");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/owner/repo/git/blobs/abc123",
      expect.any(Object),
    );
  });

  it("does not blame repository configuration when a file blob is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response("Not Found", { status: 404 }),
    ));

    await expect(readFileContent(settings, { sha: "missing" })).rejects.toThrow(
      "The file content is no longer available at this repository version.",
    );
  });
});
