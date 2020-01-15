import { PositionStrategy } from './position-strategy';
import { OverlayReference } from '../overlay-reference';

const wrapperClass = 'fixed-global-overlay-wrapper';

export class GlobalPositionStrategy implements PositionStrategy {
  private _overlayRef: OverlayReference;
  private _cssPosition: string = 'absolute';
  private _topOffset: string = '';
  private _bottomOffset: string = '';
  private _leftOffset: string = '';
  private _rightOffset: string = '';
  private _alignItems: string = '';
  private _justifyContent: string = '';
  private _width: string = '';
  private _height: string = '';
  private _isDisposed: boolean;

  attach(overlayRef: OverlayReference): void {
    const config = overlayRef.getConfig();

    this._overlayRef = overlayRef;

    if (this._width && !config.width) {
      overlayRef.updateSize({ width: this._width });
    }

    if (this._height && !config.height) {
      overlayRef.updateSize({ height: this._height });
    }

    overlayRef.hostElement.classList.add(wrapperClass);
    this._isDisposed = false;
  }

  top(value: string = ''): this {
    this._bottomOffset = '';
    this._topOffset = value;
    this._alignItems = 'flex-start';
    return this;
  }

  left(value: string = ''): this {
    this._rightOffset = '';
    this._leftOffset = value;
    this._justifyContent = 'flex-start';
    return this;
  }

  bottom(value: string = ''): this {
    this._topOffset = '';
    this._bottomOffset = value;
    this._alignItems = 'flex-end';
    return this;
  }

  right(value: string = ''): this {
    this._leftOffset = '';
    this._rightOffset = value;
    this._justifyContent = 'flex-end';
    return this;
  }

  width(value: string = ''): this {
    if (this._overlayRef) {
      this._overlayRef.updateSize({ width: value });
    } else {
      this._width = value;
    }

    return this;
  }

  height(value: string = ''): this {
    if (this._overlayRef) {
      this._overlayRef.updateSize({ height: value });
    } else {
      this._height = value;
    }

    return this;
  }

  centerHorizontally(offset: string = ''): this {
    this.left(offset);
    this._justifyContent = 'center';
    return this;
  }

  centerVertically(offset: string = ''): this {
    this.top(offset);
    this._alignItems = 'center';
    return this;
  }

  apply(): void {
    if (!this._overlayRef || !this._overlayRef.hasAttached()) {
      return;
    }

    const styles = this._overlayRef.overlayElement.style;
    const parentStyles = this._overlayRef.hostElement.style;
    const config = this._overlayRef.getConfig();

    styles.position = this._cssPosition;
    styles.marginLeft = config.width === '100%' ? '0' : this._leftOffset;
    styles.marginTop = config.height === '100%' ? '0' : this._topOffset;
    styles.bottom = this._bottomOffset;
    styles.right = this._rightOffset;

    if (config.width === '100%') {
      parentStyles.justifyContent = 'flex-start';
    } else if (this._justifyContent === 'center') {
      parentStyles.justifyContent = 'center';
    } else if (this._overlayRef.getConfig().direction === 'rtl') {
      if (this._justifyContent === 'flex-start') {
        parentStyles.justifyContent = 'flex-end';
      } else if (this._justifyContent === 'flex-end') {
        parentStyles.justifyContent = 'flex-start';
      }
    } else {
      parentStyles.justifyContent = this._justifyContent;
    }

    parentStyles.alignItems = config.height === '100%' ? 'flex-start' : this._alignItems;
  }

  dispose(): void {
    if (this._isDisposed || !this._overlayRef) {
      return;
    }

    const styles = this._overlayRef.overlayElement.style;
    const parent = this._overlayRef.hostElement;
    const parentStyles = parent.style;

    parent.classList.remove(wrapperClass);
    parentStyles.justifyContent = parentStyles.alignItems = styles.marginTop =
      styles.marginBottom = styles.marginLeft = styles.marginRight = styles.position = '';

    this._overlayRef = null!;
    this._isDisposed = true;
  }
}