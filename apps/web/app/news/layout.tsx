import type { ReactNode } from "react";
import { AppShell } from "../components/app-shell";
export default function NewsLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
