import { Component, OnInit, OnDestroy, ViewChild, Compiler } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';


import { RecipientService } from 'app/core/services/recipients.service';
import { SnackbarService } from 'app/core/services/snackbar.service';

@Component({
  selector: 'prepare-dialog',
  templateUrl: './prepare-view.dialog.html',
  styleUrls: ['./prepare-view.dialog.scss']
})
export class PrepareInviteDialog implements OnInit, OnDestroy {
  private selectedIndex = -1;
  private messageSettings: any[] = [];

  public roles: any[];
  public headerTitle = 'Prepare Recipients';
  public message = '';
  public emailValidator: RegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  @ViewChild('close', { static: true }) closeButton: MatButton;

  constructor(
    private dialogRef: MatDialogRef<PrepareInviteDialog>,
    private snackbarService: SnackbarService,
    private recipientService: RecipientService,
    private compiler: Compiler
  ) { }
  ngOnInit() {
    this.closeButton.disabled = true;
    this.roles = this.roles.sort((a, b) => {
      if (a.sequence < b.sequence) {
        return -1;
      } else if (a.sequence > b.sequence) {
        return 1;
      } else {
        return 0;
      }
    });
    for (const role of this.roles) {
      if (!role.email || !role.full_name) {
        role['ifUnknown'] = true;
      }
    }
  }

  ngOnDestroy() {
    this.compiler.clearCache();
  }

  roleTracking(index, item) {
    return index;
  }

  private createSnackBar(message: string) {
    this.snackbarService.open(message, 'Ok');
  }

  openOption(i) {
    if (this.selectedIndex === i) {
      this.selectedIndex = -1;
    } else {
      this.selectedIndex = i;
    }
  }

  closeOption() {
    return;
  }

  canDelegate(i) {
    this.roles[i]['delegator'] = !this.roles[i]['delegator'];
  }

  addMessage(i) {
    this.roles[i]['message'] = '';
  }

  removeMessage(i) {
    this.roles[i]['message'] = null;
  }

  toggleMessage(i) {
    if (this.messageSettings[i] !== undefined) {
      this.messageSettings[i]['open'] = !this.messageSettings[i]['open'];
      this.messageSettings[i] = this.messageSettings[i]
    } else {
      this.messageSettings[i] = {
        open: true,
        saved: false,
      }
    }
  }

  isMsgOpen(i) {
    if (this.messageSettings[i]) {
      return this.messageSettings[i]['open'];
    };

    return false;
  }

  verifyRoles() {
    for (const role of this.roles) {
      if (role['email'] === '' || role['full_name'] === '') {
        this.createSnackBar('Please fill out all the empty fields');
        return false;
      }
    }
    return true;
  }

  submitInvite() {
    for (const role of this.roles) {
      if (!this.emailValidator.test(role.email)) {
        this.createSnackBar('Please enter a valid email');
        return;
      }
    }
    if (this.verifyRoles()) {
      const recipientsToUpdate = [];
      let preparer: any;
      for (const role of this.roles) {
        if (role['ifUnknown']) {
          recipientsToUpdate.push(role);
        }
        if (role.type === 'preparer') {
          preparer = role;
        }
        delete role['ifUnknown'];
      }
      if (recipientsToUpdate.length > 0) {
        this.recipientService.prepareRecipients(preparer.envelope_id, preparer.role_name, recipientsToUpdate);
      }
      this.dialogRef.close();
    }


  }
}
