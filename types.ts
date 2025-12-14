export enum Category {
  SUB12 = 'Sub 12',
  SUB13 = 'Sub 13',
  SUB16 = 'Sub 16'
}

export enum Gender {
  FEMALE = 'Femenino',
  MALE = 'Masculino' // Prepared for future extension
}

export enum Court {
  CANCHA1 = 'Cancha 1 (Cochocho)',
  CANCHA2 = 'Cancha 2 (Cochocho)',
  CANCHA4 = 'Cancha 4 (Favale)'
}

export interface Player {
  id: string;
  number: number;
  name: string;
  position: string;
}

export interface Team {
  id: string;
  name: string;
  category: Category;
  gender: Gender;
  zone: 'A' | 'B' | 'Unica';
  logo?: string; // Optional logo URL or icon name
  players: Player[];
}

export interface SetResult {
  home: number;
  away: number;
}

export interface Match {
  id: string;
  date: string; // ISO String
  time: string;
  court: Court;
  category: Category;
  gender: Gender;
  homeTeamId: string;
  awayTeamId: string;
  isFinished: boolean;
  sets: SetResult[]; // e.g. [{home: 25, away: 20}, ...]
  mvpHomeId?: string;
  mvpAwayId?: string;
  stage?: string; // "Clasificatoria", "Semi", "Final", "Copa Oro", "Copa Plata"
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
}

export interface TableRow {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  points: number;
  setsWon: number;
  setsLost: number;
  pointsRatio: number; // For tie-breaking
}

export interface LocationGuide {
  name: string;
  address: string;
  type: 'court' | 'food' | 'health' | 'market' | 'lodging';
  mapLink: string;
}