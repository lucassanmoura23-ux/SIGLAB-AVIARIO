
import React, { useState, useEffect } from 'react';
import { CharacterizationRecord, AviaryId, FeatheringQuality, AviaryDetails } from '../types';
import { getTodayStr, generateUUID } from '../utils';
import { Save, X } from 'lucide-react';

interface CharacterizationFormProps {
  initialData?: CharacterizationRecord | null;
  onSave: (record: CharacterizationRecord) => void;
  onCancel: () => void;
}

export const CharacterizationForm: React.FC<CharacterizationFormProps> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Omit<CharacterizationRecord, 'id'>>({
    date: getTodayStr(),
    aviary: AviaryId.A1,
    batchId: '',
    weekAge: 0,
    batchWeight: 0,
    uniformity: 0,
    feathering: FeatheringQuality.BOM,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialData) {
      const { id, ...rest } = initialData;
      setFormData({
        ...rest,
        batchId: rest.batchId || '' // Ensure string even if older records lack it
      });
    }
  }, [initialData]);

  const handleChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

    if (!formData.date) newErrors.date = "Data é obrigatória";
    if (!formData.batchId.trim()) newErrors.batchId = "Número do Lote é obrigatório";
    if (formData.weekAge <= 0) newErrors.weekAge = "Idade do lote deve ser maior que 0";
    if (formData.batchWeight <= 0) newErrors.batchWeight = "Peso do lote é obrigatório";
    if (formData.uniformity < 0 || formData.uniformity > 100) newErrors.uniformity = "Uniformidade deve ser entre 0 e 100%";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSave({
        id: initialData?.id || generateUUID(),
        ...formData
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">
          {initialData ? "Editar Caracterização" : "Nova Caracterização de Lote"}
        </h2>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Linha 1 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${errors.date ? 'border-red-500' : 'border-gray-300'}`}
              />
            </div>

            <div>
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
              <p className="text-xs text-gray-500 mt-1">{AviaryDetails[formData.aviary as AviaryId]}</p>
            </div>

            {/* Linha 2 - Lote e Idade */}
             <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Número do Lote</label>
              <input
                type="text"
                placeholder="Ex: Lote 01/24"
                value={formData.batchId}
                onChange={(e) => handleChange('batchId', e.target.value)}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${errors.batchId ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {errors.batchId && <p className="text-red-500 text-xs mt-1">{errors.batchId}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idade do Lote (Semanas)</label>
              <input
                type="number"
                min="0"
                placeholder="Ex: 25"
                value={formData.weekAge || ''}
                onChange={(e) => handleChange('weekAge', Number(e.target.value))}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${errors.weekAge ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
              {errors.weekAge && <p className="text-red-500 text-xs mt-1">{errors.weekAge}</p>}
            </div>

            {/* Linha 3 - Peso e Uniformidade */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Peso do Lote (g)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Ex: 1550"
                value={formData.batchWeight || ''}
                onChange={(e) => handleChange('batchWeight', Number(e.target.value))}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${errors.batchWeight ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
               {errors.batchWeight && <p className="text-red-500 text-xs mt-1">{errors.batchWeight}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Uniformidade (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                placeholder="Ex: 90"
                value={formData.uniformity || ''}
                onChange={(e) => handleChange('uniformity', Number(e.target.value))}
                className={`w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none ${errors.uniformity ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              />
               {errors.uniformity && <p className="text-red-500 text-xs mt-1">{errors.uniformity}</p>}
            </div>

            {/* Linha 4 - Empenamento */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Empenamento</label>
              <select
                value={formData.feathering}
                onChange={(e) => handleChange('feathering', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {Object.values(FeatheringQuality).map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
        </div>

        <div className="flex justify-end gap-4 pt-6 border-t mt-4">
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
            Salvar Caracterização
          </button>
        </div>

      </form>
    </div>
  );
};
