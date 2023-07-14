package idlab.openanatomy.backend.http.util

import idlab.openanatomy.backend.definitions.OpenAnatomyEntity
import io.quarkus.security.identity.SecurityIdentity
import javax.ws.rs.ForbiddenException

fun SecurityIdentity.checkTeacherCanOnlyModifyOwnResources(entity: OpenAnatomyEntity) {
    if (!this.roles.contains(Roles.ADMIN) && (this.roles.contains(Roles.TEACHER) && this.principal.name != entity.ownerUserId)) {
        throw ForbiddenException()
    }
}
