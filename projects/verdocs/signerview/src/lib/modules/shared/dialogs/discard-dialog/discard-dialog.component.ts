import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'discard-dialog',
  templateUrl: './discard-dialog.component.html',
  styleUrls: ['./discard-dialog.component.scss']
})
export class DiscardDialogComponent {
  constructor(
    private _currentDialog: MatDialogRef<DiscardDialogComponent>
  ) {}

  cancel() {
    this._currentDialog.close();
  }
  discard() {
    this._currentDialog.close({discard: true});
  }
}
