export interface Channel {
  name: string;
  logo: string;
  category: string;
  urls: string[];
  headers?: Record<string, Record<string, string>>;
}

export type CategoryType =
  | 'All'
  | 'Sports'
  | 'Bangla'
  | 'Hindi'
  | 'Movie'
  | 'Music'
  | 'Kids'
  | 'Documentary';
