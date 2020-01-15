import { Envelope } from './envelope.model';
export interface IEnvelopeSearchParams {
  envelope_status?: string[];
  recipient_status?: string[];
  envelope_name?: string;
  recipient_name?: string;
  recipient_email?: string;
  updated_at?: ITimePeriod;
  canceled_at?: ITimePeriod;
  created_at?: ITimePeriod;
  text_field_value?: string;
  is_owner?: boolean;
  is_recipient?: boolean;
  sort_by?: SortOptions;
  ascending?: boolean;
  row?: number;
  page?: number;
  template_id?: string;
  recipient_claimed?: boolean;
}

export interface ITimePeriod {
  start_time: string; // Date
  end_time: string; // Date
}

export interface IEnvelopeSearchResult {
  page: number,
  row: number,
  result: Envelope[]
  total: number
}

export enum SortOptions {
  created_at = 'created_at',
  updated_at = 'updated_at',
  envelope_name = 'envelope_name',
  canceled_at = 'canceled_at',
  envelope_status = 'envelope_status'
}
