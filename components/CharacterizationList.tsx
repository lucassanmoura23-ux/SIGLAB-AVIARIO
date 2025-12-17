
import React, { useRef, useState } from 'react';
import { CharacterizationRecord, FeatheringQuality, AviaryId, EggRecord } from '../types';
import { formatDateBr, parseCharCSV, exportCharToCSV } from '../utils';
import { Edit2, Trash2, PlusCircle, ClipboardCheck, Download, Upload, ChevronDown, ChevronUp, Bird } from 'lucide-react';

interface CharacterizationListProps {
  records: CharacterizationRecord[];
  productionRecords: EggRecord[];
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onImport: (newRecords: CharacterizationRecord[]) => void;
  onDeleteAll: () => void;
}

export const CharacterizationList: React.FC<CharacterizationListProps> = ({ 
    records, 
    productionRecords,
    onAdd, 
    onEdit, 
    onDelete, 
    onImport, 
    onDeleteAll 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State to track which aviary sections are open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
      [AviaryId.A1]: false,
      [AviaryId.A2]: false,
      [AviaryId.A3]: false,
      [AviaryId.A4]: false,
  });

  const toggleSection = (aviary: string) => {
      setOpenSections(prev => ({
          ...prev,
          [aviary]: !prev[aviary]
      }));
  };

  // Helper to get current bird count from production records
  const getCurrentBirds = (aviary: string): number => {
      const filtered = productionRecords.filter(r => r.aviary === aviary);
      if (filtered.length === 0) return 0;
      // Sort descending by date to find the latest
      filtered.sort((a, b) => b.date.localeCompare(a.date));
      return filtered[0].birds;
  };

  const getFeatheringBadge = (status: FeatheringQuality) => {
    switch (status) {
        case FeatheringQuality.MUITO_BOM: return <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded">Muito Bom</span>;
        case FeatheringQuality.BOM: return <span className="bg-green-50 text-green-600 text-xs font-semibold px-2.5 py-0.5 rounded">Bom</span>;
        case FeatheringQuality.REGULAR: return <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-2.5 py-0.5 rounded">Regular</span>;
        case FeatheringQuality.RUIM: return <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded">Ruim</span>;
        case FeatheringQuality.PESSIMO: return <span className="bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">Péssimo</span>;
        default: return status;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        try {
          const importedRecords = parseCharCSV(text);
          if (importedRecords.length > 0) {
            onImport(importedRecords);
            alert(`${importedRecords.length} caracterizações importadas com sucesso!`);
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
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Header and Buttons */}
      <div className="flex flex-col xl:flex-row justify-between items-center gap-4 bg-white p-6 rounded-lg shadow-sm">
         <div className="flex items-center gap-3 w-full xl:w-auto">
             <div className="p-3 bg-blue-100 rounded-full text-blue-600">
                <ClipboardCheck size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold text-gray-800">Caracterização do Lote</h2>
                <p className="text-sm text-gray-500">Gestão de lotes e histórico por aviário.</p>
             </div>
         </div>
         
         <div className="flex gap-2 flex-wrap justify-end w-full xl:w-auto">
             <input 
                type="file" 
                accept=".csv" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFileUpload}
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm shadow-sm"
             >
               <Upload size={16} />
               <span>Importar</span>
             </button>
             <button 
               onClick={() => exportCharToCSV(records)}
               className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm shadow-sm"
             >
               <Download size={16} />
               <span>Exportar</span>
             </button>
             <button 
                onClick={onDeleteAll}
                className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 border border-red-200 transition-colors text-sm shadow-sm"
             >
               <Trash2 size={16} />
               <span>Apagar Tudo</span>
             </button>
             <button 
                 onClick={onAdd}
                 className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-sm ml-2"
               >
                 <PlusCircle size={18} />
                 <span>Nova Caracterização</span>
               </button>
         </div>
      </div>

      {/* Aviary Groups */}
      <div className="grid grid-cols-1 gap-4">
          {Object.values(AviaryId).map((aviary) => {
              const currentBirds = getCurrentBirds(aviary);
              const isOpen = openSections[aviary];
              const aviaryRecords = records.filter(r => r.aviary === aviary);
              
              return (
                <div key={aviary} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {/* Header Rectangle */}
                    <button 
                        onClick={() => toggleSection(aviary)}
                        className={`w-full flex justify-between items-center p-5 transition-colors ${isOpen ? 'bg-blue-50 border-b border-blue-100' : 'bg-white hover:bg-gray-50'}`}
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-lg ${isOpen ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                <Bird size={24} />
                            </div>
                            <div className="text-left">
                                <h3 className={`text-lg font-bold ${isOpen ? 'text-blue-800' : 'text-gray-800'}`}>{aviary}</h3>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    Saldo Atual: <span className="font-semibold text-gray-900">{currentBirds.toLocaleString()} aves</span>
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                             <span className="text-xs font-medium uppercase tracking-wider hidden md:block">
                                 {isOpen ? 'Ocultar Lotes' : 'Ver Lotes'}
                             </span>
                             {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                    </button>

                    {/* Expandable Table Area */}
                    {isOpen && (
                        <div className="p-0 animate-in fade-in slide-in-from-top-2 duration-300">
                            {aviaryRecords.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 bg-gray-50">
                                    <p>Nenhum lote caracterizado para este aviário.</p>
                                    <button onClick={onAdd} className="mt-2 text-blue-600 hover:underline text-sm font-medium">
                                        Adicionar agora
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lote</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Idade (Sem.)</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Peso (g)</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Uniformidade</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Empenamento</th>
                                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                                        </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-100">
                                            {aviaryRecords.map((rec) => (
                                                <tr key={rec.id} className="hover:bg-blue-50/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                        {formatDateBr(rec.date)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-semibold">
                                                        {rec.batchId || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-bold">
                                                        {rec.weekAge}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                                                        {rec.batchWeight}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                                                        {rec.uniformity}%
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                                        {getFeatheringBadge(rec.feathering)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center">
                                                        <button 
                                                            onClick={() => onEdit(rec.id)}
                                                            className="text-blue-600 hover:text-blue-900 mx-2 p-1 hover:bg-blue-50 rounded"
                                                            title="Editar"
                                                        >
                                                            <Edit2 size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={() => onDelete(rec.id)}
                                                            className="text-red-600 hover:text-red-900 mx-2 p-1 hover:bg-red-50 rounded"
                                                            title="Excluir"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
              );
          })}
      </div>
    </div>
  );
};
