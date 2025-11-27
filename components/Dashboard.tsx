import React, { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine, ComposedChart, Line } from 'recharts';
import { FinancialState, NotificationItem, Debt } from '../types';
import { TrendingDown, TrendingUp, DollarSign, Wallet, Target, ArrowRight, Lightbulb, Zap, Trophy, Calendar, PiggyBank } from 'lucide-react';
import { NotificationsList } from './Notifications';

interface DashboardProps {
  data: FinancialState;
  notifications: NotificationItem[];
}

type StrategyType = 'snowball' | 'avalanche';

export const Dashboard: React.FC<DashboardProps> = ({ data, notifications }) => {
  const [strategy, setStrategy] = useState<StrategyType | null>(null);

  const totalDebt = data.debts.reduce((acc, d) => acc + d.currentAmount, 0);
  const initialTotalDebt = data.debts.reduce((acc, d) => acc + d.initialAmount, 0);
  const totalPaidOff = initialTotalDebt - totalDebt;

  const totalIncome = data.incomes.reduce((acc, i) => acc + i.amount, 0);
  const totalExpenses = data.expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalMinPayments = data.debts.reduce((acc, d) => acc + d.minPayment, 0);
  
  const availableMoney = totalIncome - totalExpenses - totalMinPayments;
  const paymentCapacity = availableMoney + totalMinPayments; // Total money available to attack debt
  
  // Format currency
  const fmt = (num: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(num);

  const debtBreakdown = data.debts.map(d => ({
    name: d.name,
    amount: d.currentAmount,
    color: d.color
  }));

  // Analyze Debts for Recommendation
  const analysis = useMemo(() => {
    const activeDebts = data.debts.filter(d => d.currentAmount > 0);
    if (activeDebts.length === 0) return null;

    const maxInterestDebt = [...activeDebts].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))[0];
    const minBalanceDebt = [...activeDebts].sort((a, b) => a.currentAmount - b.currentAmount)[0];

    let recommended: StrategyType = 'avalanche';
    let reason = '';

    const maxInterest = maxInterestDebt.interestRate || 0;
    
    if (maxInterest > 40) {
      recommended = 'avalanche';
      reason = `Tu deuda "${maxInterestDebt.name}" tiene un interés muy alto (${maxInterest}%). Atacarla primero te ahorrará mucho dinero.`;
    } else if (minBalanceDebt.currentAmount < 5000) {
      recommended = 'snowball';
      reason = `Tienes una deuda pequeña "${minBalanceDebt.name}" ($${minBalanceDebt.currentAmount}). Eliminarla rápido te dará motivación inmediata.`;
    } else {
      recommended = 'avalanche';
      reason = "Matemáticamente, pagar la deuda con mayor interés siempre ahorra más dinero a largo plazo.";
    }

    return { recommended, reason, maxInterestDebt, minBalanceDebt };
  }, [data.debts]);

  const currentStrategy = strategy || analysis?.recommended || 'avalanche';

  // --- PROJECTION ENGINE ---
  const projection = useMemo(() => {
    if (totalDebt === 0) return null;
    
    // Deep clone debts to simulate
    let simDebts = data.debts.map(d => ({...d}));
    let month = 0;
    let currentTotalDebt = totalDebt;
    let accumulatedWealth = 0; // The "Green" part
    const projectionData = [];
    const maxMonths = 60; // Limit projection to 5 years
    
    // Add current state
    projectionData.push({
        month: 'Hoy',
        deuda: currentTotalDebt,
        riqueza: 0,
        index: 0
    });

    while ((currentTotalDebt > 0 || month < 12) && month < maxMonths) { // Continue a bit after debt is 0 to show wealth
      month++;
      let monthlyBudget = paymentCapacity; // The total firepower (Min payments + Extra)

      // 1. Apply Interest
      simDebts.forEach(d => {
        if (d.currentAmount > 0 && d.interestRate) {
           const monthlyRate = (d.interestRate / 100) / 12;
           d.currentAmount += d.currentAmount * monthlyRate;
        }
      });

      // 2. Pay Minimums first
      simDebts.forEach(d => {
        if (d.currentAmount > 0) {
           const payment = Math.min(d.currentAmount, d.minPayment);
           d.currentAmount -= payment;
           monthlyBudget -= payment;
        }
      });

      // 3. Pay Extra with remaining budget (Strategy)
      if (monthlyBudget > 0) {
          // Sort based on strategy
          const activeDebts = simDebts.filter(d => d.currentAmount > 0);
          
          if (activeDebts.length > 0) {
            let targetDebt;
            if (currentStrategy === 'snowball') {
                 targetDebt = activeDebts.sort((a, b) => a.currentAmount - b.currentAmount)[0];
            } else {
                 targetDebt = activeDebts.sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))[0];
            }

            // Apply all remaining budget to target
            const extraPayment = Math.min(targetDebt.currentAmount, monthlyBudget);
            targetDebt.currentAmount -= extraPayment;
            monthlyBudget -= extraPayment;
          } else {
            // No debts left! This money goes to Wealth/Savings
            accumulatedWealth += monthlyBudget;
          }
      }

      currentTotalDebt = simDebts.reduce((acc, d) => acc + d.currentAmount, 0);
      
      // If we still have budget left (debts finished mid-calculation), add to wealth
      if (currentTotalDebt === 0 && monthlyBudget > 0) {
          accumulatedWealth += monthlyBudget;
      }

      projectionData.push({
          month: `Mes ${month}`,
          deuda: Math.max(0, Math.round(currentTotalDebt)),
          riqueza: Math.round(accumulatedWealth),
          index: month
      });
    }

    const debtFreeMonth = projectionData.find(p => p.deuda === 0)?.index || maxMonths;
    const debtFreeDate = new Date();
    debtFreeDate.setMonth(debtFreeDate.getMonth() + debtFreeMonth);

    return { 
        data: projectionData, 
        debtFreeInMonths: debtFreeMonth,
        debtFreeDate: debtFreeDate 
    };
  }, [data.debts, paymentCapacity, currentStrategy, totalDebt]);


  const getPriorityDebt = (): Debt | null => {
    const activeDebts = data.debts.filter(d => d.currentAmount > 0);
    if (activeDebts.length === 0) return null;

    if (currentStrategy === 'snowball') {
      return [...activeDebts].sort((a, b) => a.currentAmount - b.currentAmount)[0];
    } else {
      return [...activeDebts].sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0))[0];
    }
  };

  const priorityDebt = getPriorityDebt();

  // Prepare History Data for "Paid vs Owed"
  const historyDataWithPaid = data.history.map(h => ({
    ...h,
    paid: Math.max(0, initialTotalDebt - h.totalDebt) // Calculate how much was paid off based on initial
  }));
  // Add current state to history chart
  const currentHistoryPoint = {
      date: 'Hoy',
      totalDebt: totalDebt,
      paid: totalPaidOff
  };
  const finalHistoryData = [...historyDataWithPaid, currentHistoryPoint];

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Notifications Section */}
      <NotificationsList items={notifications} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Debt Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-100 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-110 transition-transform"></div>
          <div>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Deuda Pendiente</p>
            <h2 className="text-3xl font-bold text-danger-600 mt-1">{fmt(totalDebt)}</h2>
          </div>
          <div className="mt-4 flex items-center text-danger-500 text-sm font-medium">
            <TrendingDown className="w-4 h-4 mr-1" />
            <span>Falta pagar {((totalDebt / initialTotalDebt) * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
             <div className="bg-danger-500 h-full transition-all duration-1000" style={{width: `${(totalDebt / initialTotalDebt) * 100}%`}}></div>
          </div>
        </div>

        {/* Progress Card (Green) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-110 transition-transform"></div>
          <div>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Total Pagado</p>
            <h2 className="text-3xl font-bold text-brand-600 mt-1">{fmt(totalPaidOff)}</h2>
          </div>
          <div className="mt-4 flex items-center text-brand-600 text-sm font-medium">
            <Trophy className="w-4 h-4 mr-1" />
            <span>Progreso: {((totalPaidOff / initialTotalDebt) * 100).toFixed(1)}%</span>
          </div>
           <div className="w-full bg-slate-100 h-1.5 mt-4 rounded-full overflow-hidden">
             <div className="bg-brand-500 h-full transition-all duration-1000" style={{width: `${(totalPaidOff / initialTotalDebt) * 100}%`}}></div>
          </div>
        </div>

        {/* Income Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Ingresos Mes</p>
            <h2 className="text-3xl font-bold text-slate-800 mt-1">{fmt(totalIncome)}</h2>
          </div>
          <div className="mt-4 flex items-center text-slate-400 text-sm">
            <Wallet className="w-4 h-4 mr-1" />
            <span>Capacidad Total</span>
          </div>
        </div>

        {/* Available Money Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">Flujo Libre</p>
            <h2 className={`text-3xl font-bold mt-1 ${availableMoney >= 0 ? 'text-brand-600' : 'text-danger-600'}`}>
              {fmt(availableMoney)}
            </h2>
          </div>
          <div className="mt-4 flex items-center text-slate-500 text-xs">
            <DollarSign className="w-3 h-3 mr-1" />
            <span>Para deuda extra o ahorro</span>
          </div>
        </div>
      </div>

      {/* PROJECTION CHART (The "Green Light") */}
      {projection && totalDebt > 0 && (
        <div className="bg-slate-900 rounded-2xl p-6 md:p-8 shadow-xl text-white relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>
           <div className="absolute bottom-0 left-0 w-64 h-64 bg-red-500 rounded-full blur-[100px] opacity-10 pointer-events-none"></div>

           <div className="relative z-10 grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                 <div>
                    <h3 className="text-2xl font-bold flex items-center">
                        <Calendar className="w-6 h-6 mr-2 text-brand-400" />
                        Tu Libertad Financiera
                    </h3>
                    <p className="text-slate-400 mt-2">
                        Manteniendo tu ritmo actual de pagos de <span className="text-white font-bold">{fmt(paymentCapacity)}</span> al mes:
                    </p>
                 </div>

                 <div className="bg-white/10 rounded-xl p-5 border border-white/10 backdrop-blur-sm">
                    <p className="text-sm text-slate-300 uppercase tracking-wide">Estarás libre de deudas en</p>
                    <div className="flex items-baseline mt-1">
                        <span className="text-4xl font-bold text-white">{projection.debtFreeInMonths}</span>
                        <span className="text-xl ml-2 text-slate-300">meses</span>
                    </div>
                    <p className="text-brand-400 font-bold mt-2 flex items-center">
                        <Target className="w-4 h-4 mr-1" />
                        Fecha: {projection.debtFreeDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
                    </p>
                 </div>

                 <div className="p-4 rounded-lg bg-gradient-to-r from-slate-800 to-slate-800/50 border border-slate-700">
                    <div className="flex items-start">
                        <PiggyBank className="w-5 h-5 text-green-400 mt-1 mr-3 flex-shrink-0" />
                        <div>
                            <p className="font-bold text-green-400 text-sm">El Efecto "Bola de Nieve"</p>
                            <p className="text-xs text-slate-400 mt-1">
                                En el gráfico verás cómo la línea roja (Deuda) desaparece. Una vez ocurra, ¡la línea verde (Tu Riqueza) se dispara porque ese dinero ahora es para TI!
                            </p>
                        </div>
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-2 h-[350px]">
                 <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={projection.data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorDeudaProj" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRiquezaProj" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="month" stroke="#94a3b8" tick={{fontSize: 12}} minTickGap={30} />
                        <YAxis stroke="#94a3b8" tickFormatter={(val) => `$${val/1000}k`} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                            formatter={(value: number, name: string) => [fmt(value), name === 'deuda' ? 'Deuda Restante' : 'Riqueza Acumulada']}
                            labelStyle={{ color: '#cbd5e1' }}
                        />
                        <Area type="monotone" dataKey="deuda" stroke="#ef4444" fill="url(#colorDeudaProj)" strokeWidth={3} name="deuda" animationDuration={2000} />
                        <Area type="monotone" dataKey="riqueza" stroke="#22c55e" fill="url(#colorRiquezaProj)" strokeWidth={3} name="riqueza" animationDuration={2000} />
                        <ReferenceLine y={0} stroke="#475569" />
                    </ComposedChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      )}

      {/* Strategy Section */}
      {priorityDebt && availableMoney > 0 && analysis && (
        <div className="bg-white rounded-xl p-1 shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 bg-slate-50 border-b border-slate-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-xl text-slate-800 flex items-center">
                        <Zap className="w-5 h-5 text-yellow-500 mr-2" />
                        Estrategia de Pago Mensual
                    </h3>
                    <p className="text-slate-500 text-sm">
                        Tienes <span className="font-bold text-green-600">{fmt(availableMoney)}</span> extra este mes. ¿Cómo usarlos?
                    </p>
                </div>
                
                {/* Strategy Toggles */}
                <div className="flex bg-slate-200 rounded-lg p-1 self-start">
                    <button 
                        onClick={() => setStrategy('avalanche')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            currentStrategy === 'avalanche' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Avalancha (Interés Alto)
                    </button>
                    <button 
                        onClick={() => setStrategy('snowball')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                            currentStrategy === 'snowball' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Bola de Nieve (Saldo Bajo)
                    </button>
                </div>
            </div>
          </div>

          <div className="p-6">
                <div className="flex flex-col sm:flex-row items-center sm:space-x-6 space-y-4 sm:space-y-0">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center bg-brand-100 text-brand-600 shadow-inner border border-brand-200 animate-pulse">
                       <span className="text-2xl font-bold">1</span>
                    </div>
                  </div>
                  <div className="flex-grow text-center sm:text-left">
                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Paga esto primero</p>
                    <div className="flex items-center justify-center sm:justify-start space-x-3">
                      <span className="text-2xl font-bold text-slate-900">{priorityDebt.name}</span>
                      <div className="w-3 h-3 rounded-full" style={{backgroundColor: priorityDebt.color}}></div>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                       Paga el mínimo en las demás. Aquí deposita el mínimo + tus {fmt(availableMoney)} extras.
                    </p>
                  </div>
                  <div className="flex-shrink-0 bg-slate-50 border border-slate-200 px-6 py-4 rounded-xl text-center">
                     <p className="text-xs text-slate-400 uppercase font-bold mb-1">Pago Sugerido</p>
                     <p className="text-2xl font-bold text-brand-600">{fmt(priorityDebt.minPayment + availableMoney)}</p>
                  </div>
                </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* History Chart - Now with Green/Red */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Historial: Pagado vs Pendiente</h3>
              <div className="flex space-x-3 text-xs font-medium">
                  <span className="flex items-center text-brand-600"><div className="w-2 h-2 bg-brand-500 rounded-full mr-1"></div> Pagado</span>
                  <span className="flex items-center text-danger-500"><div className="w-2 h-2 bg-danger-500 rounded-full mr-1"></div> Deuda</span>
              </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={finalHistoryData}>
                <defs>
                  <linearGradient id="colorDebtHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPaidHist" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  formatter={(value: number, name: string) => [fmt(value), name === 'totalDebt' ? 'Deuda Restante' : 'Acumulado Pagado']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                {/* Stacked Areas? Or Overlaid? Let's use separate areas to show the "Eating away" effect clearly or just lines */}
                <Area type="monotone" dataKey="paid" stackId="1" stroke="#22c55e" fillOpacity={1} fill="url(#colorPaidHist)" strokeWidth={2} name="paid" />
                <Area type="monotone" dataKey="totalDebt" stackId="1" stroke="#ef4444" fillOpacity={1} fill="url(#colorDebtHist)" strokeWidth={2} name="totalDebt" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Composición de Deuda</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtBreakdown} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fill: '#334155'}} axisLine={false} tickLine={false} />
                <Tooltip 
                   formatter={(value: number) => [fmt(value), 'Saldo']}
                   cursor={{fill: '#f1f5f9'}}
                   contentStyle={{ borderRadius: '8px' }}
                />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                  {debtBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};