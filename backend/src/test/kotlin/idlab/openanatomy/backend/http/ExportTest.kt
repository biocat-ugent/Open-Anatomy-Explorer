package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.commons.listChildren
import idlab.openanatomy.backend.commons.readFromJson
import idlab.openanatomy.backend.commons.readString
import idlab.openanatomy.backend.definitions.*
import idlab.openanatomy.backend.export.ModelExporter
import idlab.openanatomy.backend.http.util.Eq
import idlab.openanatomy.backend.http.util.Roles
import idlab.openanatomy.backend.http.util.toQueryDocument
import io.quarkus.test.junit.QuarkusTest
import io.quarkus.test.security.TestSecurity
import io.restassured.RestAssured
import io.restassured.RestAssured.given
import io.smallrye.mutiny.coroutines.awaitSuspending
import io.vertx.core.json.JsonArray
import kotlinx.coroutines.runBlocking
import net.lingala.zip4j.ZipFile
import org.bson.types.ObjectId
import org.eclipse.microprofile.config.inject.ConfigProperty
import org.hamcrest.Matchers
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNotEquals
import org.junit.jupiter.api.Test
import java.io.FileOutputStream
import java.nio.file.Files
import java.time.Instant
import java.util.*
import javax.inject.Inject
import kotlin.io.path.absolutePathString
import kotlin.jvm.optionals.getOrNull

@QuarkusTest
class ExportTest : AbstractTest() {

    @Inject
    lateinit var modelExporter: ModelExporter

    @ConfigProperty(name = "opanex.exports.extensions.model")
    private lateinit var modelObjectExtension: Optional<String>

    @OptIn(ExperimentalStdlibApi::class)
    @Test
    @TestSecurity(authorizationEnabled = true, user = "test-user", roles = [Roles.ADMIN])
    fun testExportImport() = runBlocking {
        // Populate a model
        val testModel = populateModel()

        val tmpFile = Files.createTempFile(null, null).toFile()
        FileOutputStream(tmpFile).use { fileOutputStream ->
            // Export the model via API
            RestAssured.get("http://localhost:8081/model-export")
                .then()
                .statusCode(200)
                .extract().asInputStream().transferTo(fileOutputStream)
        }

        val tmpFolder = Files.createTempDirectory(null)
        ZipFile(tmpFile).use { zip ->
            zip.extractAll(tmpFolder.absolutePathString())
        }
        val modelExportDir = tmpFolder.resolve("${testModel.model.id}_${testModel.model.name}")
        val metadata = vertx.fileSystem().readFromJson<Model>(modelExportDir.resolve(ModelExporter.META_DATA_JSON))
        assertEqualsModel(testModel.model, metadata)
        // Check labels
        val labelsById = testModel.labels.associateBy { it.id!! }
        val numberOfLabels =
            vertx.fileSystem().listChildren(modelExportDir.resolve(ModelExporter.LABEL_FOLDER)).onEach { filePath ->
                val (label, vertices) = modelExporter.readLabel(filePath)
                label.modelId = metadata.id.toString()
                assertEquals(labelsById[label.id!!]!!, label)
                assertEquals(testModel.vertices[label.id.toString()], vertices)
            }.size
        assertEquals(testModel.labels.size, numberOfLabels)

        // Check quizzes
        val quizzesById = testModel.quizzes.associateBy { it.id!! }
        val numberOfQuizzes =
            vertx.fileSystem().listChildren(modelExportDir.resolve(ModelExporter.QUIZ_FOLDER)).onEach { filePath ->
                val (quiz, questions) = modelExporter.readQuiz(filePath)
                quiz.modelId = metadata.id.toString()
                assertEquals(quizzesById[quiz.id!!]!!, quiz)
                assertEquals(testModel.questions[quiz.id.toString()], questions)
            }.size
        assertEquals(testModel.quizzes.size, numberOfQuizzes)

        // Check object file
        val exportedObj = vertx.fileSystem()
            .readString(
                modelExportDir.resolve(ModelExporter.BINARIES_FOLDER)
                    .resolve(ModelAssetType.OBJECT.toString().plus(modelObjectExtension.getOrNull() ?: ""))
            )
        assertEquals(Files.readString(testModel.objectFile.toPath()), exportedObj)

        val result = given()
            .multiPart("file", tmpFile)
            .`when`()
            .post("http://localhost:8081/model-import")
            .then()
            .extract().asString()
        val importedModelIds = JsonArray(result)

        // Use the return object to check the imported model
        val importedModel = Model.findById(ObjectId(importedModelIds.first().toString())).awaitSuspending()!!
        assertEquals(stripMD(testModel.model), stripMD(importedModel))
        // Should have a new ID
        assertNotEquals(testModel.model.id, importedModel.id)

        // Check labels
        val numberOfImportedLabels =
            Label.list(Eq(Label::modelId.name, importedModel.id.toString()).toQueryDocument()).awaitSuspending()
                .onEach { importedLabel ->
                    val origLabel = testModel.labels.find { it.name == importedLabel.name }!!
                    assertEquals(stripMD(origLabel), stripMD(importedLabel))
                    // Should have a new ID
                    assertNotEquals(origLabel.id, importedLabel.id)
                    // Check if vertices match
                    val importedVertices =
                        LabelVertices.find(
                            Eq(
                                LabelVertices::labelId.name,
                                importedLabel.id.toString()
                            ).toQueryDocument()
                        )
                            .firstResult().awaitSuspending()
                    assertEquals(testModel.vertices[origLabel.id.toString()]?.data, importedVertices?.data)
                }.size
        assertEquals(testModel.labels.size, numberOfImportedLabels)

        // Check quizzes
        val numberOfImportedQuizzes =
            Quiz.list(Eq(Quiz::modelId.name, importedModel.id.toString()).toQueryDocument()).awaitSuspending()
                .onEach { importedQuiz ->
                    val origQuiz = testModel.quizzes.find { it.name == importedQuiz.name }!!
                    assertEquals(stripMD(origQuiz), stripMD(importedQuiz))
                    // Should have a new ID
                    assertNotEquals(origQuiz.id, importedQuiz.id)
                    // Check questions
                    val origQuestions = testModel.questions[origQuiz.id.toString()]!!
                    val numberOfImportedQuestions =
                        Question.list(Eq(Question::quizId.name, importedQuiz.id.toString()).toQueryDocument())
                            .awaitSuspending()
                            .onEach { importedQuestion ->
                                val origQuestion =
                                    origQuestions.find { it.textPrompt == importedQuestion.textPrompt }!!
                                assertEquals(stripMD(origQuestion), stripMD(importedQuestion))
                                // Should have a new ID
                                assertNotEquals(origQuestion.id, importedQuestion.id)
                            }
                            .size
                    assertEquals(origQuestions.size, numberOfImportedQuestions)
                }.size
        assertEquals(testModel.quizzes.size, numberOfImportedQuizzes)

        // Check imported object file
        RestAssured.`when`()
            .get("http://localhost:8081/models/{id}/object", importedModel.id.toString())
            .then()
            .statusCode(200)
            .body(Matchers.equalTo("Hello World!"))

        // Also check the object file has a different internal id
        val origObjFileId =
            Model.findById(testModel.model.id!!).awaitSuspending()!!.storageKeys[ModelAssetType.OBJECT.toString()]
        assertNotEquals(origObjFileId, importedModel.storageKeys[ModelAssetType.OBJECT.toString()])
    }

    private fun stripMD(model: Model): Model {
        val result = model.copy()
        result.id = null
        result.createdAt = Instant.MIN
        result.lastModifiedAt = null
        result.storageKeys = mutableMapOf()
        return result
    }

    private fun stripMD(label: Label): Label {
        val result = label.copy(modelId = "")
        result.createdAt = Instant.MIN
        result.lastModifiedAt = null
        return result
    }

    private fun stripMD(quiz: Quiz): Quiz {
        val result = quiz.copy(modelId = "")
        result.createdAt = Instant.MIN
        result.lastModifiedAt = null
        return result
    }

    private fun stripMD(question: Question): Question {
        val result = question.copy(quizId = "", labelId = "")
        result.createdAt = Instant.MIN
        result.lastModifiedAt = null
        return result
    }

}
