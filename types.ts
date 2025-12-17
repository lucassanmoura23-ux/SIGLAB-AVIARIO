
export enum AviaryId {
  A1 = "Aviário 1",
  A2 = "Aviário 2",
  A3 = "Aviário 3",
  A4 = "Aviário 4"
}

export const AviaryDetails = {
  [AviaryId.A1]: "Postura de galinhas vermelhas em gaiolas",
  [AviaryId.A2]: "Postura de galinhas vermelhas livre de gaiolas",
  [AviaryId.A3]: "Postura de galinhas brancas em gaiolas",
  [AviaryId.A4]: "Postura de galinhas vermelhas livre de gaiolas"
};

export enum FeatheringQuality {
  MUITO_BOM = "Muito Bom",
  BOM = "Bom",
  REGULAR = "Regular",
  RUIM = "Ruim",
  PESSIMO = "Péssimo"
}

export interface EggRecord {
  id: string;
  date: string; // YYYY-MM-DD
  aviary: AviaryId;
  batchId?: string; // Número do Lote (Link com Caracterização)
  clean: number;
  dirty: number;
  cracked: number;
  floorEggs?: number; // Ovos de Cama (Apenas A2 e A4)
  birds: number;
  weight: number | null; // Peso dos Ovos (g)
  birdWeight?: number | null; // Peso das Aves (g ou kg)
  mortality: number; // Default 0
  observation?: string; // Campo facultativo para notas de manejo
}

export interface CharacterizationRecord {
  id: string;
  date: string; // YYYY-MM-DD
  aviary: AviaryId;
  batchId: string; // Número do Lote
  weekAge: number; // Idade do lote em semanas
  batchWeight: number; // Peso do lote
  uniformity: number; // Uniformidade (%)
  feathering: FeatheringQuality; // Empenamento
}

export interface ComputedRecord extends EggRecord {
  totalEggs: number;
  percClean: number | null;
  percDirty: number | null;
  percCracked: number | null;
  percFloorEggs: number | null;
  layingRate: number | null;
  fortnight: string;
  month: string;
  year: number;
}

export type TimeFilter = '7d' | '30d' | 'thisMonth' | 'thisYear' | 'all';

export interface FilterState {
  time: TimeFilter;
  aviary: AviaryId | 'all';
  quinzena?: string; // Optional specific fortnight filter
  year?: string; // Optional specific year filter
  batchId?: string; // Optional specific batch filter
}

export enum ViewState {
  DASHBOARD_GENERAL = 'dashboard_general',
  DASHBOARD_AVIARY = 'dashboard_aviary',
  LIST = 'list',
  FORM = 'form',
  REPORTS = 'reports',
  CHARACTERIZATION_LIST = 'characterization_list',
  CHARACTERIZATION_FORM = 'characterization_form'
}
