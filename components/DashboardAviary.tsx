
import React, { useMemo } from 'react';
import { ComputedRecord, AviaryId, FilterState } from '../types';
import { formatDateBr, exportToPDF, formatMonthBr } from '../utils';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell 
} from 'recharts';
import { Download } from 'lucide-react';

interface DashboardProps {
  records: ComputedRecord[];
  filter: FilterState;
}

export const DashboardAviary: React.FC<DashboardProps> = ({ records, filter }) => {
  
  const aviaryData = useMemo(() => {
    // Group records by Aviary ID
    const grouped: Record<string, ComputedRecord[]> = {
      [AviaryId.A1]: [],
      [AviaryId.A2]: [],
      [AviaryId.A3]: [],
      [AviaryId.A4]: []
    };
    
    records.forEach(r => {
      if (grouped[r.aviary]) grouped[r.aviary].push(r);
    });

    // Calculate summarized stats for each aviary
    const summaries = Object.entries(grouped).map(([id, recs]) => {
      const totalEggs = recs.reduce((sum, r) => sum + r.totalEggs, 0);
      const totalMortality = recs.reduce((sum, r) => sum + r.mortality, 0);
      
      // Avg rate
      const rates = recs.map(r => r.layingRate || 0).filter(r => r > 0);
      const avgRate = rates.length ? (rates.reduce((a, b) => a + b, 0) / rates.length) : 0;
      
      // Current Birds (Latest record)
      const latest = recs.sort((a, b) => b.date.localeCompare(a.date))[0];
      const currentBirds = latest ? latest.birds : 0;

      // Mortality Rate Calculation: Mortos / (Vivos + Mortos)
      const initialPopulationRef = currentBirds + totalMortality;
      const mortalityRate = initialPopulationRef > 0 ? (totalMortality / initialPopulationRef) * 100 : 0;

      // Avg Weights
      const validEggWeights = recs.filter(r => r.weight !== null && r.weight !== undefined);
      const avgEggWeight = validEggWeights.length 
        ? validEggWeights.reduce((s, r) => s + (r.weight || 0), 0) / validEggWeights.length 
        : 0;

      const validBirdWeights = recs.filter(r => r.birdWeight !== null && r.birdWeight !== undefined);
      const avgBirdWeight = validBirdWeights.length 
        ? validBirdWeights.reduce((s, r) => s + (r.birdWeight || 0), 0) / validBirdWeights.length 
        : 0;

      // Quality Stats
      const clean = recs.reduce((sum, r) => sum + r.clean, 0);
      const dirty = recs.reduce((sum, r) => sum + r.dirty, 0);
      const cracked = recs.reduce((sum, r) => sum + r.cracked, 0);
      const floor = recs.reduce((sum, r) => sum + (r.floorEggs || 0), 0);

      const percClean = totalEggs > 0 ? (clean / totalEggs) * 100 : 0;
      const percDirty = totalEggs > 0 ? (dirty / totalEggs) * 100 : 0;
      const percCracked = totalEggs > 0 ? (cracked / totalEggs) * 100 : 0;
      const percFloor = totalEggs > 0 ? (floor / totalEggs) * 100 : 0;

      return {
        id,
        totalEggs,
        totalMortality,
        mortalityRate,
        avgRate,
        currentBirds,
        avgEggWeight,
        avgBirdWeight,
        quality: {
          clean, percClean,
          dirty, percDirty,
          cracked, percCracked,
          floor, percFloor
        }
      };
    });

    // Comparative Line Chart Data (Production by MONTH by Aviary)
    const monthlyDataMap = new Map<string, any>();

    records.forEach(r => {
      const monthKey = r.date.substring(0, 7); // YYYY-MM
      
      if (!monthlyDataMap.has(monthKey)) {
        monthlyDataMap.set(monthKey, {
           date: formatMonthBr(monthKey),
           rawDate: monthKey,
           [AviaryId.A1]: 0,
           [AviaryId.A2]: 0,
           [AviaryId.A3]: 0,
           [AviaryId.A4]: 0
        });
      }

      const entry = monthlyDataMap.get(monthKey);
      if (entry[r.aviary] !== undefined) {
        entry[r.aviary] += r.totalEggs;
      }
    });

    const lineChartData = Array.from(monthlyDataMap.values())
      .sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    // Comparative Bar Chart (Avg Rate)
    const barChartData = summaries.map(s => ({
      name: s.id.replace('Aviário ', 'Av. '),
      Taxa: parseFloat((s.avgRate * 100).toFixed(1))
    }));

    return { summaries, lineChartData, barChartData };
  }, [records]);

  const colors = {
    [AviaryId.A1]: '#2563eb', // Blue
    [AviaryId.A2]: '#10b981', // Green
    [AviaryId.A3]: '#f59e0b', // Orange
    [AviaryId.A4]: '#9333ea', // Purple
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-800">Comparativo por Aviário</h2>
        <button 
          onClick={() => exportToPDF(records, filter)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
        >
          <Download size={18} />
          Exportar PDF
        </button>
      </div>
      
      {/* 4 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {aviaryData.summaries.map((s) => (
          <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border-t-4 flex flex-col gap-3" style={{ borderColor: colors[s.id as AviaryId] }}>
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-2">
              <h3 className="font-bold text-gray-800">{s.id}</h3>
              <span className={`text-sm font-bold ${s.avgRate < 0.7 ? 'text-red-600' : 'text-green-600'}`}>
                Taxa: {(s.avgRate * 100).toFixed(1)}%
              </span>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-blue-50 p-2 rounded">
                <span className="text-gray-500 text-xs block">Total Ovos</span>
                <span className="font-bold text-gray-800">{s.totalEggs.toLocaleString()}</span>
              </div>
              <div className="bg-purple-50 p-2 rounded">
                <span className="text-gray-500 text-xs block">Aves Vivas</span>
                <span className="font-bold text-gray-800">{s.currentBirds.toLocaleString()}</span>
              </div>
            </div>

            {/* Weights */}
            <div className="bg-gray-50 p-2 rounded text-sm space-y-1">
               <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">Peso Médio Ovos:</span>
                  <span className="font-semibold text-gray-700">{s.avgEggWeight > 0 ? s.avgEggWeight.toFixed(1) + 'g' : '-'}</span>
               </div>
               <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-xs">Peso Médio Aves:</span>
                  <span className="font-semibold text-gray-700">{s.avgBirdWeight > 0 ? s.avgBirdWeight.toFixed(1) + 'g' : '-'}</span>
               </div>
            </div>

            {/* Quality Breakdown */}
            <div className="space-y-1 pt-1">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Qualidade</div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-green-700">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div> Limpos
                </span>
                <div className="text-right">
                  <span className="font-bold text-gray-700">{s.quality.clean.toLocaleString()}</span>
                  <span className="text-gray-400 ml-1">({s.quality.percClean.toFixed(1)}%)</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-orange-700">
                  <div className="w-2 h-2 rounded-full bg-orange-500"></div> Sujos
                </span>
                <div className="text-right">
                  <span className="font-bold text-gray-700">{s.quality.dirty.toLocaleString()}</span>
                  <span className="text-gray-400 ml-1">({s.quality.percDirty.toFixed(1)}%)</span>
                </div>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="flex items-center gap-1 text-red-700">
                  <div className="w-2 h-2 rounded-full bg-red-500"></div> Trincados
                </span>
                <div className="text-right">
                  <span className="font-bold text-gray-700">{s.quality.cracked.toLocaleString()}</span>
                  <span className="text-gray-400 ml-1">({s.quality.percCracked.toFixed(1)}%)</span>
                </div>
              </div>

              {s.quality.floor > 0 && (
                <div className="flex justify-between items-center text-xs">
                    <span className="flex items-center gap-1 text-purple-700">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div> Cama
                    </span>
                    <div className="text-right">
                    <span className="font-bold text-gray-700">{s.quality.floor.toLocaleString()}</span>
                    <span className="text-gray-400 ml-1">({s.quality.percFloor.toFixed(1)}%)</span>
                    </div>
                </div>
              )}
            </div>

            {/* Mortality Footer */}
            <div className="mt-auto pt-2 border-t border-gray-100 flex justify-between items-center text-xs">
                <span className="text-gray-500">Mortalidade Total:</span>
                <span className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
                    {s.totalMortality} ({s.mortalityRate.toFixed(2)}%)
                </span>
            </div>

          </div>
        ))}
      </div>

      {/* Comparative Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Production Lines */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Produção por Mês (Comparativo)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={aviaryData.lineChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip labelFormatter={(l) => `Período: ${l}`} />
                <Legend />
                {Object.values(AviaryId).map(id => (
                  <Line 
                    key={id} 
                    type="monotone" 
                    dataKey={id} 
                    stroke={colors[id]} 
                    strokeWidth={2} 
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rate Bars */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Taxa de Postura Média</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={aviaryData.barChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="Taxa" fill="#2563eb" radius={[4, 4, 0, 0]}>
                  {aviaryData.barChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={Object.values(colors)[index]} />
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
