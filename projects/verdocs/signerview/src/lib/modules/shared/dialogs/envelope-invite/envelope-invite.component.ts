import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormArray, FormGroup, Validators, FormControl } from '@angular/forms';

import { cloneDeep, find, remove, findIndex } from 'lodash';
import { VerdocsTokenObjectService } from '@verdocs/tokens';

import { EnvelopeService } from '../../../../services/envelope.service';
import { LiveViewService } from '../../../../services/view-data.service';
import { SnackbarService } from '../../../../services/snackbar.service';
import { EmailValidator } from '../../../../validators/email.validator';

@Component({
  selector: 'template-invite',
  templateUrl: './envelope-invite.component.html',
  styleUrls: ['./envelope-invite.component.scss'],
  encapsulation: ViewEncapsulation.None
})

export class EnvelopeInviteComponent implements OnInit {
  private selectedIndex = -1;
  private messageSettings: any[] = [];
  public myElement;
  private preparer_fullname;
  private preparer_email;

  public template: any;
  public message = '';
  public headerTitle = 'Create Envelope';
  public roles = [
    { type: '', name: '', full_name: '', email: '', sequence: 1, message: '' }
  ];
  public rolesGroup: FormGroup = this.fb.group({
    rolesArray: this.fb.array([])
  });
  public preparerRole: any;
  public isLiveView = false;
  public ifSelfPrepare = false;
  public ifPrepared = false;
  public templateToken = null;
  public emailValidator: RegExp = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  public inviteInProgress = false;

  constructor(
    private envelopeService: EnvelopeService,
    private snackbarService: SnackbarService,
    private dialog: MatDialogRef<EnvelopeInviteComponent>,
    private liveViewService: LiveViewService,
    private vTokenObjectService: VerdocsTokenObjectService,
    private fb: FormBuilder
  ) {
  }

  ngOnInit(): void {
    if (!this.isLiveView) {
      const profile = this.vTokenObjectService.getProfile();
      this.preparer_fullname = `${profile.first_name} ${profile.last_name}`;
      this.preparer_email = profile.email;
      this.preparerRole = {
        type: 'preparer',
        name: 'preparer',
        full_name: this.preparer_fullname,
        email: this.preparer_email,
        sequence: 0,
        delegator: false
      };
    }
    const roles = cloneDeep(this.template.roles);
    this.roles = roles.sort((a, b) => {
      if (a.sequence < b.sequence) {
        return -1;
      } else if (a.sequence > b.sequence) {
        return 1;
      } else {
        return 0;
      }
    });
    this.prepareRoles();
  }

  prepareRoles() {
    this.rolesGroup = this.fb.group({
      rolesArray: this.fb.array([])
    });
    if (this.roles.length > 0) {
      for (const role of this.roles) {
        this.addRoles(role);
      }
    }
    this.rolesGroup.valueChanges.subscribe(value => {
      this.roles = this.rolesGroup.getRawValue().rolesArray;
    });
  }

  addRoles(role) {
    this.rolesArray.push(this.fb.group({
      type: [role ? role.type : ''],
      name: [role ? role.name : '', [Validators.required]],
      full_name: [{
        value: role.full_name ? role.full_name : '', disabled: this.isOriginallyFilled(role.name, 'full_name')
          && role.sequence > 0
      }, [Validators.required]],
      email: [{ value: role.email ? role.email : '', disabled: this.isOriginallyFilled(role.name, 'email') && role.sequence > 0 },
      [Validators.required, Validators.email, EmailValidator.MatchEmail]],
      sequence: [role ? role.sequence : null, [Validators.required]],
      delegator: [role && role.delegator ? true : false, [Validators.required]],
      message: [role ? role.message : '']
    }));
  }

  isOriginallyFilled(roleName, propertyName) {
    const role = find(this.template.roles, { name: roleName });
    if (role) {
      return !!role[propertyName];
    } else {
      return false;
    }
  }

  roleTracking(index, item) {
    return index;
  }

  private createSnackBar(message: string) {
    this.snackbarService.open(message, 'Ok');
  }

  openOption(i) {
    if (this.selectedIndex === i) {
      this.selectedIndex = -1;
    } else {
      this.selectedIndex = i;
    }
  }

  closeOption() {
    this.inviteInProgress = false;
    this.dialog.close();
  }

  submitInvite() {
    if (this.validateAllFormFields()) {
      if (this.inviteInProgress === false) {
        this.inviteInProgress = true;
        if (this.rolesGroup.valid) {
          const body = {
            template_id: this.template.id,
            roles: this.rolesGroup.getRawValue().rolesArray
          };

          if (this.isLiveView && this.templateToken) {
            this.liveViewService.createLiveViewEnvelope(body, this.templateToken)
              .then(res => {
                this.goToEnvelopeView(res);
                this.closeOption();
              })
              .catch((err) => {
                console.error({
                  message: 'Failed to createLiveViewEnvelope',
                  detail: err
                });
                this.inviteInProgress = false;
              });
          } else {
            this.envelopeService.sendInvite(body)
            .subscribe(envelope => {
              this.goToEnvelopeView(envelope);
            },
            (err) => {
              console.error({
                message: 'Failed to create Envelope',
                detail: err
              });
            });
          }
        }
      }
    }
  }

  validateAllFormFields() {
    for (const roleGroup of this.rolesArray.controls) {
      Object.keys(roleGroup['controls']).forEach(role => {
        const control = roleGroup.get(role);
        if (control instanceof FormControl) {
          control.markAsTouched({ onlySelf: true });
        }
      });
    }
    if (this.ifPrepared) {
      const preparer = find(this.roles, { type: 'preparer' });
      if (!preparer.full_name || !preparer.email) {
        this.createSnackBar('Preparer full name or email cannot be missing');
        return false;
      } else if (!this.emailValidator.test(preparer.email)) {
        this.createSnackBar('Please enter a valid email');
        return false;
      }
    } else {
      for (const role of this.roles) {
        if (!role.full_name || !role.email) {
          this.createSnackBar('Recipients info needs to be complete before submission');
          return false;
        } else if (!this.emailValidator.test(role.email)) {
          this.createSnackBar('Please enter a valid email');
          return false;
        }
      }
    }

    return true;
  }

  canDelegate(i) {
    this.roles[i]['delegator'] = !this.roles[i]['delegator'];
  }

  addMessage(i) {
    this.roles[i]['message'] = '';
    this.messageSettings[i] = {
      open: true,
      saved: false,
    }
  }

  updateMessage(i, value) {
    this.roles[i]['message'] = value;
  }

  removeMessage(i) {
    delete this.roles[i]['message'];
    this.messageSettings[i]['open'] = false;
  }

  toggleMessage(i) {
    this.messageSettings[i]['open'] = !this.messageSettings[i]['open'];
    this.messageSettings[i] = this.messageSettings[i];
  }

  isMsgOpen(i) {
    if (this.messageSettings[i]) {
      return this.messageSettings[i]['open'];
    }
    return false;
  }

  get rolesArray(): FormArray {
    return this.rolesGroup.controls.rolesArray as FormArray;
  }

  private goToEnvelopeView(envelope) {
    if (window) {
      const recipient = find(envelope.recipients, (r) => {
        return r.role_name === this.roles[0].name
      });
      window.location.href = window.location.origin +
        `/view/sign/${envelope.id}/roleName/${recipient.role_name}/invitation/${encodeURIComponent(recipient.token)}`;
    }
  }

  updatePrepared($event) {
    this.ifPrepared = $event.checked;
    if (this.ifPrepared) {
      this.ifSelfPrepare = true;
      this.roles.unshift(this.preparerRole);
      this.prepareRoles();
    } else {
      remove(this.roles, { type: 'preparer' });
      this.prepareRoles();
    }
  }

  updatePreparer($event) {
    this.ifSelfPrepare = $event.checked;
    const role = find(this.roles, { type: 'preparer' });
    const roles = this.rolesGroup.getRawValue().rolesArray;
    const preparerIndex = findIndex(roles, { type: 'preparer' });
    if (this.ifSelfPrepare) {
      role.full_name = this.preparer_fullname;
      role.email = this.preparer_email;
      this.rolesArray.at(preparerIndex).patchValue({
        full_name: this.preparer_fullname,
        email: this.preparer_email
      });
      this.rolesGroup.updateValueAndValidity();
    } else {
      role.full_name = '';
      role.email = '';
      roles.shift();
      this.rolesArray.at(preparerIndex).patchValue(role);
      this.rolesGroup.updateValueAndValidity();
    }
  }
}
