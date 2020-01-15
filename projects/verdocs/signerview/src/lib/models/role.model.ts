import { IField } from './field.model';

export interface IRole {
  id?: string;
  template_id: string;
  name: string;
  full_name?: string;
  old_name?: string;
  email?: string;
  phone?: string;
  type: string;
  sequence: number;
  fields?: IField[];
  message?: string;
  rgba?: string;
  delegator: boolean;
}
