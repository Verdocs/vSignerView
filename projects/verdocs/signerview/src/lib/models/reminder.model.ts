export interface IReminder {
  id?: string;
  created_at?: Date;
  is_on: boolean;
  setup_time: number;
  interval_time: number;
  last_time: number;
  next_time: number;
  envelope_id: string;
  template_id: string;
}
