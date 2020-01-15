import { Component, OnInit, OnDestroy, Input, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { ProfileCollection, IProfile, OrganizationDialogService } from '@verdocs/profiles';
import { VerdocsStateService, VerdocsAuthGuardService, VerdocsTokenObjectService } from '@verdocs/tokens';
import { Subscription } from 'rxjs';
import { findIndex, remove, includes } from 'lodash';

import { AccountService } from '../../../services/account.service';
import { NotificationService, Notification } from '../../../services/notification.service';

import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'rangular-icons',
  templateUrl: './rangular.component.html',
  styleUrls: ['./rangular.component.scss']
})
export class RealsterComponent implements OnInit, OnDestroy {
  public apps = [];
  public emailVerified: boolean;
  public notifications: Notification[] = [];
  public profiles: ProfileCollection;
  public newProfile: any;
  public organization_id: string;
  public myAccountUrl = environment.rAccount_frontend_url;
  public rSecureUrl = environment.rSecure_frontend_url;
  public rFormUrl = environment.frontend_url;
  public termsUrl = environment.rSecure_frontend_url + '/terms';
  public privacyUrl = environment.rSecure_frontend_url + '/privacy';
  public organizationImgSrc = `${environment.rAccount_frontend_url}/assets/organization/select-profile.png`;
  public profileLoading = false;
  public hasProfile = false;
  @Input() public overrideLauncherRight = 20;
  @Input() public overrideLauncherTop = 56;
  @Input() public overrideProfileRight = 20;
  @Input() public overrideProfileTop = 56;
  @Input() public sidenav = false;
  @Input() public type = 'default';
  private notificationsSubscription = new Subscription();
  private profileLoadingSubscription = new Subscription();

  constructor(
    private vTokenStateService: VerdocsStateService,
    private vTokenObjectService: VerdocsTokenObjectService,
    private rAuthGuardService: VerdocsAuthGuardService,
    private organizationDialogService: OrganizationDialogService,
    private notificationsService: NotificationService,
    private accountService: AccountService,
    private snackbar: MatSnackBar,
    private router: Router, 
    @Inject(PLATFORM_ID) private platform
  ) { }

  ngOnInit() {
    this.prepareAppList();
    this.checkEmailVerification();
    this.hasProfile = !!this.vTokenObjectService.getProfile();
    this.accountService.userProfileSubject.subscribe(profiles => {
      this.profiles = this.accountService.getProfileCollection(profiles);
      this.accountService.profilesSubject.next(profiles);
      const index = findIndex(profiles, { organization_id: this.organization_id });
      if (index >= 0) {
        this.newProfile = profiles[index];
        this.organizationDialogService.setNewProfile(this.newProfile);
      }
    });
    this.notificationsSubscription = this.notificationsService.Notificatations().subscribe(notifications => {
      this.notifications = notifications;
    });
    this.profileLoadingSubscription = this.accountService.profileLoadingSubject.subscribe(status => {
      this.profileLoading = status;
    });

    if (!this.profiles && this.hasProfile) {
      this.accountService.getProfiles();
    }
  }

  ngOnDestroy() {
    this.notificationsSubscription.unsubscribe();
    this.profileLoadingSubscription.unsubscribe();
  }

  private prepareAppList(): string {
    this.apps = this.accountService.getApps();
    if (!this.hasAccessToAdmin()) {
      remove(this.apps, (app) => {
        return app.name === 'Admin';
      });
    }
    return null;
  }

  private checkEmailVerification(): void {
    this.emailVerified = this.vTokenStateService.getEmailVerification();
    this.organizationDialogService.setEmailVerified(this.emailVerified);
  }

  removeNotification(notification: Notification) {
    this.notificationsService.dismissNotification(notification);
  }

  signOut() {
    this.rAuthGuardService.signOut();
  }

  signIn() {
    if (isPlatformBrowser(this.platform)) {
      window.location.href = `${this.rSecureUrl}/login?redirect_url=${this.rFormUrl + this.router.url}`;
    }
  }

  switch(profile_id: string) {
    this.accountService.switchProfile(profile_id).then(() => {
      if (isPlatformBrowser(this.platform)) {
        window.location.href = `${environment.frontend_url}`;
      }
    });
  }

  switchAndGoToAdmin() {
    if (this.newProfile) {
      this.accountService.switchProfile(this.newProfile.id).then(profile => {
        if (isPlatformBrowser(this.platform)) {
          window.location.href = `${this.myAccountUrl}/admin/profile/${this.newProfile.id}`;
        }
      });
    }
  }

  updateTokenStatus(sendMessage?: boolean) {
    this.createSnackbar('Checking email verification', 'OK');
    this.accountService.updateTokens(sendMessage).then(() => {
      this.emailVerified = this.vTokenStateService.getEmailVerification();
      this.organizationDialogService.setEmailVerified(this.emailVerified);
    });
  }

  resendEmailVerification() {
    this.accountService.resendEmailVerification();
  }

  checkNameValidity(name: string) {
    return this.accountService.getNameValidity(name)
      .then(result => {
        this.organizationDialogService.setNameValidation(result);
      });
  }

  createOrganization(organizationGroup) {
    this.accountService.createOrganization(organizationGroup)
      .then(async organization => {
        this.organization_id = organization['id'];
        await this.accountService.getAccountData();
        this.createSnackbar('Organization created', null);
      });
  }

  switchProfile() {
    this.switch(this.newProfile.id);
  }

  checkAccess(clientName) {
    return this.vTokenStateService.hasAccessTo(clientName + '_Realster');
  }

  jumpTo(clientName) {
    if (isPlatformBrowser(this.platform)) {
      window.location.href = environment[clientName + '_frontend_url'];
    }
  }

  private hasAccessToAdmin() {
    const roles = this.vTokenStateService.getRAccountRoles();
    return includes(roles, 'owner') || includes(roles, 'admin');
  }

  createSnackbar(message: string, buttonTitle?: string) {
    if (!buttonTitle) {
      buttonTitle = null;
    }
    let snackbarConfig: MatSnackBarConfig
    if ((isPlatformBrowser(this.platform)) && window.innerWidth >= 920) {
      snackbarConfig = {
        verticalPosition: 'bottom',
        horizontalPosition: 'left',
        duration: 5000
      }
    } else {
      snackbarConfig = {
        verticalPosition: 'top',
        duration: 5000
      }
    }
    this.snackbar.open(message, buttonTitle, snackbarConfig);
  }

  lunchElevio() {
    window['lunchElevio']();
  }

  lunchIntercom() {
    window['lunchIntercom']()
  }
}
