import React from 'react';
import { View } from '../types';
import { LayoutDashboard, CreditCard, PieChart, Sparkles, CalendarClock } from 'lucide-react';

interface NavbarProps {
  currentView: View;
  onChangeView: (view: View) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, onChangeView }) => {
  const navItems = [
    { id: View.DASHBOARD, label: 'Resumen', icon: LayoutDashboard },
    { id: View.DEBTS, label: 'Mis Deudas', icon: CreditCard },
    { id: View.PROJECTION, label: 'Proyección', icon: CalendarClock },
    { id: View.BUDGET, label: 'Presupuesto', icon: PieChart },
    { id: View.ADVISOR, label: 'Asesor AI', icon: Sparkles },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:relative md:border-t-0 md:bg-transparent md:mb-8 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-around md:justify-start md:space-x-4 py-3 md:py-4">
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`flex flex-col md:flex-row items-center justify-center p-2 rounded-lg transition-all ${
                  isActive 
                    ? 'text-brand-600 md:bg-white md:shadow-md transform md:-translate-y-1' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50/50'
                }`}
              >
                <item.icon className={`w-6 h-6 md:w-5 md:h-5 ${isActive ? 'mb-1 md:mb-0 md:mr-2' : 'mb-1 md:mb-0'}`} />
                <span className={`text-[10px] md:text-sm font-medium ${isActive ? 'block' : 'hidden md:block'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};