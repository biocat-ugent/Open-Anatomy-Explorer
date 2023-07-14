import {
  AfterViewInit, ChangeDetectorRef,
  Component,
  OnInit,
  ViewChild
} from '@angular/core'
import {CommonModule} from '@angular/common'
import {RendererComponent} from "src/app/components/renderer/renderer.component"
import {QuizSidebarComponent} from "src/app/components/quiz-sidebar/quiz-sidebar.component"
import {ActivatedRoute} from "@angular/router"
import {Model, QuizInstanceInviteCode} from "src/app/types"
import {BackendService} from "src/app/services/backend.service"

@Component({
  selector: 'app-quiz-take',
  standalone: true,
  imports: [CommonModule, RendererComponent, QuizSidebarComponent],
  templateUrl: './quiz-take.component.html',
  styleUrls: ['./quiz-take.component.scss']
})
export class QuizTakeComponent implements OnInit, AfterViewInit {

  @ViewChild(RendererComponent)
  rendererComponent!: RendererComponent
  modelId!: string
  quizId!: string
  quizInstanceId!: string

  selectedVertices!: number[]

  model!: Model

  constructor(private route: ActivatedRoute, private changeDetector: ChangeDetectorRef, private backend: BackendService) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const quizInviteCode: QuizInstanceInviteCode = this.parseInstanceInviteCode(params['quizInviteCode'])

      this.modelId = quizInviteCode.m
      this.quizId = quizInviteCode.q
      this.quizInstanceId = quizInviteCode.i

      this.backend.getModel(this.modelId).subscribe({
        next: (model) => {
          this.model = model
        },
        complete: () => this.changeDetector.detectChanges()
      })
    })
  }

  ngAfterViewInit(): void {
    // Fixes: ERROR Error: NG0100: ExpressionChangedAfterItHasBeenCheckedError: Expression has changed after it was checked. Previous value: 'undefined'. Current value: '[object Object]'. Find more at https://angular.io/errors/NG0100
    // https://hackernoon.com/everything-you-need-to-know-about-the-expressionchangedafterithasbeencheckederror-error-e3fd9ce7dbb4
    this.changeDetector.detectChanges()
  }

  parseInstanceInviteCode(encodedCode: string): QuizInstanceInviteCode {
    const decodedCode = window.atob(encodedCode)

    let parsed: QuizInstanceInviteCode = {i: "", m: "", q: ""}

    try {
      parsed = JSON.parse(decodedCode)
    } catch (e) {
    }

    return parsed
  }
}
