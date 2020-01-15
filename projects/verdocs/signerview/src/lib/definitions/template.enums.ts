export enum TemplateSenderTypes {
  CREATOR = 'creator', // same as legacy
  ORGANIZATION_MEMBER = 'organization_member',
  ORGANIZATION_MEMBER_AS_CREATOR = 'organization_member_as_creator',
  EVERYONE = 'everyone',
  EVERYONE_AS_CREATOR = 'everyone_as_creator' // Creator would be sender of envelope no matter who creates the envelope
}

export enum TemplatePermissions {
  TEMPLATE_CREATOR_CREATE_PUBLIC = 'template:creator:create:public',
  TEMPLATE_CREATOR_CREATE_ORG = 'template:creator:create:org',
  TEMPLATE_CREATOR_CREATE_PERSONAL = 'template:creator:create:personal',
  TEMPLATE_CREATOR_DELETE = 'template:creator:delete',
  TEMPLATE_CREATOR_VISIBILITY = 'template:creator:visibility',
  TEMPLATE_MEMBER_READ = 'template:member:read',
  TEMPLATE_MEMBER_WRITE = 'template:member:write',
  TEMPLATE_MEMBER_DELETE = 'template:member:delete',
  TEMPLATE_MEMBER_VISIBILITY = 'template:member:visibility'
};

export enum TemplateActions {
  CREATE_PERSONAL = 'create_personal',
  CREATE_ORG = 'create_org',
  CREATE_PUBLIC = 'create_public',
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  CHANGE_VISIBILITY_PERSONAL = 'change_visibility_personal',
  CHANGE_VISIBILITY_ORG = 'change_visibility_org',
  CHANGE_VISIBILITY_PUBLIC = 'change_visibility_public'
}

