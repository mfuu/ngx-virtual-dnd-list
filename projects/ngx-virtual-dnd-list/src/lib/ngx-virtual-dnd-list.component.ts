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
  SimpleChanges,
  IterableDiffer,
  IterableDiffers,
} from "@angular/core";
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from "@angular/forms";
import Dnd, { Group, SortableEvent } from "sortable-dnd";
import { debounce, throttle, getDataKey } from "./utils";

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

const SortableAttrs = [
  "delay",
  "group",
  "handle",
  "lockAxis",
  "disabled",
  "draggable",
  "animation",
  "autoScroll",
  "ghostClass",
  "ghostStyle",
  "chosenClass",
  "fallbackOnBody",
  "scrollThreshold",
  "delayOnTouchOnly",
];

const CACLTYPE = {
  INIT: "INIT",
  FIXED: "FIXED",
  DYNAMIC: "DYNAMIC",
};

const SCROLL_DIRECTION = {
  FRONT: "FRONT",
  BEHIND: "BEHIND",
  STATIONARY: "STATIONARY",
};

const DIRECTION = {
  HORIZONTAL: "horizontal",
  VERTICAL: "vertical",
};

const rectDir = {
  [DIRECTION.VERTICAL]: "top",
  [DIRECTION.HORIZONTAL]: "left",
};

const scrollDir = {
  [DIRECTION.VERTICAL]: "scrollTop",
  [DIRECTION.HORIZONTAL]: "scrollLeft",
};

const scrollSize = {
  [DIRECTION.VERTICAL]: "scrollHeight",
  [DIRECTION.HORIZONTAL]: "scrollWidth",
};

const offsetSize = {
  [DIRECTION.VERTICAL]: "offsetHeight",
  [DIRECTION.HORIZONTAL]: "offsetWidth",
};

@Component({
  selector: "virtual-dnd-list",
  template: `
    <div virtual-dnd-list-item
      *ngFor="
        let item of model.slice(range.start, range.end + 1);
        index as i;
        trackBy: trackByFn
      "
      [source]="item"
      [dataKey]="dataKey"
      [sizeKey]="isHorizontal ? 'offsetWidth' : 'offsetHeight'"
      [dragging]="dragging"
      (sizeChange)="onSizeChange($event)"
    >
      <ng-container
        *ngTemplateOutlet="
          listItemTemplateRef;
          context: { $implicit: item, index: i }
        "
      ></ng-container>
    </div>
  `,
  host: {
    "[class.horizontal]": "isHorizontal",
    "[class.vertical]": "!isHorizontal",
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
  @Input() direction: "vertical" | "horizontal" = "vertical";

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
  @Input() sortable: boolean = true;
  @Input() lockAxis: "x" | "y" | "" = "";
  @Input() disabled: boolean = false;
  @Input() draggable: string = "";
  @Input() animation: number = 150;
  @Input() autoScroll: boolean = true;
  @Input() ghostClass: string = "";
  @Input() ghostStyle: CSSStyleDeclaration;
  @Input() chosenClass: string = "";
  @Input() fallbackOnBody: boolean = false;
  @Input() scrollThreshold: number = 55;
  @Input() delayOnTouchOnly: boolean = false;

  @Output() onDrag = new EventEmitter();
  @Output() onDrop = new EventEmitter();
  @Output() onTop = new EventEmitter();
  @Output() onBottom = new EventEmitter();

  @ContentChild(TemplateRef) listItemTemplateRef: any;

  public get isHorizontal() {
    return this.direction === "horizontal";
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
    return this.scrollEl[scrollDir[this.direction]];
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
    this.scrollEl[scrollDir[this.direction]] = offset;
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

  private differ: IterableDiffer<any>;
  constructor(public el: ElementRef, private iterableDiffers: IterableDiffers) {
    this.differ = this.iterableDiffers.find([]).create(null);
  }

  ngOnInit(): void {
    this.initVirtual();
    this.initSortable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    SortableAttrs.forEach((key: any) => {
      if (key in changes) {
        this.sortable$?.option(key, this[key]);
      }
    });
  }

  ngDoCheck(): void {
    const changes = this.differ.diff(this._model);
    if (changes) {
      this.writeValue(this._model);
    }
  }

  ngOnDestroy(): void {
    this.removeScrollEventListener();
    this.sortable$.destroy();
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

    this.updateUniqueKeys();
    this.detectRangeUpdate();

    // auto scroll to the last offset
    if (this.lastLength && this.keepOffset) {
      const index = this._model.length - this.lastLength;
      if (index > 0) {
        this.scrollToIndex(index);
      }
      this.lastLength = 0;
    }

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

  private lastList: any[] = [];
  private uniqueKeys: any[] = [];

  private detectRangeUpdate() {
    let range = { ...this.range };
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

  public dragging: string = '';
  private sortable$: Dnd;
  private reRendered: boolean = false;

  private initSortable() {
    let props = {};
    for (let i = 0; i < SortableAttrs.length; i++) {
      let key = SortableAttrs[i];
      props[key] = this[key];
    }

    this.sortable$ = new Dnd(this.el.nativeElement, {
      ...props,
      swapOnDrop: (params) => params.from === params.to,
      onDrag: (params) => this.onSortableDrag(params),
      onDrop: (params) => this.onSortableDrop(params),
    });
  }

  private onSortableDrag(params: SortableEvent) {
    const key = params.node.getAttribute("data-key");
    const index = this.getIndex(this._model, key);
    const item = this._model[index];

    this.dragging = key;
    this.onDrag.emit({ item, key, index });
    this.sortable$.option("store", { item, key, index, list: this._model });
  }

  private onSortableDrop(params: SortableEvent) {
    const { list, item, key, index } = Dnd.get(params.from).option("store");

    // No changes in current list
    if (params.from === params.to && params.node === params.target) {
      this.onDrop.emit({
        changed: false,
        list,
        item,
        key,
        from: { list, index },
        to: { list, index },
      });
      return;
    }

    const targetKey = params.target.getAttribute("data-key");
    let targetIndex = this.getIndex(this._model, targetKey);

    // changes position in current list
    if (params.from === params.to) {
      if (index < targetIndex && params.relative === -1) {
        targetIndex += params.relative;
      }
      if (index > targetIndex && params.relative === 1) {
        targetIndex += params.relative;
      }

      this._model.splice(index, 1);
      this._model.splice(targetIndex, 0, item);
    } else {
      // remove from
      if (params.from === this.el.nativeElement) {
        this._model.splice(index, 1);
      }

      // added to
      if (params.to === this.el.nativeElement) {
        if (params.relative === 0) {
          // added to last
          targetIndex = this._model.length;
        } else if (params.relative === 1) {
          targetIndex += params.relative;
        }

        this._model.splice(targetIndex, 0, item);
      }
    }

    this.writeValue(this._model);
    this.onModelChange(this._model);
    this.onDrop.emit({
      changed: true,
      item,
      key,
      list: this._model,
      from: { list, index },
      to: { list: this._model, index: targetIndex },
    });

    if (params.from === this.el.nativeElement && this.reRendered) {
      Dnd.dragged?.remove();
    }
    if (params.from !== params.to && params.pullMode === "clone") {
      Dnd.clone?.remove();
    }

    this.dragging = '';
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

  public range: Range = { start: 0, end: this.keeps - 1, front: 0, behind: 0 };
  private sizes: Map<any, number> = new Map();
  private offset: number = 0;
  private calcType: string = CACLTYPE.INIT;
  private calcSize: CalcSize = { average: 0, total: 0, fixed: 0 };
  private scrollEl: HTMLElement;
  private lastLength: number = 0;
  private scrollDirection: string = "";

  public onSizeChange({ key, size }: { key: any; size: number }) {
    const renders = this.sizes.size;
    this.handleItemSizeChange(key, size);
    if (renders >= Math.min(this._model.length, this.keeps)) {
      this.detectRangeUpdate();
    }
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
    this.scroller && Dnd.utils.on(this.scroller, "scroll", this.onScroll);
  }

  private removeScrollEventListener() {
    this.scroller && Dnd.utils.off(this.scroller, "scroll", this.onScroll);
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
      this.onScroll = <any>debounce(() => this.handleScroll(), this.debounceTime);
    } else if (this.throttleTime) {
      this.onScroll = <any>throttle(() => this.handleScroll(), this.throttleTime);
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
      this.scrollDirection = offset < this.offset ? SCROLL_DIRECTION.FRONT : SCROLL_DIRECTION.BEHIND;
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

    this.el.nativeElement.style["padding"] = this.isHorizontal
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
      offset = offset + (typeof size === "number" ? size : this.getItemSize());
    }

    return offset;
  }

  private getEndByStart(start: number) {
    return Math.min(start + this.keeps - 1, this.getLastIndex());
  }

  private getLastIndex() {
    return this.uniqueKeys.length > 0 ? this.uniqueKeys.length - 1 : this.keeps - 1;
  }

  private getItemSize() {
    return this.isFixedItemSize ? this.calcSize.fixed : this.calcSize.average || this.size;
  }

  private getScrollElement(scroller: any) {
    if ((scroller instanceof Document && scroller.nodeType === 9) || scroller instanceof Window) {
      return document.scrollingElement || document.documentElement || document.body;
    }

    return scroller;
  }

  private getScrollStartOffset() {
    let offset = 0;
    if (this.scroller && this.el.nativeElement) {
      const rect = Dnd.utils.getRect(this.el.nativeElement, true, this.scroller);
      offset = this.offset + rect[rectDir[this.direction]];
    }

    return offset;
  }
}
