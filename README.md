# ngx-virtual-dnd-list

[![npm](https://img.shields.io/npm/v/ngx-virtual-dnd-list.svg)](https://www.npmjs.com/package/ngx-virtual-dnd-list)  [![npm](https://img.shields.io/npm/dm/ngx-virtual-dnd-list.svg)](https://www.npmjs.com/package/ngx-virtual-dnd-list)  [![vue2](https://img.shields.io/badge/vue-2.x-brightgreen.svg)](https://vuejs.org/)  [![Software License](https://img.shields.io/badge/license-MIT-brightgreen.svg)](LICENSE)

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
      <virtual-dnd-list
        [scroller]="scroller"
        [dataKey]="'id'"
        [keeps]="30"
        [(ngModel)]="list"
        (ngModelChange)="onChange($event)"
      >
        <ng-template let-data let-index>
          <td>{{ data.index }}</td>
          <td>{{ data.id }}</td>
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
    console.log(data, 'triggered on drop');
  }
}

```

## EventEmitters

|   **Event**   | **Description** |
|--------------|-----------------|
| `top`        | Event fired when scroll to top |
| `bottom`     | Event fired when scroll to bottom |
| `onDrag`     | Event fired when the drag is started |
| `onDrop`     | Event fired when the drag is completed |
| `onAdd`      | Event fired when element is dropped into the list from another |
| `onRemove`   | Event fired when element is removed from the list into another |

## Attributes

### Required Attributes

| **Prop** | **Type**  | **Description** |
|------------------|-------------|------------------|
| `data-key`       | `String`      | The unique identifier of each piece of data, in the form of `'a.b.c'` |
| `scroller`       | `HTMLElement \| Window \| Document` | Virtual list scrolling element |

### Optional Attributes

**Commonly used**

|   **Prop**   |  **Type**  | **Default** | **Description** |
| ------------ | ---------  | ----------- | --------------- |
| `keeps`      | `Number`   | `30`        | The number of lines rendered by the virtual scroll |
| `size`       | `Number`   | `-`         | The estimated height of each piece of data, you can choose to pass it or not, it will be automatically calculated |
| `handle`     | `Function/String` | `-`  | Drag handle selector within list items |
| `group`      | `Function/String` | `-`  | string: 'name' or object: `{ name: 'group', put: true/false, pull: true/false/'clone', revertDrag: true/false }` |
| `keepOffset` | `Boolean`  | `false`     | When scrolling up to load data, keep the same offset as the previous scroll |
| `direction`  | `String`   | `vertical`  | `vertical/horizontal`, scroll direction |
| `scroller`   | `HTMLElement` | `-`      | Virtual list scrolling element |
| `debounceTime`| `Number`  | `0`         | debounce time on scroll |
| `throttleTime`| `Number`  | `0`         | throttle time on scroll |


**Uncommonly used**

|  **Prop**    | **Type**   | **Default** | **Description** |
|  --------    | --------   | ----------- | --------------- |
| `draggable`  | `String`   | `-`         | Specifies which items inside the element should be draggable. If does not set a value, the default list element can be dragged |
| `disabled`   | `Boolean`  | `false`     | Disables the sortable if set to true |
| `animation`  | `Number`   | `150`       | Animation speed moving items when sorting |
| `autoScroll` | `Boolean`  | `true`      | Automatic scrolling when moving to the edge of the container |
| `scrollThreshold` | `Number` | `55`     | Threshold to trigger autoscroll |
| `delay`      | `Number`   | `0`         | Time in milliseconds to define when the sorting should start |
| `delayOnTouchOnly` | `Boolean` | `false`| Only delay on press if user is using touch |
| `fallbackOnBody` | `Boolean` | `false`  | Appends the ghost element into the document's body |
| `rootTag`    | `String`   | `div`       | Label type for root element |
| `wrapTag`    | `String`   | `div`       | Label type for list wrap element |
| `itemTag`    | `String`   | `div`       | Label type for list item element |
| `headerTag`  | `String`   | `div`       | Label type for header slot element |
| `headerStyle`| `Object`   | `{}`        | Header slot element style |
| `footerTag`  | `String`   | `div`       | Label type for footer slot element |
| `footerStyle`| `Object`   | `{}`        | Footer slot element style |
| `wrapClass`  | `String`   | `''`        | List wrapper element class |
| `wrapStyle`  | `Object`   | `{}`        | List wrapper element style |
| `itemClass`  | `String`   | `''`        | List item element class |
| `itemStyle`  | `Object`   | `{}`        | List item element style |
| `ghostClass` | `String`   | `''`        | The class of the mask element when dragging |
| `ghostStyle` | `Object`   | `{}`        | The style of the mask element when dragging |
| `chosenClass`| `String`   | `''`        | The class of the selected element when dragging |

## Public Methods

| **Method**         | **Description** |
| ------------------ | --------------- |
| `getSize(key)`     | Get the size of the current item by unique key value |
| `getOffset()`      | Get the current scroll height |
| `getClientSize()`  | Get wrapper element client viewport size (width or height) |
| `getScrollSize()`  | Get all scroll size (scrollHeight or scrollWidth) |
| `scrollToTop()`    | Scroll to top of list |
| `scrollToBottom()` | Scroll to bottom of list |
| `scrollToIndex(index)`  | Scroll to the specified index position |
| `scrollToOffset(offset)` | Scroll to the specified offset |

Usage

```ts
import { Component, ViewChild } from '@angular/core';
import { VirtualDndListComponent } from 'ngx-virtual-dnd-list';

@Component({
  selector: 'virutal-list',
  template: `
    <div #scroller>
      <virtual-dnd-list
        #virtualList
        ...
      >
        ...
      </virtual-dnd-list>

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
