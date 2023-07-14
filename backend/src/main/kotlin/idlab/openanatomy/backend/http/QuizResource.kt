package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.definitions.Quiz
import idlab.openanatomy.backend.http.util.*
import idlab.openanatomy.backend.http.util.handleHttpList
import io.quarkus.security.identity.SecurityIdentity
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse
import javax.annotation.security.RolesAllowed
import javax.ws.rs.*
import javax.ws.rs.core.Context
import javax.ws.rs.core.Response

@Path("/models/{modelId}/quizzes")
class QuizResource {

    @Context
    lateinit var securityIdentity: SecurityIdentity

    @GET
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun list(
        @PathParam("modelId") modelId: String,
        @QueryParam("filter") @DefaultValue("") filter: String,
        @QueryParam("cursor") @DefaultValue("") cursor: String
    ) = Quiz.handleHttpList(parseFilter(filter, Eq("modelId", modelId)), cursor)

    @POST
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "201", description = "The Quiz was created successfully")
    suspend fun create(@PathParam("modelId") modelId: String, input: QuizInput) =
        Quiz.handleHttpCreate(securityIdentity) {
            Quiz(modelId, input.name, input.shuffle)
        }

    @GET
    @Path("{quizId}")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun get(@PathParam("modelId") modelId: String, @PathParam("quizId") quizId: String) =
        Quiz.handleHttpGet(quizId).takeIf { it.modelId == modelId } ?: throw NotFoundException()

    @PUT
    @Path("{quizId}")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Quiz was updated successfully")
    suspend fun update(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        input: QuizInput
    ) = Quiz.handleHttpUpdate(securityIdentity, quizId) { quiz ->
        if (quiz.modelId != modelId) {
            throw NotFoundException()
        }
        quiz.name = input.name
        quiz.shuffle = input.shuffle
        quiz
    }

    @DELETE
    @Path("{quizId}")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Quiz was removed successfully")
    suspend fun remove(@PathParam("modelId") modelId: String, @PathParam("quizId") quizId: String) =
        Quiz.handleHttpDelete(securityIdentity, quizId) {
            cleanQuizChildren(it)
        }

}
