export interface Feed {
  id: string;
  title: string;
  url: string;
  tags: string[];
  titleFilter?: string | null;
  _count: {
    items: number;
  };
}
