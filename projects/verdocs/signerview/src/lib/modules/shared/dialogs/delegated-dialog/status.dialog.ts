import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-signer-status-dialog',
  templateUrl: './status.dialog.html',
  styleUrls: ['./status.dialog.scss']
})
export class DelegatedStatusDialogComponent {
  constructor(
    private dialog: MatDialogRef<DelegatedStatusDialogComponent>
  ) {}

  close() {
    this.dialog.close();
  }
}
