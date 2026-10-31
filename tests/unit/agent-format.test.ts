import { describe, expect, it } from "vitest";
import { cleanMarkdown, formatAnswer } from "@/lib/agent/format";

describe("lib/agent/format — plain-text safety net for agent answers", () => {
  it("strips markdown emphasis, headings and code fences", () => {
    expect(cleanMarkdown("**Concord** uses __Redis__.")).toBe("Concord uses Redis.");
    expect(cleanMarkdown("## Stack\n- Python\n* Redis")).toBe("Stack\n• Python\n• Redis");
    expect(cleanMarkdown("```python\nprint(1)\n```")).toBe("print(1)\n");
    expect(cleanMarkdown("2 * 3 * 4")).toBe("2 * 3 * 4");
  });

  it("turns markdown links, bare URLs and site paths into links", () => {
    expect(formatAnswer("Book at [his Calendly](https://calendly.com/x/30-min) today")).toEqual([
      "Book at ",
      { href: "https://calendly.com/x/30-min", label: "his Calendly", external: true },
      " today",
    ]);
    expect(formatAnswer("See https://calendly.com/x/30-min.")).toEqual([
      "See ",
      { href: "https://calendly.com/x/30-min", label: "https://calendly.com/x/30-min", external: true },
      ".",
    ]);
    expect(formatAnswer("Read /work/geolumen, it's short")).toEqual([
      "Read ",
      { href: "/work/geolumen", label: "/work/geolumen", external: false },
      ", it's short",
    ]);
  });

  it("never links non-http schemes or partial paths", () => {
    expect(formatAnswer("[x](javascript:alert(1)) and a/work/b")).toEqual(["[x](javascript:alert(1)) and a/work/b"]);
    expect(formatAnswer("plain text")).toEqual(["plain text"]);
  });
});
