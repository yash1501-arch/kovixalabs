import type { ReactNode } from "react";
import { AppShell } from "../components/app-shell";

export default function IntegrationsLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
