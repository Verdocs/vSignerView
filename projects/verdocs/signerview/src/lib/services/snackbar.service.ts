import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatSnackBar, MatSnackBarConfig, MatSnackBarRef } from '@angular/material/snack-bar';

@Injectable()
export class SnackbarService {
  constructor(
    private snackbar: MatSnackBar,
    @Inject(PLATFORM_ID) private platform
  ) { }

  initConfig(duration?: number): MatSnackBarConfig {
    if ((isPlatformBrowser(this.platform))) {
      let snackbarConfig: MatSnackBarConfig
      if (window && window.innerWidth >= 920) {
        snackbarConfig = {
          verticalPosition: 'bottom',
          horizontalPosition: 'left',
          duration: duration ? duration : 5000
        }
      } else {
        snackbarConfig = {
          verticalPosition: 'top',
          duration: duration ? duration : 5000
        }
      }

      return snackbarConfig;
    }
  }

  open(message: string, action?, config?): MatSnackBarRef<any> {
    return this.snackbar.open(message, action ? action : undefined, config ? config : this.initConfig());
  }

  dismiss(): void {
    this.snackbar.dismiss();
  }
}
