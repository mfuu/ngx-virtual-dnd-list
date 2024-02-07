import {
  Input,
  Output,
  OnInit,
  OnChanges,
  OnDestroy,
  Component,
  forwardRef,
  ElementRef,
  TemplateRef,
  ContentChild,
  EventEmitter,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import Dnd, { Group, SortableEvent } from 'sortable-dnd';
import {
  CACLTYPE,
  SCROLL_DIRECTION,
  scrollType,
  scrollSize,
  offsetSize,
  offsetType,
  SortableAttributes,
} from './constant';
import { debounce, throttle, getDataKey } from './utils';

interface Range {
  start: number;
  end: number;
  front: number;
  behind: number;
}

interface CalcSize {
  average: number;
  total: number;
  fixed: number;
}

@Component({
  selector: 'virtual-dnd-list',
  template: `
    <virtual-dnd-list-item
      *ngFor="
        let item of model.slice(range.start, range.end + 1);
        index as i;
        trackBy: trackByFn
      "
      [source]="item"
      [dataKey]="dataKey"
      [sizeKey]="isHorizontal ? 'offsetWidth' : 'offsetHeight'"
      (sizeChange)="onSizeChange($event)"
    >
      <ng-container
        *ngTemplateOutlet="
          listItemTemplateRef;
          context: { $implicit: item, index: i }
        "
      ></ng-container>
    </virtual-dnd-list-item>
  `,
  host: {
    '[class.horizontal]': 'isHorizontal',
  },
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VirtualDndListComponent),
      multi: true,
    },
  ],
})
export class VirtualDndListComponent implements OnInit, OnDestroy, OnChanges, ControlValueAccessor {
  @Input() keepOffset: boolean = false;
  @Input() size: number;
  @Input() keeps: number = 30;
  @Input() direction: 'vertical' | 'horizontal' = 'vertical';

  private _debounceTime: number;
  public get debounceTime() {
    return this._debounceTime;
  }
  public set debounceTime(val: number) {
    this._debounceTime = val;
    this.updateOnScrollFunction();
  }

  private _throttleTime: number;
  public get throttleTime() {
    return this._throttleTime;
  }
  public set throttleTime(val: number) {
    this._throttleTime = val;
    this.updateOnScrollFunction();
  }

  private _scroller: HTMLElement;
  @Input()
  public get scroller() {
    return this._scroller;
  }
  public set scroller(val: HTMLElement) {
    this._scroller = val;
    this.updateScrollElement();
    this.removeScrollEventListener();
    this.addScrollEventListener();
  }

  @Input() delay: number;
  @Input() group: string | Group;
  @Input() handle: any;
  @Input() dataKey: string;
  @Input() disabled: boolean = false;
  @Input() draggable: string = 'virtual-dnd-list-item';
  @Input() animation: number = 150;
  @Input() autoScroll: boolean = true;
  @Input() ghostClass: string = '';
  @Input() ghostStyle: CSSStyleDeclaration;
  @Input() chosenClass: string = '';
  @Input() fallbackOnBody: boolean = false;
  @Input() scrollThreshold: number = 55;
  @Input() delayOnTouchOnly: boolean = false;

  @Output() onDrag = new EventEmitter();
  @Output() onDrop = new EventEmitter();
  @Output() onAdd = new EventEmitter();
  @Output() onRemove = new EventEmitter();
  @Output() onTop = new EventEmitter();
  @Output() onBottom = new EventEmitter();

  @ContentChild(TemplateRef) listItemTemplateRef: any;
  @ContentChild('container', { read: ElementRef, static: false })
  protected containerElementRef: ElementRef;

  public get isHorizontal() {
    return this.direction === 'horizontal';
  }

  public get scrollingFront() {
    return this.scrollDirection === SCROLL_DIRECTION.FRONT;
  }

  public get scrollingBehind() {
    return this.scrollDirection === SCROLL_DIRECTION.BEHIND;
  }

  /**
   * Get the size of the current item by data key
   * @param key data-key
   */
  public getSize(key: any): number {
    return this.sizes.get(key) || this.getItemSize();
  }

  /**
   * Get the current scroll height
   */
  public getOffset(): number {
    return this.scrollEl[scrollType[this.direction]];
  }

  /**
   * Get all scroll size (scrollHeight or scrollWidth)
   */
  public getScrollSize(): number {
    return this.scrollEl[scrollSize[this.direction]];
  }

  /**
   * Get the scroller's client viewport size (width or height)
   */
  public getClientSize(): number {
    return this.scrollEl[offsetSize[this.direction]];
  }

  /**
   * Scroll to the specified offset left/top
   * @param offset
   */
  public scrollToOffset(offset: number) {
    this.scrollEl[scrollType[this.direction]] = offset;
  }

  /**
   * Scroll to the specified index position
   * @param index
   */
  public scrollToIndex(index: number) {
    if (index >= this.uniqueKeys.length - 1) {
      this.scrollToBottom();
    } else {
      const indexOffset = this.getOffsetByIndex(index);
      this.scrollToOffset(indexOffset);
    }
  }

  /**
   * Scroll to bottom of list
   */
  public scrollToBottom() {
    const offset = this.getScrollSize();
    this.scrollToOffset(offset);

    // if the bottom is not reached, execute the scroll method again
    setTimeout(() => {
      const clientSize = this.getClientSize();
      const scrollSize = this.getScrollSize();
      const scrollOffset = this.getOffset();
      if (scrollOffset + clientSize + 1 < scrollSize) {
        this.scrollToBottom();
      }
    }, 5);
  }

  constructor(public el: ElementRef) {}

  ngOnInit(): void {
    this.initVirtual();
    this.initSortable();
  }

  ngOnChanges(changes): void {
    SortableAttributes.forEach((key: any) => {
      if (key in changes) {
        this.sortable?.option(key, this[key]);
      }
    });
  }

  ngOnDestroy(): void {
    this.removeScrollEventListener();
    this.sortable.destroy();
  }

  private _model: any[] = [];
  private onModelTouched = (_: any) => {};
  private onModelChange = (_: any) => {};

  public get model() {
    return this._model;
  }
  public set model(val) {
    this._model = val;
    this.onModelChange(val);
  }

  public writeValue(value: any[]): void {
    this._model = value || [];

    this.refresh();

    this.lastList = [...this._model];
  }

  public registerOnChange(fn: (_: any) => void): void {
    this.onModelChange = fn;
  }

  public registerOnTouched(fn: (_: any) => void): void {
    this.onModelTouched = fn;
  }

  public trackByFn = (_: number, item: any) => {
    return getDataKey(item, this.dataKey);
  };

  private timer: NodeJS.Timeout;
  private start: number = 0;
  private lastList: any[] = [];
  private uniqueKeys: any[] = [];

  private refresh() {
    this.updateUniqueKeys();
    if (this.sizes.size) {
      this.detectRangeUpdate();
    } else {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.updateRange(), 17);
    }

    this.sortableList = [...this._model];

    // auto scroll to the last offset
    if (this.lastLength && this.keepOffset) {
      const index = this._model.length - this.lastLength;
      if (index > 0) {
        this.scrollToIndex(index);
      }
      this.lastLength = 0;
    }
  }

  private detectRangeUpdate() {
    let range = { ...this.range };
    if (this.range.start > 0) {
      const index = this._model.indexOf(this.lastList[this.range.start]);
      if (index > -1) {
        range.start = index;
        range.end = index + this.keeps - 1;
      }
    }
    if (
      this._model.length > this.lastList.length &&
      this.range.end === this.lastList.length - 1 &&
      this.scrolledToBottom()
    ) {
      range.end++;
      range.start = Math.max(0, range.end - this.keeps + 1);
    }
    this.updateRange(range);
  }

  private scrolledToBottom() {
    const offset = this.getOffset();
    const clientSize = this.getClientSize();
    const scrollSize = this.getScrollSize();
    return offset + clientSize + 1 >= scrollSize;
  }

  private sortable: Dnd;
  private sortableStore: any = {};
  private sortableList: any[] = [];
  private reRendered: boolean = false;

  private initSortable() {
    let props = {};
    for (let i = 0; i < SortableAttributes.length; i++) {
      let key = SortableAttributes[i];
      props[key] = this[key];
    }

    this.sortable = new Dnd(this.el.nativeElement, {
      ...props,
      swapOnDrop: (params) => params.from === params.to,
      onDrag: (params) => this.onSortableDrag(params),
      onAdd: (params) => this.onSortableAdd(params),
      onRemove: (params) => this.onSortableRemove(params),
      onChange: (params) => this.onSortableChange(params),
      onDrop: (params) => this.onSortableDrop(params),
    });
  }

  private onSortableDrag(params: SortableEvent) {
    const key = params.node.getAttribute('data-key');
    const index = this.getIndex(this.sortableList, key);
    const item = this.sortableList[index];

    // store the drag item
    this.sortableStore = {
      item,
      key,
      origin: { index, list: this.sortableList },
      from: { index, list: this.sortableList },
      to: { index, list: this.sortableList },
    };
    this.sortable.option('store', this.sortableStore);

    this.start = this.range.start;
  }

  private onSortableAdd(params: SortableEvent) {
    const { from, target, relative } = params;
    const { key, item } = Dnd.get(from).option('store');

    let index = this.getIndex(
      this.sortableList,
      target.getAttribute('data-key')
    );

    if (relative === -1) {
      index += 1;
    }

    this.sortableList.splice(index, 0, item);

    Object.assign(this.sortableStore, {
      to: {
        index,
        list: this.sortableList,
      },
    });
    this.sortable.option('store', this.sortableStore);

    this.onAdd.emit({ item, key, index });
  }

  private onSortableRemove(params: SortableEvent) {
    const key = params.node.getAttribute('data-key');
    const index = this.getIndex(this.sortableList, key);
    const item = this.sortableList[index];

    this.sortableList.splice(index, 1);

    Object.assign(this.sortableStore, { key, item });
    this.sortable.option('store', this.sortableStore);

    this.onRemove.emit({ item, key, index });
  }

  private onSortableChange(params: SortableEvent) {
    const store = Dnd.get(params.from).option('store');

    if (params.revertDrag) {
      this.sortableList = [...this._model];

      Object.assign(this.sortableStore, {
        from: store.origin,
      });

      return;
    }

    const { node, target, relative, backToOrigin } = params;

    const fromIndex = this.getIndex(
      this.sortableList,
      node.getAttribute('data-key')
    );
    const fromItem = this.sortableList[fromIndex];

    let toIndex = this.getIndex(
      this.sortableList,
      target.getAttribute('data-key')
    );

    if (backToOrigin) {
      if (relative === 1 && store.from.index < toIndex) {
        toIndex -= 1;
      }
      if (relative === -1 && store.from.index > toIndex) {
        toIndex += 1;
      }
    }

    this.sortableList.splice(fromIndex, 1);
    this.sortableList.splice(toIndex, 0, fromItem);

    Object.assign(this.sortableStore, {
      from: {
        index: toIndex,
        list: this.sortableList,
      },
      to: {
        index: toIndex,
        list: this.sortableList,
      },
    });
  }

  private onSortableDrop(params: SortableEvent) {
    const { from, to } = this.getStore(params);
    const changed =
      params.from !== params.to || from.origin.index !== to.to.index;

    if (
      this.sortableList.length === this._model.length &&
      this.start < this.range.start
    ) {
      this.range.front += Dnd.clone[offsetSize[this.direction]];
      this.start = this.range.start;
    }
    this.writeValue(this.sortableList);
    this.onModelChange(this.sortableList);

    this.onDrop.emit({
      changed,
      list: this.sortableList,
      item: from.item,
      key: from.key,
      from: from.origin,
      to: to.to,
    });

    if (params.from === this.el.nativeElement && this.reRendered) {
      Dnd.dragged?.remove();
    }
    if (params.from !== params.to && params.pullMode === 'clone') {
      Dnd.clone?.remove();
    }

    this.reRendered = false;
  }

  private getIndex(list: any[], key: any) {
    for (let i = 0; i < list.length; i++) {
      if (getDataKey(list[i], this.dataKey) == key) {
        return i;
      }
    }
    return -1;
  }

  private getStore(params: SortableEvent) {
    return {
      from: Dnd.get(params.from)?.option('store'),
      to: Dnd.get(params.to)?.option('store'),
    };
  }

  public range: Range = { start: 0, end: this.keeps - 1, front: 0, behind: 0 };
  private sizes: Map<any, number> = new Map();
  private offset: number = 0;
  private calcType: string = CACLTYPE.INIT;
  private calcSize: CalcSize = { average: 0, total: 0, fixed: 0 };
  private scrollEl: HTMLElement;
  private lastLength: number = 0;
  private scrollDirection: string = '';
  private useWindowScroll: boolean = false;

  public onSizeChange({ key, size }: { key: any; size: number }) {
    this.handleItemSizeChange(key, size);
  }

  private initVirtual() {
    this.updateOnScrollFunction();
    this.addScrollEventListener();
    this.checkIfUpdate(0, this.keeps - 1);
  }

  private get isFixedItemSize() {
    return this.calcType === CACLTYPE.FIXED;
  }

  private updateUniqueKeys() {
    this.uniqueKeys = this._model.map((item) => getDataKey(item, this.dataKey));
  }

  private updateScrollElement() {
    this.scrollEl = this.getScrollElement(this.scroller);
  }

  private addScrollEventListener() {
    this.scroller?.addEventListener('scroll', this.onScroll, false);
  }

  private removeScrollEventListener() {
    this.scroller?.removeEventListener('scroll', this.onScroll);
  }

  private updateRange(range?: Range) {
    if (range) {
      this.handleUpdate(range.start, range.end);
      return;
    }

    let start = this.range.start;
    start = Math.max(start, 0);

    this.handleUpdate(start, this.getEndByStart(start));
  }

  private handleItemSizeChange(key: any, size: number) {
    this.sizes.set(key, size);

    if (this.calcType === CACLTYPE.INIT) {
      this.calcType = CACLTYPE.FIXED;
      this.calcSize.fixed = size;
    } else if (this.isFixedItemSize && this.calcSize.fixed !== size) {
      this.calcType = CACLTYPE.DYNAMIC;
      this.calcSize.fixed = 0;
    }
    // In the case of non-fixed heights, the average height and the total height are calculated
    if (this.calcType !== CACLTYPE.FIXED) {
      this.calcSize.total = [...this.sizes.values()].reduce((t, i) => t + i, 0);
      this.calcSize.average = Math.round(this.calcSize.total / this.sizes.size);
    }
  }

  private onScroll: () => void;
  private updateOnScrollFunction() {
    if (this.debounceTime) {
      this.onScroll = debounce(() => this.handleScroll(), this.debounceTime);
    } else if (this.throttleTime) {
      this.onScroll = throttle(() => this.handleScroll(), this.throttleTime);
    } else {
      this.onScroll = () => this.handleScroll();
    }
  }

  private handleScroll() {
    const offset = this.getOffset();
    const clientSize = this.getClientSize();
    const scrollSize = this.getScrollSize();

    if (offset === this.offset) {
      this.scrollDirection = SCROLL_DIRECTION.STATIONARY;
    } else {
      this.scrollDirection =
        offset < this.offset ? SCROLL_DIRECTION.FRONT : SCROLL_DIRECTION.BEHIND;
    }

    this.offset = offset;

    const top = this.scrollingFront && offset <= 0;
    const bottom = this.scrollingBehind && clientSize + offset >= scrollSize;

    this.lastLength = 0;
    if (!!this._model.length && top) {
      this.handleToTop();
    } else if (bottom) {
      this.handleToBottom();
    }

    if (this.scrollingFront) {
      this.handleScrollFront();
    } else if (this.scrollingBehind) {
      this.handleScrollBehind();
    }
  }

  private handleToTop = debounce(() => {
    this.onTop.emit();
    this.lastLength = this._model.length;
  }, 50);

  private handleToBottom = debounce(() => {
    this.onBottom.emit();
  }, 50);

  private handleScrollFront() {
    const scrolls = this.getScrollItems();

    if (scrolls > this.range.start) {
      return;
    }
    const start = Math.max(scrolls - Math.round(this.keeps / 3), 0);

    this.checkIfUpdate(start, this.getEndByStart(start));
  }

  private handleScrollBehind() {
    const scrolls = this.getScrollItems();

    if (scrolls < this.range.start + Math.round(this.keeps / 3)) {
      return;
    }

    this.checkIfUpdate(scrolls, this.getEndByStart(scrolls));
  }

  private getScrollItems() {
    const offset = this.offset - this.getScrollStartOffset();

    if (offset <= 0) {
      return 0;
    }

    if (this.isFixedItemSize) {
      return Math.floor(offset / this.calcSize.fixed);
    }

    let low = 0;
    let high = this.uniqueKeys.length;
    let middle = 0;
    let middleOffset = 0;

    while (low <= high) {
      middle = low + Math.floor((high - low) / 2);
      middleOffset = this.getOffsetByIndex(middle);

      if (middleOffset === offset) {
        return middle;
      } else if (middleOffset < offset) {
        low = middle + 1;
      } else if (middleOffset > offset) {
        high = middle - 1;
      }
    }
    return low > 0 ? --low : 0;
  }

  private checkIfUpdate(start: number, end: number) {
    const keeps = this.keeps;
    const total = this.uniqueKeys.length;

    if (total <= keeps) {
      start = 0;
      end = this.getLastIndex();
    } else if (end - start < keeps - 1) {
      start = end - keeps + 1;
    }

    if (this.range.start !== start) {
      this.handleUpdate(start, end);
    }
  }

  private handleUpdate(start: number, end: number) {
    let _range = { ...this.range };
    this.range.start = start;
    this.range.end = end;
    this.range.front = this.getFrontOffset();
    this.range.behind = this.getBehindOffset();

    if (_range.start !== this.range.start && Dnd.dragged) {
      this.reRendered = true;
    }

    this.el.nativeElement.style['padding'] = this.isHorizontal
      ? `0 ${this.range.behind}px 0 ${this.range.front}px`
      : `${this.range.front}px 0 ${this.range.behind}px`;
  }

  private getFrontOffset() {
    if (this.isFixedItemSize) {
      return this.calcSize.fixed * this.range.start;
    } else {
      return this.getOffsetByIndex(this.range.start);
    }
  }

  private getBehindOffset() {
    const end = this.range.end;
    const last = this.getLastIndex();

    if (this.isFixedItemSize) {
      return (last - end) * this.calcSize.fixed;
    }

    return (last - end) * this.getItemSize();
  }

  private getOffsetByIndex(index: number) {
    if (!index) return 0;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      const size = this.sizes.get(this.uniqueKeys[i]);
      offset = offset + (typeof size === 'number' ? size : this.getItemSize());
    }

    return offset;
  }

  private getEndByStart(start: number) {
    return Math.min(start + this.keeps - 1, this.getLastIndex());
  }

  private getLastIndex() {
    return this.uniqueKeys.length > 0
      ? this.uniqueKeys.length - 1
      : this.keeps - 1;
  }

  private getItemSize() {
    return this.isFixedItemSize
      ? this.calcSize.fixed
      : this.calcSize.average || this.size;
  }

  private getScrollElement(scroller: any) {
    if (
      (scroller instanceof Document && scroller.nodeType === 9) ||
      scroller instanceof Window
    ) {
      this.useWindowScroll = true;
      return (
        document.scrollingElement || document.documentElement || document.body
      );
    }

    this.useWindowScroll = false;

    return scroller;
  }

  private getScrollStartOffset() {
    let offset = 0;
    if (this.useWindowScroll && this.el.nativeElement) {
      let el = this.el.nativeElement;
      do {
        offset += el[offsetType[this.direction]];
      } while (
        (el = el.offsetParent) &&
        el !== this.el.nativeElement.ownerDocument
      );
    }

    return offset;
  }
}
