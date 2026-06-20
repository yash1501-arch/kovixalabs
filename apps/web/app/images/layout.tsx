import type { ReactNode } from "react";
import { AppShell } from "../components/app-shell";
export default function ImagesLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
