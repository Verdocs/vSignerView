import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

@Injectable()
export class PaymentService {

  private payment_backend_url = environment.rPayment_backend_url + '/accounts';

  constructor(
    private http: HttpClient
  ) {}

  getAccounts() {
    return this.http.get(this.payment_backend_url)
      .pipe(map(accounts => accounts));
  }
}
