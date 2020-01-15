import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  ViewChildren,
  QueryList,
  AfterViewInit,
  OnInit,
  SimpleChanges,
  OnChanges,
  OnDestroy,
  ChangeDetectorRef,
  Inject
} from '@angular/core';
import { DOCUMENT } from "@angular/common";
import { FormGroup } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import * as moment from 'moment';

import { find } from 'lodash';

import { EnvelopeService } from 'app/core/services/envelope.service';
import { EnvelopeViewService } from 'app/core/services/envelope-view.service';
import { SignatureService } from 'app/core/services/envelope-signature.service';
import { ValidatorService } from 'app/core/services/validator.service';
import { RequiredFieldsService } from 'app/core/services/required-fields.service';
import { EnvelopeFieldsService } from 'app/core/services/envelope-fields.service';
import { Broadcast } from 'app/core/services/broadcast';

@Component({
  selector: 'envelope-fields-lite',
  templateUrl: 'envelope-fields-lite.component.html',
  styleUrls: ['envelope-fields-lite.component.scss']
})

export class EnvelopeFieldsLite implements AfterViewInit, OnInit, OnChanges, OnDestroy {
  @Input()
  fields: any[];
  @Input()
  pageNum: number;
  @Input()
  public roleName: string;
  @Input()
  public id: string; // rename id to envelopeId
  @Input()
  recipients;
  @Input()
  selectedRoleName: string;

  @Input()
  pdfPages = [];
  @ViewChild('itemContainer', { static: false }) items: ElementRef;
  @ViewChild('error', { static: false }) error: ElementRef;
  @ViewChild('textCalculator', { static: false }) textCalculator: ElementRef;
  @ViewChildren('itemWrapper') itemWrapper: QueryList<ElementRef>;

  public _fields: any[] = [];
  public envelopeFieldsFormGroup: FormGroup;
  public signatureFile: any = null;
  public initialFile: any = null;
  public today: string;
  public focusOrderNumber = -1;
  public focusFieldName: string = '';
  public timer: any;
  public preparedMessage = '';
  public activeElement = null;
  public showError = {
    pageNum: -1,
    fieldIndex: -1,
    type: null
  }
  public dialogOpened = false;
  public closeAllErrors = false;
  public fieldsMap: any = {};
  public mode: string;

  private initialId: string;
  private signatureId: string;

  private signedFieldsSubscription = new Subscription();
  private initialImageSubscription = new Subscription();
  private fieldsSubscription = new Subscription();
  private initialIdSubscription = new Subscription();
  private signatureIdSubscription = new Subscription();
  private signatureImageSubscription = new Subscription();
  private viewModeSubscription = new Subscription();
  private roleNameSubcription = new Subscription();
  private jumpCoordinateSubscription = new Subscription();
  private validators;
  private requiredFields: any[] = [];

  constructor(
    private envelopeViewService: EnvelopeViewService,
    private envelopeService: EnvelopeService,
    private envelopeFieldsService: EnvelopeFieldsService,
    private signatureService: SignatureService,
    private validatorService: ValidatorService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private requiredFieldsSerivce: RequiredFieldsService,
    private broadcast: Broadcast,
    @Inject(DOCUMENT) private document: any
  ) { }

  ngOnInit() {
    this.signedFieldsSubscription = this.signatureService._signedFields.subscribe(result => {
      this.signatureFile = this.sanitizer.bypassSecurityTrustResourceUrl(this.signatureService.getSignImg()) || null;
      this.initialFile = this.sanitizer.bypassSecurityTrustResourceUrl(this.signatureService.getInitialImg()) || null;
    });

    this.initialImageSubscription = this.signatureService.initialImgSubject.subscribe(blobUrl => {
      this.initialFile = this.sanitizer.bypassSecurityTrustResourceUrl(this.signatureService.getInitialImg()) || null;
    });
    this.envelopeFieldsService.fieldsSubject.subscribe(result => {
      if (result.for === this.pageNum) {
        this._fields = new Array(this.fields.length);
        this._fields[this.pageNum] = result._fields;
      }
    });
    this.envelopeFieldsService.fieldsMapSubject.subscribe(result => {
      if (result.for === this.pageNum) {
        this.fieldsMap = result.fieldsMap;
      }
    });
    this.envelopeFieldsService.envelopeFieldsFormGroupSubject.subscribe(result => {
      if (result.for === this.pageNum) {
        this.envelopeFieldsFormGroup = result.envelopeFieldsFormGroup;
        this.requiredFieldsSerivce.formGroupFields = this.envelopeFieldsFormGroup;
        const incompleteFields = this.requiredFields.filter(requiredField => !this.requiredFieldsSerivce.checkRequiredFieldCompleteStatus(requiredField, this.envelopeFieldsFormGroup.controls[requiredField.key], this.mode));
        this.requiredFieldsSerivce.setRequiredFields(incompleteFields, this.validatorService);
      }
    });

    this.initialIdSubscription = this.signatureService.initialIdSubject.subscribe(id => {
      this.initialId = id;
    });

    this.signatureIdSubscription = this.signatureService.signatureIdSubject.subscribe(id => {
      this.signatureId = id;
    });

    this.signatureImageSubscription = this.signatureService.signImgSubject.subscribe(blobUrl => {
      this.signatureFile = this.sanitizer.bypassSecurityTrustResourceUrl(this.signatureService.getSignImg()) || null;
    })

    this.viewModeSubscription = this.envelopeViewService.viewModeSubject.subscribe(mode => {
      this.mode = mode;
    });

    this.roleNameSubcription = this.signatureService._rName.subscribe(role => {
      this.roleName = role;
    });

    if (this.recipients && this.recipients.length > 0) {
      const preparer = find(this.recipients, { type: 'preparer' });
      if (preparer) {
        this.preparedMessage = `Prepared by ${preparer['full_name']}`;
      }
    }
    this.buildFields();
    this.onResize();

    this.broadcast.on('pdfUpdate').subscribe(data => {
      if (data === true) {
        this.updateWrapperStyles();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ('pdfPages' in changes) {
      this.updateWrapperStyles();
    }
  }

  ngOnDestroy() {
    this.signedFieldsSubscription.unsubscribe();
    this.initialImageSubscription.unsubscribe();
    this.fieldsSubscription.unsubscribe();
    this.initialIdSubscription.unsubscribe();
    this.signatureIdSubscription.unsubscribe();
    this.signatureImageSubscription.unsubscribe();
    this.viewModeSubscription.unsubscribe();
    this.roleNameSubcription.unsubscribe();
    this.jumpCoordinateSubscription.unsubscribe();
  }

  fieldTracking(index, item) {
    return item.key, index;
  }

  optionTracking(index, item) {
    return item.key, index;
  }

  focusElement(coordinate) {
    if (coordinate.pageNum && this.focusOrderNumber === -1) {
      this.focusOrderNumber = this._fields[coordinate.pageNum][coordinate.fieldIndex].order;
      this.envelopeViewService.fieldTypeSubject.next(this._fields[coordinate.pageNum][coordinate.fieldIndex].controlType);
      if (this.itemWrapper) {
        const targetElement = this.itemWrapper.find((element) => {
          return element.nativeElement.attributes['data-page'].value === coordinate.pageNum.toString() &&
            element.nativeElement.attributes['data-index'].value === coordinate.fieldIndex.toString();
        });
        if (targetElement && targetElement.nativeElement.children &&
          targetElement.nativeElement.children[0] && !!targetElement.nativeElement.children[0].children[0]) {
          targetElement.nativeElement.children[0].children[0].focus();
        };
      } else {
        this.focusElement(coordinate);
      }
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { this.focusOrderNumber = -1 }, 1600);
    }
  }

  focusElementById(id) {
    const fieldElement = this.document.getElementById(id);
    if (fieldElement) {
      fieldElement.focus();
    }
  }

  ngAfterViewInit() {
    this.today = moment(new Date()).format('MM/DD/YYYY');
    this.updateWrapperStyles();
    this.cdr.detectChanges();
  }

  rescale(r, n): number {
    return r * n;
  }

  onResize() {
    this.updateWrapperStyles();
  }

  updateWrapperStyles() {
    if (this.itemWrapper && this.fields) {
      this.itemWrapper.forEach(itemWrapper => {
        const pageNum = itemWrapper.nativeElement.getAttribute('data-page');
        const j = itemWrapper.nativeElement.getAttribute('data-index');
        if (this.fields[pageNum]) {
          const style = this.getElementStyle(this.fields[pageNum][j]);
          itemWrapper.nativeElement.style.bottom = style.bottom;
          itemWrapper.nativeElement.style.left = style.left;
          itemWrapper.nativeElement.style.height = style.height;
          itemWrapper.nativeElement.style.width = style.width;
          itemWrapper.nativeElement.style.backgroundColor = style.background;
          itemWrapper.nativeElement.style.transform = `scale(${this.pdfPages[pageNum - 1].xRatio},${this.pdfPages[pageNum - 1].yRatio})`;
        }
      });
    }
  }

  async buildFields() {
    let fieldValidators = this.validators;
    if (!this.validators) {
      fieldValidators = await this.validatorService.getValidatorsObject();
    }
    this.envelopeFieldsService.buildFieldsWithWorker(this.fields[this.pageNum], this.pageNum, this.mode, this.roleName, fieldValidators);
  }

  isCheckboxWithMaximum(field) {
    return field.controlType === 'checkbox_group' && field.max_checked > 0;
  }

  getElementStyle(field) {
    let pageIndex = -1;
    if (field.page) {
      pageIndex = field.page - 1;
    } else {
      pageIndex = field.page_sequence - 1;
    }
    if (this.pdfPages && this.pdfPages[pageIndex]) {
      let role;
      switch (this.mode) {
        case 'signerview':
        case 'prepareview':
          role = 'recipient_role';
          break;
        case 'liveview':
          role = 'role_name';
          break;
        default:
          role = 'recipient_role';
          break;
      }
      let setting = 'setting'
      if (!!field['settings']) {
        setting = 'settings'
      };
      const envItemStyle = {
        'bottom': `${this.rescale(this.pdfPages[pageIndex].yRatio, field[setting].y)}px`,
        'left': `${this.rescale(this.pdfPages[pageIndex].xRatio, field[setting].x)}px`,
        'height': `${field[setting].height}px`,
        'width': `${field[setting].width}px`,
        'background': field['rgba'] || this.envelopeService.getRecipientColor(field[role])
      };
      return envItemStyle;
    }
  }

  isTextarea(field) {
    let setting = 'setting';
    if (field) {
      if (!!field['settings']) {
        setting = 'settings'
      };
      return !!field[setting].leading && field[setting].leading > 0;
    }
    return false;
  }

  isSingleLineText(field) {
    return !this.isTextarea(field) && field['type'] === 'textbox';
  }

  getFieldWidth(field) {
    let setting = 'setting';
    if (field && !!field['settings']) {
      setting = 'settings'
    };
    if (field['type'] === 'textbox') {
      return this.rescale(field[setting]['width'], 1);
    }
    return null;
  }

  checkTextArea(pageNum, inputId, element) {
    if (this.isTextarea(this.fields[pageNum][inputId])) {
      const formControlName = this._fields[pageNum][inputId]['key'];
      if (element && element.scrollHeight > element.offsetHeight) {
        this.envelopeFieldsFormGroup.controls[formControlName].setErrors({ 'maxlength': true });
        return false;
      }
      return true;
    }
  }

  findKeysofSameGroup(options, fieldName) {
    let keys = [];
    options.forEach(option => {
      keys.push(fieldName + '-' + option.id);
    });
    return keys;
  }

  prepareOptionBody(options, field, optionId, value) {
    let body = [];
    options.forEach(option => {
      const key = field.name + '-' + option.id;
      const pageNum = this.fieldsMap[key].field_pageNum;
      const fieldIndex = this.fieldsMap[key].field_field_index;
      if (option.id === optionId) {
        if (field.type === 'checkbox_group') {
          body.push({
            id: option.id,
            checked: value
          });
        } else {
          body.push({
            id: option.id,
            selected: value
          });
        }
      } else {
        if (field.type === 'checkbox_group') {
          body.push({
            id: option.id,
            checked: this._fields[pageNum][fieldIndex].value ? true : false
          });
        } else {
          body.push({
            id: option.id,
            selected: false
          });
        }
      }
    });
    return body;
  }

  canMakeChanges(pageNum: number, inputId: number) {
    return (this.mode !== 'prepareview' && !this._fields[pageNum][inputId].prepared && this._fields[pageNum][inputId]['recipientRole'] === this.roleName) ||
      (this.mode === 'prepareview');
  }

  // This logic is not robust. Option id can be any unique string.
  getOptionIdFromKey(key: string) {
    return this.fieldsMap[key].option_id;
  }

  getFieldNameFromKey(key: string) {
    return this.fieldsMap[key].field_name;
  }

  isFocused(pageNum, index) {
    return this.focusOrderNumber === this._fields[pageNum][index].order || this.focusFieldName === this._fields[pageNum][index].field_name;
  }

  isSigned(pNum, j): boolean {
    if (!!this.signatureService.getSignImg() && this.mode === 'signerview') {
      return this._fields[pNum][j].value === 'signed' && !!this.signatureId;
    } else if (this.mode !== 'signerview') {
      return this._fields[pNum][j].value === 'signed';
    }
    return false;
  }

  isInitialed(pNum, j): boolean {
    if (this.mode === 'signerview') {
      return this._fields[pNum][j].value === 'initialed' && !!this.initialId;
    } else {
      return this._fields[pNum][j].value === 'initialed'
    }
  }

  isMobile(): boolean {
    if (window) {
      return window.innerWidth <= 768 || window.innerHeight <= 500;
    }
  }

  toggleCounter(pageNum, fieldIndex, value) {
    this._fields[pageNum][fieldIndex].showCounter = value;
  }

  counterStatus(pageNum, fieldIndex) {
    if (this._fields && this.fields.length > 0 && this._fields[pageNum][fieldIndex]) {
      return this._fields[pageNum][fieldIndex].showCounter;
    }
    return false;
  }

  showClear(controlName) {
    return !this.envelopeFieldsFormGroup.controls[controlName]['errors'] &&
      !this.envelopeFieldsFormGroup.controls[controlName].invalid &&
      this.envelopeFieldsFormGroup.controls[controlName].value !== '' &&
      this.mode === 'signerview';
  }

  preventDefault(event) {
    event.preventDefault();
    return false;
  }

  getTabIndex(pageNum, fieldIndex) {
    const roleDoNotMatch = this._fields[pageNum][fieldIndex]['recipientRole'] !== this.roleName;
    const isInPepareMode = this.mode === 'prepareview';
    if (isInPepareMode) {
      return 1;
    } else if (roleDoNotMatch) {
      return -1;
    } else {
      return 1;
    }
  }
}
