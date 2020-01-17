import { Directive, HostListener, EventEmitter, Output, Input } from '@angular/core';

import { VerdocsStateService } from '@verdocs/tokens';
import { GuardService } from '../../../services/guard.service';

@Directive({
  selector: '[subscription-guard]'
})
export class SubscriptionGuardDirective {
  
  @Output('subscription-guard') subscriptionGuard: EventEmitter<any> = new EventEmitter();
  @Input() type: string = null;
  constructor(
    private stateService: VerdocsStateService,
    private guardService: GuardService
  ) { }
  @HostListener('click',['$event']) onclick($event){
    const plans = this.stateService.getPlans();
    const subscriptionType = this.guardService.getHighestEnvelopePlan(plans);
    this.subscriptionGuard.emit(this.guardService.checkSubscription(this.type, subscriptionType, true));
  }
}
