import {
  Component,
  Input,
  Output,
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
  EventEmitter,
  Inject
} from '@angular/core';
import { DOCUMENT } from "@angular/common";
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import * as moment from 'moment';

import { find, findIndex } from 'lodash';

import { EnvelopeSignatureDialogComponent } from '../dialogs/signature/envelope-signature.dialog';
import { AttachmentsDialogComponent } from '../dialogs/attachments/attachments.dialog';
import { PaymentDialog } from '../dialogs/payments/payment.dialog';

import { DynamicField } from '../models/dynamic-field.model';

import { EnvelopeService } from '../services/envelope.service';
import { EnvelopeViewService } from '../services/envelope-view.service';
import { ErrorTooltipService } from '../services/errorTooltip.service';
import { SignatureService } from '../services/envelope-signature.service';
import { SnackbarService } from '../services/snackbar.service';
import { ValidatorService } from '../services/validator.service';
import { BrowserToiTextService } from '../services/browser-to-iText.service';
import { RequiredFieldsService } from '../services/required-fields.service';
import { Broadcast } from '../services/broadcast';
import { updateElementStyles } from '../functions/viewer-fields';

@Component({
  selector: 'envelope-field',
  templateUrl: 'envelope-field.component.html',
  styleUrls: ['envelope-field.component.scss'],
  providers: [
    BrowserToiTextService
  ]
})

export class EnvelopeField implements AfterViewInit, OnInit, OnChanges, OnDestroy {
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
  @Input()
  public currentSignature: string;
  @Input()
  public currentSignatureId: string;
  @Input()
  public currentInitial: string;
  @Input()
  public currentInitialId: string;
  @Output()
  onSignatureComplete = new EventEmitter();
  @Output()
  onInitialComplete = new EventEmitter();
  @ViewChild('itemContainer', { static: false }) items: ElementRef;
  @ViewChild('error', { static: false }) error: ElementRef;
  @ViewChild('textCalculator', { static: true }) textCalculator: ElementRef;
  @ViewChildren('itemWrapper') itemWrapper: QueryList<ElementRef>;
  @ViewChildren('textarea') textareas: QueryList<ElementRef>;

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

  private fieldsForCurrentSigner: any[] = [];

  private fieldsSubscription = new Subscription();
  private viewModeSubscription = new Subscription();
  private roleNameSubcription = new Subscription();
  private jumpCoordinateSubscription = new Subscription();
  private requestFormValiditySubscription = new Subscription();
  private jumpFieldKeySubscription = new Subscription();
  private validators;
  private fontSize = 11;
  private averageFontWidth = 5;
  private requiredFields: any[] = [];

  constructor(
    private envelopeViewService: EnvelopeViewService,
    private errorTooltipService: ErrorTooltipService,
    private envelopeService: EnvelopeService,
    private signatureService: SignatureService,
    private validatorService: ValidatorService,
    private dialog: MatDialog,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef,
    private snackbarService: SnackbarService,
    private browserToITextService: BrowserToiTextService,
    private requiredFieldsSerivce: RequiredFieldsService,
    private broadcast: Broadcast,
    @Inject(DOCUMENT) private document: any
  ) { }

  ngOnInit() {
    this.validatorService.getValidatorsObject().then(validators => {
      if (validators) {
        this.validators = validators;
      }
    });

    this.fieldsSubscription = this.signatureService._fields.subscribe(_fields => {
      this._fields = _fields;
    });

    this.requestFormValiditySubscription = this.envelopeViewService.requestFormValiditySubject.subscribe(status => {
      if (status) {
        this.checkForValidity();
      }
    });

    this.viewModeSubscription = this.envelopeViewService.viewModeSubject.subscribe(mode => {
      this.mode = mode;
    });

    this.roleNameSubcription = this.signatureService._rName.subscribe(role => {
      this.roleName = role;
    });
    this.jumpFieldKeySubscription = this.requiredFieldsSerivce.jumpFieldKeySubject.subscribe(fieldKey => {
      const field = find(this.requiredFields, { key: fieldKey });
      if (field) {
        if (field.field_name === this.focusFieldName) {
          this.timer = setTimeout(() => {
            this.focusOrderNumber = field.order;
            this.focusFieldName = field.field_name;
          }, 300);
        }
        this.focusElementById(fieldKey);
        this.focusOrderNumber = field.order;
        this.focusFieldName = field.field_name;
      }
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.focusOrderNumber = -1;
        this.focusFieldName = '';
      }, 600);
    })

    if (this.recipients && this.recipients.length > 0) {
      const preparer = find(this.recipients, { type: 'preparer' });
      if (preparer) {
        this.preparedMessage = `Prepared by ${preparer['full_name']}`;
      }
    }

    this.buildFields();
    this.buildForm();
    this.onResize();
    this.jumpCoordinateSubscription = this.envelopeViewService.jumpCoordinateSubject.subscribe(coordinate => {
      this.focusElement(coordinate);
    });

    this.broadcast.on('pdfUpdate').subscribe(data => {
      if (data === true) {
        this.updateWrapperStyles();
        this.updateElementStyles();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if ('pdfPages' in changes) {
      this.updateWrapperStyles();
      this.updateElementStyles();
    }
  }

  ngOnDestroy() {
    this.fieldsSubscription.unsubscribe();
    this.viewModeSubscription.unsubscribe();
    this.roleNameSubcription.unsubscribe();
    this.requestFormValiditySubscription.unsubscribe();
    this.jumpCoordinateSubscription.unsubscribe();
    this.jumpFieldKeySubscription.unsubscribe();
  }

  fieldTracking(index, item) {
    return item.key, index;
  }

  optionTracking(index, item) {
    return item.key, index;
  }

  isInactive(pageNum, j) {
    return this._fields[pageNum][j]['recipientRole'] !== this.roleName && !this._fields[pageNum][j]['prepared'];
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
    if (this.textCalculator) {
      this.textCalculator.nativeElement.style.fontSize = this.fontSize + 'px';
      this.textCalculator.nativeElement.style.letterSpacing = this.browserToITextService.getLetterSpacing() + 'px';
    }
    this.updateWrapperStyles();
    this.updateElementStyles();
    this.cdr.detectChanges();
  }

  rescale(r, n): number {
    return r * n;
  }

  onResize() {
    this.updateWrapperStyles();
    this.updateElementStyles();
  }

  updateWrapperStyles() {
    if (this.itemWrapper) {
      this.itemWrapper.forEach(itemWrapper => {
        const pageNum = itemWrapper.nativeElement.getAttribute('data-page');
        const j = itemWrapper.nativeElement.getAttribute('data-index');
        const style = this.getElementStyle(this.fields[pageNum][j]);
        itemWrapper.nativeElement.style.bottom = style.bottom;
        itemWrapper.nativeElement.style.left = style.left;
        itemWrapper.nativeElement.style.height = style.height;
        itemWrapper.nativeElement.style.width = style.width;
        itemWrapper.nativeElement.style.backgroundColor = style.background;
        itemWrapper.nativeElement.style.transform = `scale(${this.pdfPages[pageNum - 1].xRatio},${this.pdfPages[pageNum - 1].yRatio})`;
      });
    }
  }

  updateElementStyles() {
    const browserType = this.browserToITextService.detectBrowser();
    if (this._fields && this._fields.length > 0) {
      for (let pageIndex = 0; pageIndex < this._fields.length; pageIndex++) {
        this._fields[pageIndex] = updateElementStyles(this.fields[pageIndex], this._fields[pageIndex], this.mode, browserType);
      }
    }
  }

  buildFields() {
    /*
     * PDF 72 DPI
     * Width: 612px
     * Height: 792px
     * */
    this._fields = []; //
    let order = 0; //
    let role; //
    switch (this.mode) { //
      case 'signerview': //
      case 'prepareview': //
      case 'preview': //
        role = 'recipient_role'; //
        break; //
      case 'liveview': //
        role = 'role_name'; //
        break; //
      default: //
        role = 'recipient_role'; //
        break; //
    }
    let setting = 'setting'; //
    this.fieldsForCurrentSigner = new Array(this.fields.length);
    for (const pageIndex in this.fields) {
      if (this.fields.hasOwnProperty(pageIndex)) {
        for (const fieldIndex in this.fields[pageIndex]) { //
          if (this.fields[pageIndex].hasOwnProperty(fieldIndex) && this.fields[pageIndex][fieldIndex]) { //
            const field = this.fields[pageIndex][fieldIndex]; //
            let temp_sig = '';
            let sig_id = '';
            let temp_int = '';
            let int_id = '';
            let keyNameSuffix = '';
            if (!!field['settings']) {
              setting = 'settings'
            };
            switch (field.type.toLowerCase()) {
              case 'attachment':
              case 'payment':
                field[setting]['width'] = 24;
                field[setting]['height'] = 24;
                break;
              case 'checkbox':
              case 'checkbox_group':
              case 'radio_button_group':
                field[setting]['width'] = 13.5;
                field[setting]['height'] = 13.5;
                keyNameSuffix = field['optionId'] ? '-' + field['optionId'] : '';
                break;
              case 'signature':
                field[setting]['width'] = 82.63636363636;
                field[setting]['height'] = 36;
                if (field[setting].base64) {
                  temp_sig = this.signatureService.getSignatureUrl(field[setting].base64);
                  if (this.roleName === field[role]) {
                    this.currentSignature = temp_sig;
                  }
                } else {
                  temp_sig = null;
                }
                if (field[setting].signature_id) {
                  sig_id = field[setting].signature_id;
                  // this.signatureService.setSigId(field[setting].signature_id);
                  if (this.roleName === field[role]) {
                    this.currentSignatureId = sig_id;
                  }
                } else {
                  sig_id = null;
                }
                break;
              case 'initial':
                field[setting]['width'] = 82.63636363636;
                field[setting]['height'] = 36;
                if (field[setting].base64) {
                  temp_int = this.signatureService.getSignatureUrl(field[setting].base64);
                  if (this.roleName === field[role]) {
                    this.currentInitial = temp_int;
                  }
                } else {
                  temp_int = null;
                }
                if (field[setting].initial_id) {
                  int_id = field[setting].initial_id;
                  // this.signatureService.setInitialId(field[setting].initial_id);
                  if (this.roleName === field[role]) {
                    this.currentInitialId = int_id;
                  }
                }
                break;
              default:
                break;
            }
            const roleObject = find(this.recipients, { role_name: field[role] });
            const fieldValues = new DynamicField({
              key: field.name + keyNameSuffix,
              value: field[setting]['result'] || '',
              required: field.required,
              controlType: field.type,
              order: order++,
              validator: field.validator,
              showCounter: false,
              prepared: field.prepared,
              recipientRole: field[role],
              field_name: field.name,
              temp_sig: temp_sig,
              sig_id: sig_id,
              temp_int: temp_int,
              int_id: int_id,
              full_name: roleObject ? roleObject['full_name'] : '',
              dirty: false
            });

            this.prepareFieldsMap(field, keyNameSuffix, pageIndex, fieldIndex);

            switch (field.type) {
              case 'attachment':
                fieldValues.value = field[setting]['name'] ? field[setting]['name'] : '';
                break;
              case 'checkbox':
                fieldValues.value = field[setting]['result'] === false ? false : true;
                break;
              case 'payment':
                fieldValues.value = field[setting]['payment_id'] ? field[setting]['payment_id'] : '';
                break;
              case 'checkbox_group':
                fieldValues.value = field[setting]['checked'];
                if (field.required || field[setting]['maximum_checked'] > 0) {
                  fieldValues['min_checked'] = field[setting]['minimum_checked'];
                  fieldValues['max_checked'] = field[setting]['maximum_checked'];
                }
                break;
              case 'radio_button_group':
                fieldValues.value = field[setting]['selected'];
                break;
              case 'dropdown':
                fieldValues.value = field[setting]['value'];
                fieldValues['options'] = field[setting]['options'];
                break;
              default:
                break;
            };

            if (field[setting]['url']) {
              fieldValues['url'] = field[setting]['url'];
              fieldValues['name'] = field[setting]['name'];
              fieldValues['value'] = field[setting]['name'];
            }

            if (this._fields[pageIndex] == null) {
              this._fields[pageIndex] = [];
            }
            if (this.fieldsForCurrentSigner[pageIndex] == null) {
              this.fieldsForCurrentSigner[pageIndex] = []
              this.assignFieldForSigner(field, fieldValues, pageIndex, fieldIndex, role);
            } else {
              this.assignFieldForSigner(field, fieldValues, pageIndex, fieldIndex, role);
            }

            if (this.fields[pageIndex][fieldIndex]) {
              this._fields[pageIndex][fieldIndex] = fieldValues;
            }
          }
        }
      }
    }
    this.prepareFieldsForSigner(this.fieldsForCurrentSigner);
    this.signatureService.updateFields(this._fields);
  }

  assignFieldForSigner(field, fieldValues, pageIndex, fieldIndex, role) {
    if (this.mode === 'signerview') {
      if (this.roleName === field[role] && fieldValues) {
        this.fieldsForCurrentSigner[pageIndex][fieldIndex] = fieldValues;
        this.fieldsForCurrentSigner[pageIndex][fieldIndex]['page_index'] = pageIndex;
        this.fieldsForCurrentSigner[pageIndex][fieldIndex]['field_index'] = fieldIndex;
      } else {
        this.fieldsForCurrentSigner[pageIndex][fieldIndex] = undefined;
      }
    } else {
      if (fieldValues) {
        this.fieldsForCurrentSigner[pageIndex][fieldIndex] = fieldValues;
        this.fieldsForCurrentSigner[pageIndex][fieldIndex]['page_index'] = pageIndex;
        this.fieldsForCurrentSigner[pageIndex][fieldIndex]['field_index'] = fieldIndex;
      } else {
        this.fieldsForCurrentSigner[pageIndex][fieldIndex] = undefined;
      }
    }
  }

  isCheckboxWithMaximum(field) {
    return field.controlType === 'checkbox_group' && field.max_checked > 0;
  }

  prepareFieldsForSigner(fields: Array<any>, dirtyFieldkey?: any, clear?) {
    let preparedCheckboxCount = {};
    if (dirtyFieldkey) {
      if (clear) {
        this.updateFieldDirtyStatus(dirtyFieldkey, !clear);
      } else {
        this.updateFieldDirtyStatus(dirtyFieldkey, true);
      }
      fields = this._fields;
    }
    if (fields && fields.length > 0) {
      let flattenFields = [].concat(...fields);
      flattenFields = flattenFields.filter(field => field !== undefined);
      if (this.mode === 'signerview') {
        flattenFields = flattenFields.filter(field => {
          return field.recipientRole === this.roleName
        });
      }
      this.requiredFieldsSerivce.currentRoleFields = flattenFields;
      for (let field of flattenFields) {
        const checkIndex = findIndex(this.requiredFields, { field_name: field.field_name });
        if (field.dirty && field.value) {
          // this.envelopeFieldsFormGroup.controls[field.key].patchValue(field.value);
          this.envelopeFieldsFormGroup.controls[field.key].markAsDirty();
          this.envelopeFieldsFormGroup.updateValueAndValidity();
        }
        if ((field.required || this.isCheckboxWithMaximum(field)) && field.controlType !== 'timestamp') {
          if (checkIndex < 0) {
            const fieldData = {
              page_index: field.page_index,
              field_index: field.field_index,
              order: field.order,
              prepared: field.prepared,
              field_name: field.field_name,
              key: field.key,
              type: field.controlType,
              dirty: field.dirty
            };
            switch (field.controlType) {
              case 'textbox':
                if (field.validator) {
                  fieldData['validator'] = field.validator;
                }
                if (this.isSingleLineText(this.fields[field.page_index][field.field_index])) {
                  this.checkSingleLineText(field.page_index, field.field_index, field.value);
                } else {
                  this.checkTextArea(field.page_index, field.field_index, null);
                }
              case 'attachment':
              case 'payment':
              case 'signature':
              case 'initial':
              case 'dropdown':
              case 'date':
                fieldData['value'] = field.value;
                break;
              case 'checkbox_group':
                preparedCheckboxCount[field.field_name] = field.prepared ? [field.field_index] : [];
                fieldData['checked'] = field.value ? [field.field_index] : [];
                fieldData['unchecked'] = !field.value ? [field.field_index] : [];
                fieldData['min'] = field.min_checked;
                fieldData['max'] = field.max_checked;
                if (preparedCheckboxCount[field.field_name].length > 0) {
                  fieldData['prepared'] = true;
                } else {
                  fieldData['prepared'] = false;
                }
                break;
              case 'radio_button_group':
                fieldData['selected'] = field.value ? [field.field_index] : [];
                fieldData['unselected'] = !field.value ? [field.field_index] : [];
                break;
              default:
                break;
            }
            this.requiredFields.push(fieldData);
          } else {
            this.requiredFields[checkIndex].dirty = field.dirty
            if (this.isSingleLineText(this.fields[field.page_index][field.field_index])) {
              this.checkSingleLineText(field.page_index, field.field_index, field.value);
            } else {
              this.checkTextArea(field.page_index, field.field_index, null);
            }
            switch (field.controlType) {
              case 'checkbox_group':
                if (preparedCheckboxCount[field.field_name]) {
                  if (field.prepared) {
                    preparedCheckboxCount[field.field_name].push(field.field_index);
                  }
                } else {
                  preparedCheckboxCount[field.field_name] = field.prepared ? [field.field_index] : [];
                }
                if (preparedCheckboxCount[field.field_name].length > 0) {
                  this.requiredFields[checkIndex].prepared = true;
                } else {
                  this.requiredFields[checkIndex].prepared = false;
                }
                if (field.value) {
                  if (this.requiredFields[checkIndex].checked.indexOf(field.field_index) < 0) {
                    this.requiredFields[checkIndex].checked.push(field.field_index);
                    const selectionIndex = this.requiredFields[checkIndex].unchecked.indexOf(field.field_index);
                    if (selectionIndex > -1) {
                      this.requiredFields[checkIndex].unchecked.splice(selectionIndex, 1);
                    }
                  }
                } else {
                  if (this.requiredFields[checkIndex].unchecked.indexOf(field.field_index) < 0) {
                    this.requiredFields[checkIndex].unchecked.push(field.field_index);
                    const selectionIndex = this.requiredFields[checkIndex].checked.indexOf(field.field_index);
                    if (selectionIndex > -1) {
                      this.requiredFields[checkIndex].checked.splice(selectionIndex, 1);
                    }
                  }
                }
                break;
              case 'radio_button_group':
                if (field.value) {
                  if (this.requiredFields[checkIndex]['selected'].indexOf(field.field_index) < 0) {
                    this.requiredFields[checkIndex]['selected'].push(field.field_index);
                    const selectionIndex = this.requiredFields[checkIndex].unselected.indexOf(field.field_index);
                    if (selectionIndex > -1) {
                      this.requiredFields[checkIndex].unselected.splice(selectionIndex, 1);
                    }
                  }
                } else {
                  if (this.requiredFields[checkIndex]['unselected'].indexOf(field.field_index) < 0) {
                    this.requiredFields[checkIndex]['unselected'].push(field.field_index);
                    const selectionIndex = this.requiredFields[checkIndex].selected.indexOf(field.field_index);
                    if (selectionIndex > -1) {
                      this.requiredFields[checkIndex].selected.splice(selectionIndex, 1);
                    }
                  }
                }
                break;
              default:
                if (field.value || field.value === null || field.value === '') {
                  this.requiredFields[checkIndex].value = field.value;
                }
                break;
            }
          }
        }
      }
    }
    if (this.envelopeFieldsFormGroup) {
      const incompletedFields = this.requiredFields.filter(requiredField => !this.requiredFieldsSerivce.checkRequiredFieldCompleteStatus(requiredField, this.envelopeFieldsFormGroup.controls[requiredField.key], this.mode));
      this.requiredFieldsSerivce.setRequiredFields(incompletedFields, this.validatorService);
      this.requiredFieldsSerivce.formGroupFields = this.envelopeFieldsFormGroup;
    } else {
      this.requiredFieldsSerivce.setRequiredFields(this.requiredFields, this.validatorService);
    }
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
    if (!!field['settings']) {
      setting = 'settings'
    };
    return field && !!field[setting].leading && field[setting].leading > 0;
  }

  isSingleLineText(field) {
    return !this.isTextarea(field) && field['type'] === 'textbox';
  }

  getFieldWidth(field) {
    let setting = 'setting';
    if (!!field['settings']) {
      setting = 'settings'
    };
    if (field['type'] === 'textbox') {
      return this.rescale(field[setting]['width'], 1);
    }
    return null;
  }

  async buildForm() {
    const group: any = {};
    for (const fields of this._fields) {
      if (fields !== undefined) {
        for (const field of fields) {
          const validators = [];
          if (field.controlType === 'date') {
            group[field.key] = new FormControl({ value: new Date(field['value']) || '', disabled: this.roleName !== field.recipientRole && this.mode === 'signerview' });
          } else if (field.controlType === 'dropdown') {
            group[field.key] = new FormControl({ value: field['value'], disabled: this.roleName !== field.recipientRole && this.mode === 'signerview' });
          } else {
            group[field.key] = new FormControl({ value: field['value'] || '', disabled: this.roleName != field.recipientRole && this.mode === 'signerview' });
          }
          if (field['required']) {
            validators.push(Validators.required);
          }
          if (field['validator']) {
            if (!this.validators) {
              this.validators = await this.validatorService.getValidatorsObject();
            }
            validators.push(Validators.pattern(this.validators[field['validator']]));
          }
          if (validators.length > 0) {
            group[field.key].setValidators(validators);
          }
          if (field.prepared) {
            group[field.key].disable();
          } else if (this.roleName !== field.recipientRole && this.mode === 'signerview') {
            group[field.key].disable();
          }
        }
      }
    }
    this.envelopeFieldsFormGroup = new FormGroup(group);
    this.requiredFieldsSerivce.formGroupFields = this.envelopeFieldsFormGroup;
    const incompleteFields = this.requiredFields.filter(requiredField => !this.requiredFieldsSerivce.checkRequiredFieldCompleteStatus(requiredField, this.envelopeFieldsFormGroup.controls[requiredField.key], this.mode));
    this.requiredFieldsSerivce.setRequiredFields(incompleteFields, this.validatorService);
  }

  calculateCharacterLimit(field) {
    let maxLength = 1;
    let setting = 'setting';
    if (!!field['settings']) {
      setting = 'settings'
    };
    if (field[setting] && field[setting]['leading']) {
      const topPadding = 6;
      const maxNumberofLines = Math.floor((field[setting]['height'] - topPadding) / field[setting]['leading']);
      maxLength = Math.round(field[setting]['width'] / this.averageFontWidth) * maxNumberofLines;
    } else {
      maxLength = Math.round(field[setting]['width'] / this.averageFontWidth)
    }
    return maxLength;
  }

  // Refactor needed
  handleInput(pageNum: number, inputId: number, value, event?, clear?): void {
    if (this.mode === 'prepareview' && value === '' && this._fields[pageNum][inputId].controlType === 'textbox') {
      clear = true;
    }
    if (this._fields[pageNum][inputId].controlType === 'textbox') {
      const field = this.fields[pageNum][inputId];
      const key = this._fields[pageNum][inputId].key;
      this._fields[pageNum][inputId].value = value;
      // this.envelopeFieldsFormGroup.patchValue(value);
      // this.envelopeFieldsFormGroup.updateValueAndValidity();
      if (this.isSingleLineText(field)) {
        this.checkSingleLineText(pageNum, inputId, value);
      } else {
        this.checkTextArea(pageNum, inputId, event.target)
      }
      if (key && this.envelopeFieldsFormGroup && this.envelopeFieldsFormGroup.controls[key].errors) {
        this.checkSingleLineText(pageNum, inputId, value);
        this._fields[pageNum][inputId].value = value;
        this.updateFieldDirtyStatus(key, true);
        if (value === '') {
          return this.updateInput(pageNum, inputId, value, clear);
        }
        return this.prepareFieldsForSigner(this._fields, key);
      }
    }

    this.updateInput(pageNum, inputId, value, clear);
  }

  checkSingleLineText(pageNum, inputId, value) {
    if (this.isSingleLineText(this.fields[pageNum][inputId])) {
      const buffer = this.rescale(2, 1);
      const formControlName = this._fields[pageNum][inputId]['key'];
      this.textCalculator.nativeElement.innerText = value;
      if (this.envelopeFieldsFormGroup && this.textCalculator.nativeElement.offsetWidth + buffer > this.getFieldWidth(this.fields[pageNum][inputId])) {
        this.envelopeFieldsFormGroup.controls[formControlName].setErrors({ 'maxlength': true });
        return false;
      } else {
        if (this.envelopeFieldsFormGroup) {
          this.envelopeFieldsFormGroup.controls[formControlName].patchValue(value);
          this.envelopeFieldsFormGroup.controls[formControlName].updateValueAndValidity();
        }
        return true;
      }
    }
  }

  checkTextArea(pageNum, inputId, element) {
    if (this.isTextarea(this.fields[pageNum][inputId])) {
      const formControlName = this._fields[pageNum][inputId]['key'];
      if (element && element.scrollHeight > element.offsetHeight) {
        this.envelopeFieldsFormGroup.controls[formControlName].setErrors({ 'maxlength': true });
        return false;
      } else {
        if (this.textareas) {
          const targetElement = this.textareas.find((element) => {
            return element.nativeElement.attributes['id'].value === this._fields[pageNum][inputId];
          });
          if (targetElement && targetElement.nativeElement.scrollHeight > targetElement.nativeElement.offsetHeight) {
            this.envelopeFieldsFormGroup.controls[formControlName].setErrors({ 'maxlength': true });
            return false;
          }
        }
      }
      return true;
    }
  }

  // Refactor needed
  handleCheckbox(pageNum: number, inputId: number, value): void {
    if (this.canMakeChanges(pageNum, inputId)) {
      const key = this._fields[pageNum][inputId].key;
      this.envelopeFieldsFormGroup.controls[key].patchValue({
        value: value ? true : false
      });
      this._fields[pageNum][inputId].value = value;
      this.envelopeFieldsFormGroup.updateValueAndValidity();
      this.handleBlur(pageNum, inputId, value, 'checkbox');
    }
  }

  handleGroupField(pageNum: number, inputId: number, value, isPrepared?, clear?) {
    if (this.canMakeChanges(pageNum, inputId)) {
      const key = this._fields[pageNum][inputId].key;
      const optionId = this.getOptionIdFromKey(key);
      const fieldName = this.getFieldNameFromKey(key);
      const field = this.fields[pageNum][inputId];
      if (field.optionId === optionId) {
        const options = field.settings.options;
        const optionIndex = findIndex(options, { id: optionId });
        if (optionIndex > -1) {
          const body = { value: { options: this.prepareOptionBody(options, field, optionId, value) } };
          if (this.mode === 'signerview') {
            this.signatureService.updateGroupedField(this.id, body, fieldName);
          } else if (this.mode === 'prepareview') {
            if (isPrepared !== false && isPrepared !== true) {
              isPrepared = true;
            }
            this._fields[pageNum][inputId].prepared = isPrepared;
            this.signatureService.updateGroupedField(this.id, body, fieldName, isPrepared);
          }
        }
        this.updateLocalGroupFieldValues(pageNum, inputId, field, key, value, clear);
      }
    }
  }

  updateLocalGroupFieldValues(pageNum: number, inputId: number, field, key, value, clear?) {
    if (field.type === 'checkbox_group') {
      this.envelopeFieldsFormGroup.controls[key].patchValue({
        value: value ? true : false
      });
      this._fields[pageNum][inputId].value = value;
      if (this.mode === 'prepareview') {
        if (clear) {
          this._fields[pageNum][inputId].dirty = false;
          this._fields[pageNum][inputId].prepared = false;
          this._fields[pageNum][inputId].value = false;
          this.envelopeFieldsFormGroup.controls[key].patchValue(false);
        }
      }
      this.envelopeFieldsFormGroup.updateValueAndValidity();
    } else {
      const keys = this.findKeysofSameGroup(field.settings.options, field.name);
      keys.forEach(controlKey => {
        for (let x = 1; x < this._fields.length; x++) {
          if (this._fields[x]) {
            for (let y = 0; y < this._fields[x].length; y++) {
              if (this._fields[x][y].key === controlKey) {
                if (this.mode === 'prepareview') {
                  if (clear) {
                    this._fields[x][y].dirty = false;
                    this._fields[x][y].prepared = false;
                    this._fields[x][y].value = false;
                  }
                  if (this._fields[pageNum][inputId].prepared === true) {
                    this._fields[x][y].prepared = true;
                  } else {
                    this._fields[x][y].prepared = false;
                  }
                }
                if (key === controlKey) {
                  this._fields[x][y].value = value;
                } else {
                  this._fields[x][y].value = false;
                }
              }
            }
          }
        }
        if (controlKey === key) {
          this.envelopeFieldsFormGroup.controls[controlKey].patchValue({
            value: value ? true : false
          });
        } else {
          this.envelopeFieldsFormGroup.controls[controlKey].patchValue({
            value: false
          });
        }
      });
      this.envelopeFieldsFormGroup.updateValueAndValidity();
    }
    this.prepareFieldsForSigner(this._fields, key, clear);
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

  handleDropdown(pageNum: number, inputId: number, value, isPrepared?) {
    if (this.canMakeChanges(pageNum, inputId)) {
      const key = this._fields[pageNum][inputId].key;
      const fieldName = this.getFieldNameFromKey(key);
      const field = this.fields[pageNum][inputId];
      let option;
      let newValue;
      if (value != null) {
        const valueArray = value.split(' ');
        valueArray.splice(0, 1);
        newValue = valueArray.join(' ');
        option = find(field.settings.options, { value: newValue });
        value = !!option ? option.value : null;
      } else {
        value = null;
      }
      if (field.name === fieldName) {
        const body = { value: !!option ? option['id'] : null };
        if (this.mode === 'signerview') {
          this.signatureService.updateGroupedField(this.id, body, fieldName);
        } else if (this.mode === 'prepareview') {
          if (isPrepared !== false && isPrepared !== true) {
            isPrepared = true;
          }
          this.signatureService.updateGroupedField(this.id, body, fieldName, isPrepared);
        }
        this.envelopeFieldsFormGroup.controls[key].patchValue(
          value == null ? null : option['value']
        );
        this._fields[pageNum][inputId].value = value;
        this.prepareFieldsForSigner(this._fields, key);
        this.envelopeFieldsFormGroup.updateValueAndValidity();
        if (isPrepared === true) {
          this.envelopeFieldsFormGroup.controls[key].disable();
          this._fields[pageNum][inputId].prepared = true;
        }
        this.envelopeFieldsFormGroup.controls[key].enable();
      }
    }
  }

  canMakeChanges(pageNum: number, inputId: number) {
    return (this.mode !== 'prepareview' && !this._fields[pageNum][inputId].prepared && this._fields[pageNum][inputId]['recipientRole'] === this.roleName) ||
      (this.mode === 'prepareview');
  }

  prepareFieldsMap(field, keyNameSuffix, pageIndex, fieldIndex) {
    this.fieldsMap[field.name + keyNameSuffix] = {
      field_name: field.name,
      keyNameSuffix: field['optionId'] ? '-' + field['optionId'] : null,
      option_id: field['optionId'],
      field_pageNum: pageIndex,
      field_field_index: fieldIndex
    }
  }

  // This logic is not robust. Option id can be any unique string.
  getOptionIdFromKey(key: string) {
    return this.fieldsMap[key].option_id;
  }

  getFieldNameFromKey(key: string) {
    return this.fieldsMap[key].field_name;
  }

  // Refactor needed
  updateInput(pageNum: number, inputId: number, value, clear?): void {
    const key = this._fields[pageNum][inputId].key
    this._fields[pageNum][inputId]['value'] = value;
    this.prepareFieldsForSigner(this._fields, key, clear);
    this.signatureService.updateFields(this._fields);
    this.signatureService.updateCurrentField(
      this._fields[pageNum][inputId]['key'],
      this._fields[pageNum][inputId]['value'],
      this._fields[pageNum][inputId]['validator'],
      pageNum,
      inputId,
      this._fields[pageNum][inputId]['required'],
      this._fields[pageNum][inputId]['order'],
      this._fields[pageNum][inputId]['controlType']
    );
    if (this.mode !== 'prepareview') {
      this.signatureService.updateEnvelopeField(this.id, false);
    }
    if (clear === true) {
      this.clearAndResetControl(pageNum, inputId);
    }
  }

  isFocused(pageNum, index) {
    return this.focusOrderNumber === this._fields[pageNum][index].order || this.focusFieldName === this._fields[pageNum][index].field_name;
  }

  markDateDirty(key, pageNum, j) {
    this._fields[pageNum][j].dirty = true;
    this.envelopeFieldsFormGroup.controls[key].markAsDirty();
  }

  updateFieldDirtyStatus(fieldKey, status) {
    const field = this.fieldsMap[fieldKey];
    const fieldName = field.field_name;
    for (const key in this.fieldsMap) {
      if (key) {
        const fieldMap = this.fieldsMap[key];
        if (fieldMap.field_name === fieldName) {
          const pageNum = fieldMap.field_pageNum;
          const fieldIndex = fieldMap.field_field_index;
          this._fields[pageNum][fieldIndex].dirty = status;
        }
      }
    }
    if (!status) {
      this.envelopeFieldsFormGroup.controls[fieldKey].reset();
    }
  }

  // Refactor needed
  async handleBlur(pgNum: number, inputId: number, value, elementType: string) {
    if (!this.dialogOpened) {
      this.handleInput(pgNum, inputId, value, elementType);
      if (await this.envelopeService.validateEnvelopeField() && value !== null && this.envelopeFieldsFormGroup.controls[this._fields[pgNum][inputId].key].valid) {
        switch (this.mode) {
          case 'signerview':
            this.signatureService.updateEnvelopeField(this.id);
            if (value === '') {
              this.envelopeFieldsFormGroup.controls[this._fields[pgNum][inputId]['key']].patchValue(value);
              this.envelopeFieldsFormGroup.controls[this._fields[pgNum][inputId]['key']].reset();
            }
            break;
          case 'prepareview':
            if (this._fields[pgNum][inputId].controlType !== 'date' && (typeof this._fields[pgNum][inputId].value === 'string' && this._fields[pgNum][inputId].value !== '') ||
              typeof this._fields[pgNum][inputId].value === 'boolean') {
              this.handlePrepareOnBlur(pgNum, inputId);
            } else if (typeof this._fields[pgNum][inputId].value === 'string' && this._fields[pgNum][inputId].value === '') {
              this.envelopeFieldsFormGroup.controls[this._fields[pgNum][inputId]['key']].reset();
              this._fields[pgNum][inputId].value = null;
            };
            break;
          default:
            break;
        }
      }
    }
  }

  // Need to add error handling when data doesn't get saved to backend
  handlePrepareOnBlur(pgNum, inputId) {
    const isPrepared = this.signatureService.prepareEnvelopeField(this.id, true);
    this._fields[pgNum][inputId]['prepared'] = isPrepared;
    if (isPrepared) {
      this.envelopeFieldsFormGroup.controls[this._fields[pgNum][inputId]['key']].disable();
    }
  }

  // Refactor needed
  clear(pgNum: number, inputId: number, event) {
    let keypressClear = false;
    const type = this._fields[pgNum][inputId]['controlType'];
    if (event && !!event.key && event.key.toLowerCase() !== 'tab' && event.key.toLowerCase() !== 'shift') {
      event.preventDefault();
      if (type === 'date') {
        event.target.click();
      }
      if (event && event.key && (event.key === 'Backspace' || event.key === 'Delete')) {
        keypressClear = true;
      }
    } else if (event && event.type && event.type === 'click') {
      keypressClear = true;
    } else {
      if (event.key.toLowerCase() !== 'shift' && event.key.toLowerCase() !== 'tab') {
        event.target.click();
      }
    }
    if ((type === 'textbox' && keypressClear) || (type === 'date' && keypressClear)) {
      const controlName = this._fields[pgNum][inputId]['key'];
      this.envelopeFieldsFormGroup.controls[controlName].patchValue('')
      this.envelopeFieldsFormGroup.markAsDirty();
      this._fields[pgNum][inputId].value = '';
      this._fields[pgNum][inputId].dirty = false;
      this.clearAndResetControl(pgNum, inputId);
      this.handleInput(pgNum, inputId, '', type, true);
    }
    if (type === 'checkbox' && keypressClear) {
      this._fields[pgNum][inputId].value = false;
      this._fields[pgNum][inputId].dirty = false;
      this.clearAndResetControl(pgNum, inputId);
      this.handleInput(pgNum, inputId, false, type, true);
    } else {
      if (type === 'checkbox_group' || type == 'radio_button_group') {
        this.handleGroupField(pgNum, inputId, false, false, true);
      }
      if (type === 'dropdown') {
        this.handleDropdown(pgNum, inputId, null, false);
        this._fields[pgNum][inputId].dirty = false;
      }
      this._fields[pgNum][inputId].prepared = false;
    }
    this.prepareFieldsForSigner(this._fields);
  }

  clearAndResetControl(pgNum, inputId) {
    if (this.mode === 'prepareview') {
      this._fields[pgNum][inputId].prepared = false;
      this.envelopeFieldsFormGroup.controls[this._fields[pgNum][inputId]['key']].reset();
      this.signatureService.prepareEnvelopeField(this.id, false);
      this.envelopeFieldsFormGroup.controls[this._fields[pgNum][inputId]['key']].enable();
    } else {
      this.envelopeFieldsFormGroup.controls[this._fields[pgNum][inputId]['key']].reset();
    }
  }

  generateCheckboxLabel(pageNum) {
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      cursor: 'pointer',
      height: `13.5px`,
      width: `13.5px`,
      backgroundColor: 'transparent',
      border: '1px solid #777'
    }
  }

  initiateSign(pNum, j, field) {
    if (!!this.currentSignature && !!this.currentSignatureId) {
      switch (this.mode) {
        case 'signerview':
          const key = this._fields[pNum][j].key;
          this.signatureService.updateSigned(this._fields[pNum][j]['key'], true);
          this._fields[pNum][j]['value'] = 'signed';
          this._fields[pNum][j].temp_sig = this.currentSignature;
          this._fields[pNum][j].sig_id = this.currentSignatureId;
          this.prepareFieldsForSigner(this._fields, key);
          this.signatureService.putSignatureField(this.id, field.name, this.currentSignatureId);
          break;
        default:
          break;
      }
    } else {
      this.handleInput(pNum, j, '', 'signature');
      const signatureDialog = this.dialog.open(EnvelopeSignatureDialogComponent, {
        panelClass: 'signature__dialog'
      });
      signatureDialog.componentInstance.fieldCoordinateOverride = { pageNum: pNum, fieldIndex: j };
      signatureDialog.componentInstance.signatureMode = 'Signature';
      signatureDialog.componentInstance.fieldName = field.name;
      signatureDialog.componentInstance.roleName = this.roleName;
      signatureDialog.componentInstance.envelopeId = this.id;
      signatureDialog.componentInstance.placeholder = 'Full Name';
      signatureDialog.afterClosed().subscribe(status => {
        if (status && status.status === 'saved') {
          const key = this._fields[pNum][j].key;
          this._fields[pNum][j].temp_sig = status.temp_sig;
          this._fields[pNum][j].sig_id = status.sig_id;
          this.currentSignature = status.temp_sig;
          this.currentSignatureId = status.sig_id;
          this.onSignatureComplete.emit({
            signature: this.currentSignature,
            signature_id: this.currentSignatureId
          });
          this.prepareFieldsForSigner(this._fields, key);
          this.snackbarService.open('Signature saved and applied successfully.', null);
        }
      });
    }
  }

  initiateInitial(pNum, j, field) {
    if (!!this.currentInitial && !!this.currentInitialId) {
      switch (this.mode) {
        case 'signerview':
          const key = this._fields[pNum][j].key;
          this.signatureService.updateSigned(this._fields[pNum][j]['key'], true);
          this._fields[pNum][j]['value'] = 'initialed';
          this._fields[pNum][j].temp_int = this.currentInitial;
          this._fields[pNum][j].int_id = this.currentInitialId;
          this.prepareFieldsForSigner(this._fields, key);
          this.signatureService.putInitialField(this.id, field.name, this.currentInitialId);
          break;
        default:
          break;
      }
    } else {
      this.handleInput(pNum, j, '', 'initial');
      const initialDialog = this.dialog.open(EnvelopeSignatureDialogComponent, {
        panelClass: 'signature__dialog'
      });
      initialDialog.componentInstance.fieldCoordinateOverride = { pageNum: pNum, fieldIndex: j };
      initialDialog.componentInstance.signatureMode = 'Initial';
      initialDialog.componentInstance.fieldName = field.name;
      initialDialog.componentInstance.roleName = this.roleName;
      initialDialog.componentInstance.envelopeId = this.id;
      initialDialog.componentInstance.placeholder = 'Initial';
      initialDialog.afterClosed().subscribe(status => {
        if (status && status.status === 'saved') {
          const key = this._fields[pNum][j].key;
          this._fields[pNum][j].temp_int = status.temp_int;
          this._fields[pNum][j].int_id = status.int_id;
          this.currentInitial = status.temp_int;
          this.currentInitialId = status.int_id;
          this.onInitialComplete.emit({
            initial: this.currentInitial,
            initial_id: this.currentInitialId
          });
          this.prepareFieldsForSigner(this._fields, key);
          this.snackbarService.open('Initial saved and applied successfully.', null);
        }
      });
    }
  }

  initiateUpload(pNum, j) {
    const uploadDialog = this.dialog.open(AttachmentsDialogComponent, {
      panelClass: 'attachment__dialog'
    });
    uploadDialog.componentInstance.field = this.fields[pNum][j] || null;
    uploadDialog.componentInstance.envelopeId = this.id;
    uploadDialog.afterClosed().subscribe(attachmentField => {
      if (attachmentField && attachmentField['saved']) {
        this.fields[pNum][j]['settings'] = attachmentField['saved']['settings'];
        this._fields[pNum][j]['value'] = this.fields[pNum][j]['settings']['name'];
        this.signatureService.updateFields(this._fields);
      } else if (attachmentField && attachmentField['removed']) {
        this.fields[pNum][j]['settings']['name'] = '';
        this.fields[pNum][j]['settings']['url'] = '';
        this.fields[pNum][j]['settings']['type'] = '';
        this._fields[pNum][j]['value'] = '';
        this.signatureService.updateFields(this._fields);
      }
      const key = this._fields[pNum][j].key
      this.prepareFieldsForSigner(this._fields, key);
      this.signatureService.updateFields(this._fields);
    })
  }

  saveDateValue(pageNum, j) {
    const controlName = this._fields[pageNum][j]['key'];
    const dateValue = this.envelopeFieldsFormGroup.controls[controlName].value;
    const formattedDate = moment(dateValue).format('MM/DD/YYYY');
    this._fields[pageNum][j].value = formattedDate;
    this.handleInput(pageNum, j, dateValue, 'date');
    if (this.mode === 'prepareview') {
      this.handlePrepareOnBlur(pageNum, j);
    } else {
      this.handleBlur(pageNum, j, formattedDate, 'date');
    }
  }

  openPayment(pNum, j) {
    const field = { ...this._fields[pNum][j] };
    if (field && !this.fields[pNum][j]['settings']['payment_id'] && !field.value) {
      this.signatureService.setWorkingPayment(this._fields[pNum][j]);
      const paymentDialog = this.dialog.open(PaymentDialog, {
        panelClass: 'payment__dialog'
      });
      paymentDialog.componentInstance.paymentField = this.fields[pNum][j];
      paymentDialog.afterClosed().subscribe(res => {
        if (!!res) {
          this._fields[pNum][j].value = res.token_id;
          this.signatureService.updateFields(this._fields);
          this.submitPayment(res.token_id, null).then(response => {
            const key = this._fields[pNum][j].key
            this.fields[pNum][j]['settings']['payment_id'] = response.settings.payment_id;
            this._fields[pNum][j].value = response.settings.payment_id;
            this.signatureService.updateFields(this._fields);
            this.prepareFieldsForSigner(this._fields, key);
            this.envelopeService.inProgressSubject.next(false);
            this.envelopeService.toggleNextSubject.next(true);
          }).catch(err => {
            console.error('catching error', err);
            this.envelopeService.inProgressSubject.next(false);
            if (err && err.error && err.error.code && err.error.code.includes('RP')) {
              this.snackbarService.open('Failed to make payment', 'OK')
              this.fields[pNum][j]['settings']['payment_id'] = '';
              this._fields[pNum][j].value = '';
              this.signatureService.updateFields(this._fields);
            }
          });
        } else {
          this.envelopeService.inProgressSubject.next(false);
        }
      });
    } else {
      this.snackbarService.open('Payment was made', 'OK');
    }
  }

  submitPayment(token_id: string, amount: number) {
    return this.signatureService.submitPayment(this.id, token_id, amount);
  }

  isSigned(pNum, j): boolean {
    if (!!this._fields[pNum][j]['temp_sig'] && this.mode === 'signerview') {
      return this._fields[pNum][j].value === 'signed' && !!this._fields[pNum][j]['sig_id'];
    } else if (this.mode !== 'signerview') {
      return this._fields[pNum][j].value === 'signed';
    }
    return false;
  }

  getSignatureImg(pNum, j) {
    const sig_url = this._fields[pNum][j].temp_sig;
    if (sig_url) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(sig_url);
    }
    return null;
  }

  getInitialImg(pNum, j) {
    const int_url = this._fields[pNum][j].temp_int;
    if (int_url) {
      return this.sanitizer.bypassSecurityTrustResourceUrl(int_url);
    }
    return null;
  }

  isInitialed(pNum, j): boolean {
    if (this.mode === 'signerview') {
      return this._fields[pNum][j].value === 'initialed' && !!this._fields[pNum][j]['int_id'];
    } else {
      return this._fields[pNum][j].value === 'initialed'
    }
  }

  isMobile(): boolean {
    if (window) {
      return window.innerWidth <= 768 || window.innerHeight <= 500;
    }
  }

  errorMessage(pageNum, fieldIndex) {
    const formControlName = this._fields[pageNum][fieldIndex]['key'];
    const validatorType = this._fields[pageNum][fieldIndex]['validator'];
    if (this.envelopeFieldsFormGroup.controls[formControlName]['errors'] && this.envelopeFieldsFormGroup.controls[formControlName]['errors']['maxlength']) {
      return { message: 'Number of characters are over the limit.', type: 'maxlength' };
    }
    if (validatorType === 'email') {
      return { message: 'Please enter a valid email.', type: 'email' };
    } else if (validatorType === 'phone_number') {
      return { message: 'Please enter a valid phone number.', type: 'phone' };
    } else {
      if (this._fields[pageNum][fieldIndex]['controlType'] === 'date') {
        return { message: 'This field is required. Please select a date.', type: 'required' }
      }
      return { message: 'This field is required. Enter N/A if not applicable.', type: 'required' };
    }
  }

  checkForValidity() {
    const invalidFieldCoordinates = [];
    const pages = this._fields.length;
    for (let x = 0; x < pages; x++) {
      const numOfFields = this._fields[x] ? this._fields[x].length : 0;
      for (let y = 0; y < numOfFields; y++) {
        const formControlName = this._fields[x][y]['key'];
        if (this.envelopeFieldsFormGroup && this.envelopeFieldsFormGroup.controls[formControlName]['errors'] && this.envelopeFieldsFormGroup.controls[formControlName]['errors']['maxlength']) {
          invalidFieldCoordinates.push({
            pageNum: x,
            inputId: y
          });
        }
      }
    }
    this.envelopeViewService.setFormValidityData(invalidFieldCoordinates);
  }

  hasError(pageNum, fieldIndex, controlName) {
    const controlHasError = (!!this.envelopeFieldsFormGroup.controls[controlName]['errors'] &&
      this.envelopeFieldsFormGroup.controls[controlName].invalid);
    const controlIsRequired = this._fields[pageNum][fieldIndex].required;
    if ((controlHasError || this.hasMaxLimitError(pageNum, fieldIndex) ||
      (this.envelopeFieldsFormGroup.controls[controlName]['errors'] &&
        controlIsRequired &&
        this.envelopeFieldsFormGroup.controls[controlName]['value'] === '')) &&
      this.shouldShowError(pageNum, fieldIndex, controlName)) {
      this.showError = this.errorTooltipService.getActiveField();
      return true;
    } else {
      return false;
    }
  }

  shouldShowError(pageNum, fieldIndex, controlName) {
    switch (this._fields[pageNum][fieldIndex].controlType) {
      case 'date':
        if (!this._fields[pageNum][fieldIndex].required) {
          return false;
        }
      default:
        if (this.mode === 'signerview') {
          return this.envelopeFieldsFormGroup.controls[controlName] && (this.envelopeFieldsFormGroup.controls[controlName].dirty ||
            this.envelopeFieldsFormGroup.controls[controlName].touched) &&
            this.envelopeFieldsFormGroup.controls[controlName].invalid;
        } else {
          if (this.hasMaxLimitError(pageNum, fieldIndex)) {
            return true;
          } else if (this._fields && this._fields[pageNum] && this._fields[pageNum][fieldIndex] && this._fields[pageNum][fieldIndex].validator && this.envelopeFieldsFormGroup.controls[controlName]) {
            return (this.envelopeFieldsFormGroup.controls[controlName].dirty ||
              this.envelopeFieldsFormGroup.controls[controlName].touched) &&
              this.envelopeFieldsFormGroup.controls[controlName].invalid;
          }
        }
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

  setActiveElement(element) {
    if (element) {
      this.errorTooltipService.setActiveElement(element);
    } else {
      this.errorTooltipService.setActiveElement(null);
    }
  }

  hasMaxLimitError(pageNum, fieldIndex) {
    const formControlName = this._fields[pageNum][fieldIndex]['key'];
    return this.envelopeFieldsFormGroup.controls[formControlName]['errors'] && this.envelopeFieldsFormGroup.controls[formControlName]['errors']['maxlength'];
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
