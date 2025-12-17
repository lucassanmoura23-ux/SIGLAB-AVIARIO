
import React, { useMemo, useState } from 'react';
import { ComputedRecord, AviaryId, FilterState } from '../types';
import { Download, Sparkles, Loader2 } from 'lucide-react';
import { exportToCSV, exportToPDF, exportAISummaryToPDF, compareFortnights, formatDateBr } from '../utils';
import { GoogleGenAI } from "@google/genai";

interface ReportsProps {
  records: ComputedRecord[];
  filter: FilterState;
}

export const Reports: React.FC<ReportsProps> = ({ records, filter }) => {
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const reportData = useMemo(() => {
    // Group by Fortnight
    const groups: Record<string, { records: ComputedRecord[] }> = {};
    
    records.forEach(r => {
      if (!groups[r.fortnight]) groups[r.fortnight] = { records: [] };
      groups[r.fortnight].records.push(r);
    });

    // Sort fortnights descending using date logic, not alphabetical
    const keys = Object.keys(groups).sort((a, b) => {
        return compareFortnights(b, a); // Descending (Newest first)
    });

    return keys.map(key => {
      const groupRecs = groups[key].records;
      const totalGeneral = groupRecs.reduce((s, r) => s + r.totalEggs, 0);
      
      const aviaryTotals: Record<string, number> = {};
      const aviaryRatesSum: Record<string, {sum: number, count: number}> = {};
      
      Object.values(AviaryId).forEach(id => {
        aviaryTotals[id] = 0;
        aviaryRatesSum[id] = { sum: 0, count: 0 };
      });

      groupRecs.forEach(r => {
        aviaryTotals[r.aviary] += r.totalEggs;
        if (r.layingRate !== null) {
          aviaryRatesSum[r.aviary].sum += r.layingRate;
          aviaryRatesSum[r.aviary].count += 1;
        }
      });

      // General Rate
      const validRates = groupRecs.filter(r => r.layingRate !== null);
      const generalRate = validRates.length ? validRates.reduce((s, r) => s + (r.layingRate || 0), 0) / validRates.length : 0;

      return {
        fortnight: key,
        totalGeneral,
        generalRate,
        aviaryTotals,
        aviaryRates: Object.keys(aviaryRatesSum).reduce((acc, id) => {
           const d = aviaryRatesSum[id];
           acc[id] = d.count > 0 ? d.sum / d.count : 0;
           return acc;
        }, {} as Record<string, number>)
      };
    });
  }, [records]);

  const handleGenerateAI = async () => {
    if (records.length === 0) {
      setError("Não há dados para analisar com os filtros atuais.");
      return;
    }

    setIsGenerating(true);
    setError('');
    setAiSummary('');

    try {
      // 1. Prepare Data Summary for Prompt
      
      // Total Eggs (Includes Floor Eggs based on utils computation)
      const totalEggs = records.reduce((sum, r) => sum + r.totalEggs, 0);
      const totalMortality = records.reduce((sum, r) => sum + r.mortality, 0);
      
      const validRates = records.filter(r => r.layingRate !== null);
      const avgRate = validRates.length ? (validRates.reduce((sum, r) => sum + (r.layingRate || 0), 0) / validRates.length) * 100 : 0;

      const totalClean = records.reduce((sum, r) => sum + r.clean, 0);
      const totalDirty = records.reduce((sum, r) => sum + r.dirty, 0);
      const totalCracked = records.reduce((sum, r) => sum + r.cracked, 0);
      const totalFloor = records.reduce((sum, r) => sum + (r.floorEggs || 0), 0);
      
      // Calculate Percentages based on TOTAL EGGS (Denominator)
      const percClean = totalEggs > 0 ? (totalClean / totalEggs) * 100 : 0;
      const percDirty = totalEggs > 0 ? (totalDirty / totalEggs) * 100 : 0;
      const percCracked = totalEggs > 0 ? (totalCracked / totalEggs) * 100 : 0;
      const percFloor = totalEggs > 0 ? (totalFloor / totalEggs) * 100 : 0;

      // Group by Aviary for context
      const byAviary: Record<string, {eggs: number, rateSum: number, count: number, floor: number}> = {};
      records.forEach(r => {
        if (!byAviary[r.aviary]) byAviary[r.aviary] = { eggs: 0, rateSum: 0, count: 0, floor: 0 };
        byAviary[r.aviary].eggs += r.totalEggs;
        byAviary[r.aviary].floor += (r.floorEggs || 0);
        if (r.layingRate) {
            byAviary[r.aviary].rateSum += r.layingRate;
            byAviary[r.aviary].count++;
        }
      });

      let aviarySummaryText = "";
      Object.entries(byAviary).forEach(([id, data]) => {
          const r = data.count > 0 ? (data.rateSum / data.count) * 100 : 0;
          let extraInfo = "";
          // Highlight floor eggs for Cage Free aviaries
          if ((id.includes("2") || id.includes("4")) && data.floor > 0) {
             const percF = data.eggs > 0 ? (data.floor / data.eggs) * 100 : 0;
             extraInfo = `, Ovos de Cama: ${data.floor} (${percF.toFixed(1)}%)`;
          }
          aviarySummaryText += `- ${id}: ${data.eggs} ovos, Taxa média: ${r.toFixed(1)}%${extraInfo}\n`;
      });

      // Extract Observations
      const observations = records
        .filter(r => r.observation && r.observation.trim() !== '')
        .map(r => `- [${formatDateBr(r.date)} | ${r.aviary}]: ${r.observation}`)
        .join('\n');

      const observationSection = observations 
         ? `\nObservações Registradas no Período (Considere no diagnóstico):\n${observations}\n` 
         : "\nNenhuma observação de manejo registrada no período.\n";

      const prompt = `
        Atue como um zootecnista ou consultor especialista em gestão de aviários de postura comercial.
        Analise os seguintes dados de produção do período filtrado (${filter.time} / ${filter.year || ''} / ${filter.quinzena || ''}).
        
        IMPORTANTE: 
        - Aviários 1 e 3 são sistemas de Gaiola (Convencional).
        - Aviários 2 e 4 são sistemas Livre de Gaiola (Cage Free), onde "Ovos de Cama" é um indicador crítico de manejo.
        
        Dados Gerais Consolidados:
        - Total de Ovos Produzidos: ${totalEggs}
        - Mortalidade Total: ${totalMortality}
        - Taxa de Postura Média: ${avgRate.toFixed(1)}%
        
        Indicadores de Qualidade (% sobre o total):
        - Limpos: ${percClean.toFixed(1)}%
        - Sujos: ${percDirty.toFixed(1)}%
        - Trincados: ${percCracked.toFixed(1)}%
        - Ovos de Cama (Chão): ${percFloor.toFixed(1)}% (Impacta principalmente sistemas Cage Free)
        
        Dados por Aviário:
        ${aviarySummaryText}
        ${observationSection}
        
        Por favor, forneça uma análise técnica estruturada:
        1. **Diagnóstico Geral**: Avalie o desempenho produtivo e sanitário (mortalidade).
        2. **Análise de Qualidade**: Comente sobre as porcentagens de ovos sujos/trincados e, especificamente, sobre a incidência de ovos de cama nos aviários 2 e 4 (Ideal < 1-2%).
        3. **Impacto das Observações**: Se houver observações registradas acima (ex: falta de luz, ração, clima), correlacione explicitamente com as quedas de produção ou qualidade.
        4. **Comparativo**: Destaque discrepâncias entre os aviários.
        5. **Plano de Ação**: Forneça 3 recomendações práticas focadas nos problemas identificados.
        
        Use linguagem técnica mas acessível. Formate com bullet points. Responda em Português.
      `;

      // 2. Call Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      setAiSummary(response.text);

    } catch (e) {
      console.error("Erro ao gerar relatório IA", e);
      setError("Ocorreu um erro ao conectar com a IA. Verifique sua chave de API ou tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-xl font-bold text-gray-800">Relatório</h2>
        <div className="flex gap-2 flex-wrap justify-end">
            <button 
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm font-medium disabled:opacity-70 transition-colors shadow-sm"
            >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {isGenerating ? "Analisando..." : "Gerar Análise IA"}
            </button>
            <button 
                onClick={() => exportToPDF(records, filter)}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 text-sm font-medium transition-colors shadow-sm"
            >
                <Download size={16} /> Exportar PDF
            </button>
            <button 
                onClick={() => exportToCSV(records)}
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium transition-colors shadow-sm"
            >
                <Download size={16} /> Exportar CSV
            </button>
        </div>
      </div>

      {/* AI Summary Section */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 text-sm">
          {error}
        </div>
      )}

      {aiSummary && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="flex justify-between items-start mb-4 border-b border-indigo-200 pb-2">
             <div className="flex items-center gap-2 text-indigo-800 font-bold text-lg">
                <Sparkles size={20} />
                <h3>Análise Inteligente (Gemini)</h3>
             </div>
             <button 
                onClick={() => exportAISummaryToPDF(aiSummary, filter)}
                className="text-indigo-600 hover:text-indigo-800 text-sm font-medium flex items-center gap-1 hover:bg-indigo-100 px-2 py-1 rounded transition-colors"
             >
                <Download size={16} /> Baixar PDF
             </button>
          </div>
          <div className="prose prose-sm text-gray-700 max-w-none whitespace-pre-wrap leading-relaxed">
            {aiSummary}
          </div>
        </div>
      )}

      {/* Existing Table */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-100 z-10 border-r">
                Quinzena
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider border-r bg-blue-50">
                Total Geral
              </th>
              <th className="px-4 py-3 text-right text-xs font-bold text-blue-700 uppercase tracking-wider border-r bg-blue-50">
                Taxa Geral
              </th>
              
              {Object.values(AviaryId).map(id => (
                <React.Fragment key={id}>
                   <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-l">
                     Total {id.replace('Aviário ', 'A')}
                   </th>
                   <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider border-r">
                     Taxa {id.replace('Aviário ', 'A')}
                   </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {reportData.map((row) => (
              <tr key={row.fortnight} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900 sticky left-0 bg-white border-r">
                  {row.fortnight}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-800 text-right bg-blue-50 border-r">
                  {row.totalGeneral.toLocaleString()}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-800 text-right bg-blue-50 border-r">
                  {(row.generalRate * 100).toFixed(1)}%
                </td>
                
                {Object.values(AviaryId).map(id => (
                  <React.Fragment key={id}>
                    <td className="px-2 py-4 whitespace-nowrap text-sm text-gray-700 text-right border-l">
                      {row.aviaryTotals[id] > 0 ? row.aviaryTotals[id].toLocaleString() : '-'}
                    </td>
                    <td className={`px-2 py-4 whitespace-nowrap text-sm text-right border-r ${row.aviaryRates[id] < 0.7 ? 'text-red-600' : 'text-gray-700'}`}>
                      {row.aviaryRates[id] > 0 ? (row.aviaryRates[id] * 100).toFixed(1) + '%' : '-'}
                    </td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
