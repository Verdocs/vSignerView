export interface ITemplateSearchParams {
  name?: string;
  sender?: string;
  description?: string;
  profile_id?: string;
  organization_id?: string;
  updated_at?: ITimePeriod;
  created_at?: ITimePeriod;
  last_used_at?: ITimePeriod;
  is_personal?: boolean;
  is_public?: boolean;
  tags?: string[];
  document_name?: string;
  sort_by?: SortOptions;
  ascending?: boolean;
  row?: number;
  page?: number;
}

export interface ITimePeriod {
  start_time: string; // Date
  end_time: string; // Date
}

export enum SortOptions {
  CREATED_AT = 'created_at',
  UPDATED_AT = 'updated_at',
  NAME = 'name',
  LAST_USED_AT = 'last_used_at',
  COUNTER = 'counter',
  STAR_COUNTER = 'star_counter'
}