import {
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Optional,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
  ViewEncapsulation,
  ChangeDetectionStrategy,
  ViewChild
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { AnimationEvent } from '@angular/animations';
import { DialogAnimations } from './fixed-dialog-animations';
import { FocusTrap, FocusTrapFactory } from '@angular/cdk/a11y';
import { MatDialog } from '@angular/material/dialog';
import { find, orderBy } from 'lodash';
import { Subscription } from 'rxjs';
import { Overlay } from '../overlay';
import { FixedDialogConfig } from './fixed-dialog-config';
import { DiscardDialogComponent } from '../../dialogs/discard-dialog/discard-dialog.component';
import { EnvelopeCreatedDialogComponent } from '../../dialogs/envelope-created-dialog/envelope-created-dialog.component';
import { LiveViewDialog } from '../../dialogs/live-view-dialog/live-view.dialog';
import { HeaderService } from '../../../core/services/header.service';
import { TemplatesGuardService } from 'app/core/services/templates.guard';
import { TemplatesService } from '../../../core/services/templates.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { EnvelopeService } from '../../../core/services/envelope.service';
import { LiveViewService } from '../../../core/services/view-data.service';
import { EmailValidator } from '../../../core/validators/email.validator';
import { PhoneValidator } from '../../../core/validators/phone.validator';
import { getRGBA, getRGB } from '../../../core/functions/rgb';

import { environment } from '../../../../environments/environment';
import { TemplateSenderTypes } from 'app/core/definitions/template.enums';
import { VerdocsTokenObjectService } from '@verdocs/tokens';
import { EventTrackerService } from '@verdocs/event-tracker';

export function throwDialogContentAlreadyAttachedError() {
  throw Error('Attempting to attach dialog after already attached');
}

@Component({
  moduleId: module.id,
  selector: 'app-fixed-dialog-container',
  templateUrl: './create-envelope-container.html',
  styleUrls: ['./dialog.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.Default,
  animations: [DialogAnimations.dialogContainer],
  host: {
    'class': 'fixed-dialog-container',
    'tabindex': '-1',
    '[attr.id]': '_id',
    '[attr.role]': '_config.role',
    '[attr.aria-labelledby]': '_config.ariaLabel ? null : _ariaLabelledBy',
    '[attr.aria-label]': '_config.ariaLabel',
    '[attr.aria-describedby]': '_config.ariaDescribedBy || null',
    '[@dialogContainer]': '_state',
    '(@dialogContainer.start)': '_onAnimationStart($event)',
    '(@dialogContainer.done)': '_onAnimationDone($event)'
  }
})
export class CreateEnvelopeContainer implements OnInit, OnDestroy {
  public template: any;
  public templateId: string;
  public templateToken: string;
  public roles: any[];
  public inviteRoles: any[] = [];
  public roleFormGroup: FormGroup;
  public templateOwnerInfo: any = null;
  public templateName: string = '';
  public isTemplateOwner = false;
  public inviteWindowState = 'closed';
  public editRole: string = null;
  public editRoleName: string = null;
  public roleColor: string = null;
  public _canSend = null;
  public inviteInProgress = false;
  public currentProfile: any = null;
  public isPreparer = false;
  public hasPreparer = false;
  public sender_name = '';
  public hasMessage = false;
  public hasDelegator = false;
  public action_string = 'create';
  public rSecureUrl = environment.rSecure_frontend_url;
  public rFormUrl = environment.frontend_url;

  @ViewChild('closeButton', { static: true }) closeButtonElement: ElementRef;
  @ViewChild('rolePhoneInput', { static: true }) rolePhoneInput: ElementRef;

  private _focusTrap: FocusTrap;
  private _elementFocusedBeforeDialogWasOpened: HTMLElement | null = null;
  private _canHaveLiveView;
  private _canBeSender;
  private _preparer_name;
  private _modeSubscription = new Subscription();
  private _formGroupChangeSubscription = new Subscription();
  private _mode: string;
  _templateSource: 'liveview' | 'preview';
  _state: 'void' | 'enter' | 'exit' = 'enter';
  _windowState: 'collapsed' | 'expanded' | 'maximized' = 'collapsed';
  _animationStateChanged = new EventEmitter<AnimationEvent>();
  _hasPreparerChanged = new EventEmitter<any>();
  _ariaLabelledBy: string | null;
  _id: string;

  constructor(
    private _elementRef: ElementRef,
    private _focusTrapFactory: FocusTrapFactory,
    private _changeDetectorRef: ChangeDetectorRef,
    private templateGuard: TemplatesGuardService,
    private _headerService: HeaderService,
    private _dashboardService: DashboardService,
    private templateService: TemplatesService,
    private liveViewService: LiveViewService,
    private envelopeService: EnvelopeService,
    private router: Router,
    @Optional() @Inject(DOCUMENT) private _document: any,
    public _config: FixedDialogConfig,
    private fb: FormBuilder,
    private _overlay: Overlay,
    private dialog: MatDialog,
    private tokenObjectService: VerdocsTokenObjectService,
    private eventTracker: EventTrackerService
  ) {
    this._ariaLabelledBy = _config.ariaLabelledBy || null;
  }

  ngOnInit() {
    this._modeSubscription = this._headerService.modeSubject.subscribe(mode => {
      this._mode = mode;
    });
  }
  ngOnDestroy() {
    this._modeSubscription.unsubscribe();
    if (this._formGroupChangeSubscription) {
      this._formGroupChangeSubscription.unsubscribe();
    }
  }

  get isFormPristine() {
    return this.roleFormGroup.pristine && this.roleFormGroup.untouched;
  }

  get canBeSender() {
    if (typeof (this._canBeSender) !== 'boolean' && this.templateGuard) {
      this._canBeSender = this.templateGuard.canBeSender(this.template);
    }
    return this._canBeSender
  }

  get canHaveLiveView() {
    if (typeof (this._canHaveLiveView)) {
      let response = true;
      if (this.template && this.template['roles'] && this.currentProfile && this.currentProfile.id === this.template['profile_id']) {
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

  get preparer_name() {
    if (!this._preparer_name || (!!this.roleFormGroup.controls['preparer'] && this.roleFormGroup.controls['preparer']['controls']['full_name'].value !== this._preparer_name)) {
      this._preparer_name = !!this.roleFormGroup.controls['preparer'] && this.roleFormGroup.controls['preparer']['controls']['full_name'].value ? this.roleFormGroup.controls['preparer']['controls']['full_name'].value : 'Preparer';
      if (this.currentProfile && this._preparer_name === this.currentProfile.first_name + ' ' + this.currentProfile.last_name) {
        this._preparer_name = this.currentProfile.first_name + ' ' + this.currentProfile.last_name + ' (me)';
      }
    }
    return this._preparer_name;
  }

  clearOnBlur(roleName) {
    if (!this.roleFormGroup.controls[roleName]["controls"].phone.value) {
      this.roleFormGroup.controls[roleName]["controls"].phone.reset();
      this.roleFormGroup.controls[roleName]["controls"].phone.updateValueAndValidity();
    }
  }

  liveViewClipboard(meetsPlanType) {
    if (window && meetsPlanType === true) {
      const lvDialog = this.dialog.open(LiveViewDialog);
      lvDialog.componentInstance.liveUrl =
        `${window.location.origin}/view/live/${this.template['id']}` +
        `/token/${encodeURIComponent(this.template['token'])}`;
    }

  }

  getTooltipMessage(buttonName) {
    let message;
    switch (buttonName) {
      case 'liveView':
        if (this.currentProfile && this.currentProfile.id !== this.template['profile_id']) {
          message = 'LiveLink requires being template creator.'
        } else if (this.canSendEnvelope) {
          message = 'Template settings have disabled LiveLink.'
        } else if (!this.canBeSender) {
          message = 'Sender is defined as template creator.'
        } else {
          message = 'Template is in build mode.'
        }
        break;
      default:
        message = 'Message not defined'
    }
    return message;
  }

  attach() {
    this._savePreviouslyFocusedElement();
  }

  hideBackdrop() {
    this._overlay.hideBackdrop();
  }
  togglePreparer() {
    this.hasPreparer = !this.hasPreparer;
    this.eventTracker.createEvent({
      category: 'verdoc create',
      action: `verdoc create - prepare role ${this.hasPreparer ? 'added' : 'deleted'}`,
      label: `document id: ${this.template.id}`
    });
    if (this.hasPreparer) {
      this.roleFormGroup.addControl('preparer', this.fb.group({
        type: 'preparer',
        name: 'Preparer',
        full_name: ['', [Validators.required]],
        email: ['', [Validators.required, EmailValidator.MatchEmail]],
        phone: ['', [PhoneValidator.MatchPhone, Validators.maxLength(16)]],
        sequence: 0,
        delegator: false,
        message: ['']
      }));
    } else {
      this.roleFormGroup.removeControl('preparer');
    }
    this._hasPreparerChanged.emit({ status: this.hasPreparer, template: this.template });
  }

  initializeData() {
    this.prepareTemplateOwnerInfo();
    this.resetTemplateName();
    this.prepareRoles(this.template);
    this.sender_name = this.getSenderName();
    this.buildRoleFormGroup();
  }

  getSenderName() {
    if ([
      TemplateSenderTypes.CREATOR,
      TemplateSenderTypes.EVERYONE_AS_CREATOR,
      TemplateSenderTypes.ORGANIZATION_MEMBER_AS_CREATOR].indexOf(this.template.sender) !== -1
      || this._templateSource === 'liveview') {
      return this.templateOwnerInfo['name']
    } else {
      const profile = this.tokenObjectService.getProfile();
      return profile ? `${profile.first_name} ${profile.last_name}` : ''
    }
  }

  prepareRoles(template) {
    let roles = []
    if (template['roles'] && template['roles'].length > 0) {
      roles = template['roles'];
    }
    this.roles = roles.sort((a, b) => {
      if (a.sequence === b.sequence) {
        return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
      }
      return b.sequence > a.sequence ? -1 : b.sequence < a.sequence ? 1 : 0;
    });
  }

  buildRoleFormGroup() {
    const roleFormGroup: any = {}
    this.inviteRoles = [];
    this.roles.forEach((role, index) => {
      const roleCopy = { ...role };
      roleCopy['content_editable'] = false;
      roleCopy['readOnly'] = !!roleCopy.email;
      roleCopy['backgroundColor'] = this.getRGB(index);
      roleFormGroup[roleCopy.name] = this.fb.group({
        type: [roleCopy.type],
        name: [roleCopy.name],
        full_name: [{ value: roleCopy.full_name ? roleCopy.full_name : '', disabled: !!roleCopy.full_name }, [Validators.required]],
        email: [roleCopy.email ? roleCopy.email : '', [Validators.required, EmailValidator.MatchEmail]],
        phone: [roleCopy.phone ? roleCopy.phone : '', [PhoneValidator.MatchPhone, Validators.maxLength(16)]],
        sequence: [roleCopy.sequence],
        delegator: [roleCopy.delegator ? true : false],
        message: [roleCopy.message ? roleCopy.message : '']
      });
      if (this.inviteRoles && this.inviteRoles[role.sequence - 1]) {
        if (this.inviteRoles[role.sequence - 1].length > 0) {
          this.inviteRoles[role.sequence - 1].push(roleCopy);
        } else {
          this.inviteRoles[role.sequence - 1] = [roleCopy];
        }
      } else {
        this.inviteRoles.push([roleCopy]);
      }
    });
    this.roleFormGroup = new FormGroup(roleFormGroup);
  }

  autocompleteAsCreator() {
    if (this.currentProfile) {
      this.roleFormGroup.controls[this.editRole]['controls']['full_name'].patchValue(this.currentProfile.first_name + ' ' + this.currentProfile.last_name);
      this.roleFormGroup.controls[this.editRole]['controls']['email'].patchValue(this.currentProfile.email);
      this.roleFormGroup.updateValueAndValidity();
    }
  }

  prepareTemplateOwnerInfo() {
    if (this._templateSource === 'preview') {
      if (this.currentProfile && this.templateOwnerInfo) {
        if (this.template.sender !== 'organization_member') {
          if (this.currentProfile) {
            if (this.currentProfile.id === this.templateOwnerInfo.profile_id) {
              if (!this.templateOwnerInfo['name'].includes('(me)')) {
                this.templateOwnerInfo['name'] = this.templateOwnerInfo['name'] + ' (me)';
              }
              this.isTemplateOwner = true;
            }
          }
        } else {
          if (!this.templateOwnerInfo['name'].includes('(me)')) {
            this.templateOwnerInfo['name'] = this.currentProfile.first_name + ' ' + this.currentProfile.last_name + ' (me)';
          }
        }
      } else {
        this.isTemplateOwner = false;
      }
    } else {
      if (this.currentProfile && this.templateOwnerInfo) {
        if (this.currentProfile.id === this.templateOwnerInfo.profile_id) {
          if (!this.templateOwnerInfo['name'].includes('(me)')) {
            this.templateOwnerInfo['name'] = this.templateOwnerInfo['name'] + ' (me)';
          }
          this.isTemplateOwner = true;
        } else {
          this.isTemplateOwner = false;
        }
      }
    }
  }

  chipLabel(role) {
    let label = role['name'];
    if (role['email']) {
      label = role['email'];
    }
    if (role['full_name']) {
      label = role['full_name'];
    }
    if (this.roleFormGroup && this.roleFormGroup.controls[role.name]) {
      const newRole = this.roleFormGroup.controls[role.name].value;
      if (newRole.email && newRole.full_name) {
        label = newRole.full_name;
      }
    }
    return label;
  }

  getRGB(index) {
    return getRGB(getRGBA(index));
  }

  editRecipient(readOnly, role_name, role_color) {
    if (!readOnly) {
      this.editRole = role_name;
      this.editRoleName = role_name;
      this.roleColor = role_color;
      this.hasMessage = this.roleFormGroup.controls[this.editRole]['controls']['message'].value !== '';
      this.hasDelegator = !!this.roleFormGroup.controls[this.editRole]['controls']['delegator'].value;
    }
  }
  minimizeRecipientDialog(clear?) {
    if (clear) {
      this.roleFormGroup.controls[this.editRole].markAsPristine();
      this.roleFormGroup.controls[this.editRole].markAsUntouched();
    }
    this.editRole = null;
    setTimeout(() => {
      this.editRoleName = null;
      this.roleColor = null;
    }, 300);
  }

  verifyAndMinimizeRecipientDialog() {
    if (this.roleFormGroup && this.roleFormGroup.controls[this.editRole].status === 'VALID') {
      const isPreparer = this.roleFormGroup.controls[this.editRole].value.type === 'preparer';
      this.eventTracker.createEvent({
        category: 'verdoc create',
        action: ` verdoc create - ${isPreparer ? 'preparer' : 'unknown'} role defined`,
        label: `document id: ${this.template.id}`
      })
      this.minimizeRecipientDialog(false);
    } else {
      if (this.roleFormGroup.controls[this.editRole]['controls']['message'].value !== '') {
        this.roleFormGroup.controls[this.editRole]['controls']['full_name'].markAsTouched();
        this.roleFormGroup.controls[this.editRole]['controls']['email'].markAsTouched();
      }
      return;
    }
  }

  sequenceTracking(index, item) {
    return index;
  }

  roleInviteTracking(index, item) {
    return index;
  }

  extractRolesFromFormGroup() {
    if (this.roleFormGroup && this.roles) {
      if (this.roleFormGroup.status === 'VALID') {
        const updatedRecipients = [];
        for (let roleIndex = 0; roleIndex < this.roles.length; roleIndex++) {
          updatedRecipients.push(this.roleFormGroup.controls[this.roles[roleIndex].name].value);
        }
        if (this.roleFormGroup.controls['preparer']) {
          updatedRecipients.unshift(this.roleFormGroup.controls['preparer'].value);
        }
        return updatedRecipients;
      }
      return [];
    }
    return [];
  }

  sendInvite(sign?: boolean) {
    if (this.inviteInProgress === false) {
      this.inviteInProgress = true;
      if (this.roleFormGroup.status === 'VALID') {
        const updatedRecipients = this.extractRolesFromFormGroup();
        const body = {
          template_id: this.templateId,
          roles: updatedRecipients
        }
        body['name'] = this.templateName;
        if (this._templateSource === 'liveview') {
          this.liveViewService.createLiveViewEnvelope(body, this.templateToken)
            .then(envelope => {
              this.inviteInProgress = false;
              this.buildRoleFormGroup();
              this.resetTemplateName();
              this.roleFormGroup.markAsPristine();
              this.roleFormGroup.markAsUntouched();
              this.closeButtonElement['_elementRef'].nativeElement.click();
              const successDialog = this.dialog.open(EnvelopeCreatedDialogComponent, {
                panelClass: 'envelope-created'
              });
              this.eventTracker.createEvent({
                category: 'verdoc create',
                action: `verdoc create - verdoc created${sign ? ' and opened' : ''}`,
                label: `verdoc id: ${envelope['id']}`
              });

              this.eventTracker.createEvent({
                category: 'verdoc',
                action: `verdoc created${sign ? ' and opened' : ''}`,
                label: `verdoc id: ${envelope['id']}`
              });
              successDialog.afterClosed().subscribe(() => {
                this.actionAfterSend(envelope, sign);
              });
            })
            .catch((err) => {
              console.error({
                message: 'Failed to createLiveViewEnvelope',
                detail: err
              });
            });
        } else {
          this.envelopeService.sendInvite(body).subscribe(envelope => {
            this.inviteInProgress = false;
            this.buildRoleFormGroup();
            this.resetTemplateName();
            this.roleFormGroup.markAsPristine();
            this.roleFormGroup.markAsUntouched();
            this.closeButtonElement['_elementRef'].nativeElement.click();
            this.eventTracker.createEvent({
              category: 'verdoc create',
              action: `verdoc create - verdoc created${sign ? ' and opened' : ''}`,
              label: `verdoc id: ${envelope.id}`
            });
            this.eventTracker.createEvent({
              category: 'verdoc',
              action: `verdoc created${sign ? ' and opened' : ''}`,
              label: `verdoc id: ${envelope.id}`
            });
            const successDialog = this.dialog.open(EnvelopeCreatedDialogComponent, {
              panelClass: 'envelope-created'
            });
            successDialog.afterClosed().subscribe(() => {
              this.actionAfterSend(envelope, sign);
            });
          }, (err) => {
            console.error({
              message: 'Failed to create Envelope',
              detail: err
            });
            this.inviteInProgress = false;
            this.buildRoleFormGroup();
            this.resetTemplateName();
          });
        }
      }
    }
  }

  actionAfterSend(envelope, sign?) {
    if (this._mode === 'dashboard') {
      this._dashboardService.triggerRefreshSubject.next(true);
    }
    if (sign) {
      this.goToEnvelopeView(envelope);
    }
  }

  close() {
    if (!this.roleFormGroup.pristine || !this.roleFormGroup.untouched) {
      const discardDialog = this.dialog.open(DiscardDialogComponent, {
        panelClass: 'discard'
      });
      return discardDialog;
    }
  }

  minimizeInviteDialog() {
    this.inviteWindowState = 'closed';
  }

  resetTemplateName() {
    this.templateName = !!this.currentProfile || this._templateSource === 'liveview' ? this.template['template_name'] || this.template['name'] : 'Log in or Sign up';
  }

  canSendEnvelope() {
    if (this._templateSource === 'liveview') {
      this._canSend = true
    } else if (typeof (this._canSend) !== 'boolean' && this.templateService) {
      this._canSend = this.templateService.canSendEnvelope(this.template);
    }
    return this._canSend;
  }

  toggleMessage() {
    this.hasMessage = !this.hasMessage;
    if (!this.hasMessage) {
      this.roleFormGroup.controls[this.editRole]['controls']['message'].patchValue('');
      this.roleFormGroup.updateValueAndValidity();
    }
  }

  hasDelegate() {
    if (this.editRole) {
      return this.roleFormGroup.controls[this.editRole]['controls']['delegator'].value;
    }

    return false;
  }

  toggleDelegate() {
    this.roleFormGroup.controls[this.editRole]['controls']['delegator'].patchValue(!this.roleFormGroup.controls[this.editRole]['controls']['delegator'].value);
    this.hasDelegator = this.roleFormGroup.controls[this.editRole]['controls']['delegator'].value;
    this.roleFormGroup.updateValueAndValidity();
  }

  firstSignerIsCreator() {
    if (this.roleFormGroup && this.currentProfile) {
      const roles = this.extractRolesFromFormGroup();
      if (roles.length > 0) {
        if (this.hasPreparer) {
          const preparer = find(roles, { sequence: 0, name: 'Preparer' });
          if (preparer) {
            return preparer.email === this.currentProfile.email;
          }
        } else {
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
      }
    }
    return false;
  }

  signIn() {
    if (window) {
      window.location.href = `${this.rSecureUrl}/login?redirect_url=${window.location.href}`;
    }
  }

  signUp() {
    if (window) {
      window.location.href = `${this.rSecureUrl}/signup?redirect_url=${window.location.href}`;
    }
  }

  private goToEnvelopeView(envelope) {
    const recipients = envelope.recipients.sort((a, b) => a.sequence - b.sequence).filter(recipient => recipient.email === this.currentProfile.email);
    const recipient = recipients[0];
    if (window && !!this.currentProfile && this.currentProfile.email === recipient.email) {
      window.location.href = window.location.origin +
        `/view/sign/${envelope.id}/roleName/${recipient.role_name}/invitation/${encodeURIComponent(recipient.email_access_key)}`;
    }
  }

  private _trapFocus() {
    if (!this._focusTrap) {
      this._focusTrap = this._focusTrapFactory.create(this._elementRef.nativeElement);
    }
    this._focusTrap.focusInitialElementWhenReady();
  }

  private _restoreFocus() {
    const toFocus = this._elementFocusedBeforeDialogWasOpened;

    if (this._config.restoreFocus && toFocus && typeof toFocus.focus === 'function') {
      toFocus.focus();
    }

    if (this._focusTrap) {
      this._focusTrap.destroy();
    }
  }

  private _savePreviouslyFocusedElement() {
    if (this._document) {
      this._elementFocusedBeforeDialogWasOpened = this._document.activeElement as HTMLElement;

      if (this._elementRef.nativeElement.focus) {
        Promise.resolve().then(() => this._elementRef.nativeElement.focus());
      }
    }
  }

  _onAnimationDone(event: AnimationEvent) {
    if (event.toState === 'enter') {
      this._trapFocus();
    } else if (event.toState === 'exit') {
      this._restoreFocus();
    }
    this._animationStateChanged.emit(event);
  }

  _onAnimationStart(event: AnimationEvent) {
    this._animationStateChanged.emit(event);
  }

  _startExitAnimation(): void {
    this._state = 'exit';
    this._changeDetectorRef.markForCheck();
  }
}
