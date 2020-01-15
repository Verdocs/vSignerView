import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReplaySubject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { regParse } from '../functions/utils';


@Injectable()
export class ValidatorService {
  private validators: any[] = [];
  private validatorsObject: any = {};

  constructor(
    private http: HttpClient
  ) { }

  public getValidatorsArray() {
    if (this.validators && this.validators.length > 0) {
      return this.validators;
    } else {
        return this.http.get(environment.backend + '/validators').toPromise().then((response: any[]) => {
        this.validators = response;
        return this.validators as any[];
      }, (err) => {
        return null;
      });
    }
  }

  public async getValidatorsObject() {
    this.validatorsObject = {};
    await this.getValidatorsArray();
    for (let i = 0; i < this.validators['length']; i++) {
      const name = this.validators[i]['name'];
      this.validatorsObject[name] = regParse(this.validators[i]['regex']);
    }
    return this.validatorsObject;
  }
}
