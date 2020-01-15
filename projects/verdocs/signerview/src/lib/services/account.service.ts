import { Injectable, Injector, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { ReplaySubject ,  Observable } from 'rxjs';
import { VerdocsStateService } from '@verdocs/tokens';
import { ProfileModel, ProfileCollection } from '@verdocs/profiles';

import { findIndex } from 'lodash';

import { environment } from '../../../environments/environment';

import { HeaderService } from './header.service';

@Injectable()
export class AccountService {
  public userDataSubject = new ReplaySubject<any>();
  public userProfileSubject = new ReplaySubject<any>();
  public profileLoadingSubject = new ReplaySubject<boolean>();
  public currentProfileSubject = new ReplaySubject<any>();
  public personalAccountSubject = new ReplaySubject<any>();
  public profilesSubject = new ReplaySubject<any>();

  private userFullname = '';
  private userInitial = '';
  private userEmail = '';
  private userPhone = '';
  private userData = {
    name: this.userFullname,
    initial: null,
    email: this.userEmail,
    phone: this.userPhone
  };
  private apps = [{
    name: 'My Account',
    src: 'assets/rAccount.svg',
    link: environment.rAccount_frontend_url
  }, {
    name: 'Envelopes',
    src: 'assets/Envelopes_64.svg',
    link: environment.frontend_url
  }, {
    name: 'Admin',
    src: 'assets/Admin.svg',
    link: environment.rAccount_frontend_url + '/admin'
  }];

  private profileData: any;
  private backend_url = environment.rAccount_backend_url;
  private currentOrganizationId: string = null;
  
  constructor(
    private http: HttpClient,
    private router: Router,
    private vTokenStateService: VerdocsStateService,
    private injector: Injector,
    private snackbar: MatSnackBar
  ) {
  }

  getAccountData() {
    const headerService = this.injector.get(HeaderService);
    headerService.noHeader.subscribe(status => {
      if (status === false) {
        this.getProfiles();
      }
    });
  }

  getProfiles() {
    return this.http.get(this.backend_url + '/profiles').toPromise().then((res: any[]) => {
      const personal = res.splice(findIndex(res, p => p.organization.name === 'realster'), 1);
      this.personalAccountSubject.next(personal[0]);
      this.profileData = res.sort((a, b) => {
        if (a.organization.name < b.organization.name) {
          return -1;
        }
        if (a.organization.name > b.organization.name) {
          return 1;
        }
        return 0;
      });
      this.profileData.unshift(personal[0]);
      const currentIndex = findIndex(this.profileData, { current: true });
      if (this.profileData[currentIndex]['first_name']) {
        this.userFullname = this.profileData[currentIndex]['first_name'] + ' ' + this.profileData[currentIndex]['last_name'];
        this.userInitial = this.profileData[currentIndex]['first_name'].charAt(0) +
          this.profileData[currentIndex]['last_name'].charAt(0);
      } else {
        this.userFullname = '';
      }
      if (this.profileData[currentIndex]['phone']) {
        this.userPhone = this.profileData[currentIndex]['phone'];
      } else {
        this.userPhone = '';
      }
      if (this.profileData[currentIndex]['email']) {
        this.userEmail = this.profileData[currentIndex]['email'];
      }
      this.userData = {
        name: this.userFullname,
        initial: this.userInitial,
        email: this.userEmail,
        phone: this.userPhone
      };
      this.userProfileSubject.next(this.profileData);
      const currentProfile = this.profileData[currentIndex];
      this.currentProfileSubject.next(currentProfile);
      this.currentOrganizationId = currentProfile.organization_id;
      this.userDataSubject.next(this.userData);
      return this.userData;
    });
  }

  getProfileCollection(profiles) {
    const profileModels: ProfileModel[] = [];
    profiles.forEach(profile => {
      profileModels.push(new ProfileModel(profile));
    });
    const profileCollection = new ProfileCollection(profileModels);
    return profileCollection;
  }

  getApps() {
    return this.apps;
  }

  removeFromProfileData(id) {
    const removeIndex = findIndex(this.profileData, { organization_id: name });
    if (removeIndex >= 0) {
      this.profileData.splice(removeIndex, 1);
      this.userProfileSubject.next(this.profileData);
    }
  }

  getAllProfiles() {
    return this.http.get<any[]>(this.backend_url + '/profiles/').toPromise();
  }

  switchProfile(profile_id) {
    this.profileLoadingSubject.next(true);
    return this.http.post(this.backend_url + '/profiles/' + profile_id + '/switch', null).toPromise().then(async (res: any) => {
      this.vTokenStateService.setTokens(res.tokens);
      this.profileLoadingSubject.next(false);
      return Promise.resolve(res);
    });
  }

  async updateTokens(sendMessage?: boolean) {
    return new Promise((resolve, reject) => {
      this.vTokenStateService.updateTokens(environment.rSecure_backend_url).subscribe(tokens => {
        if (tokens && tokens.length > 0) {
          if (sendMessage) {
            this.snackbar.dismiss();
            this.createSnackbar('Status updated');
          }
        }
        this.getAccountData();
        return resolve();
      })
    });
  }

  resendEmailVerification() {
    this.http.post(environment.rSecure_backend_url + '/user/email_verification', null).toPromise().then(() => {
      this.createSnackbar('Verification email sent');
    });
  }

  createSnackbar(message: string) {
    let snackbarConfig: MatSnackBarConfig
    if (window.innerWidth >= 920) {
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
    this.snackbar.open(message, null, snackbarConfig);
  }

  putAccountData(userData) {
    if (userData.email) {
      this.userData.email = userData.email;
    }
    if (userData.first_name && userData.last_name) {
      this.userData.name = userData.first_name + ' ' + userData.last_name;
      this.userData.initial = userData.first_name.charAt(0) + userData.last_name.charAt(0);
    }
    if (userData.phone) {
      this.userData.phone = userData.phone || '';
    }
    this.http.put(this.backend_url + '/profiles/' + userData.id, userData).toPromise().then(() => {
      this.userDataSubject.next(this.userData);
    });
  }

  deleteAccount() {
    return this.http.delete(this.backend_url).toPromise();
  }

  changePassword(email, oldPassword, newPassword) {
    return this.http.put(this.backend_url + 'updatepassword', {
      email,
      oldPassword,
      newPassword
    }).toPromise();
  }

  getNameValidity(name) {
    return this.http.get(this.backend_url + '/organizations/is_valid?name=' + name, this.getOptions())
      .toPromise()
      .then(res => {
        return Promise.resolve(res);
      });
  }

  createOrganization(body) {
    return this.http.post(this.backend_url + '/organizations', body, this.getOptions())
      .toPromise()
      .then(res => {
        return Promise.resolve(res);
      });
  }

  private getOptions(): any {
    const rTokenCookie = this.vTokenStateService.getOtherCookieObject('rAccount_Verdocs');
    const authValue = 'Bearer ' + rTokenCookie['accessToken'];
    const headers = new Headers({
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'Expires': 'Sat, 01 Jan 2000 00:00:00 GMT',
      'If-Modified-Since': '0',
      'Content-Type': 'application/json',
      'Authorization': authValue,
      'Accept': 'application/json'
    });
    return { 'headers': headers };
  }

  public fetchToken(id: string, roleName: string, invite: string, redirectReq?: string) {
    const req = environment.backend + `/envelopes/${id}/recipients/${roleName}/invitation/${invite}`;
    return this.http.get<any>(req, {observe: 'response'}).subscribe(res => {
      this.vTokenStateService.storeOtherCookie('signer_token', res['headers'].get('signer_token'));
      if (redirectReq) {
        this.router.navigate([`/view/sign/${id}/role/${roleName}`], { queryParams: { redirectReq: redirectReq } });
      } else {
        this.router.navigate([`/view/sign/${id}/role/${roleName}`]);
      }
    }, err => {
      this.router.navigate([`/view/sign/${id}/role/${roleName}`, { error: err }]);
    });
  }
}
