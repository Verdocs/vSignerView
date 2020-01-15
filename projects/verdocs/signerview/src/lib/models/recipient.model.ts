import { IEnvelopeField } from './envelope_fields.model';

export interface IRecipient {
  role_name: string;
  envelope_id: string;
  status: string;
  email: string;
  full_name: string;
  sequence: number;
  type: string;
  delegator: boolean;
  token: string;
  profile_id?: string;
  created_at?: Date;
  updated_at?: Date;
  message?: string;
  fields?: IEnvelopeField[];
  delegated_to?: string;
  claimed?: boolean;
  agreed?: boolean;
  signatureUrl?: any;
  signatures?: IEnvelopeSignature[];
  rgba?: string;
}

export interface IEnvelopeSignature {
  envelope_id: string;
  signature_id: string;
  role_name: string;
  signed_at?: Date;
  ip_address?: string;
  hash?: string;
}
