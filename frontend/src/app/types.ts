/**
 * Identifiable object contain an `id` and `authorUserId` field.
 * They are also dated with `createdAt` and `lastModifiedAt`.
 */
export interface ID {
  id: string;
  ownerUserId: string;
  createdAt: string;
  lastModifiedAt: string;
}

/**
 * Collections are represented as pages. Items holds all items in the page as an array.
 * If there is a cursor, it can be used to go to the nest page. If count was requested,
 * the count is returned;
 */
export interface Page<T> {
  /** Items of type T in this page */
  items: T[];
  /** Optional cursor to the next page */
  nextCursor?: string;
  /** Optional count of the total items (over all potential pages) */
  count?: number
}

/**
 * Arguments for querying the API in case of collections.
 */
export interface PageArgs {
  /** Cursor pointing to the next {@link Page} */
  cursor?: string;
  /** Filter to filter the results */
  filter?: string;
  /** Limits the number of items in a page */
  pageSize?: number;

  /** Projection */
  project?: string;
}

/**
 * Identifies a Model
 */
export interface Model extends ID {
  name?: string,
  category?: string,
  cameraPosition?: number[],
  cameraTarget?: number[],
  modelRotation?: number[]
}

export type ModelInput = Omit<Model, keyof ID>

/**
 * Identifies a Label
 */
export interface Label extends ID {
  name?: string,
  colour?: string

  // Client-side annotations
  edited?: boolean
}

export type LabelInput = Omit<Label, keyof ID | "edited">

/**
 * Identifies a Quiz
 */
export interface Quiz extends ID {
  name?: string,
  shuffle?: boolean
}

export type QuizInput = Omit<Quiz, keyof ID>

export enum QuestionType {
  LOCATE = 'LOCATE',
  NAME = 'NAME',
  FREE_FORM = 'FREE_FORM'
}

export interface Question extends ID {
  questionType?: QuestionType,
  textPrompt?: string,
  textAnswer?: string, // TODO: make sure we don't include this in response when Role < Teacher, or in Quiz mode
  labelId?: string,
  showRegions?: boolean
}

export type QuestionInput = Omit<Question, keyof ID>

// This object contains a modelId (m), quizId (q) and a quizInstanceId (i) and will be serialized and encoded
// Base64 encoded object will be used as quiz instance invite code
// Usage of short property names to shorten the Base64 encoded string as much as possible
export interface QuizInstanceInviteCode {
  // modelId
  m: string,

  // quizId
  q: string,

  // quizInstanceId
  i: string
}

export interface QuizInstance extends ID {
  modelId: string,
  quizId: string,
  name: string,
  questionsSnapshot: Question[]
}

export interface QuizInstanceTable extends QuizInstance {
  quizInviteCode: string
}

export interface QuestionResponse {
  questionId: string,
  textAnswer: string,
  verticesData: number[]
}

export interface QuizInstanceSubmission extends ID {
  responses: QuestionResponse[]
}

