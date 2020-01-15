import { Injectable } from '@angular/core';
import { ReplaySubject } from 'rxjs';
import { findIndex } from 'lodash';

@Injectable()
export class RequiredFieldsService {

  private _requiredFieldsSubject = new ReplaySubject<any[]>(100, 10);
  private _currentRoleFieldsSubject = new ReplaySubject<any[]>(100, 10);
  private _formGroupFieldsSubject = new ReplaySubject<any[]>(1, 10);
  private _errorMessagesSubject = new ReplaySubject<any[]>(1, 100);
  private _jumpFieldKeySubject = new ReplaySubject<string>(1, 100);
  private _requiredFields: any[];
  private _formGroupFields: any;
  private _currentRoleFields: any[];
  private _errors: any[] = [];
  private _currentFieldKey: string = '';
  private _jumpSequence = -1;

  get requiredFieldsSubject() {
    return this._requiredFieldsSubject;
  }

  get currentRoleFieldSubject() {
    return this._currentRoleFieldsSubject;
  }

  get requiredFields() {
    return this._requiredFields;
  }

  setRequiredFields(requiredFields, validators) {
    this._requiredFields = requiredFields;
    if (this._formGroupFields) {
      this.checkForErrors(validators);
    }
    this._requiredFieldsSubject.next(this._requiredFields);
  }

  set currentRoleFields(currentRoleFields) {
    this._currentRoleFields = currentRoleFields;
    this._currentRoleFieldsSubject.next(this._currentRoleFields);
  }

  get formGroupFields() {
    return this._formGroupFields;
  }

  set formGroupFields(formGroupFields) {
    this._formGroupFields = formGroupFields;
    this._formGroupFieldsSubject.next(this._formGroupFields);
  }

  get errorMessagesSubject() {
    return this._errorMessagesSubject;
  }

  set errorMessages(errorMessages) {
    this._errorMessagesSubject.next(this._errors);
  }

  get currentRequiredFieldKey() {
    return this._currentFieldKey;
  }

  set currentRequiredFieldKey(key: string) {
    this._currentFieldKey = key;
  }

  get currentRequiredFieldIndex() {
    return this.currentRequiredFieldIndex;
  }

  set currentRequiredFieldIndex(currentRequiredFieldIndex: number) {
    this.currentRequiredFieldIndex = currentRequiredFieldIndex;
  }

  get jumpFieldKeySubject() {
    return this._jumpFieldKeySubject;
  }

  get jumpSequence() {
    return this._jumpSequence;
  }

  set jumpSequence(jumpSequence: number) {
    this._jumpSequence = jumpSequence;
  }

  checkRequiredFieldCompleteStatus(requiredField, fieldFormControl, mode) {
    switch (requiredField.type) {
      case 'checkbox_group':
        if (requiredField.min <= requiredField.checked.length && requiredField.max >= requiredField.checked.length) {
          return true;
        }
        return false;
      case 'radio_button_group':
        return requiredField.selected.length === 1;
      case 'dropbox':
        return !!requiredField.value;
      case 'textbox':
        if (mode === 'signerview') {
          return (requiredField.value !== '' || (requiredField.dirty)) && (fieldFormControl.errors ? !fieldFormControl.errors['pattern'] && !fieldFormControl.errors['maxlength'] : true) && fieldFormControl.valid;
        }
        return !(fieldFormControl && fieldFormControl.errors);
      case 'signature':
      case 'initial':
        if (mode === 'signerview') {
          return requiredField.value
        }
      case 'timestamp':
        return true;
      default:
        const errorIndex = findIndex(this._errors, { field_name: requiredField.field_name });
        if (requiredField.validator) {
          if (fieldFormControl.errors && (fieldFormControl.errors['pattern'])) {
            return false;
          }
        }
        return requiredField.value != '' && requiredField.value !== null && errorIndex < 0;
    }
  }

  checkForErrors(validators) {
    this._errors = [];
    for (const field of this._requiredFields) {
      const checkIndex = findIndex(this._errors, { field_name: field.field_name });
      const formControl = this._formGroupFields.controls[field.key]
      let errorMessage = { message: '', field_name: '', key: '' };
      if (field.dirty || field.prepared) {
        if (checkIndex < 0) {
          switch (field.type) {
            case 'checkbox_group':
              if (field.checked.length < field.min) {
                errorMessage.message = `Minimum requirement of ${field.min} is not met.`;
                errorMessage.field_name = field.field_name;
                errorMessage.key = field.key;
              } else if (field.checked.length > field.max) {
                errorMessage.message = `Maximum requirement of ${field.max} is exceeded.`;
                errorMessage.field_name = field.field_name;
                errorMessage.key = field.key;
              }
              break;
            case 'radio_button_group':
              if (field.selected.length < 1) {
                errorMessage.message = 'Selection is required.';
                errorMessage.field_name = field.field_name;
                errorMessage.key = field.key;
              }
              break;
            case 'dropdown':
              if (!field.value) {
                errorMessage.message = 'Selection is required.';
                errorMessage.field_name = field.field_name;
                errorMessage.key = field.key;
              }
              break;
            case 'signature':
              if (!field.value) {
                errorMessage.message = 'Signature is required.';
                errorMessage.field_name = field.field_name;
                errorMessage.key = field.key;
              }
              break;
            case 'initial':
              if (!field.value) {
                errorMessage.message = 'Initial is required.';
                errorMessage.field_name = field.field_name;
                errorMessage.key = field.key;
              }
              break;
            case 'date':
              if (!field.value) {
                errorMessage = { message: 'This field is required. Please select a date.', field_name: field.field_name, key: field.key };
              }
              break;
            case 'payment':
              if (!field.value) {
                errorMessage = { message: 'Payment is required.', field_name: field.field_name, key: field.key };
              }
              break;
            case 'attachment':
              if (!field.value) {
                errorMessage = { message: 'An attachment is required. Please select a file to attach.', field_name: field.field_name, key: field.key }
              }
              break;
            case 'textbox':
              if (field.validator === 'email' && !validators.validatorsObject['email'].test(field.value)) {
                errorMessage = { message: 'Please enter a valid email.', field_name: field.field_name, key: field.key };
              } else if (field.validator === 'phone_number' && !validators.validatorsObject['phone_number'].test(field.value)) {
                errorMessage = { message: 'Please enter a valid phone number.', field_name: field.field_name, key: field.key };
              } else if (!field.value) {
                errorMessage = { message: 'This field is required. Enter N/A if not applicable.', field_name: field.field_name, key: field.key };
              } else if (formControl['errors'] && formControl['errors']['maxlength']) {
                errorMessage = { message: 'Number of characters are over the limit.', field_name: field.field_name, key: field.key };
              }
              break;
            default:
              if (!field.value) {
                errorMessage = { message: 'This field is required. Enter N/A if not applicable.', field_name: field.field_name, key: field.key };
              }
              break;
          }
          if (errorMessage.message !== '') {
            this._errors.unshift(errorMessage)
          } else {
            if (formControl.valid) {
  
              const errorIndex = findIndex(this._errors, {field_name: errorMessage.field_name, key: errorMessage.key});
              this._errors.splice(errorIndex, 1);
            }
          }
        }
      } else {
        if (checkIndex > -1) {
          this._errors.splice(checkIndex, 1);
        }
      }
    }
    if (this._errors && this._errors.length >= 0) {
      this.errorMessages = this._errors;
    }
  }

  goToNextRequiredField() {
    let roleFieldIndex = findIndex(this._currentRoleFields, { key: this._currentFieldKey });
    let requiredFieldIndex = findIndex(this._requiredFields, { key: this._currentFieldKey });
    if (roleFieldIndex === -1 && requiredFieldIndex === -1) {
      if (this._requiredFields && this._requiredFields[0]) {
        this._currentFieldKey = this._requiredFields[0].key;
        this._jumpFieldKeySubject.next(this._currentFieldKey);
      }
    } else if (requiredFieldIndex > -1) {
      if (requiredFieldIndex < this._requiredFields.length - 1) {
        this._currentFieldKey = this._requiredFields[++requiredFieldIndex].key;
        this._jumpFieldKeySubject.next(this._currentFieldKey);
      } else {
        this._currentFieldKey = this._requiredFields[0].key;
        this._jumpFieldKeySubject.next(this._currentFieldKey);
      }
    } else if (roleFieldIndex > -1 && requiredFieldIndex === -1) {
      if (this._requiredFields && this._requiredFields.length === 1) {
        this._currentFieldKey = this._requiredFields[0].key;
        this._jumpFieldKeySubject.next(this._currentFieldKey);
      } else {
        if (roleFieldIndex > -1) {
          for (let fieldIndex = roleFieldIndex; fieldIndex < this._currentRoleFields.length; fieldIndex++) {
            for (let { requiredField, index } of this._requiredFields.map((requiredField, index) => ({ requiredField, index }))) {
              if (this._currentRoleFields[fieldIndex].field_name == requiredField.field_name) {
                this._currentFieldKey = this._requiredFields[index].key;
                return this._jumpFieldKeySubject.next(this._currentFieldKey);
              }
            }
          }
          this._currentFieldKey = this._requiredFields[0].key;
          this._jumpFieldKeySubject.next(this._currentFieldKey);
        } else {
          this._currentFieldKey = this._requiredFields[0].key;
          this._jumpFieldKeySubject.next(this._currentFieldKey);
        }
      }
    }
  }
}
