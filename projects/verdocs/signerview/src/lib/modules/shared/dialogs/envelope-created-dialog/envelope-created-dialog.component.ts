import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'envelope-created-dialog',
  templateUrl: './envelope-created-dialog.component.html',
  styleUrls: ['./envelope-created-dialog.component.scss']
})
export class EnvelopeCreatedDialogComponent {
  constructor(
    private _currentDialog: MatDialogRef<EnvelopeCreatedDialogComponent>
  ) {}

  ok() {
    this._currentDialog.close();
  }
}