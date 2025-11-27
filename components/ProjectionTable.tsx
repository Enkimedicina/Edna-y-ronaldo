import React, { useMemo } from 'react';
import { FinancialState } from '../types';
import { Calendar, DollarSign, Clock, TrendingDown, AlertCircle } from 'lucide-react';

interface ProjectionTableProps {
  data: FinancialState;
}

export const ProjectionTable: React.FC<ProjectionTableProps> = ({ data }) => {
  const totalIncome = data.incomes.reduce((acc, i) => acc + i.amount, 0);
  const totalExpenses = data.expenses.reduce((acc, e) => acc + e.amount, 0);
  const totalMinPayments = data.debts.reduce((acc, d) => acc + d.minPayment, 0);
  
  // Real capacity to pay debt: (Total Income - Living Expenses). 
  // Note: Min payments are part of the debt payment, so we don't subtract them from capacity, 
  // we use the full "Free Cash Flow + Min Payments" as the weapon against debt.
  const monthlyPaymentCapacity = Math.max(0, totalIncome - totalExpenses); 
  const dailyPaymentCapacity = monthlyPaymentCapacity / 30;

  const totalCurrentDebt = data.debts.reduce((acc, d) => acc + d.currentAmount, 0);

  const fmt = (num: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);

  // Simulation Logic
  const simulation = useMemo(() => {
    if (totalCurrentDebt === 0) return { schedule: [], years: 0, months: 0 };

    let simDebts = data.debts.map(d => ({ ...d }));
    let balance = totalCurrentDebt;
    let monthCounter = 0;
    const schedule = [];
    const maxMonths = 120; // 10 years cap to prevent infinite loops

    const currentDate = new Date();

    while (balance > 1 && monthCounter < maxMonths) {
      const monthDate = new Date(currentDate);
      monthDate.setMonth(currentDate.getMonth() + monthCounter);
      
      let monthlyInterestTotal = 0;
      let availableForPrincipal = monthlyPaymentCapacity;
      let monthStartBalance = balance;

      // 1. Calculate Interest for this month
      simDebts.forEach(d => {
        if (d.currentAmount > 0 && d.interestRate) {
          const interest = (d.currentAmount * (d.interestRate / 100)) / 12;
          d.currentAmount += interest;
          monthlyInterestTotal += interest;
        }
      });

      // 2. Pay Debts
      // Strategy: Pay minimums first, then avalanche remainder
      let remainingBudget = monthlyPaymentCapacity;

      // Pay Minimums
      simDebts.forEach(d => {
        if (d.currentAmount > 0) {
          // If we have enough budget, pay min, otherwise pay what's left
          const payment = Math.min(d.currentAmount, Math.min(d.minPayment, remainingBudget));
          d.currentAmount -= payment;
          remainingBudget -= payment;
        }
      });

      // Pay Extra (Avalanche: Highest Interest Rate first)
      if (remainingBudget > 0) {
        const activeDebts = simDebts.filter(d => d.currentAmount > 0);
        if (activeDebts.length > 0) {
           // Sort by interest rate desc
           activeDebts.sort((a, b) => (b.interestRate || 0) - (a.interestRate || 0));
           const target = activeDebts[0];
           const extra = Math.min(target.currentAmount, remainingBudget);
           target.currentAmount -= extra;
           remainingBudget -= extra;
        }
      }

      // Calculate end balance
      balance = simDebts.reduce((acc, d) => acc + d.currentAmount, 0);
      const totalPaidThisMonth = monthlyPaymentCapacity - remainingBudget; // Actual amount paid
      const principalPaid = totalPaidThisMonth - monthlyInterestTotal;

      schedule.push({
        monthIndex: monthCounter + 1,
        dateLabel: monthDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
        startBalance: monthStartBalance,
        interestPaid: monthlyInterestTotal,
        totalPayment: totalPaidThisMonth,
        endBalance: Math.max(0, balance)
      });

      monthCounter++;
    }

    const years = Math.floor(monthCounter / 12);
    const months = monthCounter % 12;

    return { schedule, years, months };
  }, [data.debts, monthlyPaymentCapacity, totalCurrentDebt]);

  if (totalCurrentDebt === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center animate-fadeIn">
              <div className="bg-green-100 p-6 rounded-full mb-4">
                  <DollarSign className="w-16 h-16 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-slate-800">¡Felicidades!</h2>
              <p className="text-xl text-slate-600 mt-2">No tienes deudas registradas.</p>
              <p className="text-slate-500 mt-1">Tu costo diario de deuda es $0.00</p>
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center mb-6">
            <Calendar className="w-6 h-6 mr-2 text-brand-600" />
            Proyección de Libertad
        </h2>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200">
                <p className="text-sm text-slate-500 uppercase font-bold flex items-center">
                    <Clock className="w-4 h-4 mr-1" /> Tiempo Estimado
                </p>
                <div className="mt-2">
                    <span className="text-3xl font-bold text-slate-800">{simulation.years}</span> <span className="text-sm text-slate-500">años</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-3xl font-bold text-slate-800">{simulation.months}</span> <span className="text-sm text-slate-500">meses</span>
                </div>
                <p className="text-xs text-brand-600 mt-2 font-medium">
                    Terminarás en {simulation.schedule[simulation.schedule.length - 1]?.dateLabel}
                </p>
            </div>

            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 relative overflow-hidden">
                 <div className="absolute right-0 top-0 p-4 opacity-5">
                     <DollarSign className="w-24 h-24" />
                 </div>
                <p className="text-sm text-slate-500 uppercase font-bold flex items-center">
                    <TrendingDown className="w-4 h-4 mr-1" /> Pago Mensual Necesario
                </p>
                <div className="mt-2">
                    <span className="text-3xl font-bold text-brand-600">{fmt(monthlyPaymentCapacity)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                    Ingresos - Gastos Fijos
                </p>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-lg border border-slate-800 shadow-lg">
                <p className="text-sm text-slate-300 uppercase font-bold flex items-center">
                    <AlertCircle className="w-4 h-4 mr-1 text-yellow-400" /> Costo Diario
                </p>
                <div className="mt-2">
                    <span className="text-3xl font-bold text-white">{fmt(dailyPaymentCapacity)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    Esto es lo que debes generar <strong>cada día</strong> solo para cumplir con tu plan de deuda.
                </p>
            </div>
        </div>

        {/* Detailed Table */}
        <div className="overflow-x-auto">
            <h3 className="font-bold text-slate-800 mb-4">Desglose Mes a Mes</h3>
            <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-xs">
                    <tr>
                        <th className="px-4 py-3 rounded-l-lg">Mes</th>
                        <th className="px-4 py-3">Saldo Inicial</th>
                        <th className="px-4 py-3 text-red-500">Interés (Costo)</th>
                        <th className="px-4 py-3 text-green-600">Abono Total</th>
                        <th className="px-4 py-3 rounded-r-lg">Saldo Final</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {simulation.schedule.map((row, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-slate-700">{row.dateLabel}</td>
                            <td className="px-4 py-3 text-slate-500">{fmt(row.startBalance)}</td>
                            <td className="px-4 py-3 text-red-500 font-medium">+{fmt(row.interestPaid)}</td>
                            <td className="px-4 py-3 text-green-600 font-bold">-{fmt(row.totalPayment)}</td>
                            <td className="px-4 py-3 text-slate-800 font-bold">
                                {row.endBalance <= 1 ? <span className="text-green-500 flex items-center">¡LIBRE!</span> : fmt(row.endBalance)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {simulation.schedule.length >= 120 && (
                <div className="p-4 bg-orange-50 text-orange-700 text-sm rounded-lg mt-4 flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    La proyección se ha limitado a 10 años. Revisa si los intereses son demasiado altos o aumenta tu pago mensual.
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
