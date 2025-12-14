import { Category, Gender, Team, Match, StaffMember, LocationGuide, Court } from './types';
import { v4 as uuidv4 } from 'uuid'; // Simulating ID generation

// Helper to create initial data
const createId = () => Math.random().toString(36).substr(2, 9);

export const INITIAL_STAFF: StaffMember[] = [
  { id: createId(), name: 'Dra. Liliana Gavilan', role: 'Directora de Competencia' },
  { id: createId(), name: 'Prof. Hernan Cepeda', role: 'Encargado de Arbitraje' },
  { id: createId(), name: 'Joana Villarroel', role: 'Prensa y Comunicación' },
  { id: createId(), name: 'Leonardo Santillan', role: 'Coordinación Alojamiento' },
  { id: createId(), name: 'Sandra Girardi', role: 'Coordinación Alimentación' },
  { id: createId(), name: 'Juan Manuel Guardamagna', role: 'Fixture y Competencia' },
];

export const INITIAL_LOCATIONS: LocationGuide[] = [
  { name: 'Cancha 1 y 2 (Cochocho Vargas)', address: 'Maipú 1150', type: 'court', mapLink: 'https://www.google.com/maps/search/?api=1&query=Gimnasio+Cochocho+Vargas+Ushuaia' },
  { name: 'Cancha 4 (Gimnasio Favale)', address: 'Canadom 450', type: 'court', mapLink: 'https://www.google.com/maps/search/?api=1&query=Gimnasio+Hugo+Italo+Favale+Ushuaia' },
  { name: 'Farmacias Cercanas', address: 'Zona Centro / Maipú', type: 'health', mapLink: 'https://www.google.com/maps/search/?api=1&query=Farmacias+cerca+de+Maipu+1150+Ushuaia' },
  { name: 'Comedor (C.A.A.D)', address: 'Walanika 200', type: 'food', mapLink: 'https://www.google.com/maps/search/?api=1&query=CAAD+Ushuaia+Walanika' },
  { name: 'Villa Deportiva Eva Perón', address: 'Av. Perito Moreno S/N', type: 'lodging', mapLink: 'https://www.google.com/maps/search/?api=1&query=Villa+Deportiva+Eva+Peron+Ushuaia' },
  { name: 'Albergue Municipal', address: 'Malvinas Argentinas 399', type: 'lodging', mapLink: 'https://www.google.com/maps/search/?api=1&query=Albergue+Municipal+Ushuaia' },
  { name: 'Supermercado Carrefour', address: 'Av. San Martín', type: 'market', mapLink: 'https://www.google.com/maps/search/?api=1&query=Supermercado+Carrefour+Ushuaia' },
  { name: 'Supermercado La Anónima', address: 'San Martín y Onas', type: 'market', mapLink: 'https://www.google.com/maps/search/?api=1&query=Supermercado+La+Anonima+Ushuaia' },
];

// Based on PDF Data
export const INITIAL_TEAMS: Team[] = [
  // Sub 12
  { id: 't1', name: 'Muni A', category: Category.SUB12, gender: Gender.FEMALE, zone: 'Unica', players: [] },
  { id: 't2', name: 'Galicia', category: Category.SUB12, gender: Gender.FEMALE, zone: 'Unica', players: [] },
  { id: 't3', name: 'Imago', category: Category.SUB12, gender: Gender.FEMALE, zone: 'Unica', players: [] },
  { id: 't4', name: 'Muni B', category: Category.SUB12, gender: Gender.FEMALE, zone: 'Unica', players: [] },
  { id: 't5', name: 'Tolke Fucsia', category: Category.SUB12, gender: Gender.FEMALE, zone: 'Unica', players: [] },
  { id: 't6', name: 'Tolke Turquesa', category: Category.SUB12, gender: Gender.FEMALE, zone: 'Unica', players: [] },
  
  // Sub 13
  { id: 't7', name: 'Muni A', category: Category.SUB13, gender: Gender.FEMALE, zone: 'B', players: [] },
  { id: 't8', name: 'Tolke', category: Category.SUB13, gender: Gender.FEMALE, zone: 'B', players: [] },
  { id: 't9', name: 'Galicia', category: Category.SUB13, gender: Gender.FEMALE, zone: 'B', players: [] },
  { id: 't10', name: 'Boxing', category: Category.SUB13, gender: Gender.FEMALE, zone: 'B', players: [] },
  { id: 't11', name: 'Muni B', category: Category.SUB13, gender: Gender.FEMALE, zone: 'A', players: [] },
  { id: 't12', name: 'Imago', category: Category.SUB13, gender: Gender.FEMALE, zone: 'A', players: [] },
  { id: 't13', name: 'AEP', category: Category.SUB13, gender: Gender.FEMALE, zone: 'A', players: [] },
  { id: 't14', name: 'Veron', category: Category.SUB13, gender: Gender.FEMALE, zone: 'A', players: [] },

  // Sub 16
  { id: 't15', name: 'Muni', category: Category.SUB16, gender: Gender.FEMALE, zone: 'Unica', players: [] },
  { id: 't16', name: 'Veron', category: Category.SUB16, gender: Gender.FEMALE, zone: 'Unica', players: [] },
  { id: 't17', name: 'Galicia', category: Category.SUB16, gender: Gender.FEMALE, zone: 'Unica', players: [] },
  { id: 't18', name: 'Boxing', category: Category.SUB16, gender: Gender.FEMALE, zone: 'Unica', players: [] },
  { id: 't19', name: 'Imago', category: Category.SUB16, gender: Gender.FEMALE, zone: 'Unica', players: [] },
  { id: 't20', name: 'Volkai', category: Category.SUB16, gender: Gender.FEMALE, zone: 'Unica', players: [] },
];

export const INITIAL_MATCHES: Match[] = [
  { 
    id: createId(), 
    date: '2025-12-16', 
    time: '17:00', 
    court: Court.CANCHA4, 
    category: Category.SUB12, 
    gender: Gender.FEMALE, 
    homeTeamId: 't1', 
    awayTeamId: 't2', 
    isFinished: false, 
    sets: [],
    stage: 'Clasificatoria'
  },
  { 
    id: createId(), 
    date: '2025-12-16', 
    time: '18:30', 
    court: Court.CANCHA4, 
    category: Category.SUB13, 
    gender: Gender.FEMALE, 
    homeTeamId: 't7', 
    awayTeamId: 't8', 
    isFinished: false, 
    sets: [],
    stage: 'Grupo B'
  },
  { 
    id: createId(), 
    date: '2025-12-16', 
    time: '20:00', 
    court: Court.CANCHA1, 
    category: Category.SUB16, 
    gender: Gender.FEMALE, 
    homeTeamId: 't17', 
    awayTeamId: 't10', // Boxing mapped ID for safety
    isFinished: false, 
    sets: [],
    stage: 'Clasificatoria'
  },
];