import React, { useState } from 'react';
import { FinancialState, Expense, Income } from '../types';
import { Plus, Trash2, TrendingUp, TrendingDown, Clock, Calendar } from 'lucide-react';

interface BudgetManagerProps {
  data: FinancialState;
  onAddIncome: (income: Omit<Income, 'id'>) => void;
  onRemoveIncome: (id: string) => void;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onRemoveExpense: (id: string) => void;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({
  data, onAddIncome, onRemoveIncome, onAddExpense, onRemoveExpense
}) => {
  const [newExpense, setNewExpense] = useState<{
    name: string, 
    amount: string, 
    category: Expense['category'],
    frequency: Expense['frequency'],
    dueDay: string
  }>({
    name: '', amount: '', category: 'Services', frequency: 'Monthly', dueDay: ''
  });

  const [newIncome, setNewIncome] = useState<{source: string, amount: string}>({
    source: 'Edna', amount: ''
  });

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(newIncome.amount) {
      onAddIncome({ source: newIncome.source, amount: Number(newIncome.amount) });
      setNewIncome({ ...newIncome, amount: '' });
    }
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(newExpense.name && newExpense.amount) {
      onAddExpense({ 
        name: newExpense.name, 
        amount: Number(newExpense.amount), 
        category: newExpense.category,
        frequency: newExpense.frequency,
        dueDay: newExpense.dueDay ? Number(newExpense.dueDay) : undefined
      });
      setNewExpense({ name: '', amount: '', category: 'Services', frequency: 'Monthly', dueDay: '' });
    }
  };

  const fmt = (num: number) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);

  const getDayName = (day: number) => {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[day] || '';
  };

  const renderFrequencyLabel = (exp: Expense) => {
    if (!exp.frequency || exp.frequency === 'Monthly') {
      return exp.dueDay ? `Día ${exp.dueDay} de cada mes` : 'Mensual';
    }
    if (exp.frequency === 'Weekly') {
      return exp.dueDay !== undefined ? `Cada ${getDayName(exp.dueDay)}` : 'Semanal';
    }
    if (exp.frequency === 'Bi-weekly') {
      return exp.dueDay ? `Días ${exp.dueDay} y ${exp.dueDay + 15}` : 'Quincenal';
    }
    return '';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fadeIn">
      {/* Income Section */}
      <div className="space-y-6">
        <div className="bg-brand-50 p-6 rounded-xl border border-brand-100">
          <div className="flex items-center mb-4 text-brand-700">
            <TrendingUp className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-bold">Ingresos Mensuales</h2>
          </div>
          
          <form onSubmit={handleIncomeSubmit} className="flex gap-2 mb-6">
             <select 
               className="p-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-brand-500"
               value={newIncome.source}
               onChange={e => setNewIncome({...newIncome, source: e.target.value})}
             >
               <option value="Edna">Edna</option>
               <option value="Ronaldo">Ronaldo</option>
               <option value="Otro">Otro</option>
             </select>
             <input 
               type="number" 
               placeholder="Monto" 
               className="flex-1 p-2 border rounded-lg outline-none focus:ring-2 focus:ring-brand-500"
               value={newIncome.amount}
               onChange={e => setNewIncome({...newIncome, amount: e.target.value})}
             />
             <button type="submit" className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-700 transition-colors">
               <Plus className="w-5 h-5" />
             </button>
          </form>

          <div className="space-y-3">
            {data.incomes.map(inc => (
              <div key={inc.id} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center">
                <span className="font-medium text-slate-700">{inc.source}</span>
                <div className="flex items-center">
                  <span className="font-bold text-brand-600 mr-3">{fmt(inc.amount)}</span>
                  <button onClick={() => onRemoveIncome(inc.id)} className="text-slate-400 hover:text-danger-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {data.incomes.length === 0 && <p className="text-slate-400 text-sm text-center italic">No hay ingresos registrados.</p>}
          </div>
          
          <div className="mt-4 pt-4 border-t border-brand-200 flex justify-between font-bold text-brand-800">
            <span>Total Ingresos</span>
            <span>{fmt(data.incomes.reduce((a, b) => a + b.amount, 0))}</span>
          </div>
        </div>
      </div>

      {/* Expenses Section */}
      <div className="space-y-6">
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <div className="flex items-center mb-4 text-slate-700">
            <TrendingDown className="w-6 h-6 mr-2" />
            <h2 className="text-xl font-bold">Gastos Fijos</h2>
          </div>

          <form onSubmit={handleExpenseSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 bg-white p-4 rounded-lg border border-slate-200">
             <div className="md:col-span-2">
                 <label className="text-xs text-slate-500 font-medium ml-1">Concepto</label>
                 <input 
                   type="text" 
                   placeholder="Ej. Netflix, Luz, Super..." 
                   className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-400"
                   required
                   value={newExpense.name}
                   onChange={e => setNewExpense({...newExpense, name: e.target.value})}
                 />
             </div>
             
             <div>
                 <label className="text-xs text-slate-500 font-medium ml-1">Categoría</label>
                 <select 
                   className="w-full p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-slate-400"
                   value={newExpense.category}
                   onChange={e => setNewExpense({...newExpense, category: e.target.value as Expense['category']})}
                 >
                   <option value="Services">Servicios</option>
                   <option value="Food">Comida</option>
                   <option value="Nanny">Niñera</option>
                   <option value="Other">Otro</option>
                 </select>
             </div>

             <div>
                 <label className="text-xs text-slate-500 font-medium ml-1">Monto</label>
                 <input 
                   type="number" 
                   placeholder="$" 
                   className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-400"
                   required
                   value={newExpense.amount}
                   onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                 />
             </div>

             <div>
                 <label className="text-xs text-slate-500 font-medium ml-1">Frecuencia</label>
                 <select 
                   className="w-full p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-slate-400"
                   value={newExpense.frequency}
                   onChange={e => setNewExpense({...newExpense, frequency: e.target.value as Expense['frequency']})}
                 >
                   <option value="Monthly">Mensual</option>
                   <option value="Bi-weekly">Quincenal (15 días)</option>
                   <option value="Weekly">Semanal</option>
                 </select>
             </div>

             <div>
                 <label className="text-xs text-slate-500 font-medium ml-1">
                    {newExpense.frequency === 'Weekly' ? 'Día de la semana' : 'Día de inicio'}
                 </label>
                 {newExpense.frequency === 'Weekly' ? (
                     <select 
                        className="w-full p-2 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-slate-400"
                        value={newExpense.dueDay}
                        onChange={e => setNewExpense({...newExpense, dueDay: e.target.value})}
                     >
                        <option value="">Seleccionar...</option>
                        <option value="1">Lunes</option>
                        <option value="2">Martes</option>
                        <option value="3">Miércoles</option>
                        <option value="4">Jueves</option>
                        <option value="5">Viernes</option>
                        <option value="6">Sábado</option>
                        <option value="0">Domingo</option>
                     </select>
                 ) : (
                     <input 
                       type="number" 
                       placeholder={newExpense.frequency === 'Bi-weekly' ? "Ej. 1 y 16" : "Ej. 5"}
                       min="1" max="31"
                       className="w-full p-2 border rounded-lg outline-none focus:ring-2 focus:ring-slate-400"
                       value={newExpense.dueDay}
                       onChange={e => setNewExpense({...newExpense, dueDay: e.target.value})}
                     />
                 )}
             </div>

             <button type="submit" className="md:col-span-2 bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 flex justify-center items-center mt-2 transition-colors font-medium">
               <Plus className="w-4 h-4 mr-2" /> Agregar Gasto
             </button>
          </form>

          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
            {data.expenses.map(exp => (
              <div key={exp.id} className="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center border-l-4 border-slate-300 hover:border-slate-400 transition-colors group">
                <div>
                  <span className="font-medium text-slate-700 block">{exp.name}</span>
                  <div className="flex items-center space-x-2">
                     <span className="text-xs text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">{exp.category}</span>
                     {exp.frequency && (
                         <span className="text-xs text-brand-600 flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {renderFrequencyLabel(exp)}
                         </span>
                     )}
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="font-bold text-slate-700 mr-3">{fmt(exp.amount)}</span>
                  <button onClick={() => onRemoveExpense(exp.id)} className="text-slate-300 hover:text-danger-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
             {data.expenses.length === 0 && <p className="text-slate-400 text-sm text-center italic py-4">No hay gastos fijos registrados.</p>}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between font-bold text-slate-800">
            <span>Total Gastos Fijos (Est. Mensual)</span>
            <span>{fmt(data.expenses.reduce((acc, exp) => {
                let monthlyAmount = exp.amount;
                if (exp.frequency === 'Weekly') monthlyAmount = exp.amount * 4;
                if (exp.frequency === 'Bi-weekly') monthlyAmount = exp.amount * 2;
                return acc + monthlyAmount;
            }, 0))}</span>
          </div>
        </div>
      </div>
    </div>
  );
};