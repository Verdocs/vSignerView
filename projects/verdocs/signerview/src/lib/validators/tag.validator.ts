import { AbstractControl, ValidatorFn, FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import {findIndex} from 'lodash';
import {ErrorStateMatcher} from '@angular/material/core'

export class TagValidator {
  static MatchTag(control: AbstractControl) {
    const tagRegEx = /^[a-zA-Z0-9-]{0,32}$/;
    const patternValidation = tagRegEx.test(control.value);
    if (!patternValidation) {
      return { textPattern: true };
    }
    return null;
  }
}

export function TagDuplicateValidator(tags: any[]): ValidatorFn {
  return (control: AbstractControl): {[key: string]: boolean} | null => {
    const duplicateIndex = findIndex(tags, {tag_name: control.value});
    return duplicateIndex > -1 ? {duplicate: true} : null;
  }
}

export class TagErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(control: FormControl | null, form: FormGroupDirective | NgForm | null): boolean {
    return !(control && control.invalid && (control.dirty || control.touched))
  }
}
