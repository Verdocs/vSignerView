import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { PaymentService } from '../../../../services/payment.service';
import { environment } from '../../../../environments/environment'

@Component({
  selector: 'app-payment-dialog',
  templateUrl: './payment-dialog.component.html',
  styleUrls: ['./payment-dialog.component.scss']
})
export class PaymentDialogComponent implements OnInit, OnDestroy {
  public paymentAccounts: any[] = [];
  public rAccountUserId: string;
  public templateId: string;
  public accounts: any;

  private rAccount_frontend_url: string = environment.rAccount_frontend_url;
  private paymentAccountSubscription = new Subscription();
  constructor(
    private paymentService: PaymentService,
    private dialog: MatDialogRef<PaymentDialogComponent>
  ) { }

  ngOnInit() {
    this.paymentAccountSubscription = this.paymentService.getAccounts().subscribe(accounts => {
      this.accounts = accounts;
    });
  }

  ngOnDestroy() {
    this.paymentAccountSubscription.unsubscribe();
  }

  close() {
    this.dialog.close();
  }

  connectNewAccount() {
    if (window) {
      window.location.href = this.rAccount_frontend_url + '/rAccount/user/' + this.rAccountUserId +
        `/integrations?redirect=/builder/${this.templateId}/fields`;
    }
  }
}
