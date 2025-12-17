
import React, { useState, useEffect } from 'react';
import { EggRecord, AviaryId, AviaryDetails, CharacterizationRecord } from '../types';
import { getTodayStr, generateUUID } from '../utils';
import { Save, X, AlertCircle, Link } from 'lucide-react';

interface RecordFormProps {
  initialData?: EggRecord | null;
  onSave: (record: EggRecord) => void;
  onCancel: () => void;
  charRecords: CharacterizationRecord[];
}

export const RecordForm: React.FC<RecordFormProps> = ({ initialData, onSave, onCancel, charRecords }) => {
  const [formData, setFormData] = useState<Omit<EggRecord, 'id'>>({
    date: getTodayStr(),
    aviary: AviaryId.A1,
    batchId: '',
    clean: 0,
    dirty: 0,
    cracked: 0,
    floorEggs: 0,
    birds: 0,
    weight: null,
    birdWeight: null,
    mortality: 0,
    observation: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      const { id, ...rest } = initialData;
      setFormData({
        ...rest,
        batchId: rest.batchId || '',
        birdWeight: rest.birdWeight || null,
        floorEggs: rest.floorEggs || 0,
        observation: rest.observation || ''
      });
    }
  }, [initialData]);

  // Auto-detect Batch Logic - ALWAYS ACTIVE to ensure consistency with Date/Aviary
  useEffect(() => {
    // Find the most recent characterization entry that is BEFORE or EQUAL to the record date
    const activeChar = charRecords
        .filter(c => c.aviary === formData.aviary && c.date <= formData.date)
        .sort((a, b) => b.date.localeCompare(a.date))[0];

    if (activeChar && activeChar.batchId) {
        setFormData(prev => ({ ...prev, batchId: activeChar.batchId }));
        // Clear batch error if it exists
        setErrors(prev => {
            const { batchId, ...rest } = prev;
            return rest;
        });
    } else {
        setFormData(prev => ({ ...prev, batchId: '' }));
    }

  }, [formData.date, formData.aviary, charRecords]);

  // Determine if it's Cage Free (Aviary 2 or 4) to show Floor Eggs
  const isCageFree = formData.aviary === AviaryId.A2 || formData.aviary === AviaryId.A4;

  // Live Calculations
  const floorEggs = isCageFree ? (formData.floorEggs || 0) : 0;
  const totalEggs = (formData.clean || 0) + (formData.dirty || 0) + (formData.cracked || 0) + floorEggs;
  
  const layingRate = formData.birds > 0 ? totalEggs / formData.birds : 0;
  const percClean = totalEggs > 0 ? (formData.clean || 0) / totalEggs : 0;
  const percDirty = totalEggs > 0 ? (formData.dirty || 0) / totalEggs : 0;
  const percCracked = totalEggs > 0 ? (formData.cracked || 0) / totalEggs : 0;
  const percFloor = totalEggs > 0 ? floorEggs / totalEggs : 0;

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for field
    if (errors[field]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[field];
        return newErrs;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Date
    if (!formData.date) newErrors.date = "Data é obrigatória";
    
    // Batch
    if (!formData.batchId) newErrors.batchId = "Nenhum lote ativo encontrado. Vá em 'Caracterização' e cadastre um lote para este aviário/data.";

    // Birds
    if (formData.birds <= 0) newErrors.birds = "Mínimo 1 ave viva necessária";

    // Weight (Eggs)
    if (formData.weight !== null && formData.weight !== undefined && String(formData.weight) !== '') {
      const w = Number(formData.weight);
      if (w < 0) newErrors.weight = "Não pode ser negativo";
    }

    // Weight (Birds)
    if (formData.birdWeight !== null && formData.birdWeight !== undefined && String(formData.birdWeight) !== '') {
      const w = Number(formData.birdWeight);
      if (w < 0) newErrors.birdWeight = "Não pode ser negativo";
    }

    // Negatives
    if (formData.clean < 0) newErrors.clean = "Não pode ser negativo";
    if (formData.dirty < 0) newErrors.dirty = "Não pode ser negativo";
    if (formData.cracked < 0) newErrors.cracked = "Não pode ser negativo";
    if (isCageFree && (formData.floorEggs || 0) < 0) newErrors.floorEggs = "Não pode ser negativo";
    if (formData.mortality < 0) newErrors.mortality = "Não pode ser negativo";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Helper to parse nullable numbers safely
      const parseNullable = (val: any) => {
          if (val === null || val === undefined || String(val).trim() === '') return null;
          return Number(val);
      };

      onSave({
        id: initialData?.id || generateUUID(),
        ...formData,
        floorEggs: isCageFree ? formData.floorEggs : 0, // Ensure 0 if switched back to cage
        weight: parseNullable(formData.weight),
        birdWeight: parseNullable(formData.birdWeight)
      });
    } else {
        // Show immediate feedback to user if validation fails (especially for the Batch ID confusion)
        if (!formData.batchId) {
            alert("ERRO: Não é possível salvar sem um Lote vinculado.\n\nO sistema busca o lote automaticamente na aba 'Caracterização'.\nCadastre a caracterização do lote para este aviário e data antes de lançar a produção.");
        } else {
            alert("Verifique os erros no formulário antes de salvar.");
        }
    }
  };

  const percentFormat = (val: number) => (val * 100).toFixed(1) + '%';

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {initialData ? "Editar Registro" : "Novo Registro de Produção"}
        </h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* SECTION 1 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-blue-800 border-b pb-2">1. Dados do Lote</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${errors.date ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Aviário</label>
              <select
                value={formData.aviary}
                onChange={(e) => handleChange('aviary', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Object.values(AviaryId).map(id => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1 truncate">{AviaryDetails[formData.aviary as AviaryId]}</p>
            </div>

            <div className="md:col-span-1">
               <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                   Lote (Automático)
                   {formData.batchId && <Link size={12} className="text-green-600" />}
               </label>
               <input 
                  type="text"
                  readOnly
                  value={formData.batchId || ''}
                  placeholder={formData.batchId ? "" : "Sem Lote Ativo"}
                  className={`w-full p-2 border rounded outline-none bg-gray-100 text-gray-600 cursor-not-allowed font-medium ${errors.batchId ? 'border-red-500 bg-red-50' : 'border-gray-200'}`}
               />
               {!formData.batchId && (
                   <p className="text-xs text-orange-600 mt-1 font-semibold">Necessário cadastrar Caracterização.</p>
               )}
               {errors.batchId && <p className="text-red-500 text-xs mt-1">{errors.batchId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aves Vivas</label>
              <input
                type="number"
                value={formData.birds || ''}
                placeholder="0"
                onChange={(e) => handleChange('birds', Number(e.target.value))}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${errors.birds ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {errors.birds && <p className="text-red-500 text-xs mt-1">{errors.birds}</p>}
            </div>
          </div>
        </div>

        {/* SECTION 2 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-blue-800 border-b pb-2">2. Produção do Dia</h3>
          <div className={`grid grid-cols-1 ${isCageFree ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-6`}>
            <div>
              <label className="block text-sm font-medium text-green-700 mb-1">Ovos Limpos</label>
              <input
                type="number"
                min="0"
                value={formData.clean || ''}
                placeholder="0"
                onChange={(e) => handleChange('clean', Number(e.target.value))}
                className="w-full p-2 border border-green-200 rounded focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-orange-600 mb-1">Ovos Sujos</label>
              <input
                type="number"
                min="0"
                value={formData.dirty || ''}
                placeholder="0"
                onChange={(e) => handleChange('dirty', Number(e.target.value))}
                className="w-full p-2 border border-orange-200 rounded focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-red-600 mb-1">Ovos Trincados</label>
              <input
                type="number"
                min="0"
                value={formData.cracked || ''}
                placeholder="0"
                onChange={(e) => handleChange('cracked', Number(e.target.value))}
                className="w-full p-2 border border-red-200 rounded focus:ring-2 focus:ring-red-500 outline-none"
              />
            </div>
            
            {isCageFree && (
              <div className="animate-in fade-in duration-300">
                <label className="block text-sm font-medium text-amber-700 mb-1">Ovos de Cama</label>
                <input
                  type="number"
                  min="0"
                  value={formData.floorEggs || ''}
                  placeholder="0"
                  onChange={(e) => handleChange('floorEggs', Number(e.target.value))}
                  className="w-full p-2 border border-amber-200 rounded focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            )}

            <div className="bg-gray-100 p-3 rounded-lg flex flex-col justify-center items-center">
              <span className="text-xs uppercase text-gray-500 font-bold">Total Ovos</span>
              <span className="text-2xl font-bold text-gray-800">{totalEggs}</span>
            </div>
          </div>
        </div>

        {/* SECTION 3 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-blue-800 border-b pb-2">3. Indicadores (Automático)</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 bg-green-50 rounded border border-green-100">
              <span className="text-xs text-green-700 block">Limpos</span>
              <span className="text-lg font-bold text-green-800">{percentFormat(percClean)}</span>
            </div>
            <div className={`p-3 rounded border ${percDirty > 0.15 ? 'bg-red-50 border-red-100 text-red-800' : percDirty > 0.10 ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
              <span className="text-xs block">Sujos</span>
              <span className="text-lg font-bold">{percentFormat(percDirty)}</span>
            </div>
            <div className={`p-3 rounded border ${percCracked > 0.15 ? 'bg-red-50 border-red-100 text-red-800' : percCracked > 0.10 ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
              <span className="text-xs block">Trincados</span>
              <span className="text-lg font-bold">{percentFormat(percCracked)}</span>
            </div>
            {isCageFree && (
                 <div className={`p-3 rounded border ${percFloor > 0.05 ? 'bg-red-50 border-red-100 text-red-800' : 'bg-amber-50 border-amber-100 text-amber-800'}`}>
                    <span className="text-xs block">Cama</span>
                    <span className="text-lg font-bold">{percentFormat(percFloor)}</span>
                 </div>
            )}
            <div className={`p-3 rounded border ${layingRate < 0.70 ? 'bg-red-50 border-red-100 text-red-800' : layingRate < 0.85 ? 'bg-orange-50 border-orange-100 text-orange-800' : 'bg-green-50 border-green-100 text-green-800'}`}>
              <span className="text-xs block">Taxa Postura</span>
              <span className="text-lg font-bold">{percentFormat(layingRate)}</span>
            </div>
          </div>
        </div>

        {/* SECTION 4 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-blue-800 border-b pb-2">4. Manejo</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso Ovos (g)</label>
              <input
                type="number"
                step="0.1"
                placeholder="0"
                value={formData.weight === null ? '' : formData.weight}
                onChange={(e) => handleChange('weight', e.target.value)}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${errors.weight ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {errors.weight && <p className="text-red-500 text-xs mt-1">{errors.weight}</p>}
            </div>
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso Aves (g)</label>
              <input
                type="number"
                step="0.1"
                placeholder="0"
                value={formData.birdWeight === null ? '' : formData.birdWeight}
                onChange={(e) => handleChange('birdWeight', e.target.value)}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${errors.birdWeight ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {errors.birdWeight && <p className="text-red-500 text-xs mt-1">{errors.birdWeight}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mortalidade</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  value={formData.mortality || ''}
                  placeholder="0"
                  onChange={(e) => handleChange('mortality', Number(e.target.value))}
                  className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${formData.mortality > 5 ? 'text-red-600 font-bold border-red-300' : 'border-gray-300'}`}
                />
                {formData.mortality > 5 && (
                  <AlertCircle size={16} className="absolute right-3 top-3 text-red-500" />
                )}
              </div>
            </div>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observação (Facultativo)</label>
            <textarea
              value={formData.observation || ''}
              onChange={(e) => handleChange('observation', e.target.value)}
              placeholder="Digite aqui ocorrências relevantes (ex: falta de energia, troca de ração, vacinação, clima extremo...)"
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm h-24 resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700 font-medium flex items-center gap-2"
          >
            <Save size={18} />
            Salvar Registro
          </button>
        </div>

      </form>
    </div>
  );
};
