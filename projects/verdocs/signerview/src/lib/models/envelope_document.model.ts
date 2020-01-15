export interface IEnvelopeDocument {
  id?: string;
  url: string;
  name: string;
  created_at?: Date;
  updated_at?: Date;
  page_numbers: number;
  mime: string;
}
