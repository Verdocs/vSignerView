import { EnvelopeViewComponent } from './envelope-view.component';
import { EnvelopeService } from 'app/core/services/envelope.service';
import { EnvelopeViewService } from 'app/core/services/envelope-view.service';
import { SignatureService } from 'app/core/services/envelope-signature.service';
import { AccountService } from 'app/core/services/account.service';
import { Broadcast } from 'app/core/services/broadcast';
import { VerdocsAuthService, VerdocsTokenObjectService } from '@verdocs/tokens';
import { PrepareInviteDialog } from '../dialogs/prepare/prepare-view.dialog';
import { SwitchProfileDialogComponent } from '../dialogs/switchProfile/envelope-switch-profile.dialog';
import { IRecipient } from 'app/core/models/recipient.model';
import { RecipientService } from 'app/core/services/recipients.service';
import { Envelope } from 'app/core/models/envelope.model';
import { SnackbarService } from 'app/core/services/snackbar.service';
import { EventTrackerService } from '@verdocs/event-tracker';
import { PageService } from 'app/core/services/page.service';
import { TestBed } from '@angular/core/testing';

beforeEach(() => {
  // TestBed.configureTestingModule({
  //   declarations: [EnvelopeViewComponent]
  // })
});
