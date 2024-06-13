import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { VirtualItem } from './ngx-virtual-dnd-item.directive';
import { VirtualDndListComponent } from './ngx-virtual-dnd-list.component';

@NgModule({
  declarations: [VirtualDndListComponent, VirtualItem],
  imports: [CommonModule, FormsModule],
  exports: [VirtualDndListComponent],
})
export class VirtualDndListModule {}
