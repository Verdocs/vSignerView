import { IRecipient } from './recipient.model';

export interface IEnvelopeField {
  name?: string;
  recipient_role: string;
  envelope_id: string;
  page: number;
  type: string;
  required: boolean;
  settings?: ISetting;
  recipients?: IRecipient;
  validator?: string;
  label?: string;
  prepared: boolean;
}

interface ISetting {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  result?: string;
  type?: string;
  options?: any[];
  leading?: number;
  alignment?: number;
  upperCase?: boolean;
  url?: string;
}
