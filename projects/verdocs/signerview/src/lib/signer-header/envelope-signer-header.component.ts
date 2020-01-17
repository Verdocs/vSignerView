import { Component, OnInit, OnDestroy, Compiler, AfterContentInit, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { filter, find, findIndex } from 'lodash';
import { saveAs } from 'file-saver';
import * as moment from 'moment';

import { EnvelopeViewService } from '../services/envelope-view.service';
import { EnvelopeService } from '../services/envelope.service';
import { SignatureService } from '../services/envelope-signature.service';
import { RecipientService } from '../services/recipients.service';
import { ValidatorService } from '../services/validator.service';
import { SnackbarService } from '../services/snackbar.service';
import { RequiredFieldsService } from '../services/required-fields.service';
import { getRGBA } from '../functions/rgb';
import { printPdfUrl } from '../functions/utils';

import { EnvelopeDelegateComponent } from '../dialogs/delegate/envelope-delegate.component';
import { DeclineEnvelopeDialogComponent } from '../dialogs/decline/envelope-decline.dialog';
import { IRecipient } from '../models/recipient.model';
import { ClaimDialogComponent } from '../dialogs/claim/envelope-profile-claim.dialog';
import { AccountService } from '../services/account.service';
import { VerdocsAuthService, VerdocsStateService, VerdocsTokenObjectService } from '@verdocs/tokens';
import { EventTrackerService } from '@verdocs/event-tracker';

@Component({
  selector: 'app-envelope-signer-header',
  templateUrl: './envelope-signer-header.component.html',
  styleUrls: ['./envelope-signer-header.component.scss']
})
export class EnvelopeSignerHeaderComponent implements OnInit, AfterContentInit, OnDestroy {
  public notAgreed = true;
  public agreeToggled = false;
  public message = '';
  public fields: any[] = [];
  public fieldMessage = '';
  public actionLabel = 'next';
  public isDelegator = false;
  public pdfUrl: any;
  public pdfBlob: any;
  public inProgress = false;
  public initialLoad = true;
  public rName: string;
  public mode: string;
  public signerRecipients: any[] = [];
  public currentRecipient: any;
  public nextRecipient: any;
  public thirdRecipient: any;
  public current_recipient_style: any;
  public next_recipient_style: any;
  public canComplete = false;
  public formValid = false;
  public invalidFormControls = [];
  public requiredFields = [];
  public errors: any[] = [];
  public isMobile = false;
  public showErrors = true;

  @Input() public loadingProgress = 0;

  private canFinish = false;
  private redirectReq: string;
  private envelopeId: string;
  private roleName: string;
  private roleType: string;
  private requiresSignature = false;
  private requiresInitial = false;
  private fieldType = '';
  private signImgUrl: any = null;
  private initialImgUrl: any = null;
  private envelope: any;
  private actionClick = false;
  private subscriptions: Subscription[] = [];
  private recipientSubscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private envelopeViewService: EnvelopeViewService,
    private envelopeService: EnvelopeService,
    private envelopeSignatureService: SignatureService,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private recipientService: RecipientService,
    private validatorService: ValidatorService,
    private requiredFieldService: RequiredFieldsService,
    private compiler: Compiler,
    private accountService: AccountService,
    private vTokenAuth: VerdocsAuthService,
    private stateService: VerdocsStateService,
    private vTokenObjectService: VerdocsTokenObjectService,
    private eventTracker: EventTrackerService
  ) { }

  // refactor this
  ngOnInit() {
    this.requiredFields = null;
    this.inProgress = true;
    this.handleQueryParams();
    this.validatorService.getValidatorsObject().then(() => {
      this.inProgress = false;
    });

    this.route.params.subscribe((params) => {
      this.rName = params['roleName'];
      this.envelopeId = params['id'];

      this.recipientService.getRecipients(this.envelopeId)
        .then(() => {
          this.recipientSubscription = this.recipientService.recipientsSubject.subscribe((recipients) => {
            if (recipients && recipients.length > 0) {
              recipients = recipients.sort((a: IRecipient, b: IRecipient) => {
                if (a.sequence === b.sequence) {
                  return a.role_name < b.role_name ? -1 : a.role_name > b.role_name ? 1 : 0;
                }
                return b.sequence > a.sequence ? -1 : b.sequence < a.sequence ? 1 : 0;
              });
              const signers = recipients.filter(recipient => {
                return recipient.type === 'signer';
              });
              this.signerRecipients = filter(recipients, recipient => {
                return recipient.type === 'signer' && recipient.status !== 'submitted';
              });

              for (let x = 0; x < this.signerRecipients.length; x++) {
                const rIndex = findIndex(signers, { sequence: this.signerRecipients[x].sequence, role_name: this.signerRecipients[x].role_name });
                if (rIndex >= 0) {
                  this.signerRecipients[x]['rgba'] = getRGBA(rIndex);
                }
              }

              for (const recipient of this.signerRecipients) {
                recipient['style'] = {
                  backgroundColor: recipient.rgba
                }
              }

              this.subscriptions.push(this.envelopeViewService.viewModeSubject.subscribe(mode => {
                this.mode = mode;
                if (this.mode === 'prepareview') {
                  this.currentRecipient = this.signerRecipients[0];
                  this.nextRecipient = this.signerRecipients[1];
                  this.thirdRecipient = this.signerRecipients[2];
                  this.actionLabel = 'finish';
                } else {
                  this.currentRecipient = find(recipients, { role_name: this.rName });
                  const otherSignerRecipients = filter(this.signerRecipients, recipient => {
                    return recipient.role_name !== this.currentRecipient.role_name;
                  });
                  this.nextRecipient = otherSignerRecipients[0];
                  this.thirdRecipient = otherSignerRecipients[1];
                }
              }));
            }
          });
        });
    });

    this.subscriptions.push(this.envelopeViewService.formValiditySubject.subscribe(formControls => {
      this.invalidFormControls = formControls;
    }));

    this.subscriptions.push(this.envelopeViewService.recipientSubject.subscribe(recipient => {
      this.isDelegator = !!recipient['delegator'];
      this.message = recipient['message'];
      this.envelopeId = recipient['envelope_id'];
      this.roleName = recipient['role_name'];
      this.roleType = recipient['type'];
      this.notAgreed = !recipient['agreed'];
      this.envelopeViewService.agreedSubject.next(recipient['agreed']);
    }));

    this.subscriptions.push(this.envelopeService._currentExtendedEnvelope.subscribe(envelope => {
      if (envelope) {
        this.envelope = envelope;
      }
    }));

    this.subscriptions.push(this.envelopeSignatureService._fields.subscribe(fields => {
      this.fields = fields;
      this.initialLoad = false;
    }));

    this.subscriptions.push(this.envelopeViewService.fieldTypeSubject.subscribe(fieldType => {
      this.fieldType = fieldType;
      this.updateFieldMessage();
      this.action();
    }));

    this.subscriptions.push(this.envelopeService.inProgressSubject.subscribe(status => {
      this.inProgress = status;
    }));

    this.subscriptions.push(this.envelopeViewService.pdfUrlSubject.subscribe(url => {
      this.pdfUrl = url;
    }));

    this.subscriptions.push(this.envelopeViewService.pdfBlobSubject.subscribe(blob => {
      this.pdfBlob = blob;
    }));

    this.subscriptions.push(this.envelopeService.toggleNextSubject.subscribe(status => {
      if (status) {
        this.actionClick = false;
        this.nextEmptyRequiredField();
      }
    }));

    this.subscriptions.push(this.envelopeViewService.agreedSubject.subscribe(ifAgreed => {
      this.notAgreed = !ifAgreed;
    }));

    this.subscriptions.push(this.envelopeSignatureService.signImgSubject.subscribe(url => {
      if (!!url) {
        this.signImgUrl = url;
        this.requiresSignature = true;
      }
    }));

    this.subscriptions.push(this.envelopeSignatureService.initialImgSubject.subscribe(url => {
      if (url) {
        this.initialImgUrl = url;
        this.requiresInitial = true;
      }
    }));

    this.subscriptions.push(this.requiredFieldService.requiredFieldsSubject.subscribe(requiredFields => {
      this.requiredFields = requiredFields;
      this.inProgress = false;
    }));

    this.subscriptions.push(this.requiredFieldService.errorMessagesSubject.subscribe(errors => {
      this.errors = errors;
      if (this.errors && this.errors.length > 0) {
        if (this.mode && this.mode === 'signerview') {
          this.canFinish = false;
          this.canComplete = false;
          this.actionLabel = 'next';
        } else {
          this.canComplete = false;
        }
      }
    }));
  }

  ngAfterContentInit() {
    this.checkWindowSize();
    if (this.isMobile) {
      this.showErrors = false;
    } else {
      this.showErrors = true;
    }
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.recipientSubscription.unsubscribe();
    this.compiler.clearCache();
  }

  recipientTracking(index, item) {
    return index;
  }

  private handleQueryParams() {
    this.route.queryParams.subscribe(params => {
      if (params['redirectReq']) {
        const queryParams = JSON.parse(params['redirectReq']);
        this.redirectReq = queryParams.url;
      }
    });
  }

  toggleError() {
    this.showErrors = !this.showErrors;
  }

  checkWindowSize() {
    if (window && window.innerWidth < 768) {
      this.isMobile = true;
    } else {
      this.isMobile = false;
    }
  }

  agree() {
    if (this.canClaimEnvelope()) {
      const profile = this.vTokenObjectService.getProfile();
      this.recipientService.claimProfile(this.envelopeId, this.rName,
        {
          id: profile.id,
          email: profile.email,
          full_name: `${profile.first_name} ${profile.last_name}`
        }).then(() => {
          this.stateService.removeRCookie('signer_token');
        });
    } else if (this.canClaimEnvelope(true)) {
      this.recipientService.claimProfile(this.envelopeId, this.rName,
        {
          id: 'guest',
        });
    }
    this.recipientService.setAsAgreed(this.envelopeId, this.roleName);
    this.envelopeViewService.agreedSubject.next(this.agreeToggled);
    this.requiredFields = this.requiredFieldService.requiredFields;
    this.actionClick = false;
  }

  action() {
    this.envelopeViewService.requestFormValidity(true);
    if (this.mode === 'prepareview') {
      this.processPrepareView();
      return;
    }
    if (!this.inProgress) {
      this.nextEmptyRequiredField();
      this.actionClick = false;
      if (this.canFinish) {
        switch (this.mode) {
          case 'signerview':
            this.processSignerView();
            return;
          default:
            break;
        }
      }
    }
  }

  setActionClickTrue() {
    this.actionClick = true;
  }

  processSignerView() {
    if (this.requiresInitial && this.initialImgUrl ||
      this.requiresSignature && this.signImgUrl ||
      !this.requiresInitial && !this.requiresSignature ||
      this.roleType === 'approver') {
      this.canComplete = true;
    } else {
      this.snackbarService.open('This form cannot be completed.', 'DISMISS');
    }
  }

  async processPrepareView() {
    if (!this.errors || (this.errors && this.errors.length === 0)) {
      for (const field of this.envelope.fields) {
        if (field.prepared && field.required && this.hasEmptyFieldValue(field)) {
          this.snackbarService.open('Required fields that has been prepared cannot have empty value');
          return;
        }
      }
      if (this.invalidFormControls.length > 0) {
        this.envelopeViewService.jumpCoordinateSubject.next({
          pageNum: this.invalidFormControls[0]['pageNum'],
          fieldIndex: this.invalidFormControls[0]['inputId']
        });
        this.snackbarService.open('Number of characters cannot exceed the field size.');
        return;
      }
      this.canComplete = true;
      this.actionLabel = 'Finish';
      this.submitSignerView();
    } else {
      this.canComplete = false;
      this.snackbarService.open('All errors must be cleared before submitting.');
    }
  }

  hasEmptyFieldValue(field) {
    let hasEmptyValue = true;
    switch (field.type) {
      case 'dropdown':
        hasEmptyValue = !field.settings.value
        break;
      case 'checkbox_group':
      case 'radio_button_group':
        const errorIndex = findIndex(this.errors, { field_name: field.name });
        hasEmptyValue = errorIndex > -1;
        break;
      default:
        hasEmptyValue = !field.settings.result;
        break;
    }
    return hasEmptyValue;
  }

  submitSignerView(): void {
    this.inProgress = true;
    this.envelopeService.submitEnvelope(this.envelopeId, this.roleName)
      .subscribe(result => {
        this.eventTracker.createEvent({
          category: 'verdoc',
          action: 'verdoc submitted',
          label: `verdoc id: ${this.envelopeId}`
        });
        this.router.navigate([`/view/sign/${this.envelopeId}/role/${this.roleName}/complete`]);
        this.inProgress = false;
        return;
      });
  }

  updateFieldMessage() {
    switch (this.fieldType) {
      case 'signature':
        if (this.signImgUrl) {
          this.fieldMessage = 'Tap signature to add your signature.'
        } else {
          this.fieldMessage = 'Tap signature to create and add your signature.'
        }
        break;
      case 'initial':
        if (this.initialImgUrl) {
          this.fieldMessage = 'Tap intial to add your initials.'
        } else {
          this.fieldMessage = 'Tap intial to create and add your initials.'
        }
        break;
      case 'textbox':
        this.fieldMessage = 'Tap input to add text.'
        break;
      case 'attachment':
        this.fieldMessage = 'Tap attachment button to add an attachment'
        break;
      case 'payment':
        this.fieldMessage = 'Tap PAY button to add payment.'
        break;
      case 'date':
        this.fieldMessage = 'Tap input to open date picker calendar.'
        break;
      case 'checkbox':
      case 'checkbox_group':
        this.fieldMessage = 'Tap the checkbox.'
        break;
      case 'radio_button_group':
        this.fieldMessage = 'Tap the radio button.'
        break;
      case 'dropdown':
        this.fieldMessage = 'Tap the dropdown.'
        break;
      default:
        break;
    }
  }

  isSignerView() {
    return this.mode === 'signerview';
  }

  toggleDelegate(): void {
    if (this.isDelegator) {
      const delegateDialog = this.dialog.open(EnvelopeDelegateComponent, {
        panelClass: 'delegate'
      });
      delegateDialog.componentInstance.envelopeId = this.envelopeId;
      delegateDialog.componentInstance.roleName = this.roleName;
    }
  }

  printPdf() {
    const pdfUrl = this.pdfUrl.changingThisBreaksApplicationSecurity || this.pdfUrl;
    printPdfUrl(pdfUrl)
  }

  downloadPDF() {
    if (this.pdfBlob && this.envelope && this.envelope.name) {
      saveAs(this.pdfBlob, this.envelope.name + '-' + moment(this.envelope.updated_at).format('MM-DD-YY') + '.pdf');
    } else {
      this.snackbarService.open('PDF document is not ready to download. Please try again later.', null);
    }
  }

  decline(): void {
    const declineDialogRef = this.dialog.open(DeclineEnvelopeDialogComponent, {
      panelClass: 'decline'
    });
    declineDialogRef.componentInstance.redirectReq = this.redirectReq;
  }

  saveEnvelope() {
    this.router.navigate([`view/sign/${this.envelopeId}/role/${this.roleName}/saved`]);
  }

  nextEmptyRequiredField() {
    if (!this.inProgress && this.requiredFields !== null) {
      const requiredNotPrepared = filter(this.requiredFields, { prepared: false });
      if (requiredNotPrepared && requiredNotPrepared.length > 0) {
        this.canFinish = false;
        this.requiredFieldService.goToNextRequiredField();
      } else {
        this.canFinish = true;
        this.updateFinalAction();
        return;
      }
    }
  }

  updateFinalAction() {
    if (!this.initialLoad) {
      if (this.roleType === 'approver') {
        this.actionLabel = 'approve';
      } else {
        this.canComplete = true;
        this.actionLabel = 'finish';
      }
      this.fieldMessage = 'Tap finish to complete.';
    }
  }

  public getInitials(fullName: string) {
    if (!fullName) {
      return '';
    }
    const nameGroup = fullName.split(' ');
    if (nameGroup.length > 1) {
      return `${nameGroup[0].charAt(0)}${nameGroup[1].charAt(0)}`;
    } else {
      return `${nameGroup[0].charAt(0)}`;
    }
  }

  public async openClaimDialog() {
    if (this.canClaimEnvelope()) {
      const allProfiles = await this.accountService.getAllProfiles();

      const claimDialogRef = this.dialog.open(ClaimDialogComponent, {
        panelClass: 'envelope-claim',
        disableClose: true
      });
      claimDialogRef.componentInstance.profiles = allProfiles;
      claimDialogRef.componentInstance.recipient = this.currentRecipient;
    }
  }

  public canClaimEnvelope(asGuest?: boolean) {
    const isLoggedIn = asGuest ? true : this.vTokenAuth.isAuthenticated();
    return this.currentRecipient && !this.currentRecipient.claimed && isLoggedIn;
  }
}
