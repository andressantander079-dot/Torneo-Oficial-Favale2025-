import React, { useState, useEffect } from 'react';
import { 
  Lock, Calendar, Trophy, Users, Map as MapIcon, Info, 
  Menu, X, Plus, Trash2, Edit2, CheckCircle, Shield, Medal, AlertTriangle, LogOut, Loader2, Shirt, Star, ChevronRight
} from 'lucide-react';
import { Category, Gender, Match, Team, StaffMember, Court, Player, LocationGuide } from './types';
import { generateTable, getCupStandings } from './utils';
import { supabase } from './supabaseClient';
import { INITIAL_LOCATIONS } from './constants';

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
    })).sort((a: any, b: any) => {
        const numA = Number(a.number);
        const numB = Number(b.number);
        if (numA === 0 && numB === 0) return 0;
        if (numA === 0) return 1;
        if (numB === 0) return -1;
        return numA - numB;
    }) : []
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
    stage: m.etapa || 'Fase de Grupos'
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
    className={`flex flex-col items-center justify-center w-full py-3 transition-all ${
      active ? 'text-favale-dark font-black scale-105' : 'text-gray-400 hover:text-favale-primary'
    }`}
  >
    <div className={`p-1 rounded-full ${active ? 'bg-green-100' : 'bg-transparent'}`}>
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[9px] mt-1 uppercase tracking-wide">{label}</span>
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

const TeamsView = ({ teams, matches, isAdmin, onAddTeam, onUpdateTeam, onDeleteTeam, onAddPlayer, onUpdatePlayer, onDeletePlayer }: any) => {
    const [filterCat, setFilterCat] = useState<string>('Todas');
    const [filterGender, setFilterGender] = useState<string>('Todas');
    const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
    const [teamTab, setTeamTab] = useState<'roster' | 'matches' | 'mvp'>('roster');

    // Estado para Crear/Editar Equipo
    const [showTeamModal, setShowTeamModal] = useState(false);
    const [editingTeam, setEditingTeam] = useState<Team | null>(null);
    const [teamForm, setTeamForm] = useState<Partial<Team>>({
        name: '', category: Category.SUB12, gender: Gender.FEMALE, zone: 'Unica'
    });

    // Estado para Agregar/Editar Jugador
    const [showPlayerForm, setShowPlayerForm] = useState(false);
    const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
    const [playerForm, setPlayerForm] = useState({ number: '', name: '', position: '' });

    const filteredTeams = teams.filter((t: Team) => {
        const catMatch = filterCat === 'Todas' || t.category === filterCat;
        const genderMatch = filterGender === 'Todas' || t.gender === filterGender;
        return catMatch && genderMatch;
    });

    const handleSaveTeam = () => {
        if (teamForm.name) {
            if (editingTeam) {
                onUpdateTeam({ ...editingTeam, ...teamForm });
            } else {
                onAddTeam(teamForm);
            }
            setShowTeamModal(false);
            setEditingTeam(null);
            setTeamForm({ name: '', category: Category.SUB12, gender: Gender.FEMALE, zone: 'Unica' });
        }
    };

    const openEditTeam = (e: React.MouseEvent, team: Team) => {
        e.stopPropagation();
        setEditingTeam(team);
        setTeamForm({ name: team.name, category: team.category, gender: team.gender, zone: team.zone });
        setShowTeamModal(true);
    };

    const handleDeleteTeamClick = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if(window.confirm('¿Seguro que deseas eliminar este equipo? Se borrarán sus jugadores.')) {
            onDeleteTeam(id);
        }
    }

    const handleSavePlayer = (teamId: string) => {
        if(playerForm.name && playerForm.number) {
            if (editingPlayerId) {
                onUpdatePlayer({ id: editingPlayerId, ...playerForm });
            } else {
                onAddPlayer(teamId, playerForm);
            }
            setPlayerForm({ number: '', name: '', position: '' });
            setShowPlayerForm(false);
            setEditingPlayerId(null);
        }
    };

    const handleEditPlayerClick = (player: Player) => {
        setEditingPlayerId(player.id);
        setPlayerForm({ number: String(player.number), name: player.name, position: player.position });
        setShowPlayerForm(true);
    };

    return (
        <div className="pb-24 px-4 pt-6">
            <h2 className="text-2xl font-bold text-favale-dark mb-4">Equipos</h2>
            
            {isAdmin && (
                <button 
                    onClick={() => { setEditingTeam(null); setTeamForm({ name: '', category: Category.SUB12, gender: Gender.FEMALE, zone: 'Unica' }); setShowTeamModal(true); }}
                    className="w-full mb-6 bg-favale-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                >
                    <Plus size={20} /> Nuevo Equipo
                </button>
            )}

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
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-4">
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

            {/* Grid de Equipos */}
            <div className="grid grid-cols-2 gap-3">
                {filteredTeams.map((team: Team) => (
                    <div 
                        key={team.id} 
                        onClick={() => setSelectedTeam(team)}
                        className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center gap-3 cursor-pointer hover:shadow-md transition-all relative overflow-hidden"
                    >
                        <div className="bg-sky-50 p-3 rounded-full">
                             <Shield size={32} className="text-sky-500 fill-sky-100" />
                        </div>

                        <div>
                            <h3 className="font-bold text-gray-800 leading-tight text-sm line-clamp-2">{team.name}</h3>
                            <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                                <span className="text-[9px] uppercase font-bold text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{team.category}</span>
                            </div>
                        </div>

                        {isAdmin && (
                            <div className="absolute top-2 right-2 flex gap-1">
                                <button onClick={(e) => openEditTeam(e, team)} className="p-1 text-blue-400 hover:text-blue-600"><Edit2 size={14}/></button>
                                <button onClick={(e) => handleDeleteTeamClick(e, team.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {filteredTeams.length === 0 && (
                     <div className="text-center py-10 text-gray-400">No se encontraron equipos</div>
            )}

            {/* Modal Detalle Equipo */}
            {selectedTeam && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="bg-gray-50 p-6 pb-8 border-b border-gray-100 relative text-center">
                            <button onClick={() => setSelectedTeam(null)} className="absolute top-4 right-4 p-2 bg-white rounded-full text-gray-400 shadow-sm hover:text-gray-600">
                                <X size={20} />
                            </button>
                            <div className="flex justify-center mb-3">
                                <div className="bg-sky-50 p-4 rounded-full shadow-inner">
                                    <Shield size={48} className="text-sky-500 fill-sky-100" />
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-gray-800 tracking-tight leading-none mb-1">{selectedTeam.name}</h2>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{selectedTeam.category} • {selectedTeam.gender}</p>
                        </div>

                        <div className="flex bg-gray-100 p-1 mx-4 -mt-6 rounded-xl shadow-lg relative z-10">
                            <button 
                                onClick={() => setTeamTab('roster')} 
                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                    teamTab === 'roster' 
                                    ? 'bg-favale-primary text-white shadow-md' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Plantel
                            </button>
                            <button 
                                onClick={() => setTeamTab('matches')} 
                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                    teamTab === 'matches' 
                                    ? 'bg-favale-primary text-white shadow-md' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                Partidos
                            </button>
                            <button 
                                onClick={() => setTeamTab('mvp')} 
                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                                    teamTab === 'mvp' 
                                    ? 'bg-favale-primary text-white shadow-md' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                MVPs
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto bg-white flex-1">
                            {teamTab === 'roster' && (
                                <div className="space-y-3">
                                    { console.log(selectedTeam.players) }
                                    {selectedTeam.players && selectedTeam.players.length > 0 ? (
                                        <div className="grid grid-cols-1 gap-2">
                                            {selectedTeam.players.map((p: Player) => (
                                                <div key={p.id} className={`${p.number.toString() === '0' ? 'bg-green-200' : ''} flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100 shadow-sm`}>
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-8 h-8 flex items-center justify-center bg-favale-light text-favale-dark rounded-full text-sm font-black border border-green-100">
                                                            {p.number}
                                                        </span>
                                                   <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-gray-700 leading-none">{p.name}</span>
                                                            <span className="text-[10px] text-gray-400 leading-none mt-1 uppercase font-medium">{p.position || 'Jugador'}</span>
                                                        </div>
                                                    </div>
                                                    {isAdmin && (
                                                        <div className="flex gap-1">
                                                            <button onClick={() => handleEditPlayerClick(p)} className="text-blue-300 hover:text-blue-500 p-2"><Edit2 size={16}/></button>
                                                            <button onClick={() => onDeletePlayer(p.id)} className="text-red-300 hover:text-red-500 p-2"><Trash2 size={16}/></button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <Users className="mx-auto text-gray-300 mb-2" size={32}/>
                                            <p className="text-sm text-gray-400">No hay jugadores registrados</p>
                                        </div>
                                    )}
                                    
                                    {isAdmin && (
                                        <div className="mt-6 pt-4 border-t border-gray-100">
                                            {!showPlayerForm ? (
                                                <button onClick={() => { setEditingPlayerId(null); setPlayerForm({ number: '', name: '', position: '' }); setShowPlayerForm(true); }} className="w-full py-3 bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 font-bold text-xs hover:border-favale-primary hover:text-favale-primary transition-all flex items-center justify-center gap-2">
                                                    <Plus size={16}/> AGREGAR JUGADOR
                                                </button>
                                            ) : (
                                                <div className="bg-white p-4 rounded-xl border border-green-200 shadow-lg animate-fade-in">
                                                    <h5 className="text-xs font-bold text-favale-primary mb-3">{editingPlayerId ? 'Editar Jugador' : 'Nuevo Jugador'}</h5>
                                                    <div className="flex gap-2 mb-3">
                                                        <input type="number" placeholder="#" className="w-14 p-2 border rounded-lg text-sm bg-gray-50" value={playerForm.number} onChange={e => setPlayerForm({...playerForm, number: e.target.value})} />
                                                        <input type="text" placeholder="Nombre y Apellido" className="flex-1 p-2 border rounded-lg text-sm bg-gray-50" value={playerForm.name} onChange={e => setPlayerForm({...playerForm, name: e.target.value})} />
                                                    </div>
                                                    <input type="text" placeholder="Posición (Ej: Punta, Central)" className="w-full mb-4 p-2 border rounded-lg text-sm bg-gray-50" value={playerForm.position} onChange={e => setPlayerForm({...playerForm, position: e.target.value})} />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => setShowPlayerForm(false)} className="flex-1 py-2 text-xs text-gray-500 font-bold bg-gray-100 rounded-lg">Cancelar</button>
                                                        <button onClick={() => handleSavePlayer(selectedTeam.id)} className="flex-1 py-2 bg-favale-primary text-white rounded-lg text-xs font-bold shadow-md">Guardar</button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            {/* ... matches and mvp tabs code remain same as previous full version ... */}
                            {teamTab === 'matches' && (
                                <div className="space-y-3">
                                    {matches.filter((m: Match) => String(m.homeTeamId) === String(selectedTeam.id) || String(m.awayTeamId) === String(selectedTeam.id))
                                        .sort((a: Match, b: Match) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime())
                                        .map((m: Match) => {
                                            const isHome = String(m.homeTeamId) === String(selectedTeam.id);
                                            const opponentId = isHome ? m.awayTeamId : m.homeTeamId;
                                            const opponent = teams.find((t:Team) => String(t.id) === String(opponentId))?.name || 'Desconocido';
                                            const resultString = m.isFinished 
                                                ? m.sets.map(s => isHome ? `${s.home}-${s.away}` : `${s.away}-${s.home}`).join(' | ')
                                                : null;
                                            let resultColor = 'border-gray-200';
                                            let statusText = 'Pendiente';
                                            if (m.isFinished) {
                                                const homeSets = m.sets.filter(s => s.home > s.away).length;
                                                const awaySets = m.sets.filter(s => s.away > s.home).length;
                                                const won = isHome ? homeSets > awaySets : awaySets > homeSets;
                                                resultColor = won ? 'border-l-4 border-l-green-500 bg-green-50/30' : 'border-l-4 border-l-red-400 bg-red-50/30';
                                                statusText = won ? 'VICTORIA' : 'DERROTA';
                                            }
                                            return (
                                                <div key={m.id} className={`p-4 rounded-xl border shadow-sm ${resultColor} flex flex-col`}>
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase">{m.date.split('-').reverse().slice(0,2).join('/')} • {m.time} • {m.court.split('(')[0]}</span>
                                                        {m.isFinished && <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${statusText === 'VICTORIA' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'}`}>{statusText}</span>}
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-gray-400 text-xs font-bold">VS</span>
                                                        <span className="text-base font-bold text-gray-800">{opponent}</span>
                                                    </div>
                                                    {resultString && (
                                                        <div className="mt-3 text-xs font-mono text-gray-600 bg-white border border-gray-100 p-2 rounded-lg text-center shadow-sm">
                                                            {resultString}
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                        {matches.filter((m: Match) => String(m.homeTeamId) === String(selectedTeam.id) || String(m.awayTeamId) === String(selectedTeam.id)).length === 0 && (
                                            <div className="text-center py-10 bg-gray-50 rounded-xl">
                                                <Calendar className="mx-auto text-gray-300 mb-2" size={32}/>
                                                <p className="text-sm text-gray-400">No hay partidos programados</p>
                                            </div>
                                        )}
                                </div>
                            )}

                            {teamTab === 'mvp' && (
                                <div className="space-y-3">
                                    {matches.filter((m: Match) => {
                                        if (!m.isFinished) return false;
                                        const homeMvpPlayer = selectedTeam.players.find(p => String(p.id) === String(m.mvpHomeId));
                                        const awayMvpPlayer = selectedTeam.players.find(p => String(p.id) === String(m.mvpAwayId));
                                        return homeMvpPlayer || awayMvpPlayer;
                                    }).map((m: Match) => {
                                            const homeMvpPlayer = selectedTeam.players.find(p => String(p.id) === String(m.mvpHomeId));
                                            const awayMvpPlayer = selectedTeam.players.find(p => String(p.id) === String(m.mvpAwayId));
                                            const player = homeMvpPlayer || awayMvpPlayer;
                                            const opponentId = String(m.homeTeamId) === String(selectedTeam.id) ? m.awayTeamId : m.homeTeamId;
                                            const opponent = teams.find((t:Team) => String(t.id) === String(opponentId))?.name || 'Desconocido';

                                            return (
                                                <div key={m.id} className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 flex items-center justify-between shadow-sm">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="bg-yellow-100 p-1.5 rounded-full">
                                                                <Star size={16} className="text-yellow-600 fill-yellow-600"/>
                                                            </div>
                                                            <span className="text-sm font-bold text-gray-800">{player?.name}</span>
                                                        </div>
                                                        <p className="text-[11px] text-gray-500 pl-9">vs {opponent}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[9px] font-black text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full uppercase tracking-wide">MVP DEL PARTIDO</span>
                                                    </div>
                                                </div>
                                            )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {/* Modal Crear/Editar Equipo */}
            {showTeamModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-fade-in shadow-2xl">
                        <h3 className="text-lg font-bold mb-4 text-favale-dark">{editingTeam ? 'Editar Equipo' : 'Nuevo Equipo'}</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">Nombre del Equipo</label>
                                <input 
                                    type="text" 
                                    className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-favale-primary outline-none" 
                                    placeholder="Ej: Muni A"
                                    value={teamForm.name} 
                                    onChange={e => setTeamForm({...teamForm, name: e.target.value})} 
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Categoría</label>
                                    <select 
                                        className="w-full p-2 border rounded text-sm bg-white"
                                        value={teamForm.category}
                                        onChange={e => setTeamForm({...teamForm, category: e.target.value as Category})}
                                    >
                                        {Object.values(Category).map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 block mb-1">Género</label>
                                    <select 
                                        className="w-full p-2 border rounded text-sm bg-white"
                                        value={teamForm.gender}
                                        onChange={e => setTeamForm({...teamForm, gender: e.target.value as Gender})}
                                    >
                                        {Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 block mb-1">Zona</label>
                                <select 
                                    className="w-full p-2 border rounded text-sm bg-white"
                                    value={teamForm.zone}
                                    onChange={e => setTeamForm({...teamForm, zone: e.target.value as any})}
                                >
                                    <option value="Unica">Única</option>
                                    <option value="A">Zona A</option>
                                    <option value="B">Zona B</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setShowTeamModal(false)} className="flex-1 py-2 text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>
                            <button onClick={handleSaveTeam} className="flex-1 py-2 bg-favale-primary text-white rounded-lg font-bold shadow-md hover:bg-green-700">Guardar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const ResultModal = ({ match, teams, onClose, onSave }: any) => {
    const isSub16 = match.category === Category.SUB16;
    const maxSets = isSub16 ? 5 : 3;
    const [sets, setSets] = useState<{home: string, away: string}[]>(
        match.sets.length > 0 ? match.sets.map((s:any) => ({home: s.home.toString(), away: s.away.toString()})) 
        : Array.from({ length: maxSets }, () => ({home: '', away: ''}))
    );
    const [mvpHome, setMvpHome] = useState(match.mvpHomeId || '');
    const [mvpAway, setMvpAway] = useState(match.mvpAwayId || '');

    const homeTeam = teams.find((t:Team) => String(t.id) === String(match.homeTeamId));
    const awayTeam = teams.find((t:Team) => String(t.id) === String(match.awayTeamId));

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
    time: '12:00',
    stage: 'Fase de Grupos'
  });
  const [confirmData, setConfirmData] = useState<{match: Match, sets: any[], homeMvp?: string, awayMvp?: string} | null>(null);

  const filteredMatches = matches.filter((m: Match) => {
    const home = teams.find((t:Team) => t.id.toString() === m.homeTeamId)?.name || '';
    const away = teams.find((t:Team) => t.id.toString() === m.awayTeamId)?.name || '';
    const searchMatch = home.toLowerCase().includes(filterText.toLowerCase()) || 
                        away.toLowerCase().includes(filterText.toLowerCase());
    const catMatch = filterCat === 'Todas' || m.category === filterCat;
    const genderMatch = filterGender === 'Todas' || m.gender === filterGender;
    return searchMatch && catMatch && genderMatch;
  }).sort((a: Match, b: Match) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());

  const getTeamName = (id: string) => teams.find((t: Team) => t.id.toString() === id)?.name || 'Desconocido';

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
            className="fixed bottom-24 right-4 z-30 bg-favale-primary text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-all hover:scale-105 active:scale-95"
          >
              <Plus size={24} />
          </button>
      )}

      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
            <div className="text-center text-gray-400 py-10">No hay partidos encontrados</div>
        ) : filteredMatches.map((match: Match) => {
            const homeSets = match.sets.filter(s => s.home > s.away).length;
            const awaySets = match.sets.filter(s => s.away > s.home).length;

            const isFinal = match.stage === 'Final';

            return (
            <div key={match.id} className={`${isFinal ? 'bg-yellow-400 text-black border-l-black' : 'bg-white border-l-favale-accent'} rounded-xl p-4 shadow-sm border-l-4 relative overflow-hidden`}>
                <div className={`flex justify-between items-center mb-4 ${isFinal ? 'border-black/10' : 'border-gray-200'} border-b pb-2`}>
                    <span className={`${isFinal ? 'text-black' : 'text-favale-dark'} font-lexend font-bold text-base flex items-center gap-2 uppercase tracking-tight`}>
                        <Calendar size={18} strokeWidth={2.5}/> {getFormattedDate(match.date)}, {match.time}HS
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded ${isFinal ? 'bg-black/10 text-black' : 'text-gray-400 bg-gray-50'}`}>
                        {match.court.split('(')[0]}
                    </span>
                </div>
                
                <div className="flex items-start justify-between gap-4 relative">
                    <div className="flex-1 text-right flex flex-col items-end">
                        <span className={`font-bold text-lg leading-tight ${match.isFinished && homeSets > awaySets ? (isFinal ? 'text-black' : 'text-favale-dark') : (isFinal ? 'text-black/80' : 'text-gray-700')}`}>
                            {getTeamName(match.homeTeamId)}
                        </span>
                        {match.isFinished && (
                            <span className={`text-2xl font-black ${isFinal ? 'text-black' : 'text-favale-dark'} mt-1`}>{homeSets}</span>
                        )}
                    </div>
                    
                    <div className="flex flex-col items-center justify-center min-w-[30px] pt-1">
                         <span className={`${isFinal ? 'text-black/50' : 'text-gray-300'} font-bold text-sm`}>VS</span>
                    </div>

                    <div className="flex-1 text-left flex flex-col items-start">
                        <span className={`font-bold text-lg leading-tight ${match.isFinished && awaySets > homeSets ? (isFinal ? 'text-black' : 'text-favale-dark') : (isFinal ? 'text-black/80' : 'text-gray-700')}`}>
                            {getTeamName(match.awayTeamId)}
                        </span>
                        {match.isFinished && (
                            <span className={`text-2xl font-black ${isFinal ? 'text-black' : 'text-favale-dark'} mt-1`}>{awaySets}</span>
                        )}
                    </div>
                </div>

                <div className="flex justify-center mt-2">
                     <span className="bg-green-100 text-green-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                        {match.stage}
                     </span>
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

                    <div>
                        <label className="text-xs font-bold text-gray-500 block mb-1">Instancia</label>
                        <select
                            className="w-full p-2 border rounded text-sm"
                            value={newMatchData.stage}
                            onChange={e => setNewMatchData({...newMatchData, stage: e.target.value})}
                        >
                            <option value="Fase de Grupos">Fase de Grupos</option>
                            <option value="Octavos">Octavos</option>
                            <option value="Cuartos">Cuartos</option>
                            <option value="Semis">Semis</option>
                            <option value="Final">Final</option>
                        </select>
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
      
      {/* ... matchToDelete modal code remains ... */}
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

const PositionsView = ({ teams, matches }: any) => {
    const [selectedCategory, setSelectedCategory] = useState<Category>(Category.SUB12);
    const [selectedGender, setSelectedGender] = useState<Gender>(Gender.FEMALE);

    const RenderTableBlock = ({ title, data }: { title: string, data: any[] }) => (
        <div className="mb-6 animate-fade-in">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 pl-2 border-l-4 border-favale-accent">
                {title}
            </h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-bold text-[10px] uppercase tracking-wider text-center">
                        <tr>
                            <th className="px-3 py-3 text-left w-1/3">Equipo</th>
                            <th className="px-1 py-3">PJ</th>
                            <th className="px-1 py-3">PG</th>
                            <th className="px-1 py-3">Dif</th>
                            <th className="px-2 py-3 text-favale-dark font-black">PTS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.length > 0 ? data.map((row, idx) => (
                            <tr key={row.teamId} className="hover:bg-gray-50">
                                <td className="px-3 py-3 font-bold text-gray-700 flex items-center gap-2">
                                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${idx < 2 ? 'bg-favale-primary text-white' : 'bg-gray-100 text-gray-500'}`}>{idx + 1}</span>
                                    <span className="truncate max-w-[100px] block" title={row.teamName}>{row.teamName}</span>
                                </td>
                                <td className="px-1 py-3 text-center text-gray-500">{row.played}</td>
                                <td className="px-1 py-3 text-center text-gray-500">{row.won}</td>
                                <td className={`px-1 py-3 text-center text-[10px] font-bold ${row.pointsDiff > 0 ? 'text-green-600' : row.pointsDiff < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                                    {row.pointsDiff > 0 ? '+' : ''}{row.pointsDiff}
                                </td>
                                <td className="px-2 py-3 text-center font-black text-favale-dark bg-green-50/50">{row.points}</td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-6 text-gray-400 text-xs">Sin datos</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderContent = () => {
        // Filter teams by gender first
        const genderTeams = teams.filter((t: Team) => t.gender === selectedGender);

        // LOGIC: Sub 13 Female (Zones + Cups)
        if (selectedCategory === Category.SUB13 && selectedGender === Gender.FEMALE) {
            const { zoneA, zoneB, goldTable, silverTable } = getCupStandings(matches, genderTeams, Category.SUB13);

            return (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <RenderTableBlock title="Zona A (Clasificación)" data={zoneA} />
                        <RenderTableBlock title="Zona B (Clasificación)" data={zoneB} />
                    </div>
                    
                    <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-100">
                        <div className="flex items-center gap-2 mb-4 text-yellow-700">
                            <Trophy size={20} className="fill-yellow-500 text-yellow-600"/>
                            <h3 className="font-bold uppercase tracking-tight">Copa de Oro</h3>
                        </div>
                        <p className="text-[10px] text-yellow-600 mb-3 -mt-2">Clasifican el 1° y 2° de cada zona. (Arrastre de puntos)</p>
                        <RenderTableBlock title="Tabla Oro" data={goldTable} />
                    </div>

                    <div className="bg-gray-100/50 p-4 rounded-xl border border-gray-200">
                         <div className="flex items-center gap-2 mb-4 text-gray-600">
                            <Medal size={20} className="text-gray-500"/>
                            <h3 className="font-bold uppercase tracking-tight">Copa de Plata</h3>
                        </div>
                        <p className="text-[10px] text-gray-500 mb-3 -mt-2">Clasifican los 2 equipos con menos cantidad de puntos de cada zona. (Arrastre de puntos)</p>
                        <RenderTableBlock title="Tabla Plata" data={silverTable} />
                    </div>
                </div>
            );
        }

        // LOGIC: Standard (Sub 12, Sub 16, Sub 13 Male)
        const zones = Array.from(new Set(genderTeams.filter((t: Team) => t.category === selectedCategory).map((t: Team) => t.zone))).filter(z => z !== 'Unica').sort();

        if (zones.length > 0) {
             return (
                <div className="space-y-6">
                    {zones.map((zone: any) => (
                        <RenderTableBlock 
                            key={zone} 
                            title={`Zona ${zone}`} 
                            data={generateTable(matches, genderTeams, selectedCategory, zone)} 
                        />
                    ))}
                </div>
            );
        } else {
             const table = generateTable(matches, genderTeams, selectedCategory);
             return <RenderTableBlock title="Tabla General" data={table} />;
        }
    };

    return (
        <div className="pb-24 px-4 pt-6">
            <h2 className="text-2xl font-bold text-favale-dark mb-4">Tabla de Posiciones</h2>
            
            {/* Gender Filter */}
            <div className="flex bg-gray-200/50 p-1 rounded-xl w-full mb-4">
                {Object.values(Gender).map(g => (
                    <button
                        key={g}
                        onClick={() => setSelectedGender(g)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                            selectedGender === g 
                            ? 'bg-white text-favale-primary shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {g}
                    </button>
                ))}
            </div>

            {/* Category Filter */}
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-6">
                {Object.values(Category).map(cat => (
                    <button 
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                            selectedCategory === cat 
                            ? 'bg-favale-dark text-white border-favale-dark shadow-md' 
                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {renderContent()}
        </div>
    )
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
    <div className="pb-24 px-4 pt-6">
        <h2 className="text-2xl font-bold text-favale-dark mb-6">Sedes y Puntos de Interés</h2>
        <div className="space-y-4">
            {INITIAL_LOCATIONS.map((loc, idx) => (
                <a href={loc.mapLink} target="_blank" rel="noopener noreferrer" key={idx} className="block bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${
                            loc.type === 'court' ? 'bg-green-100 text-favale-dark' :
                            loc.type === 'health' ? 'bg-red-100 text-red-500' :
                            loc.type === 'food' ? 'bg-orange-100 text-orange-500' :
                            loc.type === 'market' ? 'bg-blue-100 text-blue-500' :
                            'bg-indigo-100 text-indigo-500'
                        }`}>
                            {loc.type === 'court' && <Trophy size={20}/>}
                            {loc.type === 'health' && <Plus size={20}/>}
                            {loc.type === 'food' && <Star size={20}/>}
                            {loc.type === 'market' && <AlertTriangle size={20}/>} 
                            {loc.type === 'lodging' && <MapIcon size={20}/>}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">{loc.name}</h3>
                            <p className="text-sm text-gray-500">{loc.address}</p>
                        </div>
                        <div className="ml-auto text-gray-300">
                            <ChevronRight size={20}/>
                        </div>
                    </div>
                </a>
            ))}
        </div>
    </div>
);

const App = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [password, setPassword] = useState('');
  
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch Data
  useEffect(() => {
    fetchData();

    // Subscribe to changes
    const matchesSubscription = supabase
      .channel('public:partidos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'partidos' }, () => {
        fetchData(true);
      })
      .subscribe();

    const teamsSubscription = supabase
      .channel('public:equipos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'equipos' }, () => fetchData(true))
      .subscribe();

    return () => {
      supabase.removeChannel(matchesSubscription);
      supabase.removeChannel(teamsSubscription);
    };
  }, []);

  const fetchData = async (skipLoading = false) => {
    if (!skipLoading) setLoading(true);
    try {
        const { data: teamsData } = await supabase.from('equipos').select('*');
        const { data: playersData } = await supabase.from('jugadores').select('*');
        const { data: matchesData } = await supabase.from('partidos').select('*');
        const { data: staffData } = await supabase.from('personal').select('*');
        
        if (teamsData) {
            const combinedTeams = teamsData.map((team: any) => ({
                ...team,
                jugadores: playersData ? playersData.filter((p: any) => p.team_id === team.id.toString()) : []
            }));
            setTeams(combinedTeams.map(mapTeamFromDB));
        }
        if (matchesData) setMatches(matchesData.map(mapMatchFromDB));
        if (staffData) setStaff(staffData.map(mapStaffFromDB));
    } catch (error) {
        console.error("Error fetching data:", error);
    } finally {
        setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'admin123') { // Simple hardcoded password for now or env variable
       setIsAdmin(true);
       setShowLogin(false);
       setPassword('');
    } else {
       alert('Contraseña incorrecta');
    }
  };

  // Team CRUD
  const handleAddTeam = async (team: Partial<Team>) => {
      const { data, error } = await supabase.from('equipos').insert([{
          nombre: team.name,
          categoria: team.category,
          genero: team.gender,
          zona: team.zone
      }]).select();
      if(data) fetchData(); 
  };

  const handleUpdateTeam = async (team: Team) => {
      await supabase.from('equipos').update({
          nombre: team.name,
          categoria: team.category,
          genero: team.gender,
          zona: team.zone
      }).eq('id', team.id);
      fetchData();
  };

  const handleDeleteTeam = async (id: string) => {
      await supabase.from('equipos').delete().eq('id', id);
      fetchData();
  };

  // Player CRUD
  const handleAddPlayer = async (teamId: string, player: any) => {
      await supabase.from('jugadores').insert([{
          team_id: teamId, // Assuming column name is team_id based on previous context
          nombre: player.name,
          numero: player.number,
          posicion: player.position,
          id:crypto.randomUUID()
    
      }]);
      fetchData();
  };

  const handleUpdatePlayer = async (player: any) => {
    await supabase.from('jugadores').update({
        nombre: player.name,
        numero: player.number,
        posicion: player.position
    }).eq('id', player.id);
    fetchData();
  };

  const handleDeletePlayer = async (id: string) => {
    console.log('id de jugador'+id);  
    await supabase.from('jugadores').delete().eq('id', id);
      fetchData();
  };

  // Match CRUD
  const handleAddMatch = async (match: Partial<Match>) => {
      await supabase.from('partidos').insert([{
          fecha: match.date,
          hora: match.time,
          lugar: match.court,
          categoria: match.category,
          genero: match.gender,
          local: match.homeTeamId,
          visitante: match.awayTeamId,
          is_finished: false,
          sets: []
      }]);
      fetchData();
  };

  const handleUpdateMatch = async (match: Match) => {
     await supabase.from('partidos').update({
         sets: JSON.stringify(match.sets),
         is_finished: match.isFinished,
         mvp_local: match.mvpHomeId,
         mvp_visitante: match.mvpAwayId
     }).eq('id', match.id);
     fetchData();
  };
  
  const handleDeleteMatch = async (id: string) => {
      await supabase.from('partidos').delete().eq('id', id);
      fetchData();
  };

  // Staff CRUD
  const handleAddStaff = async (newStaff: Partial<StaffMember>) => {
      const { data, error } = await supabase.from('personal').insert([{ nombre: newStaff.name, rol: newStaff.role }]).select();
      if (!error) fetchData();
  };

  const handleUpdateStaff = async (updatedStaff: StaffMember) => {
      const { error } = await supabase.from('personal').update({ nombre: updatedStaff.name, rol: updatedStaff.role }).eq('id', updatedStaff.id);
      if (!error) fetchData();
  };

  const handleDeleteStaff = async (id: string) => {
      const { error } = await supabase.from('personal').delete().eq('id', id);
      if (!error) fetchData();
  };

  const renderContent = () => {
      switch(activeTab) {
          case 'home': return <HomeView />;
          case 'teams': return <TeamsView teams={teams} matches={matches} isAdmin={isAdmin} onAddTeam={handleAddTeam} onUpdateTeam={handleUpdateTeam} onDeleteTeam={handleDeleteTeam} onAddPlayer={handleAddPlayer} onUpdatePlayer={handleUpdatePlayer} onDeletePlayer={handleDeletePlayer} />;
          case 'fixture': return <FixtureView matches={matches} teams={teams} isAdmin={isAdmin} onUpdateMatch={handleUpdateMatch} onAddMatch={handleAddMatch} onDeleteMatch={handleDeleteMatch} isLoading={loading} />;
          case 'positions': return <PositionsView teams={teams} matches={matches} />;
          case 'locations': return <LocationsView />;
          case 'staff': return <StaffView staff={staff} isAdmin={isAdmin} onAddStaff={handleAddStaff} onDeleteStaff={handleDeleteStaff} onUpdateStaff={handleUpdateStaff} isLoading={loading} />;
          default: return <HomeView />;
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20 select-none">
        {/* Header */}
        <header className="bg-favale-dark px-4 py-3 shadow-sm border-b border-green-800 flex justify-between items-center sticky top-0 z-40 text-white">
            <div className="flex items-center gap-3">
                <div className="bg-white/10 p-2 rounded-lg">
                   <Trophy size={20} className="text-white" />
                </div>
                <div>
                   <h1 className="text-lg font-black tracking-tight leading-none">COPA FAVALE</h1>
                   <p className="text-[10px] font-bold text-green-200 tracking-widest">USHUAIA 2025</p>
                </div>
            </div>
            <button onClick={() => isAdmin ? setIsAdmin(false) : setShowLogin(true)} className={`p-2 rounded-full transition-colors ${isAdmin ? 'bg-white text-favale-dark' : 'text-green-100 hover:text-white hover:bg-white/10'}`}>
                {isAdmin ? <LogOut size={20} /> : <Lock size={20} />}
            </button>
        </header>
        
        {/* Main Content */}
        <main className="max-w-md mx-auto min-h-[calc(100vh-140px)]">
             {renderContent()}
        </main>

        {/* Bottom Nav */}
        <nav className="fixed bottom-0 w-full bg-white border-t border-gray-200 px-2 pb-safe pt-2 z-50 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
             <div className="flex justify-around items-center max-w-md mx-auto">
                 <TabButton active={activeTab === 'home'} label="Inicio" icon={Star} onClick={() => setActiveTab('home')} />
                 <TabButton active={activeTab === 'teams'} label="Equipos" icon={Shield} onClick={() => setActiveTab('teams')} />
                 <TabButton active={activeTab === 'fixture'} label="Partidos" icon={Calendar} onClick={() => setActiveTab('fixture')} />
                 <TabButton active={activeTab === 'positions'} label="Tabla" icon={Trophy} onClick={() => setActiveTab('positions')} />
                 <TabButton active={activeTab === 'locations'} label="Sedes" icon={MapIcon} onClick={() => setActiveTab('locations')} />
                 <TabButton active={activeTab === 'staff'} label="Staff" icon={Users} onClick={() => setActiveTab('staff')} />
             </div>
        </nav>

        {/* Login Modal */}
        {showLogin && (
            <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
                 <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-fade-in relative overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-2 bg-favale-primary"></div>
                     <button onClick={() => setShowLogin(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
                     
                     <div className="mb-6 text-center">
                        <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock size={32} className="text-favale-primary" />
                        </div>
                        <h2 className="text-2xl font-black text-gray-800 mb-1">Acceso Admin</h2>
                        <p className="text-sm text-gray-500">Ingresa la clave para gestionar el torneo.</p>
                     </div>

                     <form onSubmit={handleLogin} className="space-y-4">
                         <input 
                            type="password" 
                            className="w-full p-4 border border-gray-200 rounded-xl text-center text-lg tracking-widest focus:ring-4 focus:ring-green-100 focus:border-favale-primary outline-none transition-all"
                            placeholder="••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                         />
                         <button type="submit" className="w-full py-4 bg-favale-primary text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all text-sm uppercase tracking-wider">
                             Ingresar
                         </button>
                     </form>
                 </div>
            </div>
        )}
    </div>
  );
};

export default App;