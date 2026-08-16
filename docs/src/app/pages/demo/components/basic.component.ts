import { Component } from '@angular/core';
import { getPageData } from '../../../shared/utils';

@Component({
  selector: 'demo-basic',
  template: `
    <div #scroller class="list">
      <div
        virtual-list
        dataKey="id"
        [scroller]="scroller"
        handle=".handle"
        chosenClass="chosen"
        class="list-wrapper"
        [(ngModel)]="list"
      >
        <ng-template #item let-item let-index="index" let-key="key">
          <div class="list-item">
            <div class="flex j-c-s">
              <span class="index">{{ item.index }}</span>
              <span class="handle">☰</span>
            </div>
            <p>{{ item.desc }}</p>
          </div>
        </ng-template>
      </div>
    </div>
  `,
  styleUrls: ['../demo.component.less'],
})
export class DemoBasicComponent {
  public list = [];

  constructor() {}

  ngOnInit() {
    this.list = getPageData(1000, 0);
  }
}
