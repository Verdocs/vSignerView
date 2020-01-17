import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

import { EnvelopeService } from '../../services/envelope.service';
import { SignatureService } from '../../services/envelope-signature.service';

import { EventTrackerService } from '@verdocs/event-tracker';

@Component({
  selector: 'decline-envelope',
  templateUrl: 'envelope-view-decline.dialog.html',
  styleUrls: ['envelope-view-decline.dialog.scss']
})
export class DeclineEnvelopeDialogComponent implements OnInit {
  private envId: string;
  private rName: string;
  public redirectReq: string;

  constructor(
    private envelopeService: EnvelopeService,
    private signatureService: SignatureService,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router,
    private eventTracker: EventTrackerService
  ) {
  }

  ngOnInit() {
    this.signatureService._envId.subscribe(id => {
      this.envId = id;
    });
    this.signatureService._rName.subscribe(role => {
      this.rName = role;
    });
  }

  decline() {
    this.envelopeService.declineEnvelope(this.envelopeService.env_id, this.envelopeService.role_name).subscribe(res => {
      this.eventTracker.createEvent({
        category: 'verdoc',
        action: 'verdoc declined',
        label: `verdoc id: ${this.envelopeService.env_id}`
      });
      if (window && this.redirectReq) {
        window.location.href = this.redirectReq + '?realAppStatus=declined';
      } else {
        this.router.navigate([`/view/sign/${this.envId}/role/${this.rName}/declined`]);
      }
      this.close();
    })
  }

  close() {
    this.dialog.closeAll();
  }

}
