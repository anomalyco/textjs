import { afterAll, describe, expect, test } from "bun:test";
import { render } from "../src/entry-server";
import { resetLocation } from "../src/router";

describe("/errors/TX020", () => {
  afterAll(() => resetLocation("/"));

  test("How to fix it says there is no text deploy and links to Deploying", async () => {
    const html = await render("/errors/TX020");
    expect(html).toContain("There is no <code>text deploy</code>.");
    expect(html).toContain("<code>text build --adapter &lt;name&gt;</code>");
    expect(html).toContain('href="/docs/deploying"');
  });
});
