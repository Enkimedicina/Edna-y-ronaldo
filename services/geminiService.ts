import { GoogleGenAI } from "@google/genai";
import { FinancialState } from "../types";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in process.env");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeFinances = async (data: FinancialState): Promise<string> => {
  const ai = getClient();
  if (!ai) return "Error: No se ha configurado la API Key. Por favor verifica tu configuración.";

  const totalIncome = data.incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalFixedExpenses = data.expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalDebt = data.debts.reduce((acc, curr) => acc + curr.currentAmount, 0);
  const minDebtPayments = data.debts.reduce((acc, curr) => acc + curr.minPayment, 0);
  
  const debtDetails = data.debts.map(d => 
    `- ${d.name}: Debe $${d.currentAmount} (Inicial: $${d.initialAmount}, Mínimo: $${d.minPayment})`
  ).join('\n');

  const prompt = `
    Actúa como un asesor financiero experto y amigable para una pareja llamada Edna y Ronaldo.
    Analiza su situación financiera actual basándote en los siguientes datos:

    Ingresos Totales Mensuales: $${totalIncome}
    Gastos Fijos Mensuales (Luz, Agua, Comida, Niñera, etc): $${totalFixedExpenses}
    Pagos Mínimos de Deuda requeridos: $${minDebtPayments}
    
    Deuda Total Actual: $${totalDebt}
    Desglose de Deudas:
    ${debtDetails}

    Por favor, proporciona:
    1. Un breve diagnóstico de su salud financiera.
    2. ¿Cuánto dinero "libre" tienen realmente después de gastos fijos y pagos mínimos?
    3. Una estrategia recomendada para pagar las deudas más rápido (ej. bola de nieve o avalancha) considerando sus deudas específicas (BBVA, Fovissste, Plata Card, etc).
    4. Un mensaje motivacional corto para Edna y Ronaldo.

    Mantén el tono alentador pero realista. Usa formato Markdown para la respuesta.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No se pudo generar un análisis en este momento.";
  } catch (error) {
    console.error("Error calling Gemini:", error);
    return "Hubo un error al conectar con el asistente financiero. Intenta de nuevo más tarde.";
  }
};