import {Component, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {ActivatedRoute, RouterLink} from "@angular/router"
import {
  QuizEditorComponent
} from "src/app/components/administration/quizzes-dashboard/quiz-editor/quiz-editor.component"
import {BackHeaderComponent} from "src/app/components/administration/back-header/back-header.component"
import {BackendService} from "src/app/services/backend.service"

@Component({
  selector: 'app-quiz-edit',
  standalone: true,
  imports: [CommonModule, RouterLink, QuizEditorComponent, BackHeaderComponent],
  templateUrl: './quiz-edit.component.html',
  styleUrls: ['./quiz-edit.component.scss']
})
export class QuizEditComponent implements OnInit {

  modelId!: string
  quizId!: string
  modelName!: string
  quizName!: string

  constructor(private route: ActivatedRoute, private backend: BackendService) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.modelId = params['id']
      this.quizId = params['quizId']

      this.backend.getModel(this.modelId).subscribe((model) => this.modelName = model.name || this.modelId)
      this.backend.getModelQuiz(this.modelId, this.quizId).subscribe((quiz) => this.quizName = quiz.name || this.quizId)
    })
  }
}
