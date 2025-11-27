import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { DebtManager } from './components/DebtManager';
import { BudgetManager } from './components/BudgetManager';
import { ProjectionTable } from './components/ProjectionTable';
import { AIAdvisor } from './components/AIAdvisor';
import { FinancialState, View, Debt, Income, Expense, NotificationItem, UserProfile } from './types';
import { Bell, User } from 'lucide-react';

// Simple ID generator since we can't add external packages easily
const generateId = () => Math.random().toString(36).substr(2, 9);

const INITIAL_STATE: FinancialState = {
  debts: [
    { id: '1', name: 'BBVA', initialAmount: 50000, currentAmount: 45000, minPayment: 2500, color: '#1e40af', dueDay: 15, interestRate: 45 },
    { id: '2', name: 'Plata Card', initialAmount: 15000, currentAmount: 12000, minPayment: 1000, color: '#ec4899', dueDay: 5, interestRate: 65 },
    { id: '3', name: 'Fovissste', initialAmount: 800000, currentAmount: 750000, minPayment: 5000, color: '#f59e0b', dueDay: 28, interestRate: 11 },
  ],
  expenses: [
    { id: '1', name: 'Luz', amount: 500, category: 'Services', frequency: 'Monthly', dueDay: 10 },
    { id: '2', name: 'Internet', amount: 600, category: 'Services', frequency: 'Monthly', dueDay: 5 },
    { id: '3', name: 'Comida Semanal', amount: 1000, category: 'Food', frequency: 'Weekly', dueDay: 1 }, // Lunes
    { id: '4', name: 'Niñera', amount: 1500, category: 'Nanny', frequency: 'Bi-weekly', dueDay: 15 },
  ],
  incomes: [
    { id: '1', source: 'Edna', amount: 18000 },
    { id: '2', source: 'Ronaldo', amount: 20000 },
  ],
  payments: [],
  history: [
    { date: '2023-10', totalDebt: 865000 },
    { date: '2023-11', totalDebt: 855000 },
    { date: '2023-12', totalDebt: 840000 },
    { date: '2024-01', totalDebt: 825000 },
    { date: '2024-02', totalDebt: 807000 },
  ]
};

const App: React.FC = () => {
  const [data, setData] = useState<FinancialState>(() => {
    const saved = localStorage.getItem('finances_er_v1');
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [currentUser, setCurrentUser] = useState<UserProfile>('Edna');
  const [pushEnabled, setPushEnabled] = useState(false);

  // --- SYNC & PERSISTENCE ---

  // Persist data whenever it changes
  useEffect(() => {
    localStorage.setItem('finances_er_v1', JSON.stringify(data));
  }, [data]);

  // Listen for storage changes (Sync across tabs/windows)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'finances_er_v1' && e.newValue) {
        console.log("Syncing data from another tab...");
        setData(JSON.parse(e.newValue));
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // --- NOTIFICATIONS SYSTEM ---

  // Request Notification Permissions
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().then(permission => {
        setPushEnabled(permission === 'granted');
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setPushEnabled(true);
    }
  }, []);

  const sendSystemNotification = useCallback((title: string, body: string) => {
    if (pushEnabled && 'Notification' in window && document.visibilityState === 'hidden') {
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/2933/2933116.png' // Generic money icon
      });
    }
  }, [pushEnabled]);

  // Calculate internal notifications based on data and date
  useEffect(() => {
    const calculateNotifications = () => {
      const today = new Date();
      const currentDay = today.getDate(); // 1-31
      const currentDayOfWeek = today.getDay(); // 0-6 (0=Sunday)
      const notes: NotificationItem[] = [];

      // 1. Monthly Check-in (Days 1-5)
      if (currentDay <= 3) {
        notes.push({
          id: 'monthly-checkin',
          type: 'info',
          title: 'Inicio de Mes',
          message: 'Es momento de registrar tus ingresos del mes para actualizar el presupuesto.'
        });
      }

      // 2. Debt Due Dates
      data.debts.forEach(debt => {
        if (debt.currentAmount > 0 && debt.dueDay) {
          const dueDay = debt.dueDay;
          
          if (currentDay === dueDay) {
             notes.push({
               id: `debt-due-${debt.id}`,
               type: 'warning',
               title: '¡Vencimiento Hoy!',
               message: `El pago mínimo de ${debt.name} vence hoy. Evita recargos.`
             });
             // Trigger push only if not already notified logic implies sophisticated state, 
             // but here we just ensure it exists in the list.
          } else if (dueDay > currentDay && dueDay <= currentDay + 3) {
             const daysLeft = dueDay - currentDay;
             notes.push({
               id: `debt-upcoming-${debt.id}`,
               type: 'info',
               title: 'Pago Próximo',
               message: `El pago de ${debt.name} es en ${daysLeft} días.`
             });
          }
        }
      });

      // 3. Expense Reminders (Fixed Expenses)
      data.expenses.forEach(exp => {
          let shouldNotify = false;
          let msg = '';

          // Monthly
          if (!exp.frequency || exp.frequency === 'Monthly') {
              if (exp.dueDay && currentDay === exp.dueDay) {
                  shouldNotify = true;
                  msg = `Hoy corresponde pagar/apartar: ${exp.name}.`;
              }
          }
          
          // Weekly
          if (exp.frequency === 'Weekly') {
              if (exp.dueDay !== undefined && currentDayOfWeek === exp.dueDay) {
                  shouldNotify = true;
                  msg = `Semanal: Hoy toca el gasto de ${exp.name}.`;
              }
          }

          // Bi-weekly (Quincenal)
          if (exp.frequency === 'Bi-weekly') {
              // Check if today matches dueDay OR dueDay + 15
              if (exp.dueDay && (currentDay === exp.dueDay || currentDay === exp.dueDay + 15)) {
                  shouldNotify = true;
                  msg = `Quincenal: Hoy corresponde el gasto de ${exp.name}.`;
              }
          }

          if (shouldNotify) {
              notes.push({
                  id: `exp-${exp.id}-${today.getTime()}`, 
                  type: 'info',
                  title: 'Gasto Fijo',
                  message: msg
              });
          }
      });
      
      setNotifications(notes);
    };

    calculateNotifications();
    // Re-check every minute to ensure date changes are caught
    const interval = setInterval(calculateNotifications, 60000); 
    return () => clearInterval(interval);

  }, [data]);


  // --- ACTIONS ---

  const handleAddDebt = (debt: Omit<Debt, 'id'>) => {
    const newDebt = { ...debt, id: generateId() };
    setData(prev => ({ ...prev, debts: [...prev.debts, newDebt] }));
    sendSystemNotification('Nueva Deuda', `${currentUser} agregó la deuda "${debt.name}"`);
  };

  const handleUpdateDebt = (updatedDebt: Debt) => {
    setData(prev => ({
      ...prev,
      debts: prev.debts.map(d => d.id === updatedDebt.id ? updatedDebt : d)
    }));
  };

  const handleDeleteDebt = (id: string) => {
    setData(prev => ({ ...prev, debts: prev.debts.filter(d => d.id !== id) }));
  };

  const handleMakePayment = (debtId: string, amount: number) => {
    const date = new Date().toISOString().split('T')[0];
    const debtName = data.debts.find(d => d.id === debtId)?.name || 'Deuda';
    
    setData(prev => {
      const updatedDebts = prev.debts.map(d => {
        if (d.id === debtId) {
          return { ...d, currentAmount: Math.max(0, d.currentAmount - amount) };
        }
        return d;
      });
      
      const newTotalDebt = updatedDebts.reduce((acc, d) => acc + d.currentAmount, 0);
      
      // Update history if it's a new month or just append for demo
      const newHistory = [...prev.history];
      const lastHist = newHistory[newHistory.length - 1];
      if (lastHist && lastHist.date === date.substring(0, 7)) {
          lastHist.totalDebt = newTotalDebt; // Update current month
      } else {
          newHistory.push({ date: date, totalDebt: newTotalDebt });
      }

      return {
        ...prev,
        debts: updatedDebts,
        payments: [...prev.payments, { id: generateId(), debtId, amount, date, recordedBy: currentUser }],
        history: newHistory
      };
    });

    // Send visual feedback and system notification
    sendSystemNotification('Pago Registrado', `${currentUser} pagó $${amount} a ${debtName}`);
  };

  // Budget Actions
  const handleAddIncome = (income: Omit<Income, 'id'>) => {
    setData(prev => ({ ...prev, incomes: [...prev.incomes, { ...income, id: generateId() }] }));
  };

  const handleRemoveIncome = (id: string) => {
    setData(prev => ({ ...prev, incomes: prev.incomes.filter(i => i.id !== id) }));
  };

  const handleAddExpense = (expense: Omit<Expense, 'id'>) => {
    setData(prev => ({ ...prev, expenses: [...prev.expenses, { ...expense, id: generateId() }] }));
  };

  const handleRemoveExpense = (id: string) => {
    setData(prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }));
  };

  const renderView = () => {
    switch(currentView) {
      case View.DASHBOARD:
        return <Dashboard data={data} notifications={notifications} />;
      case View.DEBTS:
        return (
          <DebtManager 
            data={data} 
            onAddDebt={handleAddDebt}
            onUpdateDebt={handleUpdateDebt}
            onDeleteDebt={handleDeleteDebt}
            onMakePayment={handleMakePayment}
          />
        );
      case View.PROJECTION:
        return <ProjectionTable data={data} />;
      case View.BUDGET:
        return (
          <BudgetManager 
            data={data}
            onAddIncome={handleAddIncome}
            onRemoveIncome={handleRemoveIncome}
            onAddExpense={handleAddExpense}
            onRemoveExpense={handleRemoveExpense}
          />
        );
      case View.ADVISOR:
        return <AIAdvisor data={data} />;
      default:
        return <Dashboard data={data} notifications={notifications} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 md:pb-0">
      <div className="bg-slate-900 text-white pb-12 pt-8 px-4 md:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Finanzas Edna & Ronaldo</h1>
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${pushEnabled ? 'bg-green-500' : 'bg-red-500'}`} />
              {pushEnabled ? 'Sincronización activa' : 'Notificaciones desactivadas'}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
             <div className="bg-slate-800 rounded-full px-4 py-2 flex items-center space-x-2 border border-slate-700">
                <User className="w-4 h-4 text-brand-400" />
                <span className="text-sm text-slate-300 mr-2">Soy:</span>
                <select 
                  value={currentUser}
                  onChange={(e) => setCurrentUser(e.target.value as UserProfile)}
                  className="bg-transparent text-white font-bold outline-none cursor-pointer"
                >
                  <option value="Edna" className="text-slate-900">Edna</option>
                  <option value="Ronaldo" className="text-slate-900">Ronaldo</option>
                </select>
             </div>
             
             <div className="hidden md:block text-right">
                <p className="text-xs text-slate-500">{new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-8">
        <Navbar currentView={currentView} onChangeView={setCurrentView} />
        <main className="mt-6 md:mt-0">
          {renderView()}
        </main>
      </div>
    </div>
  );
};

export default App;