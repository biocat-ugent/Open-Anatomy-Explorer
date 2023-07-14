package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.definitions.Model
import idlab.openanatomy.backend.http.util.Roles
import io.quarkus.test.common.http.TestHTTPEndpoint
import io.quarkus.test.junit.QuarkusTest
import io.quarkus.test.security.TestSecurity
import io.restassured.RestAssured.given
import io.restassured.RestAssured.`when`
import io.smallrye.mutiny.coroutines.awaitSuspending
import kotlinx.coroutines.runBlocking
import org.bson.types.ObjectId
import org.hamcrest.Matchers
import org.junit.jupiter.api.AfterAll
import org.junit.jupiter.api.BeforeAll
import org.junit.jupiter.api.Test
import java.io.File

@QuarkusTest
@TestHTTPEndpoint(ModelResource::class)
internal class GridFSTest {

    companion object {

        private lateinit var model: Model
        private var file: File? = null

        @BeforeAll
        @JvmStatic
        fun setup(): Unit = runBlocking {
            clean()
            file = File("test.obj")
            file!!.createNewFile()
            file!!.writeText("Hello World!")
            model = Model(name = "test").apply {
                this.ownerUserId = "test-user"
            }
            Model.persist(model).awaitSuspending()
        }

        @AfterAll
        @JvmStatic
        fun teardown(): Unit = runBlocking {
            clean(model.id)
        }

        suspend fun clean(modelId: ObjectId? = null) {
            if (modelId != null) {
                Model.deleteById(modelId).awaitSuspending()
            }
            file?.delete()
        }
    }

    @Test
    @TestSecurity(authorizationEnabled = true, user = "test-user", roles = [Roles.ADMIN])
    fun uploadAndDownloadObjectFile() {
        given()
            .multiPart("file", file)
            .`when`()
            .put("{id}/object", model.id.toString())
            .then()
            .statusCode(204)

        // Test get
        `when`()
            .get("{id}/object", model.id.toString())
            .then()
            .statusCode(200)
            .body(Matchers.equalTo("Hello World!"))
    }

}
