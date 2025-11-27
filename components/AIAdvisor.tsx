import React, { useState } from 'react';
import { FinancialState } from '../types';
import { analyzeFinances } from '../services/geminiService';
import { Sparkles, Loader2, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIAdvisorProps {
  data: FinancialState;
}

export const AIAdvisor: React.FC<AIAdvisorProps> = ({ data }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    const result = await analyzeFinances(data);
    setAnalysis(result);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-purple-100 rounded-full text-purple-600 mb-2">
          <Sparkles className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Asesor Financiero IA</h2>
        <p className="text-slate-600 max-w-lg mx-auto">
          Utiliza la inteligencia de Gemini para analizar tus deudas, ingresos y gastos. 
          Obtén estrategias personalizadas para Edna y Ronaldo.
        </p>
        
        {!analysis && !loading && (
          <button 
            onClick={handleAnalyze}
            className="mt-6 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center mx-auto"
          >
            <MessageSquare className="w-5 h-5 mr-2" />
            Analizar mis Finanzas
          </button>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-10 h-10 animate-spin mb-4 text-purple-600" />
          <p>Analizando datos de BBVA, Fovissste y flujos de caja...</p>
        </div>
      )}

      {analysis && (
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-purple-100 animate-slideUp">
          <div className="prose prose-purple max-w-none">
             {/* Using a simple div to render markdown-like content for simplicity without heavy dependencies, 
                 but in a real scenario we'd use react-markdown. 
                 Since I cannot install new packages, I will do basic formatting. */}
             <div className="whitespace-pre-wrap text-slate-700 leading-relaxed font-medium">
               {analysis}
             </div>
          </div>
          <div className="mt-8 text-center">
            <button 
              onClick={handleAnalyze}
              className="text-purple-600 font-semibold hover:text-purple-800 text-sm"
            >
              Actualizar Análisis
            </button>
          </div>
        </div>
      )}
    </div>
  );
};