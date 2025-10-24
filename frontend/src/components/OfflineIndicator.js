import React from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff, Clock } from "lucide-react";
import { useOffline } from "../App";

const OfflineIndicator = () => {
  const { isOnline, pendingActions } = useOffline();

  if (isOnline && pendingActions.length === 0) {
    return null; // Don't show anything when online and no pending actions
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
      <div className="px-4 py-2 flex items-center justify-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="w-4 h-4 text-red-600" />
            <Badge variant="destructive" className="text-xs">
              Offline Mode
            </Badge>
            <span className="text-xs text-slate-600">Changes will sync when connected</span>
          </>
        ) : pendingActions.length > 0 ? (
          <>
            <Clock className="w-4 h-4 text-orange-600" />
            <Badge variant="secondary" className="text-xs">
              Syncing {pendingActions.length} action{pendingActions.length > 1 ? 's' : ''}
            </Badge>
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 text-green-600" />
            <Badge variant="default" className="text-xs bg-green-600">
              Online
            </Badge>
          </>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;