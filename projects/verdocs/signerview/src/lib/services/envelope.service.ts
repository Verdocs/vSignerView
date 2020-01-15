import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpResponse, HttpRequest, HttpHeaders, HttpEvent } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, empty, Observable } from 'rxjs';
import { concatMap, map } from 'rxjs/operators';
import { findIndex } from 'lodash';
import { saveAs } from 'file-saver';
import * as jszip from 'jszip';
import * as moment from 'moment';
import { differenceBy } from 'lodash';
import { VerdocsTokenObjectService, VerdocsStateService } from '@verdocs/tokens';

import { environment } from '../../../environments/environment';

import { ValidatorService } from './validator.service';
import { GuardService } from './guard.service';
import { getRGBA, nameToRGBA } from '../functions/rgb';

import { Envelope } from '../models/envelope.model';
import { IEnvelopeSearchParams, SortOptions, ITimePeriod } from '../models/envelope_search.model';
import { FieldData } from '../../modules/envelopes/field-data.model';
import { IRecipient } from '../models/recipient.model';

@Injectable()
export class EnvelopeService {
  private _currentFields = new BehaviorSubject<any[]>([]);
  private _currEnvelope = new BehaviorSubject<string>('');
  public allEnvelopes = new BehaviorSubject<Envelope[]>([]);
  public _currentExtendedEnvelope = new BehaviorSubject<any>({});
  public _customFilterSubject = new BehaviorSubject<any>({});

  public currEnvelope$ = this._currEnvelope.asObservable();
  public fieldsStream = this._currentFields.asObservable();
  public inProgressSubject = new BehaviorSubject<boolean>(false);
  public envelopeData: Envelope;

  private currEnvelope: string;
  private currRoleName: string;
  private backendUrl: string = environment.backend;
  private envUrl: string = environment.backend + '/envelopes';
  private currentFields: any[];
  private workingField: FieldData<any> = new FieldData({ order: 0 });
  private envelope: Envelope = null;
  public validators: any = {};
  public toggleNextSubject = new BehaviorSubject<boolean>(false);

  constructor(
    private httpClient: HttpClient,
    private validatorService: ValidatorService,
    private tokenObjectService: VerdocsTokenObjectService,
    private vTokenStateService: VerdocsStateService,
    private guardService: GuardService,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platform
  ) {
  }

  public setCurrentEnvelope(id) {
    this.currEnvelope = id;
    this._currEnvelope.next(id);
  }

  public setEnvData(envId, roleId) {
    this.currEnvelope = envId;
    this.currRoleName = roleId;
  }

  public updateEnvelopes(envelopes) {
    this.allEnvelopes.next(envelopes);
  }

  get role_name() {
    return this.currRoleName;
  }

  get env_id() {
    return this.currEnvelope;
  }

  sendInvite(body): Observable<Envelope | never> {
    return this.httpClient.post(this.envUrl, body)
      .pipe(
        map(
          (envelope: Envelope) => envelope,
          err => {
            if (err && err.error && err.error.code && err.error.code === 'E000020') {
              this.dialog.closeAll();
              this.guardService.checkSubscription('open-free-envelopes', null, true);
            }
            return err;
          })
      );
  }

  sendDelegate(envelopeId, role): Observable<Envelope | never> {
    return this.httpClient.post(this.envUrl + `/${envelopeId}/recipients/${this.currRoleName}/delegate`, role)
      .pipe(
        map((envelope: Envelope) => envelope, err => err)
      );
  }

  resendInvitation(envelopeId: string, roleName: string) {
    return this.httpClient.post(this.envUrl + `/${envelopeId}/recipients/${roleName}/resend_invitation`, null);
  }

  getEnvelope(id?: string) {
    const envelopeId = id ? id : this.currEnvelope;
    this.setCurrentEnvelope(envelopeId);
    return this.httpClient.get(this.envUrl + `/${envelopeId}`)
      .pipe(
        map((envelopeExtended) => {
          this.envelope = <Envelope>envelopeExtended;
          this.envelope.recipients = this.sortRecipients(this.envelope);
          this._currentExtendedEnvelope.next(this.envelope);
          this.envelopeData = this.envelope;
          return this.envelope;
        })
      );
  }

  getAllEnvelopes(templateId?: string) {
    const endpoint = templateId ? this.envUrl + `?template_id=${templateId}` : this.envUrl;
    return this.httpClient.request(new HttpRequest(
      'GET',
      endpoint,
      {},
      {
        reportProgress: true,
        responseType: 'json'
      }
    )).pipe(
      map(event => {
        if (event instanceof HttpResponse) {
          this.updateEnvelopes(event.body);
          return event.body
        }
        return event;
      })
    );
  }

  searchEnvelopes(searchParams: IEnvelopeSearchParams): Observable<HttpEvent<any> | Envelope[]> {
    for (const key in searchParams) {
      if (searchParams.hasOwnProperty(key)) {
        if (searchParams[key] === null) {
          delete searchParams[key];
        }
      }
    }
    return this.httpClient.request(new HttpRequest(
      'POST',
      this.envUrl + '/search',
      searchParams,
      {
        reportProgress: true,
        responseType: 'json'
      }
    )).pipe(
      map(event => {
        if (event instanceof HttpResponse) {
          this.updateEnvelopes(event.body);
        }
        return event;
      })
    );
  }

  getRecentActivities(page?: number) {
    const searchBody = {
      sort_by: 'updated_at' as SortOptions,
      ascending: false,
      row: 5,
      page: page ? page : 1
    }
    return this.searchEnvelopes(searchBody)
  }

  applyCustomSearch(filters: any, searchParams) {
    if (filters['envelope_status'] && !searchParams['envelope_status']) {
      searchParams['envelope_status'] = filters['envelope_status']
    }
    if (filters['updated_at']) {
      if (!searchParams['updated_at'] && !!searchParams['envelope_status']) {
        searchParams['updated_at'] = filters['updated_at']
      } else if (!searchParams['envelope_status']) {
        searchParams['created_at'] = filters['updated_at']
        if (!searchParams['sort_by']) {
          searchParams['sort_by'] = 'created_at' as SortOptions;
        }
      }
    }
    if (filters['recipient_name']) {
      searchParams['recipient_name'] = filters['recipient_name']
    }
    if (filters['envelope_name']) {
      searchParams['envelope_name'] = filters['envelope_name']
    }
    if (filters['recipient_email']) {
      searchParams['recipient_email'] = filters['recipient_email']
    }
    if (filters['text_field_value']) {
      searchParams['text_field_value'] = filters['text_field_value']
    }
    return searchParams;
  }

  filterSearchBy(type: string, ascending?: boolean, row?: number, page?: number, filterTime?: ITimePeriod, sortBy?: SortOptions, customFilters?: any) {
    let searchParams = {
      ascending: ascending || false,
      row: row || 10,
      page: page || 1
    }

    switch (type) {
      case 'action_required':
        searchParams['is_recipient'] = true;
        searchParams['recipient_status'] = ['invited', 'opened', 'signed'];
        searchParams['envelope_status'] = ['pending', 'in progress'];
        searchParams['sort_by'] = sortBy as SortOptions;
        if (filterTime) {
          searchParams['updated_at'] = filterTime;
          if (!sortBy) {
            searchParams['sort_by'] = 'updated_at' as SortOptions;
          }
        }
        break;
      case 'waiting_on_others':
        return this.getWaitingOnOthers(ascending, row, page, filterTime, sortBy, customFilters);
      case 'waiting_on_others_unfiltered':
        searchParams['is_owner'] = true;
        searchParams['envelope_status'] = ['pending', 'in progress'];
        searchParams['sort_by'] = sortBy as SortOptions || null;
        if (filterTime) {
          searchParams['updated_at'] = filterTime;
          if (!sortBy) {
            searchParams['sort_by'] = 'updated_at' as SortOptions;
          }
        }
        break;
      case 'inbox':
        searchParams['is_recipient'] = true;
        searchParams['recipient_status'] = ['invited', 'declined', 'opened', 'signed', 'submitted', 'canceled'];
        searchParams['sort_by'] = sortBy as SortOptions || null;
        if (filterTime) {
          searchParams['created_at'] = filterTime;
          if (!sortBy) {
            searchParams['sort_by'] = 'created_at' as SortOptions;
          }
        }
        break;
      case 'completed':
        searchParams['envelope_status'] = ['complete'];
        searchParams['sort_by'] = sortBy as SortOptions || null;
        if (filterTime) {
          searchParams['updated_at'] = filterTime;
          if (!sortBy) {
            searchParams['sort_by'] = 'updated_at' as SortOptions;
          }
        }
        break;
      case 'sent':
        searchParams['is_owner'] = true;
        searchParams['sort_by'] = sortBy as SortOptions || null;
        if (filterTime) {
          searchParams['created_at'] = filterTime;
          if (!sortBy) {
            searchParams['sort_by'] = 'created_at' as SortOptions;
          }
        }
        break;
      case 'all':
        searchParams['sort_by'] = sortBy as SortOptions || null;
        if (filterTime) {
          searchParams['created_at'] = filterTime;
          if (!sortBy) {
            searchParams['sort_by'] = 'created_at' as SortOptions;
          }
        }
        break;
      default:
        break;
    }

    if (!!customFilters) {
      searchParams = this.applyCustomSearch(customFilters, { ...searchParams });
    }
    return this.searchEnvelopes(searchParams);
  }

  public getWaitingOnOthers(ascending?: boolean, row?: number, page?: number, filterTime?: ITimePeriod, sortBy?: SortOptions, customFilters?: any) {
    let actionRequiredEnvelopes = null;
    return this.filterSearchBy('action_required', ascending, row, page, filterTime, sortBy, customFilters)
      .pipe(
        concatMap((res) => {
          if (res instanceof HttpResponse) {
            actionRequiredEnvelopes = res.body['result'];
            return this.filterSearchBy('waiting_on_others_unfiltered', ascending, row, page, filterTime, sortBy, customFilters)
          } else {
            return empty();
          }
        }),
        map((response) => {
          if (response instanceof HttpResponse && actionRequiredEnvelopes) {
            const unfilteredWaitingOnOthers = response['body']['result'];
            const filteredWaitingOnOthers = differenceBy(unfilteredWaitingOnOthers, actionRequiredEnvelopes, 'id');
            response.body['result'] = filteredWaitingOnOthers;
            response.body['total'] = filteredWaitingOnOthers.length;
          }
          return response;
        })
      )
  }

  getEnvelopeOwnerInfo(envId: string) {
    return this.httpClient.get(this.envUrl + `/${envId}?owner_info=true`).pipe(
      map(res => {
        return res;
      })
    );
  }

  getEnvelopeDocUrl(envId: string, docId: string) {
    return this.httpClient.get(this.envUrl + `/${envId}/envelope_documents/${docId}?file=true`,
      { responseType: 'blob' })
      .pipe(
        map(res => {
          if (isPlatformBrowser(this.platform)) {
            const urlCreator = window.URL;
            const pdfUrl = urlCreator.createObjectURL(res);
            return pdfUrl;
          }
        }, err => {
          // use a snackBar/error.service
          console.error(err);
        })
      );
  }

  getEnvelopePdfWithProgress(envelopeId: string, documentId: string) {
    const requestUrl = this.envUrl + `/${envelopeId}/envelope_documents/${documentId}?file=true`;
    return this.httpClient.request(new HttpRequest(
      'GET',
      requestUrl,
      {},
      { reportProgress: true, responseType: 'blob' }
    )).pipe(
      map(event => event)
    );
  }

  getEnvelopeDocBlob(envId: string, docId: string) {
    return this.httpClient.get(this.envUrl + `/${envId}/envelope_documents/${docId}?file=true`,
      { responseType: 'blob' })
      .pipe(map(file => {
        return file;
      }));
  }

  getEnvelopeCertificateBlob(envId: string) {
    return this.httpClient.get(this.envUrl + `/${envId}?certificate_file=true`,
      { responseType: 'blob' })
      .pipe(
        map(file => {
          return file;
        })
      );
  }

  downloadEnvelope(envelope) {
    this.getEnvelopeDocBlob(envelope.id, envelope.envelope_document_id).toPromise().then(pdfBlob => {
      saveAs(pdfBlob, envelope.name + '-' + moment(envelope.updated_at).format('MM-DD-YY') + '.pdf');
    });
  }

  downloadEnvelopeCertificate(envelope) {
    this.getEnvelopeCertificateBlob(envelope.id).toPromise().then(pdfBlob => {
      if (pdfBlob) {
        saveAs(pdfBlob, `${envelope.name}_certificate.pdf`);
      }
    });
  }

  getTemplateDoc(templateId: string, token: string, file: boolean) {
    const requestUrl = this.backendUrl + `/liveview/${templateId}/token/${token}`;
    return this.httpClient.get(requestUrl, { responseType: 'json' })
      .pipe(
        map((res: any) => {
          return res;
        }, err => {
          console.error(err);
          return err;
        })
      );
  }

  getTemplatePDF(templateId: string, token: string) {
    const requestUrl = this.backendUrl + `/liveview/${templateId}/token/${token}?file=true`;
    return this.httpClient.request(new HttpRequest(
      'GET',
      requestUrl,
      {},
      { reportProgress: true, responseType: 'blob' }
    )).pipe(
      map(event => {
        return event;
      })
    );
  }

  cancelEnvelope(id: string) {
    return this.httpClient.put(this.envUrl + `/${id}`, { action: 'cancel' }, { responseType: 'json' })
      .pipe(
        map(envelopeData => envelopeData, err => err)
      );
  }

  submitEnvelope(envId: string, roleName: string): Observable<IRecipient> {
    return this.httpClient.put(
      environment.backend + `/envelopes/${envId}/recipients/${roleName}`,
      { action: 'submit' }
    ).pipe(
      map((res: IRecipient) => {
        return res
      })
    );
  }

  declineEnvelope(envId: string, roleName: string): Observable<IRecipient> {
    return this.httpClient.put(
      environment.backend + `/envelopes/${envId}/recipients/${roleName}`,
      { action: 'decline' }
    ).pipe(
      map((res: IRecipient) => {
        return res;
      })
    );
  }


  uploadAttachment(envelopeId, file: File, fieldName) {
    let req;
    if (file) {
      const formdata = new FormData();
      formdata.append('document', file, file.name);
      req = new HttpRequest('PUT', environment.backend + '/envelopes/' + envelopeId +
        '/fields/' + fieldName, formdata, {
        reportProgress: true
      })
      return this.httpClient.request(req).pipe(
        map(res => res)
      );
    }
  }

  downloadAttachment(field) {
    const header = new HttpHeaders().set('content-type', field.settings.type);
    return this.httpClient.get(environment.backend + '/envelopes/' + field.envelope_id +
      '/fields/' + field.name + '/document', { headers: header, responseType: 'blob' })
      .pipe(
        map(file => {
          return file;
        })
      );
  }

  getAttachmentDataByRecipients(envelope) {
    const recipients = envelope['recipients'];
    if (recipients && recipients.length > 0) {
      const attachments = []
      for (const recipient of recipients) {
        if (recipient.fields && recipient.fields.length > 0) {
          for (const field of recipient.fields) {
            if (field.type === 'attachment' && !!field.settings.url) {
              attachments.push({
                recipient: recipient.full_name,
                fieldObject: field
              });
            }
          }
        }
      }
      return attachments;
    }
    return [];
  }

  async zipEnvelopeDocs(envelope) {
    const zip = new jszip();
    const envelopeZipName = envelope.name + ' - ' + moment(envelope.updated_at).format('MM-DD-YY');

    await this.getEnvelopeDocBlob(envelope.id, envelope.envelope_document_id).toPromise().then(envelopeBlob => {
      zip.file(envelope.name + '.pdf', envelopeBlob, { compression: 'DEFLATE' });
    });

    if (this.hasCertificate(envelope)) {
      await this.getEnvelopeCertificateBlob(envelope.id).toPromise().then(envelopeCertificateBlob => {
        zip.file(envelope.name + '_certificate.pdf', envelopeCertificateBlob, { compression: 'DEFLATE' });
      });
    }

    const attachment = zip.folder('attachments');
    const fields = envelope.fields;
    let numOfAttachments = 0;
    for (let x = 0; x < fields.length; x++) {
      if (fields[x] && fields[x].type === 'attachment' && fields[x].settings['name']) {
        await this.downloadAttachment(fields[x]).toPromise().then(fileBlob => {
          attachment.file(fields[x].settings.name, fileBlob, { compression: 'DEFLATE' });
          numOfAttachments++;
        });
      }
    }
    if (numOfAttachments === 0) {
      zip.remove('attachments');
    }
    zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }).then(content => {
      saveAs(content, envelopeZipName + '.zip');
    })
  }

  sortRecipients(envelope: Envelope) {
    if (envelope.recipients.length < 1) {
      return [];
    }

    const recipients = envelope.recipients.sort((a: IRecipient, b: IRecipient) => {
      if (a.sequence === b.sequence) {
        return a.role_name < b.role_name ? -1 : a.role_name > b.role_name ? 1 : 0;
      }
      return b.sequence > a.sequence ? -1 : b.sequence < a.sequence ? 1 : 0;
    });

    const signers = recipients.filter(recipient => {
      return recipient.type === 'signer';
    });

    for (let x = 0; x < signers.length; x++) {
      const rIndex = findIndex(recipients, { sequence: signers[x].sequence, role_name: signers[x].role_name });
      if (rIndex >= 0) {
        recipients[rIndex]['rgba'] = getRGBA(x);
      }
    }

    return recipients;
  }

  getRecipientColor(name, index?) {
    if (index) {
      return getRGBA(index);
    } else if (this.envelope && this.envelope.recipients && this.envelope.recipients.length > 0) {
      let index = findIndex(this.envelope.recipients, { role_name: name });
      if (index >= 0 && this.envelope.recipients[index].rgba) {
        return this.envelope.recipients[index].rgba;
      }
    } else {
      return nameToRGBA(name);
    }
  }

  // Check the logic
  async validateEnvelopeField(): Promise<boolean> {
    if (this.workingField.vName != null && this.workingField.value !== '') {
      const validators = await this.validatorService.getValidatorsObject();
      return validators[this.workingField.vName].test(this.workingField.value) && this.satisfyRequired();
    } else {
      return this.satisfyRequired();
    }
  }

  private satisfyRequired() {
    if (!!this.workingField.required && this.workingField.type !== 'checkbox' && this.workingField.type !== 'timestamp') {
      return !!this.workingField.value;
    }
    return true;
  }

  sortFields(fields) {
    fields = fields.sort((a, b) => {
      return a.page - b.page;
    });
    let previousDistance = null;
    fields = fields.sort((a, b) => {
      let setting = 'settings';
      let distance = this.canBeSameRow(a, b).distance;
      let higherHeight = this.canBeSameRow(a, b).higherHeight;
      if (!a[setting]) {
        setting = 'setting';
      }
      if (a.page < b.page) {
        return -1;
      }
      if (a.page > b.page) {
        return 1;
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
      return b[setting].y - a[setting].y
    })
    return fields;
  }

  checkIfEnvelopeOwner(envelope) {
    const signer_token = this.vTokenStateService.getOtherCookie('signer_token');
    const profile = this.tokenObjectService.getProfile();
    if (signer_token && !profile) {
      return false;
    } else if (envelope) {
      const currentUserId = profile['id'];
      return currentUserId === envelope['profile_id'];
    }
  }

  private canBeSameRow(a, b) {
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

  private getHeight(field) {
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

  public hasCertificate(envelope) {
    return envelope.certificate_document_id || ['complete', 'canceled', 'declined'].indexOf(this.envelope.status) !== -1;
  }
}
