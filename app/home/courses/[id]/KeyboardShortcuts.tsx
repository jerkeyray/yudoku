"use client";

const shortcuts = [
  { key: "N", label: "Next" },
  { key: "P", label: "Previous" },
  { key: "M", label: "Mark complete" },
  { key: "B", label: "Bookmark" },
  { key: "E", label: "Toggle notes" },
  { key: "Esc", label: "Close panel" },
  { key: "?", label: "This help" },
];

export default function KeyboardShortcuts({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl p-6 shadow-2xl max-w-xs w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-medium text-foreground mb-4">
          Keyboard Shortcuts
        </h3>
        <div className="space-y-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{s.label}</span>
              <kbd className="text-xs font-mono px-2 py-1 rounded bg-muted text-foreground border border-border">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
