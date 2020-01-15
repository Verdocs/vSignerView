import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { BehaviorSubject, ReplaySubject } from 'rxjs';

import { VerdocsStateService } from '@verdocs/tokens';
import { EnvelopeService } from './envelope.service';

import { FieldData } from '../models/field-data.model';
import { dataURLtoBlob } from '../functions/utils';
import { IViewConfig, viewConfiguration } from '../views.module';

@Injectable()
export class SignatureService {
  private signatureId: string;
  private initialId: string;
  private backend_url: string = 'https://rformapi.verdocs.com';
  private envUrl: string = this.backend_url + '/envelopes';
  private currentFields: any[];
  private workingField: FieldData<any> = new FieldData({ order: 0, fName: '' });
  private signatureBlob: Blob;
  private initialBlob: Blob;
  private fields: any[] = [];
  private _total = -1;
  private initialImg: any;
  private workingPayment: any;
  private rName: string;
  private recipients: any[];

  public _fields = new ReplaySubject<any[]>();
  public _recipient = new ReplaySubject<string>();
  public _showSig = new ReplaySubject<boolean>();
  public _signedFields = new BehaviorSubject<any>({});
  public _envId = new ReplaySubject<string>();
  public _rName = new ReplaySubject<string>();
  public signImgSubject = new ReplaySubject<any>();
  public initialImgSubject = new ReplaySubject<any>();
  public initialIdSubject = new ReplaySubject<string>();
  public signatureIdSubject = new ReplaySubject<string>();
  public signedFields: any = {};
  public signImg: any;
  public mode = '';
  public viewConfig: IViewConfig;

  constructor(
    private injector: Injector,
    private httpClient: HttpClient,
    private envelopeSvc: EnvelopeService,
    private vTokenStateService: VerdocsStateService
  ) {
    this.viewConfig = this.injector.get(viewConfiguration);
    this.backend_url = this.viewConfig.rForm_backend_url;
    this.envUrl = this.backend_url + '/envelopes'
  }

  setWorkingPayment(payment: any) {
    this.workingPayment = payment;
  }

  updateFields(fields: any[]): void {
    this.fields = fields;
    this._fields.next(this.fields);
  }

  postSignatureBlob() {
    const blobFile = this.signatureBlob;
    const formData = new FormData();
    formData.append('signature', blobFile, blobFile['name']);
    const request = new HttpRequest('POST', this.backend_url + '/signatures', formData);
    return this.httpClient.request(request)
      .toPromise()
      .then(response => {
        if (response && response['body']) {
          return response['body'];
        } else {
          console.error('Failed to upload signature image');
        }
      });
  }

  postInitialBlob() {
    const blobFile = this.initialBlob;
    const formData = new FormData();
    formData.append('initial', blobFile, blobFile['name']);
    const request = new HttpRequest('POST', this.backend_url + '/initials', formData);
    return this.httpClient.request(request)
      .toPromise()
      .then(response => {
        if (response && response['body']) {
          return response['body'];
        } else {
          console.error('Failed to upload Initial');
        }
      });
  }

  toggleSig(bool): void {
    this._showSig.next(bool);
  }

  setSigId(id): void {
    this.signatureId = id;
    this.signatureIdSubject.next(id);
  }

  setInitialId(id): void {
    this.initialId = id;
    this.initialIdSubject.next(id);
  }

  setSignImg(url) {
    this.signImg = url;
    this.signImgSubject.next(this.signImg);
  }

  getSignImg() {
    return this.signImg;
  }

  setInitialImg(url) {
    this.initialImg = url;
    this.initialImgSubject.next(this.initialImg);
  }

  getInitialImg() {
    return this.initialImg;
  }

  putSignatureField(envelopeId, fieldName, signatureId) {
    return new Promise<any>(async (resolve, reject) => {
      const ipAddress = await this.getPublicIp();
      this.httpClient
        .put(this.envUrl + `/${envelopeId}/fields/${fieldName}/signature/${signatureId}`,
          {
            ip_address: ipAddress
          }
        ).toPromise().then(res => {
          return resolve(res);
        })
    });
  }

  putInitialField(envelopeId, fieldName, initialId) {
    return new Promise<any>(async (resolve, reject) => {
      const ipAddress = await this.getPublicIp();
      this.httpClient
        .put(this.envUrl + `/${envelopeId}/fields/${fieldName}/initial/${initialId}`,
          {
            ip_address: ipAddress
          }
        ).toPromise().then(res => {
          return resolve(res);
        })
    });
  }

  // refactor it to 4 functions
  updateEnvelopeField(envelopeId, ifPrepared?: boolean) {
    if (this.workingField && this.workingField.type) {
      const result = this.getEnvelopeFieldValue(ifPrepared);
      this.putEnvelopeField(envelopeId, result);
    }
  }

  getEnvelopeFieldValue(isPrepared?: boolean) {
    if (this.workingField && this.workingField.type) {
      const result = {
        value: ''
      };
      if (typeof (isPrepared) === 'boolean') {
        result['prepared'] = isPrepared;
      }
      switch (this.workingField.type.toLowerCase()) {
        case 'textbox':
        case 'checkbox':
        case 'date':
          result.value = this.workingField.value;
          break;
        default:
          break;
      }
      return result;
    }
    return null;
  }

  putEnvelopeField(envelopeId, result) {
    return new Promise<any>((resolve, reject) => {
      this.httpClient
        .put(this.envUrl + `/${envelopeId}/fields/${this.workingField.fName}`,
          result
        ).toPromise().then(res => {
          return resolve(res);
        })
    });
  }

  updateGroupedField(envelopeId, body, fieldName, ifPrepared?: boolean) {
    if (typeof (ifPrepared) === 'boolean') {
      body['prepared'] = ifPrepared;
    }
    return new Promise<any>((resolve, reject) => {
      this.httpClient
        .put(this.envUrl + `/${envelopeId}/fields/${fieldName}`,
          body
        ).toPromise().then(res => {
          return resolve(res);
        })
    });
  }

  async prepareEnvelopeField(envelopeId, setPrepared) {
    if (this.workingField && this.workingField.type) {
      const fieldType = this.workingField.type.toLowerCase();
      if (fieldType !== 'textbox' && fieldType !== 'date' && fieldType !== 'checkbox') {
        return false;
      } else {
        const fieldResponse: any = await this.updateEnvelopeField(envelopeId, setPrepared);
        if (fieldResponse) {
          return fieldResponse.prepared;
        } else {
          return false;
        }
      }
    }
  }

  private getPublicIp() {
    const apiUrl = 'https://api.ipify.org?format=jsonp';
    const callback = 'callback=JSONP_CALLBACK';
    return this.httpClient
      .jsonp(apiUrl, callback)
      .toPromise()
      .then((res) => {
        return res['ip']
      }).catch((err) => {
        console.error('Failed to get ip', err)
        return 'ip_unavailable'
      });
  }

  submitPayment(envelopeId, token_id: string, amount: number) {
    if (this.workingPayment) {
      const paymentData = {
        source: token_id
      };
      if (!!amount) {
        paymentData['amount'] = amount;
      };
      return new Promise<any>((resolve, reject) => {
        this.httpClient
          .put(this.envUrl + `/${envelopeId}/fields/${this.workingPayment['key']}`,
            paymentData
          ).toPromise().then(res => {
            return resolve(res);
          })
          .catch(err => {
            return reject(err);
          });
      });
    }
  }

  updateCurrentField(
    fName: string,
    result: string,
    vName: string,
    pageNum: number,
    id: number,
    required: boolean,
    order: number,
    type: string
  ) {
    this.workingField.fName = fName;
    this.workingField.value = result;
    this.workingField.pageNum = pageNum;
    this.workingField.id = id;
    this.workingField.vName = vName;
    this.workingField.required = required;
    this.workingField.order = order;
    this.workingField.type = type;
  }

  setCurrentFields(fields: any[]) {
    this.currentFields = fields;
  }

  get currField() {
    return this.workingField;
  }

  errorMessages(pageNum, id) {
    return this.currentFields[pageNum][id]['error'];
  }

  setEnvId(id): void {
    this._envId.next(id);
  }

  setrName(role): void {
    this.rName = role;
    this._rName.next(role);
  }

  getSignatureUrl(data) {
    if (data) {
      const blob = dataURLtoBlob(data);
      const url = URL.createObjectURL(blob);
      return url;
    }
    return null;
  }

  setSignatureData(data) {
    const blob = dataURLtoBlob(data);
    const url = URL.createObjectURL(blob);
    this.signatureBlob = blob;
    this.setSignImg(url);
  }

  setInitialData(data) {
    const blob = dataURLtoBlob(data);
    const url = URL.createObjectURL(blob);
    this.initialBlob = blob;
    this.setInitialImg(url);
  }

  updateSigned(fName, result) {
    this.workingField['value'] = 'signed';
    this.signedFields[fName] = result;
    this._signedFields.next(this.signedFields);
  }

  updateInitialed(fName, result) {
    this.workingField['value'] = 'initialed';
    this.signedFields[fName] = result;
    this._signedFields.next(this.signedFields);
  }

  setSignatureId(id) {
    this.signatureId = id;
    this.signatureIdSubject.next(id);
  }

  setRecipient(recipient: string): void {
    this._recipient.next(recipient);
  }

  setTotal(t: number) {
    this._total = t;
  }

}
