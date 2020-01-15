import { AbstractControl } from '@angular/forms';
import { simpleE164Validator } from '../functions/country-code'

export class PhoneValidator {
  static MatchPhone(control: AbstractControl) {
    const validates = simpleE164Validator(control.value);
    if (!validates) {
      return {
        phone: true
      }
    }
    return false;
  }
}
