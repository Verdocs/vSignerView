import { ValidatorFn, AbstractControl } from '@angular/forms';
import { find } from 'lodash';

export function roleNameValidator(roles: any[]): ValidatorFn {
  return (control: AbstractControl): {[key: string]: boolean} | null => {
    const duplicateRoleName = find(roles, {name: control.value});
    if (!!duplicateRoleName) {
      return {'roleName': true};
    }
    return null;
  };
}