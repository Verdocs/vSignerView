import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';

import { EnvelopeService } from '../../../core/services/envelope.service';
import { AccountService } from '../../../core/services/account.service';

@Component({
  selector: 'app-envelope-token',
  templateUrl: 'envelope-token.component.html'
})

export class EnvelopeTokenComponent implements OnInit {
  private source: string;
  private redirectReq: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private envService: EnvelopeService,
    private accountService: AccountService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.source = params['source'];
      this.redirectReq = params['redirectReq'];
    });
    this.route.params.subscribe(params => {
      const id = params['id'];
      const roleName = params['roleName'];
      const invite = encodeURIComponent(params['invite']);
      this.envService.setCurrentEnvelope(id);
      if (this.source === 'rCommon') {
        this.accountService.fetchToken(id, roleName, invite, this.redirectReq);
      } else {
        this.accountService.fetchToken(id, roleName, invite);
      }
    });
  }
}
