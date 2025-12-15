import React, { useState, useEffect } from 'react';
import { 
  Lock, Calendar, Trophy, Users, Map as MapIcon, Info, 
  Menu, X, Plus, Trash2, Edit2, CheckCircle, Shield, Medal, AlertTriangle, LogOut, Loader2
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { INITIAL_LOCATIONS, INITIAL_STAFF } from './constants';
import { Category, Gender, Match, Team, StaffMember, Court, Player, LocationGuide } from './types';
import { generateTable } from './utils';
import { supabase } from './supabaseClient';

// --- HELPERS: DATABASE MAPPING ---

const mapTeamFromDB = (t: any): Team => ({
    id: t.id,
    name: t.nombre,
    category: t.categoria,
    gender: t.genero,
    zone: t.zona,
    players: t.jugadores ? t.jugadores.map((p: any) => ({
        id: p.id,
        name: p.nombre,
        number: p.numero,
        position: p.posicion
    })).sort((a: any, b: any) => Number(a.number) - Number(b.number)) : []
});

const mapMatchFromDB = (m: any): Match => ({
    id: m.id,
    date: m.fecha,
    time: (m.hora && typeof m.hora === 'string') ? m.hora.slice(0, 5) : '00:00',
    court: m.lugar,
    category: m.categoria,
    gender: m.genero,
    homeTeamId: m.local,
    awayTeamId: m.visitante,
    isFinished: m.is_finished,
    sets: typeof m.sets === 'string' ? JSON.parse(m.sets) : (m.sets || []),
    mvpHomeId: m.mvp_local,
    mvpAwayId: m.mvp_visitante,
    stage: 'Fase Regular'
});

const mapStaffFromDB = (s: any): StaffMember => ({
    id: s.id,
    name: s.nombre,
    role: s.rol
});

// --- COMPONENTS ---

const TabButton = ({ active, label, icon: Icon, onClick }: any) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-full py-3 transition-colors ${
      active ? 'text-favale-dark font-bold' : 'text-green-600/70 hover:text-green-700'
    }`}
  >
    <Icon size={24} strokeWidth={active ? 2.5 : 2} />
    <span className="text-[10px] mt-1 uppercase tracking-wide">{label}</span>
  </button>
);

const HomeView = () => (
  <div className="space-y-6 animate-fade-in pb-20">
    <div className="bg-gradient-to-br from-favale-dark to-favale-primary text-white p-6 rounded-3xl shadow-xl mx-4 mt-4">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight mb-2">USHUAIA 2025</h1>
          <p className="text-green-100 text-sm font-medium uppercase tracking-wider">Fin del Mundo</p>
        </div>
        <Trophy className="text-yellow-400 opacity-80" size={40} />
      </div>
      <div className="mt-8 border-t border-green-700 pt-4">
        <p className="text-sm leading-relaxed text-green-50">
          Bienvenidos a la 14° Edición del Torneo Homenaje al Profesor Hugo Italo Favale.
        </p>
      </div>
    </div>

    <div className="mx-4 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className="bg-green-100 p-3 rounded-full text-favale-dark">
          <MapIcon size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">Cancha 1 y 2</h3>
          <p className="text-sm text-gray-500">Cochocho Vargas</p>
        </div>
      </div>
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
        <div className="bg-green-100 p-3 rounded-full text-favale-dark">
          <MapIcon size={24} />
        </div>
        <div>
          <h3 className="font-bold text-gray-800">Cancha 4</h3>
          <p className="text-sm text-gray-500">Gimnasio Favale</p>
        </div>
      </div>
    </div>
  </div>
);

const ResultModal = ({ match, teams, onClose, onSave }: any) => {
    const isSub16 = match.category === Category.SUB16;
    const maxSets = isSub16 ? 5 : 3;
    const [sets, setSets] = useState<{home: string, away: string}[]>(
        match.sets.length > 0 ? match.sets.map((s:any) => ({home: s.home.toString(), away: s.away.toString()})) 
        : Array.from({ length: maxSets }, () => ({home: '', away: ''}))
    );
    const [mvpHome, setMvpHome] = useState(match.mvpHomeId || '');
    const [mvpAway, setMvpAway] = useState(match.mvpAwayId || '');

    const homeTeam = teams.find((t:Team) => t.id === match.homeTeamId);
    const awayTeam = teams.find((t:Team) => t.id === match.awayTeamId);

    const handleSetChange = (index: number, type: 'home' | 'away', val: string) => {
        const newSets = [...sets];
        newSets[index] = { ...newSets[index], [type]: val };
        setSets(newSets);
    };

    const handleSave = () => {
        const validSets = sets.filter(s => s.home !== '' && s.away !== '').map(s => ({
            home: parseInt(s.home),
            away: parseInt(s.away)
        }));
        onSave(match, validSets, mvpHome, mvpAway);
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-fade-in">
                <div className="bg-favale-dark p-4 flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2"><Trophy size={18}/> Detalles del Partido</h3>
                    <button onClick={onClose}><X size={20}/></button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[80vh]">
                    <div className="text-center mb-6">
                        <div className="text-xs text-gray-400 mb-1">{match.date} • {match.time}</div>
                        <div className="text-xl font-bold text-gray-800">{homeTeam?.name} <span className="text-gray-400 text-sm mx-2">vs</span> {awayTeam?.name}</div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 text-center">Resultados (Sets)</h4>
                        {sets.map((set, idx) => (
                            <div key={idx} className="flex items-center justify-center gap-4">
                                <span className="text-xs font-bold text-gray-300 w-8 text-right">SET {idx + 1}</span>
                                <input 
                                    type="number" 
                                    className="w-16 h-10 text-center border rounded-lg bg-gray-50 focus:ring-2 focus:ring-favale-primary outline-none"
                                    placeholder="-"
                                    value={set.home}
                                    onChange={(e) => handleSetChange(idx, 'home', e.target.value)}
                                />
                                <span className="text-gray-300">:</span>
                                <input 
                                    type="number" 
                                    className="w-16 h-10 text-center border rounded-lg bg-gray-50 focus:ring-2 focus:ring-favale-primary outline-none"
                                    placeholder="-"
                                    value={set.away}
                                    onChange={(e) => handleSetChange(idx, 'away', e.target.value)}
                                />
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                         <div className="space-y-2">
                             <label className="text-xs font-bold text-gray-500 block">MVP {homeTeam?.name}</label>
                             <select className="w-full text-sm p-2 border rounded-lg" value={mvpHome} onChange={e => setMvpHome(e.target.value)}>
                                 <option value="">Seleccionar...</option>
                                 {homeTeam?.players.map((p: Player) => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                             </select>
                         </div>
                         <div className="space-y-2">
                             <label className="text-xs font-bold text-gray-500 block">MVP {awayTeam?.name}</label>
                             <select className="w-full text-sm p-2 border rounded-lg" value={mvpAway} onChange={e => setMvpAway(e.target.value)}>
                                 <option value="">Seleccionar...</option>
                                 {awayTeam?.players.map((p: Player) => <option key={p.id} value={p.id}>{p.number} - {p.name}</option>)}
                             </select>
                         </div>
                    </div>

                    <button onClick={handleSave} className="w-full py-3 bg-favale-primary text-white font-bold rounded-xl shadow-lg shadow-green-200">
                        Guardar Resultados
                    </button>
                </div>
            </div>
        </div>
    )
}

const FixtureView = ({ matches, teams, isAdmin, onUpdateMatch, onAddMatch, onDeleteMatch, isLoading }: any) => {
  const [filterText, setFilterText] = useState('');
  const [filterCat, setFilterCat] = useState<string>('Todas');
  const [filterGender, setFilterGender] = useState<string>('Todas');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMatchData, setNewMatchData] = useState<Partial<Match>>({
    category: Category.SUB12,
    gender: Gender.FEMALE,
    court: Court.CANCHA4,
    date: new Date().toISOString().split('T')[0],
    time: '12:00'
  });
  const [confirmData, setConfirmData] = useState<{match: Match, sets: any[], homeMvp?: string, awayMvp?: string} | null>(null);

  const filteredMatches = matches.filter((m: Match) => {
    const home = teams.find((t:Team) => t.id === m.homeTeamId)?.name || '';
    const away = teams.find((t:Team) => t.id === m.awayTeamId)?.name || '';
    const searchMatch = home.toLowerCase().includes(filterText.toLowerCase()) || 
                        away.toLowerCase().includes(filterText.toLowerCase());
    const catMatch = filterCat === 'Todas' || m.category === filterCat;
    const genderMatch = filterGender === 'Todas' || m.gender === filterGender;
    return searchMatch && catMatch && genderMatch;
  }).sort((a: Match, b: Match) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

  const getTeamName = (id: string) => teams.find((t: Team) => t.id === id)?.name || 'Desconocido';

  const handleInitiateSave = (match: Match, sets: any[], homeMvp?: string, awayMvp?: string) => {
    setConfirmData({ match, sets, homeMvp, awayMvp });
  };

  const handleConfirmSave = () => {
      if (confirmData) {
        const { match, sets, homeMvp, awayMvp } = confirmData;
        const isFinished = sets.length > 0; 
        onUpdateMatch({ ...match, sets, isFinished, mvpHomeId: homeMvp, mvpAwayId: awayMvp });
        setEditingMatch(null);
        setConfirmData(null);
      }
  };

  const handleCreateMatch = () => {
    if(newMatchData.homeTeamId && newMatchData.awayTeamId) {
        onAddMatch(newMatchData);
        setShowAddModal(false);
        setNewMatchData({ ...newMatchData, homeTeamId: '', awayTeamId: '' }); 
    }
  }

  const getFormattedDate = (dateStr: string) => {
      if(!dateStr) return '';
      const days = ['DOMINGO','LUNES','MARTES','MIERCOLES','JUEVES','VIERNES','SABADO'];
      const date = new Date(dateStr + 'T12:00:00');
      const dayName = days[date.getDay()];
      const [yyyy, mm, dd] = dateStr.split('-');
      return `${dayName} ${dd}/${mm}`;
  }

  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-favale-primary" size={48} /></div>;

  return (
    <div className="pb-24 px-4 pt-4">
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 sticky top-0 z-10 border-b border-gray-100">
        <div className="relative mb-3">
            <input 
                type="text" 
                placeholder="Buscar equipo..." 
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-favale-primary outline-none"
                value={filterText}
                onChange={e => setFilterText(e.target.value)}
            />
            <Info className="absolute left-3 top-2.5 text-gray-400" size={16} />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-2">
            {['Todas', ...Object.values(Category)].map(cat => (
                <button 
                    key={cat}
                    onClick={() => setFilterCat(cat)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        filterCat === cat ? 'bg-favale-dark text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {['Todas', ...Object.values(Gender)].map(g => (
                <button 
                    key={g}
                    onClick={() => setFilterGender(g)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        filterGender === g ? 'bg-favale-accent text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                    {g}
                </button>
            ))}
        </div>
      </div>

      {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full mb-6 bg-favale-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 hover:bg-green-700 transition-colors"
          >
              <Plus size={20} /> Nuevo Partido
          </button>
      )}

      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
            <div className="text-center text-gray-400 py-10">No hay partidos encontrados</div>
        ) : filteredMatches.map((match: Match) => {
            const homeSets = match.sets.filter(s => s.home > s.away).length;
            const awaySets = match.sets.filter(s => s.away > s.home).length;

            return (
            <div key={match.id} className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-favale-accent relative overflow-hidden">
                <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                    <span className="text-favale-dark font-lexend font-bold text-base flex items-center gap-2 uppercase tracking-tight">
                        <Calendar size={18} strokeWidth={2.5}/> {getFormattedDate(match.date)}, {match.time}HS
                    </span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 px-2 py-1 rounded">
                        {match.court.split('(')[0]}
                    </span>
                </div>
                
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 text-right flex flex-col items-end">
                        <span className={`font-bold text-lg leading-tight ${match.isFinished && homeSets > awaySets ? 'text-favale-dark' : 'text-gray-700'}`}>
                            {getTeamName(match.homeTeamId)}
                        </span>
                        {match.isFinished && (
                            <span className="text-2xl font-black text-favale-dark mt-1">{homeSets}</span>
                        )}
                    </div>
                    
                    <div className="flex flex-col items-center justify-center min-w-[30px] pt-1">
                         <span className="text-gray-300 font-bold text-sm">VS</span>
                    </div>

                    <div className="flex-1 text-left flex flex-col items-start">
                        <span className={`font-bold text-lg leading-tight ${match.isFinished && awaySets > homeSets ? 'text-favale-dark' : 'text-gray-700'}`}>
                            {getTeamName(match.awayTeamId)}
                        </span>
                        {match.isFinished && (
                            <span className="text-2xl font-black text-favale-dark mt-1">{awaySets}</span>
                        )}
                    </div>
                </div>

                {match.isFinished && (
                    <div className="mt-4 pt-2 border-t border-gray-50 text-center">
                        <p className="text-[10px] text-gray-400">
                            {match.sets.map(s => `${s.home}-${s.away}`).join('  |  ')}
                        </p>
                    </div>
                )}

                {isAdmin && (
                    <div className="absolute top-2 right-2 flex gap-2 z-10">
                         <button 
                            onClick={() => setEditingMatch(match)}
                            className="p-2 text-gray-400 hover:text-favale-primary bg-white hover:bg-green-50 rounded-full shadow-md border border-gray-100 transition-all"
                        >
                            <Edit2 size={20} strokeWidth={2.5} />
                        </button>
                        <button 
                            onClick={() => setMatchToDelete(match)}
                            className="p-2 text-gray-400 hover:text-red-500 bg-white hover:bg-red-50 rounded-full shadow-md border border-gray-100 transition-all"
                        >
                            <Trash2 size={20} strokeWidth={2.5} />
                        </button>
                    </div>
                )}
            </div>
            )
        })}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-fade-in">
                <h3 className="text-lg font-bold mb-4 text-favale-dark">Agregar Partido</h3>
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">Categoría</label>
                            <select 
                                className="w-full p-2 border rounded text-sm"
                                value={newMatchData.category}
                                onChange={e => setNewMatchData({...newMatchData, category: e.target.value as Category})}
                            >
                                {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">Género</label>
                            <select 
                                className="w-full p-2 border rounded text-sm"
                                value={newMatchData.gender}
                                onChange={e => setNewMatchData({...newMatchData, gender: e.target.value as Gender})}
                            >
                                {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>
                    </div>
                    
                    <div>
                         <label className="text-xs font-bold text-gray-500 block mb-1">Cancha</label>
                         <select 
                            className="w-full p-2 border rounded text-sm"
                            value={newMatchData.court}
                            onChange={e => setNewMatchData({...newMatchData, court: e.target.value as Court})}
                        >
                            {Object.values(Court).map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                         <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">Fecha</label>
                            <input type="date" className="w-full p-2 border rounded text-sm" value={newMatchData.date} onChange={e => setNewMatchData({...newMatchData, date: e.target.value})} />
                         </div>
                         <div>
                            <label className="text-xs font-bold text-gray-500 block mb-1">Hora</label>
                            <input type="time" className="w-full p-2 border rounded text-sm" value={newMatchData.time} onChange={e => setNewMatchData({...newMatchData, time: e.target.value})} />
                         </div>
                    </div>

                    <div className="space-y-2 pt-2">
                        <label className="text-xs text-gray-500 font-bold">Local ({newMatchData.gender})</label>
                        <select className="w-full p-2 border rounded bg-gray-50" value={newMatchData.homeTeamId || ''} onChange={e => setNewMatchData({...newMatchData, homeTeamId: e.target.value})}>
                            <option value="">Seleccionar Equipo</option>
                            {teams.filter((t:Team) => t.category === newMatchData.category && t.gender === newMatchData.gender).map((t:Team) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500 font-bold">Visitante ({newMatchData.gender})</label>
                         <select className="w-full p-2 border rounded bg-gray-50" value={newMatchData.awayTeamId || ''} onChange={e => setNewMatchData({...newMatchData, awayTeamId: e.target.value})}>
                            <option value="">Seleccionar Equipo</option>
                            {teams.filter((t:Team) => t.category === newMatchData.category && t.gender === newMatchData.gender).map((t:Team) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                </div>
                <div className="flex gap-2 mt-6">
                    <button onClick={() => setShowAddModal(false)} className="flex-1 py-2 text-gray-500">Cancelar</button>
                    <button onClick={handleCreateMatch} className="flex-1 py-2 bg-favale-primary text-white rounded-lg font-bold">Crear</button>
                </div>
            </div>
        </div>
      )}

      {editingMatch && (
        <ResultModal 
            match={editingMatch} 
            teams={teams} 
            onClose={() => setEditingMatch(null)} 
            onSave={handleInitiateSave} 
        />
      )}

      {confirmData && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
                <div className="flex justify-center mb-4 text-favale-primary">
                    <CheckCircle size={48} />
                </div>
                <h3 className="text-xl font-bold text-gray-800 text-center mb-2">Confirmar Resultado</h3>
                <p className="text-sm text-gray-500 text-center mb-6">
                    ¿Guardar el resultado del partido 
                    <br/>
                    <span className="font-bold text-favale-dark">{getTeamName(confirmData.match.homeTeamId)} vs {getTeamName(confirmData.match.awayTeamId)}</span>?
                </p>
                <div className="bg-gray-50 p-3 rounded-lg mb-6 border border-gray-100 text-center">
                    <span className="font-mono text-xl font-bold text-gray-800">
                        {confirmData.sets.filter(s => s.home > s.away).length} - {confirmData.sets.filter(s => s.away > s.home).length}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">Sets Ganados</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setConfirmData(null)} className="flex-1 py-3 text-gray-500 hover:bg-gray-100 rounded-xl font-medium">Cancelar</button>
                    <button onClick={handleConfirmSave} className="flex-1 py-3 bg-favale-primary text-white rounded-xl font-bold hover:bg-green-700 shadow-md">Confirmar</button>
                </div>
            </div>
        </div>
      )}

      {matchToDelete && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in">
                <div className="flex justify-center mb-4 text-red-500">
                        <AlertTriangle size={48} />
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2 text-center">¿Eliminar Partido?</h3>
                <p className="text-sm text-gray-500 mb-6 text-center">
                    Estás a punto de eliminar el partido entre <br/>
                    <span className="font-bold text-favale-dark">{getTeamName(matchToDelete.homeTeamId)} vs {getTeamName(matchToDelete.awayTeamId)}</span>. 
                    <br/>Esta acción no se puede deshacer.
                </p>
                <div className="flex gap-2">
                    <button onClick={() => setMatchToDelete(null)} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg font-medium">Cancelar</button>
                    <button onClick={() => { onDeleteMatch(matchToDelete.id); setMatchToDelete(null); }} className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 shadow-md shadow-red-200">Eliminar</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

const TableView = ({ matches, teams, isLoading }: any) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>(Category.SUB13);
  const [selectedGender, setSelectedGender] = useState<Gender>(Gender.FEMALE);

  // Helper to render a table block
  const RenderTableBlock = ({ title, data }: { title: string, data: any[] }) => (
    <div className="mb-8">
      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 pl-2 border-l-4 border-favale-accent">{title}</h3>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-favale-dark text-white">
            <tr>
              <th className="py-3 px-4 text-left font-bold w-10">#</th>
              <th className="py-3 px-2 text-left font-bold">Equipo</th>
              <th className="py-3 px-2 text-center font-bold">PJ</th>
              <th className="py-3 px-2 text-center font-bold">PG</th>
              <th className="py-3 px-4 text-center font-bold">PTS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row, idx) => (
              <tr key={row.teamId} className="hover:bg-gray-50">
                <td className="py-3 px-4 font-medium text-gray-400">{idx + 1}</td>
                <td className="py-3 px-2 font-bold text-gray-800">{row.teamName}</td>
                <td className="py-3 px-2 text-center text-gray-500">{row.played}</td>
                <td className="py-3 px-2 text-center text-gray-500">{row.won}</td>
                <td className="py-3 px-4 text-center font-bold text-favale-dark">{row.points}</td>
              </tr>
            ))}
            {data.length === 0 && (
                <tr><td colSpan={5} className="text-center py-4 text-gray-400">Sin datos aún</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
  
  if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-favale-primary" size={48} /></div>;

  // Generate table based on gender
  const genderTeams = teams.filter((t:Team) => t.gender === selectedGender);

  // Determine what to render based on category logic
  const renderContent = () => {
      // Sub 13 Femenino mantiene formato de Zonas y Copas
      if (selectedCategory === Category.SUB13 && selectedGender === Gender.FEMALE) {
          const zoneA = generateTable(matches, genderTeams, Category.SUB13, 'A');
          const zoneB = generateTable(matches, genderTeams, Category.SUB13, 'B');

          // Get the qualified team objects to recalculate tables properly
          const goldTeamsIds = [...zoneA.slice(0, 2), ...zoneB.slice(0, 2)].map(r => r.teamId);
          const silverTeamsIds = [...zoneA.slice(2, 4), ...zoneB.slice(2, 4)].map(r => r.teamId);

          const goldTeams = genderTeams.filter((t: Team) => goldTeamsIds.includes(t.id));
          const silverTeams = genderTeams.filter((t: Team) => silverTeamsIds.includes(t.id));
          
          const goldTable = generateTable(matches, goldTeams, Category.SUB13);
          const silverTable = generateTable(matches, silverTeams, Category.SUB13);

          return (
              <>
                <RenderTableBlock title="Zona A" data={zoneA} />
                <RenderTableBlock title="Zona B" data={zoneB} />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                     <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200">
                         <h4 className="flex items-center gap-2 font-bold text-yellow-800 mb-2"><Trophy size={16}/> Clasificados Copa Oro</h4>
                         <p className="text-xs text-yellow-700 mb-4">(Con Arrastre de Puntos)</p>
                         <RenderTableBlock title="Copa Oro" data={goldTable} />
                     </div>
                     <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
                         <h4 className="flex items-center gap-2 font-bold text-gray-600 mb-2"><Shield size={16}/> Clasificados Copa Plata</h4>
                         <p className="text-xs text-gray-500 mb-4">(Con Arrastre de Puntos)</p>
                         <RenderTableBlock title="Copa Plata" data={silverTable} />
                     </div>
                </div>
              </>
          );
      } else {
          // Sub 12, Sub 16 y Sub 13 Masculino usan Tabla General
          const table = generateTable(matches, genderTeams, selectedCategory);
          return <RenderTableBlock title="Tabla General" data={table} />;
      }
  }

  return (
    <div className="pb-24 px-4 pt-6">
      <h2 className="text-2xl font-bold text-favale-dark mb-4">Tabla de Posiciones</h2>
      
      {/* Gender Selector */}
      <div className="flex bg-gray-100 rounded-lg p-1 mb-4 w-fit">
        {Object.values(Gender).map(gender => (
            <button
                key={gender}
                onClick={() => setSelectedGender(gender)}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                    selectedGender === gender ? 'bg-white shadow-sm text-favale-primary' : 'text-gray-400'
                }`}
            >
                {gender}
            </button>
        ))}
      </div>

      {/* Category Selector */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4 mb-2">
        {Object.values(Category).map(cat => (
            <button 
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`whitespace-nowrap px-5 py-2 rounded-full text-sm font-bold transition-all ${
                    selectedCategory === cat 
                    ? 'bg-favale-primary text-white shadow-lg shadow-green-200' 
                    : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
                }`}
            >
                {cat}
            </button>
        ))}
      </div>

      <div className="animate-fade-in">
          {renderContent()}
      </div>
    </div>
  );
};

const StaffView = ({ staff, isAdmin, onAddStaff, onDeleteStaff, onUpdateStaff, isLoading }: any) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newStaff, setNewStaff] = useState({ name: '', role: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ name: '', role: '' });

    const handleAdd = () => {
        if(newStaff.name && newStaff.role) {
            onAddStaff(newStaff);
            setNewStaff({ name: '', role: '' });
            setIsAdding(false);
        }
    };

    const handleUpdate = (id: string) => {
        if(editForm.name && editForm.role) {
            onUpdateStaff({ id, ...editForm });
            setEditingId(null);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center h-64"><Loader2 className="animate-spin text-favale-primary" size={48} /></div>;

    return (
        <div className="pb-24 px-4 pt-6">
            <h2 className="text-2xl font-bold text-favale-dark mb-6">Staff & Organización</h2>
            
            {isAdmin && (
                 <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="w-full mb-6 bg-favale-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                  >
                      <Plus size={20} /> Nuevo Miembro
                  </button>
            )}

            {isAdding && (
                <div className="bg-white p-4 rounded-xl shadow-md mb-6 animate-fade-in">
                    <h3 className="font-bold mb-3">Nuevo Miembro</h3>
                    <input className="w-full mb-2 p-2 border rounded" placeholder="Nombre" value={newStaff.name} onChange={e => setNewStaff({...newStaff, name: e.target.value})} />
                    <input className="w-full mb-4 p-2 border rounded" placeholder="Rol" value={newStaff.role} onChange={e => setNewStaff({...newStaff, role: e.target.value})} />
                    <div className="flex gap-2">
                        <button onClick={() => setIsAdding(false)} className="flex-1 py-2 text-gray-500">Cancelar</button>
                        <button onClick={handleAdd} className="flex-1 py-2 bg-favale-primary text-white rounded font-bold">Guardar</button>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {staff.map((s: StaffMember) => (
                    <div key={s.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                         {editingId === s.id ? (
                             <div className="w-full">
                                <input className="w-full mb-2 p-2 border rounded text-sm" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                                <input className="w-full mb-2 p-2 border rounded text-sm" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} />
                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">Cancelar</button>
                                    <button onClick={() => handleUpdate(s.id)} className="text-xs text-green-600 font-bold">Guardar</button>
                                </div>
                             </div>
                          ) : (
                             <>
                                <div>
                                    <h3 className="font-bold text-gray-800">{s.name}</h3>
                                    <p className="text-sm text-favale-primary font-medium">{s.role}</p>
                                </div>
                                {isAdmin && (
                                    <div className="flex gap-2">
                                        <button onClick={() => { setEditingId(s.id); setEditForm({name: s.name, role: s.role}); }} className="p-2 text-gray-400 hover:text-blue-500"><Edit2 size={18}/></button>
                                        <button onClick={() => onDeleteStaff(s.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18}/></button>
                                    </div>
                                )}
                             </>
                          )}
                    </div>
                ))}
            </div>
        </div>
    );
};

const LocationsView = () => (
    <div className="pb-24 px-4 pt-6 space-y-4">
        <h2 className="text-2xl font-bold text-favale-dark mb-4 px-2">Sedes y Lugares</h2>
        <div className="grid gap-3">
            {INITIAL_LOCATIONS.map((loc, i) => (
                <a 
                    key={i} 
                    href={loc.mapLink}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-start gap-4 hover:shadow-md transition-shadow"
                >
                    <div className="bg-blue-50 p-3 rounded-full text-blue-600 mt-1">
                        <MapIcon size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800">{loc.name}</h3>
                        <p className="text-sm text-gray-500 mb-2">{loc.address}</p>
                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded bg-gray-100 text-gray-500`}>
                            {loc.type}
                        </span>
                    </div>
                </a>
            ))}
        </div>
    </div>
);

const AdminModal = ({ isOpen, onClose, onLogin }: any) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') {
      onLogin();
      setPassword('');
      setError(false);
      onClose();
    } else {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl animate-fade-in relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20}/></button>
        <div className="flex justify-center mb-6">
            <div className="bg-green-100 p-4 rounded-full text-favale-dark">
                <Lock size={32} />
            </div>
        </div>
        <h2 className="text-center text-xl font-bold text-gray-800 mb-2">Acceso Organizador</h2>
        <p className="text-center text-gray-500 text-sm mb-6">Ingresa el PIN para administrar el torneo.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="PIN"
            className={`w-full text-center text-2xl tracking-widest py-3 border-2 rounded-xl focus:outline-none ${error ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-favale-primary'}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-red-500 text-xs text-center font-bold">PIN Incorrecto</p>}
          <button type="submit" className="w-full bg-favale-dark hover:bg-green-900 text-white py-3 rounded-xl font-bold transition-colors">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Data State
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);

  // Fetch Data on Load
  const fetchData = async () => {
    setIsLoading(true);
    try {
        const { data: teamsData, error: teamsError } = await supabase.from('equipos').select('id, nombre, categoria, genero, zona'); 
        if (teamsError) console.error('Error cargando equipos:', JSON.stringify(teamsError, null, 2));

        const { data: playersData, error: playersError } = await supabase.from('jugadores').select('*');
        if (playersError) console.error('Error cargando jugadores:', JSON.stringify(playersError, null, 2));

        const { data: matchesData, error: matchesError } = await supabase.from('partidos').select('*');
        if (matchesError) console.error('Error cargando partidos:', JSON.stringify(matchesError, null, 2));

        const { data: staffData, error: staffError } = await supabase.from('personal').select('*');
        if (staffError) console.error('Error cargando staff:', JSON.stringify(staffError, null, 2));

        if (teamsData) {
            const combinedTeams = teamsData.map((team: any) => ({
                ...team,
                jugadores: playersData ? playersData.filter((p: any) => p.team_id === team.id) : []
            }));
            setTeams(combinedTeams.map(mapTeamFromDB));
        }
        
        if (matchesData) setMatches(matchesData.map(mapMatchFromDB));
        if (staffData) setStaff(staffData.map(mapStaffFromDB));

    } catch (error: any) {
        console.error('Error crítico en carga:', JSON.stringify(error, null, 2));
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- CRUD ACTIONS ---

  const handleAddMatch = async (matchData: Partial<Match>) => {
      const dbMatch = {
          categoria: matchData.category,
          genero: matchData.gender,
          lugar: matchData.court,
          fecha: matchData.date,
          hora: matchData.time,
          local: matchData.homeTeamId,
          visitante: matchData.awayTeamId,
          stage: 'Fase Regular',
          sets: [],
          is_finished: false
      };

      const { data, error } = await supabase.from('partidos').insert([dbMatch]).select();
      if (!error && data) {
          setMatches([...matches, mapMatchFromDB(data[0])]);
      } else {
          console.error('Error creando partido:', JSON.stringify(error, null, 2));
      }
  };

  const handleUpdateMatch = async (updatedMatch: Match) => {
    const dbMatch = {
        is_finished: updatedMatch.isFinished,
        sets: updatedMatch.sets,
        mvp_local: updatedMatch.mvpHomeId,
        mvp_visitante: updatedMatch.mvpAwayId
    };

    const { error } = await supabase.from('partidos').update(dbMatch).eq('id', updatedMatch.id);
    if (!error) {
        setMatches(matches.map(m => m.id === updatedMatch.id ? updatedMatch : m));
    } else {
        console.error('Error actualizando partido:', JSON.stringify(error, null, 2));
    }
  };
  
  const handleDeleteMatch = async (id: string) => {
      const { error } = await supabase.from('partidos').delete().eq('id', id);
      if (!error) {
          setMatches(matches.filter(m => m.id !== id));
      } else {
        console.error('Error eliminando partido:', JSON.stringify(error, null, 2));
      }
  };

  const handleAddTeam = async (newTeam: Team) => {
      // Stub for future team adding
  };
  const handleUpdateTeam = async (updatedTeam: Team) => {
      // Stub for future team updating
  };
  const handleDeleteTeam = async (id: string) => {
      // Stub for future team deleting
  };

  const handleAddStaff = async (newStaff: Partial<StaffMember>) => {
      const dbStaff = { nombre: newStaff.name, rol: newStaff.role };
      const { data, error } = await supabase.from('personal').insert([dbStaff]).select();
      if (!error && data) setStaff([...staff, mapStaffFromDB(data[0])]);
      else console.error('Error creando staff:', JSON.stringify(error, null, 2));
  };

  const handleUpdateStaff = async (updatedStaff: StaffMember) => {
      const { error } = await supabase.from('personal').update({ nombre: updatedStaff.name, rol: updatedStaff.role }).eq('id', updatedStaff.id);
      if (!error) setStaff(staff.map(s => s.id === updatedStaff.id ? updatedStaff : s));
      else console.error('Error actualizando staff:', JSON.stringify(error, null, 2));
  };

  const handleDeleteStaff = async (id: string) => {
      const { error } = await supabase.from('personal').delete().eq('id', id);
      if (!error) setStaff(staff.filter(s => s.id !== id));
      else console.error('Error eliminando staff:', JSON.stringify(error, null, 2));
  };

  // Render View
  const renderContent = () => {
    switch(activeTab) {
      case 'home': return <HomeView />;
      case 'fixture': return <FixtureView matches={matches} teams={teams} isAdmin={isAdmin} onUpdateMatch={handleUpdateMatch} onAddMatch={handleAddMatch} onDeleteMatch={handleDeleteMatch} isLoading={isLoading} />;
      case 'positions': return <TableView matches={matches} teams={teams} isLoading={isLoading} />;
      case 'staff': return <StaffView staff={staff} isAdmin={isAdmin} onAddStaff={handleAddStaff} onDeleteStaff={handleDeleteStaff} onUpdateStaff={handleUpdateStaff} isLoading={isLoading} />;
      case 'locations': return <LocationsView />;
      default: return <HomeView />;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-900 pb-safe">
      {/* Header */}
      <header className="bg-favale-dark text-white p-4 shadow-md sticky top-0 z-20 flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
               <Trophy size={16} className="text-white"/>
            </div>
            <div>
                <h1 className="font-bold text-sm tracking-wide">FAVALE 2025</h1>
                <p className="text-[10px] text-green-200 uppercase">Tierra del Fuego</p>
            </div>
        </div>
        
        <button 
          onClick={() => isAdmin ? setIsAdmin(false) : setShowAdminModal(true)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          {isAdmin ? <LogOut size={20} className="text-green-300" /> : <Lock size={20} />}
        </button>
      </header>

      {/* Admin Indicator */}
      {isAdmin && (
          <div className="bg-green-100 text-favale-dark text-xs font-bold text-center py-1 flex items-center justify-center gap-2">
              <Shield size={12}/> ADMIN ACTIVO • SINCRONIZADO EN VIVO
          </div>
      )}

      {/* Main Content */}
      <main className="max-w-md mx-auto w-full">
         {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <div className="flex justify-around items-center max-w-md mx-auto">
          <TabButton active={activeTab === 'home'} label="Inicio" icon={Shield} onClick={() => setActiveTab('home')} />
          <TabButton active={activeTab === 'fixture'} label="Fixture" icon={Calendar} onClick={() => setActiveTab('fixture')} />
          <TabButton active={activeTab === 'positions'} label="Tabla" icon={Trophy} onClick={() => setActiveTab('positions')} />
          <TabButton active={activeTab === 'staff'} label="Staff" icon={Users} onClick={() => setActiveTab('staff')} />
          <TabButton active={activeTab === 'locations'} label="Sedes" icon={MapIcon} onClick={() => setActiveTab('locations')} />
        </div>
      </nav>

      {/* Admin Modal */}
      <AdminModal 
        isOpen={showAdminModal} 
        onClose={() => setShowAdminModal(false)} 
        onLogin={() => setIsAdmin(true)} 
      />
    </div>
  );
};

export default App;