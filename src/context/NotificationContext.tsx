import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  AlertOctagon,
  X,
  Sparkles,
} from 'lucide-react';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

type NotifyFn = (title: string, message?: string, duration?: number) => void;

interface NotificationContextValue {
  notifications: NotificationItem[];
  notify: {
    success: NotifyFn;
    info: NotifyFn;
    warning: NotifyFn;
    error: NotifyFn;
    custom: (item: Omit<NotificationItem, 'id'>) => void;
  };
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

// Audio and Haptic feedback helper
function playFeedbackTone(type: NotificationType) {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.09); // G5
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'info') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now); // E5
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'warning') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(392, now + 0.08);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.15);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc.start(now);
      osc.stop(now + 0.22);
    }
  } catch {
    // Audio is optional / fail gracefully
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(type === 'error' ? [30, 40, 30] : 20);
    }
  } catch {
    // Haptics optional
  }
}

// Global dispatcher for notifications outside react tree if needed
let globalNotifyHandler: ((item: Omit<NotificationItem, 'id'>) => void) | null = null;

export const globalNotify = {
  success: (title: string, message?: string, duration?: number) => {
    if (globalNotifyHandler) {
      globalNotifyHandler({ type: 'success', title, message, duration });
    }
  },
  info: (title: string, message?: string, duration?: number) => {
    if (globalNotifyHandler) {
      globalNotifyHandler({ type: 'info', title, message, duration });
    }
  },
  warning: (title: string, message?: string, duration?: number) => {
    if (globalNotifyHandler) {
      globalNotifyHandler({ type: 'warning', title, message, duration });
    }
  },
  error: (title: string, message?: string, duration?: number) => {
    if (globalNotifyHandler) {
      globalNotifyHandler({ type: 'error', title, message, duration });
    }
  },
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (item: Omit<NotificationItem, 'id'>) => {
      const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      const duration = item.duration ?? (item.type === 'error' ? 4000 : 3000);
      const newItem: NotificationItem = { ...item, id, duration };

      playFeedbackTone(item.type);

      setNotifications((prev) => [newItem, ...prev.slice(0, 4)]); // max 5 notifications at a time

      if (duration > 0) {
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  useEffect(() => {
    globalNotifyHandler = addNotification;
    return () => {
      globalNotifyHandler = null;
    };
  }, [addNotification]);

  const notify = {
    success: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'success', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'info', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'warning', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      addNotification({ type: 'error', title, message, duration }),
    custom: addNotification,
  };

  return (
    <NotificationContext.Provider value={{ notifications, notify, removeNotification }}>
      {children}
      {/* Floating Toast Notification Container */}
      <div
        className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[99999] flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2rem)] pointer-events-none"
        aria-live="polite"
        role="region"
      >
        {notifications.map((item) => (
          <NotificationToastItem
            key={item.id}
            item={item}
            onDismiss={() => removeNotification(item.id)}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

const NotificationToastItem: React.FC<{
  item: NotificationItem;
  onDismiss: () => void;
}> = ({ item, onDismiss }) => {
  const getStyle = () => {
    switch (item.type) {
      case 'success':
        return {
          card: 'bg-emerald-900/95 border-emerald-500/40 text-white shadow-emerald-950/40',
          iconBg: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          progress: 'bg-emerald-400',
        };
      case 'info':
        return {
          card: 'bg-slate-900/95 border-blue-500/40 text-white shadow-blue-950/40',
          iconBg: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
          icon: <Sparkles className="w-5 h-5 text-blue-400 shrink-0" />,
          progress: 'bg-blue-400',
        };
      case 'warning':
        return {
          card: 'bg-amber-950/95 border-amber-500/40 text-white shadow-amber-950/40',
          iconBg: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          progress: 'bg-amber-400',
        };
      case 'error':
        return {
          card: 'bg-rose-950/95 border-rose-500/40 text-white shadow-rose-950/40',
          iconBg: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
          icon: <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0" />,
          progress: 'bg-rose-400',
        };
    }
  };

  const style = getStyle();

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-xl border p-3.5 shadow-2xl backdrop-blur-md transition-all transform animate-in slide-in-from-top-3 fade-in duration-200 ${style.card}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg shrink-0 ${style.iconBg}`}>{style.icon}</div>
        <div className="flex-1 min-w-0 pr-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 leading-tight">
            {item.title}
          </h4>
          {item.message && (
            <p className="text-xs text-slate-300 mt-1 leading-relaxed break-words font-medium">
              {item.message}
            </p>
          )}
        </div>
        <button
          onClick={onDismiss}
          className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title="Tutup Notifikasi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Subtle bottom progress animation line */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10 overflow-hidden">
        <div
          className={`h-full ${style.progress}`}
          style={{
            animation: `shrinkWidth ${item.duration || 3000}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    // Fallback to global notify if called outside provider
    return {
      notifications: [],
      notify: globalNotify,
      removeNotification: () => {},
    };
  }
  return context;
};
