import { useState } from 'react';
import ActivityLog from './ActivityLog.jsx';

export default function MobileActivityLog() {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`fixed left-2 bottom-[220px] z-40 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition ${
          expanded ? 'bg-gray-700 text-white' : 'bg-gray-800/80 text-gray-400 hover:text-white'
        }`}
        title="Activity Log"
      >
        <span className="text-[14px]">{'\u{1F4DC}'}</span>
      </button>

      {/* Expanded log overlay */}
      {expanded && (
        <div
          className="fixed left-2 bottom-[260px] z-40 w-[260px] max-h-[200px] bg-gray-950/95 border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <ActivityLog />
        </div>
      )}

      {/* Backdrop to close */}
      {expanded && (
        <div className="fixed inset-0 z-30" onClick={() => setExpanded(false)} />
      )}
    </>
  );
}
