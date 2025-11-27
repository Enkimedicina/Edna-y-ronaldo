import React from 'react';
import { View, UserProfile } from '../types';
import { LayoutDashboard, CreditCard, PieChart, Sparkles, CalendarClock, User, Bell, Menu, X } from 'lucide-react';

interface NavbarProps {
  currentView: View;
  onChangeView: (view: View) => void;
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  pushEnabled: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  currentView, 
  onChangeView, 
  currentUser, 
  onUserChange,
  pushEnabled 
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: View.DASHBOARD, label: 'Resumen', icon: LayoutDashboard },
    { id: View.DEBTS, label: 'Mis Deudas', icon: CreditCard },
    { id: View.PROJECTION, label: 'Proyección', icon: CalendarClock },
    { id: View.BUDGET, label: 'Presupuesto', icon: PieChart },
    { id: View.ADVISOR, label: 'Asesor AI', icon: Sparkles },
  ];

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center gap-2 cursor-pointer" onClick={() => onChangeView(View.DASHBOARD)}>
              <div className="bg-brand-600 p-1.5 rounded-lg">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight">Finanzas<span className="text-brand-400">E&R</span></span>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex ml-10 space-x-1">
              {navItems.map((item) => {
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onChangeView(item.id)}
                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      isActive 
                        ? 'bg-slate-800 text-white shadow-sm' 
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <item.icon className={`w-4 h-4 mr-2 ${isActive ? 'text-brand-400' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Side: User & Notifications */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Status Indicator */}
            <div className="flex items-center space-x-2 text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-700">
               <span className={`w-2 h-2 rounded-full ${pushEnabled ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`} />
               <span>{pushEnabled ? 'Sincronizado' : 'Offline'}</span>
            </div>

            <div className="h-6 w-px bg-slate-700 mx-2"></div>

            {/* User Selector */}
            <div className="flex items-center space-x-2">
               <div className="text-right hidden lg:block">
                  <p className="text-sm font-medium text-white leading-none">Hola, {currentUser}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString('es-MX', { month: 'long', day: 'numeric' })}</p>
               </div>
               <div className="relative group">
                  <button className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-700 transition-colors">
                      <User className="w-5 h-5 text-brand-400" />
                      <span className="md:hidden lg:inline">{currentUser}</span>
                  </button>
                  {/* Dropdown logic simulated with select for simplicity/robustness without external libs */}
                  <select 
                    value={currentUser}
                    onChange={(e) => onUserChange(e.target.value as UserProfile)}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  >
                    <option value="Edna">Cambiar a Edna</option>
                    <option value="Ronaldo">Cambiar a Ronaldo</option>
                  </select>
               </div>
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 focus:outline-none"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-slate-800 border-t border-slate-700 pb-4">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onChangeView(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center w-full px-3 py-2 rounded-md text-base font-medium ${
                  currentView === item.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </button>
            ))}
          </div>
          <div className="pt-4 pb-3 border-t border-slate-700 px-4">
             <div className="flex items-center px-5">
                <div className="flex-shrink-0">
                   <User className="h-10 w-10 rounded-full bg-slate-600 p-2" />
                </div>
                <div className="ml-3">
                   <div className="text-base font-medium leading-none text-white">{currentUser}</div>
                   <div className="text-sm font-medium leading-none text-slate-400 mt-1">Usuario Activo</div>
                </div>
             </div>
             <div className="mt-3 px-2">
                <select 
                    value={currentUser}
                    onChange={(e) => onUserChange(e.target.value as UserProfile)}
                    className="block w-full w-full bg-slate-900 border border-slate-600 text-white py-2 px-3 rounded-md focus:outline-none"
                >
                    <option value="Edna">Ver como Edna</option>
                    <option value="Ronaldo">Ver como Ronaldo</option>
                </select>
             </div>
          </div>
        </div>
      )}
    </header>
  );
};