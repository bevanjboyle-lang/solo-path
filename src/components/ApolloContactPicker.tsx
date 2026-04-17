import { Loader2 } from "lucide-react";
import type { ApolloQuery, ApolloContact } from "@/types/apollo";

interface ApolloContactPickerProps {
  apolloQuery: ApolloQuery;
  onContactSelected: (contact: ApolloContact) => void;
  onClose: () => void;
}

export default function ApolloContactPicker({ apolloQuery, onContactSelected, onClose }: ApolloContactPickerProps) {
  // apolloQuery + onContactSelected wired in Credit 2
  void apolloQuery;
  void onContactSelected;
  return (
    <div
      className="mt-2 rounded-lg border border-border p-3 space-y-2"
      style={{
        borderLeft: "3px solid #2ECDB0",
        background: "hsl(var(--surface-card))",
      }}
    >
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Finding contacts...</span>
      </div>
      <div className="pt-1 border-t border-border">
        <button
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
