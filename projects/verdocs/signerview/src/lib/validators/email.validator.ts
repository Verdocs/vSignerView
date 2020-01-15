import { AbstractControl } from '@angular/forms';

export class EmailValidator {
  static MatchEmail(control: AbstractControl) {
    const emailRegEx = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    const validates = emailRegEx.test(control.value);
    if (!validates) {
      return {
        email: true
      };
    } else {
      return false;
    }
  }
}
