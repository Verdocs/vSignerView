import { Injectable, Inject, Injector, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';

import { VerdocsStateService } from '@verdocs/tokens';
import { IPlans, IViewConfig, viewConfiguration } from '../views.module';
import { PlansDialog } from '../modules/shared/dialogs/plan-dialogs/plans-dialog.component';

@Injectable()
export class GuardService {
  private plans: IPlans;
  private rAccount_frontend_url: string;
  private redirectUrl = null;

  constructor(
    private injector: Injector,
    private stateService: VerdocsStateService,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platform
  ) {
    const viewConfig = this.injector.get(viewConfiguration);
    this.plans = viewConfig.plans;
    this.rAccount_frontend_url = viewConfig.rAccount_frontend_url;
  }

  checkSubscription(type: string, subscriptionType: string, openDialog: boolean) {
    const idToken = this.stateService.getIDToken();
    const userId = this.toTokenObject(idToken)['sub'].slice(6);

    this.redirectUrl = `${this.rAccount_frontend_url}/rAccount/user/${userId}/billing`;

    switch (type) {
      case 'reminders':
        if (subscriptionType === this.plans['level-2'] || subscriptionType === this.plans['level-3']) {
          return true;
        } else {
          if (openDialog === true) {
            const essentialDialog = this.dialog.open(PlansDialog, {
              panelClass: 'confirmation'
            });
            essentialDialog.componentInstance.type = 'essential';
            essentialDialog.componentInstance.redirectUrl = this.redirectUrl;
          }
          return false;
        }
      case 'live-link':
      case 'attachment':
      case 'payment':
        if (subscriptionType === this.plans['level-3']) {
          return true;
        } else {
          if (openDialog === true) {
            const proDialog = this.dialog.open(PlansDialog, {
              panelClass: 'confirmation'
            });
            proDialog.componentInstance.type = 'pro';
            proDialog.componentInstance.redirectUrl = this.redirectUrl;
          }
          return false;
        }
      case 'open-free-envelopes':
        const freeDialog = this.dialog.open(PlansDialog, {
          panelClass: 'confirmation'
        });
        freeDialog.componentInstance.type = 'free';
        freeDialog.componentInstance.redirectUrl = this.redirectUrl;
        return false;
      default:
        return false;
    }
  }

  toTokenObject(accessToken) {
    if (isPlatformBrowser(this.platform)) {
      const base64Url = accessToken.split('.')[1];
      const base64 = base64Url.replace('-', '+').replace('_', '/');
      return JSON.parse(window.atob(base64));
    }
  }

  getHighestEnvelopePlan(plans) {
    let plan = null;
    for (let x = 0; x < plans.length; x++) {
      if (plans[x] === this.plans['level-3']) {
        plan = plans[x];
      } else if (plans[x] === this.plans['level-2'] && (plan === null || plan === 'env:free')) {
        plan = plans[x];
      } else if (plans[x] === this.plans['level-1'] && plan === null) {
        plan = plans[x];
      }
    }
    return plan;
  }
}
