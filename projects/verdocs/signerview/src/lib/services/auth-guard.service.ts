import { Injectable, Inject } from '@angular/core';
import {
  CanActivate,
  CanActivateChild,
  CanLoad,
  ActivatedRoute,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  Route,
  Router
} from '@angular/router';
import { DOCUMENT } from "@angular/common";
import { VerdocsAuthService, VerdocsAuthGuardService, VerdocsStateService } from '@verdocs/tokens';

@Injectable()
export class AuthGuardService implements CanActivate, CanActivateChild, CanLoad {

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private vTokenAuth: VerdocsAuthService,
    private vTokenAuthGuard: VerdocsAuthGuardService,
    private vTokenStateService: VerdocsStateService,
    @Inject(DOCUMENT) private document: any
  ) { }

  canActivate(route, state: RouterStateSnapshot): boolean {
    const signerToken = this.vTokenStateService.getOtherCookieObject('signer_token');
    const currentPath = route && route.routeConfig && route.routeConfig.path ? route.routeConfig.path : route.path;
    const matchesPath = currentPath ? currentPath.match(/(:id\/role\/:role)/g) || currentPath.includes('envelope') : false;
    if (route.routeConfig && !currentPath) {
      return true;
    } else if (signerToken && !!matchesPath) {
      return true;
    } else {
      return this.checkLogin(route, state.url);
    }
  }

  canActivateChild(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    return this.canActivate(route, state);
  }

  checkLogin(route, url) {
    if (this.vTokenAuth.isAuthenticated() || this.isGuestLink(route)) {
      return true;
    }
    this.vTokenAuthGuard.signOut();
    return false;
  }

  canLoad(route: Route) {
    const url = `/${route.path}`;
    return this.checkLogin(route, url);
  }
  canLoadBuilder(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {


  }

  isGuestLink(route) {
    const signer_token = this.vTokenStateService.getOtherCookie('signer_token');
    const currentPath = route && route.routeConfig && route.routeConfig.path ? route.routeConfig.path : route.path;
    const matchesPath = currentPath ? currentPath.match(/(:id\/role\/:role)/g) || currentPath.includes('envelope') : false;
    if (route && !!matchesPath && !!signer_token) {
      if (signer_token) {
        return true;
      }
      this.vTokenStateService.setTimer(true);
    }
    return route._routeConfig && route._routeConfig.path.match(/(:id\/role\/:role)/g) && !!signer_token;
  }

}
