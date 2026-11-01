import { useEffect, type ReactNode } from "react";
import { useRouter } from "@textjs/app/navigation";

/** The shell renders the sign in screen whenever there are no credentials. */
export default function Page(): ReactNode {
  const router = useRouter();
  useEffect(() => router.replace("/shop"), [router]);
  return null;
}
