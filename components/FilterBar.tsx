
import React from 'react';
import { FilterState, TimeFilter, AviaryId } from '../types';
import { Filter } from 'lucide-react';

interface FilterBarProps {
  filter: FilterState;
  setFilter: (f: FilterState) => void;
  availableFortnights: string[];
  availableYears: string[];
  availableBatches: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({ filter, setFilter, availableFortnights, availableYears, availableBatches }) => {
  
  const handleTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter({ ...filter, time: e.target.value as TimeFilter, quinzena: undefined, year: undefined });
  };

  const handleAviaryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter({ ...filter, aviary: e.target.value as any });
  };
  
  const handleFortnightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value;
      if (val) {
          setFilter({ ...filter, time: 'all', quinzena: val, year: undefined });
      } else {
          setFilter({ ...filter, quinzena: undefined });
      }
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      setFilter({ ...filter, time: 'all', year: val, quinzena: undefined });
    } else {
      setFilter({ ...filter, year: undefined });
    }
  };

  const handleBatchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val) {
      setFilter({ ...filter, batchId: val });
    } else {
      setFilter({ ...filter, batchId: undefined });
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-gray-500 font-medium mb-1">
        <Filter size={20} />
        <span>Filtros:</span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
        <select 
          value={filter.quinzena || filter.year ? '' : filter.time} 
          onChange={handleTimeChange}
          disabled={!!filter.quinzena || !!filter.year}
          className="p-2 border rounded hover:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="7d">Últimos 7 Dias</option>
          <option value="30d">Últimos 30 Dias</option>
          <option value="thisMonth">Mês Atual</option>
          <option value="thisYear">Ano Atual</option>
          <option value="all">Todo o Período</option>
        </select>

        <select 
            value={filter.year || ''} 
            onChange={handleYearChange}
            className="p-2 border rounded hover:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
        >
            <option value="">-- Por Ano --</option>
            {availableYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
        </select>

        <select 
            value={filter.quinzena || ''} 
            onChange={handleFortnightChange}
            disabled={!!filter.year}
            className="p-2 border rounded hover:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-400"
        >
            <option value="">-- Por Quinzena --</option>
            {availableFortnights.map(fq => (
                <option key={fq} value={fq}>{fq}</option>
            ))}
        </select>

        <select 
          value={filter.aviary} 
          onChange={handleAviaryChange}
          className="p-2 border rounded hover:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="all">Todos Aviários</option>
          {Object.values(AviaryId).map(id => (
            <option key={id} value={id}>{id}</option>
          ))}
        </select>

        <select 
          value={filter.batchId || ''} 
          onChange={handleBatchChange}
          className="p-2 border rounded hover:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="">-- Todos Lotes --</option>
          {availableBatches.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>
      
      {(filter.time !== '7d' || filter.aviary !== 'all' || filter.quinzena || filter.year || filter.batchId) && (
          <button 
            onClick={() => setFilter({ time: '7d', aviary: 'all', quinzena: undefined, year: undefined, batchId: undefined })}
            className="text-sm text-blue-600 hover:underline ml-auto"
          >
              Limpar Filtros
          </button>
      )}
    </div>
  );
};
