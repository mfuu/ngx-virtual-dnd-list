# Methods

## Usage

```ts
import { Component, ViewChild } from '@angular/core';
import { VirtualListComponent } from 'ngx-virtual-sortable';

@Component({
  selector: 'virutal-list',
  template: `
    <div #scroller>
      <virtual-list
        #virtualList
        ...
      >
        ...
      </virtual-list>
    </div>
    <button (click)="scrollToBottom()">scroll to bottom</button>
  `,
  styles: [],
})
export class ListComponent {
  @ViewChild('virtualList') virtualList: VirtualListComponent;

  scrollToBottom() {
    this.virtualList.scrollToBottom();
  }
}
```

## `getSize(key)`

Get the size of the current item by unique key value

## `getOffset()`

Get the current scroll height

## `getClientSize()`

Get wrapper element client viewport size (width or height)

## `getScrollSize()`

Get all scroll size (scrollHeight or scrollWidth)

## `scrollToTop()`

Scroll to top of list

## `scrollToBottom()`

Scroll to bottom of list

## `scrollToKey(key, align: 'top' | 'bottom' | 'auto')`

Scroll to the specified `dataKey` position

## `scrollToIndex(index: number, align: 'top' | 'bottom' | 'auto')`

Scroll to the specified `index` position

## `scrollToOffset(offset: number)`

Scroll to the specified offset
