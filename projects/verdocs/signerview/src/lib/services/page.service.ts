import { Inject, PLATFORM_ID, RendererFactory2, ViewEncapsulation, Injector } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { Title, Meta } from '@angular/platform-browser';
import { filter, map, switchMap } from 'rxjs/operators';
import { ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { VerdocsStateService, VerdocsTokenObjectService } from '@verdocs/tokens';

import { IViewConfig, viewConfiguration } from '../views.module';

enum Robots {
  Noindex = 'Noindex',
  Index = 'Index',
  Follow = 'Follow',
  Noimageindex = 'Noimageindex',
  None = 'None',
  Noarchive = 'Noarchive',
  Nocache = 'Nocache',
  Nosnippet = 'Nosnippet'
}
export class PageService {
  private segmentIsInitialized = false;
  private lazyTitle = false;
  private rForm_cookie_name: string;

  constructor(
    private injector: Injector,
    private titleService: Title,
    private meta: Meta,
    private rendererFactory: RendererFactory2,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private vTokenStateService: VerdocsStateService,
    private tokenObject: VerdocsTokenObjectService,
    @Inject(PLATFORM_ID) private platform,
    @Inject(DOCUMENT) private document
  ) {
    const viewConfig: IViewConfig = this.injector.get(viewConfiguration);
    this.rForm_cookie_name = viewConfig.rForm_cookie_name;
  }

  inti() {
    this.initializeSegment();
    setTimeout(() => {
      this.additionalSetupForWidgets();
    }, 500);
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map(() => this.activatedRoute),
      map(route => {
        let targetRoute = route;
        while (targetRoute.firstChild) {
          targetRoute = targetRoute.firstChild;
        }
        return targetRoute
      }),
      switchMap(route => route.data),
      map((data) => {
        this.lazyTitle = data.lazyTitle;
        return data.title;
      })
    ).subscribe((title) => {
      if (this.lazyTitle) {
        this.lazyTitle = false;
      } else {
        this.setTitleAndRecord(title);
      }
    });
  }

  setTitleAndRecord(title: string, pageName?: string) {
    let newTitle = 'Verdocs';
    if (isPlatformBrowser(this.platform)) {
      if (this.document.cookie.includes(this.rForm_cookie_name)) {
        newTitle = title ? title : 'Verdocs'
        window['analytics'].page(pageName || newTitle);
      }
    } else {
      newTitle = 'Verdocs' + (title ? ` | ${title}` : '')
    }
    this.titleService.setTitle(newTitle);
  }

  setMetaProperty(property, content) {
    if (!!content) {
      if (!!this.getMetaTagProperty(property)) {
        this.meta.updateTag(
          { property, content },
          `property="${property}"`
        );
      } else {
        this.meta.addTag(
          { property, content },
          true
        );
      }
    } else {
      if (!!this.getMetaTagProperty(property)) {
        this.meta.removeTag(`property=“${property}”`);
      }
    }
  }

  setMetaName(property, content) {
    if (!!content) {
      if (!!this.getMetaTagProperty(property)) {
        this.meta.updateTag(
          { property, content },
          `name="${property}"`
        );
      } else {
        this.meta.addTag(
          { property, content },
          true
        );
      }
    } else {
      if (!!this.getMetaTagProperty(property)) {
        this.meta.removeTag(`name=“${property}”`);
      }
    }
  }

  setOpenGraphMeta(type: string, title: string, description: string, image: string, url: string) {
    if (!!type) {
      this.setMetaProperty('og:type', type);
    }
    if (!!title) {
      this.setMetaProperty('og:title', title);
    }
    if (!!description) {
      this.setMetaProperty('og:description', description);
    }
    if (!!image) {
      this.setMetaProperty('og:image', image);
    }
    if (!!url) {
      this.setMetaProperty('og:url', url);
    }
    if (!!this.getMetaTagProperty('og:site_name')) {
      return;
    } else {
      this.meta.addTag(
        { property: 'og:site_name', content: 'Verdocs' }
      )
    }
  }
  setRobotMeta(...robot_values: string[]) {
    let parameters = '';
    for (let x = 0; x < robot_values.length; x++) {
      if (robot_values[x]) {
        if (x === robot_values.length - 1) {
          parameters += robot_values[x];
        } else {
          parameters += robot_values[x] + ", "
        }
      }
    }
    const robot_parameters = parameters;
    this.setMetaName('robots', robot_parameters);
  }
  setCanonicalUrl(tag: LinkDefinition) {
    if (!tag.href) {
      tag['href'] = this.document.url;
    }
    this.addTag(tag);
  }
  setDescriptionMeta(content: string) {
    if (!!this.getMetaTag('description')) {
      if (content) {
        this.meta.updateTag(
          { name: 'description', content: content },
          `name='description'`
        );
      } else {
        this.meta.removeTag(`name='description'`);
      }
    } else {
      if (content) {
        this.meta.addTag(
          { name: 'description', content: content },
          true
        );
      }
    }
  }

  getMetaTag(name: string) {
    return this.meta.getTag(`name='${name}'`);
  }

  getMetaTagProperty(property: string) {
    return this.meta.getTag(`property='${property}'`);
  }

  private initializeSegment() {
    if (isPlatformBrowser(this.platform)) {
      const analytics = window['analytics'];
      if (document.cookie.includes(this.rForm_cookie_name)) {
        const idTokenSubscription = this.vTokenStateService.decodedIdTokenSubject.subscribe(decodedIdToken => {
          idTokenSubscription.unsubscribe();
          if (!this.segmentIsInitialized) {
            this.segmentIsInitialized = true;
            analytics.reset();
            const profile = this.tokenObject.getProfile();
            analytics.identify(decodedIdToken.sub, {
              userId: decodedIdToken.sub,
              email: decodedIdToken.email,
              name: decodedIdToken.name,
              'Verdoc plan': this.planType('verdoc'),
              'Organization plan': this.planType('organization'),
              'Current Profile Id': this.tokenObject.getProfileID(),
              'Current Company': profile.organization.name,
              company: {
                id: profile.organization_id,
                name: profile.organization.name
              }
            }, {
              Intercom: { hideDefaultLauncher: true }
            });
          }
        });
      }
    }
  }

  robotEnum() {
    return Robots;
  }

  private planType(product) {
    let productName = 'undefined';
    switch (product) {
      case 'verdoc':
        productName = 'env';
        break;
      case 'organization':
        productName = 'org'
        break;
    }
    const plan = this.tokenObject.getPlans().find((p) => {
      return p.includes(productName);
    })
    let planType = 'None';
    if (plan) {
      if (productName === 'env') {
        planType = plan.includes('pro') ? 'Pro' : 'Essential';
      } else {
        planType = plan.includes('premium') ? 'Premium' : 'Standard';
      }
    }
    return planType;
  }
  addTag(tag: LinkDefinition, forceCreation?: boolean) {

    const renderer = this.rendererFactory.createRenderer(this.document, {
      id: '-1',
      encapsulation: ViewEncapsulation.None,
      styles: [],
      data: {}
    });
    const link = renderer.createElement('link');
    const head = this.document.head;
    const selector = this._parseSelector(tag);

    Object.keys(tag).forEach((prop: string) => {
      return renderer.setAttribute(link, prop, tag[prop]);
    });
    try {


      if (head === null) {
        throw new Error('<head> not found within DOCUMENT.');
      }


      const existingLink = renderer.selectRootElement(selector)
      if (!!existingLink) {
        renderer.removeAttribute(existingLink, 'href');
        renderer.setAttribute(existingLink, 'href', tag['href']);
      } else {
        renderer.appendChild(head, link);
      }

    } catch (e) {
      // console.error('Error within linkService : ', e);
      renderer.appendChild(head, link);
    }
  }

  private _parseSelector(tag: LinkDefinition): string {
    const attr: string = tag.rel ? 'rel' : 'hreflang';
    return `link[${attr}="${tag[attr]}"]`;
  }

  private additionalSetupForWidgets() {
    if (isPlatformBrowser(this.platform)) {
      if (window['Intercom']) {
        window['Intercom']('onHide', function () {
          window['intercomIsOpen'] = false;
        });

        window['Intercom']('onShow', function () {
          window['intercomIsOpen'] = true;
        });
      }

      window['lunchIntercom'] = function () {
        if (window['Intercom']) {
          if (window['intercomIsOpen'] && window['intercomIsOpen'] === true) {
            window['Intercom']('hide');
          } else {
            window['Intercom']('show');
          }
        } else {
          console.error('Intercom is not loaded!')
        }
      }

      window['lunchElevio'] = function () {
        if (window['_elev']) {
          if (window['_elev'].widgetIsOpen()) {
            window['_elev'].close()
          } else {
            window['_elev'].open()
          }
        } else {
          console.error('Elevio is not loaded!')
        }
      }
    }
  }
}

export declare type LinkDefinition = {
  charset?: string;
  crossorigin?: string;
  href?: string;
  hreflang?: string;
  media?: string;
  rel?: string;
  rev?: string;
  sizes?: string;
  target?: string;
  type?: string;
} & {
  [prop: string]: string;
};
