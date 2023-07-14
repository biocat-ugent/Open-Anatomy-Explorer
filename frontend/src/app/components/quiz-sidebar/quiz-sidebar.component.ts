import {Component, Input, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {FormsModule} from "@angular/forms"
import {KeycloakService} from "keycloak-angular"
import {RoleService} from "src/app/services/role.service"
import {BackendService} from "src/app/services/backend.service"
import {Label, Question, QuestionResponse, QuestionType, Quiz, QuizInstance} from "src/app/types"
import {RendererComponent} from "src/app/components/renderer/renderer.component"
import {Router} from "@angular/router"
import {HttpErrorResponse} from "@angular/common/http"
import {NgbAlertModule} from "@ng-bootstrap/ng-bootstrap"

@Component({
  selector: 'app-quiz-sidebar',
  standalone: true,
    imports: [CommonModule, FormsModule, NgbAlertModule],
  templateUrl: './quiz-sidebar.component.html',
  styleUrls: ['./quiz-sidebar.component.scss']
})
export class QuizSidebarComponent implements OnInit {

  @Input()
  modelId!: string

  @Input()
  quizId!: string

  @Input()
  quizInstanceId!: string

  @Input()
  set selectedVertices(vertices: number[]) {
    if (this.questionResponses.length >= this.currentQuestionNumber) {
      if (vertices.length !== 0 && this.currentQuestion.questionType !== QuestionType.NAME) {
        this.questionResponses[this.currentQuestionNumber - 1].verticesData = vertices
      }
    }
  }

  @Input()
  renderer!: RendererComponent

  currentQuiz!: Quiz

  questions!: Question[]

  quizLoadingError = false

  currentQuestionNumber = 1

  currentQuestion!: Question

  isUserStarted = false

  questionResponses: QuestionResponse[] = []

  isSuccess = false
  alertMessage: string | undefined = undefined

  get QuestionType(): typeof QuestionType {
    return QuestionType
  }

  constructor(public auth: KeycloakService, public role: RoleService, private backend: BackendService, private router: Router) {
  }

  ngOnInit(): void {
    this.backend.getQuizInstance(this.modelId, this.quizId, this.quizInstanceId).subscribe({
      next: (quizInstance: QuizInstance) => {
        this.questions = quizInstance.questionsSnapshot

        this.backend.getModelQuiz(this.modelId, this.quizId).subscribe({
          next: (quiz: Quiz) => {
            this.currentQuiz = quiz

            if (quiz.shuffle === true) {
              this.shuffleArray(this.questions)
            }

            for (const question of this.questions) {
              this.questionResponses.push({questionId: question.id, textAnswer: "", verticesData: []})
            }
          },
          error: () => this.quizLoadingError = true
        })
      },
      error: () => this.quizLoadingError = true
    })
  }

  // https://en.wikipedia.org/wiki/Fisher%E2%80%93Yates_shuffle
  private shuffleArray<T>(arr: T[]) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * arr.length)

      const temp = arr[i]
      arr[i] = arr[j]
      arr[j] = temp
    }
  }

  /**
   * Start quiz button handler
   */
  startQuiz() {
    this.loadQuestion()
    this.isUserStarted = true
  }

  /**
   * Next question button handler
   */
  nextQuestion() {
    if (this.currentQuestionNumber < this.questions.length) {
      this.currentQuestionNumber++
      this.loadQuestion()
    }
  }

  /**
   * Previous question button handler
   */
  previousQuestion() {
    if (this.currentQuestionNumber > 1) {
      this.currentQuestionNumber--
      this.loadQuestion()
    }
  }

  /**
   * Load the current question
   */
  loadQuestion() {
    this.currentQuestion = this.questions[this.currentQuestionNumber - 1]

    this.renderer.resetLabel()

    if (this.currentQuestion.labelId) {
      this.backend.getModelLabel(this.modelId, this.currentQuestion.labelId).subscribe((label: Label) => {
        this.renderer.setLabelColor(label.colour)

        if (this.currentQuestion.questionType === QuestionType.NAME) {
          this.backend.getModelLabelVertices(this.modelId, label.id).subscribe((vertices: number[]) => {
            this.renderer.setVertices(vertices)
            this.renderer.drawVertices()
          })
        } else if (this.questionResponses[this.currentQuestionNumber - 1].verticesData.length > 0) {
          this.renderer.setVertices(this.questionResponses[this.currentQuestionNumber - 1].verticesData)
          this.renderer.drawVertices()
        }
      })
    }
  }

  /**
   * Submits responses
   */
  submitResponses(): void {
    this.backend.createQuizInstanceSubmission(this.modelId, this.quizId, this.quizInstanceId, this.questionResponses).subscribe({
      next: () => {
        this.isSuccess = true
        this.alertMessage = 'Submission successful, you will be redirected in a few seconds.'
        setTimeout(() => this.router.navigate(['/']), 3000)
      },
      error: (err: HttpErrorResponse) => {
        this.isSuccess = false
        this.alertMessage = `Submission failed with error: ${err.message}`
      }
    })
  }

}
