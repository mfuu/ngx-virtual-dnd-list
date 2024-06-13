# ngx-virtual-dnd-list

[![npm](https://img.shields.io/npm/v/ngx-virtual-dnd-list.svg)](https://www.npmjs.com/package/ngx-virtual-dnd-list) [![npm](https://img.shields.io/npm/dm/ngx-virtual-dnd-list.svg)](https://www.npmjs.com/package/ngx-virtual-dnd-list) [![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

A virtual scrolling list component that can be sorted by dragging

### [Live demo](https://mfuu.github.io/ngx-virtual-dnd-list/)

## Simple usage

```bash
npm i ngx-virtual-dnd-list
```

**`virutal-list.module.ts`**

```ts
...
import { VirtualDndListModule } from 'ngx-virtual-dnd-list';

@NgModule({
  declarations: [
    ...
  ],
  imports: [
    ...
    VirtualDndListModule
  ],
  providers: []
})
export class VirtualListModule { }
```

**`virutal-list.component.ts`**

```ts
import { Component } from '@angular/core';

@Component({
  selector: 'virutal-list',
  template: `
    <div #scroller>
      <div virtual-dnd-list
        [scroller]="scroller"
        [dataKey]="'id'"
        [keeps]="30"
        [(ngModel)]="list"
        (ngModelChange)="onChange($event)"
      >
        <ng-template let-data let-index="index">
          <span>{{ index }}</span>
          <p>{{ data.text }}</p>
        </ng-template>
      </virtual-dnd-list>
    </div>
  `,
  styles: [],
})
export class AppComponent {
  public list = [
    { id: 'a', text: 'aaa' },
    { id: 'b', text: 'bbb' },
    { id: 'c', text: 'ccc' },
    ...
  ];

  onChange(data) {
    // the data changes after the dragging ends
  }
}

```

## EventEmitters

| **Event**     | **Description**                  |
| ------------- | -------------------------------- |
| `onTop`       | scrolled to top                  |
| `onBottom`    | scrolled to bottom               |
| `onDrag`      | the drag is started              |
| `onDrop`      | the drag is completed            |
| `rangeChange` | triggered when the range changes |

## Attributes

### Required Attributes

| **Prop**   | **Type**                  | **Description**                                                       |
| ---------- | ------------------------- | --------------------------------------------------------------------- |
| `data-key` | `String`                  | The unique identifier of each piece of data, in the form of `'a.b.c'` |
| `scroller` | `HTMLElement \| Document` | Virtual list scrolling element                                        |

### Optional Attributes

**Commonly used**

| **Prop**       | **Type**                 | **Default** | **Description**                                                                                                   |
| -------------- | ------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `keeps`        | `Number`                 | `30`        | The number of lines rendered by the virtual scroll                                                                |
| `size`         | `Number`                 | `-`         | The estimated height of each piece of data, you can choose to pass it or not, it will be automatically calculated |
| `handle`       | `Function/String`        | `-`         | Drag handle selector within list items                                                                            |
| `group`        | `Object/String`          | `-`         | string: 'name' or object: `{ name: 'group', put: true/false, pull: true/false/'clone', revertDrag: true/false }`  |
| `keepOffset`   | `Boolean`                | `false`     | When scrolling up to load data, keep the same offset as the previous scroll                                       |
| `direction`    | `vertical \| horizontal` |             | scroll direction                                                                                                  |
| `lockAxis`     | `x \| y`                 | `-`         | Axis on which dragging will be locked                                                                             |
| `debounceTime` | `Number`                 | `0`         | debounce time on scroll                                                                                           |
| `throttleTime` | `Number`                 | `0`         | throttle time on scroll                                                                                           |

**Uncommonly used**

| **Prop**           | **Type**  | **Default** | **Description**                                                                                                                |
| ------------------ | --------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `draggable`        | `String`  | `.virtual-dnd-list-item`         | Specifies which items inside the element should be draggable. If does not set a value, the default list element can be dragged |
| `itemClass`        | `String`  | `virtual-dnd-list-item`         | default list item class |
| `sortable`         | `Boolean` | `true`      | Allow Sorting by Dragging                                                                                                      |
| `disabled`         | `Boolean` | `false`     | Disables the sortable if set to true                                                                                           |
| `animation`        | `Number`  | `150`       | Animation speed moving items when sorting                                                                                      |
| `autoScroll`       | `Boolean` | `true`      | Automatic scrolling when moving to the edge of the container                                                                   |
| `scrollThreshold`  | `Number`  | `55`        | Threshold to trigger autoscroll                                                                                                |
| `delay`            | `Number`  | `0`         | Time in milliseconds to define when the sorting should start                                                                   |
| `delayOnTouchOnly` | `Boolean` | `false`     | Only delay on press if user is using touch                                                                                     |
| `fallbackOnBody`   | `Boolean` | `false`     | Appends the ghost element into the document's body                                                                             |
| `ghostClass`       | `String`  | `''`        | The class of the mask element when dragging                                                                                    |
| `ghostStyle`       | `Object`  | `{}`        | The style of the mask element when dragging                                                                                    |
| `chosenClass`      | `String`  | `''`        | The class of the selected element when dragging                                                                                |

## Public Methods

| **Method**               | **Description**                                            |
| ------------------------ | ---------------------------------------------------------- |
| `getSize(key)`           | Get the size of the current item by unique key value       |
| `getOffset()`            | Get the current scroll height                              |
| `getClientSize()`        | Get wrapper element client viewport size (width or height) |
| `getScrollSize()`        | Get all scroll size (scrollHeight or scrollWidth)          |
| `scrollToTop()`          | Scroll to top of list                                      |
| `scrollToBottom()`       | Scroll to bottom of list                                   |
| `scrollToIndex(index)`   | Scroll to the specified index position                     |
| `scrollToOffset(offset)` | Scroll to the specified offset                             |

**Usage**

```ts
import { Component, ViewChild } from '@angular/core';
import { VirtualDndListComponent } from 'ngx-virtual-dnd-list';

@Component({
  selector: 'virutal-list',
  template: `
    <div #scroller>
      <div virtual-dnd-list
        #virtualList
        ...
      >
        ...
      </div>

      <button (click)="scrollToBottom()">scroll to bottom</button>
    </div>
  `,
  styles: [],
})
export class VirtualListComponent {
  @ViewChild('virtualList') virtualList: VirtualDndListComponent;

  scrollToBottom() {
    this.virtualList.scrollToBottom();
  }
}
```
