package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.definitions.QuizInstance
import idlab.openanatomy.backend.http.util.Roles
import idlab.openanatomy.backend.http.util.handleHttpList
import idlab.openanatomy.backend.http.util.parseFilter
import javax.annotation.security.RolesAllowed
import javax.ws.rs.DefaultValue
import javax.ws.rs.GET
import javax.ws.rs.Path
import javax.ws.rs.QueryParam

@Path("/quizinstances")
class QuizInstancesResource {

    @GET
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun listAll(
        @QueryParam("filter") @DefaultValue("") filter: String,
        @QueryParam("cursor") @DefaultValue("") cursor: String
    ) = QuizInstance.handleHttpList(parseFilter(filter), cursor)
}