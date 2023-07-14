import {Injectable} from '@angular/core'
import {HttpClient, HttpEvent, HttpRequest, HttpResponse} from "@angular/common/http"
import {environment} from "src/environments/environment"
import {
  Label,
  LabelInput,
  Model,
  ModelInput,
  Page,
  PageArgs,
  Question,
  QuestionInput, QuestionResponse,
  Quiz,
  QuizInput,
  QuizInstance, QuizInstanceSubmission
} from "../types"
import {Observable, Subject} from "rxjs"
import {OBJLoader2} from "wwobjloader2"


const API_ROOT = environment.backend_root

/**
 * Creates a URL with the {@link API_ROOT}, path, and args appended as querystring.
 * @param path - Path of the api
 * @param args - QueryArgs to append
 * @returns
 */
function url(path: string, args: PageArgs = {}): string {
  const query = Object.entries(args).map((entry) => encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1])).join('&')
  const url = `${API_ROOT}/${path}`
  return query.length === 0 ? url : `${url}?${query}`
}


@Injectable({
  providedIn: 'root'
})
export class BackendService {

  constructor(private http: HttpClient) {
  }

  // Model Resource

  /**
   * Get all Models
   * @param args Optional page arguments
   */
  getModels = (args?: PageArgs): Observable<Page<Model>> => {
    return this.http.get<Page<Model>>(url('models', args))
  }

  /**
   * Get one Model
   * @param modelId Model id
   */
  getModel(modelId: string): Observable<Model> {
    return this.http.get<Model>(url(`models/${modelId}`))
  }

  /**
   * Download material file of a Model
   * @param modelId Model id
   */
  downloadModelMaterial(modelId: string): Observable<Object> {
    return this.http.get<Object>(url(`models/${modelId}/material`))
  }

  /**
   * Download object file of a Model
   * @param modelId Model id
   * @param onLoad callback when object is loaded
   */
  downloadModelObject(modelId: string, onLoad: Function): void {
    this.http.get(url(`models/${modelId}/object`), {responseType: "blob"}).subscribe({
      next: (value: Blob) => {
        value.arrayBuffer().then(arrayBuffer => {
          onLoad(new OBJLoader2().parse(arrayBuffer))
        })
      },
      error: () => {
        onLoad(undefined)
      }
    })
  }

  /**
   * Check if Model has an object file
   * @param modelId
   */
  hasModelObject(modelId: string): Observable<boolean> {
    const result = new Subject<boolean>()

    this.http.head<HttpResponse<any>>(url(`models/${modelId}/object`)).subscribe({
      next: () => result.next(true),
      error: () => result.next(false),
      complete: () => result.complete()
    })

    return result.asObservable()
  }

  /**
   * Download texture file of a Model
   * @param modelId Model id
   */
  downloadModelTexture(modelId: string): Observable<Object> {
    return this.http.get<Object>(url(`models/${modelId}/texture`))
  }

  /**
   * Create a new Model
   * @param modelInput New Model details
   */
  createModel(modelInput: ModelInput): Observable<string> {
    return this.http.post(url('models'), modelInput, {responseType: "text"})
  }

  /**
   * Update an existing Model
   * @param modelId Existing Model id
   * @param modelInput Updated Model details
   */
  updateModel(modelId: string, modelInput: ModelInput): Observable<HttpResponse<any>> {
    return this.http.put<HttpResponse<any>>(url(`models/${modelId}`), modelInput, {observe: "response"})
  }

  /**
   * Upload material file to Model
   * @param modelId Model id
   * @param materialFile Material file
   */
  uploadModelMaterial(modelId: string, materialFile: Object): Observable<HttpResponse<any>> {
    return this.http.put<HttpResponse<any>>(url(`models/${modelId}/material`), materialFile, {observe: "response"})
  }

  /**
   * Upload object file to Model
   * @param modelId Model id
   * @param objectFile Object file
   */
  uploadModelObject(modelId: string, objectFile: FormData): Observable<HttpEvent<any>> {
    return this.http.request(new HttpRequest('PUT', url(`models/${modelId}/object`), objectFile, {reportProgress: true}))
  }

  /**
   * Upload texture file to Model
   * @param modelId Model id
   * @param textureFile Texture file
   */
  uploadModelTexture(modelId: string, textureFile: Object): Observable<HttpResponse<any>> {
    return this.http.put<HttpResponse<any>>(url(`models/${modelId}/texture`), textureFile, {observe: "response"})
  }

  /**
   * Delete a Model
   * @param modelId Model id
   */
  deleteModel(modelId: string): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(url(`models/${modelId}`), {observe: "response"})
  }

  /**
   * Delete a Model material file
   * @param modelId Model id
   */
  deleteModelMaterial(modelId: string): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(url(`models/${modelId}/material`), {observe: "response"})
  }

  /**
   * Delete a Model object file
   * @param modelId Model id
   */
  deleteModelObject(modelId: string): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(url(`models/${modelId}/object`), {observe: "response"})
  }

  /**
   * Delete a Model texture file
   * @param modelId Model id
   */
  deleteModelTexture(modelId: string): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(url(`models/${modelId}/texture`), {observe: "response"})
  }

  // Label Resource

  /**
   * Get all Labels associated with a Model
   * @param modelId Model id
   * @param args Optional page arguments
   */
  getModelLabels(modelId: string, args?: PageArgs): Observable<Page<Label>> {
    return this.http.get<Page<Label>>(url(`models/${modelId}/labels`, args))
  }

  /**
   * Get specific Label associated with a Model
   * @param modelId Model id
   * @param labelId Label id
   */
  getModelLabel(modelId: string, labelId: string): Observable<Label> {
    return this.http.get<Label>(url(`models/${modelId}/labels/${labelId}`))
  }

  /**
   * Get vertices associated with a Label associated with a Model
   * @param modelId Model id
   * @param labelId Label id
   */
  getModelLabelVertices(modelId: string, labelId: string): Observable<number[]> {
    return this.http.get<number[]>(url(`models/${modelId}/labels/${labelId}/vertices`))
  }

  /**
   * Create Label associated to a Model
   * @param modelId Model id
   * @param labelInput New Label details
   */
  createModelLabel(modelId: string, labelInput: LabelInput): Observable<string> {
    return this.http.post(url(`models/${modelId}/labels`), labelInput, {responseType: "text"})
  }

  /**
   * Update Label associated to a Model
   * @param modelId Model id
   * @param labelId Label id
   * @param labelInput New Label details
   */
  updateModelLabel(modelId: string, labelId: string, labelInput: LabelInput): Observable<HttpResponse<any>> {
    return this.http.put<HttpResponse<any>>(url(`models/${modelId}/labels/${labelId}`), labelInput, {observe: "response"})
  }

  /**
   * Update a vertices of a Label associated to a Model
   * @param modelId Model id
   * @param labelId Label id
   * @param vertices New vertices
   */
  updateModelLabelVertices(modelId: string, labelId: string, vertices: number[]): Observable<HttpResponse<any>> {
    return this.http.put<HttpResponse<any>>(url(`models/${modelId}/labels/${labelId}/vertices`), vertices, {observe: "response"})
  }

  /**
   * Delete a Label associated to a Model
   * @param modelId Model id
   * @param labelId Label id
   */
  deleteModelLabel(modelId: string, labelId: string): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(url(`models/${modelId}/labels/${labelId}`), {observe: "response"})
  }

  // Quiz Resource

  /**
   * Get all Quizzes associated with a Model
   * @param modelId Model id
   * @param args Optional page arguments
   */
  getModelQuizzes = (modelId: string, args?: PageArgs): Observable<Page<Quiz>> => {
    return this.http.get<Page<Quiz>>(url(`models/${modelId}/quizzes`, args))
  }

  /**
   * Get a Quiz associated with a Model
   * @param modelId Model id
   * @param quizId Quiz is
   */
  getModelQuiz(modelId: string, quizId: string): Observable<Quiz> {
    return this.http.get<Quiz>(url(`models/${modelId}/quizzes/${quizId}`))
  }

  /**
   * Create a Quiz associated with a Model
   * @param modelId Model id
   * @param quizInput New Quiz details
   */
  createModelQuiz(modelId: string, quizInput: QuizInput): Observable<string> {
    return this.http.post(url(`models/${modelId}/quizzes`), quizInput, {responseType: "text"})
  }

  /**
   * Update a Quiz associated with a Model
   * @param modelId Model id
   * @param quizId Quiz id
   * @param quizInput New Quiz details
   */
  updateModelQuiz(modelId: string, quizId: string, quizInput: QuizInput): Observable<HttpResponse<any>> {
    return this.http.put<HttpResponse<any>>(url(`models/${modelId}/quizzes/${quizId}`), quizInput, {observe: "response"})
  }

  /**
   * Delete a Quiz associated with a Model
   * @param modelId Model id
   * @param quizId Quiz id
   */
  deleteModelQuiz(modelId: string, quizId: string): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(url(`models/${modelId}/quizzes/${quizId}`), {observe: "response"})
  }

  // Question Resource

  /**
   * Get all Questions associated with a Quiz associated with a Model
   * @param modelId Model id
   * @param quizId Quiz id
   * @param args Optional page arguments
   */
  getModelQuizQuestions(modelId: string, quizId: string, args?: PageArgs): Observable<Page<Question>> {
    return this.http.get<Page<Question>>(url(`models/${modelId}/quizzes/${quizId}/questions`, args))
  }

  /**
   * Get a Question associated with a Quiz associated with a Model
   * @param modelId Model id
   * @param quizId Quiz id
   * @param questionId Question id
   */
  getModelQuizQuestion(modelId: string, quizId: string, questionId: string): Observable<Question> {
    return this.http.get<Question>(url(`models/${modelId}/quizzes/${quizId}/questions/${questionId}`))
  }

  /**
   * Create a Question associated with a Quiz associated with a Model
   * @param modelId Model id
   * @param quizId Quiz id
   * @param questionInput New Question details
   */
  createModelQuizQuestion(modelId: string, quizId: string, questionInput: QuestionInput): Observable<string> {
    return this.http.post(url(`models/${modelId}/quizzes/${quizId}/questions`), questionInput, {responseType: "text"})
  }

  /**
   * Update a Question associated with a Quiz associated with a Model
   * @param modelId Model id
   * @param quizId Quiz id
   * @param questionId Question id
   * @param questionInput New Question details
   */
  updateModelQuizQuestion(modelId: string, quizId: string, questionId: string, questionInput: QuestionInput): Observable<HttpResponse<any>> {
    return this.http.put<HttpResponse<any>>(url(`models/${modelId}/quizzes/${quizId}/questions/${questionId}`), questionInput, {observe: "response"})
  }

  /**
   * Delete a Question associated with a Quiz associated with a Model
   * @param modelId Model id
   * @param quizId Quiz id
   * @param questionId Question id
   */
  deleteModelQuizQuestion(modelId: string, quizId: string, questionId: string): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(url(`models/${modelId}/quizzes/${quizId}/questions/${questionId}`), {observe: "response"})
  }

  /**
   * Get all the instances of a quiz
   * @param modelId Model id
   * @param quizId Quiz id
   * @param args Optional page args
   */
  getQuizInstances(modelId: string, quizId: string, args?: PageArgs): Observable<Page<QuizInstance>> {
    return this.http.get<Page<QuizInstance>>(url(`models/${modelId}/quizzes/${quizId}/instances`, args))
  }

  /**
   * Get all Quiz instances in the system
   * @param args Optional page arguments
   */
  getAllQuizInstances(args?: PageArgs): Observable<Page<QuizInstance>> {
    return this.http.get<Page<QuizInstance>>(url(`quizinstances`, args))
  }

  /**
   * Get a quiz instance
   * @param modelId Model id
   * @param quizId Quiz id
   * @param quizInstanceId Quiz instance id
   */
  getQuizInstance(modelId: string, quizId: string, quizInstanceId: string): Observable<QuizInstance> {
    return this.http.get<QuizInstance>(url(`models/${modelId}/quizzes/${quizId}/instances/${quizInstanceId}`))
  }

  /**
   * Create an instance of a quiz
   * @param modelId Model id
   * @param quizId Quiz id
   */
  createQuizInstance(modelId: string, quizId: string): Observable<string> {
    return this.http.post(url(`models/${modelId}/quizzes/${quizId}/instances`), undefined, {responseType: "text"})
  }

  /**
   * Delete a quiz instance
   * @param modelId Model id
   * @param quizId Quiz id
   * @param quizInstanceId Quiz instance id
   */
  deleteQuizInstance(modelId: string, quizId: string, quizInstanceId: string): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(url(`models/${modelId}/quizzes/${quizId}/instances/${quizInstanceId}`), {observe: "response"})
  }

  /**
   * Save a student's responses
   * @param modelId Model id
   * @param quizId Quiz id
   * @param quizInstanceId Quiz instance id
   * @param responses QuestionResponse's of a student
   */
  createQuizInstanceSubmission(modelId: string, quizId: string, quizInstanceId: string, responses: QuestionResponse[]): Observable<string> {
    return this.http.post(url(`models/${modelId}/quizzes/${quizId}/instances/${quizInstanceId}/submissions`), responses, {responseType: "text"})
  }

  /**
   * Get all the submissions of a certain instance
   * @param modelId Model id
   * @param quizId Quiz id
   * @param quizInstanceId Quiz instance id
   * @param args Optional page args
   */
  getQuizInstanceSubmissions(modelId: string, quizId: string, quizInstanceId: string, args?: PageArgs): Observable<Page<QuizInstanceSubmission>> {
    return this.http.get<Page<QuizInstanceSubmission>>(url(`models/${modelId}/quizzes/${quizId}/instances/${quizInstanceId}/submissions`, args))
  }

  /**
   * Delete a submission
   * @param modelId Model id
   * @param quizId Quiz id
   * @param quizInstanceId Quiz instance id
   * @param submissionId Submission id
   */
  deleteQuizInstanceSubmission(modelId: string, quizId: string, quizInstanceId: string, submissionId: string): Observable<HttpResponse<any>> {
    return this.http.delete<HttpResponse<any>>(url(`models/${modelId}/quizzes/${quizId}/instances/${quizInstanceId}/submissions/${submissionId}`), {observe: "response"})
  }

  /**
   * Get a single submission to view details
   * @param modelId
   * @param quizId
   * @param quizInstanceId
   * @param submissionId
   */
  getQuizInstanceSubmission(modelId: string, quizId: string, quizInstanceId: string, submissionId: string): Observable<QuizInstanceSubmission> {
    return this.http.get<QuizInstanceSubmission>(url(`models/${modelId}/quizzes/${quizId}/instances/${quizInstanceId}/submissions/${submissionId}`))
  }

  /**
   * Get a model export
   * @param args Optional page args
   */
  getModelExport(args?: PageArgs): Observable<any> {
    const httpOptions: Object = {
      responseType: 'blob',
      observe: 'response'
    };
    return this.http.get<any>(url(`model-export`, args), httpOptions)
  }

  /**
   * Import models
   */
  importModels(file: File): Observable<any> {
    const formData: FormData = new FormData();
    formData.append('file', file);

    return this.http.post(url(`model-import`), formData, {
      reportProgress: true,
      responseType: 'json',
      observe: 'events'
    })
  }
}
