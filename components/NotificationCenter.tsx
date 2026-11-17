
import React from 'react';
import { Bell, Info, AlertTriangle, CheckCircle2, X } from 'lucide-react';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning';
  title: string;
  message: string;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ notifications, onRemove }) => {
  return (
    <div className="fixed bottom-8 right-8 z-[100] space-y-4 w-96">
      {notifications.map((n) => (
        <div 
          key={n.id} 
          className="bg-white rounded-[2rem] p-6 shadow-2xl border border-slate-100 flex items-start gap-4 animate-in slide-in-from-right-10 duration-500"
        >
          <div className={`p-2 rounded-xl shrink-0 ${
            n.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
            n.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
          }`}>
            {n.type === 'success' ? <CheckCircle2 size={20} /> :
             n.type === 'warning' ? <AlertTriangle size={20} /> : <Info size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <h5 className="font-black text-slate-800 text-sm">{n.title}</h5>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">{n.message}</p>
          </div>
          <button 
            onClick={() => onRemove(n.id)}
            className="p-1 text-slate-300 hover:text-slate-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default NotificationCenter;
