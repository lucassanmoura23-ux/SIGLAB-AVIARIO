
import React, { useState, useMemo, useRef } from 'react';
import { ComputedRecord, FilterState, AviaryId, EggRecord } from '../types';
import { formatDateBr, getRateColor, exportToCSV, parseCSV } from '../utils';
import { Edit2, Trash2, Download, Search, Upload } from 'lucide-react';

interface RecordListProps {
  records: ComputedRecord[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (newRecords: EggRecord[]) => void;
  onDeleteAll: () => void;
  filter: FilterState;
  setFilter: (f: FilterState) => void;
}

export const RecordList: React.FC<RecordListProps> = ({ records, onEdit, onDelete, onImport, onDeleteAll, filter, setFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredRecords = useMemo(() => {
    let res = records;

    // Filter by Search (Date)
    if (searchTerm) {
      res = res.filter(r => r.date.includes(searchTerm) || formatDateBr(r.date).includes(searchTerm));
    }

    return res;
  }, [records, searchTerm]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          const importedRecords = parseCSV(text);
          if (importedRecords.length > 0) {
            onImport(importedRecords);
            alert(`${importedRecords.length} registros importados com sucesso!`);
          } else {
            alert('Nenhum registro válido encontrado no arquivo.');
          }
        } catch (err) {
          console.error(err);
          alert('Erro ao processar o arquivo CSV.');
        }
      }
    };
    reader.readAsText(file);
    // Reset value so same file can be selected again if needed
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar data..." 
            className="pl-10 pr-4 py-2 border rounded-lg w-full focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex gap-2 flex-wrap justify-end">
           <input 
              type="file" 
              accept=".csv" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload}
           />
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
           >
             <Upload size={18} />
             <span>Importar CSV</span>
           </button>
           <button 
             onClick={() => exportToCSV(filteredRecords)}
             className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
           >
             <Download size={18} />
             <span>Exportar CSV</span>
           </button>
           <button 
             onClick={onDeleteAll}
             className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 border border-red-200 transition-colors"
           >
             <Trash2 size={18} />
             <span>Apagar Tudo</span>
           </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aviário</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Ovos</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Taxa Postura</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% Limp</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% Sujo</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% Trin</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Cama</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Mort.</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-10 text-center text-gray-500">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatDateBr(rec.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {rec.aviary}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                      {rec.batchId || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                      {rec.totalEggs}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getRateColor(rec.layingRate, 'postura')}`}>
                      {rec.layingRate ? (rec.layingRate * 100).toFixed(1) + '%' : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                      {rec.percClean ? (rec.percClean * 100).toFixed(1) + '%' : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getRateColor(rec.percDirty, 'sujo')}`}>
                      {rec.percDirty ? (rec.percDirty * 100).toFixed(1) + '%' : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getRateColor(rec.percCracked, 'trincado')}`}>
                      {rec.percCracked ? (rec.percCracked * 100).toFixed(1) + '%' : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getRateColor(rec.percFloorEggs, 'cama')}`}>
                      {rec.floorEggs && rec.floorEggs > 0 ? rec.floorEggs : '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-right ${getRateColor(rec.mortality, 'mortalidade')}`}>
                      {rec.mortality}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onEdit(rec.id); }}
                        className="text-blue-600 hover:text-blue-900 mx-2 p-1 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(rec.id); }}
                        className="text-red-600 hover:text-red-900 mx-2 p-1 hover:bg-red-50 rounded"
                        title="Excluir"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
