import {
  Input,
  Output,
  Renderer2,
  Directive,
  TemplateRef,
  EventEmitter,
  SimpleChanges,
  EmbeddedViewRef,
  ViewContainerRef,
} from '@angular/core';
import { getDataKey, isSameValue } from './core';

@Directive({
  selector: '[virtualItem]',
})
export class VirtualItem<T> {
  @Input() dataKey: string | string[];
  @Input() chosenKey: string;
  @Input() dragging: boolean;
  @Input() itemClass: string;
  @Input() isHorizontal: boolean;

  @Output() sizeChange: EventEmitter<{ key: string | number; size: number }> = new EventEmitter();

  private _key: string | number;
  private _context: T;
  private _element: HTMLElement;
  private _viewRef: EmbeddedViewRef<any>;
  private _sizeObserver: ResizeObserver;

  constructor(
    protected readonly render2: Renderer2,
    protected readonly templateRef: TemplateRef<any>,
    protected readonly viewContainerRef: ViewContainerRef
  ) {
    this._viewRef = this.viewContainerRef.createEmbeddedView(this.templateRef);
  }

  @Input()
  set virtualItem(context: T) {
    this._context = context;
  }

  ngAfterViewInit(): void {
    this._key = getDataKey(this._context, this.dataKey);
    this._element = this._viewRef.rootNodes.find((item) => item.nodeType !== 8);

    if (!this._element) return;

    this.render2.setAttribute(this._element, 'data-key', this._key as string);
    this.render2.addClass(this._element, this.itemClass);
    this.updateElementStyle();

    this._sizeObserver = new ResizeObserver(() => {
      const sizeKey = this.isHorizontal ? 'offsetWidth' : 'offsetHeight';
      const size = this._element[sizeKey];
      this.sizeChange.emit({ key: this._key, size });
    });

    this._sizeObserver.observe(this._element);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['chosenKey'] && this._element) {
      this.updateElementStyle();
    }
    if (changes['itemClass'] && this._element) {
      this.updateElementClass(changes);
    }
  }

  ngOnDestroy(): void {
    this._sizeObserver.disconnect();
    this._sizeObserver = null;
  }

  private updateElementStyle() {
    const isChosen = isSameValue(this._key, this.chosenKey);
    const display = this.dragging && isChosen ? 'none' : '';
    this.render2.setStyle(this._element, 'display', display);
  }

  private updateElementClass(changes: SimpleChanges) {
    const { previousValue, currentValue } = changes['itemClass'];
    this.render2.removeClass(this._element, previousValue);
    this.render2.addClass(this._element, currentValue);
  }
}
