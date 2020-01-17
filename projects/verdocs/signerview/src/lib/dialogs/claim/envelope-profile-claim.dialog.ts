import { find } from 'lodash';

import { MatDialog } from '@angular/material/dialog';
import { Component, OnInit } from '@angular/core';

import { AccountService } from '../../services/account.service';
import { RecipientService } from '../../services/recipients.service';
import { VerdocsStateService } from '@verdocs/tokens';

@Component({
  selector: 'app-profile-claim',
  templateUrl: './envelope-profile-claim.dialog.html',
  styleUrls: ['./envelope-profile-claim.dialog.scss']
})
export class ClaimDialogComponent implements OnInit {
  public profiles = [];
  public currentProfile: any;
  public recipient: any;
  public loading = false;

  constructor(
    private accountService: AccountService,
    private recipientService: RecipientService,
    private stateService: VerdocsStateService,
    private dialog: MatDialog
  ) {

  }

  ngOnInit() {
    this.currentProfile = find(this.profiles, { current: true });
  }

  profileTracking(index, item) {
    return index;
  }

  chooseProfile(profileId: string) {
    this.currentProfile = find(this.profiles, {
      id: profileId
    });
  }

  claimAsGuest() {
    this.currentProfile = { id: 'guest' };
  }

  async claimProfile() {
    if (this.claimProfile && this.currentProfile['id'] !== 'guest') {
      const profile = find(this.profiles, { id: this.currentProfile.id });
      if (!profile.current) {
        this.loading = true;
        await this.accountService.switchProfile(this.currentProfile.id);
      }
      this.loading = false;
      this.stateService.removeRCookie('signer_token');
      await this.claim({
        id: this.currentProfile.id, email: this.currentProfile.email,
        full_name: `${this.currentProfile.first_name} ${this.currentProfile.last_name}`
      });
    } else {
      this.stateService.removeRCookies();
      await this.claim({ id: 'guest' })
    }
    this.loading = false;
    this.dialog.closeAll();
  }

  claim(profileToClaim: any) {
    return this.recipientService.claimProfile(this.recipient.envelope_id, this.recipient.role_name, profileToClaim);
  }

  getProfileName() {
    if (this.currentProfile && this.currentProfile['organization']) {
      return this.currentProfile.organization.name === 'realster' ? 'Personal' : this.currentProfile.organization.name
    } else {
      return 'Sign as a guest'
    }
  }

  markChecked(index: number) {
    if (this.currentProfile && this.currentProfile['organization']) {
      return this.profiles[index].organization.name === this.currentProfile.organization.name;
    } else {
      return false;
    }
  }
}
