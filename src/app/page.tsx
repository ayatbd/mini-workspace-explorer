import { WorkspaceShell } from "@/components/workspace-shell";
import { WorkspaceProvider } from "@/state/workspace-context";

export default function Home() {
  return (
    <WorkspaceProvider>
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}
