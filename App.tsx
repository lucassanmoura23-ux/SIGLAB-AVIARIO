
import React, { useState, useEffect, useMemo } from 'react';
import { 
  EggRecord, ComputedRecord, FilterState, ViewState, AviaryId, CharacterizationRecord 
} from './types';
import { 
  loadRecords, saveRecords, computeRecord, getTodayStr, compareFortnights, 
  loadCharRecords, saveCharRecords 
} from './utils';

import { Layout } from './components/Layout';
import { RecordList } from './components/RecordList';
import { RecordForm } from './components/RecordForm';
import { DashboardGeneral } from './components/DashboardGeneral';
import { DashboardAviary } from './components/DashboardAviary';
import { Reports } from './components/Reports';
import { FilterBar } from './components/FilterBar';
import { ConfirmModal } from './components/ConfirmModal';
import { CharacterizationList } from './components/CharacterizationList';
import { CharacterizationForm } from './components/CharacterizationForm';

const App: React.FC = () => {
  // State
  const [rawRecords, setRawRecords] = useState<EggRecord[]>([]);
  const [charRecords, setCharRecords] = useState<CharacterizationRecord[]>([]);
  
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD_GENERAL);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  // Separate delete state for characterization to keep logic clean
  const [deleteCharId, setDeleteCharId] = useState<string | null>(null);

  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showDeleteAllCharConfirm, setShowDeleteAllCharConfirm] = useState(false);
  
  const [filter, setFilter] = useState<FilterState>({
    time: '7d',
    aviary: 'all',
  });

  // Load Data on Mount
  useEffect(() => {
    const loaded = loadRecords();
    setRawRecords(loaded);
    const loadedChar = loadCharRecords();
    setCharRecords(loadedChar);
  }, []);

  // Save Data on Change
  useEffect(() => {
    saveRecords(rawRecords);
  }, [rawRecords]);

  useEffect(() => {
    saveCharRecords(charRecords);
  }, [charRecords]);

  // Compute Records (add derived fields)
  // NOW PASSING charRecords to ensure Batch ID is calculated dynamically
  const computedRecords = useMemo(() => {
    return rawRecords.map(r => computeRecord(r, charRecords)).sort((a, b) => b.date.localeCompare(a.date));
  }, [rawRecords, charRecords]);

  // Sorted Characterization Records
  const sortedCharRecords = useMemo(() => {
    return [...charRecords].sort((a, b) => b.date.localeCompare(a.date));
  }, [charRecords]);

  // Available Fortnights for Filter
  const availableFortnights = useMemo(() => {
      const fqs = new Set<string>(computedRecords.map(r => r.fortnight));
      return Array.from(fqs).sort((a, b) => compareFortnights(b, a)); // Descending Chronological Sort
  }, [computedRecords]);

  // Available Years
  const availableYears = useMemo(() => {
    const years = new Set<string>(computedRecords.map(r => String(r.year)));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [computedRecords]);

  // Available Batches for Filter
  const availableBatches = useMemo(() => {
    const batches = new Set<string>();
    // Collect batches from actual production records
    computedRecords.forEach(r => {
      if (r.batchId) batches.add(r.batchId);
    });
    return Array.from(batches).sort();
  }, [computedRecords]);

  // Apply Filters
  const filteredRecords = useMemo(() => {
    let result = computedRecords;

    // Aviary Filter
    if (filter.aviary !== 'all') {
      result = result.filter(r => r.aviary === filter.aviary);
    }

    // Batch Filter
    if (filter.batchId) {
      result = result.filter(r => r.batchId === filter.batchId);
    }

    // Quinzena Filter (Priority 1)
    if (filter.quinzena) {
        return result.filter(r => r.fortnight === filter.quinzena);
    }

    // Year Filter (Priority 2)
    if (filter.year) {
      return result.filter(r => String(r.year) === filter.year);
    }

    // Time Filter (Default)
    // Using String Comparison YYYY-MM-DD to avoid Timezone bugs
    const getCutoffDate = (daysAgo: number): string => {
        const d = new Date();
        d.setDate(d.getDate() - daysAgo);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    if (filter.time === '7d') {
      const cutoff = getCutoffDate(7);
      result = result.filter(r => r.date >= cutoff);
    } else if (filter.time === '30d') {
      const cutoff = getCutoffDate(30);
      result = result.filter(r => r.date >= cutoff);
    } else if (filter.time === 'thisMonth') {
      const currentMonth = getTodayStr().substring(0, 7); // YYYY-MM
      result = result.filter(r => r.date.startsWith(currentMonth));
    } else if (filter.time === 'thisYear') {
      const currentYear = getTodayStr().substring(0, 4);
      result = result.filter(r => r.date.startsWith(currentYear));
    }

    return result;
  }, [computedRecords, filter]);

  // --- ACTIONS: Egg Records ---

  const handleSaveRecord = (record: EggRecord) => {
    if (editingId) {
      setRawRecords(prev => prev.map(r => r.id === record.id ? record : r));
      setEditingId(null);
    } else {
      setRawRecords(prev => [...prev, record]);
    }
    setCurrentView(ViewState.LIST);
  };

  const handleImportRecords = (newRecords: EggRecord[]) => {
    setRawRecords(prev => {
        const recordMap = new Map<string, EggRecord>();
        prev.forEach(r => {
            const key = `${r.date}|${r.aviary}`;
            recordMap.set(key, r);
        });
        newRecords.forEach(importedRec => {
            const key = `${importedRec.date}|${importedRec.aviary}`;
            if (recordMap.has(key)) {
                const existing = recordMap.get(key)!;
                recordMap.set(key, { ...importedRec, id: existing.id });
            } else {
                recordMap.set(key, importedRec);
            }
        });
        return Array.from(recordMap.values());
    });
  };

  const handleDeleteRequest = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      setRawRecords(prev => prev.filter(r => r.id !== deleteId));
      setDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setDeleteId(null);
  };

  const handleDeleteAllRequest = () => {
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAll = () => {
    setRawRecords([]);
    setShowDeleteAllConfirm(false);
  };

  const handleEditRequest = (id: string) => {
    setEditingId(id);
    setCurrentView(ViewState.FORM);
  };

  const handleCancelForm = () => {
    setEditingId(null);
    setCurrentView(ViewState.LIST);
  };

  // --- ACTIONS: Characterization ---

  const handleSaveChar = (record: CharacterizationRecord) => {
    if (editingId) {
      setCharRecords(prev => prev.map(r => r.id === record.id ? record : r));
      setEditingId(null);
    } else {
      setCharRecords(prev => [...prev, record]);
    }
    setCurrentView(ViewState.CHARACTERIZATION_LIST);
  };

  const handleEditCharRequest = (id: string) => {
    setEditingId(id);
    setCurrentView(ViewState.CHARACTERIZATION_FORM);
  };

  const handleDeleteCharRequest = (id: string) => {
    setDeleteCharId(id);
  };

  const confirmDeleteChar = () => {
    if (deleteCharId) {
        setCharRecords(prev => prev.filter(r => r.id !== deleteCharId));
        setDeleteCharId(null);
    }
  };

  const handleImportCharRecords = (newRecords: CharacterizationRecord[]) => {
      setCharRecords(prev => {
          const recordMap = new Map<string, CharacterizationRecord>();
          prev.forEach(r => {
             const key = `${r.date}|${r.aviary}|${r.batchId}`;
             recordMap.set(key, r);
          });
          newRecords.forEach(importedRec => {
              const key = `${importedRec.date}|${importedRec.aviary}|${importedRec.batchId}`;
              if (recordMap.has(key)) {
                  const existing = recordMap.get(key)!;
                  recordMap.set(key, { ...importedRec, id: existing.id });
              } else {
                  recordMap.set(key, importedRec);
              }
          });
          return Array.from(recordMap.values());
      });
  };

  const handleDeleteAllCharRequest = () => {
      setShowDeleteAllCharConfirm(true);
  };

  const confirmDeleteAllChar = () => {
      setCharRecords([]);
      setShowDeleteAllCharConfirm(false);
  };

  const handleCancelCharForm = () => {
      setEditingId(null);
      setCurrentView(ViewState.CHARACTERIZATION_LIST);
  };

  // --- MEMOS ---

  const recordToEdit = useMemo(() => {
    if (!editingId) return null;
    if (currentView === ViewState.FORM) {
        return rawRecords.find(r => r.id === editingId) || null;
    }
    return null; 
  }, [editingId, rawRecords, currentView]);

  const charRecordToEdit = useMemo(() => {
      if (!editingId) return null;
      if (currentView === ViewState.CHARACTERIZATION_FORM) {
          return charRecords.find(r => r.id === editingId) || null;
      }
      return null;
  }, [editingId, charRecords, currentView]);

  // Render View Content
  const renderContent = () => {
    const commonFilterBar = (
      <FilterBar 
        filter={filter} 
        setFilter={setFilter} 
        availableFortnights={availableFortnights} 
        availableYears={availableYears}
        availableBatches={availableBatches}
      />
    );

    switch (currentView) {
      case ViewState.DASHBOARD_GENERAL:
        return (
          <>
            {commonFilterBar}
            <DashboardGeneral 
                records={filteredRecords} 
                charRecords={charRecords} 
                filter={filter} 
            />
          </>
        );
      case ViewState.DASHBOARD_AVIARY:
        return (
          <>
            {commonFilterBar}
            <DashboardAviary records={filteredRecords} filter={filter} />
          </>
        );
      case ViewState.LIST:
        return (
          <>
            <div className="mb-4">
              {commonFilterBar}
            </div>
            <RecordList 
              records={filteredRecords} 
              onEdit={handleEditRequest} 
              onDelete={handleDeleteRequest}
              onImport={handleImportRecords}
              onDeleteAll={handleDeleteAllRequest}
              filter={filter}
              setFilter={setFilter}
            />
          </>
        );
      case ViewState.FORM:
        return (
          <RecordForm 
            initialData={recordToEdit} 
            onSave={handleSaveRecord} 
            onCancel={handleCancelForm} 
            charRecords={charRecords}
          />
        );
      case ViewState.CHARACTERIZATION_LIST:
        return (
            <CharacterizationList 
                records={sortedCharRecords}
                productionRecords={rawRecords}
                onAdd={() => { setEditingId(null); setCurrentView(ViewState.CHARACTERIZATION_FORM); }}
                onEdit={handleEditCharRequest}
                onDelete={handleDeleteCharRequest}
                onImport={handleImportCharRecords}
                onDeleteAll={handleDeleteAllCharRequest}
            />
        );
      case ViewState.CHARACTERIZATION_FORM:
        return (
            <CharacterizationForm 
                initialData={charRecordToEdit}
                onSave={handleSaveChar}
                onCancel={handleCancelCharForm}
            />
        );
      case ViewState.REPORTS:
        return (
          <>
             <div className="mb-4">
               {commonFilterBar}
             </div>
             <Reports records={filteredRecords} filter={filter} />
          </>
        );
      default:
        return <div>View not found</div>;
    }
  };

  return (
    <Layout currentView={currentView} setView={(v) => { setCurrentView(v); setEditingId(null); }}>
      {renderContent()}
      
      {/* Modal for Egg Records */}
      <ConfirmModal 
        isOpen={!!deleteId}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        message="Tem certeza que deseja excluir este registro de ovos?"
      />

      {/* Modal for Characterization Records - Single Item */}
      <ConfirmModal 
        isOpen={!!deleteCharId}
        onConfirm={confirmDeleteChar}
        onCancel={() => setDeleteCharId(null)}
        message="Tem certeza que deseja excluir esta caracterização do lote?"
      />

      {/* Modal for Egg Records - Delete All */}
      <ConfirmModal 
        isOpen={showDeleteAllConfirm}
        onConfirm={confirmDeleteAll}
        onCancel={() => setShowDeleteAllConfirm(false)}
        message="ATENÇÃO: Tem certeza que deseja apagar TODOS os registros de produção? Esta ação limpará todo o histórico e NÃO pode ser desfeita."
      />

      {/* Modal for Characterization Records - Delete All */}
      <ConfirmModal 
        isOpen={showDeleteAllCharConfirm}
        onConfirm={confirmDeleteAllChar}
        onCancel={() => setShowDeleteAllCharConfirm(false)}
        message="ATENÇÃO: Tem certeza que deseja apagar TODAS as caracterizações de lotes? Isso pode afetar os gráficos de curva de produção."
      />
    </Layout>
  );
};

export default App;
