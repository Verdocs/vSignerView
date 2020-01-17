import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReplaySubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { orderBy } from 'lodash';

import { IViewConfig, viewConfiguration } from '../views.module';

export interface Notification {
  id?: string;
  profile_id: string;
  data: object;
  read: boolean;
  deleted: boolean;
  client_id: string;
  message: string;
  time: string;
  event_id: string;
}

@Injectable()
export class NotificationService {
  private notifications: Notification[];
  private notificationsSubject = new ReplaySubject<Notification[]>();
  private idToOpen = new ReplaySubject();
  private serviceAddress:string;
  private rNotification_backend_url: string;

  constructor(
    private http: HttpClient,
    private injector: Injector
  ) {
    const viewConfig: IViewConfig = this.injector.get(viewConfiguration);
    this.rNotification_backend_url = viewConfig.rNotification_backend_url;
    this.serviceAddress = `${this.rNotification_backend_url}/notifications`;
  }

  public init() {
    this.getAllNotifications();
    this.idToOpen.next(null);
  }

  public Notificatations(): Observable<Notification[]> {
    return this.notificationsSubject.pipe(
      map(notifications => notifications)
    );
  }

  public get IdToOpen() {
    return this.idToOpen;
  }

  private async getAllNotifications(): Promise<Notification[]> {
    const response = await this.http.get<Notification[]>(this.serviceAddress).toPromise();
    const notifications = <Notification[]>orderBy(response, 'time', 'desc');
    this.notificationsSubject.next(notifications);
    this.notifications = notifications;
    return notifications;
  }

  public dismissNotification(notification: Notification) {
    this.notifications.splice(this.notifications.indexOf(notification), 1);
    return this.http.delete<Notification>(this.serviceAddress + '/' + notification.id)
      .toPromise()
      .then(() => {
        this.notificationsSubject.next(this.notifications);
      });
  }
}
