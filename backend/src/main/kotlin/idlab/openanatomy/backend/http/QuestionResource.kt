package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.definitions.Question
import idlab.openanatomy.backend.http.util.*
import io.quarkus.security.identity.SecurityIdentity
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse
import javax.annotation.security.RolesAllowed
import javax.ws.rs.*
import javax.ws.rs.core.Context

@Path("/models/{modelId}/quizzes/{quizId}/questions")
class QuestionResource {

    @Context
    lateinit var securityIdentity: SecurityIdentity

    @GET
    @Operation(summary = "Query the question instances associated with a specific Quiz.")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun list(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        @QueryParam("filter") @DefaultValue("") filter: String,
        @QueryParam("cursor") @DefaultValue("") cursor: String
    ): PagedResult<Question> = Question.handleHttpList(parseFilter(filter, Eq("quizId", quizId)), cursor)

    @POST
    @Operation(summary = "Create a new Question and associate it with a specific Quiz.")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "201", description = "The Question was created successfully")
    suspend fun create(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        input: QuestionInput
    ) = Question.handleHttpCreate(securityIdentity) {
        Question(quizId, input.questionType, input.textPrompt, input.textAnswer, input.labelId, input.showRegions)
    }

    @GET
    @Operation(summary = "Get a specific Question instance.")
    @Path("{questionId}")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun get(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String, @PathParam("questionId") questionId: String
    ) = Question.handleHttpGet(questionId).takeIf { it.quizId == quizId } ?: throw NotFoundException()

    @PUT
    @Operation(summary = "Update a specific Question instance.")
    @Path("{questionId}")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Question was updated successfully")
    suspend fun update(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        @PathParam("questionId") questionId: String,
        input: QuestionInput
    ) = Question.handleHttpUpdate(securityIdentity, questionId) { questionState ->
        if (questionState.quizId != quizId) {
            throw NotFoundException()
        }
        questionState.questionType = input.questionType
        questionState.labelId = input.labelId
        questionState.showRegions = input.showRegions
        questionState.textAnswer = input.textAnswer
        questionState.textPrompt = input.textPrompt
        questionState
    }

    @DELETE
    @Operation(summary = "Remove a specific Question instance.")
    @Path("{questionId}")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Question was removed successfully")
    suspend fun remove(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        @PathParam("questionId") questionId: String
    ) = Question.handleHttpDelete(securityIdentity, questionId)

}
