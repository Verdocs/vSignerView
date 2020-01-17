import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Envelope } from '../models/envelope.model';
import { IEnvelopeDocument } from '../models/envelope_document.model';

@Injectable()
export class SidenavService {
  private _toggleSidenavSource = new BehaviorSubject<boolean>(false);
  private _title = new BehaviorSubject<string>('');
  private _selected = new BehaviorSubject<boolean>(false);
  private _pdfUrl = new BehaviorSubject<string>('');
  private _env = new BehaviorSubject<Envelope>({
    id: '',
    template_id: '',
    status: '',
    profile_id: '',
    envelope_document_id: ''
  });
  private _envDoc = new BehaviorSubject<IEnvelopeDocument>({
    id: '',
    url: '',
    name: '',
    page_numbers: 0,
    mime: '',
  });

  toggleSidenav$ = this._toggleSidenavSource.asObservable();
  selectStatus$ = this._selected.asObservable();
  env$ = this._env.asObservable();
  titleValue$ = this._title.asObservable();
  pdfUrl$ = this._pdfUrl.asObservable();
  envDoc$ = this._envDoc.asObservable();

  public toggleSideNav(bool) {
    this._toggleSidenavSource.next(bool);
  }

  public updateTitle(string) {
    this._title.next(string);
  }

  public updateSelectStatus(bool) {
    this._selected.next(bool);
  }

  public updatePdfUrl(string) {
    this._pdfUrl.next(string);
  }

  public updateEnv(string) {
    this._env.next(string);
  }

  public updateEnvDoc(IEnvelopeDocument) {
    this._envDoc.next(IEnvelopeDocument);
  }
}
