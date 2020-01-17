import {
  Component,
  ElementRef,
  Input,
  ViewChild,
  ViewChildren,
  QueryList,
  OnInit,
  AfterViewInit,
  AfterViewChecked,
  OnDestroy,
  ChangeDetectorRef,
  Compiler,
  Inject,
  PLATFORM_ID
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { DomSanitizer } from '@angular/platform-browser';
import { MatDialog } from '@angular/material/dialog';
import { EventTrackerService } from '@verdocs/event-tracker';
import { Subscription } from 'rxjs';
import { findIndex, find, filter } from 'lodash';

import { EnvelopeService } from '../services/envelope.service';
import { EnvelopeViewService } from '../services/envelope-view.service';
import { SignatureService } from '../services/envelope-signature.service';
import { AccountService } from '../services/account.service';
import { Broadcast } from '../services/broadcast';
import { VerdocsAuthService, VerdocsTokenObjectService } from '@verdocs/tokens';

import { PrepareInviteDialog } from '../dialogs/prepare/prepare-view.dialog';
import { SwitchProfileDialogComponent } from '../dialogs/switchProfile/envelope-switch-profile.dialog';
import { IRecipient } from '../models/recipient.model';
import { RecipientService } from '../services/recipients.service';
import { Envelope } from '../models/envelope.model';
import { SnackbarService } from '../services/snackbar.service';
import { PageService } from '../services/page.service';

@Component({
  selector: 'app-envelope-view',
  templateUrl: 'envelope-view.component.html',
  styleUrls: ['envelope-view.component.scss']
})

export class EnvelopeViewComponent implements OnInit, AfterViewChecked, AfterViewInit, OnDestroy {
  @Input() lvData: any;
  @Input() roles: any;
  @ViewChildren('fieldWrappers') fieldWrappers: QueryList<any>
  @ViewChild('pdfBody', { static: false }) pdfBody: ElementRef;
  @ViewChild('pdfDoc', { static: false }) pdfDoc: ElementRef;

  public isDelegator = false;
  public message: string;
  public agreed: boolean = false;
  public showSigning = false;
  public signImage: any = '';
  public pdfUrl: any;
  public totalPages: any[];
  public fields: any[];
  public attachments: any[] = [];
  public pdfDocHeight: number;
  public pageRendered: number[] = [];
  public recipients: IRecipient[];
  public envelopeId: string;
  public pageLoading = true;
  public pageDownloading = true;
  public pdfPages = [];
  public pdfLoadingProgress = 0;
  public loadingProgress = 0;
  public fieldOrganizingInProgress = false;
  public envelope: Envelope;
  public currentSignature: string;
  public currentSignatureId: string;
  public currentInitial: string;
  public currentInitialId: string;
  public isBrowser = false;

  private _fields: any[] = [];
  private recipient: any;
  private maxFields: number;
  public rName: string;
  private msgOpen = true;
  private itemIndex = -1;
  private itemQuery: any[];
  private mode: string;
  private redirectReq: string;
  private reqQuery: string;
  private reqData: string;
  private viewModeSubscription = new Subscription();
  private jumpCoordianteSubcription = new Subscription();
  private envelopeStatusSubscription = new Subscription();
  private showSignatureSubscription = new Subscription();
  private agreedSubscription = new Subscription();
  private fieldsSubscription = new Subscription();
  private unorganizedFields = [];

  constructor(
    public dialog: MatDialog,
    private envelopeService: EnvelopeService,
    private envelopeViewService: EnvelopeViewService,
    private sigService: SignatureService,
    private route: ActivatedRoute,
    private accountService: AccountService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private vTokenAuth: VerdocsAuthService,
    private vTokenObjectService: VerdocsTokenObjectService,
    private recipientService: RecipientService,
    private compiler: Compiler,
    private broadcast: Broadcast,
    private snackBarService: SnackbarService,
    private eventTracker: EventTrackerService,
    private pageService: PageService,
    @Inject(PLATFORM_ID) private platform
  ) { }

  ngOnInit() {
    this.viewModeSubscription = this.envelopeViewService.viewModeSubject.subscribe(mode => {
      this.mode = mode;
    });
    this.route.params.subscribe(params => {
      this.prepareEnvelope(params, this.sanitizer);
    });
    this.route.queryParams.subscribe(params => {
      if (params['redirectReq']) {
        const queryParams = JSON.parse(params['redirectReq']);
        this.redirectReq = queryParams.url;
        if (queryParams.query) {
          this.reqQuery = queryParams.query;
        }
        if (queryParams.data) {
          this.reqData = queryParams.data;
        }
      }
    });

    this.signImage = this.sanitizer.bypassSecurityTrustResourceUrl('../../assets/pen-white.svg');

    this.showSignatureSubscription = this.sigService._showSig.subscribe(result => {
      this.showSigning = result;
    });

    this.fieldsSubscription = this.sigService._fields.subscribe(fields => {
      this._fields = fields;
    });

    this.agreedSubscription = this.envelopeViewService.agreedSubject.subscribe(value => {
      if (value) {
        this.recipient['agreed'] = value;
        this.agreed = value;
      }
    });
    this.getVerticalHeight();
    this.eventTracker.createEvent({
      category: 'verdoc',
      action: 'verdoc opened',
      label: `verdoc id: ${ this.envelopeId}`
    });
    this.isBrowser = isPlatformBrowser(this.platform);
  }
  ngAfterViewInit() {
    this.jumpCoordianteSubcription = this.envelopeViewService.jumpCoordinateSubject.subscribe(coordinate => {
      if (coordinate.pageNum && this._fields[coordinate.pageNum][coordinate.fieldIndex]['order']) {
        this.itemQuery = this.pdfBody.nativeElement.querySelectorAll('.envelope__field');
        const jumpIndex = this._fields[coordinate.pageNum][coordinate.fieldIndex]['order'];
        if (this.itemIndex[jumpIndex]) {
          this.itemQuery[jumpIndex].focus();
        }
      }
    });
    this.getVerticalHeight();
  }
  ngAfterViewChecked() {
    if (this.pdfPages && this.totalPages && this.pdfPages.length === this.totalPages.length) {
      this.pdfPages = this.pdfPages.sort((a, b) => a.pageNumber - b.pageNumber);
      this.broadcast.broadcast('pdfUpdate', true);
    }
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this.viewModeSubscription.unsubscribe();
    this.jumpCoordianteSubcription.unsubscribe();
    this.envelopeStatusSubscription.unsubscribe();
    this.showSignatureSubscription.unsubscribe();
    this.agreedSubscription.unsubscribe();
    this.fieldsSubscription.unsubscribe();
    this.compiler.clearCache();
  }

  onSignatureComplete(event) {
    if (event && event['signature'] && event['signature_id']) {
      this.currentSignature = event['signature'];
      this.currentSignatureId = event['signature_id']
    }
  }

  onInitialComplete(event) {
    if (event && event['initial'] && event['initial_id']) {
      this.currentInitial = event['initial'];
      this.currentInitialId = event['initial_id']
    }
  }

  numTracking(index, item) {
    return index;
  }

  shouldAlternateSize(rotation) {
    if (rotation === 0 || rotation % 180 === 0) {
      return false;
    } else {
      return true;
    }
  }

  onPageRendered(event) {
    if (this.pageRendered.indexOf(event.detail.pageNumber) === -1) {
      this.pageRendered.push(event.detail.pageNumber);
    }
    this.loadingProgress = ((this.pageRendered.length / this.totalPages.length * 100) + this.pdfLoadingProgress) / 2;
    if (this.loadingProgress >= 100) {
      this.pageLoading = false;
    }

    const index = event.detail.pageNumber - 1;
    const pdfPagesDOM = this.pdfDoc['pdfContainer']['nativeElement'].children[0].children;
    const height = pdfPagesDOM[index].offsetHeight;
    const width = pdfPagesDOM[index].offsetWidth;
    const originalHeight = this.shouldAlternateSize(event.detail.viewport.rotation) ?
      event.detail.viewport.viewBox[2] - event.detail.viewport.viewBox[0]
      : event.detail.viewport.viewBox[3] - event.detail.viewport.viewBox[1];
    const originalWidth = this.shouldAlternateSize(event.detail.viewport.rotation) ?
      event.detail.viewport.viewBox[3] - event.detail.viewport.viewBox[1] :
      event.detail.viewport.viewBox[2] - event.detail.viewport.viewBox[0];
    const existingIndex = findIndex(this.pdfPages, { 'pageNumber': event.detail.pageNumber });
    if (existingIndex < 0) {
      this.pdfPages.push({
        'height': height,
        'width': width,
        'originalHeight': originalHeight,
        'originalWidth': originalWidth,
        'xRatio': width / originalWidth,
        'yRatio': height / originalHeight,
        'pageNumber': event.detail.pageNumber
      });
    } else {
      this.pdfPages[existingIndex] = {
        'height': height,
        'width': width,
        'originalHeight': originalHeight,
        'originalWidth': originalWidth,
        'xRatio': width / originalWidth,
        'yRatio': height / originalHeight,
        'pageNumber': event.detail.pageNumber
      }
    }
    if (this.pdfPages.length === this.totalPages.length) {
      this.pdfPages = this.pdfPages.sort((a, b) => a.pageNumber - b.pageNumber);
      this.broadcast.broadcast('pdfUpdate', true);
    }
    this.fixHeight();
  }

  getWrapperStyling(i) {
    if (this.pdfPages && this.pdfPages.length > 0) {
      return {
        margin: '10px auto 0',
        height: this.pdfPages[i].height + 'px',
        width: this.pdfPages[i].width + 'px'
      }
    }
  }

  onScaleChange(event) {
    // this.scale = event.scale / .75;
  }

  fixHeight() {
    if (this.pdfDoc && this.pdfDoc['element'] && this.pdfDoc['element'].nativeElement.children[0].children[0].children[0]) {
      this.pdfDocHeight = this.pdfDoc['element'].nativeElement.children[0].children[0].children[0].offsetHeight;
      if (this.fieldWrappers.toArray().length > 0) {
        this.fieldWrappers.toArray().forEach(fieldWrapper => {
          fieldWrapper.nativeElement.style.height = this.pdfDocHeight + 'px';
        });
      }
    }
  }

  getVerticalHeight() {
    if (window && document) {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
  }
  /*****************
   *   IMPORTANT   *
   *****************/
  // refactor this function
  async prepareEnvelope(params: any, sanitizer: DomSanitizer) {
    const envelopeId = params['id'];
    const roleName = params['roleName'];
    this.envelopeId = envelopeId;
    this.rName = roleName;
    this.sigService.setEnvId(envelopeId);
    this.sigService.setrName(roleName);
    this.envelopeService.getEnvelope(envelopeId).subscribe(async envelope => {
      this.pageService.setTitleAndRecord(`${envelope.name} - Review and Complete`, 'verdoc-review and complete')
      const recipientId = findIndex(envelope['recipients'], { 'envelope_id': envelopeId, role_name: roleName });
      this.totalPages = new Array(envelope['document']['page_numbers']);
      this.recipient = envelope['recipients'][recipientId];
      this.agreed = this.recipient['agreed'];
      if (this.recipient.type === 'preparer') {
        this.envelopeViewService.setMode('prepareview');
      } else {
        this.envelopeViewService.setMode('signerview');
      }
      this.getAttachments(envelope['fields']);
      this.envelopeViewService.recipientSubject.next(this.recipient);
      if (this.recipient.status === 'submitted') {
        this.sendToComplete('complete');
      };
      if (this.recipient.status === 'declined') {
        this.sendToComplete('declined');
      };
      this.envelope = envelope;

      if (this.envelope && this.envelope['status'] !== 'pending') {
        this.sendToComplete(this.envelope['status']);
      }

      this.checkClaim().then(() => {
        this.checkIfPreparerNeedsToDefineRecipients(this.envelope['recipients']);
      })

      this.message = this.recipient['message'];
      this.isDelegator = this.recipient['delegator'];
      const unSignedRecipients = filter(envelope['recipients'], recipient => {
        return recipient.status !== 'submitted';
      })
      for (const recipient of unSignedRecipients) {
        const fields = recipient['fields'];
        if (fields && fields.length > 0) {
          this.unorganizedFields = this.unorganizedFields.concat(fields);
        }
      }
      if (this.recipient.fields.length) {
        this.maxFields = this.recipient.fields.length;
        this.sigService.setTotal(this.maxFields);
      }

      this.envelopeService.getEnvelopePdfWithProgress(envelopeId, envelope['envelope_document_id']).subscribe(event => {
        if (event.type === HttpEventType.DownloadProgress) {
          this.pdfLoadingProgress = Math.round(event.loaded / event.total * 100);
          this.loadingProgress = this.pdfLoadingProgress / 2;
          if (this.pdfLoadingProgress >= 100) {
            this.pageDownloading = false;
          }
        }
        if (event instanceof HttpResponse) {
          const pdfUrl = URL.createObjectURL(event.body);
          this.envelopeViewService.pdfBlobSubject.next(event.body);
          this.envelopeViewService.pdfUrlSubject.next(pdfUrl);
          this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
        }
      });

      this.recipients = envelope['recipients'];
      this.sigService.setRecipient(this.recipient);

      this.recipientService.getRecipients(envelopeId).then(() => {
        this.recipientService.recipientsSubject.subscribe(async (recipients) => {
          const recipient = find(recipients, { role_name: this.recipient.role_name });
          if (recipient) {
            recipient['fields'] = this.recipient['fields']
            this.recipient = recipient;
            this.sigService.setRecipient(this.recipient);
          }
        });
      });
      this.fields = this.prepareFields(this.unorganizedFields);
    }, err => {
        if (err.code === 'E000011') {
          this.router.navigate([`/view/sign/${this.envelopeId}/role/${this.rName}/declined`]);
        };
      });
    this.envelopeService.setEnvData(envelopeId, roleName);
  }

  private checkIfPreparerNeedsToDefineRecipients(recipients) {
    let ifComplete = true;
    for (const recipient of recipients) {
      if (!recipient.email || !recipient.full_name) {
        ifComplete = false;
      }
    }
    if (this.mode === 'prepareview' && !ifComplete) {
      const prepareInviteDialog = this.dialog.open(PrepareInviteDialog, {
        panelClass: 'prepare-invite',
        disableClose: true
      });
      prepareInviteDialog.componentInstance.roles = recipients;
    }
  }

  async checkClaim() {
    if (this.recipient.claimed) {
      if (this.recipient.profile_id.startsWith('guest') && this.vTokenAuth.isAuthenticated()) {
        this.takeUserToDashboardWithMessage('This envelope is claimed as a guest and you need to be logged out to complete the envelope.')
      }

      if (!this.recipient.profile_id.startsWith('guest') && this.vTokenAuth.isAuthenticated()) {
        const profile = this.vTokenObjectService.getProfile();
        const allProfiles = await this.accountService.getAllProfiles();

        if (this.recipient.profile_id !== profile.id) {
          const isClaimedByOtherProfile = find(allProfiles, { id: this.recipient.profile_id });
          if (isClaimedByOtherProfile) {
            const switchDialog = this.dialog.open(SwitchProfileDialogComponent, {
              panelClass: 'switch-profile',
              disableClose: true
            });
            switchDialog.componentInstance.profileToSwitch = this.recipient.profile_id;
            switchDialog.afterClosed().subscribe(() => {
              return;
            });
          } else {
            this.takeUserToDashboardWithMessage('This envelope belongs to someone else.')
          }
        }
      }
    }
    return;
  }

  private takeUserToDashboardWithMessage(message: string) {
    this.snackBarService.open(message)
    this.router.navigate(['dashboard']);
  }

  getAttachments(fields) {
    for (let x = 0; x < fields.length; x++) {
      if (fields[x]['settings'] && fields[x]['settings']['name']) {
        const index = findIndex(this.attachments, { name: fields[x]['name'] });
        if (index < 0 && fields[x]['recipient_role'] !== this.rName) {
          this.attachments.push(fields[x]);
        }
      }
    }
    this.envelopeViewService.attachmentsSubject.next(this.attachments);
  }

  prepareFields(fieldsArray: any[]) {
    let extractedOptionFields = []
    for (let i = 0; i < fieldsArray.length; i++) {
      const extractedOptionField = this.extractOptions(fieldsArray[i], i);
      if (extractedOptionField instanceof Array) {
        extractedOptionFields = extractedOptionFields.concat(extractedOptionField)
      } else {
        extractedOptionFields.push(extractedOptionField);
      }
    }
    return this.organizeFields(extractedOptionFields);
  }

  organizeFields(fieldsArr: any[]) {
    const tempFields: any[] = [];
    if (!this.fieldOrganizingInProgress) {
      this.fieldOrganizingInProgress = true;
      for (let i = 0; i < fieldsArr.length; i++) {
        const pageIndex: number = fieldsArr[i]['page'];
        if (tempFields[pageIndex] == null) {
          tempFields[pageIndex] = new Array();
        }
        tempFields[pageIndex].push(fieldsArr[i]);
      }
      this.fieldOrganizingInProgress = false;
      return this.sortFields(tempFields);
    }
  }

  extractOptions(field, i) {
    const fields = [];
    let setting = 'setting';
    if (!field[setting]) {
      setting = 'settings';
    }
    if (field && field[setting] && field[setting].options && field[setting].options.length > 0 &&
      (field.type === 'checkbox_group' || field.type === 'radio_button_group')) {
      for (const option of field[setting].options) {
        const fieldSetting = { ...field[setting] };
        fieldSetting['x'] = option.x;
        fieldSetting['y'] = option.y;
        fieldSetting['width'] = 0;
        fieldSetting['height'] = 0;
        if (field['type'] === 'checkbox_group') {
          fieldSetting['checked'] = option.checked;
        } else {
          fieldSetting['selected'] = option.selected;
        }
        const fieldCopy = {};
        fieldCopy['name'] = field['name'];
        fieldCopy['page'] = field['page'] || field['page_sequence'];
        fieldCopy['type'] = field['type'];
        fieldCopy['recipient_role'] = field['recipient_role'];
        fieldCopy['required'] = field['required'];
        fieldCopy['prepared'] = field['prepared'];
        fieldCopy['originalIndex'] = i;
        fieldCopy['optionId'] = option.id;
        fieldCopy[setting] = fieldSetting;
        fields.push(fieldCopy);
      }
      return fields;
    } else {
      return field;
    }
  }

  sortFields(arr) {
    for (let i = 0; i < arr.length; i++) {
      let previousDistance = null;
      if (arr[i] != null && arr[i].length > 1) {
        arr[i].sort((a, b) => {
          let setting = 'settings';
          const distance = this.canBeSameRow(a, b).distance;
          const higherHeight = this.canBeSameRow(a, b).higherHeight;
          if (!a[setting]) {
            setting = 'setting';
          }
          const ax = a[setting].x, bx = b[setting].x, ay = a[setting].y, by = b[setting].y;
          if (distance >= -3 && distance <= higherHeight) {
            previousDistance = previousDistance === null ? distance : distance < previousDistance ? distance : previousDistance;
            if (ax < bx) {
              return -1;
            } else if (ax > bx) {
              return 1
            } else if (previousDistance >= distance) {
              return -1;
            } else if (previousDistance <= distance) {
              return 1
            } return 0;
          }
          if (ay < by) {
            return 1;
          }
          if (ay > by) {
            return -1;
          }
        });
      }
    }
    return arr;
  }

  canBeSameRow(a, b) {
    let setting = 'setting';
    if (!a[setting]) {
      setting = 'settings';
    }
    const aHeight = this.getHeight(a);
    const bHeight = this.getHeight(b);
    const aBottom = a[setting].y;
    const bBottom = b[setting].y;
    let top;
    let higherBottom;
    let higherHeight;
    if (aBottom < bBottom) {
      top = aHeight + aBottom;
      higherBottom = bBottom;
      higherHeight = bHeight;
    } else {
      top = bHeight + bBottom;
      higherBottom = aBottom;
      higherHeight = aHeight;
    }
    const distance = top - higherBottom;
    return { distance, higherHeight };
  }

  getHeight(field) {
    let setting = 'setting';
    if (!field[setting]) {
      setting = 'settings';
    }
    let height = 0;
    switch (field.type) {
      case 'signature':
      case 'initial':
        height = 36;
        break;
      case 'checkbox':
        height = 13.5;
        break;
      case 'attachment':
      case 'payment':
        height = 24;
        break;
      default:
        height = field[setting]['height'] || 0;
        break;
    }
    return height;
  }

  toggleMsg() {
    this.msgOpen = !this.msgOpen;
  }

  sendToComplete(status): void {
    if (window && this.redirectReq) {
      let redirectUrl = this.redirectReq + '?realAppStatus=' + status;
      if (!!this.reqData) {
        redirectUrl += `&data=${this.reqData}`;
      }
      if (!!this.reqQuery) {
        redirectUrl += `&${this.reqQuery}`;
      }
      window.location.href = redirectUrl;
    } else {
      this.router.navigate([`/view/sign/${this.envelopeId}/role/${this.rName}/`, status]);
    }
  }
}


// Create a component for decline envelope
// have envelopeId and role name as input
