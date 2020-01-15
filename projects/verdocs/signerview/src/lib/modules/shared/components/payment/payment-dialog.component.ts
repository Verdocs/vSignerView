import { Component, OnInit, OnDestroy, Injector } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

import { viewConfiguration, IViewConfig } from '../../../../views.module';
import { PaymentService } from '../../../../services/payment.service';

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
  public viewConfig: IViewConfig;

  private rAccount_frontend_url: string = 'https://verdocs.com/account';
  private paymentAccountSubscription = new Subscription();

  constructor(
    private injector: Injector,
    private paymentService: PaymentService,
    private dialog: MatDialogRef<PaymentDialogComponent>
  ) {
    this.viewConfig = this.injector.get(viewConfiguration);
    this.rAccount_frontend_url = this.viewConfig.rAccount_frontend_url;
  }

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
