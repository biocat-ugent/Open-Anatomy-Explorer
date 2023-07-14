package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.definitions.*
import idlab.openanatomy.backend.http.util.*
import io.quarkus.test.common.http.TestHTTPEndpoint
import io.quarkus.test.junit.QuarkusTest
import io.quarkus.test.security.TestSecurity
import io.restassured.RestAssured
import io.restassured.RestAssured.given
import io.restassured.RestAssured.`when`
import io.restassured.http.ContentType
import io.smallrye.mutiny.coroutines.awaitSuspending
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.runBlocking
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test
import java.time.Instant

@QuarkusTest
@TestHTTPEndpoint(ModelResource::class)
class ModelTest : AbstractTest() {

    @Test
    @TestSecurity(authorizationEnabled = true, user = "test-user", roles = [Roles.ADMIN])
    fun testCreate() {
        val input = ModelInput("test", "testers")
        val createdId = RestAssured.given()
            .contentType(ContentType.JSON)
            .body(input)
            .`when`()
            .post()
            .then()
            .statusCode(201)
            .extract().asString()

        val result = RestAssured.get("{id}", createdId)
            .then()
            .statusCode(200)
            .extract().to<Model>()

        assertEquals(input.name, result.name)
        assertEquals(input.category, result.category)
        assertEquals("test-user", result.ownerUserId)
        Assertions.assertTrue(result.createdAt.isAfter(Instant.now().minusSeconds(5)))
    }

    @Test
    @TestSecurity(authorizationEnabled = true, user = "test-user", roles = [Roles.ADMIN])
    fun testUpdate() = runBlocking {
        // Create a test model
        val model = Model("test", "test-category").apply { this.ownerUserId = "test-user" }
        Model.persist(model).awaitSuspending()

        // Try to update the model
        val update = ModelInput("test", "updated test-category")
        given()
            .contentType(ContentType.JSON)
            .body(update)
            .`when`()
            .put("{id}", model.id.toString())
            .then()
            .statusCode(204)

        val updatedModel = Model.findById(model.id!!).awaitSuspending()
        assertEquals(update.category, updatedModel?.category)
    }

    @Test
    @TestSecurity(authorizationEnabled = true, user = "test-user", roles = [Roles.ADMIN])
    fun testDelete() = runBlocking {
        // Create a test model
        val model = Model("test", "test-category").apply { this.ownerUserId = "test-user" }
        Model.persist(model).awaitSuspending()

        // Try to delete the resource
        `when`()
            .delete("{id}", model.id.toString())
            .then()
            .statusCode(204)

        // Check if it was really deleted
        val findModel = Model.findById(model.id!!).awaitSuspending()
        Assertions.assertNull(findModel)
    }

    @Test
    @TestSecurity(authorizationEnabled = true, user = "test-user", roles = [Roles.TEACHER])
    fun testTeacherCannotUpdateNonOwnedResource() = runBlocking {
        // Create a test model with different user
        val model = Model("test", "test-category").apply { this.ownerUserId = "other-test-user" }
        Model.persist(model).awaitSuspending()

        // Try to update the model
        val update = ModelInput("test", "updated test-category")
        given()
            .contentType(ContentType.JSON)
            .body(update)
            .`when`()
            .put("{id}", model.id.toString())
            .then()
            .statusCode(403)

        // The model was not updated
        val updatedModel = Model.findById(model.id!!).awaitSuspending()
        assertEquals(model.category, updatedModel?.category)
    }

    @Test
    @TestSecurity(authorizationEnabled = true, user = "test-user", roles = [Roles.ADMIN])
    fun testCascadedDelete(): Unit = runBlocking {
        val testModel = populateModel()

        // Delete the model
        `when`()
            .delete("{id}", testModel.model.id.toString())
            .then()
            .statusCode(204)

        // Verify that everything was cleaned up
        Assertions.assertNull(Model.findById(testModel.model.id!!).awaitSuspending())
        assertEquals(0, Label.count(Eq("modelId", testModel.model.id.toString()).toQueryDocument()).awaitSuspending())
        assertEquals(0, Quiz.count(Eq("modelId", testModel.model.id.toString()).toQueryDocument()).awaitSuspending())
        assertEquals(
            0,
            Question.count(In("quizId", testModel.quizzes.map { it.id.toString() }.toSet()).toQueryDocument())
                .awaitSuspending()
        )
        Assertions.assertThrows(Throwable::class.java) {
            runBlocking {
                modelAssetManager.handleHttpAssetDownload(testModel.model.id.toString(), ModelAssetType.OBJECT)
                    .collect().asList()
                    .awaitSuspending()
            }
        }

        // Cleanup
        testModel.objectFile.delete()
    }

    @Test
    @TestSecurity(authorizationEnabled = true, user = "test-user", roles = [Roles.ADMIN])
    fun testFilter(): Unit = runBlocking {
        val categories = setOf("Cat1", "Cat2", "Cat3")

        // Populate some model instances
        val models = (1..25).map {
            Model("test", categories.random()).apply { this.ownerUserId = "test-user" }
        }
        Model.persist(models).awaitSuspending()

        // Use filter to fetch all records for Cat1 or Cat3
        val result = given()
            .queryParam("filter", "category eq 'Cat1' or category eq 'Cat3'")
            .`when`()
            .get()
            .then()
            .statusCode(200)
            .extract().to<PagedResultModel>()

        assertEqualsModels(models.filter { it.category == "Cat1" || it.category == "Cat3" }, result.items.toList())
    }

    @Test
    @TestSecurity(authorizationEnabled = true, user = "test-user", roles = [Roles.ADMIN])
    fun testLabelVertices(): Unit = runBlocking {
        // Populate a model
        val model = Model("test").apply { ownerUserId = "test-user" }
        Model.persist(model).awaitSuspending()

        // Add a label
        val label = Label(model.id!!.toString(), "test", "red").apply { ownerUserId = "test-user" }
        Label.persist(label).awaitSuspending()

        val pathTemplate = "{modelId}/labels/{labelId}/vertices"
        // Try to fetch label vertices via API (which should fail with a 404)
        `when`()
            .get(pathTemplate, model.id.toString(), label.id.toString())
            .then()
            .statusCode(404)

        // Put vertices via API
        val vertices = LabelVertices(label.id!!.toString(), listOf(1, 2, 3))
        given()
            .contentType(ContentType.JSON)
            .body(vertices.data)
            .`when`()
            .put(pathTemplate, model.id.toString(), label.id.toString())
            .then()
            .statusCode(204)

        // Fetching the label vertices should now be successful
        val result = `when`()
            .get(pathTemplate, model.id.toString(), label.id.toString())
            .then()
            .statusCode(200)
            .extract().to<IntArray>()

        assertIterableEquals(vertices.data, result.toList())
    }

    @Test
    @TestSecurity(authorizationEnabled = true, user = "test-user", roles = [Roles.ADMIN])
    fun testQuizInstanceCreate(): Unit = runBlocking {
        val (model, quiz, questions) = setupQuiz()

        val pathTemplate = "{modelId}/quizzes/{quizId}/instances"
        // Create a quiz instance via the API
        val instanceId =
            `when`().post(pathTemplate, model.id.toString(), quiz.id.toString()).then().statusCode(201).extract()
                .asString()

        // Check if the quiz instance contains the questions
        val result =
            `when`().get("$pathTemplate/{instanceId}", model.id.toString(), quiz.id.toString(), instanceId).then()
                .statusCode(200).extract().to<QuizInstance>()

        assertIterableEquals(
            questions.map { it.textPrompt }.toSet(),
            result.questionsSnapshot.map { it.textPrompt }.toSet()
        )
    }

    private suspend fun setupQuiz(): Triple<Model, Quiz, List<Question>> {
        // Populate a model
        val model = Model("test").apply { ownerUserId = "test-user" }
        Model.persist(model).awaitSuspending()

        // Add quiz / questions
        val quiz = Quiz(model.id.toString(), "test", false).apply { ownerUserId = "test-user" }
        Quiz.persist(quiz).awaitSuspending()

        val questions = (1..5).map {
            Question(
                quiz.id.toString(),
                QuestionType.FREE_FORM,
                "This is question $it?"
            ).apply { ownerUserId = "test-user" }
        }
        Question.persist(questions).awaitSuspending()
        return Triple(model, quiz, questions)
    }

    @Test
    @TestSecurity(authorizationEnabled = true, user = "test-student", roles = [Roles.STUDENT])
    fun testQuizSubmission(): Unit = runBlocking {
        val (model, quiz, questions) = setupQuiz()
        // Create a quiz instance
        val quizInstance = QuizInstance(model.id.toString(), quiz.id.toString(), quiz.name, questions).apply {
            this.ownerUserId = "test-user"
        }
        QuizInstance.persist(quizInstance).awaitSuspending()

        val pathTemplate = "{modelId}/quizzes/{quizId}/instances"
        // Check if the student can create and retrieve a submission
        val submission = questions.map {
            QuestionResponse(
                questionId = it.id.toString(),
                textAnswer = "This is an answer to question ${it.id.toString()}..."
            )
        }
        val submissionId = given()
            .body(submission)
            .contentType(ContentType.JSON)
            .`when`()
            .post(
                "$pathTemplate/{instanceId}/submissions",
                model.id.toString(),
                quiz.id.toString(),
                quizInstance.id.toString()
            )
            .then().statusCode(201).extract().asString()

        val result = `when`()
            .get(
                "$pathTemplate/{instanceId}/submissions/{submissionId}",
                model.id.toString(),
                quiz.toString(),
                quizInstance.id.toString(),
                submissionId
            )
            .then()
            .statusCode(200)
            .extract().to<QuizInstanceSubmission>()

        assertIterableEquals(submission, result.responses)

        // Generate another submission
        val submission2 = QuizInstanceSubmission(quiz.id.toString(), questions.map {
            QuestionResponse(
                questionId = it.id.toString(),
                textAnswer = "This is an answer to question ${it.id.toString()}..."
            )
        }).apply { this.ownerUserId = "some-other-student" }
        QuizInstanceSubmission.persist(submission2).awaitSuspending()

        // The other submission should not be accessible for the student
        `when`()
            .get(
                "$pathTemplate/{instanceId}/submissions/{submissionId}",
                model.id.toString(),
                quiz.toString(),
                quizInstance.id.toString(),
                submission2.id.toString()
            )
            .then()
            .statusCode(403)

        // ... and should also not be included when listing submissions
        val resultList = `when`()
            .get(
                "$pathTemplate/{instanceId}/submissions",
                model.id.toString(),
                quiz.toString(),
                quizInstance.id.toString()
            )
            .then()
            .statusCode(200)
            .extract().to<PagedResultQuizInstanceSubmission>()

        assertTrue(resultList.items.none { it.id == submission2.id })
    }

}

data class PagedResultModel(val items: Array<Model>, val nextCursor: String? = null, val count: Long? = null)
data class PagedResultQuizInstanceSubmission(
    val items: Array<QuizInstanceSubmission>,
    val nextCursor: String? = null,
    val count: Long? = null
)
