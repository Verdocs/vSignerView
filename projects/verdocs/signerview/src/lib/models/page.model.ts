import { ITemplateDocument } from './template_document.model';
import { IField } from './field.model';

export interface IPage {
    template_id: string;
    document_id: string;
    document?: ITemplateDocument;
    sequence: number;
    page_number: number;
    thumbnail_url?: string;
    thumbnail_safe?: any;
    fields?: IField[];
}
