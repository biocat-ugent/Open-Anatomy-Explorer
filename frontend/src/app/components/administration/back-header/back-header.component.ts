import {Component, Input, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {RouterLink} from "@angular/router"

@Component({
  selector: 'app-back-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './back-header.component.html',
  styleUrls: ['./back-header.component.scss']
})
export class BackHeaderComponent implements OnInit {


  @Input()
  headerTitle = ''

  @Input()
  backPath = '..'

  constructor() {
  }

  ngOnInit(): void {
  }

}
