import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { environment } from '../../../environments/environment';

@Injectable()
export class LiveViewService {
  private backendUrl: string = environment.backend;


  constructor(
    private http: HttpClient
  ) { }

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

