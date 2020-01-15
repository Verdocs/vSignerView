import { Injectable, Injector } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { ReplaySubject } from 'rxjs';

import { SignatureService } from './envelope-signature.service';
import { EnvelopeService } from './envelope.service';
import { PaymentDialog } from '../dialogs/payments/payment.dialog';

@Injectable()
export class EnvelopeViewService {
  public recipientSubject = new ReplaySubject<any>();
  public jumpCoordinateSubject = new ReplaySubject<any>();
  public fieldTypeSubject = new ReplaySubject<string>();
  public pdfUrlSubject = new ReplaySubject<any>();
  public pdfBlobSubject = new ReplaySubject<any>();
  public toggleNextSubject = new ReplaySubject<boolean>();
  public viewModeSubject = new ReplaySubject<string>();
  public agreedSubject = new ReplaySubject<boolean>(1, 500);
  public attachmentsSubject = new ReplaySubject<any[]>();
  public formValiditySubject = new ReplaySubject<any[]>();
  public requestFormValiditySubject = new ReplaySubject<boolean>();
  public paymentDialog: MatDialogRef<PaymentDialog>;

  private envelopeService: EnvelopeService;

  private mode: string;
  private rName: string;

  constructor(
    private dialog: MatDialog,
    private signatureService: SignatureService
  ) {
    this.signatureService._rName.subscribe(role => {
      this.rName = role;
    });
  }

  setMode(mode) {
    this.mode = mode;
    this.viewModeSubject.next(this.mode);
  }

  setSignatureService(signatureService) {
    this.signatureService = signatureService;
  }

  setEnvelopeService(envelopeService) {
    this.envelopeService = envelopeService;
  }

  requestFormValidity(value: boolean) {
    this.requestFormValiditySubject.next(value);
  }

  setFormValidityData(value: any[]) {
    this.formValiditySubject.next(value);
  }

  openPayment(envelopeId, pageNum, fieldIndex, fields) {
    this.signatureService.setWorkingPayment(fields[pageNum][fieldIndex]);
    this.initPaymentDialog(envelopeId, pageNum, fieldIndex, fields);
  }

  private initPaymentDialog(envelopeId, pageNum, fieldIndex, fields) {
    this.paymentDialog = this.dialog.open(PaymentDialog, {
      panelClass: 'payment__dialog'
    });
    this.paymentDialog.componentInstance.paymentField = fields[pageNum][fieldIndex];
    this.paymentDialog.afterClosed().subscribe((response) => {
      this.envelopeService.inProgressSubject.next(true);
      if (!!response && !!response.token_id) {
        let amount = null;
        fields[pageNum][fieldIndex].value = response.token_id;
        this.signatureService.updateFields(fields);
        if (!!response.amount) {
          amount = response.amount;
        }
        this.signatureService.submitPayment(envelopeId, response.token_id, amount).then(updatedPayment => {
          fields[pageNum][fieldIndex].value = updatedPayment.settings.payment_id;
          this.signatureService.updateFields(fields);
          this.envelopeService.inProgressSubject.next(false);
          this.envelopeService.toggleNextSubject.next(true);
        });
      } else {
        this.envelopeService.inProgressSubject.next(false);
      }
    });
  }

  ifBelongsToPreparer(type) {
    return type === 'textbox' || type === 'date' || type === 'checkbox';
  }

  ifBelongsToCurrentRecipient(field) {
    if (this.mode === 'prepareview') {
      return this.ifBelongsToPreparer(field.controlType);
    } else {
      return field.recipientRole === this.rName;
    }
  }
}
