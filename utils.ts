import { EggRecord, ComputedRecord, AviaryId, FilterState, CharacterizationRecord, FeatheringQuality } from './types';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// --- Date Helpers ---

export const getTodayStr = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isFutureDate = (dateStr: string): boolean => {
  return dateStr > getTodayStr();
};

export const formatDateBr = (dateStr: string): string => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export const formatMonthBr = (yearMonth: string): string => {
  // Expects "YYYY-MM"
  if (!yearMonth || yearMonth.length < 7) return '';
  const [y, m] = yearMonth.split('-');
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const monthIndex = parseInt(m) - 1;
  if (monthIndex < 0 || monthIndex > 11) return yearMonth;
  return `${monthNames[monthIndex]}/${y.slice(2)}`; // Ex: Jan/24
};

export const parseDateFromBr = (dateBr: string): string => {
  if (!dateBr) return getTodayStr();
  // Handle various formats if necessary, standard is DD/MM/YYYY
  if (dateBr.includes('/')) {
      const [d, m, y] = dateBr.split('/');
      // Ensure padding
      const day = d.padStart(2, '0');
      const month = m.padStart(2, '0');
      // Handle 2 digit year if necessary, assume 20xx
      const year = y.length === 2 ? `20${y}` : y;
      return `${year}-${month}-${day}`;
  }
  return dateBr; // Already YYYY-MM-DD or invalid
};

export const getFortnight = (dateStr: string): string => {
  const date = new Date(dateStr);
  const day = date.getUTCDate(); // Use UTC to avoid timezone shifts
  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const mStr = monthNames[date.getUTCMonth()];
  const yStr = date.getUTCFullYear();
  const part = day <= 15 ? "1ª Quinzena" : "2ª Quinzena";
  return `${mStr}/${yStr} - ${part}`;
};

// Comparator for Fortnight strings (e.g., "Jan/2025 - 1ª Quinzena")
export const compareFortnights = (a: string, b: string): number => {
  const monthMap: Record<string, number> = { 
    "Jan": 0, "Fev": 1, "Mar": 2, "Abr": 3, "Mai": 4, "Jun": 5, 
    "Jul": 6, "Ago": 7, "Set": 8, "Out": 9, "Nov": 10, "Dez": 11 
  };

  const parse = (str: string) => {
    // Expected format: "MMM/YYYY - Nª Quinzena"
    const parts = str.split(' - ');
    if (parts.length < 2) return { year: 0, month: 0, q: 0 };
    
    const [datePart, qPart] = parts;
    const [mStr, yStr] = datePart.split('/');
    
    return {
      year: parseInt(yStr) || 0,
      month: monthMap[mStr] !== undefined ? monthMap[mStr] : -1,
      q: qPart.includes('1ª') ? 1 : 2
    };
  };

  const pa = parse(a);
  const pb = parse(b);

  if (pa.year !== pb.year) return pa.year - pb.year;
  if (pa.month !== pb.month) return pa.month - pb.month;
  return pa.q - pb.q;
};

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// --- Computation ---

export const computeRecord = (record: EggRecord, charRecords: CharacterizationRecord[] = []): ComputedRecord => {
  const floorEggs = record.floorEggs || 0;
  const totalEggs = record.clean + record.dirty + record.cracked + floorEggs;
  
  const percClean = totalEggs > 0 ? record.clean / totalEggs : null;
  const percDirty = totalEggs > 0 ? record.dirty / totalEggs : null;
  const percCracked = totalEggs > 0 ? record.cracked / totalEggs : null;
  const percFloorEggs = totalEggs > 0 ? floorEggs / totalEggs : null;
  
  const layingRate = record.birds > 0 ? totalEggs / record.birds : null;

  // Lógica de Vinculação Automática de Lote
  let batchId = record.batchId;
  
  if (charRecords.length > 0) {
     const aviaryChars = charRecords.filter(c => c.aviary === record.aviary);
     const sortedChars = aviaryChars.sort((a, b) => b.date.localeCompare(a.date));
     const activeChar = sortedChars.find(c => c.date <= record.date);
     
     if (activeChar) {
        batchId = activeChar.batchId;
     }
  }

  return {
    ...record,
    batchId: batchId,
    floorEggs, 
    totalEggs,
    percClean,
    percDirty,
    percCracked,
    percFloorEggs,
    layingRate,
    fortnight: getFortnight(record.date),
    month: record.date.substring(0, 7), // YYYY-MM
    year: parseInt(record.date.substring(0, 4)),
    observation: record.observation // Pass observation through
  };
};

// --- Storage ---
const STORAGE_KEY = 'aviary_data_v1';
const STORAGE_KEY_CHAR = 'aviary_data_char_v1';

export const loadRecords = (): EggRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load data", e);
    return [];
  }
};

export const saveRecords = (records: EggRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error("Failed to save data", e);
  }
};

export const loadCharRecords = (): CharacterizationRecord[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_CHAR);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load char data", e);
    return [];
  }
};

export const saveCharRecords = (records: CharacterizationRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_CHAR, JSON.stringify(records));
  } catch (e) {
    console.error("Failed to save char data", e);
  }
};

// --- Colors ---
export const getRateColor = (rate: number | null, type: 'postura' | 'sujo' | 'trincado' | 'mortalidade' | 'cama'): string => {
  if (rate === null) return 'text-gray-400';
  
  switch (type) {
    case 'postura':
      if (rate < 0.70) return 'text-red-600 font-bold';
      if (rate < 0.85) return 'text-orange-500 font-semibold';
      return 'text-green-600 font-bold';
    case 'sujo':
      if (rate > 0.15) return 'text-red-600 font-bold';
      if (rate > 0.10) return 'text-orange-500 font-semibold';
      return 'text-green-600 font-bold';
    case 'trincado':
      if (rate > 0.15) return 'text-red-600 font-bold';
      if (rate > 0.10) return 'text-orange-500 font-semibold';
      return 'text-green-600 font-bold';
    case 'cama':
      if (rate > 0.05) return 'text-red-600 font-bold';
      if (rate > 0.02) return 'text-orange-500 font-semibold';
      return 'text-green-600 font-bold';
    case 'mortalidade':
      if (rate > 5) return 'text-red-600 font-bold';
      if (rate > 0) return 'text-orange-500 font-semibold';
      return 'text-green-600 font-bold';
  }
  return 'text-gray-800';
};

// --- Helper to Generate Filter String ---
const getFilterDescription = (filter: FilterState): string => {
  const filterDescParts = [];
  
  if (filter.aviary !== 'all') {
    filterDescParts.push(`Aviário: ${filter.aviary}`);
  } else {
    filterDescParts.push(`Aviário: Todos`);
  }

  if (filter.batchId) {
    filterDescParts.push(`Lote: ${filter.batchId}`);
  }

  if (filter.quinzena) {
    filterDescParts.push(`Período: ${filter.quinzena}`);
  } else if (filter.year) {
    filterDescParts.push(`Período: Ano ${filter.year}`);
  } else {
    const timeLabels: Record<string, string> = {
      '7d': 'Últimos 7 Dias',
      '30d': 'Últimos 30 Dias',
      'thisMonth': 'Mês Atual',
      'thisYear': 'Ano Atual',
      'all': 'Todo o Período'
    };
    filterDescParts.push(`Período: ${timeLabels[filter.time] || filter.time}`);
  }

  return filterDescParts.join(" | ");
};

// --- Robust CSV Parsing Utility ---
const splitCSVLine = (line: string, delimiter: string): string[] => {
  const res = [];
  let current = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuote = !inQuote;
    } else if (char === delimiter && !inQuote) {
      res.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  res.push(current);
  return res.map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
};

// --- Export CSV (Records) ---
export const exportToCSV = (records: ComputedRecord[]) => {
  const headers = [
    "ID", "Data", "Aviário", "Lote", "Ovos Limpos", "Ovos Sujos", "Ovos Trincados", "Ovos de Cama",
    "Aves Vivas", "Peso Ovos (g)", "Peso Aves (g)", "Mortalidade", "Observação"
  ];

  const rows = records.map(r => [
    r.id,
    formatDateBr(r.date),
    r.aviary,
    r.batchId || "",
    r.clean,
    r.dirty,
    r.cracked,
    r.floorEggs || 0,
    r.birds,
    r.weight ? r.weight.toString().replace('.', ',') : "",
    r.birdWeight ? r.birdWeight.toString().replace('.', ',') : "",
    r.mortality,
    r.observation ? `"${r.observation.replace(/"/g, '""')}"` : ""
  ]);

  let csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(";") + "\n"
    + rows.map(e => e.join(";")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `aviario_registros_${getTodayStr()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// --- Export CSV (Characterization) ---
export const exportCharToCSV = (records: CharacterizationRecord[]) => {
  const headers = [
    "ID", "Data", "Aviário", "Lote", "Idade Semanas", "Peso Lote (g)", "Uniformidade (%)", "Empenamento"
  ];

  const rows = records.map(r => [
    r.id,
    formatDateBr(r.date),
    r.aviary,
    r.batchId,
    r.weekAge,
    r.batchWeight.toString().replace('.', ','),
    r.uniformity.toString().replace('.', ','),
    r.feathering
  ]);

  let csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(";") + "\n"
    + rows.map(e => e.join(";")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `caracterizacao_lotes_${getTodayStr()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};


// --- Parse CSV (Records) ---
export const parseCSV = (csvText: string): EggRecord[] => {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
  const records: EggRecord[] = [];
  
  if (lines.length < 2) return [];

  // Handle BOM if present
  let firstLine = lines[0];
  if (firstLine.charCodeAt(0) === 0xFEFF) {
    firstLine = firstLine.slice(1);
  }
  
  const delimiter = firstLine.includes(';') ? ';' : ',';

  const parseNum = (val: string | undefined): number => {
    if (!val) return 0;
    const cleanVal = val.trim();
    if (!cleanVal) return 0;
    return parseFloat(cleanVal.replace(',', '.'));
  };

  const parseNumNullable = (val: string | undefined): number | null => {
    if (!val || val.trim() === '') return null;
    return parseNum(val);
  };

  const headers = splitCSVLine(firstLine, delimiter).map(h => h.toLowerCase().trim().replace(/"/g, ''));
  
  const idxId = headers.indexOf('id');
  const idxDate = headers.indexOf('data');
  const idxAviary = headers.findIndex(h => h.includes('aviário') || h.includes('aviario'));
  const idxBatch = headers.findIndex(h => h.includes('lote'));

  const idxClean = headers.findIndex(h => h.includes('limpos'));
  const idxDirty = headers.findIndex(h => h.includes('sujos'));
  const idxCracked = headers.findIndex(h => h.includes('trincados'));
  const idxFloor = headers.findIndex(h => h.includes('cama'));
  
  const idxBirds = headers.findIndex(h => h.includes('aves') && h.includes('vivas'));
  
  const idxWeight = headers.findIndex(h => h.includes('peso') && h.includes('ovos'));
  const idxBirdWeight = headers.findIndex(h => h.includes('peso') && h.includes('aves'));
  const idxMortality = headers.findIndex(h => h.includes('mort') || h.includes('mortalidade'));
  const idxObs = headers.findIndex(h => h.includes('obs') || h.includes('observação'));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = splitCSVLine(line, delimiter);
    
    if (cols.length < 3) continue; 

    const dateRaw = cols[idxDate];
    const dateStr = parseDateFromBr(dateRaw);

    const aviaryStr = cols[idxAviary] || 'Aviário 1';
    let aviaryEnum = AviaryId.A1;
    if (aviaryStr.includes('1')) aviaryEnum = AviaryId.A1;
    else if (aviaryStr.includes('2')) aviaryEnum = AviaryId.A2;
    else if (aviaryStr.includes('3')) aviaryEnum = AviaryId.A3;
    else if (aviaryStr.includes('4')) aviaryEnum = AviaryId.A4;

    const record: EggRecord = {
      id: (idxId > -1 && cols[idxId] && cols[idxId].length > 5) ? cols[idxId] : generateUUID(),
      date: dateStr,
      aviary: aviaryEnum,
      batchId: idxBatch > -1 ? cols[idxBatch] : undefined,
      clean: idxClean > -1 ? parseNum(cols[idxClean]) : 0,
      dirty: idxDirty > -1 ? parseNum(cols[idxDirty]) : 0,
      cracked: idxCracked > -1 ? parseNum(cols[idxCracked]) : 0,
      floorEggs: idxFloor > -1 ? parseNum(cols[idxFloor]) : 0,
      birds: idxBirds > -1 ? parseNum(cols[idxBirds]) : 0,
      weight: idxWeight > -1 ? parseNumNullable(cols[idxWeight]) : null,
      birdWeight: idxBirdWeight > -1 ? parseNumNullable(cols[idxBirdWeight]) : null,
      mortality: idxMortality > -1 ? parseNum(cols[idxMortality]) : 0,
      observation: idxObs > -1 ? cols[idxObs] : undefined
    };

    if (!record.date && record.clean === 0 && record.birds === 0) continue;

    records.push(record);
  }

  return records;
};

// --- Parse CSV (Characterization) ---
export const parseCharCSV = (csvText: string): CharacterizationRecord[] => {
  const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== '');
  const records: CharacterizationRecord[] = [];
  
  if (lines.length < 2) return [];

  // Handle BOM
  let firstLine = lines[0];
  if (firstLine.charCodeAt(0) === 0xFEFF) {
    firstLine = firstLine.slice(1);
  }

  const delimiter = firstLine.includes(';') ? ';' : ',';

  const parseNum = (val: string | undefined): number => {
    if (!val) return 0;
    const cleanVal = val.trim();
    if (!cleanVal) return 0;
    return parseFloat(cleanVal.replace(',', '.'));
  };

  const headers = splitCSVLine(firstLine, delimiter).map(h => h.toLowerCase().trim().replace(/"/g, ''));
  
  const idxId = headers.indexOf('id');
  const idxDate = headers.indexOf('data');
  const idxAviary = headers.findIndex(h => h.includes('aviário') || h.includes('aviario'));
  const idxBatch = headers.findIndex(h => h.includes('lote'));
  const idxAge = headers.findIndex(h => h.includes('idade') || h.includes('semanas'));
  const idxWeight = headers.findIndex(h => h.includes('peso'));
  const idxUniformity = headers.findIndex(h => h.includes('uniformidade'));
  const idxFeathering = headers.findIndex(h => h.includes('empenamento'));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = splitCSVLine(line, delimiter);
    
    if (cols.length < 3) continue; 

    const dateStr = parseDateFromBr(cols[idxDate]);

    const aviaryStr = cols[idxAviary] || 'Aviário 1';
    let aviaryEnum = AviaryId.A1;
    if (aviaryStr.includes('1')) aviaryEnum = AviaryId.A1;
    else if (aviaryStr.includes('2')) aviaryEnum = AviaryId.A2;
    else if (aviaryStr.includes('3')) aviaryEnum = AviaryId.A3;
    else if (aviaryStr.includes('4')) aviaryEnum = AviaryId.A4;

    const featheringStr = cols[idxFeathering] || "Bom";
    let featheringEnum = FeatheringQuality.BOM;
    // Map string to Enum
    const fUpper = featheringStr.toUpperCase();
    if (fUpper.includes("MUITO BOM")) featheringEnum = FeatheringQuality.MUITO_BOM;
    else if (fUpper.includes("BOM")) featheringEnum = FeatheringQuality.BOM;
    else if (fUpper.includes("REGULAR")) featheringEnum = FeatheringQuality.REGULAR;
    else if (fUpper.includes("RUIM")) featheringEnum = FeatheringQuality.RUIM;
    else if (fUpper.includes("PESSIMO") || fUpper.includes("PÉSSIMO")) featheringEnum = FeatheringQuality.PESSIMO;

    const record: CharacterizationRecord = {
      id: (idxId > -1 && cols[idxId] && cols[idxId].length > 5) ? cols[idxId] : generateUUID(),
      date: dateStr,
      aviary: aviaryEnum,
      batchId: idxBatch > -1 ? cols[idxBatch] : '',
      weekAge: idxAge > -1 ? parseNum(cols[idxAge]) : 0,
      batchWeight: idxWeight > -1 ? parseNum(cols[idxWeight]) : 0,
      uniformity: idxUniformity > -1 ? parseNum(cols[idxUniformity]) : 0,
      feathering: featheringEnum
    };
    
    // Validate required
    if (!record.date || record.weekAge <= 0) continue;

    records.push(record);
  }
  return records;
};


// --- Export PDF (Data Table) ---
export const exportToPDF = (records: ComputedRecord[], filter: FilterState) => {
  const doc = new jsPDF();
  const today = new Date();
  const dateStr = today.toLocaleString('pt-BR');
  const fileName = `Relatorio_${getTodayStr().split('-').reverse().join('-')}.pdf`;

  // --- Calculate Summary Stats (Respecting filtered records) ---
  const totalEggs = records.reduce((sum, r) => sum + r.totalEggs, 0);
  const totalMortality = records.reduce((sum, r) => sum + r.mortality, 0);
  
  // Avg Laying Rate
  const validRates = records.filter(r => r.layingRate !== null);
  const avgRate = validRates.length > 0 
    ? (validRates.reduce((sum, r) => sum + (r.layingRate || 0), 0) / validRates.length) 
    : 0;

  // Live Birds (Sum of the LAST record of each aviary in the filter period)
  const latestByAviary = new Map<string, {date: string, birds: number}>();
  records.forEach(r => {
    const existing = latestByAviary.get(r.aviary);
    if (!existing || r.date >= existing.date) {
      latestByAviary.set(r.aviary, { date: r.date, birds: r.birds });
    }
  });
  let totalBirds = 0;
  latestByAviary.forEach(val => totalBirds += val.birds);

  // --- Filter Description ---
  const filterText = getFilterDescription(filter);

  // --- PDF Structure ---

  // Header
  doc.setFontSize(18);
  doc.setTextColor(41, 128, 185); // Blue
  doc.text("Relatório de Produção de Ovos", 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${dateStr}`, 14, 28);
  
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text(`Filtros Aplicados: ${filterText}`, 14, 35);

  // Summary Section (Box)
  doc.setDrawColor(200);
  doc.setFillColor(245, 247, 250);
  doc.rect(14, 42, 182, 25, 'FD'); // x, y, w, h

  doc.setFontSize(10);
  doc.text("Total de Ovos", 20, 48);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(totalEggs.toLocaleString(), 20, 55);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Taxa Média", 65, 48);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text((avgRate * 100).toFixed(1) + "%", 65, 55);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Total Aves Vivas", 110, 48);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(totalBirds.toLocaleString(), 110, 55);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Total Mortes", 155, 48);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(192, 57, 43); // Red
  doc.text(totalMortality.toLocaleString(), 155, 55);

  // Reset text color
  doc.setTextColor(0);

  // Table Data Preparation
  const tableRows = records.map(r => [
    formatDateBr(r.date),
    r.aviary,
    r.batchId || "-", // Batch Column
    r.totalEggs.toLocaleString(),
    r.layingRate ? (r.layingRate * 100).toFixed(1) + "%" : "-",
    r.percClean ? (r.percClean * 100).toFixed(1) + "%" : "-",
    r.percDirty ? (r.percDirty * 100).toFixed(1) + "%" : "-",
    r.percCracked ? (r.percCracked * 100).toFixed(1) + "%" : "-",
    r.floorEggs && r.floorEggs > 0 ? r.floorEggs.toString() : "-",
    r.mortality
  ]);

  // Table Generation
  autoTable(doc, {
    startY: 75,
    head: [['Data', 'Aviário', 'Lote', 'T. Ovos', 'Taxa', '% Limp', '% Sujo', '% Trin', 'Cama', 'Mort.']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 2 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    columnStyles: {
      0: { cellWidth: 20 }, // Data
      1: { cellWidth: 15 }, // Aviario
      2: { cellWidth: 20 }, // Lote
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
      7: { halign: 'right' },
      8: { halign: 'right' }, // Cama
      9: { halign: 'right', fontStyle: 'bold', textColor: [192, 57, 43] }
    }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    const footerText = `Filtros: ${filterText} | Total Registros: ${records.length} | Página ${i} de ${pageCount}`;
    doc.text(footerText, 105, 290, { align: 'center' });
  }

  doc.save(fileName);
};

// --- Export PDF (AI Analysis) ---
export const exportAISummaryToPDF = (summary: string, filter: FilterState) => {
  const doc = new jsPDF();
  const today = new Date();
  const dateStr = today.toLocaleString('pt-BR');
  const fileName = `Analise_IA_${getTodayStr().split('-').reverse().join('-')}.pdf`;
  const filterText = getFilterDescription(filter);

  // Header
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229); // Indigo color to match UI
  doc.text("Análise Inteligente de Produção", 14, 20);

  // Meta Info
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${dateStr}`, 14, 28);
  doc.text(`Contexto: ${filterText}`, 14, 34);

  // Divider Line
  doc.setDrawColor(224, 231, 255); // Indigo-100 equivalent
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  // Content
  doc.setFontSize(11);
  doc.setTextColor(20); // Nearly black
  
  // Clean up markdown bold markers for simpler text rendering
  const cleanSummary = summary.replace(/\*\*/g, ''); 
  
  // Split text to fit page width (A4 width ~210mm, minus margins ~180mm)
  const splitText = doc.splitTextToSize(cleanSummary, 180);
  
  // Print Text
  doc.text(splitText, 14, 46);

  // Footer
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Análise gerada por IA (Gemini) - Gestão Aviário | Página ${i} de ${pageCount}`, 105, 290, { align: 'center' });
  }

  doc.save(fileName);
};
