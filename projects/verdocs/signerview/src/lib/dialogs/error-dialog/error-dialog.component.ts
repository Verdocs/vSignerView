import { Component, Input, OnInit, OnChanges } from '@angular/core';
import { FieldError } from 'app/core/models/field-error.model';

import { RequiredFieldsService } from 'app/core/services/required-fields.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-field-error-dialog',
  templateUrl: './error-dialog.component.html',
  styleUrls: ['./error-dialog.component.scss']
})
export class ErrorDialogComponent implements OnInit, OnChanges {
  private errorMessagesSubject: Subscription = new Subscription();

  @Input() errors: FieldError[] = [];
  @Input() fields: any[] = [];

  constructor(
    private requiredFieldsService: RequiredFieldsService
  ) {}

  ngOnInit() {
    this.errorMessagesSubject = this.requiredFieldsService.errorMessagesSubject.subscribe((errors: any[]) => {
      this.errors = errors;
    })
    
  }

  ngOnChanges() {

  }

  jumpToField(i) {
    this.requiredFieldsService.jumpFieldKeySubject.next(this.errors[i].key);
  }
}