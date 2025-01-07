import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { VirtualItem } from './virtual-dnd-item.directive';
import { VirtualDndListComponent } from './virtual-dnd-list.component';

@NgModule({
  declarations: [VirtualDndListComponent, VirtualItem],
  imports: [CommonModule],
  exports: [VirtualDndListComponent],
})
export class VirtualDndListModule {}
