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
  | 'Entertainment'
  | 'Movie'
  | 'Music'
  | 'Kids'
  | 'Documentary';
