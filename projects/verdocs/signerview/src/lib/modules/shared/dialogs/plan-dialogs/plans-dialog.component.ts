import { Component, OnInit } from '@angular/core'
import { Router } from '@angular/router'
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'plans-dialog',
  templateUrl: './plans-dialog.component.html',
  styleUrls: ['./plans-dialog.component.scss']
})
export class PlansDialog implements OnInit {
  public redirectUrl: string = null;
  public type: string = null;
  public dialogTitle: string = null;
  public dialogMessage: string = null;

  constructor(
    private router: Router,
    private dialog: MatDialogRef<PlansDialog>
  ) { }

  ngOnInit() {
    switch (this.type) {
      case 'free':
        this.dialogTitle = 'Upgrade to create another envelope';
        this.dialogMessage = 'We are glad to see you are drawing value from Envelopes. You have reached your limit of three envelopes per month with your free account. Please upgrade to an Essentials or Pro subscription to create more envelopes.';
        break;
      case 'essential':
        this.dialogTitle = 'Upgrade to access this feature';
        this.dialogMessage = 'This feature requires an essentials subscription or above. Please upgrade to access this feature.';
        break;
      case 'pro':
        this.dialogTitle = 'Upgrade to access this feature';
        this.dialogMessage = 'This feature requires a pro subscription. Please upgrade to access this feature.';
        break;
      default:
        this.dialog.close();
        break;
    }
  }

  goToBilling() {
    if (window) {
      window.location.href = (this.redirectUrl);
    }
  }

  close() {
    this.dialog.close();
  }
}
