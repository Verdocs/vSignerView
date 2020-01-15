
import { Injectable, Injector } from '@angular/core';
import { HttpClient, HttpRequest } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { throwError as observableThrowError, ReplaySubject, Observable, from, forkJoin, Subject } from 'rxjs';
import { catchError, map, delay, mergeMap } from 'rxjs/operators';
import { filter } from 'lodash';

import { findIndex, remove } from 'lodash';

import { viewConfiguration, IViewConfig } from '../views.module';
import { TemplatesService } from './templates.service';
import { ITemplate } from '../models/template.model';
import { IPage } from '../models/page.model';
import { IRole } from '../models/role.model';
import { IField } from '../models/field.model';
import { OptionType } from '../models/options.model';
import { FieldRole } from '../models/field-role.model';
import { nameToRGBA, getRGBA } from '../functions/rgb';
import { TemplatesGuardService } from './templates.guard';
import { TemplateActions } from '../definitions/template.enums';
import { SnackbarService } from './snackbar.service';
import { EventTrackerService } from '@verdocs/event-tracker';

@Injectable()
export class BuilderDataService {
  private recipients = [];
  private template;
  private templateDoc;
  private templatePages;
  private templateName: string;
  private activeFieldIndex: any;
  private roles: IRole[] = [];
  private templateSubject: ReplaySubject<ITemplate> = new ReplaySubject<ITemplate>(1, 500);
  private templateId: string;
  private hasFields = false;

  public templateNameSubject: ReplaySubject<string> = new ReplaySubject<string>(1, 500);
  public templatePagesSubject: ReplaySubject<number> = new ReplaySubject<number>(1, 500);
  public recipientsSubject: ReplaySubject<IRole[]> = new ReplaySubject<IRole[]>(1, 100);
  public activeRecipientSubject: ReplaySubject<IRole> = new ReplaySubject<IRole>();
  public scrollInfoSubject: ReplaySubject<any> = new ReplaySubject<any>();
  public screenInfoSubject: ReplaySubject<any> = new ReplaySubject<any>();
  public newTypeSubject: Subject<string | null> = new Subject<string | null>();
  public newOptionSubject: ReplaySubject<OptionType> = new ReplaySubject<OptionType>(1, 100);
  public duplicateFieldSubject: ReplaySubject<IField> = new ReplaySubject<IField>();
  public saveStatusSubject: ReplaySubject<string> = new ReplaySubject<string>();
  public renderedSubject: ReplaySubject<string> = new ReplaySubject<string>();
  public activeFieldIndexSubject: ReplaySubject<any> = new ReplaySubject<any>(1, 100);
  public numberOfRolesSubject: ReplaySubject<number> = new ReplaySubject<number>();
  public numberOfSequenceSubject: ReplaySubject<number> = new ReplaySubject<number>();
  public hasFieldsSubject: ReplaySubject<boolean> = new ReplaySubject<boolean>();
  public backend_url: string;

  constructor(
    private injector: Injector,
    private http: HttpClient,
    private router: Router,
    private templatesService: TemplatesService,
    private snackbar: MatSnackBar,
    private templateGuard: TemplatesGuardService,
    private snackbarService: SnackbarService,
    private eventTracker: EventTrackerService
  ) {
    const viewConfig = this.injector.get(viewConfiguration);
    this.backend_url = viewConfig.rForm_backend_url;
    this.templateSubject.subscribe(template => {
      this.template = template;
      if (template && template.name) {
        this.templateNameSubject.next(template.name);
      }
    });
    this.templateNameSubject.subscribe(name => {
      this.templateName = name;
    });
  }

  createTemplate(template_body: any): Promise<ITemplate> {
    return this.http
      .post<ITemplate>(this.backend_url + '/templates', template_body)
      .toPromise().then(res => {
        this.templateSubject.next(res);
        this.recipientsSubject.next([]);
        return res;
      });
  }

  updateLocalTemplateData() {
    this.templateName = this.template.name;
    this.templateNameSubject.next(this.templateName);
    this.templatePages = this.template.pages.length;
    this.templatePagesSubject.next(this.templatePages);
  }

  updateTemplateName(template, name) {
    if (template && template.id) {
      return this.templatesService.updateTemplate(template.id, { name: name })
        .then(res => {
          template.name = res.name;
          this.updateLocalTemplate(template);
          this.saveStatusSubject.next('saved');
          this.createSnackBar('Name Changed to: ' + name);
        })
        .catch((err) => {
          this.saveStatusSubject.next('Failed to save');
          this.createSnackBar('Failed to change Template name');
        });
    } else {
      this.templateNameSubject.next(name);
      this.saveStatusSubject.next('Name will be updated');
    }
  }

  getTemplateObservable(templateId: string): Observable<ITemplate> {
    return this.templatesService.getTemplateObservable(templateId);
  }

  getTemplate(templateId) {
    return this.templatesService.getTemplate(templateId).then(template => {
      this.updateLocalTemplate(template);
      this.recipients = this.sortRoles(this.template);
      this.template.roles = this.recipients;
      this.roles = this.recipients;
      this.recipientsSubject.next(this.recipients);
      this.activeRecipientSubject.next(this.recipients[0]);
      return this.template;
    })
  }

  watchForUpdatedTemplate() {
    return this.templateSubject.pipe(map(template => template));
  }

  updateLocalTemplate(template) {
    if (template) {
      this.template = template;
      if (this.template && this.template.pages) {
        this.template.pages = this.template.pages.sort((a, b) => {
          return a.sequence - b.sequence;
        });
      }
      if (this.template) {
        this.updateLocalTemplateData();
        this.checkForFields(this.template.roles);
      }
      this.recipientsSubject.next(this.template.roles.sort((a, b) => {
        return a.sequence - b.sequence;
      }));
      this.templateSubject.next(this.template);
    } else {
      this.templateNameSubject.next(null);
      this.templatePagesSubject.next(null);
      this.numberOfRolesSubject.next(null);
      this.numberOfSequenceSubject.next(null);
      this.hasFieldsSubject.next(false);
    }
  }

  uploadTemplateDocument(file: File, template: ITemplate) {
    const formdata = new FormData();
    formdata.append('document', file, file.name);
    const req = new HttpRequest('POST', this.backend_url + '/templates/' + template.id + '/documents', formdata, {
      reportProgress: true
    });
    return this.http.request(req)
      .pipe(
        map(res => res),
        catchError(err => {
          return observableThrowError(err);
        })
      )
  }

  getTemplateDocument(templateId) {
    this.templateDoc = this.templatesService.getAllTemplateDocuments(templateId).then(docs => {
      this.templateDoc = docs[0];
      return this.templateDoc
    });

    return this.templateDoc;
  }

  getTemplateDocumentFile(templateId, templateDoc) {
    return this.templatesService.getTemplateDocument(templateId, templateDoc).then(pdf => {
      const pdfUrl = URL.createObjectURL(pdf);
      return pdfUrl;
    })
  }

  setTemplateDocument(templateDocument) {
    this.templateDoc = templateDocument;
  }

  addTemplatePage(document, pageNum, templateId) {
    const body = {
      sequence: pageNum,
      page_number: pageNum,
      document_id: document.id
    }
    return this.http.post<IPage>(this.backend_url + `/templates/${templateId}/pages`, body)
      .pipe(
        map((res: IPage) => res),
        catchError(err => {
          return observableThrowError(err);
        })
      )
  }

  addTemplatePages(document, pageNums: number[], templateId: string) {
    return from(pageNums)
      .pipe(
        mergeMap(pageNum => {
          const page = {
            sequence: pageNum,
            page_number: pageNum,
            document_id: document.id
          };
          return <Observable<IPage>>this.http.post(this.backend_url + `/templates/${templateId}/pages`, page).pipe(delay(200));
        })
      )
  }

  deleteTemplateField(template: ITemplate, fieldName: string, i, j): Promise<void> {
    return this.http
      .delete<void>(this.backend_url + '/templates/' + template.id + '/fields/' + fieldName.trim())
      .toPromise()
      .then(field => {
        const fieldIndex = findIndex(template.pages[i].fields, { name: fieldName });
        const roleIndex = findIndex(template.roles, { name: template.pages[i].fields[fieldIndex].role_name });

        if (roleIndex > -1) {
          const roleFieldIndex = findIndex(template.roles[roleIndex].fields, { name: fieldName });
          if (roleFieldIndex > -1) {
            template.roles[roleIndex].fields.splice(roleFieldIndex, 1);
          }
        }
        template.pages[i].fields.splice(fieldIndex, 1);
        this.updateLocalTemplate(template);
        this.saveStatusSubject.next('saved');
        this.checkForFields(template.roles);
        return field;
      });
  }

  deleteTemplateFields(fieldNames: string[], template: ITemplate) {
    if (fieldNames && fieldNames.length > 0) {
      const pages = template.pages;
      for (const fieldName of fieldNames) {
        for (let x = 0; x < pages.length; x++) {
          const fieldIndex = findIndex(pages[x].fields, { name: fieldName });
          if (fieldIndex >= 0) {
            template.pages[x].fields.splice(fieldIndex, 1);
          }
        }
      }
      this.checkForFields(template.roles);
    }
  }

  addTemplateField(newField: IField, i, j, template: ITemplate): Promise<IField> {
    newField.name = newField.name.trim();
    return this.http
      .post<IField>(this.backend_url + '/templates/' + newField.template_id + '/fields', newField)
      .toPromise()
      .then(field => {
        this.eventTracker.createEvent({
          category: 'document',
          action: `document ${field.type} field added`,
          label: `document id: ${newField.template_id}`
        });
        template.pages[i].fields[j] = field;
        this.checkForFields(template.roles);
        const roleIndex = findIndex(template.roles, { name: field.role_name });
        if (roleIndex >= 0) {
          template.roles[roleIndex]['fields'].push(field);
        }
        this.templateSubject.next(template);
        return field;
      });
  }

  getTemplateOwnerInfo(id: string): Promise<{ profile_id: string, email: string, name: string }> {
    return this.templatesService.getTemplateOwnerInfo(id);
  }

  updateTemplateField(template: ITemplate, body: IField, oldName, i, j): Promise<IField> {
    oldName = oldName.trim();
    return this.http
      .put<IField>(this.backend_url + '/templates/' + template.id + '/fields/' + oldName, body)
      .toPromise()
      .then(field => {
        this.eventTracker.createEvent({
          category: 'document',
          action: `document ${field.type} field updated`,
          label: `document id: ${template.id}`
        });
        const fieldIndex = findIndex(template.pages[i].fields, { name: oldName });
        if (field.page_sequence - 1 !== i) {
          template.pages[i].fields.splice(fieldIndex, 1);
          template.pages[field.page_sequence - 1].fields.push(field);
        } else {
          template.pages[i].fields[fieldIndex] = field;
        }
        this.templateSubject.next(template);
        this.saveStatusSubject.next('saved');
        return field;
      });
  }

  updateDropdownField(template: ITemplate, body: any, oldName, i, j): Promise<any> {
    oldName = oldName.trim();
    return this.http
      .put<any>(this.backend_url + '/templates/' + template.id + '/fields/' + oldName, body)
      .toPromise()
      .then(field => {
        const fieldIndex = findIndex(template.pages[i].fields, { name: oldName });
        template.pages[i].fields[fieldIndex] = field;
        this.templateSubject.next(template);
        this.saveStatusSubject.next('saved');
        return field;
      });
  }

  deleteSequence(template_id: string, sequence_number: number) {
    return this.templatesService.deleteSequence(template_id, sequence_number);
  }

  prepareFieldDuplication(field) {
    this.duplicateFieldSubject.next(field);
  };

  checkForFields(roles) {
    let hasFields = true;
    if (roles && roles.length > 0) {
      for (let role of roles) {
        if (role && role.type === 'signer' && role.fields.length === 0) {
          hasFields = false;
        }
      }
    } else {
      hasFields = false;
    }
    this.hasFields = hasFields;
    this.hasFieldsSubject.next(this.hasFields);
  }

  createSnackBar(title: string, buttonTitle = 'OK'): void {
    let snackbarConfig: MatSnackBarConfig
    if (window.innerWidth >= 920) {
      snackbarConfig = {
        verticalPosition: 'bottom',
        horizontalPosition: 'left',
        duration: 5000
      }
    } else {
      snackbarConfig = {
        verticalPosition: 'top',
        duration: 5000
      }
    }
    this.snackbar.open(title, buttonTitle, snackbarConfig);
  }

  editDocsUrl(templateId: string) {
    const editDocsPageUrl = `/builder/${templateId}/docs`;
    return editDocsPageUrl;
  }

  editRolesUrl(templateId: string) {
    const editRolesPageUrl = `/builder/${templateId}/roles`;
    return editRolesPageUrl;
  }

  editTemplateUrl(templateId: string) {
    const editPageUrl = `/builder/${templateId}/fields`
    return editPageUrl;
  }

  previewTemplateUrl(templateId: string) {
    const reviewTemplateUrl = `/document/${templateId}`;
    return reviewTemplateUrl;
  }

  addFieldRole(templateId: string, fieldId: string, roleId: string, i, j): Promise<FieldRole> {
    const fieldRoleInfo = JSON.stringify({
      field_id: fieldId,
      role_id: roleId
    });
    return this.http
      .post<FieldRole>(this.backend_url + '/template/' + templateId + '/field_role', fieldRoleInfo).toPromise().then(fieldRole => {
        return fieldRole;
      });
  }

  addRole(role: IRole | IRole[], template: ITemplate): Promise<IRole[]> {
    return new Promise((resolve, reject) => {
      const savedRoles: IRole[] = [];
      const templateBackend = this.backend_url + '/templates/' + template.id + '/roles';
      this.roles = [];
      this.roles = this.roles.concat(role);
      const roleRequests = [];
      this.roles.forEach(role => {
        roleRequests.push(this.http.post(templateBackend, role));
      })

      if (this.roles && this.roles.length > 0) {
        return forkJoin(roleRequests)
          .subscribe(savedRoles => {
            savedRoles.concat(savedRoles as IRole[]);
            if (!template['roles']) {
              template['roles'] = <IRole[]>[];
            }
            const savedRolesWithFields = savedRoles.map(newRole => {
              newRole['fields'] = [];
              return newRole;
            });
            template['roles'] = template['roles'].concat(savedRolesWithFields);
            this.recipients = this.sortRoles(template);
            this.roles = this.recipients;
            this.templateSubject.next(template);
            this.recipientsSubject.next(this.recipients);
            resolve(this.recipients);
          }, (err) => {
            console.error(err);
            console.error('Couldn\'t save all the roles');
          });
      }
    });
  }

  addCheckboxGroup(field) {
    this.newOptionSubject.next(
      {
        type: 'checkbox_group',
        page_sequence: field.page_sequence,
        field_name: field.name,
      }
    );
  }

  addRadioGroup(field) {
    this.newOptionSubject.next(
      {
        type: 'radio_button_group',
        page_sequence: field.page_sequence,
        field_name: field.name,
      }
    );
  }

  getRolesInSequence(roles) {
    const rolesInSequence = [];
    for (let roleIndex = 0; roleIndex < roles.length; roleIndex++) {
      const sequenceIndex = roles[roleIndex]['sequence'] - 1;
      const role = { ...roles[roleIndex] };
      role['style'] = {
        backgroundColor: `${this.getRoleColor(role.name, roleIndex)}`
      };
      if (!rolesInSequence[sequenceIndex]) {
        rolesInSequence[sequenceIndex] = [role];
      } else {
        rolesInSequence[sequenceIndex].push(role);
      }
    }
    this.numberOfSequenceSubject.next(rolesInSequence.length);
    this.numberOfRolesSubject.next(roles.length);
    return rolesInSequence
  }

  deleteRole(roleName, template: ITemplate) {
    return this.http.delete(this.backend_url + '/templates/' + template.id + '/roles/' + roleName)
      .toPromise()
      .then(() => {
        remove(template.roles, (role: IRole) => {
          this.recipients = this.sortRoles(template);
          if (role.name === roleName) {
            const fields = role.fields;
            const fieldNames = [];
            for (const field of fields) {
              fieldNames.push(field.name);
            }
            this.deleteTemplateFields(fieldNames, template);
          }
          this.templateSubject.next(template);
          this.recipientsSubject.next(this.recipients);
          return role.name === roleName
        });
      });
  }

  deleteRoles(roleNames, template: ITemplate) {
    const deleteCalls = [];
    roleNames.forEach(role_name => {
      deleteCalls.push(this.http.delete(this.backend_url + '/templates/' + template.id + '/roles/' + role_name))
    });
    return new Promise((resolve, reject) => {
      return forkJoin(deleteCalls).subscribe(deletedRoles => {
        return resolve(deletedRoles);
      }, err => {
        console.error(err);
        console.error('Couldn\'t delete all the roles');
        return reject(err);
      })
    });
  }

  updateRole(roleName: string, body, template: ITemplate): Promise<IRole> {
    return this.http
      .put<IRole>(this.backend_url + '/templates/' + template.id + '/roles/' + roleName, body)
      .toPromise().then(role => {
        const index = findIndex(template.roles, { name: roleName });
        const updatedFields = [];
        if (roleName !== body.name) {
          for (let x = 0; x < template.pages.length; x++) {
            for (let y = 0; y < template.pages[x].fields.length; y++) {
              if (template.pages[x].fields[y].role_name === roleName) {
                template.pages[x].fields[y].role_name = body.name;
                updatedFields.push(template.pages[x].fields[y]);
              }
            }
          }
        } else if (body.type && body.type !== 'signer') {
          const fields = template.roles[index].fields;
          const fieldsToBeRemoved = [];
          if (fields && fields.length > 0) {
            for (const field of fields) {
              fieldsToBeRemoved.push(field.name);
            }
            this.deleteTemplateFields(fieldsToBeRemoved, template);
          }
        } else {
          for (let x = 0; x < template.pages.length; x++) {
            for (let y = 0; y < template.pages[x].fields.length; y++) {
              if (template.pages[x].fields[y].role_name === roleName) {
                updatedFields.push(template.pages[x].fields[y]);
              }
            }
          }
        }
        role['fields'] = updatedFields;
        template.roles[index] = role;
        this.recipients = this.sortRoles(template);
        template.roles = this.recipients;
        this.recipientsSubject.next(this.recipients);
        this.templateSubject.next(template);
        this.updateFullName(role, template);
        return role;
      });
  }

  updateRoles(roles, template: ITemplate): Promise<any[]> {
    const updateCalls = [];
    roles.forEach(role => {
      const body = {
        template_id: template.id,
        name: role.name.trim(),
        full_name: role.full_name,
        email: role.email,
        sequence: role.sequence,
        type: role.type,
        delegator: role.delegator,
        message: role.message,
        phone: role.phone
      }
      this.eventTracker.createEvent({
        category: 'document',
        action: 'document role updated',
        label: `document id: ${template.id}`
      });
      updateCalls.push(this.http.put(this.backend_url + '/templates/' + template.id + '/roles/' + role.old_name, body));
    });
    return new Promise((resolve, reject) => {
      return forkJoin(updateCalls)
        .subscribe(savedRoles => {
          return resolve(savedRoles);
        }, (err) => {
          console.error(err);
          console.error('Couldn\'t save all the roles');
        });
    });
  }
  sortRoles(template: ITemplate): IRole[] {
    if (template.roles.length < 1) {
      return [];
    }

    const roles = template.roles.sort((a: IRole, b: IRole) => {
      if (a.sequence === b.sequence) {
        return a.name.toLowerCase() < b.name.toLowerCase() ? -1 : a.name.toLowerCase() > b.name.toLowerCase() ? 1 : 0;
      }
      return a.sequence - b.sequence;
    });

    for (let x = 0; x < roles.length; x++) {
      roles[x]['rgba'] = getRGBA(x);
    }
    template.roles = roles;

    return roles;
  }

  getRoleColor(name, index?, template?: ITemplate) {
    if (index !== null && index > -1) {
      return getRGBA(index);
    } else if (template) {
      if (template.roles && template.roles.length > 0) {
        index = findIndex(template.roles, { name: name });
        if (index >= 0) {
          return template.roles[index].rgba ? template.roles[index].rgba : getRGBA(index);
        }
      } else {
        return nameToRGBA(name);
      }
    } else {
      return nameToRGBA(name);
    }
  }

  updateFullName(role: IRole, template: ITemplate) {
    for (let i = 0; i < template.pages.length; i++) {
      if (template.pages[i].fields.length > 0) {
        for (let j = 0; j < template.pages[i].fields.length; j++) {
          if (template.pages[i].fields[j].type === 'placeholder' && template.pages[i].fields[j].setting['type'] === 'full_name') {
            if (template.pages[i].fields[j].setting['result'] !== role.full_name &&
              template.pages[i].fields[j].role_name === role.name) {
              template.pages[i].fields[j].setting['result'] = role.full_name;
              const updatedField = { ...template.pages[i].fields[j] };
              this.updateTemplateField(template, updatedField, updatedField.name, i, j).then(() => {
                this.templateSubject.next(template);
              });
            }
          }
        }
      }
    }
  }

  setActiveFieldIndex(activeFieldIndex) {
    this.activeFieldIndex = activeFieldIndex;
    this.activeFieldIndexSubject.next(this.activeFieldIndex);
  }

  async autoAddSigner(template: ITemplate) {
    return new Promise(async (resolve, reject) => {
      const recipients = await this.addRole({ name: 'Signer 1', type: 'signer', sequence: 1 } as IRole, template);
      this.activeRecipientSubject.next(recipients[0]);
      setTimeout(() => {
        resolve()
      }, 500);
    });
  }

  openTemplate(template: ITemplate) {
    if (this.canUserPreview(template)) {
      this.router.navigate([`document/${template.id}`]);
    } else if (this.canUserEdit(template)) {
      this.router.navigate([`builder/${template.id}/fields`]);
    } else {
      this.snackbarService.open(`Template is in build mode, and not ready for use.  Please check back soon.`)
    }
  }

  canUserEdit(template: ITemplate) {
    const response = this.templateGuard.canPerformAction(TemplateActions.WRITE, template);
    return response['canPerform']
  }

  canUserPreview(template: ITemplate) {
    const hasPermission = (this.templateGuard.canPerformAction(TemplateActions.READ, template)).canPerform;
    let canPreview;
    const signers = filter(template.roles, { type: 'signer' });
    canPreview = signers && signers.length > 0;
    for (const signer of signers) {
      canPreview = signer['fields'] && signer['fields'].length > 0;
    }
    return hasPermission && canPreview;
  }
}
