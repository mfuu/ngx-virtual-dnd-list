import {
    Input,
    Output,
    OnInit,
    Component,
    forwardRef,
    ElementRef,
    TemplateRef,
    ContentChild,
    EventEmitter,
  } from '@angular/core';
  import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
  import Dnd, { Group } from 'sortable-dnd';
  
  @Component({
    selector: 'virtual-dnd-list',
    template: `
      <ng-content select="header"></ng-content>
      <virtual-dnd-list-item
        *ngFor="let item of model.slice(range.start, range.end + 1); index as i"
        [sizeKey]="itemSizeKey"
        [dataKey]="getItemKey(item)"
        [attr.data-key]="getItemKey(item)"
        [ngStyle]="getItemStyle(item)"
        (sizeChange)="onItemSizeChange($event)"
      >
        <ng-container
          *ngTemplateOutlet="
            listItemTemplateRef;
            context: { $implicit: item, index: i }
          "
        ></ng-container>
      </virtual-dnd-list-item>
      <ng-content select="footer"></ng-content>
    `,
    host: {
      '[class.horizontal]': 'isHorizontal',
    },
    styles: [
      `
        :host {
          display: block;
          overflow: hidden auto;
        }
  
        :host.horizontal {
          overflow: auto hidden;
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
  export class VirtualDndListComponent implements OnInit, ControlValueAccessor {
    @Input() size: number;
    @Input() keeps: number = 30;
    @Input() scroller: any;
    @Input() direction: 'vertical' | 'horizontal' = 'vertical';
    @Input() debounceTime: number;
    @Input() throttleTime: number;
  
    @Input() delay: number;
    @Input() group: Group;
    @Input() handle: any;
    @Input() dataKey: string;
    @Input() disabled: boolean;
    @Input() draggable: string = 'virtual-dnd-list-item';
    @Input() animation: number = 150;
    @Input() autoScroll: boolean;
    @Input() ghostClass: string;
    @Input() ghostStyle: CSSStyleDeclaration;
    @Input() chosenClass: string;
    @Input() fallbackOnBody: boolean;
    @Input() scrollThreshold: number;
    @Input() delayOnTouchOnly: boolean;
  
    @Output() onDrag = new EventEmitter();
    @Output() onDrop = new EventEmitter();
    @Output() onAdd = new EventEmitter();
    @Output() onRemove = new EventEmitter();
  
    @ContentChild(TemplateRef) listItemTemplateRef: any;
  
    @ContentChild('container', { read: ElementRef, static: false })
    protected containerElementRef: ElementRef;
  
    public virtual: Virtual;
    public sortable: Sortable;
    public uniqueKeys: Array<any> = [];
    public range = { start: 0, end: this.keeps - 1, front: 0, behind: 0 };
    public start = 0;
  
    private _model: Array<any> = [];
    private onTouchedCallbackFn = (_: any) => {};
    private onChangeCallbackFn = (_: any) => {};
  
    public get model() {
      return this._model;
    }
    public set model(val) {
      this._model = val;
      this.onChangeCallbackFn(val);
    }
  
    public get isHorizontal() {
      return this.direction === 'horizontal';
    }
  
    public get itemSizeKey() {
      return this.isHorizontal ? 'offsetWidth' : 'offsetHeight';
    }
  
    constructor(public el: ElementRef) {}
  
    ngOnInit(): void {
      this.initVirtual();
    }
  
    getItemKey(item) {
      return getDataKey(item, this.dataKey);
    }
  
    getItemStyle(item) {
      const fromKey = Dnd.dragged?.getAttribute('data-key');
      const itemKey = this.getItemKey(item);
      if (itemKey == fromKey) {
        return { display: 'none' };
      }
      return {};
    }
  
    initVirtual() {
      this.virtual = new Virtual({
        size: this.size,
        keeps: this.keeps,
        buffer: Math.round(this.keeps / 3),
        scroller: this.scroller || this.el.nativeElement,
        direction: this.direction,
        uniqueKeys: this.uniqueKeys,
        debounceTime: this.debounceTime,
        throttleTime: this.throttleTime,
        onScroll: (params) => {
          // console.log(params, 'scroll');
        },
        onUpdate: (range) => {
          if (range.start !== this.range.start && Dnd.dragged) {
            this.sortable.reRendered = true;
          }
          this.range = range;
          this.el.nativeElement.style['padding'] = this.isHorizontal
            ? `0 ${this.range.behind}px 0 ${this.range.front}px`
            : `${this.range.front}px 0 ${this.range.behind}px`;
        },
      });
    }
  
    initSortable() {
      this.sortable = new Sortable(this.el.nativeElement, {
        list: this._model,
        delay: this.delay,
        group: this.group,
        handle: this.handle,
        dataKey: this.dataKey,
        disabled: this.disabled,
        draggable: this.draggable,
        animation: this.animation,
        autoScroll: this.autoScroll,
        ghostClass: this.ghostClass,
        ghostStyle: this.ghostStyle,
        chosenClass: this.chosenClass,
        fallbackOnBody: this.fallbackOnBody,
        scrollThreshold: this.scrollThreshold,
        delayOnTouchOnly: this.delayOnTouchOnly,
        onDrag: (params) => {
          console.log(params);
  
          this.start = this.range.start;
        },
        onDrop: (params) => {
          // if (list.length === this.list.length && this.start < this.range.start) {
          //   this.range.front += Dnd.clone[this.isHorizontal ? 'offsetWidth' : 'offsetHeight'];
          //   this.start = this.range.start;
          // }
  
          this._model = params.list;
          console.log(params.list);
        },
      });
    }
  
    onItemSizeChange({ key, size }: { key: any; size: number }) {
      this.virtual.handleItemSizeChange(key, size);
    }
  
    updateUniqueKeys() {
      this.uniqueKeys = this._model.map((item) => getDataKey(item, this.dataKey));
      this.virtual.updateOptions('uniqueKeys', this.uniqueKeys);
    }
  
    writeValue(value: Array<any>): void {
      this._model = value || [];
  
      this.updateUniqueKeys();
      if (this.virtual.sizes.size) {
        this.virtual.updateRange();
      } else {
        setTimeout(() => this.virtual.updateRange(), 17);
      }
  
      if (this.sortable) {
        this.sortable.option('list', this._model);
      } else {
        this.initSortable();
      }
    }
  
    registerOnChange(fn: (_: any) => void): void {
      this.onChangeCallbackFn = fn;
    }
  
    registerOnTouched(fn: (_: any) => void): void {
      this.onTouchedCallbackFn = fn;
    }
  }
  
  const SortableAttributes = [
    'delay',
    'group',
    'handle',
    'disabled',
    'draggable',
    'animation',
    'autoScroll',
    'ghostClass',
    'ghostStyle',
    'chosenClass',
    'fallbackOnBody',
    'scrollThreshold',
    'delayOnTouchOnly',
  ];
  
  class Sortable {
    el: HTMLElement;
    options: any;
    list: Array<any>;
    store: any;
    reRendered: boolean;
    sortable: any;
    constructor(el: HTMLElement, options: any) {
      this.el = el;
      this.options = options;
  
      this.list = [...options.list];
      this.store = {};
      this.reRendered = false;
  
      this.init();
    }
  
    destroy() {
      this.sortable && this.sortable.destroy();
      this.sortable = this.store = null;
      this.reRendered = false;
    }
  
    option(key: any, value: any) {
      if (key === 'list') {
        this.list = [...value];
      } else if (key === 'reRendered') {
        this.reRendered = value;
      } else {
        this.sortable.option(key, value);
      }
    }
  
    init() {
      let props = {};
      for (let i = 0; i < SortableAttributes.length; i++) {
        let key = SortableAttributes[i];
        props[key] = this.options[key];
      }
  
      this.sortable = new Dnd(this.el, {
        ...props,
        swapOnDrop: (params) => params.from === params.to,
        onDrag: (params) => this.onDrag(params),
        onAdd: (params) => this.onAdd(params),
        onRemove: (params) => this.onRemove(params),
        onChange: (params) => this.onChange(params),
        onDrop: (params) => this.onDrop(params),
      });
    }
  
    onDrag(params) {
      const key = params.node.dataset.key;
      const index = this.getIndex(this.list, key);
      const item = this.list[index];
  
      // store the drag item
      this.store = {
        item,
        key,
        origin: { index, list: this.list },
        from: { index, list: this.list },
        to: { index, list: this.list },
      };
      this.sortable.option('store', this.store);
  
      this.dispatchEvent('onDrag', { item, key, index });
    }
  
    onRemove(params) {
      const key = params.node.dataset.key;
      const index = this.getIndex(this.list, key);
      const item = this.list[index];
  
      this.list.splice(index, 1);
  
      Object.assign(this.store, { key, item });
      this.sortable.option('store', this.store);
  
      this.dispatchEvent('onRemove', { item, key, index });
    }
  
    onAdd(params) {
      const { from, target, relative } = params;
      const { key, item } = Dnd.get(from).option('store');
  
      let index = this.getIndex(this.list, target.dataset.key);
  
      if (relative === -1) {
        index += 1;
      }
  
      this.list.splice(index, 0, item);
  
      Object.assign(this.store, {
        to: {
          index,
          list: this.list,
        },
      });
      this.sortable.option('store', this.store);
  
      this.dispatchEvent('onAdd', { item, key, index });
    }
  
    onChange(params) {
      const store = Dnd.get(params.from).option('store');
  
      if (params.revertDrag) {
        this.list = [...this.options.list];
  
        Object.assign(this.store, {
          from: store.origin,
        });
  
        return;
      }
  
      const { node, target, relative, backToOrigin } = params;
  
      const fromIndex = this.getIndex(this.list, node.dataset.key);
      const fromItem = this.list[fromIndex];
  
      let toIndex = this.getIndex(this.list, target.dataset.key);
  
      if (backToOrigin) {
        if (relative === 1 && store.from.index < toIndex) {
          toIndex -= 1;
        }
        if (relative === -1 && store.from.index > toIndex) {
          toIndex += 1;
        }
      }
  
      this.list.splice(fromIndex, 1);
      this.list.splice(toIndex, 0, fromItem);
  
      Object.assign(this.store, {
        from: {
          index: toIndex,
          list: this.list,
        },
        to: {
          index: toIndex,
          list: this.list,
        },
      });
    }
  
    onDrop(params) {
      const { from, to } = this.getStore(params);
      const changed =
        params.from !== params.to || from.origin.index !== to.to.index;
  
      this.dispatchEvent('onDrop', {
        changed,
        list: this.list,
        item: from.item,
        key: from.key,
        from: from.origin,
        to: to.to,
      });
  
      if (params.from === this.el && this.reRendered) {
        Dnd.dragged?.remove();
      }
      if (params.from !== params.to && params.pullMode === 'clone') {
        Dnd.clone?.remove();
      }
  
      this.reRendered = false;
    }
  
    getIndex(list, key) {
      for (let i = 0; i < list.length; i++) {
        if (getDataKey(list[i], this.options.dataKey) == key) {
          return i;
        }
      }
      return -1;
    }
  
    getStore(params) {
      return {
        from: Dnd.get(params.from)?.option('store'),
        to: Dnd.get(params.to)?.option('store'),
      };
    }
  
    dispatchEvent(name, params) {
      const cb = this.options[name];
      if (cb) cb(params);
    }
  }
  
  const CACLTYPE = {
    INIT: 'INIT',
    FIXED: 'FIXED',
    DYNAMIC: 'DYNAMIC',
  };
  
  const SCROLL_DIRECTION = {
    FRONT: 'FRONT',
    BEHIND: 'BEHIND',
    STATIONARY: 'STATIONARY',
  };
  
  const DIRECTION = {
    HORIZONTAL: 'horizontal',
    VERTICAL: 'vertical',
  };
  
  const scrollType = {
    [DIRECTION.VERTICAL]: 'scrollTop',
    [DIRECTION.HORIZONTAL]: 'scrollLeft',
  };
  
  const scrollSize = {
    [DIRECTION.VERTICAL]: 'scrollHeight',
    [DIRECTION.HORIZONTAL]: 'scrollWidth',
  };
  
  const offsetSize = {
    [DIRECTION.VERTICAL]: 'offsetHeight',
    [DIRECTION.HORIZONTAL]: 'offsetWidth',
  };
  
  const offsetType = {
    [DIRECTION.VERTICAL]: 'offsetTop',
    [DIRECTION.HORIZONTAL]: 'offsetLeft',
  };
  
  const attributes = [
    'size',
    'keeps',
    'scroller',
    'direction',
    'debounceTime',
    'throttleTime',
  ];
  
  class Virtual {
    options: any;
    sizes: any;
    range: any;
    offset: number;
    calcType: string;
    calcSize: any;
    scrollEl: HTMLElement;
    direction: string;
    useWindowScroll: boolean;
    _onScroll: any;
    constructor(options) {
      this.options = options;
  
      const defaults = {
        size: 0,
        keeps: 0,
        buffer: 0,
        wrapper: null,
        scroller: null,
        direction: 'vertical',
        uniqueKeys: [],
        debounceTime: null,
        throttleTime: null,
      };
  
      for (const name in defaults) {
        !(name in this.options) && (this.options[name] = defaults[name]);
      }
  
      this.sizes = new Map(); // store item size
      this.range = { start: 0, end: 0, front: 0, behind: 0 };
      this.offset = 0;
      this.calcType = CACLTYPE.INIT;
      this.calcSize = { average: 0, total: 0, fixed: 0, header: 0 };
      this.scrollEl = this._getScrollElement(options.scroller);
      this.direction = '';
      this.useWindowScroll = null;
  
      this._updateOnScrollFunction();
      this.addScrollEventListener();
      this._checkIfUpdate(0, options.keeps - 1);
    }
  
    isFront() {
      return this.direction === SCROLL_DIRECTION.FRONT;
    }
  
    isBehind() {
      return this.direction === SCROLL_DIRECTION.BEHIND;
    }
  
    isFixed() {
      return this.calcType === CACLTYPE.FIXED;
    }
  
    getSize(key) {
      return this.sizes.get(key) || this._getItemSize();
    }
  
    getOffset() {
      return this.scrollEl[scrollType[this.options.direction]];
    }
  
    getScrollSize() {
      return this.scrollEl[scrollSize[this.options.direction]];
    }
  
    getClientSize() {
      return this.scrollEl[offsetSize[this.options.direction]];
    }
  
    scrollToOffset(offset) {
      this.scrollEl[scrollType[this.options.direction]] = offset;
    }
  
    scrollToIndex(index) {
      if (index >= this.options.uniqueKeys.length - 1) {
        this.scrollToBottom();
      } else {
        const indexOffset = this._getOffsetByIndex(index);
        this.scrollToOffset(indexOffset);
      }
    }
  
    scrollToBottom() {
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
  
    updateOptions(key, value) {
      const oldValue = this.options[key];
  
      this.options[key] = value;
  
      if (key === 'uniqueKeys') {
        this.sizes.forEach((v, k) => {
          if (!value.includes(k)) {
            this.sizes.delete(k);
          }
        });
      } else if (key === 'scroller') {
        oldValue?.removeEventListener('scroll', this._onScroll);
  
        this.scrollEl = this._getScrollElement(value);
        this.addScrollEventListener();
      }
    }
  
    updateRange(range?) {
      if (range) {
        this._handleUpdate(range.start, range.end);
        return;
      }
  
      let start = this.range.start;
      start = Math.max(start, 0);
  
      this._handleUpdate(start, this._getEndByStart(start));
    }
  
    handleItemSizeChange(key, size) {
      this.sizes.set(key, size);
  
      if (this.calcType === CACLTYPE.INIT) {
        this.calcType = CACLTYPE.FIXED;
        this.calcSize.fixed = size;
      } else if (this.isFixed() && this.calcSize.fixed !== size) {
        this.calcType = CACLTYPE.DYNAMIC;
        this.calcSize.fixed = undefined;
      }
      // In the case of non-fixed heights, the average height and the total height are calculated
      if (this.calcType !== CACLTYPE.FIXED) {
        this.calcSize.total = [...this.sizes.values()].reduce((t, i) => t + i, 0);
        this.calcSize.average = Math.round(this.calcSize.total / this.sizes.size);
      }
    }
  
    handleSlotSizeChange(key, size) {
      this.calcSize[key] = size;
    }
  
    addScrollEventListener() {
      this.options.scroller?.addEventListener('scroll', this._onScroll, false);
    }
  
    removeScrollEventListener() {
      this.options.scroller?.removeEventListener('scroll', this._onScroll);
    }
  
    _updateOnScrollFunction() {
      const { debounceTime, throttleTime } = this.options;
      if (debounceTime) {
        this._onScroll = debounce(() => this._handleScroll(), debounceTime);
      } else if (throttleTime) {
        this._onScroll = throttle(() => this._handleScroll(), throttleTime);
      } else {
        this._onScroll = () => this._handleScroll();
      }
  
      this._onScroll = this._onScroll.bind(this);
    }
  
    _handleScroll() {
      const offset = this.getOffset();
      const clientSize = this.getClientSize();
      const scrollSize = this.getScrollSize();
  
      if (offset === this.offset) {
        this.direction = SCROLL_DIRECTION.STATIONARY;
      } else {
        this.direction =
          offset < this.offset ? SCROLL_DIRECTION.FRONT : SCROLL_DIRECTION.BEHIND;
      }
  
      this.offset = offset;
  
      const top = this.isFront() && offset <= 0;
      const bottom = this.isBehind() && clientSize + offset >= scrollSize;
  
      this.options.onScroll({ top, bottom, offset, direction: this.direction });
  
      if (this.isFront()) {
        this._handleScrollFront();
      } else if (this.isBehind()) {
        this._handleScrollBehind();
      }
    }
  
    _handleScrollFront() {
      const scrolls = this._getScrollItems();
      if (scrolls > this.range.start) {
        return;
      }
      const start = Math.max(scrolls - this.options.buffer, 0);
      this._checkIfUpdate(start, this._getEndByStart(start));
    }
  
    _handleScrollBehind() {
      const scrolls = this._getScrollItems();
  
      if (scrolls < this.range.start + this.options.buffer) {
        return;
      }
      this._checkIfUpdate(scrolls, this._getEndByStart(scrolls));
    }
  
    _getScrollItems() {
      const offset = this.offset - this._getScrollStartOffset();
  
      if (offset <= 0) {
        return 0;
      }
  
      if (this.isFixed()) {
        return Math.floor(offset / this.calcSize.fixed);
      }
  
      let low = 0;
      let high = this.options.uniqueKeys.length;
      let middle = 0;
      let middleOffset = 0;
  
      while (low <= high) {
        middle = low + Math.floor((high - low) / 2);
        middleOffset = this._getOffsetByIndex(middle);
  
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
  
    _checkIfUpdate(start, end) {
      const keeps = this.options.keeps;
      const total = this.options.uniqueKeys.length;
  
      if (total <= keeps) {
        start = 0;
        end = this._getLastIndex();
      } else if (end - start < keeps - 1) {
        start = end - keeps + 1;
      }
  
      if (this.range.start !== start) {
        this._handleUpdate(start, end);
      }
    }
  
    _handleUpdate(start, end) {
      this.range.start = start;
      this.range.end = end;
      this.range.front = this._getFrontOffset();
      this.range.behind = this._getBehindOffset();
  
      this.options.onUpdate({ ...this.range });
    }
  
    _getFrontOffset() {
      if (this.isFixed()) {
        return this.calcSize.fixed * this.range.start;
      } else {
        return this._getOffsetByIndex(this.range.start);
      }
    }
  
    _getBehindOffset() {
      const end = this.range.end;
      const last = this._getLastIndex();
  
      if (this.isFixed()) {
        return (last - end) * this.calcSize.fixed;
      }
  
      return (last - end) * this._getItemSize();
    }
  
    _getOffsetByIndex(index) {
      if (!index) return 0;
  
      let offset = 0;
      for (let i = 0; i < index; i++) {
        const size = this.sizes.get(this.options.uniqueKeys[i]);
        offset = offset + (typeof size === 'number' ? size : this._getItemSize());
      }
  
      return offset;
    }
  
    _getEndByStart(start) {
      return Math.min(start + this.options.keeps - 1, this._getLastIndex());
    }
  
    _getLastIndex() {
      const { uniqueKeys, keeps } = this.options;
      return uniqueKeys.length > 0 ? uniqueKeys.length - 1 : keeps - 1;
    }
  
    _getItemSize() {
      return this.isFixed()
        ? this.calcSize.fixed
        : this.calcSize.average || this.options.size;
    }
  
    _getScrollElement(scroller: any) {
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
  
    _getScrollStartOffset() {
      let offset = this.calcSize.header;
      if (this.useWindowScroll && this.options.wrapper) {
        let el = this.options.wrapper;
        do {
          offset += el[offsetType[this.options.direction]];
        } while (
          (el = el.offsetParent) &&
          el !== this.options.wrapper.ownerDocument
        );
      }
  
      return offset;
    }
  }
  
  function debounce(func, delay = 0, immediate = false) {
    let timer = null;
    let result;
    let debounced = function (...args) {
      if (timer) clearTimeout(timer);
      if (immediate) {
        let callNow = !timer;
        timer = setTimeout(() => {
          timer = null;
        }, delay);
        if (callNow) result = func.apply(this, args);
      } else {
        timer = setTimeout(() => {
          func.apply(this, args);
        }, delay);
      }
      return result;
    };
    debounced['cancel'] = function () {
      clearTimeout(timer);
      timer = null;
    };
    return debounced;
  }
  
  function throttle(fn, delay) {
    let timer = null;
    return function () {
      const context = this,
        args = arguments;
      if (!timer) {
        timer = setTimeout(function () {
          timer = null;
          fn.apply(context, args);
        }, delay);
      }
    };
  }
  
  function getDataKey(item, dataKey) {
    return (
      !Array.isArray(dataKey)
        ? dataKey.replace(/\[/g, '.').replace(/\]/g, '.').split('.')
        : dataKey
    ).reduce((o, k) => (o || {})[k], item);
  }
  