import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';
import { VerdocsTokenObjectService } from '@verdocs/tokens';
import { TemplatesService } from './templates.service';
import { EnvelopeService } from './envelope.service';
import { ITimePeriod, SortOptions } from '../models/envelope_search.model';
import { timePeriod } from '../functions/filter';
import { getIncompleteRecipients, getSelfEnvelopeTokenLink } from '../functions/dashboard';

@Injectable()
export class DashboardService {

  private recentEnvelopesStatusSubject: BehaviorSubject<any> = new BehaviorSubject<any>({});
  private quickviewSubject: BehaviorSubject<any> = new BehaviorSubject<any>({});

  public envelopeStatusSubject = this.recentEnvelopesStatusSubject.asObservable();
  public quickviewStatusSubject = this.quickviewSubject.asObservable();
  public triggerRefreshSubject = new BehaviorSubject<boolean>(false);

  public templateSortWorker: Worker;
  public timePeriodWorkers: Worker[] = [];
  public incompleteRecipientWorker: Worker;
  public currentUserEmail;

  constructor(
    private templateService: TemplatesService,
    private envelopeService: EnvelopeService,
    private verdocsTokenObjectService: VerdocsTokenObjectService
  ) {
    const profile = this.verdocsTokenObjectService.getProfile()
    this.currentUserEmail = profile ? profile.email : '';
  }

  getTemplates() {
    return this.templateService.getTemplates();
  }

  getEnvelopes() {
    return this.envelopeService.getAllEnvelopes();
  }

  getRecentEnvelopes(pageNum: number) {
    return this.envelopeService.getRecentActivities(pageNum);
  }

  getEnvelopesStatus(filterTime?: ITimePeriod) {
    const recentEnvelopesStatus = {
      all: 0,
      inbox: 0,
      sent: 0,
      archived: 0
    }
    const all = this.getAllStatus(filterTime);
    const inbox = this.getInboxStatus(filterTime);
    const sent = this.getSentStatus(filterTime);
    forkJoin([
      all,
      inbox,
      sent
    ]).subscribe(([_all, _inbox, _sent]) => {
      recentEnvelopesStatus['all'] = _all;
      recentEnvelopesStatus['inbox'] = _inbox;
      recentEnvelopesStatus['sent'] = _sent;
      this.recentEnvelopesStatusSubject.next(recentEnvelopesStatus);
    })
  }

  getQuickViewStatus(filterTime?: ITimePeriod) {
    const quickViewStatus = {
      completed: 0,
      waiting_on_others: 0,
      action_required: 0
    }
    const completed = this.getCompletedStatus(filterTime);
    const action_required = this.getActionRequiredStatus(filterTime);
    const waiting_on_others = this.getWaitingOnOthersStatus(filterTime);
    forkJoin([
      completed,
      action_required,
      waiting_on_others
    ]).subscribe(([_completed, _action_required, _waiting_on_others]) => {
      quickViewStatus['completed'] = _completed;
      quickViewStatus['action_required'] = _action_required;
      quickViewStatus['waiting_on_others'] = _waiting_on_others;
      this.quickviewSubject.next(quickViewStatus);
    });
  }

  getSentStatus(filterTime?: ITimePeriod): Observable<number> {
    return this.envelopeService.filterSearchBy('sent', null, null, null, filterTime, 'created_at' as SortOptions)
      .pipe(
        map(filterResult => {
          if (filterResult instanceof HttpResponse) {
            if (filterResult['body']) {
              return filterResult['body']['total'];
            }
          }
        })
      );
  }

  getAllStatus(filterTime?: ITimePeriod): Observable<number> {
    return this.envelopeService.filterSearchBy('all', null, null, null, filterTime, 'created_at' as SortOptions)
      .pipe(
        map((filterResult) => {
          if (filterResult instanceof HttpResponse) {
            if (filterResult['body']) {
              return filterResult['body']['total'];
            }
          }
        })
      );
  }

  getInboxStatus(filterTime?: ITimePeriod): Observable<number> {
    return this.envelopeService.filterSearchBy('inbox', null, null, null, filterTime, 'created_at' as SortOptions)
      .pipe(
        map(filterResult => {
          if (filterResult instanceof HttpResponse) {
            if (filterResult['body']) {
              return filterResult['body']['total'];
            }
          }
        })
      );
  }

  getCompletedStatus(filterTime: ITimePeriod): Observable<number> {
    return this.envelopeService.filterSearchBy('completed', null, null, null, filterTime, 'updated_at' as SortOptions)
      .pipe(
        map(filterResult => {
          if (filterResult instanceof HttpResponse) {
            if (filterResult['body']) {
              return filterResult['body']['total'];
            }
          }
        })
      );
  }

  getWaitingOnOthersStatus(filterTime: ITimePeriod): Observable<number> {
    return this.envelopeService.filterSearchBy('waiting_on_others', null, null, null, filterTime, 'updated_at' as SortOptions)
      .pipe(
        map(filterResult => {
          if (filterResult instanceof HttpResponse) {
            if (filterResult['body']) {
              return filterResult['body']['total'];
            }
          }
        })
      );
  }

  getActionRequiredStatus(filterTime: ITimePeriod): Observable<number> {
    return this.envelopeService.filterSearchBy('action_required', null, null, null, filterTime, 'updated_at' as SortOptions)
      .pipe(
        map(filterResult => {
          if (filterResult instanceof HttpResponse) {
            if (filterResult['body']) {
              return filterResult['body']['total'];
            }
          }
        })
      );
  }

  getTimePeriod(type): ITimePeriod {
    return timePeriod(type);
  }

  getTimePeriodWithWorker(type): Observable<ITimePeriod> {
    return Observable.create(observer => {
      if (typeof Worker !== 'undefined') {
        try {
          const timePeriodWorker = new Worker('../../web-workers/time-period.worker', { type: 'module' });
          this.timePeriodWorkers.push(timePeriodWorker);
          let periodWorkerIndex = this.timePeriodWorkers.length - 1;
          this.timePeriodWorkers[periodWorkerIndex].onmessage = (result) => {
            observer.next(result['data']);
            this.timePeriodWorkers[periodWorkerIndex].terminate();
            this.timePeriodWorkers.unshift;
            observer.complete();
          }
          this.timePeriodWorkers[periodWorkerIndex].postMessage({
            type: type
          });
        } catch {
          observer.next(this.getTimePeriod(type));
          observer.complete();
        }
      } else {
        observer.next(this.getTimePeriod(type));
        observer.complete();
      }
    });
  }

  getDashboardTemplate(templates) {
    let dashboardTemplates;
    return Observable.create(observer => {
      if (typeof Worker !== 'undefined') {
        try {
          this.templateSortWorker = new Worker('../../web-workers/sort-date.worker', { type: 'module' });
          this.templateSortWorker.onmessage = (result) => {
            observer.next(result['data']);
            observer.complete();
          };
          this.templateSortWorker.postMessage({
            arrayObject: templates,
            sortKey: 'updated_at'
          });
        } catch {
          dashboardTemplates = this.sortDashboardTemplate(templates);
          observer.next(dashboardTemplates);
          observer.complete();
        }
      } else {
        dashboardTemplates = this.sortDashboardTemplate(templates);
        observer.next(dashboardTemplates);
        observer.complete();
      }
    });
  }

  sortDashboardTemplate(templates) {
    return templates.sort((a, b) => {
      const updatedAtA = new Date(a['updated_at']);
      const updatedAtB = new Date(b['updated_at']);
      return updatedAtB.getTime() - updatedAtA.getTime();
    }).slice(0, 10);
  }

  getIncompleteRecipients(envelope) {
    return Observable.create(observer => {
      if (typeof Worker !== 'undefined') {
        try {
          this.incompleteRecipientWorker = new Worker('../../web-workers/filter.worker', { type: 'module' });
          this.incompleteRecipientWorker.onmessage = (result) => {
            observer.next(result['data']);
            observer.complete();
          }
          this.incompleteRecipientWorker.postMessage({
            arrayObject: envelope.recipients,
            filterKey: 'status',
            filterString: 'submitted'
          });
        } catch {
          observer.next(getIncompleteRecipients(envelope.recipients));
          observer.complete();
        }
      } else {
        observer.next(getIncompleteRecipients(envelope.recipients));
        observer.complete();
      }
    })
  }

  getSelfEnvelopeTokenLink(envelope, currentEmail) {
    return Observable.create(observer => {
      if (envelope && envelope.recipients) {
        if (typeof Worker !== 'undefined') {
          try {
            const envelopeLinkWorker = new Worker('../../web-workers/envelope-link.worker', { type: 'module' });
            envelopeLinkWorker.onmessage = (result) => {
              observer.next(result['data']);
              observer.complete();
            }
            envelopeLinkWorker.postMessage({
              arrayObject: envelope.recipients,
              filterKey: 'status',
              filterString: 'submitted',
              envelope: envelope,
              currentEmail: currentEmail
            })
          } catch {
            const link = getSelfEnvelopeTokenLink(envelope, currentEmail);
            observer.next(link);
            observer.complete();
          }
        } else {
          const link = getSelfEnvelopeTokenLink(envelope, currentEmail);
          observer.next(link);
          observer.complete();
        }
      } else {
        observer.next(null);
        observer.complete();
      }
    });
  }
}

