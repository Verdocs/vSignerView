export interface IField {
  label: string;
  name: string;
  role_name: string;
  template_id: string;
  type: string;
  required: boolean;
  setting: Object;
  page_sequence: number;
  validator?: string;
}
