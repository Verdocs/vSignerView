import { Injectable, Inject, Injector, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpResponse, HttpRequest } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog'
import { catchError, map } from 'rxjs/operators';
import { Subject, Observable, EMPTY } from 'rxjs';
import { VerdocsTokenObjectService } from '@verdocs/tokens';
import { filter } from 'lodash';
import { saveAs } from 'file-saver';

import { IViewConfig, viewConfiguration } from '../views.module';
import { ITemplate } from '../models/template.model'
import { TemplatesGuardService } from './templates.guard';
import { TemplateActions } from '../definitions/template.enums';
import { FourOhOneDialog } from '../modules/shared/dialogs/error-dialogs/four-oh-one.dialog';
import { ITemplateSearchParams } from '../models/template_search.mode';

@Injectable()
export class TemplatesService {
  public templates: Subject<ITemplate[]> = new Subject<ITemplate[]>();
  public template: Subject<ITemplate | {}> = new Subject<ITemplate>();
  public loadingStatus = new Subject<boolean>();

  private viewConfig: IViewConfig;
  private rForm_backend_url: string;

  constructor(
    private injector: Injector,
    private http: HttpClient,
    private vTokenObjectService: VerdocsTokenObjectService,
    private templateGuard: TemplatesGuardService,
    private dialog: MatDialog,
    @Inject(PLATFORM_ID) private platform
  ) {
    this.viewConfig = this.injector.get(viewConfiguration);
    this.rForm_backend_url = this.viewConfig.rForm_backend_url
  }

  errorMessageNotVerified(err) {
    return err.error.error === 'email is not verified' && err.error.code === 401;
  }

  getTemplates(filter?: 'creator' | 'organization' | 'starred') {
    this.loadingStatus.next(true);
    this.templates.next([]);
    let query = null;
    if (filter) {
      switch (filter) {
        case 'creator':
          query = '?is_creator=true';
          break;
        case 'organization':
          query = '?is_organization=true';
          break;
        case 'starred':
          query = '?is_starred=true';
          break;
        default:
          query = '';
          break;
      }
    }
    const requestUrl = this.rForm_backend_url + '/templates' + (query ? query : '');
    return this.http.request(new HttpRequest(
      'GET',
      requestUrl,
      {},
      { reportProgress: true }
    )).pipe(
      map((event) => {
        if (event instanceof HttpResponse) {
          const template = <ITemplate[]>event.body;
          this.templates.next(template);
          this.loadingStatus.next(false);
        }
        return event;
      }),
      catchError(err => {
        if (err && err.status === 401 && !this.errorMessageNotVerified(err)) {
          const errorDialog = this.dialog.open(FourOhOneDialog, {
            panelClass: 'error__dialog',
            disableClose: true
          })
          errorDialog.componentInstance.error = err;
        }
        this.loadingStatus.next(false);
        return EMPTY
      })
    );
  }

  getTemplateObservable(id: string, thumbnail?: boolean): Observable<ITemplate> {
    this.loadingStatus.next(true);
    let templateUrl = this.rForm_backend_url + '/templates/' + id;
    if (thumbnail === true) {
      templateUrl += '?thumbnail=true';
    }
    return this.http.get<ITemplate>(templateUrl).pipe(
      map(template => {
        this.loadingStatus.next(false);
        return template;
      }),
      catchError(err => {
        this.loadingStatus.next(false);
        if (err && err.status === 401 && !this.errorMessageNotVerified(err)) {
          const errorDialog = this.dialog.open(FourOhOneDialog, {
            panelClass: 'error__dialog',
            disableClose: true
          })
          errorDialog.componentInstance.error = err;
        }
        return EMPTY
      })
    );
  }

  starTemplate(id): Observable<any> {
    return this.http.post(this.rForm_backend_url + `/templates/${id}/stars`, {}).pipe(
      map(res => res),
      catchError(err => {
        if (err && err.status === 401 && this.errorMessageNotVerified(err)) {
          const errorDialog = this.dialog.open(FourOhOneDialog, {
            panelClass: 'error__dialog',
            disableClose: true
          })
          errorDialog.componentInstance.error = err;
        }
        return EMPTY
      })
    );
  }

  unstarTemplate(id): Observable<any> {
    return this.http.delete(this.rForm_backend_url + `/templates/${id}/stars`).pipe(
      map(res => res),
      catchError(err => {
        if (err && err.status === 401 && this.errorMessageNotVerified(err)) {
          const errorDialog = this.dialog.open(FourOhOneDialog, {
            panelClass: 'error__dialog',
            disableClose: true
          })
          errorDialog.componentInstance.error = err;
        }
        return EMPTY
      })
    );
  }

  getTemplate(id): Promise<ITemplate> {
    return this.getTemplateObservable(id).toPromise()
      .then((template) => {
        this.template.next(template);
        return template;
      });
  }

  getCreatorTemplates() {
    return this.getTemplates('creator');
  }

  getOrganizationTemplates() {
    return this.getTemplates('organization');
  }

  getStarredTemplates() {
    return this.getTemplates('starred');
  }

  getPermissions() {
    return this.vTokenObjectService.getPermissions();
  }


  getTemplateOwnerInfo(id: string): Promise<{ profile_id: string, email: string, name: string }> {
    return this.http.get<{ profile_id: string, email: string, name: string }>(`${this.rForm_backend_url}/templates/${id}?owner_info=true`)
      .toPromise().then(res => {
        return res;
      });
  }

  getTemplateDocument(templateId, templateDocument) {
    return this.http.get(this.rForm_backend_url + '/templates/' + templateId + '/documents/' +
      templateDocument.id + '?file=true', { responseType: 'blob' }).toPromise();
  }

  getTemplateThumbnail(templateId, templateDocumentId) {
    return this.http.get(this.rForm_backend_url + '/templates/' + templateId + '/documents/' +
      templateDocumentId + '?thumbnail=true', { responseType: 'blob' }).toPromise();
  }

  getAllTemplateDocuments(templateId) {
    return this.http.get(this.rForm_backend_url + '/templates/' + templateId + '/documents')
      .toPromise()
  }

  downloadTemplateDocument(template: ITemplate) {
    if ((isPlatformBrowser(this.platform))) {
      this.getTemplateDocument(template.id, template.template_documents[0]).then(template_file => {
        if (window && window.URL) {
          const fileUrl = URL.createObjectURL(template_file);
          saveAs(fileUrl, template.template_documents[0].name + '.pdf');
        }
      });
    }
  }

  searchTemplates(searchParams: ITemplateSearchParams) {
    for (const key in searchParams) {
      if (searchParams.hasOwnProperty(key)) {
        if (searchParams[key] === null) {
          delete searchParams[key];
        }
      }
    }
    return this.http.request(new HttpRequest(
      'POST',
      this.rForm_backend_url + '/templates/search',
      searchParams,
      {
        reportProgress: true,
        responseType: 'json'
      }
    )).pipe(
      map(event => {
        return event;
      })
    );
  }

  updateTemplate(templateId: string, body): Promise<ITemplate> {
    return this.http
      .put<ITemplate>(this.rForm_backend_url + '/templates/' + templateId, body)
      .toPromise().then(template => template);
  }

  deleteTemplate(templateId) {
    return this.http.delete(this.rForm_backend_url + '/templates/' + templateId);
  }

  deleteSequence(templateId, sequence_number) {
    return this.http.delete(this.rForm_backend_url + '/templates/' + templateId + '/roles?sequence=' + sequence_number).toPromise()
  }

  updateTemplates(templates) {
    this.templates.next(templates);
  }

  canSendEnvelope(template) {
    if (template) {
      const signers = filter(template.roles, { type: 'signer' });
      const hasSigner = signers.length > 0;
      let signersHaveFields = false;
      if (hasSigner) {
        for (const signer of signers) {
          signersHaveFields = signer['fields'] && signer['fields'].length > 0
        }
      }
      const hasAccessToTemplate = this.templateGuard.canPerformAction(TemplateActions.READ, template).canPerform;
      return hasAccessToTemplate && hasSigner && signersHaveFields && this.templateGuard.canBeSender(template);
    } else {
      return false;
    }
  }
}
