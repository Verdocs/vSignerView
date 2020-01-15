import {
  Component,
  OnInit,
  AfterContentInit,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { environment } from '../../../../../environments/environment';

import { EnvelopeService } from '../../services/envelope.service';
import { SnackbarService } from '../../services/snackbar.service';

@Component({
  selector: 'app-stripe-dialog',
  templateUrl: './payment.dialog.html',
  styleUrls: ['./payment.dialog.scss']
})
export class PaymentDialog implements OnInit, AfterContentInit, OnDestroy {

  public cardNumber: any;
  public cardExpiry: any;
  public cardCvc: any;
  public postalCode: any;
  public elementsOptions = {
    locale: 'en'
  };
  public paymentField;
  public errorMessage = '';
  public stripeForm: FormGroup;
  public eventHandler = this.onChange.bind(this);
  public currency: string;
  public stripe = Stripe(environment.stripe_publishable_key);
  public elements = this.stripe.elements();

  constructor(
    private fb: FormBuilder,
    private envelopeService: EnvelopeService,
    private snackbarService: SnackbarService,
    private dialog: MatDialogRef<PaymentDialog>,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    if (this.paymentField && this.paymentField['settings']) {
      this.currency = this.toMoneyString(this.paymentField.settings.amount);
    }
    this.stripeForm = this.fb.group({
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      state: ['', [Validators.required]],
    });
  }

  ngAfterContentInit() {
    const elementStyles = {
      base: {
        color: '#222',
        fontWeight: 300,
        fontFamily: 'Roboto, Sans-serif',
        fontSize: '16px',
        fontSmoothing: 'antialiased',
        '::placeholder': {
          color: '#CFD7DF',
        },
        ':-webkit-autofill': {
          color: '#e39f48',
        },
      },
      invalid: {
        color: '#E25950',

        '::placeholder': {
          color: '#FFCCA5',
        },
      }
    };
    const elementClasses = {
      focus: 'focused',
      empty: 'empty',
      invalid: 'invalid'
    };
    this.cardNumber = this.elements.create('cardNumber', {
      style: elementStyles,
      classes: elementClasses
    });
    this.cardExpiry = this.elements.create('cardExpiry', {
      style: elementStyles,
      classes: elementClasses
    });
    this.cardCvc = this.elements.create('cardCvc', {
      style: elementStyles,
      classes: elementClasses
    });
    this.postalCode = this.elements.create('postalCode', {
      style: elementStyles,
      placeholder: '10038',
      classes: elementClasses
    })
    this.cardNumber.mount('#payment-card-number');
    this.cardExpiry.mount('#payment-card-expiry');
    this.cardCvc.mount('#payment-card-cvc');
    this.postalCode.mount('#payment-zip');
    this.cardNumber.on('change', this.onChange.bind(this));
    this.cardExpiry.on('change', this.onChange.bind(this));
    this.cardCvc.on('change', this.onChange.bind(this));
    this.postalCode.on('change', this.onChange.bind(this));
  }

  ngOnDestroy() {
    this.cardNumber.destroy();
    this.cardExpiry.destroy();
    this.cardCvc.destroy();
    this.postalCode.destroy();
  }

  toMoneyString(amount) {
    if (!!this.paymentField.settings.if_transfer_fee) {
      return '$' + (amount * 1.01).toFixed(2);
    } else {
      return '$' + amount.toFixed(2);
    }
  }

  inputFocus(event) {
    event.target.classList.add('focused');
  }

  inputBlur(event) {
    event.target.classList.remove('focused');
  }

  onChange(event) {
    if (event && !!event.error) {
      this.errorMessage = event.error.message;
    } else {
      this.errorMessage = '';
    }
    this.cdr.detectChanges();
  }

  inputKeyup(event) {
    const value = event.target.value;
    if (value && value.length > 0) {
      event.target.classList.remove('empty');
    } else {
      event.target.classList.add('empty');
    }
  }

  async buy() {
    if (this.paymentField.settings['payment_id']) {
      this.snackbarService.open('Payment has been done already', 'OK');
      this.dialog.close(null);
    } else {
      this.envelopeService.inProgressSubject.next(true);
      const address = this.stripeForm.get('address').value;
      const city = this.stripeForm.get('city').value;
      const state = this.stripeForm.get('state').value;
      const { token, error } = await this.stripe
        .createToken(this.cardNumber, {
          address_line1: address,
          address_city: city,
          address_state: state
        })
      if (error) {
        this.snackbarService.open('Processing error: ' + error.message, 'OK');
      } else {
        this.dialog.close({ token_id: token.id });
      }
    }
  }
}
