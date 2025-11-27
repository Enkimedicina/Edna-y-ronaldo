import React, { useState, useEffect, useMemo } from 'react';
import { FinancialState, Debt } from '../types';
import { Plus, Trash2, Edit2, CreditCard, X, Calendar, Minus, Percent, History, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

interface DebtManagerProps {
  data: FinancialState;
  onUpdateDebt: (debt: Debt) => void;
  onDeleteDebt: (id: string) => void;
  onAddDebt: (debt: Omit<Debt, 'id'>) => void;
  onMakePayment: (debtId: string, amount: number) => void;
}

export const DebtManager: React.FC<DebtManagerProps> = ({ 
  data, onUpdateDebt, onDeleteDebt, onAddDebt, onMakePayment 
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [paymentModal, setPaymentModal] = useState<{debtId: string, debtName: string} | null>(null);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Form state for new debt
  const [newDebt, setNewDebt] = useState<Partial<Debt> & { color: string }>({
    name: '',
    initialAmount: 0,
    currentAmount: 0,
    minPayment: 0,
    color: '#64748b',
    dueDay: undefined,
    interestRate: undefined
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDebt.name && newDebt.currentAmount !== undefined) {
       onAddDebt({
         name: newDebt.name,
         initialAmount: newDebt.initialAmount || 0,
         currentAmount: newDebt.currentAmount,
         minPayment: newDebt.minPayment || 0,
         color: newDebt.color,
         dueDay: newDebt.dueDay,
         interestRate: newDebt.interestRate
       });
       setIsAdding(false);
       setNewDebt({ name: '', initialAmount: 0, currentAmount: 0, minPayment: 0, color: '#64748b', dueDay: undefined, interestRate: undefined });
    }
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDebt) {
      onUpdateDebt(editingDebt);
      setEditingDebt(null);
    }
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentModal && paymentAmount) {
      onMakePayment(paymentModal.debtId, parseFloat(paymentAmount));
      setPaymentModal(null);
      setPaymentAmount('');
    }
  };

  const fmt = (num: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);

  const chartData = data.debts.map(d => ({
    name: d.name,
    Inicial: d.initialAmount,
    Actual: d.currentAmount,
    color: d.color
  }));

  // Filter payments for the selected debt in modal
  const paymentHistory = paymentModal 
    ? data.payments
        .filter(p => p.debtId === paymentModal.debtId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  // Calculate Payoff Summary
  const payoffSummary = useMemo(() => {
    return data.debts.map(debt => {
        let months = 0;
        if (debt.currentAmount <= 0) {
            months = 0;
        } else if (debt.minPayment <= 0) {
            months = Infinity;
        } else {
            const r = (debt.interestRate || 0) / 100 / 12;
            const p = debt.currentAmount;
            const a = debt.minPayment;
            
            if (r === 0) {
                months = p / a;
            } else if (a <= p * r) {
                months = Infinity; // Interest eats the payment
            } else {
                // NPER formula
                months = Math.log(a / (a - p * r)) / Math.log(1 + r);
            }
        }
        
        return {
            ...debt,
            payoffMonths: months
        };
    }).sort((a, b) => a.payoffMonths - b.payoffMonths);
  }, [data.debts]);

  const formatTime = (months: number) => {
    if (months === 0) return "Pagado";
    if (months === Infinity) return "Nunca (Interés > Pago)";
    const y = Math.floor(months / 12);
    const m = Math.ceil(months % 12);
    if (y > 0) return `${y} año${y > 1 ? 's' : ''} ${m} mes${m !== 1 ? 'es' : ''}`;
    return `${m} mes${m !== 1 ? 'es' : ''}`;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Gestión de Deudas</h2>
           <p className="text-slate-500">Administra tus saldos, registra pagos y visualiza tu progreso.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-lg flex items-center hover:bg-slate-800 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Deuda
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Comparison Chart */}
        {data.debts.length > 0 && (
            <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-lg text-slate-800 mb-4">Progreso por Deuda (Inicial vs Actual)</h3>
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{top: 20, right: 30, left: 0, bottom: 5}} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(val) => `$${val/1000}k`} tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                    <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    formatter={(value: number) => [fmt(value)]}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend iconType="circle" />
                    <Bar dataKey="Inicial" fill="#cbd5e1" name="Monto Inicial" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual" name="Saldo Actual" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            </div>
            </div>
        )}

        {/* Summary Table: Estimated Payoff */}
        {data.debts.length > 0 && (
            <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-slate-100 flex flex-col">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center">
                        <Clock className="w-5 h-5 mr-2 text-brand-600" />
                        Estimación de Liquidación
                    </h3>
                    <span className="text-xs text-slate-400 font-normal mt-1">Con pagos mínimos actuales</span>
                </div>
                <div className="overflow-y-auto flex-grow custom-scrollbar max-h-[320px]">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold sticky top-0">
                            <tr>
                                <th className="px-4 py-3">Deuda</th>
                                <th className="px-4 py-3 text-right">Tiempo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payoffSummary.map((debt) => (
                                <tr key={debt.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        <div className="flex items-center">
                                            <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: debt.color}}></div>
                                            <div>
                                                <div className="font-bold">{debt.name}</div>
                                                <div className="text-xs text-slate-400">Int: {debt.interestRate}%</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className={`px-4 py-3 text-right font-bold ${debt.payoffMonths === Infinity ? 'text-danger-500' : 'text-slate-700'}`}>
                                        {debt.payoffMonths === Infinity ? <AlertTriangle className="w-4 h-4 inline" /> : formatTime(debt.payoffMonths)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>

      {/* Add Debt Form */}
      {isAdding && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-lg animate-scaleIn">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-800">Agregar Nueva Deuda</h3>
            <button onClick={() => setIsAdding(false)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
          </div>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Nombre</label>
                <input 
                type="text" 
                placeholder="Ej. Tarjeta Oro" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                required
                value={newDebt.name}
                onChange={e => setNewDebt({...newDebt, name: e.target.value})}
                />
            </div>
            <div className="lg:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Color Identificador</label>
                <div className="flex items-center space-x-2">
                    <input 
                    type="color" 
                    className="h-11 w-full p-1 border border-slate-300 rounded-lg cursor-pointer"
                    value={newDebt.color}
                    onChange={e => setNewDebt({...newDebt, color: e.target.value})}
                    />
                </div>
            </div>
            
            <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Monto Inicial</label>
                <input 
                type="number" 
                placeholder="$0.00" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                required
                value={newDebt.initialAmount || ''}
                onChange={e => setNewDebt({...newDebt, initialAmount: Number(e.target.value), currentAmount: Number(e.target.value)})}
                />
            </div>
            <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Saldo Actual</label>
                <input 
                type="number" 
                placeholder="$0.00" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                required
                value={newDebt.currentAmount || ''}
                onChange={e => setNewDebt({...newDebt, currentAmount: Number(e.target.value)})}
                />
            </div>
            <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Mínimo Mensual</label>
                <input 
                type="number" 
                placeholder="$0.00" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                required
                value={newDebt.minPayment || ''}
                onChange={e => setNewDebt({...newDebt, minPayment: Number(e.target.value)})}
                />
            </div>
            <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Interés Anual (%)</label>
                <input 
                type="number" 
                placeholder="%" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                value={newDebt.interestRate || ''}
                onChange={e => setNewDebt({...newDebt, interestRate: Number(e.target.value)})}
                />
            </div>
            <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Día de Pago</label>
                <input 
                type="number" 
                min="1" max="31"
                placeholder="Ej. 15" 
                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                value={newDebt.dueDay || ''}
                onChange={e => setNewDebt({...newDebt, dueDay: Number(e.target.value)})}
                />
            </div>
            
            <div className="lg:col-span-4 flex justify-end space-x-3 mt-4 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium">Cancelar</button>
              <button type="submit" className="px-6 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 shadow-md font-medium">Guardar Deuda</button>
            </div>
          </form>
        </div>
      )}

      {/* Debt Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.debts.map(debt => {
          const progress = debt.initialAmount > 0 
            ? ((debt.initialAmount - debt.currentAmount) / debt.initialAmount) * 100 
            : 0;
            
          return (
            <div key={debt.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col group">
              <div className="p-6 flex-grow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-md mr-3" style={{backgroundColor: debt.color}}>
                        {debt.name.substring(0,1)}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 leading-tight">{debt.name}</h3>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 mt-1">
                          {debt.interestRate !== undefined && (
                             <span className="flex items-center bg-slate-100 px-1.5 py-0.5 rounded"><Percent className="w-3 h-3 mr-1" /> {debt.interestRate}%</span>
                          )}
                          {debt.dueDay && (
                            <span className="flex items-center bg-slate-100 px-1.5 py-0.5 rounded"><Calendar className="w-3 h-3 mr-1" /> Día {debt.dueDay}</span>
                          )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Actual</p>
                    <p className="text-xl font-bold text-slate-900">{fmt(debt.currentAmount)}</p>
                  </div>
                </div>

                {/* Progress Bar with enhanced animation */}
                <div className="w-full bg-slate-100 rounded-full h-3 mb-2 shadow-inner overflow-hidden relative">
                    <div 
                    className="h-full rounded-full transition-all duration-1000 ease-out relative" 
                    style={{ 
                        width: `${mounted ? Math.min(100, Math.max(0, progress)) : 0}%`,
                        backgroundColor: debt.color
                    }}
                    >
                        <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem'}}></div>
                    </div>
                </div>
                
                <div className="flex justify-between text-xs text-slate-500 mb-6">
                    <span>{progress.toFixed(0)}% Pagado</span>
                    <span>Meta: {fmt(debt.initialAmount)}</span>
                </div>

                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 font-medium">Pago Mínimo</span>
                        <span className="text-slate-800 font-bold">{fmt(debt.minPayment)}</span>
                    </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 rounded-b-xl flex justify-between items-center">
                <div className="flex space-x-1">
                    <button 
                    onClick={() => setEditingDebt(debt)}
                    className="p-2 text-slate-500 hover:text-brand-600 hover:bg-white rounded-lg transition-all"
                    title="Editar"
                    >
                    <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                    onClick={() => onDeleteDebt(debt.id)}
                    className="p-2 text-slate-500 hover:text-danger-500 hover:bg-white rounded-lg transition-all"
                    title="Eliminar"
                    >
                    <Trash2 className="w-4 h-4" />
                    </button>
                </div>
                <button 
                  onClick={() => setPaymentModal({debtId: debt.id, debtName: debt.name})}
                  className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-bold text-sm hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 shadow-sm transition-all"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Abonar
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Debt Modal */}
      {editingDebt && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-8 shadow-2xl animate-scaleIn overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-slate-800">Editar {editingDebt.name}</h3>
              <button onClick={() => setEditingDebt(null)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                    <label className="text-sm font-medium text-slate-700 block mb-1">Nombre de la Deuda</label>
                    <input 
                      type="text" 
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                      required
                      value={editingDebt.name}
                      onChange={e => setEditingDebt({...editingDebt, name: e.target.value})}
                    />
                </div>
                
                <div>
                   <label className="text-sm font-medium text-slate-700 block mb-1">Monto Inicial</label>
                   <input 
                     type="number" 
                     className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                     required
                     value={editingDebt.initialAmount}
                     onChange={e => setEditingDebt({...editingDebt, initialAmount: Number(e.target.value)})}
                   />
                </div>
                <div>
                   <label className="text-sm font-medium text-slate-700 block mb-1">Saldo Actual</label>
                   <div className="flex items-stretch">
                       <button
                           type="button"
                           onClick={() => setEditingDebt(prev => prev ? ({...prev, currentAmount: Math.max(0, Number(prev.currentAmount) - 100)}) : null)}
                           className="bg-slate-100 border border-slate-300 rounded-l-lg px-4 hover:bg-slate-200 text-slate-600"
                       >
                           <Minus className="w-4 h-4" />
                       </button>
                       <input 
                         type="number" 
                         className="w-full p-3 border-y border-slate-300 text-center focus:ring-2 focus:ring-brand-500 outline-none font-bold text-slate-800"
                         required
                         value={editingDebt.currentAmount}
                         onChange={e => setEditingDebt({...editingDebt, currentAmount: Number(e.target.value)})}
                       />
                       <button
                           type="button"
                           onClick={() => setEditingDebt(prev => prev ? ({...prev, currentAmount: Number(prev.currentAmount) + 100}) : null)}
                           className="bg-slate-100 border border-slate-300 rounded-r-lg px-4 hover:bg-slate-200 text-slate-600"
                       >
                           <Plus className="w-4 h-4" />
                       </button>
                   </div>
                </div>
                
                <div>
                   <label className="text-sm font-medium text-slate-700 block mb-1">Pago Mínimo</label>
                   <input 
                     type="number" 
                     className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                     required
                     value={editingDebt.minPayment}
                     onChange={e => setEditingDebt({...editingDebt, minPayment: Number(e.target.value)})}
                   />
                </div>
                <div>
                   <label className="text-sm font-medium text-slate-700 block mb-1">Interés Anual (%)</label>
                   <input 
                     type="number" 
                     className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                     value={editingDebt.interestRate || ''}
                     onChange={e => setEditingDebt({...editingDebt, interestRate: Number(e.target.value)})}
                   />
                </div>
                <div>
                   <label className="text-sm font-medium text-slate-700 block mb-1">Día de Pago</label>
                   <input 
                     type="number" 
                     min="1" max="31"
                     className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                     value={editingDebt.dueDay || ''}
                     onChange={e => setEditingDebt({...editingDebt, dueDay: Number(e.target.value)})}
                   />
                </div>
                
                <div className="md:col-span-1">
                   <label className="text-sm font-medium text-slate-700 block mb-1">Color</label>
                   <input 
                     type="color" 
                     className="h-12 w-full p-1 border border-slate-300 rounded-lg cursor-pointer"
                     value={editingDebt.color}
                     onChange={e => setEditingDebt({...editingDebt, color: e.target.value})}
                   />
                </div>

                <div className="md:col-span-2 flex justify-end space-x-3 mt-4 pt-6 border-t border-slate-100">
                    <button type="button" onClick={() => setEditingDebt(null)} className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancelar</button>
                    <button type="submit" className="px-6 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-bold shadow-lg transition-transform transform hover:scale-105">Guardar Cambios</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal with History */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-8 shadow-2xl animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800">Pago a <span className="text-brand-600">{paymentModal.debtName}</span></h3>
              <button onClick={() => setPaymentModal(null)}><X className="w-6 h-6 text-slate-400 hover:text-slate-600" /></button>
            </div>
            
            {/* History Section */}
            <div className="mb-6 bg-slate-50 rounded-lg p-4 border border-slate-200">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center">
                 <History className="w-3 h-3 mr-1" /> Historial Reciente
               </h4>
               <div className="max-h-32 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {paymentHistory.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-2">Sin pagos registrados</p>
                  ) : (
                    paymentHistory.map((p) => (
                      <div key={p.id} className="flex justify-between text-sm border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-600">{new Date(p.date).toLocaleDateString('es-MX', {day: 'numeric', month: 'short'})}</span>
                        <span className="font-bold text-slate-700">{fmt(p.amount)}</span>
                      </div>
                    ))
                  )}
               </div>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <label className="block text-sm font-bold text-slate-700 mb-2">Monto a Pagar</label>
              <div className="relative mb-8">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-bold text-lg">$</span>
                </div>
                <input 
                  type="number" 
                  className="pl-8 w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none text-2xl font-bold text-slate-800"
                  placeholder="0.00"
                  autoFocus
                  required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full bg-brand-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-brand-700 shadow-lg transition-transform transform hover:scale-[1.02]">
                Confirmar Transacción
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};