import React, { useState } from 'react';
import { usePWA } from '../hooks/usePWA';
import { FiDownload, FiX, FiWifiOff, FiShare } from 'react-icons/fi';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isOnline, installPWA } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 right-4 z-[9999] flex items-center gap-3 px-4 py-3 bg-red-950/90 border border-red-500/30 text-red-200 rounded-xl backdrop-blur-md shadow-2xl animate-fade-in">
        <FiWifiOff className="w-5 h-5 text-red-400 animate-pulse" />
        <div>
          <p className="text-xs font-semibold">Offline Mode</p>
          <p className="text-[11px] text-red-300/80">Cached view active. Reconnect for real-time sync.</p>
        </div>
      </div>
    );
  }

  if (isInstalled || dismissed) return null;

  // iOS Safari specific instructions
  if (isIOS) {
    return (
      <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full p-4 bg-slate-900/95 backdrop-blur-xl border border-blue-500/20 rounded-2xl shadow-2xl text-white transition-all duration-300 animate-slide-up">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
              <FiShare className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-100">Install on iPhone / iPad</h4>
              <p className="text-xs text-slate-400 mt-0.5">
                Tap <span className="inline-flex items-center text-blue-400 font-semibold px-1 py-0.5 bg-blue-950/50 rounded"><FiShare className="w-3 h-3 mr-0.5 inline" /> Share</span> in Safari, then select <span className="font-semibold text-slate-200">Add to Home Screen</span>.
              </p>
            </div>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
            title="Dismiss"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full p-4 bg-slate-900/90 backdrop-blur-xl border border-blue-500/20 rounded-2xl shadow-2xl text-white transition-all duration-300 animate-slide-up">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0 text-blue-400">
            <FiDownload className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Install Mercure HRMS</h4>
            <p className="text-xs text-slate-400 mt-0.5">Install app for fast desktop & mobile access</p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          title="Dismiss"
        >
          <FiX className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          onClick={() => setDismissed(true)}
          className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
        >
          Not Now
        </button>
        <button
          onClick={installPWA}
          className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20 transition-all flex items-center gap-1.5"
        >
          <FiDownload className="w-3.5 h-3.5" />
          Install App
        </button>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;

