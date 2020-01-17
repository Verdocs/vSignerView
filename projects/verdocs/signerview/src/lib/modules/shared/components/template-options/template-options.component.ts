import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges, SimpleChanges, SimpleChange
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBarConfig, MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { findIndex, orderBy, find } from 'lodash';
import { VerdocsTokenObjectService } from '@verdocs/tokens';

import { SidenavService } from '../../../../services/sidenav.service';
import { HeaderService } from '../../../../services/header.service';
import { BuilderDataService } from '../../../../services/builder-data.service';
import { EnvelopeService } from '../../../../services/envelope.service';


import { TemplateDeleteDialogComponent } from '../../dialogs/template-delete-dialog/template-delete.dialog';
import { TemplatesGuardService } from '../../../../services/templates.guard';
import { TemplateActions } from '../../../../definitions/template.enums';
import { TemplatesService } from '../../../../services/templates.service';
import { CreateEnvelopeService, FixedDialogRef } from '../create-envelope';
import { TemplateOptionsService } from '../template-options/template-options.service';
import { ITemplate } from '../../../../models/template.model';


@Component({
  selector: 'app-template-options',
  templateUrl: 'template-options.component.html'
})

export class TemplateOptionsComponent implements OnChanges {
  @Input() public template: ITemplate;
  @Input() public isBuilderView: boolean;
  @Input() public isDashboard: boolean;
  @Output() public onTemplateRemoval: EventEmitter<string> = new EventEmitter();
  public templateOwnerInfo: any = null;
  public currentProfile: any = null;
  public isTemplateOwner = false;

  private fields;
  private _profile;
  private _canDelete;
  private _canEdit;
  private _canSend;
  private _canHaveLiveView;
  private _canBeSender;
  private _createEnvelopeDialog: FixedDialogRef;
  private _canSignNow;
  private _canPreview;

  constructor(
    private dialog: MatDialog,
    private snackbar: MatSnackBar,
    private router: Router,
    private sidenav: SidenavService,
    private headerService: HeaderService,
    private builderDataService: BuilderDataService,
    private vTokenObject: VerdocsTokenObjectService,
    private templateGuard: TemplatesGuardService,
    private templateService: TemplatesService,
    private createEnvelope: CreateEnvelopeService,
    private envelopeService: EnvelopeService,
    private templateOptionsService: TemplateOptionsService
  ) {
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.template) {
      const newTemplate: SimpleChange = changes.template;
      this.template = newTemplate.currentValue;
      this.currentProfile = this.vTokenObject.getProfile();
    }
  }

  get canSendEnvelope() {
    if (typeof (this._canSend) !== 'boolean' && this.templateService) {
      this._canSend = this.templateService.canSendEnvelope(this.template);
    }
    return this._canSend;
  }

  get canHaveLiveView() {
    if (typeof (this._canHaveLiveView)) {
      let response = true;
      if (this.template && this.template['roles'] && this.profile && this.profile.id === this.template['profile_id']) {
        const roles = orderBy(this.template.roles, 'sequence', 'asc');
        if (roles.length > 0) {

          if (roles[1] && roles[0].sequence === roles[1].sequence) {
            response = false;
          }

          if (roles[0].email || roles[0].full_name) {
            response = false;
          }

          if (['signer', 'approver'].indexOf(roles[0].type) === -1) {
            response = false;
          }

        } else {
          response = false;
        }
      } else {
        response = false;
      }
      this._canHaveLiveView = response;
    }
    return this._canHaveLiveView;
  }

  get firstParticipantIsMe() {
    const roles = this.template.roles;
    const signers = roles.filter(role => role.type === 'signer');
    const signerSequences = [];
    signers.forEach(signer => {
      signerSequences.push(signer.sequence);
    });
    const lowestSequence = Math.min.apply(Math, signerSequences);
    const firstSigners = roles.filter(role => {
      return role.sequence === lowestSequence;
    });
    if (firstSigners.length > 0) {
      let result = false;
      firstSigners.forEach(role => {
        if (this.currentProfile.email === role.email) {
          result = true;
        }
      });
      return result;
    }
  }

  get unknownRoles() {
    const roles = this.template.roles;
    return roles.filter(role => !role.email);
  }

  get numberOfUnknownRoles() {
    return this.unknownRoles.length;
  }

  get firstSigners() {
    const roles = this.template.roles;
    const signers = roles.filter(role => role.type === 'signer');
    const signerSequences = [];
    signers.forEach(signer => {
      signerSequences.push(signer.sequence);
    });
    const lowestSequence = Math.min.apply(Math, signerSequences);
    const firstSigners = roles.filter(role => {
      return role.sequence === lowestSequence;
    });
    return firstSigners;
  }

  get canSignNow() {
    if (typeof this._canSignNow) {
      const firstSigners = this.firstSigners;
      if (firstSigners.length > 0) {
        if (this.numberOfUnknownRoles === 0) {
          this._canSignNow = findIndex(firstSigners, { email: this.currentProfile.email }) > -1;
        } else if (this.numberOfUnknownRoles === 1) {
          this._canSignNow = findIndex(firstSigners, (r) => !r['email']) > -1;
        }
      } else {
        this._canSignNow = false;
      }
    }
    return this._canSignNow;
  }

  get canPreview() {
    if (typeof this._canPreview !== 'boolean') {
      this._canPreview = this.templateOptionsService.canPreview(this.template);
    }
    return this._canPreview;
  }


  // template token should be provided here  IMPORTANT
  async toggleInvite() {
    this.templateOwnerInfo = await this.templateService.getTemplateOwnerInfo(this.template.id);
    let width = 380;
    let marginRight = 24;
    if (window) {
      if (window.innerWidth && window.innerWidth <= 480) {
        width = window.innerWidth;
        marginRight = 0;
      } else {
        width = 380;
        marginRight = 24;
      }
    }

    this._createEnvelopeDialog = this.createEnvelope.open({
      position: {
        bottom: '0px',
        right: `${marginRight}px`
      },
      width: `${width}px`,
      height: '48px',
      maxHeight: '80vh',
      role: 'multi'
    });
    this.createEnvelope.updateAllPositions(this.createEnvelope.openDialogs);
    this._createEnvelopeDialog._containerInstance.template = this.template;
    this._createEnvelopeDialog._containerInstance._templateSource = 'preview';
    this._createEnvelopeDialog._containerInstance.templateOwnerInfo = this.templateOwnerInfo;
    this._createEnvelopeDialog._containerInstance.isTemplateOwner = this.isTemplateOwner;
    this._createEnvelopeDialog._containerInstance.templateId = this.template.id;
    this._createEnvelopeDialog._containerInstance.currentProfile = this.currentProfile;
    this._createEnvelopeDialog._containerInstance.initializeData();
    this._createEnvelopeDialog.expand();

    this._createEnvelopeDialog.afterClosed().subscribe(() => {
      this.createEnvelope.updateAllPositions(this.createEnvelope.openDialogs);
    });
  }

  liveViewClipboard(meetsPlanType) {
    this.templateOptionsService.liveViewClipboard(meetsPlanType, this.template);
  }

  previewClipboard() {
    this.templateOptionsService.createLinkClipboard(this.template);
  }

  gotoEnvelope(index?) {
    this.router.navigate([`/envelopes/document/${this.template.id}`]);
    this.sidenav.updateTitle(this.template.name);
    this.headerService.titleSubject.next(this.template.name);
  }

  gotoPreview() {
    this.router.navigate([`/document/${this.template['id']}`]);
  }

  goToLiveView() {
    this.router.navigate([`/view/live/${this.template['id']}/token/${this.template['token']}`]);
  }

  editTemplate() {
    this.builderDataService.updateLocalTemplate(this.template);
    this.router.navigate([`builder/${this.template.id}/fields`]);
  }

  deleteTemplate() {
    const templateDeleteDialog = this.dialog.open(TemplateDeleteDialogComponent, {
      panelClass: 'template-delete'
    });
    templateDeleteDialog.componentInstance.template = this.template;
    templateDeleteDialog.afterClosed().subscribe((response) => {
      if (this.isBuilderView) {
        if (response !== 'canceled') {
          this.router.navigate([`/templates`]);
        }
      }
      if (this.isDashboard) {
        if (response !== 'canceled') {
          this.onTemplateRemoval.emit(this.template.id);
        }
      }
    });
  }

  createSnackbar(message: string, buttonTitle?: string) {
    if (!buttonTitle) {
      buttonTitle = null;
    }
    let snackbarConfig: MatSnackBarConfig
    if (window && window.innerWidth >= 920) {
      snackbarConfig = {
        verticalPosition: 'bottom',
        horizontalPosition: 'left',
        duration: 5000
      }
    } else {
      snackbarConfig = {
        verticalPosition: 'top',
        duration: 5000
      }
    }
    this.snackbar.open(message, buttonTitle, snackbarConfig);
  }

  get profile() {
    if (!this._profile && this.vTokenObject) {
      this._profile = this.vTokenObject.getProfile();
    }
    return this._profile;
  }

  get canDelete() {
    if (typeof (this._canDelete) !== 'boolean' && this.templateGuard) {
      const response = this.templateGuard.canPerformAction(TemplateActions.DELETE, this.template);
      this._canDelete = response['canPerform']
    }
    return this._canDelete;
  }

  get canEdit() {
    if (typeof (this._canEdit) !== 'boolean' && this.templateGuard) {
      const response = this.templateGuard.canPerformAction(TemplateActions.WRITE, this.template);
      this._canEdit = response['canPerform']
    }
    return this._canEdit
  }

  get canBeSender() {
    if (typeof (this._canBeSender) !== 'boolean' && this.templateGuard) {
      this._canBeSender = this.templateGuard.canBeSender(this.template);
    }
    return this._canBeSender
  }

  getTooltipMessage(buttonName) {
    let message;
    switch (buttonName) {
      case 'send':
        if (this.canBeSender) {
          message = 'Template is in build mode.'
        } else {
          message = 'Sender is defined as template creator.'
        }
        break;
      case 'preview':
        message = 'Template is incomplete.';
        break;
      case 'edit':
        message = 'Edit privileges required.'
        break;
      case 'delete':
        message = 'Delete privileges required.'
        break;
      case 'liveView':
        if (this.profile.id !== this.template['profile_id']) {
          message = 'LiveLink requires being template creator.'
        } else if (this.canSendEnvelope) {
          message = 'Template settings have disabled LiveLink.'
        } else if (!this.canBeSender) {
          message = 'Sender is defined as template creator.'
        } else {
          message = 'Template is in build mode.'
        }
        break;
      case 'signNow':
        const firstSigners = this.firstSigners;
        if (firstSigners.length > 0) {
          if (firstSigners.length > 1 || this.numberOfUnknownRoles > 1) {
            message = 'There are too many unknown recipients.';
          } else {
            message = 'There are no fields.';
          }
        } else if (this.template.roles.length === 0) {
          message = 'There are no recipients.';
        } else {
          message = 'The first signer role is assigned to someone else.';
        }
        break;
      default:
        message = 'Message not defined.'
    }
    return message;
  }

  goToEnvelopeView(envelope) {
    const recipient = find(envelope.recipients, (r) => {
      return r.email === this.currentProfile.email;
    });
    if (window && !!this.currentProfile && this.currentProfile.email === recipient.email) {
      window.location.href = window.location.origin +
        `/view/sign/${envelope.id}/roleName/${recipient.role_name}/invitation/${encodeURIComponent(recipient.email_access_key)}`;
    }
  }

  signNow() {
    if (this.canSendEnvelope && this.canSignNow) {
      const roles = this.template.roles;
      if (this.numberOfUnknownRoles === 1) {
        const emptyRoleIndex = findIndex(roles, (role) => !role['email']);
        if (emptyRoleIndex > -1) {
          roles[emptyRoleIndex].email = this.currentProfile.email;
          roles[emptyRoleIndex].full_name = this.currentProfile.first_name + ' ' + this.currentProfile.last_name;
        }
      }
      const body = {
        template_id: this.template.id,
        roles: roles
      }
      this.envelopeService.sendInvite(body).subscribe(envelope => {
        this.goToEnvelopeView(envelope);
      },
        (err) => {
          console.error({
            message: 'Failed to create Envelope',
            detail: err
          });
        });
    }
  }
}
