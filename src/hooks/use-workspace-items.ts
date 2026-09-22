import { starterItems } from "@/lib/filesystem";

export function useWorkspaceItems() {
    return {
        items: starterItems,
        isLoading: false,
        error: null,
    };
}
