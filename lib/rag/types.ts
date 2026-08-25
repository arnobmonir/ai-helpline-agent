export interface RagChunk {
  id: string;
  title: string;
  category: string;
  text: string;
  /** Extra keywords for lexical boost */
  keywords?: string[];
}

export interface RagHit {
  id: string;
  title: string;
  category: string;
  text: string;
  score: number;
}
