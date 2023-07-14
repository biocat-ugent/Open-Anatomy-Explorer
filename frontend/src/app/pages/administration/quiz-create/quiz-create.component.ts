import {Component, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {ActivatedRoute, RouterLink} from "@angular/router"
import {
  LabelSelectorComponent
} from "src/app/components/administration/quizzes-dashboard/label-selector/label-selector.component"
import {FormsModule} from "@angular/forms"
import {
  QuizEditorComponent
} from "src/app/components/administration/quizzes-dashboard/quiz-editor/quiz-editor.component"
import {BackHeaderComponent} from "src/app/components/administration/back-header/back-header.component"
import {BackendService} from "src/app/services/backend.service"

@Component({
  selector: 'app-quiz-create',
  standalone: true,
    imports: [CommonModule, RouterLink, LabelSelectorComponent, FormsModule, QuizEditorComponent, BackHeaderComponent],
  templateUrl: './quiz-create.component.html',
  styleUrls: ['./quiz-create.component.scss']
})
export class QuizCreateComponent implements OnInit {

  modelId!: string
  modelName!: string

  constructor(private route: ActivatedRoute, private backend: BackendService) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.modelId = params['id']
      this.backend.getModel(this.modelId).subscribe((model) => this.modelName = model.name || this.modelId)
    })
  }
}
