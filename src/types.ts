export interface Channel {
  name: string;
  logo: string;
  category: string;
  urls: string[];
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
