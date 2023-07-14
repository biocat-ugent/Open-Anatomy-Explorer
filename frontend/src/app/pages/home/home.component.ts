import {Component, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {KeycloakService} from "keycloak-angular"
import {fromPromise} from "rxjs/internal/observable/innerFrom"
import {FormsModule} from "@angular/forms"
import {Router, RouterLink} from "@angular/router"
import {RoleService} from "src/app/services/role.service"
import {QuizSelectorComponent} from "src/app/components/home/quiz-selector/quiz-selector.component"
import {ModelSelectorComponent} from "src/app/components/home/model-selector/model-selector.component"

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, QuizSelectorComponent, ModelSelectorComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  isLoggedIn$ = fromPromise(this.auth.isLoggedIn())

  exploreId = ''
  exploreInvalid = false

  quizId = ''
  quizInvalid = false

  constructor(public auth: KeycloakService, protected role: RoleService, private router: Router) {
  }

  ngOnInit(): void {
  }

  /**
   * Start exploring a model
   */
  explore(): void {
    if (this.exploreId.length < 1) {
      this.exploreInvalid = true
      return
    }
    this.exploreInvalid = false
    this.router.navigate(['explorer', this.exploreId])
  }

  /**
   * Start a quiz based on quiz instance id
   */
  takeQuiz(): void {
    if (this.quizId.length < 1) {
      this.quizInvalid = true
      return
    }
    this.quizInvalid = false
    this.router.navigate(['quiz', this.quizId])
  }

}
