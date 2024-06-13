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
import { getDataKey } from './utils';

@Directive({
  selector: '[virtualItem]',
})
export class VirtualItem {
  @Input() index: number;
  @Input() dataKey: string | string[];
  @Input() dragging: string;
  @Input() itemClass: string;
  @Input() isHorizontal: boolean;

  @Output() sizeChange = new EventEmitter();

  private _key: string;
  private _context: any;
  private _element: HTMLElement;
  private _viewRef: EmbeddedViewRef<any>;
  private _sizeObserver: ResizeObserver;

  constructor(
    private render2: Renderer2,
    private viewContainer: ViewContainerRef,
    public templateRef: TemplateRef<any>
  ) {
    this._viewRef = this.viewContainer.createEmbeddedView(templateRef);
  }

  @Input()
  set virtualItem(source: any) {
    this._context = source;
  }

  ngAfterViewInit(): void {
    this._key = getDataKey(this._context, this.dataKey);
    this._element = this._viewRef.rootNodes.find((item) => item.nodeType !== 8);

    if (!this._element) return;

    this.render2.setAttribute(this._element, 'data-key', this._key);
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
    if (changes['dragging'] && this._element) {
      this.updateElementStyle();
    }
  }

  ngOnDestroy(): void {
    this._sizeObserver.disconnect();
  }

  private updateElementStyle() {
    const display = this.dragging === this._key ? 'none' : '';
    this.render2.setStyle(this._element, 'display', display);
  }
}
