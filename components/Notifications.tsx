import React from 'react';
import { NotificationItem } from '../types';
import { AlertCircle, Info, X } from 'lucide-react';

interface NotificationsProps {
  items: NotificationItem[];
}

export const NotificationsList: React.FC<NotificationsProps> = ({ items }) => {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3 mb-6 animate-fadeIn">
      {items.map(item => (
        <div 
          key={item.id} 
          className={`p-4 rounded-lg border shadow-sm flex items-start ${
            item.type === 'warning' 
              ? 'bg-orange-50 border-orange-200 text-orange-900' 
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          <div className={`mr-3 mt-0.5 ${item.type === 'warning' ? 'text-orange-500' : 'text-blue-500'}`}>
            {item.type === 'warning' ? <AlertCircle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-sm mb-0.5">{item.title}</h4>
            <p className="text-sm opacity-90 leading-snug">{item.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
};