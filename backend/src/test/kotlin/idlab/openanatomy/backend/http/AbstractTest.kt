package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.definitions.*
import idlab.openanatomy.backend.http.util.ModelAssetManager
import io.restassured.RestAssured
import io.smallrye.mutiny.coroutines.awaitSuspending
import io.vertx.mutiny.core.Vertx
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.toList
import org.junit.jupiter.api.Assertions
import java.io.File
import javax.inject.Inject
import kotlin.random.Random

abstract class AbstractTest {

    @Inject
    protected lateinit var modelAssetManager: ModelAssetManager

    @Inject
    protected lateinit var vertx: Vertx

    suspend fun populateModel(): TestModel {
        // Build model with children
        val model = Model("test").apply { this.ownerUserId = "test-user" }
        Model.persist(model).awaitSuspending()

        // Create labels
        val vertices = mutableMapOf<String, LabelVertices>()
        val labels = (1..5).asFlow().map {
            val label = Label(model.id.toString(), "Label$it", "someColor").apply { this.ownerUserId = "test-user" }
            Label.persist(label).awaitSuspending()
            val labelVertices = LabelVertices(labelId = label.id.toString(), data = (1..5).map { Random.nextInt() })
            LabelVertices.persist(labelVertices).awaitSuspending()
            vertices[label.id.toString()] = labelVertices
            label
        }.toList()

        // Create quizzes
        val quizzes = (1..5).asFlow().map {
            val quiz = Quiz(model.id.toString(), "Quiz$it", false).apply { this.ownerUserId = "test-user" }
            Quiz.persist(quiz).awaitSuspending()
            quiz
        }.toList()

        // Create questions
        val questions = (1..15).asFlow().map {
            val question = Question(
                quizzes.map { q -> q.id.toString() }.random(),
                QuestionType.LOCATE,
                "Question $it?",
                showRegions = true
            ).apply { this.ownerUserId = "test-user" }
            Question.persist(question).awaitSuspending()
            question
        }.toList().groupBy { it.quizId }

        // Create attachment
        val file = File("test.obj")
        file.createNewFile()
        file.writeText("Hello World!")
        RestAssured.given()
            .multiPart("file", file)
            .`when`()
            .put("http://localhost:8081/models/{id}/object", model.id.toString())
            .then()
            .statusCode(204)
        return TestModel(model, labels, vertices, quizzes, questions, file)
    }

    fun assertEqualsModel(expected: Model, actual: Model) {
        // Set storageKeys as it is annotated with @JsonIgnore
        actual.storageKeys = mutableMapOf()
        Assertions.assertEquals(expected, actual)
    }

    fun assertEqualsModels(expected: List<Model>, actual: List<Model>) {
        Assertions.assertEquals(expected, actual.map {
            // Set storageKeys as it is annotated with @JsonIgnore
            it.storageKeys = mutableMapOf()
            it
        })
    }

}

data class TestModel(
    val model: Model,
    val labels: List<Label>,
    // LabelID -> Vertices data
    val vertices: Map<String, LabelVertices>,
    val quizzes: List<Quiz>,
    // QuizID -> List of questions
    val questions: Map<String, List<Question>>,
    val objectFile: File
)
