package idlab.openanatomy.backend.http.util

import org.bson.Document
import org.bson.types.ObjectId
import kotlin.reflect.KClass

interface Filter {

    fun operatorName(): String {
        return filterName(this::class)
    }

}

interface LogicalOperator : Filter {
    val operands: List<Filter>

    companion object {

        val operatorNames = setOf(And::class, Or::class, Not::class).map(::filterName).toSet()

        fun from(operatorName: String, operands: List<Filter>): LogicalOperator {
            return when (operatorName) {
                filterName(And::class) -> And(operands)
                filterName(Or::class) -> Or(operands)
                filterName(Not::class) -> if (operands.size == 1) Not(operands.first()) else throw IllegalArgumentException(
                    "Not logical operator must have exactly 1 operand!"
                )

                else -> throw IllegalArgumentException("Unrecognized logical operator name '$operatorName', expected on of $operatorNames")
            }
        }
    }
}

internal fun filterName(clazz: KClass<out Filter>): String {
    return clazz.simpleName?.lowercase()!!
}

interface ComparisonOperator : Filter {
    val field: String
    val value: Any?

    companion object {
        val operatorNames =
            setOf(Eq::class, Ne::class, Gt::class, Ge::class, Lt::class, Le::class).map(::filterName).toSet()

        fun from(operatorName: String, field: String, value: Any?): ComparisonOperator {
            return when (operatorName) {
                filterName(Eq::class) -> Eq(field, value)
                filterName(Ne::class) -> Ne(field, value)
                filterName(Gt::class) -> Gt(field, value)
                filterName(Ge::class) -> Ge(field, value)
                filterName(Lt::class) -> Lt(field, value)
                filterName(Le::class) -> Le(field, value)
                else -> throw IllegalArgumentException("Unrecognized comparison operator name '$operatorName', expected one of $operatorNames")
            }
        }
    }
}

object SelectAll : Filter {
    override fun toString(): String {
        return "SelectAll"
    }
}

data class And(override val operands: List<Filter>) : LogicalOperator {
    constructor(vararg args: Filter) : this(args.toList())
}

data class Or(override val operands: List<Filter>) : LogicalOperator {
    constructor(vararg args: Filter) : this(args.toList())
}

data class Not(val operand: Filter) : LogicalOperator {
    override val operands = listOf(operand)
}

data class Eq(override val field: String, override val value: Any?) : ComparisonOperator
data class Ne(override val field: String, override val value: Any?) : ComparisonOperator
data class Gt(override val field: String, override val value: Any?) : ComparisonOperator
data class Ge(override val field: String, override val value: Any?) : ComparisonOperator
data class Lt(override val field: String, override val value: Any?) : ComparisonOperator
data class Le(override val field: String, override val value: Any?) : ComparisonOperator

data class In(val field: String, val values: Collection<Any?>) : Filter

fun parseFilter(statement: String, baseFilter: Filter? = null): Filter {
    return if (statement.isEmpty()) {
        baseFilter ?: SelectAll
    } else {
        val filter = ODataFilterParser(statement).toFilter()
        if (baseFilter != null) And(baseFilter, filter) else filter
    }
}

fun Filter.toQueryDocument(): Document {
    return if (this == SelectAll) {
        Document()
    } else {
        return when (this) {
            is LogicalOperator -> Document(
                "\$${this.operatorName().lowercase()}",
                this.operands.map { it.toQueryDocument() })

            is ComparisonOperator -> {
                val opName = "\$${this.operatorName().lowercase()}"
                if (this.field == "id") {
                    Document("_id", Document(opName, ObjectId(this.value as String)))
                } else if (this.value is Enum<*>) {
                    Document(this.field, Document(opName, this.value.toString()))
                } else {
                    Document(this.field, Document(opName, this.value))
                }
            }

            is In -> Document(if (this.field == "id") "_id" else this.field, Document("\$in", this.values))
            else -> throw IllegalArgumentException("Cannot process unsupported Filter type '${this::class.qualifiedName}'")
        }
    }
}
