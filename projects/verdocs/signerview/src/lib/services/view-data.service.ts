import { Injectable, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { IViewConfig, viewConfiguration } from '../views.module';

@Injectable()
export class LiveViewService {
  private viewConfig: IViewConfig;
  private backendUrl: string;


  constructor(
    private injector: Injector,
    private http: HttpClient
  ) {
    this.viewConfig = this.injector.get(viewConfiguration);
    this.backendUrl = this.viewConfig.rForm_backend_url;
  }

  createLiveViewEnvelope(payload, templateToken) {
    const requestUrl = this.backendUrl + `/liveview/${payload.template_id}/token/${encodeURIComponent(templateToken)}`;
    const body = {
      roles: payload.roles,
    };
    if (payload && payload.name) {
      body['name'] = payload.name;
    }
    return this.http.post(requestUrl, body)
      .toPromise().then(res => {
        return res;
      });
  }

}

