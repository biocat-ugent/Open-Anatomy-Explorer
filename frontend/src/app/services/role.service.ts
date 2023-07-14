import {Injectable} from '@angular/core'
import {KeycloakService} from "keycloak-angular"

export enum Role {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}


@Injectable({
  providedIn: 'root'
})
export class RoleService {

  constructor(private auth: KeycloakService) {
  }

  isStudent(): boolean {
    return this.auth.isUserInRole(Role.STUDENT)
  }

  isTeacher(): boolean {
    return this.auth.isUserInRole(Role.TEACHER)
  }

  isAdmin(): boolean {
    return this.auth.isUserInRole(Role.ADMIN)
  }

  getHighestRole(): Role {
    if (this.isAdmin()){
      return Role.ADMIN
    }

    if (this.isTeacher()) {
      return Role.TEACHER
    }

    return Role.STUDENT
  }

  userHasRole(role: Role): boolean {
    return this.auth.isUserInRole(role)
  }
}
