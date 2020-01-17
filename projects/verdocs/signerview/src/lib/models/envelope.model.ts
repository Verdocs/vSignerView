import { IRecipient } from './recipient.model'; 
import { IEnvelopeHistory } from './envelope_histores.model';
import { IEnvelopeDocument } from './envelope_document.model';
import { IEnvelopeField } from './envelope_fields.model';
import { IReminder } from './reminder.model';

export interface Envelope {
  id?: string;
  status: string;
  profile_id: string;
  template_id: string;
  created_at?: Date;
  updated_at?: Date;
  canceled_at?: Date;
  envelope_document_id: string;
  certificate_document_id?: string;
  document?: IEnvelopeDocument;
  certificate?: IEnvelopeDocument;
  fields?: IEnvelopeField[];
  recipients?: IRecipient[];
  histories?: IEnvelopeHistory[];
  component?: EnvelopeComponent;
  name?: string;
  reminder_id?: string;
  reminder?: IReminder;
  owner?: {
    profile_id: string;
    email: string;
    name: string;
  };
}

export interface EnvelopeComponent {
  progress?: number;
  status_color?: string;
  selected_format_time?: string;
  format_time?: string;
  selected?: boolean;
  envelope__list__class?: string;
}
