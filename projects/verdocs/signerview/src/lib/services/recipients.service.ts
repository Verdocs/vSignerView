import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReplaySubject } from 'rxjs';

import { IViewConfig, viewConfiguration } from '../views.module';
import { IRecipient } from '../models/recipient.model';
import { findIndex } from 'lodash';

@Injectable()
export class RecipientService {
  public recipientsSubject = new ReplaySubject<IRecipient[]>();
  private recipients: IRecipient[] = [];
  private viewConfig: IViewConfig;
  private rForm_backend_url: string;

  constructor(
    private injector: Injector,
    private httpClient: HttpClient
  ) {
    this.viewConfig = this.injector.get(viewConfiguration);
    this.rForm_backend_url = this.viewConfig.rForm_backend_url;
  }

  private updateRecipients(recipient: IRecipient | IRecipient[]) {
    if (recipient && recipient['length'] && recipient['length'] > 0) {
      this.recipients = recipient as IRecipient[];
    } else if (recipient) {
      if (this.recipients && this.recipients['length'] && this.recipients['length'] > 0) {
        const updatedRecipientIndex = findIndex(this.recipients as any, { role_name: recipient['role_name'] });
        if (updatedRecipientIndex !== -1) {
          this.recipients[updatedRecipientIndex] = recipient as IRecipient;
        }
      } else {
        this.recipients.push(recipient as IRecipient);
      }
    }
    this.recipientsSubject.next(this.recipients);
  }

  public getRecipients(envelopeId) {
    return this.httpClient.get(this.rForm_backend_url + `/envelopes/${envelopeId}/recipients`)
      .toPromise().then((recipients: IRecipient[]) => {
        this.updateRecipients(recipients);
        return recipients;
      }).catch(err => {
        console.error(err)
        return [];
      })
  }

  prepareRecipients(envId: string, roleName: string, recipientsToUpdate: any[]): Promise<void> {
    return this.httpClient.put(
      this.rForm_backend_url + `/envelopes/${envId}/recipients/${roleName}`,
      { action: 'prepare', recipients: recipientsToUpdate }
    ).toPromise().then((updatedRecipient: IRecipient) => {
      this.updateRecipients(updatedRecipient);
    })
  }

  updateRecipientName(envId: string, roleName: string, newFullName: string): Promise<void> {
    return this.httpClient.put(
      this.rForm_backend_url + `/envelopes/${envId}/recipients/${roleName}`,
      { action: 'update', new_full_name: newFullName }
    ).toPromise().then((updatedRecipient: IRecipient) => {
      this.updateRecipients(updatedRecipient);
    });
  }

  setAsAgreed(envId: string, roleName: string): Promise<void> {
    return this.httpClient.put(
      this.rForm_backend_url + `/envelopes/${envId}/recipients/${roleName}`,
      { action: 'update', agreed: true }
    ).toPromise().then((updatedRecipient: IRecipient) => {
      this.updateRecipients(updatedRecipient);
    });
  }

  claimProfile(envId: string, roleName: string, profileToClaim: any): Promise<void> {
    return this.httpClient.put(
      this.rForm_backend_url + `/envelopes/${envId}/recipients/${roleName}/claim`,
      { profile: profileToClaim }
    ).toPromise().then((updatedRecipient: IRecipient) => {
      this.updateRecipients(updatedRecipient);
    });
  }

  updateRecipientInfoByOwner(envelopeId: string, roleName: string, recipientInfo: { full_name: string; email: string; phone: string; }) {
    return this.httpClient.put(
      this.rForm_backend_url + `/envelopes/${envelopeId}/recipients/${roleName}`,
      { action: 'owner_update', full_name: recipientInfo.full_name, email: recipientInfo.email, phone: recipientInfo.phone }
    ).toPromise().then((updatedRecipient: IRecipient) => {
      this.updateRecipients(updatedRecipient);
      return updatedRecipient;
    });
  }

  getInPersonLink(envelopeId, roleName: string) {
    return this.httpClient.get(
      this.rForm_backend_url + `/envelopes/${envelopeId}/recipients/${roleName}?in_person_link=true`)
      .toPromise().then((inPersonLink) => {
        return inPersonLink;
      });
  }
}
