import { MatDialogRef } from '@angular/material/dialog';
import { Component } from '@angular/core';
import { AccountService } from '../../../../core/services/account.service';

@Component({
  selector: 'app-envelope-switch-profile-dialog',
  templateUrl: './envelope-switch-profile.dialog.html',
  styleUrls: ['./envelope-switch-profile.dialog.scss']
})
export class SwitchProfileDialogComponent {
  public profileToSwitch: string;
  public loading = false;

  constructor(
    private accountService: AccountService,
    private dialog: MatDialogRef<SwitchProfileDialogComponent>
  ) {
  }

  switch() {
    this.loading = true;
    this.accountService.switchProfile(this.profileToSwitch).then(() => {
      this.loading = false;
      this.dialog.close();
    })
  }
}