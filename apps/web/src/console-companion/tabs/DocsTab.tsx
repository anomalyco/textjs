import { useMemo, useState, type ReactNode } from "react";
import { Box, Input, Markdown, ScrollBox, Select, Text, useInput, useTheme, useViewport, type SelectOption } from "@textjs/react";
import { DOCS, getDoc, searchDocs, toConsoleMarkdown } from "../../docs/registry";
import { siteStore, type DocsPane } from "../store";
import { useSite } from "../useSite";

const setPane = (docsPane: DocsPane): void => siteStore.set({ docsPane });

export function DocsTab(): ReactNode {
  const theme = useTheme();
  const vp = useViewport();
  const site = useSite();
  const [query, setQuery] = useState("");
  const pane = site.docsPane;
  const doc = getDoc(site.docSlug) ?? DOCS[0];

  const options = useMemo<SelectOption[]>(() => {
    const seen = new Set<string>();
    const out: SelectOption[] = [];
    for (const hit of searchDocs(query, 40)) {
      if (seen.has(hit.doc.slug)) continue;
      seen.add(hit.doc.slug);
      out.push({ value: hit.doc.slug, label: hit.doc.nav ?? hit.doc.title });
    }
    return out;
  }, [query]);

  const markdown = useMemo(() => (doc ? toConsoleMarkdown(doc.markdown) : ""), [doc]);

  useInput(
    (e) => {
      if (pane === "search") {
        if (e.key === "escape" || e.key === "return" || e.key === "down") {
          e.stopPropagation();
          setPane("list");
        }
        return;
      }
      if (e.input === "/") {
        e.stopPropagation();
        setPane("search");
      } else if (pane === "list" && e.key === "right") {
        e.stopPropagation();
        setPane("content");
      } else if (pane === "content" && (e.key === "left" || e.key === "escape" || e.key === "backspace")) {
        e.stopPropagation();
        setPane("list");
      }
    },
    { priority: 1 },
  );

  return (
    // Children of the companion's clipping box don't shrink, so with an auto basis this view grows to the
    // whole page and the ScrollBox has nothing to scroll. basis-0 sizes it to the console instead.
    <Box className="flex-col grow basis-0">
      <Box className="flex-row grow basis-0">
        <Box className="flex-col shrink-0 px-2 gap-1" width={vp.cols < 90 ? 24 : 30} border borderTop={false} borderLeft={false} borderBottom={false} borderColor={theme.border}>
          <Box className="flex-row h-1 shrink-0 gap-1">
            <Text color={pane === "search" ? "accent" : "subtle"} wrap="nowrap">
              /
            </Text>
            <Input value={query} onChange={setQuery} focused={pane === "search"} placeholder="Search" onSubmit={() => setPane("list")} />
          </Box>
          <Select
            key={query}
            options={options}
            value={doc?.slug}
            focused={pane === "list"}
            limit={Math.max(4, vp.rows - 6)}
            onHighlight={(slug) => siteStore.set({ docSlug: slug })}
            onChange={(slug) => {
              siteStore.set({ docSlug: slug });
              setPane("content");
            }}
            emptyText="No matching docs"
          />
        </Box>
        <ScrollBox key={doc?.slug} focused={pane === "content"} className="grow" paddingX={2}>
          <Text bold color="fg">
            {doc?.title ?? ""}
          </Text>
          <Text color="muted" marginBottom={1}>
            {doc?.description ?? ""}
          </Text>
          <Markdown codeMaxHeight={16}>{markdown}</Markdown>
        </ScrollBox>
      </Box>
    </Box>
  );
}
