export interface Channel {
  name: string;
  id: string;
  logo: string;
  link: string;
  referer?: string;
  origin?: string;
  cookie?: string;
  ua?: string;
  host?: string;
  isRoarZone?: boolean;
  isFootballHDZone?: boolean;
  link2?: string;
  referer2?: string;
  origin2?: string;
  cookie2?: string;
  ua2?: string;
  host2?: string;
  link3?: string;
  referer3?: string;
  origin3?: string;
  cookie3?: string;
  ua3?: string;
  host3?: string;
  group?: string;
  status?: string;
  teamA?: string;
  teamB?: string;
  teamAFlag?: string;
  teamBFlag?: string;
  startTime?: string;
  [key: string]: any;
}

export type Category = 
  | "All" 
  | "Premium Sports" 
  | "Bangla" 
  | "Documentary" 
  | "International News" 
  | "Entertainment Hindi" 
  | "Music" 
  | "Kids" 
  | "Movies"
  | "FootballHDZone"
  | "Favorites";
