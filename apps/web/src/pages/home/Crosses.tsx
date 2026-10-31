import type { ReactNode } from "react";

export function Crosses(): ReactNode {
  return (
    <>
      <span className="cross tl" />
      <span className="cross tr" />
      <span className="cross bl" />
      <span className="cross br" />
    </>
  );
}
