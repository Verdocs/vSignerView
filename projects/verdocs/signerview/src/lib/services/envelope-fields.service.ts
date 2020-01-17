import { Injectable } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { buildFields, getFieldsMap, updateElementStyles } from '../functions/viewer-fields';
import { BrowserToiTextService } from './browser-to-iText.service';
import { ReplaySubject } from 'rxjs';

@Injectable()
export class EnvelopeFieldsService {

  fieldsWorker: Worker[];
  fieldsSubject = new ReplaySubject<any>(1, 100);
  fieldsMapSubject = new ReplaySubject<any>(1, 100);
  envelopeFieldsFormGroupSubject = new ReplaySubject<any>(1, 100);
  fieldStyleSubject = new ReplaySubject<any>(1, 100);


  constructor() { }

  buildFieldsWithWorker(fields, pageNum, mode, roleName, fieldValidators) {
    if (typeof Worker !== 'undefined') {
      if (!this.fieldsWorker) {
        try {
          if (!mode) {
            mode = 'preview';
          }
          const _fieldsWorker = new Worker('../../web-workers/envelope-fields.worker.worker', { type: 'module' });
          this.fieldsWorker.push(_fieldsWorker);
          const fieldsWorkerIndex = this.fieldsWorker.length - 1;
          this.fieldsWorker[fieldsWorkerIndex].onmessage = (res) => {
            this.fieldsWorker[fieldsWorkerIndex].terminate();
            const envelopeFieldsFormGroup = this.buildForms(res.data['_fields'], fieldValidators, roleName, mode);
            this.getFieldStyling(fields, res.data._fields, pageNum, mode);
            this.fieldsMapSubject.next({ fieldsMap: res.data['fieldsMap'], for: res.data['for'] });
            this.envelopeFieldsFormGroupSubject.next({ envelopeFieldsFormGroup, for: res.data['for'] });
          }
          this.fieldsWorker[fieldsWorkerIndex].postMessage({ fields: fields, pageNum, mode: mode });
        } catch {
          return this.getFieldsAndMap(fields, pageNum, mode, roleName, fieldValidators);
        }
      }
    } else {
      return this.getFieldsAndMap(fields, pageNum, mode, roleName, fieldValidators);
    }
  }

  buildForms(_fields, fieldValidators, roleName, mode) {
    const group: any = {};
    for (const field of _fields) {
      const localValidators = [];
      if (field.controlType === 'date') {
        group[field.key] = new FormControl({ value: new Date(field['value']) || '', disabled: roleName !== field.recipientRole && mode === 'signerview' });
      } else if (field.controlType === 'dropdown') {
        group[field.key] = new FormControl({ value: field['value'], disabled: roleName !== field.recipientRole && mode === 'signerview' });
      } else {
        group[field.key] = new FormControl({ value: field['value'] || '', disabled: roleName != field.recipientRole && mode === 'signerview' });
      }
      if (field['required']) {
        localValidators.push(Validators.required);
      }
      if (field['validator']) {
        localValidators.push(Validators.pattern(fieldValidators[field['validator']]));
      }
      if (localValidators.length > 0) {
        group[field.key].setValidators(localValidators);
      }
      if (field.prepared) {
        group[field.key].disable();
      } else if (roleName !== field.recipientRole && mode === 'signerview') {
        group[field.key].disable();
      }
    }
    const envelopeFieldsFormGroup = new FormGroup(group);
    return envelopeFieldsFormGroup;
  }

  getFieldStyling(fields, _fields, pageNum, mode) {
    const browserType = new BrowserToiTextService().detectBrowser();
    if (typeof Worker !== 'undefined') {
      if (!this.fieldsWorker) {
        try {
          const _fieldsWorker = new Worker('../../web-workers/envelope-fields.worker.worker', { type: 'module' });
          this.fieldsWorker.push(_fieldsWorker);
          const fieldsWorkerIndex = this.fieldsWorker.length - 1;
          this.fieldsWorker[fieldsWorkerIndex].onmessage = (res) => {
            this.fieldsSubject.next({ _fields: res.data['_fields'], for: res.data['for'] });
            this.fieldsWorker[fieldsWorkerIndex].terminate();
          }
          this.fieldsWorker[fieldsWorkerIndex].postMessage({ fields: fields, _fields: _fields, pageNum: pageNum, mode: mode, browserType: browserType });
        } catch {
          this.fieldsSubject.next({ _fields: updateElementStyles(fields, _fields, mode, browserType), for: pageNum });
        }
      }
    } else {
      this.fieldsSubject.next({ _fields: updateElementStyles(fields, _fields, mode, browserType), for: pageNum });
    }
  }

  getFieldsAndMap(fields, pageNum: number, mode, roleName, fieldValidators) {
    const _fields = buildFields(fields, mode);
    const fieldsMap = getFieldsMap(fields, pageNum);
    const envelopeFieldsFormGroup = this.buildForms(_fields, fieldValidators, roleName, mode);
    this.getFieldStyling(fields, _fields, pageNum, mode);
    this.fieldsMapSubject.next({ fieldsMap, for: pageNum });
    this.envelopeFieldsFormGroupSubject.next({ envelopeFieldsFormGroup, for: pageNum });
  }
}
