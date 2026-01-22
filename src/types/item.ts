export interface Item {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  read: boolean;
  feed: {
    id: string;
    title: string;
    tags?: string[];
  };
}
