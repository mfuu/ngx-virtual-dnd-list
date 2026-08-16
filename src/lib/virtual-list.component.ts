import {
  Input,
  Output,
  OnInit,
  NgZone,
  Renderer2,
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
  ChangeDetectorRef,
  ViewEncapsulation,
} from '@angular/core';
import { type ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import Sortable, { type Group, type ScrollSpeed, type SortableEvent } from 'sortable-dnd';
import {
  CoreService,
  debounce,
  getDataKey,
  isEqual,
  SortableAttrs,
  VirtualAttrs,
  type CoreOptions,
  type DragEvent as CoreDragEvent,
  type DropEvent as CoreDropEvent,
  type Range,
  type ScrollEvent,
} from './core';

export type KeyValueType = any;

export interface RenderItem<T> {
  item: T;
  key: KeyValueType;
  index: number;
}

export interface DragEvent<T> {
  key: KeyValueType;
  index: number;
  item: T;
  event: SortableEvent;
}

export interface DropEvent<T> {
  key: KeyValueType;
  item: T;
  list: T[];
  oldList: T[];
  event: SortableEvent;
  changed: boolean;
  oldIndex: number;
  newIndex: number;
}

@Component({
  selector: 'virtual-list, [virtual-list]',
  template: `
    <ng-container
      *ngTemplateOutlet="spacerTemplate; context: { $implicit: range.front }"
    ></ng-container>

    <ng-template
      *ngFor="let render of renderList; trackBy: trackByFn"
      [virtualItem]="render"
      [itemKey]="render.key"
      [dragging]="dragging"
      [isHorizontal]="isHorizontal"
      (sizeChange)="onSizeChange($event)"
    >
      <ng-container
        *ngTemplateOutlet="
          listItemTemplateRef;
          context: { $implicit: render.item, index: render.index, key: render.key }
        "
      ></ng-container>
    </ng-template>

    <ng-container
      *ngTemplateOutlet="spacerTemplate; context: { $implicit: range.behind }"
    ></ng-container>

    <ng-template #spacerTemplate let-offset>
      <tr *ngIf="tableMode">
        <td
          [style.border]="0"
          [style.padding]="0"
          [style.width]="isHorizontal ? offset + 'px' : ''"
          [style.height]="isHorizontal ? '' : offset + 'px'"
        ></td>
      </tr>
    </ng-template>
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VirtualListComponent),
      multi: true,
    },
  ],
  encapsulation: ViewEncapsulation.None,
})
export class VirtualListComponent<T> implements OnInit, OnDestroy, OnChanges, ControlValueAccessor {
  @Input() size: number;
  @Input() keeps: number = 30;
  @Input() buffer: number;
  @Input() wrapper: HTMLElement;
  @Input() scroller: HTMLElement | Document;
  @Input() tableMode: boolean = false;
  @Input() direction: 'vertical' | 'horizontal' = 'vertical';
  @Input() keepOffset: boolean = false;
  @Input() debounceTime: number = 0;
  @Input() throttleTime: number = 0;

  @Input() delay: number;
  @Input() group: string | Group;
  @Input() handle: string | ((event: Event & (TouchEvent | MouseEvent)) => boolean);
  @Input() dataKey: string | ((item: T) => KeyValueType);
  @Input() sortable: boolean = true;
  @Input() lockAxis: 'x' | 'y' | '' = '';
  @Input() disabled: boolean = false;
  @Input() draggable: string = '[role="item"]';
  @Input() animation: number = 150;
  @Input() autoScroll: boolean = true;
  @Input() scrollSpeed: ScrollSpeed = { x: 10, y: 10 };
  @Input() ghostClass: string = '';
  @Input() ghostStyle: Partial<CSSStyleDeclaration> = {};
  @Input() chosenClass: string = '';
  @Input() placeholderClass: string = '';
  @Input() appendToBody: boolean = false;
  @Input() scrollThreshold: number = 55;
  @Input() delayOnTouchOnly: boolean = false;
  @Input() dropOnAnimationEnd: boolean = true;

  @Output() onTop = new EventEmitter();
  @Output() onBottom = new EventEmitter();
  @Output() onScroll = new EventEmitter<ScrollEvent>();
  @Output() onDrag: EventEmitter<DragEvent<T>> = new EventEmitter();
  @Output() onDrop: EventEmitter<DropEvent<T>> = new EventEmitter();
  @Output() onRangeChange: EventEmitter<Range> = new EventEmitter();

  @ContentChild(TemplateRef) listItemTemplateRef: TemplateRef<T>;

  public get renderList() {
    return this.modelValue.slice(this.range.start, this.range.end + 1).map((item, i) => ({
      item,
      index: this.range.start + i,
      key: this.getItemKey(item),
    }));
  }

  public get isHorizontal() {
    return this.direction === 'horizontal';
  }

  /**
   * Get the size of the current item by data key
   */
  public getSize(key: KeyValueType) {
    return this.core.virtual.getSize(key);
  }

  /**
   * Get the current scroll height
   */
  public getOffset() {
    return this.core.virtual.getOffset();
  }

  /**
   * Get all scroll size (scrollHeight or scrollWidth)
   */
  public getScrollSize() {
    return this.core.virtual.getScrollSize();
  }

  /**
   * Get the scroller's client viewport size (width or height)
   */
  public getClientSize() {
    return this.core.virtual.getClientSize();
  }

  /**
   * Scroll to the specified data-key position
   */
  public scrollToKey(key: KeyValueType, align?: 'top' | 'bottom' | 'auto') {
    const index = this.uniqueKeys.indexOf(key);
    if (index > -1) {
      this.core.virtual.scrollToIndex(index, align);
    }
  }

  /**
   * Scroll to the specified index position
   */
  public scrollToIndex(index: number, align?: 'top' | 'bottom' | 'auto') {
    this.core.virtual.scrollToIndex(index, align);
  }

  /**
   * Scroll to the specified offset left/top
   */
  public scrollToOffset(offset: number) {
    this.core.virtual.scrollToOffset(offset);
  }

  /**
   * Scroll to bottom of list
   */
  public scrollToBottom() {
    this.core.virtual.scrollToBottom();
  }

  private differ: IterableDiffer<any>;
  constructor(
    protected readonly el: ElementRef,
    protected readonly cdr: ChangeDetectorRef,
    protected readonly zone: NgZone,
    protected readonly render2: Renderer2,
    protected readonly iterableDiffers: IterableDiffers
  ) {
    this.differ = this.iterableDiffers.find([]).create(null);
  }

  ngOnInit(): void {
    this.installVirtualSortable();
  }

  ngOnChanges(changes: SimpleChanges): void {
    [...VirtualAttrs, ...SortableAttrs].forEach((key) => {
      if (key in changes) {
        this.core?.option(key as keyof CoreOptions<KeyValueType>, this[key]);
      }
    });
  }

  ngDoCheck(): void {
    const changes = this.differ.diff(this.modelValue);
    if (changes) {
      this.writeValue(this.modelValue);
    }
  }

  ngOnDestroy(): void {
    this.core.destroy();
  }

  public trackByFn = (_: number, item: RenderItem<T>) => {
    return item.key;
  };

  public modelValue: T[] = [];
  public onModelTouched = (_: T[]) => {};
  public onModelChange = (_: T[]) => {};

  public registerOnChange(fn: (_: T[]) => void): void {
    this.onModelChange = fn;
  }

  public registerOnTouched(fn: (_: T[]) => void): void {
    this.onModelTouched = fn;
  }

  public range: Range = { start: 0, end: this.keeps - 1, front: 0, behind: 0 };

  private uniqueKeys: KeyValueType[] = [];
  private lastListLength: number = 0;
  private listLengthWhenTopLoading: number = 0;
  public writeValue(value: T[]): void {
    this.modelValue = value || [];

    this.updateUniqueKeys();
    this.detectRangeUpdate(this.lastListLength, this.modelValue.length);

    // auto scroll to the last offset
    if (this.listLengthWhenTopLoading && this.keepOffset) {
      const index = this.modelValue.length - this.listLengthWhenTopLoading;
      if (index > 0) {
        this.scrollToIndex(index);
      }
      this.listLengthWhenTopLoading = 0;
    }

    this.lastListLength = this.modelValue.length;
  }

  private getItemKey(item: T) {
    if (typeof this.dataKey === 'function') {
      return this.dataKey(item);
    }

    return getDataKey(item, this.dataKey);
  }

  private updateUniqueKeys() {
    const len = this.modelValue.length;
    const keys = new Array(len);

    for (let i = 0; i < len; i++) {
      keys[i] = this.getItemKey(this.modelValue[i]);
    }

    this.uniqueKeys = keys;
    this.core?.option('uniqueKeys', this.uniqueKeys);
  }

  private detectRangeUpdate(oldListLength: number, newListLength: number) {
    if (newListLength === oldListLength) {
      return;
    }

    let range = { ...this.range };
    if (
      oldListLength > this.keeps &&
      newListLength > oldListLength &&
      range.end === oldListLength - 1 &&
      this.core?.virtual.isReachedBottom()
    ) {
      range.start++;
    }

    this.core?.virtual.updateRange(range);
  }

  // ========================================== virtual sortable ==========================================
  public core: CoreService<KeyValueType>;

  public dragging: KeyValueType = '';

  private installVirtualSortable() {
    const coreAttributes = [...VirtualAttrs, ...SortableAttrs].reduce((res, key) => {
      res[key] = this[key];
      return res;
    }, {} as CoreOptions<KeyValueType>);

    this.core = new CoreService<KeyValueType>(this.el.nativeElement, {
      ...coreAttributes,
      wrapper: this.el.nativeElement,
      scroller: this.scroller,
      uniqueKeys: this.uniqueKeys,
      onDrag: (event) => this.handleDrag(event),
      onDrop: (event) => this.handleDrop(event),
      onScroll: (event) => this.handleScroll(event),
      onUpdate: (range, changed) => this.handleUpdate(range, changed),
    });
  }

  private handleToTop = debounce(() => {
    this.listLengthWhenTopLoading = this.modelValue.length;
    this.onTop.emit();
  }, 50);

  private handleToBottom = debounce(() => {
    this.onBottom.emit();
  }, 50);

  private handleScroll(event: ScrollEvent) {
    this.onScroll.emit(event);

    this.listLengthWhenTopLoading = 0;
    if (event.top) {
      this.handleToTop();
    } else if (event.bottom) {
      this.handleToBottom();
    }
  }

  private handleUpdate(range: Range, changed: boolean) {
    this.range = range;

    changed && this.onRangeChange.emit(range);

    this.updateSpacerStyle();
    this.cdr.detectChanges();
  }

  public onSizeChange({ key, size }: { key: KeyValueType; size: number }) {
    if (isEqual(key, this.dragging) || !this.core) {
      return;
    }

    const sizes = this.core.virtual.sizes.size;
    this.core.virtual.updateItemSize(key, size);

    if (sizes === this.keeps - 1 && this.modelValue.length > this.keeps) {
      this.core.virtual.updateRange(this.range);
    }
  }

  private handleDrag(event: CoreDragEvent<KeyValueType>) {
    const { key, index } = event;
    const item = this.modelValue[index];

    Sortable.store.draggingItem = item;
    this.dragging = key;

    this.onDrag.emit({ ...event, item });
  }

  private handleDrop(event: CoreDropEvent<KeyValueType>) {
    const item = Sortable.store.draggingItem;
    const { oldIndex, newIndex } = event;

    const oldList = [...this.modelValue];
    const newList = [...this.modelValue];

    if (oldIndex === -1) {
      newList.splice(newIndex, 0, item);
    } else if (newIndex === -1) {
      newList.splice(oldIndex, 1);
    } else {
      newList.splice(oldIndex, 1);
      newList.splice(newIndex, 0, item);
    }

    this.dragging = '';

    if (event.changed) {
      this.modelValue = newList;
      this.writeValue(this.modelValue);
      this.onModelChange(this.modelValue);
    }

    this.onDrop.emit({ ...event, item, list: newList, oldList });
  }

  private updateSpacerStyle() {
    if (this.tableMode) {
      return;
    }

    this.zone.runOutsideAngular(() => {
      const { front, behind } = this.range;
      const padding = this.isHorizontal ? `0 ${behind}px 0 ${front}px` : `${front}px 0 ${behind}px`;

      this.render2.setStyle(this.el.nativeElement, 'padding', padding);
    });
  }
}
