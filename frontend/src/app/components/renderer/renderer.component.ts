// Renderer is adapted from https://github.com/soluri/Open-Anatomy-Explorer/blob/main/src/renderer.ts and rewritten to work with Angular
// A complete rewrite using modern tools and best practises is advised...

import {
  AfterViewInit,
  Component,
  ElementRef, EventEmitter,
  HostListener, Input, OnDestroy,
  OnInit, Output,
  ViewChild,
} from '@angular/core'
import {CommonModule} from '@angular/common'
import * as THREE from "three"
import {
  BufferAttribute,
  BufferGeometry,
  Euler,
  Mesh,
  Object3D,
  Quaternion,
  Scene,
  Vector3,
  Vector4
} from "three"
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls"
import {Pane, TpChangeEvent} from "tweakpane"
import * as EssentialsPlugin from '@tweakpane/plugin-essentials'
import {BackendService} from "src/app/services/backend.service"
import {Subject} from "rxjs"
import {TransformControls} from "three/examples/jsm/controls/TransformControls"

@Component({
  selector: 'app-renderer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './renderer.component.html',
  styleUrls: ['./renderer.component.scss']
})
export class RendererComponent implements OnInit, AfterViewInit, OnDestroy {

  // ViewChilds
  @ViewChild('canvas')
  private canvasRef!: ElementRef

  @ViewChild('wrapper')
  private wrapperRef!: ElementRef

  @ViewChild('renderer_gui_wrapper')
  private rendererGuiWrapperRef!: ElementRef

  private get canvas(): HTMLCanvasElement {
    return this.canvasRef.nativeElement
  }

  private get wrapper(): HTMLElement {
    return this.wrapperRef.nativeElement
  }

  private get rendererGuiWrapper(): HTMLElement {
    return this.rendererGuiWrapperRef.nativeElement
  }

  // Inputs
  @Input()
  modelId = ''

  @Input()
  cameraFarPlane = 2000

  @Input()
  initialCameraPosition = {x: -300, y: 0, z: 0}

  @Input()
  initialCameraTarget = {x: 0, y: 0, z: 0}

  @Input()
  modelRotation = {x: 0, y: 0, z: 0}

  @Input()
  previewMode = false

  @Input()
  quizMode = false

  @Output()
  labelVerticesChangeEvent = new EventEmitter<number[]>()

  @Output()
  labelVerticesColorChangeEvent = new EventEmitter<THREE.Vector4>()

  // Additional variables
  private VertexShader!: string | undefined
  private FragmentShader!: string | undefined

  private meshes: Mesh[] = []
  private model: Object3D | null = null
  private scene: Scene = new THREE.Scene()
  private renderer!: THREE.WebGLRenderer
  // private container!: HTMLCanvasElement // === this.renderer.domElement === this.canvas
  private colorBufferAttribute: THREE.BufferAttribute | null = null

  private camera!: THREE.PerspectiveCamera
  private controls!: OrbitControls
  private transformControls!: TransformControls
  private tweakPane!: Pane
  private tweakPaneFpsGraph: any
  private brushSize = 2
  private labelColorVector = new THREE.Vector4(1, 0, 0, 1)
  private labelColorObject = {labelColor: '#ff0000ff'}
  private labelVertices: number[] = []

  private ambientLight!: THREE.AmbientLight
  private directionalLight!: THREE.DirectionalLight
  private directionalLightHelper!: THREE.DirectionalLightHelper

  private plane!: THREE.PlaneHelper
  private planeVisible = true

  private mouse = new THREE.Vector2()
  private mouseDown = false
  private mouseMoveHandler: ((_: THREE.Intersection) => void) | null = null
  protected isCameraTool = true
  private currentTool: string = 'Camera'
  private lastToolBeforeRotation = 'Camera'
  private isRotationEditMode = false

  // TODO?: Possible performance gains: https://github.com/gkjohnson/three-mesh-bvh https://github.com/search?q=three-mesh-bvh+angular&type=code
  private raycaster: THREE.Raycaster = new THREE.Raycaster()

  public onClickPosition = new THREE.Vector2()
  public isModelLoaded: boolean = false
  public modelLoadError: boolean = false
  public modelLoadErrorMessage: string = ''
  public modelLoadingStatus$: Subject<boolean> = new Subject<boolean>()


  constructor(private backend: BackendService) {
    this.loadShaders()
  }

  ngOnDestroy(): void {
    this.stopRendering()
    this.cleanUp()
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    // Create WebGL context
    const context = this.canvas.getContext('webgl2', {alpha: false})
    if (context == null) throw "Failed to get WebGL2 context"

    // Initialize THREE.js' rendering engine
    this.renderer = new THREE.WebGLRenderer({canvas: this.canvas, context: context})
    this.renderer.setSize(this.canvas.width, this.canvas.height)

    // Set up the camera and camera controls
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, this.cameraFarPlane)
    this.camera.position.set(this.initialCameraPosition.x, this.initialCameraPosition.y, this.initialCameraPosition.z)
    this.camera.lookAt(new THREE.Vector3(this.initialCameraTarget.x, this.initialCameraTarget.y, this.initialCameraTarget.z))
    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.update()

    // Set up the lighting for the scene, as well as an indicator for where the light source is positioned
    this.ambientLight = new THREE.AmbientLight()
    this.directionalLight = new THREE.DirectionalLight()
    this.setupLighting()

    // Hide the directional lighting indicator when in preview/explorer mode
    if (!this.previewMode) {
      this.directionalLightHelper = new THREE.DirectionalLightHelper(this.directionalLight, 10)
      this.scene.add(this.directionalLightHelper)
    }

    // Add a viewable plane to the scene as a point of reference to keep track of the orientation of the model
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 100)
    this.plane = new THREE.PlaneHelper(plane, 500, 0xFFFFFF)
    this.scene.add(this.plane)
    this.onWindowResize()
    this.startRendering()

    this.backend.downloadModelObject(this.modelId, this.loadObject.bind(this))
  }

  /**
   * Cleans everything up manually
   */
  private cleanUp(): void {
    this.renderer.dispose()
    this.meshes = []
    this.model = null
    this.mouseMoveHandler = null
  }

  /**
   * Load custom shader files
   * @private
   */
  private loadShaders(): void {
    new THREE.FileLoader().loadAsync('assets/shader.frag').then(fragShader => {
      this.FragmentShader = fragShader as string
    })

    new THREE.FileLoader().loadAsync('assets/shader.vert').then(vertShader => {
      this.VertexShader = vertShader as string
    })
  }

  /**
   * Configures the lighting for the scene
   * Assumes this.directionalLighting and this.ambientLighting is initialized
   */
  private setupLighting(): void {
    if (this.ambientLight == null || this.directionalLight == null)
      throw "this.ambientLight and/or this.directionalLight was not yet successfully initialized"

    // Ambient light.
    this.ambientLight.color.setHSL(0, 0, 0.25)
    this.scene.add(this.ambientLight)

    // Directional light.
    const dirLight = this.directionalLight
    dirLight.color.setHSL(0, 1, 1)
    dirLight.intensity = 1.2
    dirLight.position.set(-1, 3, -2)
    dirLight.position.multiplyScalar(30)

    dirLight.castShadow = true
    dirLight.shadow.mapSize.width = 2048
    dirLight.shadow.mapSize.height = 2048

    const d = 50
    dirLight.shadow.camera.left = -d
    dirLight.shadow.camera.right = d
    dirLight.shadow.camera.top = d
    dirLight.shadow.camera.bottom = -d
    dirLight.shadow.camera.far = 3500
    dirLight.shadow.bias = -0.0001

    this.scene.add(dirLight)
    this.directionalLight = dirLight
  }

  /**
   * Starts the main rendering loop.
   */
  private startRendering(): void {
    // Sets up main rendering loop.
    const animate = (): void => {
      this.tweakPaneFpsGraph?.begin()

      this.controls.update()
      this.renderer.render(this.scene, this.camera)

      this.tweakPaneFpsGraph?.end()
    }

    this.renderer.setAnimationLoop(animate)

    animate()
  }

  /**
   * Stops the main rendering loop
   */
  private stopRendering(): void {
    this.renderer.setAnimationLoop(null)
  }

  /**
   * Event handler for the window being resized.
   * Adjusts the camera projection matrix to keep the aspect sensible.
   */
  @HostListener('window:resize', ['$event'])
  private onWindowResize(): void {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight
    this.camera.updateProjectionMatrix()
    this.controls.update()

    this.renderer.setSize(this.canvas.clientWidth, this.canvas.clientHeight)
  }

  /**
   * Event handler for pressing the mouse button
   */
  onMouseDown(evt: MouseEvent): void {
    evt.preventDefault()
    this.mouseDown = true

    // Check if another module has overridden mouse movement
    if (this.mouseMoveHandler != null || this.isCameraTool) {
      return
    }

    // Don't continue if object is not yet loaded.
    if (this.meshes == null) return

    const array = this.getMousePosition(this.canvas, evt.clientX, evt.clientY)
    this.onClickPosition.fromArray(array)

    const intersects: THREE.Intersection[] = this.getIntersects(this.onClickPosition, [this.model!])
    if (intersects.length > 0) {
      const p = intersects[0].point
      const face = intersects[0].face
      if (face == null) return
      const pUnit = face.normal
      pUnit.multiplyScalar(50)
      this.moveLight(p, pUnit)
    }
  }

  /**
   * Event handler for releasing the mouse.
   */
  onMouseUp(evt: MouseEvent): void {
    evt.preventDefault()
    this.mouseDown = false
  }

  /**
   * Event handler for moving the mouse.
   */
  onMouseMove(evt: MouseEvent): void {
    evt.preventDefault()
    if (this.meshes == null) return
    if (!this.mouseDown || this.mouseMoveHandler == null) return
    const array = this.getMousePosition(this.canvas, evt.clientX, evt.clientY)
    this.onClickPosition.fromArray(array)
    const intersects: THREE.Intersection[] = this.getIntersects(this.onClickPosition, [this.model!])
    if (intersects.length > 0) this.mouseMoveHandler(intersects[0])
  }

  /**
   * Event handler for the radio buttons switching between active tools.
   */
  onToolChange(event: TpChangeEvent<string>): void {
    switch (event.value) {
      case "Camera":
        this.setCameraTool()
        break

      case "Lighting":
        this.setLightningTool()
        break

      case "Label painter":
        this.setLabelPainterTool()
        break

      case "Label remover":
        this.setLabelRemoverTool()
        break
    }
  }

  private setCameraTool() {
    this.currentTool = "Camera"
    this.isCameraTool = true
    this.overrideMouseControls(null)
    this.setCameraControls(true)
  }

  private setLightningTool() {
    this.currentTool = "Lighting"
    this.isCameraTool = false
    this.overrideMouseControls(null)
    this.setCameraControls(false)
  }

  private setLabelPainterTool() {
    this.currentTool = "Label painter"
    this.isCameraTool = false
    this.setCameraControls(false)
    this.overrideMouseControls(this.editVerticesForLabel.bind(this, true))
  }

  private setLabelRemoverTool() {
    this.currentTool = "Label remover"
    this.isCameraTool = false
    this.setCameraControls(false)
    this.overrideMouseControls(this.editVerticesForLabel.bind(this, false))
  }

  /**
   * Add or remove vertices from a label.
   * @param add Set to `true` to add the vertex to the label, `false` to remove it.
   * @param hit The THREE.Intersection from the click event.
   */

  private editVerticesForLabel(add: boolean, hit: THREE.Intersection): void {
    const pos = hit.point
    const radius = this.brushSize
    const geo = this.getModelGeometry()
    if (geo == null) throw "No model geometry!"

    const posAttr = geo.attributes["position"] as THREE.BufferAttribute
    const vertices = []
    for (let i = 0; i < posAttr.array.length; i += 3) {
      const x2 = Math.pow(pos.x - posAttr.array[i], 2)
      const y2 = Math.pow(pos.y - posAttr.array[i + 1], 2)
      const z2 = Math.pow(pos.z - posAttr.array[i + 2], 2)
      const dist = Math.sqrt(x2 + y2 + z2)

      if (dist < radius) {
        vertices.push(i / 3)
      }
    }

    if (add) {
      // https://dev.to/uilicious/javascript-array-push-is-945x-faster-than-array-concat-1oki
      this.labelVertices.push(...vertices)
    } else {
      this.resetColorForVertices(this.labelVertices)
      const selectedVerticesSet = new Set(vertices)
      this.labelVertices = this.labelVertices.filter(v => !selectedVerticesSet.has(v))
    }

    this.labelVertices = Array.from(new Set(this.labelVertices))

    this.labelVerticesChangeEvent.emit(this.labelVertices)

    this.drawVertices()
  }

  /**
   * Sets or removes a mouse control override. When set, instead of the mouse
   * moving the camera, selecting vertices, etc., it will call the provided
   * callback function.
   * @param override The function to call on mouse clicks.
   */
  public overrideMouseControls(override: ((_: THREE.Intersection) => void) | null): void {
    this.mouseMoveHandler = override
    this.controls.enabled = override == null
  }

  /**
   * Enable or disable the camera controls.
   */
  public setCameraControls(enabled: boolean): void {
    this.controls.enabled = enabled
  }

  /**
   * Paints a colour to a set of vertices, using the alpha for blending.
   * @param vertices The vertices to apply the colour to.
   * @param color The RGBA colour to apply.
   */
  public setColorForVertices(vertices: number[], color: THREE.Vector4): void {
    for (let i = 0; i < vertices.length; i++) {
      const vertexId = vertices[i]
      this.colorBufferAttribute?.set([color.x, color.y, color.z, color.w], vertexId * 4)
    }

    if (this.meshes != null) this.updateShader(this.meshes)
  }

  public setVertices(vertices: number[]): void {
    this.labelVertices = vertices
    this.labelVerticesChangeEvent.emit(vertices)
  }

  public drawVertices(): void {
    this.setColorForVertices(this.labelVertices, this.labelColorVector)
  }

  /**
   * Remove the painted colour for a set of vertices.
   */
  public resetColorForVertices(vertexIds: number[]): void {
    for (const vertexId of vertexIds) {
      this.colorBufferAttribute?.set([0], vertexId * 4 + 3)
    }

    if (this.meshes != null) this.updateShader(this.meshes)
  }

  /**
   * Sets the color of the edited label
   * @param colorString hex string representation of color
   */
  public setLabelColor(colorString: string | undefined): void {
    this.labelColorObject.labelColor = colorString || '#ff0000ff'
    this.labelColorVector = RendererComponent.colorStringToVector4(colorString)

    this.tweakPane.refresh()
    this.labelVerticesColorChangeEvent.emit(this.labelColorVector)
  }

  /**
   * Resets labels, label colors
   */
  public resetLabel(): void {
    this.resetColorForVertices(this.labelVertices)

    this.labelVertices = []
    this.labelVerticesChangeEvent.emit([])
  }

  /**
   * Gets the mouse position
   * @param dom The DOM element to get the mouse position within
   * @param x The screen-space mouse X position.
   * @param y The screen-space mouse Y position.
   * @returns The X and Y coordinates of the mouse within the DOM element.
   */
  private getMousePosition(dom: HTMLElement, x: number, y: number): [number, number] {
    const rect = dom.getBoundingClientRect()
    return [(x - rect.left) / rect.width, (y - rect.top) / rect.height]
  }

  /**
   * Finds intersections between a mouse click and meshes in the scene.
   * @param point The mouse click position within the canvas.
   * @param objects A list of objects to test for intersections on.
   */
  private getIntersects(point: THREE.Vector2, objects: THREE.Object3D[]): THREE.Intersection[] {
    this.mouse.set((point.x * 2) - 1, -(point.y * 2) + 1)
    this.raycaster.setFromCamera(this.mouse, this.camera)
    return this.raycaster.intersectObjects(objects, true)
  }

  /**
   * Moves the light to a specified position, looking in a specified direction.
   */
  private moveLight(position: Vector3, normal: Vector3): void {
    this.directionalLight.position.set(normal.x, normal.y, normal.z)

    this.scene.remove(this.directionalLightHelper)
    this.directionalLightHelper = new THREE.DirectionalLightHelper(this.directionalLight, 10)
    this.scene.add(this.directionalLightHelper)

    this.directionalLight.position.add(position)
    if (this.meshes != null) this.updateShader(this.meshes)
  }

  /**
   * Returns the camera position and target
   */
  public getCameraPositionAndTarget(): { pos: Vector3, tar: Vector3 } {
    return {pos: this.camera.position, tar: this.controls.target}
  }

  /**
   * Enable Object rotation controls
   */
  public enableRotationControls(): void {
    // Force camera tool
    this.isRotationEditMode = true
    this.lastToolBeforeRotation = this.currentTool
    this.setCameraTool()

    this.transformControls = new TransformControls(this.camera, this.renderer.domElement)
    this.transformControls.attach(this.model!)
    this.transformControls.setMode("rotate")

    // When the user is using the object rotation controls, disable the camera controls
    this.transformControls.addEventListener("mouseDown", () => {
      this.setCameraControls(false)
    })

    // Enable the camera controls again when the user is done with the object rotation controls
    this.transformControls.addEventListener("mouseUp", () => {
      this.setCameraControls(true)
    })

    // Swap model rotation with geometry rotation
    const eulerRotation = new Euler(this.modelRotation.x, this.modelRotation.y, this.modelRotation.z)
    this.model?.setRotationFromEuler(eulerRotation)
    this.meshes[0].geometry.applyQuaternion(new Quaternion().setFromEuler(eulerRotation).invert())

    this.scene.add(this.transformControls)
  }

  /**
   * Disable Object rotation controls
   */
  public disableRotationControls(): void {
    // Reset tool as it was before rotation edit mode
    this.isRotationEditMode = false
    this.onToolChange({last: true, target: undefined, value: this.lastToolBeforeRotation})

    this.scene.remove(this.transformControls)
    this.transformControls.dispose()

    // Swap geometry rotation with model rotation
    this.modelRotation = {x: this.model!.rotation.x, y: this.model!.rotation.y, z: this.model!.rotation.z}
    this.model?.setRotationFromEuler(new Euler(0, 0, 0))
    this.meshes[0].geometry.applyQuaternion(new Quaternion().setFromEuler(new Euler(this.modelRotation.x, this.modelRotation.y, this.modelRotation.z)))
  }

  /**
   * Returns the Object's rotation
   * Should always be called BEFORE disableRotationControls
   */
  public getModelRotation(): { x: number, y: number, z: number } {
    return {x: this.model!.rotation.x, y: this.model!.rotation.y, z: this.model!.rotation.z}
  }

  /**
   * Updates shader attributes for a list of meshes.
   * @param meshes the meshes to update the shader for.
   */
  private updateShader(meshes: THREE.Mesh[]): void {
    if (this.colorBufferAttribute != null) {
      this.colorBufferAttribute.needsUpdate = true
    }

    meshes.forEach(mesh => {
      const material = mesh.material as THREE.ShaderMaterial
      material.uniforms['worldLightPosition'] = {
        value: this.directionalLight.position
      }
      material.needsUpdate = true
    })
  }

  /**
   * Load an object into the scene and apply shader magic, removing all previous models.
   */
  public loadObject(object: Object3D | undefined): void {
    if (object === undefined) {
      this.modelLoadError = true
      this.modelLoadingStatus$.error(false)
      this.modelLoadingStatus$.complete()
      return
    }

    // Override the material of all meshes with a custom shader.
    if (this.model != null) this.scene.remove(this.model)
    this.model = object

    this.meshes = this.findMeshes(this.model)

    // Show error if model does not have meshes
    if (this.meshes == null || this.meshes.length < 1) {
      this.modelLoadError = true
      this.modelLoadErrorMessage = 'The model does not contain any meshes'
      this.modelLoadingStatus$.error(false)
      this.modelLoadingStatus$.complete()
      return
    }

    this.meshes.forEach(mesh => this.setMaterial(mesh))

    // Rotate the geometry to the saved state
    this.meshes[0]?.geometry.applyQuaternion(new Quaternion().setFromEuler(new Euler(this.modelRotation.x, this.modelRotation.y, this.modelRotation.z)))

    this.scene.add(this.model)


    // Add GUI tweakpane
    this.tweakPane?.element.remove()
    this.tweakPane?.dispose()
    this.tweakPane = new Pane({container: this.rendererGuiWrapper})
    this.tweakPane.registerPlugin(EssentialsPlugin)

    let tab = undefined

    if (this.previewMode) {
      tab = this.tweakPane.addTab({
        pages: [
          {title: "Renderer"}
        ]
      })
    } else {
      tab = this.tweakPane.addTab({
        pages: [
          {title: "Renderer"},
          {title: "Controls"},
          {title: "Labels"},
        ]
      })
    }

    // Renderer settings
    const uniforms = (this.meshes[0].material as any).uniforms

    this.tweakPaneFpsGraph = tab.pages[0].addBlade({
      view: 'fpsgraph',
      label: 'FPS',
      lineCount: 2,
    })

    tab.pages[0].addInput(uniforms.ambientIntensity, "value", {
      min: 0,
      max: 5,
      step: 0.1,
      label: "Ambient light"
    })

    if (!this.previewMode) {
      tab.pages[0].addInput(uniforms.diffuseIntensity, "value", {
        min: 0,
        max: 10,
        step: 0.1,
        label: "Directional light"
      })
    }

    tab.pages[0].addInput({planeVisible: this.planeVisible}, "planeVisible", {label: "Display plane"}).on('change', (evt) => {
      this.setPlaneVisibility(evt.value)
    })

    if (!this.previewMode) {
      // Controls
      const controlOptions = ['Camera', 'Lighting', 'Label painter', 'Label remover']

      tab.pages[1].addInput({controlOption: 'Camera'}, 'controlOption', {
        view: 'radiogrid',
        groupName: 'controlOption',
        size: [1, 4],
        cells: (x: number, y: number) => ({
          title: `${controlOptions[y]}`,
          value: controlOptions[y]
        }),
        label: 'Tool'
      }).on('change', event => {
        if (!this.isRotationEditMode) {
          this.onToolChange(event)
        }
      })

      // Label settings
      if (!this.quizMode) {
        tab.pages[2].addInput(this.labelColorObject, "labelColor", {label: "Color"}).on('change', evt => {
          this.labelColorVector = RendererComponent.colorStringToVector4(evt.value)
          this.drawVertices()
          this.labelVerticesColorChangeEvent.emit(this.labelColorVector)
        })
      }

      tab.pages[2].addInput({brushSize: this.brushSize}, "brushSize", {
        label: "Brush size",
        min: 1,
        max: 25,
        step: 1
      }).on('change', evt => {
        this.brushSize = evt.value
      })
    }

    this.planeVisible = true

    this.isModelLoaded = true
    this.onWindowResize()

    this.modelLoadingStatus$.next(true)
    this.modelLoadingStatus$.complete()
  }

  /**
   * Gets the geometry of the currently loaded model, if there is one.
   */
  public getModelGeometry(): BufferGeometry | null {
    if (this.meshes == null) return null
    return this.meshes[0]?.geometry as BufferGeometry
  }

  /**
   * Finds all meshes present in a scene.
   */
  private findMeshes(scene: Object3D): Mesh[] {
    let meshes = []
    if (scene.type == "Mesh") meshes.push(scene as Mesh)

    for (const child of scene.children) {
      meshes.push(...this.findMeshes(child))
    }

    return meshes
  }

  /**
   * Sets the custom material and shader for a mesh.
   * @param mesh The mesh to set the material for.
   */
  private setMaterial(mesh: Mesh): void {
    let texture = null
    let useTexture = false
    let useVertexColor = false
    const bufferGeometry = mesh.geometry as BufferGeometry

    // Note down existing texture or vertex color if present.
    // NOTE: (mesh.material instanceof THREE.MeshStandardMaterial) somehow returns false
    if ((mesh.material as THREE.Material).type === 'MeshStandardMaterial') {

      if ((mesh.material as THREE.MeshStandardMaterial).map != null) {
        texture = (mesh.material as THREE.MeshStandardMaterial).map
        useTexture = true
      } else if ((mesh.material as THREE.MeshStandardMaterial).vertexColors) {
        useVertexColor = true
      }
    }

    // const verticeCount = bufferGeometry.index?.count ?? 0;
    const verticeCount = bufferGeometry.attributes['position']?.count ?? 0
    const colorBufferItemSize = 4
    const colorBufferSize = verticeCount * colorBufferItemSize
    const colorBuffer = new Float32Array(colorBufferSize)
    this.colorBufferAttribute = new BufferAttribute(colorBuffer, colorBufferItemSize)
    bufferGeometry.setAttribute("labelColorIn", this.colorBufferAttribute)

    mesh.material = new THREE.ShaderMaterial({
      uniforms: {
        worldLightPosition: {
          value: new THREE.Vector3(0.0, 100.0, 0.0)
        },
        baseColor: {
          value: new THREE.Vector3(1.0, 1.0, 1.0)
        },
        ambientIntensity: {value: 3.0},
        specularIntensity: {value: 1.0},
        diffuseIntensity: {value: 1.0},
        specularReflection: {value: 0.2},
        diffuseReflection: {value: 0.2},
        ambientReflection: {value: 0.2},
        shininess: {value: 50.0},
        color: {value: this.colorBufferAttribute},
        texture1: {value: texture},
        useTexture: {value: useTexture},
        useVertexColor: {value: useVertexColor},
      },
      vertexShader: this.VertexShader,
      fragmentShader: this.FragmentShader,
      name: "custom-material",
    })
  }

  /**
   * Sets the visibility of the helper plane.
   */
  public setPlaneVisibility(visible: boolean): void {
    if (visible && !this.planeVisible) {
      this.scene.add(this.plane)
      this.planeVisible = true
    } else if (!visible && this.planeVisible) {
      this.scene.remove(this.plane)
      this.planeVisible = false
    }
  }


  /**
   * Returns a Vector4 with the color components
   * @param color string with hashtag including alpha channel (i.e. #ff0000ff)
   * @private
   */
  public static colorStringToVector4(color: string | undefined): Vector4 {
    if (color === undefined) {
      return new THREE.Vector4()
    }

    const x = parseInt(color.slice(1, 3), 16) / 255
    const y = parseInt(color.slice(3, 5), 16) / 255
    const z = parseInt(color.slice(5, 7), 16) / 255
    const w = parseInt(color.slice(7, 9), 16) / 255

    return new THREE.Vector4(x, y, z, w)
  }

  /**
   * Returns a color hex string
   * @param color Vector4
   * @private
   */
  public static vector4ToColorString(color: THREE.Vector4): string {
    const r = (color.x * 255).toString(16).padStart(2, "0")
    const g = (color.y * 255).toString(16).padStart(2, "0")
    const b = (color.z * 255).toString(16).padStart(2, "0")
    const a = (color.w * 255).toString(16).padStart(2, "0")

    return `#${r}${g}${b}${a}`
  }

}
