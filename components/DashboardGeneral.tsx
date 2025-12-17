
import React, { useMemo } from 'react';
import { ComputedRecord, FilterState, CharacterizationRecord } from '../types';
import { Egg, TrendingUp, Bird, AlertTriangle, Scale, Weight, Download, LucideIcon } from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from 'recharts';
import { exportToPDF, formatMonthBr } from '../utils';

interface DashboardProps {
  records: ComputedRecord[];
  filter: FilterState;
  charRecords?: CharacterizationRecord[]; // Optional prop to calculate age
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  subtext?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, colorClass, subtext }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start space-x-4 transition-all hover:shadow-md">
    <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10 text-opacity-100`}>
      <Icon className={colorClass.replace('bg-', 'text-')} size={28} />
    </div>
    <div>
      <p className="text-gray-500 text-sm font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
      {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
    </div>
  </div>
);

interface QualityCardProps {
  label: string;
  value: number;
  percentage: string | number;
  colorClass: {
    border: string;
    textLabel: string;
    textValue: string;
    textPerc: string;
  };
}

const QualityCard: React.FC<QualityCardProps> = ({ label, value, percentage, colorClass }) => (
  <div className={`p-4 rounded-xl border ${colorClass.border} bg-white shadow-sm flex flex-col items-center justify-center hover:bg-gray-50 transition-colors`}>
    <span className={`text-sm font-medium ${colorClass.textLabel}`}>{label}</span>
    <span className={`text-2xl font-bold ${colorClass.textValue}`}>{value.toLocaleString()}</span>
    <span className={`text-sm font-semibold ${colorClass.textPerc}`}>{percentage}%</span>
  </div>
);

export const DashboardGeneral: React.FC<DashboardProps> = ({ records, filter, charRecords = [] }) => {
  
  const stats = useMemo(() => {
    if (records.length === 0) return null;

    // 1. Total Eggs
    const totalEggs = records.reduce((acc, r) => acc + r.totalEggs, 0);

    // 2. Average Laying Rate
    const rateSum = records.reduce((acc, r) => acc + (r.layingRate || 0), 0);
    const validRateCount = records.filter(r => r.layingRate !== null).length;
    const avgRate = validRateCount > 0 ? rateSum / validRateCount : 0;

    // 3. Live Birds (Approximation for period based on latest records per aviary)
    const latestByAviary = new Map<string, {date: string, birds: number}>();
    records.forEach(r => {
      const existing = latestByAviary.get(r.aviary);
      if (!existing || r.date >= existing.date) {
        latestByAviary.set(r.aviary, { date: r.date, birds: r.birds });
      }
    });
    let totalBirds = 0;
    latestByAviary.forEach(val => totalBirds += val.birds);

    // 4. Total Mortality & Rate Calculation
    const totalMortality = records.reduce((acc, r) => acc + r.mortality, 0);
    const initialPopulationRef = totalBirds + totalMortality;
    const mortalityRate = initialPopulationRef > 0 ? (totalMortality / initialPopulationRef) * 100 : 0;

    // 5. Weights
    // Egg Weight
    const validEggWeights = records.filter(r => r.weight !== null && r.weight !== undefined);
    const avgEggWeight = validEggWeights.length 
      ? validEggWeights.reduce((s, r) => s + (r.weight || 0), 0) / validEggWeights.length 
      : 0;

    // Bird Weight
    const validBirdWeights = records.filter(r => r.birdWeight !== null && r.birdWeight !== undefined);
    const avgBirdWeight = validBirdWeights.length 
      ? validBirdWeights.reduce((s, r) => s + (r.birdWeight || 0), 0) / validBirdWeights.length 
      : 0;

    // 6. Quality Data
    const totalClean = records.reduce((acc, r) => acc + r.clean, 0);
    const totalDirty = records.reduce((acc, r) => acc + r.dirty, 0);
    const totalCracked = records.reduce((acc, r) => acc + r.cracked, 0);
    const totalFloor = records.reduce((acc, r) => acc + (r.floorEggs || 0), 0);
    const totalAll = totalClean + totalDirty + totalCracked + totalFloor;

    const percClean = totalAll > 0 ? (totalClean / totalAll) * 100 : 0;
    const percDirty = totalAll > 0 ? (totalDirty / totalAll) * 100 : 0;
    const percCracked = totalAll > 0 ? (totalCracked / totalAll) * 100 : 0;
    const percFloor = totalAll > 0 ? (totalFloor / totalAll) * 100 : 0;

    // 7. Production Line Data (GROUPED BY MONTH)
    const groupedByMonth = new Map<string, { key: string, total: number, rateSum: number, count: number }>();
    records.forEach(r => {
      // Key: YYYY-MM
      const key = r.date.substring(0, 7);
      const curr = groupedByMonth.get(key) || { key, total: 0, rateSum: 0, count: 0 };
      
      curr.total += r.totalEggs;
      if (r.layingRate !== null) {
        curr.rateSum += r.layingRate;
        curr.count += 1;
      }
      groupedByMonth.set(key, curr);
    });
    
    const chartData = Array.from(groupedByMonth.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map(d => ({
        date: formatMonthBr(d.key), // Jan/24
        key: d.key,
        Produção: d.total,
        Taxa: d.count > 0 ? (d.rateSum / d.count) * 100 : 0
      }));

    // 8. Production Curve by Batch (Lote) Logic
    const batchCurveDataMap = new Map<number, any>(); // Key: Age in Weeks

    // Filter valid records that have batchId and layRate
    records.filter(r => r.batchId && r.layingRate !== null).forEach(r => {
        // Find corresponding char record to calculate age
        const batchChars = charRecords.filter(c => c.batchId === r.batchId);
        if (batchChars.length === 0) return;

        // Use the closest char record prior to record date
        const charRef = batchChars.sort((a, b) => b.date.localeCompare(a.date)).find(c => c.date <= r.date);
        
        if (charRef) {
            // Calculate week difference
            const d1 = new Date(charRef.date);
            const d2 = new Date(r.date);
            const diffTime = Math.abs(d2.getTime() - d1.getTime());
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
            const currentAge = charRef.weekAge + diffWeeks;

            if (!batchCurveDataMap.has(currentAge)) {
                batchCurveDataMap.set(currentAge, { age: currentAge });
            }
            const entry = batchCurveDataMap.get(currentAge);
            
            // Average the rate if multiple records for same age/batch (e.g. daily records)
            // Structure: { age: 25, 'Lote A': 90, 'Lote B': 85 }
            
            if (!entry[r.batchId!]) {
                 entry[r.batchId!] = { sum: 0, count: 0 };
            }
            entry[r.batchId!].sum += (r.layingRate! * 100);
            entry[r.batchId!].count += 1;
        }
    });

    const batchCurveData = Array.from(batchCurveDataMap.values())
        .map((item: any) => {
            const row: any = { age: item.age };
            Object.keys(item).forEach(key => {
                if (key !== 'age') {
                    row[key] = parseFloat((item[key].sum / item[key].count).toFixed(1));
                }
            });
            return row;
        })
        .sort((a, b) => a.age - b.age);

    // Extract all unique batchIds for Lines
    const allBatches = new Set<string>();
    batchCurveData.forEach(row => {
        Object.keys(row).forEach(k => {
            if (k !== 'age') allBatches.add(k);
        });
    });

    return {
      totalEggs,
      avgRate,
      totalBirds,
      totalMortality,
      mortalityRate,
      avgEggWeight,
      avgBirdWeight,
      qualityStats: {
        clean: { value: totalClean, perc: percClean.toFixed(1) },
        dirty: { value: totalDirty, perc: percDirty.toFixed(1) },
        cracked: { value: totalCracked, perc: percCracked.toFixed(1) },
        floor: { value: totalFloor, perc: percFloor.toFixed(1) }
      },
      qualityData: [
        { name: 'Limpos', value: totalClean, color: '#10b981' },
        { name: 'Sujos', value: totalDirty, color: '#f59e0b' },
        { name: 'Trincados', value: totalCracked, color: '#ef4444' },
        { name: 'Cama', value: totalFloor, color: '#a855f7' },
      ].filter(d => d.value > 0), // Only show valid segments
      chartData,
      batchCurveData,
      batchIds: Array.from(allBatches)
    };
  }, [records, charRecords]);

  if (!stats) {
    return <div className="p-12 text-center text-gray-500 bg-white rounded-lg shadow-sm border border-gray-200">Sem dados para os filtros selecionados. Adicione novos registros.</div>;
  }

  // Predefined colors for batches
  const batchColors = ['#2563eb', '#16a34a', '#d97706', '#9333ea', '#db2777', '#0891b2', '#4b5563'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex justify-end mb-2">
        <button 
          onClick={() => exportToPDF(records, filter)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition-colors text-sm font-medium"
        >
          <Download size={18} />
          Exportar PDF
        </button>
      </div>
      
      {/* 1. KEY INDICATORS (CARDS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          label="Total Ovos" 
          value={stats.totalEggs.toLocaleString()} 
          icon={Egg} 
          colorClass="bg-blue-600" 
          subtext="(filtro atual)"
        />
        <StatCard 
          label="Taxa Média Postura" 
          value={(stats.avgRate * 100).toFixed(1) + '%'} 
          icon={TrendingUp} 
          colorClass="bg-green-600" 
        />
        <StatCard 
          label="Aves Vivas" 
          value={stats.totalBirds.toLocaleString()} 
          icon={Bird} 
          colorClass="bg-purple-600" 
          subtext="(saldo atual)"
        />
        <StatCard 
          label="Mortalidade" 
          value={`${stats.totalMortality} (${stats.mortalityRate.toFixed(2)}%)`} 
          icon={AlertTriangle} 
          colorClass="bg-red-600" 
          subtext="Total (Taxa no Período)"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard 
            label="Peso Médio Ovos (g)" 
            value={stats.avgEggWeight > 0 ? stats.avgEggWeight.toFixed(1) + ' g' : '-'} 
            icon={Scale} 
            colorClass="bg-teal-600" 
        />
        <StatCard 
            label="Peso Médio Aves (g)" 
            value={stats.avgBirdWeight > 0 ? stats.avgBirdWeight.toFixed(1) + ' g' : '-'} 
            icon={Weight} 
            colorClass="bg-indigo-600" 
        />
      </div>

      {/* 2. QUALITY SECTION */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">1</span>
            Qualidade dos Ovos
        </h3>
        <div className="flex flex-col lg:flex-row gap-8 items-center">
            {/* Cards Breakdown */}
            <div className="w-full lg:w-1/3 grid grid-cols-2 gap-4">
                <QualityCard 
                    label="Limpos" 
                    value={stats.qualityStats.clean.value} 
                    percentage={stats.qualityStats.clean.perc} 
                    colorClass={{border: 'border-green-100', textLabel: 'text-green-600', textValue: 'text-green-900', textPerc: 'text-green-700'}}
                />
                <QualityCard 
                    label="Sujos" 
                    value={stats.qualityStats.dirty.value} 
                    percentage={stats.qualityStats.dirty.perc} 
                    colorClass={{border: 'border-yellow-100', textLabel: 'text-yellow-600', textValue: 'text-yellow-900', textPerc: 'text-yellow-700'}}
                />
                <QualityCard 
                    label="Trincados" 
                    value={stats.qualityStats.cracked.value} 
                    percentage={stats.qualityStats.cracked.perc} 
                    colorClass={{border: 'border-red-100', textLabel: 'text-red-600', textValue: 'text-red-900', textPerc: 'text-red-700'}}
                />
                {stats.qualityStats.floor.value > 0 && (
                    <QualityCard 
                        label="Cama" 
                        value={stats.qualityStats.floor.value} 
                        percentage={stats.qualityStats.floor.perc} 
                        colorClass={{border: 'border-purple-100', textLabel: 'text-purple-600', textValue: 'text-purple-900', textPerc: 'text-purple-700'}}
                    />
                )}
            </div>

            {/* Pie Chart */}
            <div className="w-full lg:w-2/3 h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={stats.qualityData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                        {stats.qualityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(val: number) => val.toLocaleString()} />
                    <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>

      {/* 3. PRODUCTION RATE CHART */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">2</span>
            Desempenho Produtivo (Mensal)
        </h3>
        <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{fontSize: 12}} />
            <YAxis tick={{fontSize: 12}} />
            <Tooltip 
                formatter={(value: number) => value.toLocaleString()}
                labelFormatter={(label) => `Período: ${label}`}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            />
            <Legend />
            <Line type="monotone" dataKey="Produção" stroke="#2563eb" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
            </LineChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* 4. BATCH CURVE */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center gap-2">
            <span className="bg-blue-100 text-blue-700 w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">3</span>
            Curva de Maturidade do Lote (Postura x Idade)
        </h3>
        <p className="text-xs text-gray-500 mb-4 ml-8">Comparativo de desempenho entre lotes baseado na idade semanal das aves.</p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.batchCurveData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="age" 
                type="number" 
                domain={['auto', 'auto']} 
                label={{ value: 'Idade (Semanas)', position: 'insideBottom', offset: -5, fontSize: 12 }} 
                tick={{fontSize: 12}}
              />
              <YAxis 
                domain={[0, 100]} 
                label={{ value: 'Postura (%)', angle: -90, position: 'insideLeft', fontSize: 12 }} 
                tick={{fontSize: 12}}
              />
              <Tooltip 
                 formatter={(value: number) => value.toFixed(1) + '%'}
                 labelFormatter={(label) => `${label} Semanas`}
                 contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              />
              <Legend verticalAlign="top" height={36}/>
              {stats.batchIds.map((batchId, index) => (
                  <Line 
                    key={batchId}
                    type="monotone" 
                    dataKey={batchId} 
                    name={`Lote: ${batchId}`}
                    stroke={batchColors[index % batchColors.length]} 
                    strokeWidth={3} 
                    dot={{r: 3}} 
                    connectNulls
                  />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
};
