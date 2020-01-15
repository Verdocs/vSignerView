import { VerdocsTokenObjectService } from '@verdocs/tokens';
import { intersection } from 'lodash';

import { Injectable } from '@angular/core';
import { TemplateActions, TemplatePermissions, TemplateSenderTypes } from '../definitions/template.enums';
import { ITemplate } from '../models/template.model';

@Injectable()
export class TemplatesGuardService {


  constructor(
    private vTokenObjectService: VerdocsTokenObjectService
  ) { }


  public canPerformAction(action: TemplateActions, template: ITemplate): { canPerform: boolean, message: string } {
    try {
      let canPerform = false;
      let message = null;
      const neededPermissions = [];
      if (!template && !action.includes('create')) {
        throw {
          error:
            'You need to provide template object'
        }
      }
      const userProfile = this.vTokenObjectService.getProfile();
      const isCreator = userProfile ? template && template.profile_id === userProfile.id : false;
      const isSameOrg = userProfile ? template && template.organization_id === userProfile.organization_id : false;
      const isPersonal = template ? template.is_personal : null;
      const isPublic = template ? template.is_public : null;
      switch (action) {
        case TemplateActions.CREATE_PERSONAL:
          neededPermissions.push(TemplatePermissions.TEMPLATE_CREATOR_CREATE_PERSONAL)
          break;
        case TemplateActions.CREATE_ORG:
          neededPermissions.push(TemplatePermissions.TEMPLATE_CREATOR_CREATE_ORG);
          break;
        case TemplateActions.CREATE_PUBLIC:
          neededPermissions.push(TemplatePermissions.TEMPLATE_CREATOR_CREATE_PUBLIC)
          break;
        case TemplateActions.READ:
          if (!isCreator) {
            if ((!isPersonal && isSameOrg) || !isPublic) {
              neededPermissions.push(TemplatePermissions.TEMPLATE_MEMBER_READ);
            }
          }
          break;
        case TemplateActions.WRITE:
          if (!isCreator) {
            neededPermissions.push(TemplatePermissions.TEMPLATE_MEMBER_READ);
            neededPermissions.push(TemplatePermissions.TEMPLATE_MEMBER_WRITE);
          }
          break;
        case TemplateActions.CHANGE_VISIBILITY_PERSONAL:
          if (isCreator) {
            neededPermissions.push(TemplatePermissions.TEMPLATE_CREATOR_CREATE_PERSONAL);
            // neededPermission.push(TemplatePermissions.TEMPLATE_CREATOR_VISIBILITY);
          } else {
            neededPermissions.push(TemplatePermissions.TEMPLATE_MEMBER_VISIBILITY);
          }
          break;
        case TemplateActions.CHANGE_VISIBILITY_ORG:
          if (isCreator) {
            neededPermissions.push(TemplatePermissions.TEMPLATE_CREATOR_CREATE_ORG);
            // neededPermission.push(TemplatePermissions.TEMPLATE_CREATOR_VISIBILITY);
          } else {
            neededPermissions.push(TemplatePermissions.TEMPLATE_MEMBER_VISIBILITY);
          }
          break;
        case TemplateActions.CHANGE_VISIBILITY_PUBLIC:
          if (isCreator) {
            neededPermissions.push(TemplatePermissions.TEMPLATE_CREATOR_CREATE_PUBLIC);
            neededPermissions.push(TemplatePermissions.TEMPLATE_CREATOR_VISIBILITY);
          } else {
            neededPermissions.push(TemplatePermissions.TEMPLATE_MEMBER_VISIBILITY);
          }
          break;
        case TemplateActions.DELETE:
          if (isCreator) {
            neededPermissions.push(TemplatePermissions.TEMPLATE_CREATOR_DELETE);
          } else {
            neededPermissions.push(TemplatePermissions.TEMPLATE_MEMBER_DELETE);
          }
          break;
        default:
          throw {
            error: 'Action is not defined'
          }
      }
      if (this.hasPermissions(neededPermissions)) {
        canPerform = true;
      } else {
        message = `Insufficient access to perform '${action}'. Needed permissions: ${neededPermissions.toString()}`;
      }
      return {
        canPerform,
        message
      }
    } catch (err) {
      console.error({
        message: `Failed to check whether action (${action}) can be done, in TemplateGuardService`,
        err: err
      });
    }
  }

  private hasPermissions(requiredPermissions: string[]) {
    const userPermissions = this.vTokenObjectService.getPermissions();
    const hasPermissions = intersection(userPermissions, requiredPermissions).length === requiredPermissions.length;
    return hasPermissions;
  }

  public canBeSender(template): boolean {
    const userProfile = this.vTokenObjectService.getProfile();
    if (!userProfile) {
      return false;
    }
    switch (template.sender) {
      case TemplateSenderTypes.CREATOR:
        return userProfile.id === template.profile_id;
      case TemplateSenderTypes.ORGANIZATION_MEMBER:
      case TemplateSenderTypes.ORGANIZATION_MEMBER_AS_CREATOR:
        return userProfile.id === template.profile_id || template.organization_id === userProfile.organization_id;
      default:
        return true;
    }
  }

  canUserCreateTemplate() {
    return this.canPerformAction(TemplateActions.CREATE_PERSONAL, null)['canPerform']
      || this.canPerformAction(TemplateActions.CREATE_ORG, null)['canPerform']
      || this.canPerformAction(TemplateActions.CREATE_PUBLIC, null)['canPerform']
  }

}
