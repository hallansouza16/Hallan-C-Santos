
export type UserRole = 'PLAYER' | 'GM';

export interface User {
  username: string;
  passwordHash: string;
  role: UserRole;
}

export interface Character {
  id: string;
  owner: string;
  tableId: string;
  name: string;
  hp: number;
  maxHp: number;
  image: string;
  abilities: string[];
  description: string;
  isNPC?: boolean;
}

export interface TableRoom {
  id: string;
  name: string;
  gmUsername: string;
  worldMessage: string;
  sceneryImage?: string;
  createdAt: number;
}

export interface LogEntry {
  id: string;
  tableId: string;
  type: 'DICE' | 'SYSTEM' | 'CHAT' | 'ACTION';
  content: string;
  username: string;
  timestamp: number;
}

export type View = 'LOGIN' | 'ROOM_SELECT' | 'LIST' | 'SHEET' | 'MASTER_PANEL';

export interface DiceRoll {
  id: string;
  diceType: number;
  result: number;
  username: string;
  timestamp: number;
}
