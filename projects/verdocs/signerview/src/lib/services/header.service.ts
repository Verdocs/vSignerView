import { Injectable, Injector } from '@angular/core';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { ReplaySubject } from 'rxjs';
import { filter, map, mergeMap } from 'rxjs/operators';
import { SidenavService } from './sidenav.service';


@Injectable()
export class HeaderService {
  public titleSubject = new ReplaySubject<string>();
  public templateTitleSubject = new ReplaySubject<string>();
  public modeSubject = new ReplaySubject<string>();
  public filterKeywordSubject = new ReplaySubject<string>();
  public noHeader = new ReplaySubject<boolean>();
  public csvBlobSubject = new ReplaySubject<Blob>();
  public pageSubject = new ReplaySubject<string>();

  private sidenavService: SidenavService;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private injector: Injector
  ) {
    this.sidenavService = this.injector.get(SidenavService);
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.activatedRoute),
        map(route => {
          while (route.firstChild) {
            route = route.firstChild
          };
          return route;
        }),
        filter((route) => route.outlet === 'primary'),
        mergeMap((route) => route.data)
      )
      .subscribe(event => {
        if (event['title']) {
          this.titleSubject.next(event['title']);
        }
        if (event['page']) {
          this.pageSubject.next(event['page']);
        }
        if (event['noHeader']) {
          this.noHeader.next(true)
        } else {
          this.noHeader.next(false)
        }
        if (event['openSidenav'] === true && window && window.innerWidth > 600) {
          this.sidenavService.toggleSideNav(true);
        } else {
          this.sidenavService.toggleSideNav(false);
        }
      });
  }
}
