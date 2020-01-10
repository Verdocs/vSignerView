import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { VerdocsStateService } from '@verdocs/tokens';

import { EnvelopeService } from 'app/core/services/envelope.service';
import { SnackbarService } from 'app/core/services/snackbar.service';
import { DelegatedStatusDialogComponent } from 'app/shared/dialogs/delegated-dialog/status.dialog';

@Component({
  selector: 'app-envelope-delegate',
  templateUrl: 'envelope-delegate.component.html',
  styleUrls: ['envelope-delegate.component.scss']
})

export class EnvelopeDelegateComponent implements OnInit {
  public role: any = {
    full_name: '',
    email: '',
    type: 'signer'
  };
  public envelopeId: string;
  public roleName: string;
  public emailValidator: RegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  constructor(
    private router: Router,
    private dialog: MatDialog,
    private snackbarService: SnackbarService,
    private envelopeService: EnvelopeService,
    private vTokenStateService: VerdocsStateService
  ) {
    this.role = {
      full_name: '',
      email: '',
      type: 'signer'
    }
  }

  ngOnInit() {  }

  private createSnackBar(message: string) {
    this.snackbarService.open(message, 'Ok', {
      duration: 3000
    });
  }

  addMessage() {
    this.role['message'] = '';
  }
  removeMessage() {
    delete this.role.message;
  }
  toggleMessage() {
    if (this.role.hasOwnProperty('message')) {
      this.removeMessage();
    } else {
      this.addMessage();
    }
  }
  submitDelegate() {
    if (!this.emailValidator.test(this.role.email)) {
      this.createSnackBar('Please enter a valid email');
      return;
    }
    if (this.envelopeId && this.roleName) {
      this.createSnackBar('Assigning to ' + this.role.full_name);
      this.envelopeService.sendDelegate(this.envelopeId, this.role)
        .subscribe(res => {
          this.createSnackBar('Verdoc delegated to ' + this.role.full_name);
          this.vTokenStateService.removeRCookie('signer_token');
          const delegatedDialog = this.dialog.open(DelegatedStatusDialogComponent, {
            panelClass: 'statusDialog',
            disableClose: true,
            autoFocus: false
          });
          delegatedDialog.afterClosed().subscribe(() => {
            this.router.navigate([`dashboard`]);
          });
        }, (err) => {
          console.error('error happened on while trying to delegate this Verdoc');
          this.createSnackBar('Couldn\'t delegate this Verdoc');
        });
      this.dialog.closeAll();
    }
  }
}
