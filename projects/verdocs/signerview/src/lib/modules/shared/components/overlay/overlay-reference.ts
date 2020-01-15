import {Portal} from '@angular/cdk/portal';
import {Direction, Directionality} from '@angular/cdk/bidi';

export interface OverlayReference {
  attach: (portal: Portal<any>) => any;
  detach: () => any;
  dispose: () => void;
  overlayElement: HTMLElement;
  hostElement: HTMLElement;
  getConfig: () => any;
  hasAttached: () => boolean;
  updateSize: (config: any) => void;
  updatePosition: () => void;
  attachBackdrop: () => void;
  detachBackdrop: () => void;
  getDirection: () => Direction;
  setDirection: (dir: Direction | Directionality) => void;
}