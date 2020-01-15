import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

import { viewConfiguration, IViewConfig } from '../views.module';

@Injectable()
export class PaymentService {

  private payment_backend_url;

  constructor(
    private injector: Injector,
    private http: HttpClient
  ) {
    const viewConfig: IViewConfig = this.injector.get(viewConfiguration);
    this.payment_backend_url = viewConfig.rPayment_backend_url;
  }

  getAccounts() {
    return this.http.get(`${this.payment_backend_url}/accounts`)
      .pipe(map(accounts => accounts));
  }
}
