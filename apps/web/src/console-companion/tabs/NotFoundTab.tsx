import type { ReactNode } from "react";
import { Box, Text, useInput } from "@textjs/react";
import { navigate } from "../../router";

/** Next.js's default 404, in the console. */
export function NotFoundTab(): ReactNode {
  useInput((e) => {
    if (e.key !== "return" || e.ctrl || e.meta || e.alt) return;
    e.stopPropagation();
    navigate("/");
  });
  return (
    <Box className="flex-row grow items-center justify-center">
      <Text bold color="fg" wrap="nowrap">
        404
      </Text>
      <Text color="subtle" wrap="nowrap">
        {" │ "}
      </Text>
      <Text color="fg" wrap="nowrap">
        This page could not be found.
      </Text>
    </Box>
  );
}
