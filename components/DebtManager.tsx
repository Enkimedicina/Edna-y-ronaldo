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
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Mis Deudas</h2>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Deuda
        </button>
      </div>

      {/* Comparison Chart */}
      {data.debts.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-lg text-slate-800 mb-4">Progreso por Deuda (Inicial vs Actual)</h3>
          <div className="h-72">
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
          <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-lg text-slate-800 flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-brand-600" />
                    Estimación de Liquidación
                </h3>
                <span className="text-xs text-slate-400 font-normal">Basado en el pago mínimo actual</span>
             </div>
             <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-semibold">
                         <tr>
                             <th className="px-6 py-3">Deuda</th>
                             <th className="px-6 py-3">Interés</th>
                             <th className="px-6 py-3">Pago Mensual</th>
                             <th className="px-6 py-3">Tiempo Estimado</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {payoffSummary.map((debt) => (
                             <tr key={debt.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="px-6 py-4 font-medium text-slate-800 flex items-center">
                                     <div className="w-2 h-2 rounded-full mr-2" style={{backgroundColor: debt.color}}></div>
                                     {debt.name}
                                 </td>
                                 <td className="px-6 py-4 text-slate-600">
                                     {debt.interestRate ? `${debt.interestRate}%` : <span className="text-slate-400">-</span>}
                                 </td>
                                 <td className="px-6 py-4 text-slate-600">
                                     {fmt(debt.minPayment)}
                                 </td>
                                 <td className={`px-6 py-4 font-bold ${debt.payoffMonths === Infinity ? 'text-danger-500' : 'text-slate-800'}`}>
                                     {debt.payoffMonths === Infinity && <AlertTriangle className="w-4 h-4 inline mr-1" />}
                                     {formatTime(debt.payoffMonths)}
                                 </td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
             </div>
          </div>
      )}

      {/* Add Debt Form */}
      {isAdding && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-scaleIn">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-800">Agregar Nueva Deuda</h3>
            <button onClick={() => setIsAdding(false)}><X className="w-5 h-5 text-slate-400" /></button>
          </div>
          <form onSubmit={handleAddSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" 
              placeholder="Nombre (ej. BBVA)" 
              className="p-2 border rounded focus:ring-2 focus:ring-brand-500 outline-none"
              required
              value={newDebt.name}
              onChange={e => setNewDebt({...newDebt, name: e.target.value})}
            />
            <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-500 whitespace-nowrap">Color:</span>
                <input 
                  type="color" 
                  className="h-10 w-full p-1 border rounded cursor-pointer"
                  value={newDebt.color}
                  onChange={e => setNewDebt({...newDebt, color: e.target.value})}
                />
            </div>
            
            <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
               <div>
                  <label className="text-xs text-slate-500 block mb-1">Monto Inicial</label>
                  <input 
                    type="number" 
                    placeholder="Monto" 
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                    value={newDebt.initialAmount || ''}
                    onChange={e => setNewDebt({...newDebt, initialAmount: Number(e.target.value), currentAmount: Number(e.target.value)})}
                  />
               </div>
               <div>
                  <label className="text-xs text-slate-500 block mb-1">Saldo Actual</label>
                  <input 
                    type="number" 
                    placeholder="Actual" 
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                    value={newDebt.currentAmount || ''}
                    onChange={e => setNewDebt({...newDebt, currentAmount: Number(e.target.value)})}
                  />
               </div>
               <div>
                  <label className="text-xs text-slate-500 block mb-1">Mínimo Mensual</label>
                  <input 
                    type="number" 
                    placeholder="Mínimo" 
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-brand-500 outline-none"
                    required
                    value={newDebt.minPayment || ''}
                    onChange={e => setNewDebt({...newDebt, minPayment: Number(e.target.value)})}
                  />
               </div>
               <div>
                  <label className="text-xs text-slate-500 block mb-1">Interés Anual (%)</label>
                  <input 
                    type="number" 
                    placeholder="%" 
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-brand-500 outline-none"
                    value={newDebt.interestRate || ''}
                    onChange={e => setNewDebt({...newDebt, interestRate: Number(e.target.value)})}
                  />
               </div>
               <div>
                  <label className="text-xs text-slate-500 block mb-1">Día de Pago</label>
                  <input 
                    type="number" 
                    min="1" max="31"
                    placeholder="Ej. 15" 
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-brand-500 outline-none"
                    value={newDebt.dueDay || ''}
                    onChange={e => setNewDebt({...newDebt, dueDay: Number(e.target.value)})}
                  />
               </div>
            </div>
            <div className="md:col-span-2 flex justify-end space-x-2 mt-2 pt-2 border-t border-slate-100">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700">Guardar Deuda</button>
            </div>
          </form>
        </div>
      )}

      {/* Debt List */}
      <div className="grid grid-cols-1 gap-4">
        {data.debts.map(debt => {
          const progress = debt.initialAmount > 0 
            ? ((debt.initialAmount - debt.currentAmount) / debt.initialAmount) * 100 
            : 0;
            
          return (
            <div key={debt.id} className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
                <div className="flex items-center mb-2 md:mb-0">
                  <div className="w-3 h-10 rounded-full mr-3" style={{backgroundColor: debt.color}}></div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{debt.name}</h3>
                    <div className="flex space-x-3 text-xs">
                      <p className="text-slate-500">Mínimo: {fmt(debt.minPayment)}</p>
                      {debt.interestRate !== undefined && (
                         <p className="text-slate-500 flex items-center"><Percent className="w-3 h-3 mr-1" /> {debt.interestRate}% Anual</p>
                      )}
                      {debt.dueDay && (
                        <p className="text-brand-600 flex items-center">
                          <Calendar className="w-3 h-3 mr-1" /> 
                          Día {debt.dueDay}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Saldo Actual</p>
                  <p className="text-2xl font-bold text-slate-900">{fmt(debt.currentAmount)}</p>
                </div>
              </div>

              {/* Progress Bar with enhanced animation */}
              <div className="w-full bg-slate-100 rounded-full h-4 mb-4 shadow-inner overflow-hidden relative">
                <div 
                  className="h-full rounded-full transition-all duration-1000 ease-out relative" 
                  style={{ 
                    width: `${mounted ? Math.min(100, Math.max(0, progress)) : 0}%`,
                    backgroundColor: debt.color
                  }}
                >
                   {/* Shimmer overlay */}
                   <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent opacity-50"></div>
                   
                   {/* Striped pattern overlay */}
                   <div className="absolute inset-0 opacity-20" style={{
                       backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)',
                       backgroundSize: '1rem 1rem'
                   }}></div>
                </div>
              </div>
              
              <div className="flex justify-between text-xs text-slate-500 mb-4">
                <span>Progreso: {progress.toFixed(1)}% pagado</span>
                <span>Inicial: {fmt(debt.initialAmount)}</span>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-50">
                <button 
                  onClick={() => onDeleteDebt(debt.id)}
                  className="p-2 text-slate-400 hover:text-danger-500 hover:bg-danger-50 rounded-lg transition-colors"
                  title="Eliminar Deuda"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setEditingDebt(debt)}
                  className="flex items-center px-3 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Editar
                </button>
                <button 
                  onClick={() => setPaymentModal({debtId: debt.id, debtName: debt.name})}
                  className="flex items-center px-4 py-2 bg-brand-600 text-white rounded-lg font-medium text-sm hover:bg-brand-700 shadow-sm transition-colors"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Registrar Pago
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Debt Modal */}
      {editingDebt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl animate-scaleIn overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-slate-800">Editar Deuda: {editingDebt.name}</h3>
              <button onClick={() => setEditingDebt(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <form onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="text-xs text-slate-500 block mb-1">Nombre de la Deuda</label>
                    <input 
                      type="text" 
                      className="w-full p-2 border rounded focus:ring-2 focus:ring-brand-500 outline-none"
                      required
                      value={editingDebt.name}
                      onChange={e => setEditingDebt({...editingDebt, name: e.target.value})}
                    />
                </div>
                
                <div>
                   <label className="text-xs text-slate-500 block mb-1">Monto Inicial (Deuda Original)</label>
                   <input 
                     type="number" 
                     className="w-full p-2 border rounded focus:ring-2 focus:ring-brand-500 outline-none"
                     required
                     value={editingDebt.initialAmount}
                     onChange={e => setEditingDebt({...editingDebt, initialAmount: Number(e.target.value)})}
                   />
                </div>
                <div>
                   <label className="text-xs text-slate-500 block mb-1">Saldo Actual (Lo que se debe hoy)</label>
                   <div className="flex items-stretch">
                       <button
                           type="button"
                           onClick={() => setEditingDebt(prev => prev ? ({...prev, currentAmount: Math.max(0, Number(prev.currentAmount) - 1)}) : null)}
                           className="bg-slate-100 border border-slate-300 rounded-l-lg px-3 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                           title="Reducir $1"
                       >
                           <Minus className="w-4 h-4" />
                       </button>
                       <input 
                         type="number" 
                         className="w-full p-2 border-y border-slate-300 text-center focus:ring-2 focus:ring-brand-500 outline-none font-bold text-slate-700"
                         required
                         value={editingDebt.currentAmount}
                         onChange={e => setEditingDebt({...editingDebt, currentAmount: Number(e.target.value)})}
                       />
                       <button
                           type="button"
                           onClick={() => setEditingDebt(prev => prev ? ({...prev, currentAmount: Number(prev.currentAmount) + 1}) : null)}
                           className="bg-slate-100 border border-slate-300 rounded-r-lg px-3 hover:bg-slate-200 text-slate-600 flex items-center justify-center"
                           title="Aumentar $1"
                       >
                           <Plus className="w-4 h-4" />
                       </button>
                   </div>
                </div>
                
                <div>
                   <label className="text-xs text-slate-500 block mb-1">Pago Mínimo Mensual</label>
                   <input 
                     type="number" 
                     className="w-full p-2 border rounded focus:ring-2 focus:ring-brand-500 outline-none"
                     required
                     value={editingDebt.minPayment}
                     onChange={e => setEditingDebt({...editingDebt, minPayment: Number(e.target.value)})}
                   />
                </div>
                <div>
                   <label className="text-xs text-slate-500 block mb-1">Tasa de Interés Anual (%)</label>
                   <input 
                     type="number" 
                     className="w-full p-2 border rounded focus:ring-2 focus:ring-brand-500 outline-none"
                     value={editingDebt.interestRate || ''}
                     onChange={e => setEditingDebt({...editingDebt, interestRate: Number(e.target.value)})}
                   />
                </div>
                <div>
                   <label className="text-xs text-slate-500 block mb-1">Día de Pago (1-31)</label>
                   <input 
                     type="number" 
                     min="1" max="31"
                     className="w-full p-2 border rounded focus:ring-2 focus:ring-brand-500 outline-none"
                     value={editingDebt.dueDay || ''}
                     onChange={e => setEditingDebt({...editingDebt, dueDay: Number(e.target.value)})}
                   />
                </div>
                
                <div className="md:col-span-2">
                   <label className="text-xs text-slate-500 block mb-1">Color Identificador</label>
                   <input 
                     type="color" 
                     className="h-10 w-full p-1 border rounded cursor-pointer"
                     value={editingDebt.color}
                     onChange={e => setEditingDebt({...editingDebt, color: e.target.value})}
                   />
                </div>

                <div className="md:col-span-2 flex justify-end space-x-2 mt-4 pt-4 border-t border-slate-100">
                    <button type="button" onClick={() => setEditingDebt(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                    <button type="submit" className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium">Guardar Cambios</button>
                </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Modal with History */}
      {paymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl animate-scaleIn">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Pago a {paymentModal.debtName}</h3>
              <button onClick={() => setPaymentModal(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            {/* History Section */}
            <div className="mb-6 bg-slate-50 rounded-lg p-4 border border-slate-100">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center">
                 <History className="w-3 h-3 mr-1" /> Historial de Pagos
               </h4>
               <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {paymentHistory.length === 0 ? (
                    <p className="text-sm text-slate-400 italic text-center py-2">No hay pagos registrados aún.</p>
                  ) : (
                    paymentHistory.map((p) => (
                      <div key={p.id} className="flex justify-between text-sm border-b border-slate-200 pb-1 last:border-0 last:pb-0">
                        <span className="text-slate-600">{new Date(p.date).toLocaleDateString('es-MX')}</span>
                        <span className="font-medium text-brand-600">{fmt(p.amount)}</span>
                      </div>
                    ))
                  )}
               </div>
            </div>

            <form onSubmit={handlePaymentSubmit}>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nuevo Pago</label>
              <div className="relative mb-6">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-500">$</span>
                </div>
                <input 
                  type="number" 
                  className="pl-7 w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none text-lg"
                  placeholder="0.00"
                  autoFocus
                  required
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full bg-brand-600 text-white py-3 rounded-lg font-bold hover:bg-brand-700 transition-colors">
                Confirmar Pago
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};