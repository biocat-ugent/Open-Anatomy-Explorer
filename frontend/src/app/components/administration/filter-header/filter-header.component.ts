import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from "@angular/forms"
import {RouterLink} from "@angular/router"

@Component({
  selector: 'app-filter-header-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './filter-header.component.html',
  styleUrls: ['./filter-header.component.scss']
})
export class FilterHeaderComponent implements OnInit {

  @Input()
  searchHeaderType = 'Models'

  @Input()
  hintType = 'model'

  @Input()
  hintSuffix = 'name'

  @Input()
  showOwnerToggle = true

  @Input()
  showAddButton = true

  // Instead of redirecting to the `create` path when the `Add` button is clicked, use a custom handler
  @Input()
  customAddBtnHandler !: () => void

  @Output()
  showAllChanged = new EventEmitter<boolean>()

  @Output()
  searchQueryChanged = new EventEmitter<string>()

  showAllChecked = true
  searchQuery = ''

  constructor() {
  }

  ngOnInit(): void {
  }
}
