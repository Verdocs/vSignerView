import { Component, OnInit } from '@angular/core';
import { VerdocsTokenObjectService } from '@verdocs/tokens';
import { Router } from '@angular/router';

import { environment } from '../../../../environments/environment';

@Component({
  selector: 'four-oh-one-dialog',
  templateUrl: './four-oh-one.dialog.html',
  styleUrls: ['./four-oh-one.dialog.scss']
})
export class FourOhOneDialog implements OnInit {
  public error: any = null;
  public currentProfile: any = null;
  public error_code: string = null;
  public error_title: string = null;
  public error_message: string = null;
  public rSecureUrl = environment.rSecure_frontend_url;
  public rFormUrl = environment.frontend_url;

  constructor(
    private router: Router,
    private vTokenObjectService: VerdocsTokenObjectService
  ) { }

  ngOnInit() {
    this.currentProfile = this.vTokenObjectService.getProfile();
    if (this.error && this.error.hasOwnProperty('error')) {
      this.error_code = this.error.error.code || null;
      if (this.error_code) {
        this.prepareErroContent();
      }
    }
  }

  prepareErroContent() {
    switch (this.error_code) {
      case 'AUTH0002':
        this.error_title = 'Authorization key is missing';
        this.error_message = 'Try after ' + (this.currentProfile ? 'signing in again.' : 'signing in or signing up.');
        break;
      case 'T000001':
        this.error_title = 'This document is not accessible';
        this.error_message = (this.currentProfile ? 'Try using a different organization/account, ' : 'Try signing in, signing up, ') + 'or requesting access from the owner of this document.';
        break;
      case 'AUTH0003':
        this.error_title = 'Cannot complete your request';
        this.error_message = 'Try after ' + (this.currentProfile ? 'signing in again.' : 'signing in or signing up.');
        break;
      default:
        this.error_title = 'Your request has been denied.';
        this.error_message = null;
        break;
    }
  }

  goToDashboard() {
    this.router.navigate(['/dashboard']);
  }

  signIn() {
    if (window) {
      window.location.href = `${this.rSecureUrl}/login?redirect_url=${this.rFormUrl + this.router.url}`;
    }
  }

  signUp() {
    if (window) {
      window.location.href = `${this.rSecureUrl}/signup?redirect_url=${this.rFormUrl + this.router.url}`;
    }
  }
}
