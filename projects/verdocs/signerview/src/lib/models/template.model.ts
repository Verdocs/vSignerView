import { ITemplateDocument } from './template_document.model';
import { IPage } from './page.model';
import { IRole } from './role.model';
import { TemplateSenderTypes } from '../definitions/template.enums';

export interface ITemplate {
    template_documents: ITemplateDocument[];
    pages?: IPage[];
    roles?: IRole[];
    counter?: number;
    tags?: any[];
    description?: string;
    name: string;
    id?: string;
    profile_id?: string;
    created_at?: Date;
    updated_at?: Date;
    token?: string;
    reminder_id?: string;
    reminder?: object;
    template_stars?: any[];
    organization_id?: string;
    is_personal?: boolean;
    is_public?: boolean;
    sender?: TemplateSenderTypes;
    last_used?: { at: string }[];
}
