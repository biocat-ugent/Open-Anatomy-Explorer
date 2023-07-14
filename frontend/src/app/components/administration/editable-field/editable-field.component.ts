import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from "@angular/forms"

@Component({
  selector: 'app-editable-field',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './editable-field.component.html',
  styleUrls: ['./editable-field.component.scss']
})
export class EditableFieldComponent implements OnInit {
  @Input()
  editedProperty: string | undefined

  // Simple input is a field without "Edit" and "Done" buttons
  @Input()
  isSimpleInput = false

  @Output()
  editedPropertyChange = new EventEmitter<string>()

  // If it is NOT a simple input, this indicates we are currently editing the field
  editMode = false

  constructor() {
  }

  ngOnInit(): void {
  }

  editDone(): void {
    this.editMode = false
    this.editedPropertyChange.emit(this.editedProperty)
  }
}
