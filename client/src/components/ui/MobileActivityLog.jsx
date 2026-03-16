import ActivityLog from "./ActivityLog.jsx";

export default function MobileActivityLog({ expanded, onClose }) {
  if (!expanded) return null;

  return (
    /* Log overlay — positioned below HUD bar, no backdrop so it stays open until toggled */
    <div
      className="fixed right-2 top-[44px] z-40 w-[260px] max-h-[200px] bg-gray-950/95 border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
    >
      <ActivityLog />
    </div>
  );
}
