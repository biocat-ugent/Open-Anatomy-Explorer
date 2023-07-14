import {Component, Input, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {Model, Page, Question, QuestionType, Quiz} from "src/app/types"
import {ActivatedRoute, Router} from "@angular/router"
import {BackendService} from "src/app/services/backend.service"
import {HttpErrorResponse} from "@angular/common/http"
import {FormsModule} from "@angular/forms"
import {
  LabelSelectorComponent
} from "src/app/components/administration/quizzes-dashboard/label-selector/label-selector.component"
import {Observer} from "rxjs"
import {KeycloakService} from "keycloak-angular"
import {NgbAlertModule} from "@ng-bootstrap/ng-bootstrap"

@Component({
  selector: 'app-quiz-editor',
  standalone: true,
    imports: [CommonModule, FormsModule, LabelSelectorComponent, NgbAlertModule],
  templateUrl: './quiz-editor.component.html',
  styleUrls: ['./quiz-editor.component.scss']
})
export class QuizEditorComponent implements OnInit {

  @Input()
  modelId!: string

  @Input()
  quizId!: string

  editMode: boolean = false

  quizName: string = ''
  shuffleQuestions: boolean = false
  error: boolean = false
  errorMessage: string = ''
  questions: Question[] = []
  questionsStagedForDeletion: Question[] = []

  isCurrentUserModelOwner = false

  constructor(private router: Router, private route: ActivatedRoute, private backend: BackendService, private auth: KeycloakService) {
  }

  ngOnInit(): void {
    // If quizId was provided, we are editing a quiz instead of creating a new one
    if (this.quizId) {
      // Retrieve all the quiz data, including the existing questions
      this.editMode = true

      this.backend.getModelQuiz(this.modelId, this.quizId).subscribe((quiz: Quiz) => {
        this.quizName = quiz.name || ''
        this.shuffleQuestions = quiz.shuffle || false
      })

      this.backend.getModelQuizQuestions(this.modelId, this.quizId).subscribe((questionPage: Page<Question>) => {
        this.questions.push(...questionPage.items)
      })
    }

    // Check if user that is logged in is the owner of the model (needed to know if they can add labels when adding questions)
    this.backend.getModel(this.modelId).subscribe((model: Model) => {
      this.isCurrentUserModelOwner = model.ownerUserId === this.auth.getUsername()
    })
  }

  get QuestionType(): typeof QuestionType {
    return QuestionType
  }

  /**
   * Add a Locate question to the quiz
   */
  addLocateQuestion(): void {
    this.questions.unshift({
      createdAt: "",
      id: "",
      lastModifiedAt: "",
      ownerUserId: "",
      questionType: QuestionType.LOCATE
    })
  }

  /**
   * Add a Name Region question to the quiz
   */
  addNameQuestion(): void {
    this.questions.unshift({
      createdAt: "",
      id: "",
      lastModifiedAt: "",
      ownerUserId: "",
      questionType: QuestionType.NAME,
      textPrompt: 'Name the indicated region'
    })
  }

  /**
   * Add a Free-form question to the quiz
   */
  addFreeFormQuestion(): void {
    this.questions.unshift({
      createdAt: "",
      id: "",
      lastModifiedAt: "",
      ownerUserId: "",
      questionType: QuestionType.FREE_FORM
    })
  }

  /**
   * Remove question from the quiz
   * @param question
   */
  removeQuestion(question: Question): void {
    const questionIndex = this.questions.indexOf(question)
    this.questionsStagedForDeletion.push(question)
    this.questions.splice(questionIndex, 1)
  }

  /**
   * Handler when the save button is pressed
   */
  saveQuizBtnHandler(): void {
    if (this.quizName.length < 1) {
      this.showError("Quiz name can't be empty.")

      return
    }

    if (this.questions.length < 1) {
      this.showError("Quiz should have at least one question.")

      return
    }

    if (!this.checkQuestionsCompleted()) {
      this.showError("One or more questions are not filled out completely.")

      return
    }

    // If quizId is provided, we are editing a quiz, otherwise we are creating a quiz
    if (this.editMode) {
      this.backend.updateModelQuiz(this.modelId, this.quizId, {
        name: this.quizName,
        shuffle: this.shuffleQuestions
      }).subscribe({
        next: () => this.saveQuestions(),
        error: (err: HttpErrorResponse) => this.showError(`Something went wrong updating: "${err.message}"`, 10000),
      })
    } else {
      // Create new quiz
      this.backend.createModelQuiz(this.modelId, {name: this.quizName, shuffle: this.shuffleQuestions}).subscribe({
        next: (quizId: string) => {
          this.quizId = quizId

          this.saveQuestions()
        },
        error: (err: HttpErrorResponse) => this.showError(`Something went wrong saving: "${err.message}"`, 10000),
      })
    }
  }

  /**
   * Save the quiz' questions
   * @private
   */
  private saveQuestions(): void {
    let questionsSaved = 0

    const observer: Partial<Observer<any>> = {
      error: (err: HttpErrorResponse) => this.showError(`Something went wrong ${this.editMode ? 'updating' : 'saving'}: "${err.message}"`, 10000),
      complete: () => {
        questionsSaved++


        // Return when all the questions have been saved
        if (questionsSaved === this.questions.length) {
          this.router.navigate([this.editMode ? '../..' : '..'], {relativeTo: this.route})
        }
      }
    }

    // Delete
    if (this.editMode && this.questionsStagedForDeletion.length > 0) {
      this.questionsStagedForDeletion.forEach((question: Question) => {
        this.backend.deleteModelQuizQuestion(this.modelId, this.quizId, question.id).subscribe()
      })
    }

    // Update & create
    this.questions.forEach((question: Question) => {
      if (this.editMode && question.id !== "") {
        // Editing questions
        this.backend.updateModelQuizQuestion(this.modelId, this.quizId, question.id, question).subscribe(observer)
      } else {
        // Creating questions
        this.backend.createModelQuizQuestion(this.modelId, this.quizId, question).subscribe(observer)
      }
    })
  }

  /**
   * Display an error alert when something went wrong
   * @param message error message
   * @param visibleDelay time in ms how long the message will be visible
   * @private
   */
  private showError(message: string, visibleDelay: number = 5000): void {
    this.errorMessage = message
    this.error = true

    setTimeout(() => {
      this.error = false
    }, visibleDelay)
  }

  /**
   * Checks if all the Questions in the `questions` list are filled out
   * @returns boolean - true when all the questions are complete, false otherwise
   * @private
   */
  private checkQuestionsCompleted(): boolean {
    for (const question of this.questions) {
      switch (question.questionType) {
        case QuestionType.NAME:
          if (question.labelId === undefined || question.textAnswer === undefined || question.textAnswer.length < 1) {
            return false
          }
          break
        case QuestionType.LOCATE:
          if (question.labelId === undefined || question.textPrompt === undefined || question.textPrompt.length < 1) {
            return false
          }
          break
        case QuestionType.FREE_FORM:
          if (question.textPrompt === undefined || question.textAnswer === undefined || question.textPrompt.length < 1 || question.textAnswer.length < 1) {
            return false
          }
          break
        default:
          return false
      }
    }

    return true
  }

}
