import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { PaymentDialogComponent } from './components/payment/payment-dialog.component';

@NgModule({
  imports: [
    MatButtonModule,
    MatIconModule
  ],
  declarations: [
    PaymentDialogComponent
  ],
  entryComponents: [
    PaymentDialogComponent
  ],
  exports: [
    PaymentDialogComponent
  ]
})
export class PaymentModule {}
