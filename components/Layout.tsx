
import React, { useState } from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, List, FileText, PlusCircle, LineChart, ClipboardCheck, LucideIcon } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  setView: (v: ViewState) => void;
}

const NavItem = ({ 
  view, 
  current, 
  label, 
  icon: Icon, 
  onClick 
}: { 
  view: ViewState; 
  current: ViewState; 
  label: string; 
  icon: LucideIcon; 
  onClick: () => void 
}) => {
  const isActive = view === current;
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center space-x-3 px-3 py-1.5 rounded-md transition-colors mb-0.5 ${
        isActive 
          ? 'bg-blue-600 text-white shadow-sm' 
          : 'text-gray-600 hover:bg-blue-50 hover:text-blue-600'
      }`}
    >
      <Icon size={16} />
      <span className="font-medium text-sm">{label}</span>
    </button>
  );
};

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView }) => {
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="flex flex-col md:flex-row min-h-[100dvh] bg-gray-100">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white border-r border-gray-200 fixed h-full z-10 shadow-lg">
        <div className="p-2 border-b border-gray-100 flex flex-col items-center text-center bg-white">
          
          {/* Logo Container - Super Compacto para ganhar espaço */}
          <div className="w-16 h-16 flex items-center justify-center mb-1 mt-1 transition-transform duration-300 hover:scale-105">
            {!logoError ? (
              <img 
                src="logo.png" 
                alt="SIGLAB Logo" 
                className="w-full h-full object-contain drop-shadow-sm"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-b from-blue-900 to-blue-950 flex flex-col items-center justify-center mb-1 shadow-md border-2 border-blue-500">
                <div className="text-white font-black text-xs tracking-tighter">SIG</div>
              </div>
            )}
          </div>

          <h1 className="text-sm font-bold text-blue-900 tracking-tight leading-none">
            Gestão Aviária
          </h1>
          <p className="text-[9px] text-gray-400 font-medium mt-0.5">Controle de Produção</p>
        </div>
        
        <nav className="flex-1 px-2 py-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 px-2">Geral</div>
          <NavItem 
            view={ViewState.DASHBOARD_GENERAL} 
            current={currentView} 
            label="Dashboard" 
            icon={LayoutDashboard} 
            onClick={() => setView(ViewState.DASHBOARD_GENERAL)} 
          />
          <NavItem 
            view={ViewState.DASHBOARD_AVIARY} 
            current={currentView} 
            label="Por Aviário" 
            icon={LineChart} 
            onClick={() => setView(ViewState.DASHBOARD_AVIARY)} 
          />

          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 mt-2 px-2">Dados</div>
          <NavItem 
            view={ViewState.LIST} 
            current={currentView} 
            label="Registros" 
            icon={List} 
            onClick={() => setView(ViewState.LIST)} 
          />
          <NavItem 
            view={ViewState.FORM} 
            current={currentView} 
            label="Novo Registro" 
            icon={PlusCircle} 
            onClick={() => setView(ViewState.FORM)} 
          />
          
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 mt-2 px-2">Qualidade</div>
          <NavItem 
            view={ViewState.CHARACTERIZATION_LIST} 
            current={currentView} 
            label="Caracterização" 
            icon={ClipboardCheck} 
            onClick={() => setView(ViewState.CHARACTERIZATION_LIST)} 
          />

          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 mt-2 px-2">Análise</div>
          <NavItem 
            view={ViewState.REPORTS} 
            current={currentView} 
            label="Relatórios IA" 
            icon={FileText} 
            onClick={() => setView(ViewState.REPORTS)} 
          />
        </nav>
        
        {/* Footer genérico compacto */}
        <div className="p-2 bg-gray-50 border-t border-gray-200 text-[10px] text-center">
          <p className="font-bold text-[#1e3a8a]">SIGLAB v1.0</p>
          <p className="text-gray-400 text-[8px]">Direitos reservados</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-20 px-4 py-2 flex justify-between items-center shadow-sm h-14">
        <div className="flex items-center gap-2">
            {/* Logo Mobile */}
            <div className="h-8 w-8 flex items-center justify-center">
               {!logoError ? (
                 <img 
                    src="logo.png" 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                    onError={() => setLogoError(true)}
                 />
               ) : (
                 <div className="h-7 w-7 rounded-full bg-blue-900 flex items-center justify-center text-white font-bold text-[8px] border border-blue-700">
                    SIG
                 </div>
               )}
            </div>
            <div className="leading-tight">
                <h1 className="text-sm font-bold text-blue-900">SIGLAB</h1>
            </div>
        </div>
        
        <button className="text-gray-600 p-1 border rounded hover:bg-gray-100" onClick={() => {
            alert(`SIGLAB Aviário\nVersão 1.0.0`);
        }}>
          <List size={20} />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 md:ml-56 p-3 md:p-6 pt-16 md:pt-4 overflow-x-hidden w-full bg-gray-50 pb-24 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-1 z-20 shadow-[0_-1px_3px_rgba(0,0,0,0.1)] pb-safe-or-2">
         <button onClick={() => setView(ViewState.DASHBOARD_GENERAL)} className={`p-2 rounded flex flex-col items-center ${currentView === ViewState.DASHBOARD_GENERAL ? 'text-blue-600' : 'text-gray-400'}`}>
            <LayoutDashboard size={18}/>
            <span className="text-[9px] mt-0.5">Geral</span>
         </button>
         <button onClick={() => setView(ViewState.DASHBOARD_AVIARY)} className={`p-2 rounded flex flex-col items-center ${currentView === ViewState.DASHBOARD_AVIARY ? 'text-blue-600' : 'text-gray-400'}`}>
            <LineChart size={18}/>
            <span className="text-[9px] mt-0.5">Aviários</span>
         </button>
         <button onClick={() => setView(ViewState.CHARACTERIZATION_LIST)} className={`p-2 rounded flex flex-col items-center ${currentView === ViewState.CHARACTERIZATION_LIST ? 'text-blue-600' : 'text-gray-400'}`}>
            <ClipboardCheck size={18}/>
            <span className="text-[9px] mt-0.5">Lotes</span>
         </button>
         <button onClick={() => setView(ViewState.FORM)} className={`p-2 rounded flex flex-col items-center ${currentView === ViewState.FORM ? 'text-blue-600' : 'text-gray-400'}`}>
            <PlusCircle size={18}/>
            <span className="text-[9px] mt-0.5">Novo</span>
         </button>
      </div>
    </div>
  );
};
