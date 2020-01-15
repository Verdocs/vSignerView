import {
  Component,
  ElementRef,
  Inject,
  ViewChild,
  ViewChildren,
  QueryList,
  OnInit,
  OnDestroy,
  Compiler,
  AfterViewChecked,
  ChangeDetectorRef,
  PLATFORM_ID
} from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { isPlatformBrowser, isPlatformServer } from '@angular/common';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { FormGroup, Validators, FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { findIndex } from 'lodash';
import { Subscription } from 'rxjs';
import { VerdocsStateService, VerdocsTokenObjectService } from '@verdocs/tokens';
import { readFile } from 'fs';

import { HeaderService } from '../services/header.service';
import { RouterService } from '../services/router.service';
import { TemplatesService } from '../services/templates.service';
import { BuilderDataService } from '../services/builder-data.service';
import { EnvelopeService } from '../services/envelope.service';
import { EnvelopeViewService } from '../services/envelope-view.service';
import { PageService } from '../services/page.service';
import { CreateEnvelopeService, FixedDialogRef } from '../modules/shared/components/create-envelope';
import { Broadcast } from '../services/broadcast';
import { getRGBA, getRGB } from '../functions/rgb';
import { blobToBase64 } from '../functions/conversion';
import { printPdfUrl } from '../functions/utils';

import { EnvelopeInviteComponent } from '../modules/shared/dialogs/envelope-invite/envelope-invite.component';
import { EmailValidator } from '../validators/email.validator';

@Component({
  selector: 'app-live-view',
  templateUrl: 'live-view.component.html',
  styleUrls: ['live-view.component.scss']
})

export class LiveViewComponent implements OnInit, OnDestroy, AfterViewChecked {
  private templateId: string;
  private templateToken: string;
  public currentProfile: any = null;
  public roles: any[] = [];
  public roleFormGroup: FormGroup;
  public pdfUrl: any;
  public totalPages: any[];
  public fields: any[];
  public pageRendered: number[] = [];
  public pdfDocHeight: number;
  public pdfPages = [];
  public loading = true;
  public templatePdfProgress = 0;
  public actionLabel = 'Get Started';
  public templateName = '';
  public editRole: string = null;
  public editRoleName: string = null;
  public roleColor: string = null;
  public selectedRole: string = null;
  public templateOwnerInfo: any = null;
  public isTemplateOwner = false;
  public _canSend: boolean = null;
  public mode: 'liveview' | 'preview' = 'liveview';
  public hasCreateDialog = false;
  public isBrowser = false;

  //Rangular settings
  public overrideLauncherRight = 20;
  public overrideLauncherTop = 56;
  public overrideProfileRight = 20;
  public overrideProfileTop = 56;

  @ViewChild('pdfBody', { static: false }) pdfBody: ElementRef;
  @ViewChild('pdfDoc', { static: false }) pdfDoc: ElementRef;
  @ViewChildren('fieldWrappers') fieldWrappers: QueryList<any>

  private fromPage: string = null;
  private template: any = null;
  private _routeDataSubscription = new Subscription();
  private _createEnvelopeDialog: FixedDialogRef;
  private _allDialogsClosedSubscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private vTokenObjectService: VerdocsTokenObjectService,
    private envService: EnvelopeService,
    private headerService: HeaderService,
    private templateService: TemplatesService,
    private builderDataService: BuilderDataService,
    private envelopeViewService: EnvelopeViewService,
    private vTokenStateService: VerdocsStateService,
    private createEnvelope: CreateEnvelopeService,
    private routerService: RouterService,
    private sanitizer: DomSanitizer,
    private compiler: Compiler,
    private cdr: ChangeDetectorRef,
    private fb: FormBuilder,
    private broadcast: Broadcast,
    private pageService: PageService,
    @Inject(PLATFORM_ID) private platform
  ) { }

  ngOnInit() {
    this.createEnvelope.collapseAll();
    this._allDialogsClosedSubscription = this.createEnvelope.allDialogsClosed.subscribe(value => {
      if (value) {
        this.hasCreateDialog = false;
      } else {
        this.hasCreateDialog = true;
      }
    })
    this.fromPage = this.routerService.getPreviousUrl();
    if (!!this.fromPage || this.fromPage != undefined) {
      this.vTokenStateService.storeOtherCookie('rF-live', this.fromPage);
    }
    this.currentProfile = this.vTokenObjectService.getProfile();
    this._routeDataSubscription = this.route.data.subscribe(async data => {
      if (data) {
        if (data.template) {
          this.mode = 'preview';
          this.template = data.template;
          this.pageService.setTitleAndRecord(`${this.template.name} - Preview`, 'document-preview');
          this.loading = false;
          this.envelopeViewService.setMode(this.mode);
          this.headerService.modeSubject.next(this.mode);
          this.builderDataService.updateLocalTemplate(this.template);
          this.resetTemplateName();
          this.templateId = this.template.id;
          const thumbnail = await this.templateService.getTemplateThumbnail(this.templateId, this.template.template_documents[0].id);
          const base64Image: string = await this.blobToBasee64(thumbnail);
          this.pageService.setDescriptionMeta(this.template['description']);
          this.pageService.setCanonicalUrl({ rel: 'canonical' });
          this.updateMetaTags(this.template, base64Image);
          const templateDoc = await this.builderDataService.getTemplateDocument(this.templateId);
          const templateDocumentPdf = await this.builderDataService.getTemplateDocumentFile(this.templateId, templateDoc);
          this.templateOwnerInfo = await this.templateService.getTemplateOwnerInfo(this.template.id);
          this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(templateDocumentPdf);

          // this.sender_name = this.templateOwnerInfo['name'];
          this.prepareRoles(this.template)
          this.buildRoleFormGroup();
          this.totalPages = new Array(this.template['pages'].length);
          this.prepareFields();
          this.openCreateEnvelopDialog();
        }
      }
    });
    this.route.params.subscribe(params => {
      if (!!params && params['templateId']) {
        this.templateId = params['templateId'];
        this.mode = 'liveview'
        this.envelopeViewService.setMode(this.mode);
        this.envService.getTemplatePDF(params['templateId'], params['token']).subscribe(event => {
          if (event.type === HttpEventType.DownloadProgress) {
            this.templatePdfProgress = Math.round(event.loaded / event.total * 100);
            if (this.templatePdfProgress >= 100) {
              this.loading = false;
            }
          }
          if (event instanceof HttpResponse) {
            const pdfUrl = URL.createObjectURL(event.body);
            this.pdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(pdfUrl);
          }
        });

        this.envService.getTemplateDoc(params['templateId'], params['token'], false).subscribe(async (template) => {
          this.template = template;
          this.pageService.setTitleAndRecord(`${this.template.template_name} - Create`, 'document-create');
          this.resetTemplateName();
          this.templateOwnerInfo = template['owner_info'];

          // this.sender_name = this.templateOwnerInfo['name'];
          this.prepareRoles(template);
          const templateDoc = await this.builderDataService.getTemplateDocument(params['templateId']);
          this.template['template_documents'] = [templateDoc];
          this.buildRoleFormGroup();
          this.totalPages = new Array(template['total_pages']);
          this.templateId = params['templateId'];
          this.templateToken = params['token'];
          const thumbnail = await this.templateService.getTemplateThumbnail(this.templateId, templateDoc.id);
          const base64Image: string = await this.blobToBasee64(thumbnail);
          this.pageService.setDescriptionMeta(this.template['description']);
          this.pageService.setCanonicalUrl({ rel: 'canonical' });
          this.updateMetaTags(this.template, base64Image);
          this.prepareFields();
          this.openCreateEnvelopDialog(this.template);
        });
      }
    });
    this.isBrowser = isPlatformBrowser(this.platform);
    this.onResize();
  }

  ngAfterViewChecked() {
    if (this.pdfPages && this.totalPages && this.pdfPages.length === this.totalPages.length) {
      this.broadcast.broadcast('pdfUpdate', true);
    }
    this.onResize();
    this.cdr.detectChanges();
  }

  ngOnDestroy() {
    this._routeDataSubscription.unsubscribe();
    this.compiler.clearCache();
  }

  onResize() {
    if (window && document) {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    }
  }

  updateMetaTags(template, image) {
    const title = 'Verdocs - ' + template.name;
    const description = this.template['description'] || 'Sign up for free and start transitioning your business to a full digital ecosystem.';
    this.pageService.setOpenGraphMeta('website', title, description, image, null)
  }

  resetTemplateName() {
    this.templateName = this.template['template_name'] || this.template['name'];
  }

  openCreateEnvelopDialog(manual?: boolean) {
    if (this.mode === 'liveview' && this.hasCreateDialog) {
      return;
    } else {
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
        maxHeight: '80vh'
      });
      this.createEnvelope.updateAllPositions(this.createEnvelope.openDialogs);
      this._createEnvelopeDialog._containerInstance.template = this.template;
      this._createEnvelopeDialog._containerInstance._templateSource = this.mode;
      this._createEnvelopeDialog._containerInstance.templateOwnerInfo = this.templateOwnerInfo;
      this._createEnvelopeDialog._containerInstance.isTemplateOwner = this.isTemplateOwner;
      this._createEnvelopeDialog._containerInstance.templateId = this.templateId;
      this._createEnvelopeDialog._containerInstance.templateToken = this.templateToken;
      this._createEnvelopeDialog._containerInstance.currentProfile = this.currentProfile;
      this._createEnvelopeDialog._containerInstance.initializeData();
      if (manual) {
        const timer = setTimeout(() => {
          this._createEnvelopeDialog.expand();
          clearTimeout(timer);
        }, 250);
      }
      this._createEnvelopeDialog.afterClosed().subscribe(() => {
        this.updateHasCreateDialog();
        this.createEnvelope.updateAllPositions(this.createEnvelope.openDialogs);
      })
      this.updateHasCreateDialog();
    }
  }

  updateHasCreateDialog(): void {
    if (this.createEnvelope.openDialogs.length > 0) {
      this.hasCreateDialog = true;
    } else {
      this.hasCreateDialog = false;
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

  prepareFields() {
    let fields = [];
    const _fields = [];
    for (let x = 0; x < this.roles.length; x++) {
      this.roles[x]['fields'] = this.sortFields(this.roles[x]['fields']);
      for (const field of this.roles[x]['fields']) {
        field['rgba'] = getRGBA(x);
      }
      fields = fields.concat(this.roles[x]['fields']);
    }

    for (const field of fields) {
      field.recipient_role = field.role_name;
      _fields.push({
        name: field.name,
        value: ''
      });
    }
    this.fields = this.organizeFields(fields);
  }

  buildRoleFormGroup() {
    const roleFormGroup: any = {}
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
        sequence: [roleCopy.sequence],
        delegator: [roleCopy.delegator ? true : false],
        message: [roleCopy.message ? roleCopy.message : '']
      });
    });
    this.roleFormGroup = new FormGroup(roleFormGroup);
  }

  editRecipient(readOnly, role_name, role_color) {
    if (!readOnly) {
      this.editRole = role_name;
      this.editRoleName = role_name;
      this.roleColor = role_color;
    }
  }

  numTracking(index, item) {
    return index;
  }

  sequenceTracking(index, item) {
    return index;
  }

  roleTracking(index, item) {
    return index;
  }

  roleInviteTracking(index, item) {
    return index;
  }

  getRGB(index) {
    return getRGB(getRGBA(index));
  }

  shouldAlternateSize(rotation) {
    if (rotation === 0 || rotation % 180 === 0) {
      return false;
    } else {
      return true;
    }
  }

  onScaleChange(event) {

  }

  tooltipText(role) {
    let label = role['name'];
    if (role['email']) {
      label = `${role['full_name']}\n\r${role['email']}`;
    }
    if (role['full_name'] && !role['email']) {
      label = role['full_name'];
    }
    if (this.roleFormGroup && this.roleFormGroup.controls[role.name]) {
      const newRole = this.roleFormGroup.controls[role.name].value;
      if (newRole.email && newRole.full_name) {
        label = `${newRole.full_name}\n\r${newRole.email}`;
      }
    }
    return label;
  }

  onPageRendered(event) {
    if (this.pageRendered.indexOf(event.detail.pageNumber) === -1) {
      this.pageRendered.push(event.detail.pageNumber);
    }
    const index = event.detail.pageNumber - 1;
    const pdfPagesDOM = this.pdfDoc['pdfContainer']['nativeElement'].children[0].children;
    const height = pdfPagesDOM[index].offsetHeight;
    const width = pdfPagesDOM[index].offsetWidth;
    const originalHeight = this.shouldAlternateSize(event.detail.viewport.rotation) ? event.detail.viewport.viewBox[2] - event.detail.viewport.viewBox[0] : event.detail.viewport.viewBox[3] - event.detail.viewport.viewBox[1];
    const originalWidth = this.shouldAlternateSize(event.detail.viewport.rotation) ? event.detail.viewport.viewBox[3] - event.detail.viewport.viewBox[1] : event.detail.viewport.viewBox[2] - event.detail.viewport.viewBox[0];
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
    if (this.pdfPages && this.totalPages && this.pdfPages.length === this.totalPages.length) {
      this.pdfPages = this.pdfPages.sort((a, b) => a.pageNumber - b.pageNumber);
      this.broadcast.broadcast('pdfUpdate', true);
      const autoStartTimer = setTimeout(() => {
        this.openInviteDialog();
        clearTimeout(autoStartTimer);
      }, 350);
    }
    this.fixHeight();
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

  getWrapperStyling(i) {
    if (this.pdfPages && this.pdfPages.length > 0 && this.pdfPages[i]) {
      return {
        margin: '10px auto 0',
        height: this.pdfPages[i].height + 'px',
        width: this.pdfPages[i].width + 'px'
      }
    }
  }

  selectRole(role_name, event) {
    if (event && event.target && !event.target.className.includes('__recipient')) {
      this.selectedRole = null;
      return;
    }
    this.selectedRole = role_name;
  }

  roleInitial(role) {
    if (role) {
      if (role.full_name) {
        const nameArray = role.full_name.split(' ');
        return nameArray.length > 1 ? nameArray[0].charAt(0) + nameArray[nameArray.length - 1].charAt(0) : nameArray[0].charAt(0);
      } else if (this.roleFormGroup && this.roleFormGroup.controls[role.name] && this.roleFormGroup.controls[role.name]['controls']['full_name'].value) {
        const nameArray = this.roleFormGroup.controls[role.name]['controls']['full_name'].value.split(' ');
        return nameArray.length > 1 ? nameArray[0].charAt(0) + nameArray[nameArray.length - 1].charAt(0) : nameArray[0].charAt(0);
      }
      const nameArray = role.name.split(' ');
      return nameArray.length > 1 ? nameArray[0].charAt(0) + nameArray[nameArray.length - 1].charAt(0) : nameArray[0].charAt(0);
    }
  }

  organizeFields(fields: any[]) {
    const tempFields: any[] = [];
    for (let i = 0; i < fields.length; i++) {
      const pageIndex: number = fields[i]['page'] || fields[i]['page_sequence'];
      if (tempFields[pageIndex] == null) {
        tempFields[pageIndex] = [];
      }
    }
    for (let i = 0; i < fields.length; i++) {
      const pageIndex: number = fields[i]['page'] || fields[i]['page_sequence'];
      const constructedFields = this.buildFields(fields[i], i);
      if (constructedFields instanceof Array) {
        tempFields[pageIndex] = tempFields[pageIndex].concat(constructedFields)
      } else {
        tempFields[pageIndex].push(constructedFields)
      }
    }
    return this.sortFields(tempFields);
  }

  buildFields(field, i) {
    let fields = [];
    let setting = 'setting';
    if (!field[setting]) {
      setting = 'settings';
    }
    if (field && field[setting] && field[setting].options && field[setting].options.length > 0 &&
      (field.type === 'checkbox_group' || field.type === 'radio_button_group')) {
      for (const option of field[setting].options) {
        const fieldCopy = { setting: {} };
        fieldCopy[setting]['x'] = option.x;
        fieldCopy[setting]['y'] = option.y;
        fieldCopy['page_sequence'] = field['page_sequence'];
        fieldCopy['type'] = field['type'];
        fieldCopy['rgba'] = field['rgba'];
        fieldCopy['name'] = field['name'];
        fieldCopy['role_name'] = field['role_name'] || field['recipient_name'];
        fieldCopy['required'] = field['required'];
        if (field['type'] === 'checkbox_group') {
          fieldCopy['setting']['checked'] = option.checked;
        } else {
          fieldCopy['setting']['selected'] = option.selected;
        }
        fieldCopy['originalIndex'] = i;
        fieldCopy['optionId'] = option.id;
        fields.push(fieldCopy);
      }
      return fields;
    } else {
      return field;
    }
  }

  sortFields(fields) {
    for (let i = 0; i < fields.length; i++) {
      if (fields[i] != null && fields[i].length > 1) {
        fields[i].sort((a, b) => {
          let setting = 'settings';
          if (!a[setting]) {
            setting = 'setting';
          }
          if (a[setting].y === b[setting].y || this.canBeSameRow(a, b)) {
            const ax = a[setting].x, bx = b[setting].x;
            return ax < bx ? -1 : ax > bx ? 1 : 0;
          }
          return b[setting].y - a[setting].y
        })
      }
    }
    return fields;
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
    let baseHeight;
    if (aBottom < bBottom) {
      baseHeight = aHeight;
    } else {
      baseHeight = bHeight;
    }
    const fillerHeight = Math.abs(aBottom - bBottom);
    return fillerHeight < baseHeight;
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

  openInviteDialog() {
    this._createEnvelopeDialog.expand();
  }

  printPdf(printSectionId) {
    const pdfUrl = this.pdfUrl.changingThisBreaksApplicationSecurity || this.pdfUrl;
    printPdfUrl(pdfUrl)
  }

  continue() {
    const inviteDialog = this.dialog.open(EnvelopeInviteComponent, {
      panelClass: ['fullscreen', 'form-dialog'],
      disableClose: false
    });
    inviteDialog.componentInstance.template = {
      id: this.templateId,
      roles: this.roles
    }
    inviteDialog.componentInstance.headerTitle = 'Recipient Information';
    inviteDialog.componentInstance.isLiveView = true;
    inviteDialog.componentInstance.templateToken = this.templateToken;
  }

  returnToPreviousPage() {
    let fromPage;
    const urlSegment = this.vTokenStateService.getOtherCookie('rF-live');
    if (urlSegment) {
      fromPage = decodeURIComponent(urlSegment as string);
      if (fromPage.charAt(0) === '/') {
        fromPage = fromPage.slice(1);
      }
    }
    if (fromPage == undefined || fromPage == null) {
      fromPage = 'dashboard';
    }
    if (fromPage.includes('view/sign') || fromPage.includes('view/live') || fromPage.includes('review')) {
      fromPage = 'dashboard';
    }
    this.vTokenStateService.removeRCookie('rF-live');
    const navigateTimer = setTimeout(() => {
      this.router.navigateByUrl(fromPage);
      clearTimeout(navigateTimer);
    }, 300)
  }

  canSendEnvelope() {
    if (this.mode === 'liveview') {
      this._canSend = true
    } else if (typeof (this._canSend) !== 'boolean' && this.templateService) {
      this._canSend = this.templateService.canSendEnvelope(this.template);
    }
    return this._canSend;
  }

  fileReaderPromise(image: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      readFile(URL.createObjectURL(image), (err, data) => {
        if (err) {
          return reject(err);
        }
        return resolve(data.toString('base64'));
      })
    });
  }

  async blobToBasee64(image: Blob): Promise<string> {
    if (isPlatformBrowser(this.platform)) {
      const data: string = await blobToBase64(image) as string;
      return data;
    } else if (isPlatformServer(this.platform)) {
      const data = await this.fileReaderPromise(image);
      return data;
    }
  }
}
