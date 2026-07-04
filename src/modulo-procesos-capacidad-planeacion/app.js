import {
  createProcessPlanningActions,
  buildOptionalCostIntegrationPayload,
  CAPACITY_MATRIX,
  createFunctionalExampleSeed,
} from "./index.js";
import {
  calculateBatchTraceability,
  calculateFlowCapacityByPeriod,
  calculateFlowWasteSummary,
  calculateMaterialRequirementsForBatch,
  calculateWarehouseNeeds,
  detectFlowBottleneck,
  planProductionBatch,
} from "./services.js";

const BRANDING_STORAGE_KEY = "junglelab_branding_config";
const DEFAULT_BRANDING = {
  organizationName: "Aliados",
  productDisplayName: "Modulo de Procesos",
  logoPath: "../Logo_Aliados.jpeg",
  logoAlt: "Logo institucional",
  primaryColor: "#d94a1f",
  secondaryColor: "#789b1d",
  headerLine1: "Jungle Lab S.A.S.",
  headerLine2: "Disenamos soluciones que impulsan el futuro",
};

const DEFAULT_BUSINESS_PROFILE = {
  documentCode: "",
  organization: "",
  responsible: "",
  responsibleRole: "",
  operationType: "Producto",
  period: "por lote",
  notes: "",
};

const actions = createProcessPlanningActions();

const state = {
  data: null,
  activeTab: "tab-home",
  flowId: "",
  batchId: "",
  productKey: "",
  sharedResourceName: "",
  personnelCode: "",
  productEditorDraft: null,
  productEditorStep: "base",
  productView: "overview",
  productCapacityPeriod: "week",
  view: {
    plan: null,
    capacity: null,
    bottleneck: null,
    waste: null,
    trace: [],
    requirements: null,
    warehouse: null,
  },
  planScenario: {
    period: "week",
    weekdays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    baseHours: 8,
    extraHours: 0,
    shifts: 1,
    selectedProducts: ["coffee", "cacao", "oil", "cream"],
  },
};

const PRODUCT_EDITOR_STAGE_FIELDS = [
  "seq", "name", "subflow", "input", "inputQty", "output", "outputQty", "people",
  "role", "time", "peopleHours", "site", "zone", "line", "machine", "materials",
  "controls", "records", "conflicts", "reason",
];

const PRODUCT_EDITOR_STEPS = [
  { key: "base", title: "Datos base", hint: "Nombre, familia, entrada, salida y cuello principal" },
  { key: "capacity", title: "Capacidad", hint: "Capacidad visible y dias operativos" },
  { key: "origins", title: "Origenes", hint: "Desde donde puede entrar al flujo" },
  { key: "subflows", title: "Subprocesos", hint: "Bloques grandes del producto" },
  { key: "stages", title: "Etapas", hint: "Detalle tecnico por fase" },
];

const PLAN_PERIOD_OPTIONS = {
  week: { label: "Semanal", multiplier: 1 },
  fortnight: { label: "Quincenal", multiplier: 2 },
  month: { label: "Mensual", multiplier: 4 },
};

const PLAN_WEEKDAYS = [
  { key: "monday", short: "Lun", label: "Lunes" },
  { key: "tuesday", short: "Mar", label: "Martes" },
  { key: "wednesday", short: "Mie", label: "Miercoles" },
  { key: "thursday", short: "Jue", label: "Jueves" },
  { key: "friday", short: "Vie", label: "Viernes" },
  { key: "saturday", short: "Sab", label: "Sabado" },
  { key: "sunday", short: "Dom", label: "Domingo" },
];

const PLAN_SLOT_LABELS = ["AM", "PM", "Noche", "Reserva"];

const FEASIBILITY_THRESHOLDS = {
  fit: 0.9,
  adjust: 0.72,
  partial: 0.5,
};

const REFERENCE_FACTORY_DEMO = {
  products: {
    coffee: {
      family: "coffee",
      title: "Cafe tostado molido",
      source: "Cafe con cereza",
      output: "Bolsas 250 g de cafe tostado",
      origins: [
        "Cafe con cereza para flujo completo",
        "Cafe pergamino seco para entrar desde secado y beneficio seco",
        "Cafe oro para entrar desde tostion y empaque",
      ],
      operatingDays: { day: 1, week: 7, month: 30 },
      capacityByPeriod: {
        day: "275 bolsas / dia",
        week: "1,920 bolsas / semana",
        month: "8,250 bolsas / mes",
      },
      weeklyCapacity: "1,920 bolsas / semana",
      bottleneck: "Secado",
      blockingReason: "El secado tarda varios dias y condiciona la trilla y el tueste.",
      subflows: [
        {
          name: "Beneficio humedo",
          purpose: "Transforma cafe con cereza en cafe lavado listo para secado.",
          stages: ["Recepcion y clasificacion", "Despulpado", "Fermentacion", "Lavado"],
        },
        {
          name: "Secado y beneficio seco",
          purpose: "Baja humedad, estabiliza el pergamino y prepara el lote para trilla.",
          stages: ["Secado", "Reposo de pergamino", "Trilla y clasificacion"],
        },
        {
          name: "Tostion y empaque",
          purpose: "Genera el producto comercial final listo para venta.",
          stages: ["Tueste", "Reposo post-tueste", "Molienda", "Empaque 250 g"],
        },
      ],
      stages: [
        { seq: 1, name: "Recepcion y clasificacion", subflow: "Beneficio humedo", input: "Cafe con cereza", inputQty: "2,400 kg", output: "Cafe con cereza clasificado", outputQty: "2,340 kg", people: "3 personas", role: "Recepcion y seleccion", time: "4 h", peopleHours: "12 h-persona", site: "Planta principal", zone: "Patio humedo", line: "Linea agro", machine: "Tolva, mesas, tinas", materials: "Jabas, agua de limpieza", controls: "Madurez, impurezas, peso", records: "Ingreso, proveedor, lote", conflicts: "No con cacao en fermentacion abierta", reason: "Cruce de humedad y manejo de patios" },
        { seq: 2, name: "Despulpado", subflow: "Beneficio humedo", input: "Cafe con cereza clasificado", inputQty: "2,340 kg", output: "Cafe despulpado", outputQty: "1,380 kg", people: "2 personas", role: "Operario humedo", time: "5 h", peopleHours: "10 h-persona", site: "Planta principal", zone: "Patio humedo", line: "Linea agro", machine: "Despulpadora", materials: "Agua, bandejas", controls: "Rendimiento, residuos", records: "Registro de despulpado", conflicts: "No con lavado de cacao", reason: "Uso intensivo de agua y piso humedo" },
        { seq: 3, name: "Fermentacion", subflow: "Beneficio humedo", input: "Cafe despulpado", inputQty: "1,380 kg", output: "Cafe fermentado", outputQty: "1,350 kg", people: "1 persona", role: "Jefe de proceso", time: "18 h", peopleHours: "18 h-persona", site: "Planta principal", zone: "Sala fermentacion", line: "Linea agro", machine: "Tanques y cajas", materials: "Toldos, agua de apoyo", controls: "pH, olor, temperatura", records: "Bitacora de fermentacion", conflicts: "No con cacao en baba abierto", reason: "Olor, microbiologia y control sanitario" },
        { seq: 4, name: "Lavado", subflow: "Beneficio humedo", input: "Cafe fermentado", inputQty: "1,350 kg", output: "Cafe lavado", outputQty: "1,320 kg", people: "2 personas", role: "Operario humedo", time: "3 h", peopleHours: "6 h-persona", site: "Planta principal", zone: "Patio humedo", line: "Linea agro", machine: "Canales y tinas", materials: "Agua limpia", controls: "Mucilago residual", records: "Registro de lavado", conflicts: "No con limpieza de areas secas", reason: "Agua, salpicado y humedad" },
        { seq: 5, name: "Secado", subflow: "Secado y beneficio seco", input: "Cafe lavado", inputQty: "1,320 kg", output: "Cafe pergamino seco", outputQty: "780 kg", people: "2 personas", role: "Operario termico", time: "72 h", peopleHours: "144 h-persona", site: "Planta principal", zone: "Area termica", line: "Linea secado", machine: "Secador", materials: "Combustible, bandejas", controls: "Humedad final, temperatura", records: "Registro de secado", conflicts: "Bloquea cacao si comparte secador", reason: "Calor continuo y alta ocupacion del equipo" },
        { seq: 6, name: "Reposo de pergamino", subflow: "Secado y beneficio seco", input: "Cafe pergamino seco", inputQty: "780 kg", output: "Cafe pergamino estabilizado", outputQty: "772 kg", people: "1 persona", role: "Calidad", time: "24 h", peopleHours: "24 h-persona", site: "Planta principal", zone: "Bodega intermedia", line: "Linea secado", machine: "Tolvas y pallets", materials: "Sacos y pallets", controls: "Humedad y olor", records: "Registro de reposo", conflicts: "No con cacao que requiera la misma bodega", reason: "Capacidad de almacenamiento intermedio" },
        { seq: 7, name: "Trilla y clasificacion", subflow: "Secado y beneficio seco", input: "Cafe pergamino estabilizado", inputQty: "772 kg", output: "Cafe oro", outputQty: "640 kg", people: "2 personas", role: "Operario seco", time: "6 h", peopleHours: "12 h-persona", site: "Planta principal", zone: "Area seca", line: "Linea seca", machine: "Trilladora y zarandas", materials: "Sacos, bandejas", controls: "Defectos, tamano", records: "Registro de trilla", conflicts: "No con molienda fina abierta", reason: "Polvo y material particulado" },
        { seq: 8, name: "Tueste", subflow: "Tostion y empaque", input: "Cafe oro", inputQty: "640 kg", output: "Cafe tostado", outputQty: "576 kg", people: "1 persona", role: "Tostador", time: "8 h", peopleHours: "8 h-persona", site: "Planta principal", zone: "Sala termica", line: "Linea tostion", machine: "Tostadora tambor", materials: "Gas, energia", controls: "Curva, color, crack", records: "Registro de tueste", conflicts: "No con tostado de cacao", reason: "Calor, humo y uso del mismo equipo termico" },
        { seq: 9, name: "Reposo post-tueste", subflow: "Tostion y empaque", input: "Cafe tostado", inputQty: "576 kg", output: "Cafe tostado estabilizado", outputQty: "570 kg", people: "1 persona", role: "Calidad", time: "12 h", peopleHours: "12 h-persona", site: "Planta principal", zone: "Sala termica", line: "Linea tostion", machine: "Tolvas de reposo", materials: "Valvulas, contenedores", controls: "Degasificacion, aroma", records: "Registro de reposo", conflicts: "No con cacao si usa la misma zona de espera", reason: "Espacio y olor" },
        { seq: 10, name: "Molienda", subflow: "Tostion y empaque", input: "Cafe tostado estabilizado", inputQty: "570 kg", output: "Cafe molido", outputQty: "560 kg", people: "2 personas", role: "Operario de molienda", time: "4 h", peopleHours: "8 h-persona", site: "Planta principal", zone: "Sala molienda", line: "Linea tostion", machine: "Molino", materials: "Bolsas temporales", controls: "Granulometria", records: "Registro de molienda", conflicts: "No con descascarillado o refinado de cacao abierto", reason: "Polvo y contaminacion cruzada de aroma" },
        { seq: 11, name: "Empaque 250 g", subflow: "Tostion y empaque", input: "Cafe molido", inputQty: "560 kg", output: "Bolsas 250 g", outputQty: "2240 bolsas", people: "3 personas", role: "Equipo de empaque", time: "8 h", peopleHours: "24 h-persona", site: "Planta principal", zone: "Sala empaque", line: "Linea compartida", machine: "Llenadora, selladora y loteadora", materials: "Bolsas, valvulas, etiquetas, cajas", controls: "Peso, sellado, lote", records: "Registro de empaque", conflicts: "No al mismo tiempo que empaque de chocolate", reason: "Capacidad compartida y cambio de formato" },
      ],
    },
    cacao: {
      family: "cacao",
      title: "Chocolate en tabletas",
      source: "Cacao en baba",
      output: "Tabletas de chocolate terminadas",
      origins: [
        "Cacao en baba para flujo completo",
        "Cacao seco para entrar directo a transformacion primaria",
        "Nibs para entrar desde molienda y refinado",
        "Pasta o licor de cacao para entrar desde refinado / conchado",
      ],
      operatingDays: { day: 1, week: 7, month: 30 },
      capacityByPeriod: {
        day: "690 tabletas / dia",
        week: "4,800 tabletas / semana",
        month: "20,600 tabletas / mes",
      },
      weeklyCapacity: "4,800 tabletas / semana",
      bottleneck: "Conchado",
      blockingReason: "El conchado ocupa muchas horas y atrasa moldeo y empaque.",
      subflows: [
        {
          name: "Poscosecha",
          purpose: "Lleva el cacao en baba a grano seco y estable.",
          stages: ["Recepcion", "Fermentacion", "Secado", "Clasificacion"],
        },
        {
          name: "Transformacion primaria",
          purpose: "Convierte el grano en licor y masa refinada.",
          stages: ["Tostado", "Descascarillado", "Molienda", "Refinado"],
        },
        {
          name: "Chocolate y empaque",
          purpose: "Concha, moldea, enfria y empaca el producto final.",
          stages: ["Conchado", "Moldeo", "Enfriado", "Empaque"],
        },
      ],
      stages: [
        { seq: 1, name: "Recepcion y pesado", subflow: "Poscosecha", input: "Cacao en baba", inputQty: "1,900 kg", output: "Cacao en baba clasificado", outputQty: "1,860 kg", people: "3 personas", role: "Recepcion y seleccion", time: "4 h", peopleHours: "12 h-persona", site: "Planta principal", zone: "Patio humedo", line: "Linea cacao", machine: "Mesas y balanzas", materials: "Cajas, agua de limpieza", controls: "Madurez, peso", records: "Ingreso y proveedor", conflicts: "No con cafe lavado abierto", reason: "Cruce de patios y manejo humedo" },
        { seq: 2, name: "Fermentacion controlada", subflow: "Poscosecha", input: "Cacao clasificado", inputQty: "1,860 kg", output: "Cacao fermentado", outputQty: "1,760 kg", people: "1 persona", role: "Jefe de poscosecha", time: "120 h", peopleHours: "120 h-persona", site: "Planta principal", zone: "Sala fermentacion", line: "Linea cacao", machine: "Cajones de fermentacion", materials: "Toldos, termometros", controls: "Temperatura, volteo, pH", records: "Bitacora de fermentacion", conflicts: "No con cafe en fermentacion si comparten sala", reason: "Olor, microbiologia y ocupacion del espacio" },
        { seq: 3, name: "Secado final", subflow: "Poscosecha", input: "Cacao fermentado", inputQty: "1,760 kg", output: "Cacao seco", outputQty: "980 kg", people: "2 personas", role: "Operario termico", time: "72 h", peopleHours: "144 h-persona", site: "Planta principal", zone: "Area termica", line: "Linea secado", machine: "Secador", materials: "Combustible, bandejas", controls: "Humedad y color", records: "Registro de secado", conflicts: "No con secado de cafe si comparten secador", reason: "Calor continuo y saturacion del equipo" },
        { seq: 4, name: "Clasificacion del grano", subflow: "Poscosecha", input: "Cacao seco", inputQty: "980 kg", output: "Grano clasificado", outputQty: "940 kg", people: "2 personas", role: "Operario seco", time: "5 h", peopleHours: "10 h-persona", site: "Planta principal", zone: "Area seca", line: "Linea cacao", machine: "Zarandas y mesas", materials: "Sacos y bandejas", controls: "Tamano, defectos", records: "Registro de clasificacion", conflicts: "No con molienda abierta", reason: "Polvo y manejo de secos" },
        { seq: 5, name: "Tostado de nibs", subflow: "Transformacion primaria", input: "Grano clasificado", inputQty: "940 kg", output: "Cacao tostado", outputQty: "880 kg", people: "1 persona", role: "Tostador", time: "8 h", peopleHours: "8 h-persona", site: "Planta principal", zone: "Sala termica", line: "Linea cacao", machine: "Tostadora tambor", materials: "Gas, energia", controls: "Curva, temperatura", records: "Registro de tostado", conflicts: "No con tueste de cafe", reason: "Mismo equipo, calor y humo" },
        { seq: 6, name: "Descascarillado", subflow: "Transformacion primaria", input: "Cacao tostado", inputQty: "880 kg", output: "Nibs", outputQty: "760 kg", people: "2 personas", role: "Operario seco", time: "4 h", peopleHours: "8 h-persona", site: "Planta principal", zone: "Area seca", line: "Linea cacao", machine: "Quebradora y aventadora", materials: "Tolvas, sacos", controls: "Cascara residual", records: "Registro de descascarillado", conflicts: "No con molienda de cafe abierta", reason: "Polvo fino y material particulado" },
        { seq: 7, name: "Molienda de nibs", subflow: "Transformacion primaria", input: "Nibs", inputQty: "760 kg", output: "Licor de cacao", outputQty: "720 kg", people: "2 personas", role: "Operario de molienda", time: "6 h", peopleHours: "12 h-persona", site: "Planta principal", zone: "Sala molienda", line: "Linea cacao", machine: "Molino de piedras", materials: "Tolvas, bandejas", controls: "Textura y temperatura", records: "Registro de molienda", conflicts: "No con cafe molido abierto", reason: "Olor y polvo en zona compartida" },
        { seq: 8, name: "Refinado", subflow: "Transformacion primaria", input: "Licor de cacao", inputQty: "720 kg", output: "Masa refinada", outputQty: "700 kg", people: "1 persona", role: "Tecnico de chocolate", time: "10 h", peopleHours: "10 h-persona", site: "Planta principal", zone: "Sala chocolate", line: "Linea cacao", machine: "Refinador", materials: "Azucar, leche, manteca", controls: "Micraje", records: "Registro de refinado", conflicts: "No con empaque abierto cercano", reason: "Polvo fino y control de inocuidad" },
        { seq: 9, name: "Conchado", subflow: "Chocolate y empaque", input: "Masa refinada", inputQty: "700 kg", output: "Chocolate conchado", outputQty: "690 kg", people: "1 persona", role: "Tecnico de chocolate", time: "16 h", peopleHours: "16 h-persona", site: "Planta principal", zone: "Sala chocolate", line: "Linea cacao", machine: "Conchadora", materials: "Manteca, lecitina, vainilla", controls: "Aroma y viscosidad", records: "Registro de conchado", conflicts: "No con mantenimiento de sala", reason: "Proceso largo y uso continuo del equipo" },
        { seq: 10, name: "Moldeo", subflow: "Chocolate y empaque", input: "Chocolate conchado", inputQty: "690 kg", output: "Tabletas moldeadas", outputQty: "680 kg", people: "2 personas", role: "Operario de moldeo", time: "5 h", peopleHours: "10 h-persona", site: "Planta principal", zone: "Sala chocolate", line: "Linea cacao", machine: "Dosificadora y moldes", materials: "Moldes, mesas", controls: "Peso, llenado", records: "Registro de moldeo", conflicts: "No con corrientes de calor externas", reason: "Sensibilidad termica del chocolate" },
        { seq: 11, name: "Enfriado", subflow: "Chocolate y empaque", input: "Tabletas moldeadas", inputQty: "680 kg", output: "Tabletas estables", outputQty: "672 kg", people: "1 persona", role: "Calidad", time: "6 h", peopleHours: "6 h-persona", site: "Planta principal", zone: "Tunel frio", line: "Linea cacao", machine: "Tunel de enfriado", materials: "Bandejas", controls: "Brillo y quiebre", records: "Registro de enfriado", conflicts: "No con equipos que expulsen calor", reason: "Balance termico de la sala" },
        { seq: 12, name: "Empaque de tabletas", subflow: "Chocolate y empaque", input: "Tabletas estables", inputQty: "672 kg", output: "Tabletas empacadas", outputQty: "4800 tabletas", people: "3 personas", role: "Equipo de empaque", time: "8 h", peopleHours: "24 h-persona", site: "Planta principal", zone: "Sala empaque", line: "Linea compartida", machine: "Flowpack y loteadora", materials: "BOPP, cajas, etiquetas", controls: "Sellado, lote, integridad", records: "Registro de empaque", conflicts: "No al mismo tiempo que empaque de cafe", reason: "Capacidad compartida y cambio de formato" },
      ],
    },
    oil: {
      family: "oil",
      title: "Aceite esencial",
      source: "Biomasa aromatica fresca",
      output: "Botellas 30 ml de aceite esencial",
      origins: [
        "Biomasa fresca para flujo completo",
        "Biomasa picada para entrar directo a destilacion",
        "Aceite crudo para entrar desde separacion y filtrado",
      ],
      operatingDays: { day: 1, week: 7, month: 30 },
      capacityByPeriod: {
        day: "260 botellas / dia",
        week: "1,800 botellas / semana",
        month: "7,700 botellas / mes",
      },
      weeklyCapacity: "1,800 botellas / semana",
      bottleneck: "Destilacion",
      blockingReason: "La destilacion consume muchas horas del equipo termico y condiciona el envasado.",
      subflows: [
        { name: "Preparacion", purpose: "Recibe, corta y deja lista la biomasa para extraccion.", stages: ["Recepcion", "Picado", "Carga del destilador"] },
        { name: "Extraccion", purpose: "Obtiene el aceite a partir de vapor y separacion de fases.", stages: ["Destilacion", "Separacion", "Filtrado"] },
        { name: "Acondicionamiento", purpose: "Enfria, envasa y rotula la presentacion final.", stages: ["Estabilizacion", "Envasado 30 ml", "Etiquetado"] },
      ],
      stages: [
        { seq: 1, name: "Recepcion y pesado", subflow: "Preparacion", input: "Biomasa fresca", inputQty: "900 kg", output: "Biomasa clasificada", outputQty: "870 kg", people: "2 personas", role: "Recepcion vegetal", time: "3 h", peopleHours: "6 h-persona", site: "Planta principal", zone: "Area botanica", line: "Linea extractos", machine: "Mesas y balanzas", materials: "Jabas, cuchillas", controls: "Frescura, peso", records: "Ingreso vegetal", conflicts: "No con empaque abierto", reason: "Humedad y residuos vegetales" },
        { seq: 2, name: "Picado de biomasa", subflow: "Preparacion", input: "Biomasa clasificada", inputQty: "870 kg", output: "Biomasa picada", outputQty: "860 kg", people: "2 personas", role: "Operario extractos", time: "4 h", peopleHours: "8 h-persona", site: "Planta principal", zone: "Area botanica", line: "Linea extractos", machine: "Mesa inox y cuchillas", materials: "Canastillas", controls: "Tamano de corte", records: "Registro de preparacion", conflicts: "No con crema abierta", reason: "Olor vegetal y dispersion de residuos" },
        { seq: 3, name: "Destilacion", subflow: "Extraccion", input: "Biomasa picada", inputQty: "860 kg", output: "Aceite crudo", outputQty: "54 l", people: "1 persona", role: "Destilador", time: "18 h", peopleHours: "18 h-persona", site: "Planta principal", zone: "Sala termica", line: "Linea extractos", machine: "Destilador y condensador", materials: "Agua, vapor, energia", controls: "Tiempo, temperatura", records: "Registro de destilacion", conflicts: "No con tueste de cafe o cacao", reason: "Calor, vapor y ocupacion del equipo termico" },
        { seq: 4, name: "Separacion y filtrado", subflow: "Extraccion", input: "Aceite crudo", inputQty: "54 l", output: "Aceite filtrado", outputQty: "51 l", people: "1 persona", role: "Calidad extractos", time: "3 h", peopleHours: "3 h-persona", site: "Planta principal", zone: "Sala extractos", line: "Linea extractos", machine: "Embudos, filtros", materials: "Filtros, botellas intermedias", controls: "Transparencia, humedad", records: "Registro de filtrado", conflicts: "No con chocolate abierto", reason: "Aroma intenso y manipulacion de liquidos" },
        { seq: 5, name: "Envasado 30 ml", subflow: "Acondicionamiento", input: "Aceite filtrado", inputQty: "51 l", output: "Botellas 30 ml", outputQty: "1700 botellas", people: "3 personas", role: "Equipo de empaque", time: "7 h", peopleHours: "21 h-persona", site: "Planta principal", zone: "Sala empaque", line: "Linea compartida", machine: "Llenadora y loteadora", materials: "Botellas, tapas, etiquetas, cajas", controls: "Volumen, lote, cierre", records: "Registro de envasado", conflicts: "No al mismo tiempo que cafe o chocolate en empaque", reason: "Linea compartida y cambio de formato" },
      ],
    },
    cream: {
      family: "cream",
      title: "Crema cosmetica",
      source: "Base cosmetica e insumos activos",
      output: "Frascos 100 ml de crema",
      origins: [
        "Base cosmetica e insumos para flujo completo",
        "Fases ya preparadas para entrar a fusion y homogeneizacion",
        "Crema base para entrar desde enfriado y llenado",
      ],
      operatingDays: { day: 1, week: 7, month: 30 },
      capacityByPeriod: {
        day: "345 frascos / dia",
        week: "2,400 frascos / semana",
        month: "10,200 frascos / mes",
      },
      weeklyCapacity: "2,400 frascos / semana",
      bottleneck: "Homogeneizacion",
      blockingReason: "La mezcla y homogeneizacion exige control fino y condiciona el llenado.",
      subflows: [
        { name: "Preparacion", purpose: "Pesa y organiza la fase acuosa y oleosa.", stages: ["Pesado", "Preparacion de fases"] },
        { name: "Mezcla", purpose: "Emulsiona y estabiliza la formula antes del envasado.", stages: ["Fusion", "Homogeneizacion", "Enfriado controlado"] },
        { name: "Envasado", purpose: "Llena, cierra y rotula la presentacion final.", stages: ["Llenado 100 ml", "Etiquetado", "Encajado"] },
      ],
      stages: [
        { seq: 1, name: "Pesado y preparacion", subflow: "Preparacion", input: "Base e insumos", inputQty: "420 kg", output: "Fases listas", outputQty: "415 kg", people: "2 personas", role: "Formulador", time: "4 h", peopleHours: "8 h-persona", site: "Planta principal", zone: "Sala cosmetica", line: "Linea cosmetica", machine: "Balanzas y mesas inox", materials: "Bases, activos, fragancias", controls: "Pesaje, limpieza", records: "Registro de preparacion", conflicts: "No con material polvoso abierto", reason: "Riesgo de contaminacion cosmetica" },
        { seq: 2, name: "Fusion y homogeneizacion", subflow: "Mezcla", input: "Fases listas", inputQty: "415 kg", output: "Crema base", outputQty: "404 kg", people: "1 persona", role: "Jefe de calidad", time: "10 h", peopleHours: "10 h-persona", site: "Planta principal", zone: "Sala cosmetica", line: "Linea cosmetica", machine: "Mezclador y homogeneizador", materials: "Vapor, agua fria", controls: "pH, viscosidad, temperatura", records: "Registro de lote cosmetico", conflicts: "No con aceites aromaticos abiertos", reason: "Olor y estabilidad sensorial" },
        { seq: 3, name: "Enfriado y maduracion", subflow: "Mezcla", input: "Crema base", inputQty: "404 kg", output: "Crema estabilizada", outputQty: "398 kg", people: "1 persona", role: "Calidad", time: "8 h", peopleHours: "8 h-persona", site: "Planta principal", zone: "Sala cosmetica", line: "Linea cosmetica", machine: "Tanque de espera", materials: "Contenedores sanitarios", controls: "Aspecto, temperatura", records: "Registro de enfriado", conflicts: "No con calor cercano", reason: "Estabilidad de la emulsion" },
        { seq: 4, name: "Llenado 100 ml", subflow: "Envasado", input: "Crema estabilizada", inputQty: "398 kg", output: "Frascos 100 ml", outputQty: "2400 frascos", people: "3 personas", role: "Equipo de empaque", time: "8 h", peopleHours: "24 h-persona", site: "Planta principal", zone: "Sala empaque", line: "Linea compartida", machine: "Llenadora y cerradora", materials: "Frascos, tapas, etiquetas, cajas", controls: "Peso neto, cierre, lote", records: "Registro de envasado", conflicts: "No al mismo tiempo que cafe, chocolate o aceite en empaque", reason: "Linea compartida y sanitizacion entre formatos" },
      ],
    },
  },
  sharedResources: [
    { name: "Secador", site: "Planta principal", zone: "Area termica", line: "Linea secado", usedBy: ["Cafe - Secado", "Cacao - Secado final"], rule: "No simultaneo", reason: "Calor continuo y ocupacion total del equipo", severity: "high" },
    { name: "Sala termica multiuso", site: "Planta principal", zone: "Sala termica", line: "Linea termica", usedBy: ["Cafe - Tueste", "Cacao - Tostado de nibs", "Aceite - Destilacion"], rule: "No simultaneo", reason: "Calor, humo, vapor y una sola ventana termica segura", severity: "high" },
    { name: "Sala molienda", site: "Planta principal", zone: "Sala molienda", line: "Linea compartida", usedBy: ["Cafe - Molienda", "Cacao - Descascarillado y molienda"], rule: "No simultaneo abierto", reason: "Polvo, aroma y riesgo de contaminacion cruzada", severity: "medium" },
    { name: "Sala empaque", site: "Planta principal", zone: "Sala empaque", line: "Linea compartida", usedBy: ["Cafe - Empaque 250 g", "Cacao - Empaque de tabletas", "Aceite - Envasado 30 ml", "Crema - Llenado 100 ml"], rule: "No simultaneo", reason: "Capacidad limitada, sanitizacion y cambio de formato", severity: "high" },
    { name: "Sala extractos y cosmetica", site: "Planta principal", zone: "Sala extractos", line: "Linea soporte sensible", usedBy: ["Aceite - Separacion y filtrado", "Crema - Fusion y homogeneizacion"], rule: "Secuencial", reason: "Olor, estabilidad sensorial y limpieza entre familias", severity: "medium" },
    { name: "Bodega intermedia", site: "Planta principal", zone: "Bodega intermedia", line: "Soporte", usedBy: ["Cafe - Reposo de pergamino", "Cacao - Espera preproceso", "Crema - Maduracion"], rule: "Con capacidad controlada", reason: "Espacio, rotacion de pallets y segregacion por familia", severity: "medium" },
  ],
  legacyWeeklyPlan: [
    { day: "Lunes", focus: "Arranque de materia prima", coffee: "Recepcion, despulpado y fermentacion", cacao: "Recepcion y fermentacion", oil: "Recepcion y picado", cream: "Pesado y preparacion", shared: "Patio humedo y sala cosmetica", conflict: "Medium", why: "Cruce de zonas humedas y necesidad de limpieza por familia" },
    { day: "Martes", focus: "Ventana termica 1", coffee: "Lavado y secado", cacao: "Fermentacion", oil: "Destilacion", cream: "Fusion y homogeneizacion", shared: "Sala termica multiuso", conflict: "High", why: "Cafe y aceite compiten por calor seguro y horario termico" },
    { day: "Miercoles", focus: "Secado y estabilizacion", coffee: "Secado y reposo", cacao: "Secado final", oil: "Separacion y filtrado", cream: "Enfriado y maduracion", shared: "Secador y bodega intermedia", conflict: "High", why: "Cafe y cacao requieren el mismo secador y area de espera" },
    { day: "Jueves", focus: "Transformacion primaria", coffee: "Trilla, tueste y reposo", cacao: "Clasificacion y tostado", oil: "Buffer de lote", cream: "Preparacion de linea", shared: "Sala termica y sala molienda", conflict: "High", why: "Cafe y cacao compiten por tostadora y por manejo de polvo y humo" },
    { day: "Viernes", focus: "Cierre comercial", coffee: "Molienda y empaque", cacao: "Conchado y empaque", oil: "Envasado 30 ml", cream: "Llenado 100 ml", shared: "Sala empaque compartida", conflict: "High", why: "Cuatro familias quieren cerrar en la misma linea y no se pueden mezclar" },
  ],
  personnel: [
    { code: "OP-01", name: "Operador 1", roleGroup: "ops", workMode: "full", targetHoursPerDay: 8, maxExtraHours: 2, weeklyAvailability: "7 dias | turnos rotativos", zone: "Patio humedo / area seca" },
    { code: "OP-02", name: "Operador 2", roleGroup: "ops", workMode: "split", targetHoursPerDay: 8, maxExtraHours: 2, weeklyAvailability: "7 dias | jornada fraccionada", zone: "Area seca / molienda" },
    { code: "SUP-01", name: "Supervisor 1", roleGroup: "supervision", workMode: "full", targetHoursPerDay: 8, maxExtraHours: 2, weeklyAvailability: "7 dias | cobertura general", zone: "Toda la planta" },
    { code: "CAL-01", name: "Calidad 1", roleGroup: "quality", workMode: "split", targetHoursPerDay: 8, maxExtraHours: 2, weeklyAvailability: "7 dias | control por ventanas", zone: "Fermentacion / empaque" },
    { code: "TOS-01", name: "Tostador 1", roleGroup: "roasting", workMode: "full", targetHoursPerDay: 8, maxExtraHours: 2, weeklyAvailability: "7 dias | sala termica", zone: "Sala termica" },
    { code: "CHO-01", name: "Tecnico Chocolate 1", roleGroup: "chocolate", workMode: "full", targetHoursPerDay: 8, maxExtraHours: 2, weeklyAvailability: "7 dias | sala chocolate", zone: "Sala chocolate" },
    { code: "EXT-01", name: "Destilador 1", roleGroup: "extraction", workMode: "full", targetHoursPerDay: 8, maxExtraHours: 2, weeklyAvailability: "7 dias | sala extractos", zone: "Sala termica / extractos" },
    { code: "FOR-01", name: "Formulador 1", roleGroup: "formulation", workMode: "split", targetHoursPerDay: 8, maxExtraHours: 2, weeklyAvailability: "7 dias | sala cosmetica", zone: "Sala cosmetica" },
    { code: "EMP-01", name: "Empaque 1", roleGroup: "packing", workMode: "full", targetHoursPerDay: 8, maxExtraHours: 2, weeklyAvailability: "7 dias | linea compartida", zone: "Sala empaque" },
    { code: "EMP-02", name: "Empaque 2", roleGroup: "packing", workMode: "full", targetHoursPerDay: 8, maxExtraHours: 2, weeklyAvailability: "7 dias | linea compartida", zone: "Sala empaque" },
    { code: "EMP-03", name: "Empaque 3", roleGroup: "packing", workMode: "split", targetHoursPerDay: 8, maxExtraHours: 2, weeklyAvailability: "7 dias | linea compartida", zone: "Sala empaque" },
  ],
  personnelLoad: [
    { personCode: "OP-01", monday: 8, tuesday: 6, wednesday: 8, thursday: 7, friday: 4, saturday: 6, sunday: 0 },
    { personCode: "OP-02", monday: 7, tuesday: 8, wednesday: 9, thursday: 8, friday: 5, saturday: 5, sunday: 0 },
    { personCode: "SUP-01", monday: 6, tuesday: 7, wednesday: 8, thursday: 8, friday: 8, saturday: 4, sunday: 0 },
    { personCode: "CAL-01", monday: 4, tuesday: 6, wednesday: 8, thursday: 7, friday: 9, saturday: 3, sunday: 0 },
    { personCode: "TOS-01", monday: 0, tuesday: 0, wednesday: 0, thursday: 10, friday: 2, saturday: 5, sunday: 0 },
    { personCode: "CHO-01", monday: 0, tuesday: 0, wednesday: 0, thursday: 8, friday: 10, saturday: 6, sunday: 0 },
    { personCode: "EXT-01", monday: 3, tuesday: 10, wednesday: 4, thursday: 0, friday: 7, saturday: 4, sunday: 0 },
    { personCode: "FOR-01", monday: 8, tuesday: 8, wednesday: 6, thursday: 4, friday: 8, saturday: 4, sunday: 0 },
    { personCode: "EMP-01", monday: 0, tuesday: 0, wednesday: 0, thursday: 2, friday: 10, saturday: 6, sunday: 4 },
    { personCode: "EMP-02", monday: 0, tuesday: 0, wednesday: 0, thursday: 2, friday: 9, saturday: 6, sunday: 4 },
    { personCode: "EMP-03", monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 8, saturday: 5, sunday: 4 },
  ],
};

const PRODUCT_ORDER = ["coffee", "cacao", "oil", "cream"];

const HUMAN_WORK_MODES = {
  full: { label: "Jornada completa", targetHours: 8, maxExtraHours: 2 },
  split: { label: "Jornada fraccionada", targetHours: 8, maxExtraHours: 2 },
};

function el(id) {
  return document.getElementById(id);
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function fmt(value, decimals = 2) {
  return num(value).toFixed(decimals);
}

function parseDemoQuantity(value) {
  const text = String(value ?? "").trim();
  const match = text.match(/^([\d.,]+)\s*(.*)$/);
  if (!match) return { raw: text, amount: null, unit: "" };
  const amount = Number(match[1].replace(/,/g, ""));
  return {
    raw: text,
    amount: Number.isFinite(amount) ? amount : null,
    unit: String(match[2] || "").trim(),
  };
}

function formatParsedQuantity(parsed, decimals = 0) {
  if (!parsed || parsed.amount === null) return "N/D";
  return `${fmt(parsed.amount, decimals)} ${parsed.unit}`.trim();
}

function getStageWaste(stage) {
  const input = parseDemoQuantity(stage.inputQty);
  const output = parseDemoQuantity(stage.outputQty);
  if (input.amount === null || output.amount === null) {
    return { comparable: false, label: "Sin dato" };
  }
  if (normalizeText(input.unit) !== normalizeText(output.unit)) {
    return { comparable: false, label: "Cambio de unidad" };
  }
  const waste = Math.max(0, input.amount - output.amount);
  return {
    comparable: true,
    amount: waste,
    unit: input.unit,
    label: `${fmt(waste, waste % 1 === 0 ? 0 : 2)} ${input.unit}`.trim(),
  };
}

function getTraceWasteSummary(stages = []) {
  const totals = new Map();
  let changedUnitStages = 0;
  stages.forEach((stage) => {
    const waste = getStageWaste(stage);
    if (!waste.comparable) {
      changedUnitStages += 1;
      return;
    }
    totals.set(waste.unit, (totals.get(waste.unit) || 0) + waste.amount);
  });
  return {
    totals,
    changedUnitStages,
      label: totals.size
        ? [...totals.entries()].map(([unit, amount]) => `${fmt(amount, amount % 1 === 0 ? 0 : 2)} ${unit}`.trim()).join(" | ")
        : "No comparable",
    };
}

function getWastePctLabel(stages = []) {
  if (!stages.length) return "";
  const firstInput = parseDemoQuantity(stages[0]?.inputQty || "");
  const summary = getTraceWasteSummary(stages);
  if (firstInput.amount === null || !firstInput.unit) return "";
  const comparableWaste = summary.totals.get(firstInput.unit);
  if (!Number.isFinite(comparableWaste) || firstInput.amount <= 0) return "";
  return `${fmt((comparableWaste / firstInput.amount) * 100, 1)}%`;
}

function getStageWastePct(stage) {
  const input = parseDemoQuantity(stage?.inputQty || "");
  const waste = getStageWaste(stage);
  if (!waste.comparable || input.amount === null || input.amount <= 0) return "";
  return `${fmt((waste.amount / input.amount) * 100, 1)}%`;
}

function getLargestComparableWasteStage(stages = []) {
  const candidates = stages
    .map((stage) => ({ stage, waste: getStageWaste(stage) }))
    .filter(({ waste }) => waste.comparable && Number.isFinite(waste.amount));
  if (!candidates.length) return null;
  return candidates.sort((a, b) => b.waste.amount - a.waste.amount)[0];
}

function splitAuditItems(text) {
  const raw = String(text || "").trim();
  if (!raw) return [];
  return raw
    .split(/\s*[;,|]\s*/)
    .flatMap((chunk) => chunk.split(/\s+y\s+/i))
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderAuditList(text) {
  const items = splitAuditItems(text);
  if (!items.length) return "<span>N/D</span>";
  return `<ol class="trace-audit-list">${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ol>`;
}

function capacityPeriodLabel(period = "week") {
  if (period === "day") return "diaria";
  if (period === "month") return "mensual";
  return "semanal";
}

function formatCapacityOutput(amount, unit = "") {
  if (!Number.isFinite(amount)) return "N/D";
  return `${fmt(amount, amount % 1 === 0 ? 0 : 1)} ${unit}`.trim();
}

function pct(value) {
  return `${fmt(value)}%`;
}

function nullable(value, suffix = "", decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "N/D";
  return `${fmt(value, decimals)}${suffix}`;
}

function joinMap(values = {}) {
  const entries = Object.entries(values || {});
  return entries.length
    ? entries.map(([unitCode, quantity]) => `${fmt(quantity)} ${unitCode}`).join(" | ")
    : "N/D";
}

function unique(values = []) {
  return [...new Set((values || []).filter(Boolean))];
}

function showStatus(message, tone = "info") {
  const node = el("statusLine");
  node.textContent = message;
  node.style.borderColor = tone === "error" ? "#f1c3bc" : tone === "warn" ? "#ecd9ab" : "#dbe7cc";
  node.style.background = tone === "error" ? "#fff2ef" : tone === "warn" ? "#fff9eb" : "#f8fbf1";
  node.style.color = tone === "error" ? "#8a2b18" : tone === "warn" ? "#75501a" : "#334134";
}

function getBusinessProfile() {
  return {
    ...DEFAULT_BUSINESS_PROFILE,
    ...(state.data?.metadata?.businessProfile || {}),
  };
}

function collectBusinessProfileFromForm() {
  return {
    documentCode: el("bizDocumentCode")?.value?.trim() || "",
    organization: el("bizOrganization")?.value?.trim() || "",
    responsible: el("bizResponsible")?.value?.trim() || "",
    responsibleRole: el("bizResponsibleRole")?.value?.trim() || "",
    operationType: el("bizOperationType")?.value || DEFAULT_BUSINESS_PROFILE.operationType,
    period: el("bizPeriod")?.value || DEFAULT_BUSINESS_PROFILE.period,
    notes: el("bizNotes")?.value?.trim() || "",
  };
}

async function saveBusinessProfile() {
  if (!state.data?.metadata) return;
  state.data.metadata.businessProfile = collectBusinessProfileFromForm();
  state.data = await actions.service.save(state.data);
  await syncDesktopStore();
}

function renderBusinessProfile() {
  const profile = getBusinessProfile();
  if (el("bizDocumentCode")) el("bizDocumentCode").value = profile.documentCode;
  if (el("bizOrganization")) el("bizOrganization").value = profile.organization;
  if (el("bizResponsible")) el("bizResponsible").value = profile.responsible;
  if (el("bizResponsibleRole")) el("bizResponsibleRole").value = profile.responsibleRole;
  if (el("bizOperationType")) el("bizOperationType").value = profile.operationType;
  if (el("bizPeriod")) el("bizPeriod").value = profile.period;
  if (el("bizNotes")) el("bizNotes").value = profile.notes;

  const missing = [];
  if (!profile.documentCode) missing.push("codigo o documento");
  if (!profile.organization) missing.push("organizacion");
  if (!profile.responsible) missing.push("responsable");
  if (!profile.responsibleRole) missing.push("cargo del responsable");

  const valueNode = el("bizAuditValue");
  const hintNode = el("bizAuditHint");
  valueNode.classList.toggle("is-ok", missing.length === 0);
  valueNode.textContent = missing.length === 0 ? "Listo" : "Revisar";
  hintNode.textContent = missing.length === 0
    ? "La ficha base del bionegocio esta completa y lista para alimentar costos, PDF y validacion operativa."
    : `Faltan datos clave: ${missing.join(", ")}.`;
}

function loadBranding() {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_BRANDING };
    return { ...DEFAULT_BRANDING, ...(JSON.parse(raw) || {}) };
  } catch {
    return { ...DEFAULT_BRANDING };
  }
}

function applyBranding() {
  const branding = loadBranding();
  document.documentElement.style.setProperty("--brand", branding.primaryColor || DEFAULT_BRANDING.primaryColor);
  document.documentElement.style.setProperty("--green", branding.secondaryColor || DEFAULT_BRANDING.secondaryColor);
  document.title = branding.productDisplayName || DEFAULT_BRANDING.productDisplayName;
  el("brandLogo").src = branding.logoPath || DEFAULT_BRANDING.logoPath;
  el("brandLogo").alt = branding.logoAlt || DEFAULT_BRANDING.logoAlt;
  el("brandKicker").textContent = branding.headerLine1 || DEFAULT_BRANDING.headerLine1;
  el("brandTitle").textContent = branding.productDisplayName || DEFAULT_BRANDING.productDisplayName;
  el("brandTagline").textContent = branding.headerLine2 || DEFAULT_BRANDING.headerLine2;
  const brandMeta = document.querySelector(".brand-meta");
  if (brandMeta) {
    brandMeta.textContent = "Procesos | Capacidad | Trazabilidad | Planeacion";
  }
}

function canUseDesktopBridge() {
  return Boolean(globalThis.window?.__TAURI__?.core?.invoke || globalThis.__TAURI__?.core?.invoke);
}

async function loadProcessModuleStylesText() {
  try {
    const response = await fetch(new URL("./styles.css", import.meta.url));
    return response.ok ? await response.text() : "";
  } catch {
    return "";
  }
}

function buildProcessPdfSuggestedName() {
  const product = getReferenceProductsMap()[state.productKey] || null;
  const baseName = product?.title || "reporte_procesos";
  return String(baseName)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    || "reporte_procesos";
}

async function buildPrintableProcessDocument() {
  renderCommercialReportReference();
  const reportPanel = el("tab-report")?.cloneNode(true);
  const styles = await loadProcessModuleStylesText();
  const title = `${esc(BRANDING.productDisplayName || "Modulo de Procesos")} - Reporte PDF`;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body class="report-print-mode pdf-export-mode">
  <main class="page">
    ${reportPanel ? reportPanel.outerHTML : ""}
  </main>
</body>
</html>`;
}

function openBrowserPrintAsPdf() {
  const previousTab = state.activeTab;
  activateTab("tab-report");
  globalThis.document?.body?.classList?.add("report-print-mode");
  const clearMode = () => {
    globalThis.document?.body?.classList?.remove("report-print-mode");
    activateTab(previousTab);
    globalThis.removeEventListener?.("afterprint", clearMode);
  };
  globalThis.addEventListener?.("afterprint", clearMode, { once: true });
  globalThis.window?.print?.();
  globalThis.setTimeout?.(() => {
    if (globalThis.document?.body?.classList?.contains("report-print-mode")) {
      clearMode();
    }
  }, 1500);
}

function pickJsonFileFromBrowser() {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.style.display = "none";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        reject(new Error("No se selecciono ningun archivo."));
        return;
      }
      try {
        resolve(await file.text());
      } catch (error) {
        reject(error);
      }
    }, { once: true });
    document.body.appendChild(input);
    input.click();
  });
}

function downloadJsonFromBrowser(contents, suggestedName) {
  const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${suggestedName || "procesos_capacidad_planeacion"}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 250);
}

async function syncDesktopStore() {
  try {
    await actions.saveDesktopStore(JSON.stringify(state.data, null, 2));
  } catch {
    // Browser fallback.
  }
}

function deepCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureMetadata() {
  if (!state.data) state.data = {};
  if (!state.data.metadata) state.data.metadata = {};
  return state.data.metadata;
}

function getReferenceFactoryData() {
  const metadata = ensureMetadata();
  if (!metadata.referenceFactoryData) {
    metadata.referenceFactoryData = deepCopy(REFERENCE_FACTORY_DEMO);
  }
  return metadata.referenceFactoryData;
}

function getReferenceProductsMap() {
  return getReferenceFactoryData().products || {};
}

function getReferenceProductEntries() {
  return Object.entries(getReferenceProductsMap()).sort((a, b) =>
    String(a[1]?.title || a[0]).localeCompare(String(b[1]?.title || b[0]), "es", { sensitivity: "base" })
  );
}

function getReferenceSharedResources() {
  return getReferenceFactoryData().sharedResources || [];
}

function getReferencePersonnel() {
  return getReferenceFactoryData().personnel || [];
}

function getReferencePersonnelLoad() {
  return getReferenceFactoryData().personnelLoad || [];
}

async function saveReferenceFactoryData() {
  ensureMetadata().referenceFactoryData = getReferenceFactoryData();
  ensureMetadata().planScenario = state.planScenario;
  state.data = await actions.service.save(state.data);
  await syncDesktopStore();
}

function ensureEditorSelections() {
  const productEntries = getReferenceProductEntries();
  const previousProductKey = state.productKey;
  if (state.productKey && !getReferenceProductsMap()[state.productKey]) {
    state.productKey = "";
  }
  if (!state.sharedResourceName && getReferenceSharedResources().length) {
    state.sharedResourceName = getReferenceSharedResources()[0].name;
  }
  if (state.sharedResourceName && !getReferenceSharedResources().some((item) => item.name === state.sharedResourceName)) {
    state.sharedResourceName = getReferenceSharedResources()[0]?.name || "";
  }
  if (!state.personnelCode && getReferencePersonnel().length) {
    state.personnelCode = getReferencePersonnel()[0].code;
  }
  if (state.personnelCode && !getReferencePersonnel().some((item) => item.code === state.personnelCode)) {
    state.personnelCode = getReferencePersonnel()[0]?.code || "";
  }
  if (state.productKey !== previousProductKey) {
    state.productEditorDraft = null;
  }
}

async function loadModuleData() {
  try {
    const desktopRaw = await actions.loadDesktopStore();
    if (desktopRaw) {
      state.data = await actions.service.save(JSON.parse(desktopRaw));
      if ((state.data?.entities?.flowVersions || []).length > 1) return;
    }
  } catch {
    // Browser fallback.
  }
  state.data = await actions.service.load();
  if ((state.data?.entities?.flowVersions || []).length <= 1) {
    state.data = await actions.service.save(createFunctionalExampleSeed());
    await syncDesktopStore();
  }
  const metadata = ensureMetadata();
  if (!metadata.referenceFactoryData) {
    metadata.referenceFactoryData = deepCopy(REFERENCE_FACTORY_DEMO);
  }
  state.planScenario = {
    ...state.planScenario,
    ...(metadata.planScenario || {}),
  };
  ensureEditorSelections();
}

function getEntities() {
  return state.data?.entities || {};
}

function getCollection(name) {
  return getEntities()[name] || [];
}

function getById(items, id) {
  return items.find((item) => item.id === id) || null;
}

function getFlows() { return getCollection("flowVersions"); }
function getStages() { return getCollection("processStages"); }
function getBatches() { return getCollection("batches"); }
function getProducts() { return getCollection("products"); }
function getCalendars() { return getCollection("calendarEntries"); }
function getResources() { return getCollection("resources"); }
function getEquipments() { return getCollection("equipments"); }
function getMaterials() { return getCollection("materials"); }
function getFormulas() { return getCollection("masterFormulas"); }

function productName(productId) {
  return getById(getProducts(), productId)?.name || "-";
}

function stageName(stageId) {
  return getById(getStages(), stageId)?.name || stageId || "-";
}

function stagesForFlow(flowId) {
  return getStages()
    .filter((stage) => stage.flowVersionId === flowId)
    .sort((a, b) => num(a.sequence) - num(b.sequence));
}

function batchesForFlow(flowId) {
  return getBatches().filter((batch) => batch.flowVersionId === flowId);
}

function scoreFlow(flow) {
  const text = normalizeText([
    flow.code,
    flow.name,
    flow.versionLabel,
    productName(flow.productId),
    flow.sourceReferenceLabel,
  ].join(" "));
  let score = 0;
  if (text.includes("cafe")) score += 10;
  if (text.includes("tost")) score += 4;
  if (text.includes("pergamino")) score += 3;
  return score;
}

function ensureSelection() {
  const flows = getFlows();
  if (!flows.length) {
    state.flowId = "";
    state.batchId = "";
    return;
  }
  if (!flows.some((flow) => flow.id === state.flowId)) {
    const preferred = [...flows].sort((a, b) => scoreFlow(b) - scoreFlow(a))[0];
    state.flowId = preferred?.id || flows[0].id;
  }
  const batches = batchesForFlow(state.flowId);
  if (!batches.some((batch) => batch.id === state.batchId)) {
    state.batchId = batches[0]?.id || "";
  }
}

function fillSelect(node, options, selectedValue = "", placeholder = "Selecciona") {
  node.innerHTML = `<option value="">${esc(placeholder)}</option>` + options
    .map((option) => `<option value="${esc(option.value)}" ${option.value === selectedValue ? "selected" : ""}>${esc(option.label)}</option>`)
    .join("");
}

function renderSelectors() {
  ensureSelection();
  fillSelect(
    el("flowSelector"),
    getFlows().map((flow) => ({
      value: flow.id,
      label: `${flow.name} | ${flow.versionLabel} | ${productName(flow.productId)}`,
    })),
    state.flowId,
    "Selecciona un proceso",
  );
  fillSelect(
    el("batchSelector"),
    batchesForFlow(state.flowId).map((batch) => ({
      value: batch.id,
      label: `${batch.batchCode} | ${productName(batch.productId)} | ${fmt(batch.plannedQuantity)} ${batch.plannedUnitCode}`,
    })),
    state.batchId,
    "Selecciona un lote",
  );
}

function activateTab(tabId) {
  state.activeTab = tabId;
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.tab === tabId);
  });
  document.querySelectorAll(".panel").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === tabId);
  });
}

async function computeView() {
  ensureSelection();
  state.view = {
    plan: null,
    capacity: null,
    bottleneck: null,
    waste: null,
    trace: [],
    requirements: null,
    warehouse: null,
  };

  if (!state.flowId) return;

  state.view.capacity = calculateFlowCapacityByPeriod(state.data, { flowVersionId: state.flowId, period: "day" });
  state.view.bottleneck = detectFlowBottleneck(state.data, { flowVersionId: state.flowId, period: "day" });

  if (!state.batchId) return;

  state.view.plan = planProductionBatch(state.data, { batchId: state.batchId });
  state.view.waste = calculateFlowWasteSummary(state.data, state.batchId);
  state.view.trace = calculateBatchTraceability(state.data, state.batchId);
  state.view.requirements = calculateMaterialRequirementsForBatch(state.data, { batchId: state.batchId });
  state.view.warehouse = calculateWarehouseNeeds(state.data, {
    batchId: state.batchId,
    areaPerUnit: 0.02,
    volumePerUnit: 0.015,
    positionsPerUnit: 0.004,
  });
}

function currentFlow() {
  return getById(getFlows(), state.flowId);
}

function currentBatch() {
  return getById(getBatches(), state.batchId);
}

function finalStageOutput() {
  const trace = state.view.trace || [];
  return trace.length ? trace[trace.length - 1] : null;
}

function formulaForFlow(flowId) {
  const flow = getById(getFlows(), flowId);
  if (!flow?.formulaId) return null;
  return getById(getFormulas(), flow.formulaId);
}

function stageForId(stageId) {
  return getById(getStages(), stageId);
}

function resourceNames(ids = []) {
  return ids
    .map((id) => getById(getResources(), id)?.name)
    .filter(Boolean);
}

function equipmentNames(ids = []) {
  return ids
    .map((id) => getById(getEquipments(), id)?.name)
    .filter(Boolean);
}

function durationHoursForStage(stage) {
  if (!stage) return 0;
  if (num(stage.durationHours) > 0) return num(stage.durationHours);
  if (num(stage.durationDays) > 0) return num(stage.durationDays) * 24;
  return 0;
}

function operatorHoursForStage(stage) {
  return roundHours(durationHoursForStage(stage) * Math.max(num(stage?.operatorCount), 0));
}

function roundHours(value) {
  return Number(num(value).toFixed(1));
}

function executionSummaryForStage(stageId) {
  return (state.view.waste?.stageSummaries || []).find((item) => item.stageId === stageId) || null;
}

function traceForStage(stageId) {
  return (state.view.trace || []).find((item) => item.stageId === stageId) || null;
}

function requirementsForStage(stageId) {
  return (state.view.requirements?.items || []).filter((item) => item.stageId === stageId);
}

function summarizeRequirements(stageId) {
  const items = requirementsForStage(stageId);
  if (!items.length) return "Sin material cargado";
  return items
    .map((item) => `${item.materialName} (${nullable(item.grossQuantity)} ${item.unitCode})`)
    .join(" | ");
}

function stageRoles(stage) {
  return (stage?.responsibleRoleNames || []).join(", ") || "Rol no definido";
}

function stageResourcesSummary(stage) {
  const names = unique([
    ...resourceNames(stage?.defaultResourceIds || []),
    ...equipmentNames(stage?.defaultEquipmentIds || []),
    ...(stage?.machineMaterialRefs || []),
  ]);
  return names.join(", ") || "Sin soporte definido";
}

function stageConversionLabel(stage, summary) {
  if (summary?.inputUnitCode && summary?.outputUnitCode) {
    return `${summary.inputUnitCode} -> ${summary.outputUnitCode}`;
  }
  return `${stage?.inputUnitCode || "?"} -> ${stage?.outputUnitCode || "?"}`;
}

function totalProcessHours(stages = []) {
  return stages.reduce((sum, stage) => sum + durationHoursForStage(stage), 0);
}

function totalOperatorHours(stages = []) {
  return stages.reduce((sum, stage) => sum + operatorHoursForStage(stage), 0);
}

function finalOutputLabel() {
  const finalSummary = state.view.waste?.stageSummaries?.slice(-1)[0];
  if (finalSummary?.outputQuantity) {
    return `${nullable(finalSummary.outputQuantity)} ${finalSummary.outputUnitCode || ""}`.trim();
  }
  const batch = currentBatch();
  return batch ? `${nullable(batch.plannedQuantity)} ${batch.plannedUnitCode}` : "N/D";
}

function batchSourceLabel(batch) {
  return batch?.upstreamSourceCode || batch?.upstreamSupplierName || "Origen no definido";
}

function stagePeopleLabel(stage) {
  const count = num(stage?.operatorCount);
  return count > 0 ? `${count} persona(s)` : "Personal no definido";
}

const FAMILY_OPTIONS = [
  { key: "coffee", label: "Cafe" },
  { key: "cacao", label: "Cacao" },
  { key: "oil", label: "Aceite esencial" },
  { key: "cream", label: "Crema cosmetica" },
  { key: "generic", label: "General / Otro" },
];

const FAMILY_ALIASES = {
  cafe: "coffee",
  coffee: "coffee",
  cacao: "cacao",
  chocolate: "cacao",
  aceite: "oil",
  oil: "oil",
  esencial: "oil",
  cream: "cream",
  crema: "cream",
  cosmetica: "cream",
  cosmetic: "cream",
  generic: "generic",
  general: "generic",
  otro: "generic",
};

function normalizeFamilyKey(value = "") {
  const normalized = normalizeText(value);
  if (!normalized) return "generic";
  if (FAMILY_ALIASES[normalized]) return FAMILY_ALIASES[normalized];
  const matchedAlias = Object.entries(FAMILY_ALIASES).find(([alias]) => normalized.includes(alias));
  return matchedAlias?.[1] || "generic";
}

function familyDisplayName(value = "") {
  const key = normalizeFamilyKey(value);
  return FAMILY_OPTIONS.find((item) => item.key === key)?.label || "General / Otro";
}

function familyTone(text = "") {
  const raw = normalizeText(text);
  const normalized = normalizeFamilyKey(text);
  if (normalized === "coffee") return "coffee";
  if (normalized === "cacao") return "cacao";
  if (normalized === "oil") return "oil";
  if (normalized === "cream") return "cream";
  if (raw.includes("deshidrat")) return "dry";
  return "generic";
}

function familyLabel(flowOrProduct) {
  const text = typeof flowOrProduct === "string"
    ? flowOrProduct
    : [flowOrProduct?.family, flowOrProduct?.name, flowOrProduct?.code].filter(Boolean).join(" ");
  return familyTone(text);
}

function stageLoadRatio(item) {
  const declared = num(item?.declaredMaxCapacity);
  if (declared > 0 && item?.capacityUnitCode === item?.declaredMaxCapacityUnitCode) {
    return Math.min(1, num(item.estimatedCapacity) / declared);
  }
  const duration = num(item?.stageDurationHours);
  return Math.min(1, duration / 8);
}

function stageSignalFromRatio(item, bottleneckStageId = "") {
  if (item?.stageId === bottleneckStageId) return { tone: "red", label: "Critica", ratio: Math.max(0.85, stageLoadRatio(item)) };
  const ratio = stageLoadRatio(item);
  if (ratio >= 0.75) return { tone: "yellow", label: "Exigida", ratio };
  return { tone: "green", label: "Con margen", ratio };
}

function loadedPortfolio() {
  return getFlows().map((flow) => {
    const stages = stagesForFlow(flow.id);
    const batches = batchesForFlow(flow.id);
    return {
      flow,
      family: familyLabel(flow),
      product: productName(flow.productId),
      stages,
      batches,
      totalHours: totalProcessHours(stages),
      totalPeopleHours: totalOperatorHours(stages),
      people: stages.reduce((sum, stage) => sum + num(stage.operatorCount), 0),
    };
  });
}

function currentStageChartData() {
  return (state.view.capacity?.byStage || []).map((item) => ({
    ...item,
    signal: stageSignalFromRatio(item, state.view.bottleneck?.bottleneckStageId),
  }));
}

function masterPlanRows() {
  const flowsById = new Map(getFlows().map((flow) => [flow.id, flow]));
  return getBatches()
    .map((batch) => {
      const flow = flowsById.get(batch.flowVersionId);
      const stages = stagesForFlow(batch.flowVersionId);
      const sharedPack = stages.some((stage) => (stage.responsibleRoleNames || []).some((role) => normalizeText(role).includes("empaque compartido")));
      const label = `${batch.batchCode} | ${productName(batch.productId)}`;
      return {
        batch,
        flow,
        family: familyLabel(flow?.name || productName(batch.productId)),
        label,
        start: batch.plannedStartDate || batch.actualStartDate || "",
        end: batch.plannedEndDate || batch.actualEndDate || batch.plannedStartDate || "",
        totalHours: totalProcessHours(stages),
        peopleHours: totalOperatorHours(stages),
        sharedPack,
        stages,
      };
    })
    .sort((a, b) => String(a.start).localeCompare(String(b.start)));
}

function masterConflicts(rows = []) {
  const byDate = {};
  rows.forEach((row) => {
    const date = row.end || row.start || "sin-fecha";
    byDate[date] = byDate[date] || [];
    byDate[date].push(row);
  });
  return Object.entries(byDate)
    .map(([date, items]) => {
      const shared = items.filter((item) => item.sharedPack);
      return {
        date,
        items,
        shared,
        conflict: shared.length > 1,
      };
    })
    .filter((item) => item.items.length);
}

function processNarrative(flow, batch) {
  const stages = stagesForFlow(flow.id);
  const firstStage = stages[0];
  return {
    from: batchSourceLabel(batch) || firstStage?.name || "Origen sin definir",
    to: finalOutputLabel() || productName(flow.productId),
    stageCount: stages.length,
  };
}

function renderKpis(nodeId, items) {
  el(nodeId).innerHTML = items.map((item) => `
    <div class="kpi">
      <div class="kpi-label">${esc(item.label)}</div>
      <div class="kpi-value">${esc(item.value)}</div>
      <div class="kpi-note">${esc(item.note)}</div>
    </div>
  `).join("");
}

function renderMap() {
  const flow = currentFlow();
  const batch = currentBatch();
  if (!flow) {
    el("mapKpis").innerHTML = `<div class="empty">No hay proceso cargado todavia.</div>`;
    el("processMap").innerHTML = `<div class="empty">Carga un archivo para empezar.</div>`;
    el("processStory").innerHTML = "";
    el("sipocCard").innerHTML = "";
    el("alertList").innerHTML = "";
    return;
  }

  const narrative = processNarrative(flow, batch);
  const stages = stagesForFlow(flow.id);
  const waste = state.view.waste;
  const capacity = state.view.capacity;
  const plan = state.view.plan;
  const bottleneck = state.view.bottleneck;
  const finalSummary = state.view.waste?.stageSummaries?.slice(-1)[0];
  const totalHours = totalProcessHours(stages);
  const totalPeopleHours = totalOperatorHours(stages);

  renderKpis("mapKpis", [
    {
      label: "Entrada",
      value: batch ? `${fmt(batch.plannedQuantity)} ${batch.plannedUnitCode}` : "N/D",
      note: batchSourceLabel(batch) || "Cafe pergamino del lote seleccionado",
    },
    {
      label: "Salida esperada",
      value: finalOutputLabel(),
      note: finalStageOutput()?.outputLotCode || "Resultado esperado del recorrido",
    },
    {
      label: "Tiempo total",
      value: `${fmt(totalHours, 1)} h`,
      note: `${fmt(totalPeopleHours, 1)} horas-persona del flujo`,
    },
    {
      label: "Cuello de botella",
      value: bottleneck?.bottleneckStageName || "N/D",
      note: "Etapa que hoy limita la velocidad",
    },
  ]);

  el("heroTitle").textContent = `De ${narrative.from} a ${productName(flow.productId)}`;
  el("heroText").textContent = `Este proceso tiene ${narrative.stageCount} etapas. La lectura va desde el lote que entra a planta hasta el lote que sale listo para despacho.`;
  el("mapSummary").textContent = `${flow.name} | ${flow.versionLabel} | ${productName(flow.productId)}`;

  el("processMap").innerHTML = `
    <div class="process-map-flow">
      <article class="map-node">
        <h4>Entra</h4>
        <div><b>${esc(batch?.upstreamSourceCode || "Cafe pergamino")}</b></div>
        <div class="plain-note">${esc(batch ? `${fmt(batch.plannedQuantity)} ${batch.plannedUnitCode}` : "Sin lote")}</div>
      </article>
      ${stages.map((stage, index) => `
          <div class="map-arrow">→</div>
        <article class="map-node stage">
          <h4>${esc(index + 1)}. ${esc(stage.name)}</h4>
          <div class="plain-note">${esc(stage.stageType)} | ${esc(nullable(stage.durationHours, " h", 1))}</div>
        </article>
      `).join("")}
          <div class="map-arrow">→</div>
      <article class="map-node">
        <h4>Sale</h4>
        <div><b>${esc(productName(flow.productId))}</b></div>
        <div class="plain-note">${esc(finalStageOutput()?.outputLotCode || "Salida final")}</div>
      </article>
    </div>
  `;

  el("processStory").innerHTML = `
    <div class="story-list">
      <div class="story-block"><b>Producto final:</b> ${esc(productName(flow.productId))}</div>
      <div class="story-block"><b>Proceso:</b> ${esc(flow.name)} | ${esc(flow.versionLabel)}</div>
      <div class="story-block"><b>Recorrido:</b> ${esc(stages.map((stage) => stage.name).join(" -> "))}</div>
      <div class="story-block"><b>Capacidad diaria:</b> ${esc(nullable(capacity?.estimatedFlowCapacity))} ${esc(capacity?.bottleneck?.capacityUnitCode || "")}</div>
      <div class="story-block"><b>Merma del lote:</b> ${esc(waste?.aggregateMode === "comparable_totals" ? nullable(waste.totalWaste) : joinMap(waste?.totalsByUnit?.waste || {}))}</div>
      <div class="story-block"><b>Restriccion principal:</b> ${esc(bottleneck?.bottleneckStageName || "Sin restriccion visible")}</div>
    </div>
  `;

  el("sipocCard").innerHTML = `
    <div class="sipoc-card">
      <div class="sipoc-row"><div class="sipoc-label">Proveedor</div><div>${esc(batch?.upstreamSupplierName || "Bodega de cafe pergamino")}</div></div>
      <div class="sipoc-row"><div class="sipoc-label">Insumo</div><div>${esc(batch?.upstreamSourceCode || "Cafe pergamino seco")}</div></div>
      <div class="sipoc-row"><div class="sipoc-label">Proceso</div><div>${esc(stages.map((stage) => stage.name).join(" -> "))}</div></div>
      <div class="sipoc-row"><div class="sipoc-label">Salida</div><div>${esc(productName(flow.productId))}</div></div>
      <div class="sipoc-row"><div class="sipoc-label">Cliente</div><div>Canal comercial / distribucion</div></div>
      <div class="sipoc-row"><div class="sipoc-label">Medida</div><div>Rendimiento del lote y capacidad diaria del flujo</div></div>
    </div>
  `;

  const alerts = [];
  if (!batch) alerts.push({ text: "El proceso existe, pero no tiene lote seleccionado para simular.", tone: "" });
  if (!getCalendars().length) alerts.push({ text: "Todavia no hay calendario cargado. La planeacion usa una lectura teorica.", tone: "" });
  if (plan && !plan.calendarCheck?.sufficientHours) alerts.push({ text: "Las horas disponibles del calendario no alcanzan para este lote.", tone: "" });
  if (plan && plan.calendarCheck?.competingBatchIds?.length) alerts.push({ text: "Hay lotes compitiendo por recursos compartidos en el calendario.", tone: "" });
  if (!alerts.length) alerts.push({ text: "La lectura base del proceso esta lista para revisarse.", tone: "good" });
  el("alertList").innerHTML = `<div class="alert-list">${alerts.map((item) => `<div class="alert-item ${item.tone}">${esc(item.text)}</div>`).join("")}</div>`;

  const stageCards = stages.map((stage) => {
    const summary = executionSummaryForStage(stage.id);
    const duration = Math.max(0.5, durationHoursForStage(stage));
    const width = Math.min(100, Math.max(18, (duration / Math.max(totalHours, 1)) * 100));
    return `
      <div class="chart-row">
        <div class="chart-label">${esc(stage.name)}</div>
        <div class="chart-bar">
          <span class="chart-fill tone-${familyLabel(flow)}" style="width:${width}%"></span>
        </div>
        <div class="chart-value">${esc(nullable(duration, " h", 1))} | ${esc(stagePeopleLabel(stage))}</div>
        <div class="chart-meta">${esc(stageConversionLabel(stage, summary))}</div>
      </div>
    `;
  }).join("");
  el("graphicBoard").innerHTML = `
    <div class="graphic-board">
      <div class="impact-card tone-${familyLabel(flow)}">
          <div class="impact-title">Transformacion del lote</div>
          <div class="impact-value">${esc(batch ? `${fmt(batch.plannedQuantity)} ${batch.plannedUnitCode}` : "N/D")} <span>→</span> ${esc(finalOutputLabel())}</div>
          <div class="impact-note">Lectura rapida para mostrar cuanto entra, cuanto sale y cuanto tarda.</div>
      </div>
      <div class="chart-stack">${stageCards}</div>
    </div>
  `;

  const portfolio = loadedPortfolio();
  el("portfolioBoard").innerHTML = `
    <div class="portfolio-grid">
      ${portfolio.map((item) => `
        <article class="portfolio-card tone-${item.family}">
          <div class="portfolio-head">
            <h4>${esc(item.product)}</h4>
            <span class="pill">${esc(item.batches.length)} lote(s)</span>
          </div>
          <div class="helper-line"><b>Flujo:</b> ${esc(item.flow.name)}</div>
          <div class="helper-line"><b>Etapas:</b> ${esc(String(item.stages.length))}</div>
          <div class="helper-line"><b>Tiempo:</b> ${esc(nullable(item.totalHours, " h", 1))}</div>
          <div class="helper-line"><b>Personas:</b> ${esc(String(item.people))}</div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderRoute() {
  const batch = currentBatch();
  if (!batch) {
    el("batchCard").innerHTML = `<div class="empty">Este proceso no tiene lote seleccionado.</div>`;
    el("wasteCard").innerHTML = `<div class="empty">Sin lote no hay merma ni trazabilidad.</div>`;
    el("traceJourney").innerHTML = `<div class="empty">Sin lote no se puede seguir la cadena.</div>`;
    el("recordCards").innerHTML = `<div class="empty">Sin lote no se muestran registros operativos.</div>`;
    el("traceTable").innerHTML = "";
    el("routeSummary").textContent = "Selecciona un lote para ver la ruta.";
    return;
  }

  el("routeSummary").textContent = `Sigue ${batch.batchCode} desde que entra hasta que sale convertido en producto final.`;
  el("batchCard").innerHTML = `
    <div class="plain-list">
      <div class="batch-block"><b>Lote:</b> ${esc(batch.batchCode)}</div>
      <div class="batch-block"><b>Producto:</b> ${esc(productName(batch.productId))}</div>
      <div class="batch-block"><b>Cantidad planificada:</b> ${esc(fmt(batch.plannedQuantity))} ${esc(batch.plannedUnitCode)}</div>
      <div class="batch-block"><b>Origen:</b> ${esc(batch.upstreamSourceCode || batch.upstreamSupplierName || "No registrado")}</div>
      <div class="batch-block"><b>Estado:</b> ${esc(batch.status || "planned")}</div>
    </div>
  `;

  const waste = state.view.waste;
  el("wasteCard").innerHTML = waste ? `
    <div class="plain-list">
      <div class="batch-block"><b>Entrada total:</b> ${esc(waste.aggregateMode === "comparable_totals" ? nullable(waste.totalInput) : joinMap(waste.totalsByUnit.input))}</div>
      <div class="batch-block"><b>Salida util:</b> ${esc(waste.aggregateMode === "comparable_totals" ? nullable(waste.totalUseful) : joinMap(waste.totalsByUnit.output))}</div>
      <div class="batch-block"><b>Merma:</b> ${esc(waste.aggregateMode === "comparable_totals" ? nullable(waste.totalWaste) : joinMap(waste.totalsByUnit.waste))}</div>
      <div class="batch-block"><b>Rendimiento:</b> ${esc(waste.aggregateMode === "comparable_totals" ? pct(waste.totalYieldPct) : "Ver por etapa")}</div>
    </div>
  ` : `<div class="empty">Sin lectura de merma.</div>`;

  const stageIndex = new Map(stagesForFlow(batch.flowVersionId).map((stage) => [stage.id, stage]));
  el("traceTable").innerHTML = (state.view.trace || []).map((item) => {
    const summary = (state.view.waste?.stageSummaries || []).find((entry) => entry.executionId === item.executionId);
    return `
      <tr>
        <td>${esc(item.stageName || item.stageId)}</td>
        <td>${esc(item.inputLotCode)}</td>
        <td>${esc(item.outputLotCode)}</td>
        <td>${esc(nullable(summary?.inputQuantity))} ${esc(summary?.inputUnitCode || "")}</td>
        <td>${esc(nullable(summary?.outputQuantity))} ${esc(summary?.outputUnitCode || "")}</td>
        <td>${esc(nullable(summary?.wasteQuantity))} ${esc(summary?.wasteUnitCode || "")}</td>
        <td>${esc(summary ? pct(summary.yieldPct) : "N/D")}</td>
      </tr>
    `;
  }).join("");

  el("traceJourney").innerHTML = state.view.trace?.length ? `
    <div class="trace-journey">
      ${state.view.trace.map((item) => {
        const summary = (state.view.waste?.stageSummaries || []).find((entry) => entry.executionId === item.executionId);
        return `
          <article class="trace-card">
            <div class="trace-card-head">
              <h4>${esc(item.stageName || item.stageId)}</h4>
              <span class="pill">Paso ${esc(item.sequence || stageIndex.get(item.stageId)?.sequence || "-")}</span>
            </div>
            <div class="trace-flow">
              <div class="trace-lot">
                <div class="trace-lot-label">Lote entrada</div>
                <div class="trace-lot-code">${esc(item.inputLotCode || "No registrado")}</div>
              </div>
            <div class="trace-arrow">→</div>
              <div class="trace-lot">
                <div class="trace-lot-label">Lote salida</div>
                <div class="trace-lot-code">${esc(item.outputLotCode || "No registrado")}</div>
              </div>
            </div>
            <div class="trace-metrics">
              <span class="trace-metric">Entrada: ${esc(nullable(summary?.inputQuantity))} ${esc(summary?.inputUnitCode || "")}</span>
              <span class="trace-metric">Salida: ${esc(nullable(summary?.outputQuantity))} ${esc(summary?.outputUnitCode || "")}</span>
              <span class="trace-metric">Merma: ${esc(nullable(summary?.wasteQuantity))} ${esc(summary?.wasteUnitCode || "")}</span>
              <span class="trace-metric">Rendimiento: ${esc(summary ? pct(summary.yieldPct) : "N/D")}</span>
            </div>
          </article>
        `;
      }).join("")}
    </div>
  ` : `<div class="empty">Todavia no hay trazabilidad registrada para este lote.</div>`;

  const flowStages = stagesForFlow(batch.flowVersionId);
  el("recordCards").innerHTML = flowStages.length ? `
    <div class="record-grid">
      ${flowStages.map((stage) => {
        const trace = (state.view.trace || []).find((item) => item.stageId === stage.id);
        const registered = Boolean(trace?.inputLotCode || trace?.outputLotCode);
        return `
          <article class="record-card">
            <h4>${esc(stage.sequence)}. ${esc(stage.name)}</h4>
            <div class="record-pills">
              ${(stage.requiredRecordNames || []).map((name) => `<span class="record-pill">${esc(name)}</span>`).join("") || '<span class="record-pill">Sin registro definido</span>'}
            </div>
            <div class="record-pills">
              ${(stage.controlItems || []).map((name) => `<span class="record-pill">${esc(name)}</span>`).join("") || '<span class="record-pill">Sin control definido</span>'}
            </div>
            <div class="plain-note">${registered ? "Ya existe movimiento de lote registrado en esta etapa." : "Aun no se observa movimiento de lote en esta etapa."}</div>
          </article>
        `;
      }).join("")}
    </div>
  ` : `<div class="empty">No hay etapas para mostrar registros.</div>`;
}

function signalForStage(stage, bottleneckStageId) {
  if (stage.id === bottleneckStageId) return { tone: "red", label: "Cuello de botella" };
  if (num(stage.durationHours) >= 8) return { tone: "yellow", label: "Etapa exigida" };
  return { tone: "green", label: "Con margen" };
}

function renderCapacity() {
  const flow = currentFlow();
  const summary = state.view.capacity;
  const bottleneck = state.view.bottleneck;
  if (!flow || !summary) {
    el("capacityKpis").innerHTML = "";
    el("capacityCards").innerHTML = `<div class="empty">Selecciona un proceso para ver capacidad.</div>`;
    el("capacityLegend").innerHTML = "";
    return;
  }

  renderKpis("capacityKpis", [
    {
      label: "Capacidad diaria",
      value: `${nullable(summary.estimatedFlowCapacity)} ${summary.bottleneck?.capacityUnitCode || ""}`,
      note: "Capacidad del flujo completo",
    },
    {
      label: "Etapa mas lenta",
      value: bottleneck?.bottleneckStageName || "N/D",
      note: "La restriccion principal del sistema",
    },
    {
      label: "Etapas",
      value: String(summary.byStage.length),
      note: "Operaciones consideradas hoy",
    },
    {
      label: "Tiempo acumulado",
      value: `${fmt(stagesForFlow(flow.id).reduce((sum, stage) => sum + num(stage.durationHours), 0), 1)} h`,
      note: "Duracion teorica total del flujo",
    },
  ]);

  el("capacitySummary").textContent = `${flow.name} | ${flow.versionLabel} | ${productName(flow.productId)}`;
  el("capacityCards").innerHTML = summary.byStage.map((item) => {
    const signal = signalForStage(item, bottleneck?.bottleneckStageId);
    return `
      <article class="capacity-card">
        <div class="trace-card-head">
          <h4>${esc(item.stageName)}</h4>
          <span class="signal ${signal.tone}">${esc(signal.label)}</span>
        </div>
        <div class="pill-row">
          <span class="pill">${esc(nullable(item.capacityByRun))} ${esc(item.capacityUnitCode)}</span>
          <span class="pill">${esc(nullable(item.stageDurationHours, " h", 1))}</span>
          <span class="pill">${esc(item.operatorCount)} operario(s)</span>
        </div>
        <div class="capacity-row">
          <div><b>Corridas posibles:</b> ${esc(nullable(item.availableRuns))}</div>
          <div><b>Capacidad por dia:</b> ${esc(nullable(item.estimatedCapacity))} ${esc(item.capacityUnitCode)}</div>
          <div><b>Capacidad declarada:</b> ${esc(nullable(item.declaredMaxCapacity))} ${esc(item.declaredMaxCapacityUnitCode || "")}</div>
          <div><b>Area requerida:</b> ${esc(nullable(item.requiredAreaM2, " m2"))}</div>
          <div><b>Controles:</b> ${esc((item.controlItems || []).join(", ") || "Sin controles")}</div>
          <div><b>Registros:</b> ${esc((item.requiredRecordNames || []).join(", ") || "Sin registros")}</div>
        </div>
      </article>
    `;
  }).join("");

  el("capacityLegend").innerHTML = `
    <span class="legend-chip">Verde: etapa con margen</span>
    <span class="legend-chip">Amarillo: etapa exigida por tiempo o carga</span>
    <span class="legend-chip">Rojo: cuello de botella del flujo</span>
  `;
}

function renderPlan() {
  const flow = currentFlow();
  const batch = currentBatch();
  const plan = state.view.plan;
  const capacity = state.view.capacity;
  const bottleneck = state.view.bottleneck;

  if (!flow || !batch || !plan) {
    el("planKpis").innerHTML = "";
    el("planTimeline").innerHTML = `<div class="empty">Selecciona un lote para ver el plan.</div>`;
    el("planNotes").innerHTML = "";
    el("startChecklist").innerHTML = "";
    return;
  }

  renderKpis("planKpis", [
    {
      label: "Lote",
      value: batch.batchCode,
      note: `${fmt(batch.plannedQuantity)} ${batch.plannedUnitCode}`,
    },
    {
      label: "Capacidad del flujo",
      value: `${nullable(capacity?.estimatedFlowCapacity)} ${capacity?.bottleneck?.capacityUnitCode || ""}`,
      note: "Capacidad estimada por dia",
    },
    {
      label: "Cuello de botella",
      value: bottleneck?.bottleneckStageName || "N/D",
      note: "Etapa que manda el ritmo",
    },
    {
      label: "Calendario",
      value: plan.calendarCheck?.sufficientHours ? "Viable" : "Revisar",
      note: `${fmt(plan.calendarCheck?.availableHours || 0)} h disponibles`,
    },
  ]);

  el("planTimeline").innerHTML = `<div class="timeline-stack">${plan.stagePlan.map((item) => `
    <div class="timeline-item">
      <h4>${esc(item.stageName)}</h4>
      <div class="mini">Inicio: ${esc(item.startedAt)}</div>
      <div class="mini">Fin: ${esc(item.endedAt)}</div>
      <div class="mini">Duracion: ${esc(nullable(item.durationHours, " h", 1))}</div>
    </div>
  `).join("")}</div>`;

  el("planNotes").innerHTML = `
    <div class="plain-list">
      <div class="plan-note"><b>Lectura simple:</b> El lote ${esc(batch.batchCode)} sigue ${esc(plan.stagePlan.length)} pasos desde su entrada hasta el producto final.</div>
      <div class="plan-note"><b>Horas requeridas:</b> ${esc(nullable(plan.calendarCheck?.requiredHours))} h frente a ${esc(nullable(plan.calendarCheck?.availableHours))} h disponibles.</div>
      <div class="plan-note"><b>Area requerida:</b> ${esc(nullable(plan.calendarCheck?.peakRequiredAreaM2, " m2"))} frente a ${esc(nullable(plan.calendarCheck?.minimumAvailableAreaM2, " m2"))} disponibles.</div>
      <div class="plan-note"><b>Recursos compartidos:</b> ${esc((plan.calendarCheck?.competingBatchIds || []).join(", ") || "Sin conflictos registrados")}</div>
    </div>
  `;

  const checklistItems = [
    `${batch.upstreamSourceCode || "Cafe pergamino"} disponible`,
    `${bottleneck?.bottleneckStageName || "Equipo principal"} listo`,
    "Operario asignado",
    "Envases y etiquetas disponibles",
    "Registro de lote abierto",
    "Espacio de reposo y bodega validado",
  ];
  el("startChecklist").innerHTML = `<div class="check-grid">${checklistItems.map((item) => `
    <div class="check-item">
      <span class="check-bullet"></span>
      <div>${esc(item)}</div>
    </div>
  `).join("")}</div>`;
}

function renderNeeds() {
  const requirements = state.view.requirements;
  const warehouse = state.view.warehouse;
  if (!requirements) {
    el("requirementsTable").innerHTML = "";
    el("warehouseCard").innerHTML = `<div class="empty">Selecciona un lote para ver materiales y bodega.</div>`;
    return;
  }

  el("requirementsTable").innerHTML = requirements.items.map((item) => `
    <tr>
      <td>${esc(item.materialName)}</td>
      <td>${esc(item.materialType)}</td>
      <td>${esc(stageName(item.stageId))}</td>
      <td>${esc(nullable(item.netQuantity))}</td>
      <td>${esc(nullable(item.grossQuantity))}</td>
      <td>${esc(item.unitCode)}</td>
    </tr>
  `).join("");

  const packagingItems = requirements.items.filter((item) => item.materialType === "packaging").length;
  el("warehouseCard").innerHTML = `
    <div class="plain-list">
      <div class="warehouse-block"><b>Zona sugerida:</b> ${esc(warehouse?.warehouseZone || "general")}</div>
      <div class="warehouse-block"><b>Area requerida:</b> ${esc(nullable(warehouse?.requiredAreaM2, " m2"))}</div>
      <div class="warehouse-block"><b>Volumen:</b> ${esc(nullable(warehouse?.requiredVolumeM3, " m3"))}</div>
      <div class="warehouse-block"><b>Posiciones:</b> ${esc(nullable(warehouse?.requiredPositions, "", 0))}</div>
      <div class="warehouse-block"><b>Envases:</b> ${esc(String(packagingItems))} item(s) de empaque en la formula</div>
    </div>
  `;
}

function renderImprove() {
  const waste = state.view.waste;
  const bottleneck = state.view.bottleneck;
  const stages = stagesForFlow(state.flowId);
  const highestWaste = [...(waste?.stageSummaries || [])].sort((a, b) => num(b.wasteQuantity) - num(a.wasteQuantity))[0];
  const longestStage = [...stages].sort((a, b) => num(b.durationHours) - num(a.durationHours))[0];
  const competing = state.view.plan?.calendarCheck?.competingBatchIds?.length || 0;

  renderKpis("improveKpis", [
    {
      label: "Mayor merma",
      value: highestWaste ? stageName(highestWaste.stageId) : "N/D",
      note: highestWaste ? `${fmt(highestWaste.wasteQuantity)} ${highestWaste.wasteUnitCode || ""}` : "Sin dato",
    },
    {
      label: "Etapa mas lenta",
      value: longestStage?.name || "N/D",
      note: longestStage ? `${fmt(longestStage.durationHours, 1)} h` : "Sin dato",
    },
    {
      label: "Restriccion",
      value: bottleneck?.bottleneckStageName || "N/D",
      note: "Cuello de botella actual",
    },
    {
      label: "Conflictos",
      value: String(competing),
      note: "Lotes compitiendo por recursos",
    },
  ]);

  const actionsList = [
    bottleneck?.bottleneckStageName ? `Revisar como acelerar ${bottleneck.bottleneckStageName}.` : "Revisar la etapa limitante del flujo.",
    highestWaste ? `Analizar por que ${stageName(highestWaste.stageId)} concentra la mayor merma.` : "Registrar merma por etapa para comparar mejor.",
    longestStage ? `Ver si ${longestStage.name} necesita mejor setup, espacio o secuencia.` : "Medir tiempos reales por etapa.",
    competing ? "Separar la ventana de empaque o reorganizar lotes competidores." : "No hay conflicto fuerte de recursos hoy.",
  ];

  el("improveActions").innerHTML = `<div class="plain-list">${actionsList.map((item) => `
    <div class="improve-card">${esc(item)}</div>
  `).join("")}</div>`;

  const currentCapacity = num(state.view.capacity?.estimatedFlowCapacity);
  const improvedCapacity = currentCapacity * 1.1;
  const currentWaste = num(highestWaste?.wasteQuantity);
  const reducedWaste = currentWaste * 0.8;
  el("improveScenarios").innerHTML = `
    <div class="plain-list">
      <div class="improve-card"><h4>Si subes 10% la capacidad de la etapa limitante</h4><div class="plain-note">El flujo podria pasar de ${esc(nullable(currentCapacity))} a ${esc(nullable(improvedCapacity))} ${esc(state.view.capacity?.bottleneck?.capacityUnitCode || "")} por dia.</div></div>
      <div class="improve-card"><h4>Si bajas 20% la mayor merma</h4><div class="plain-note">La perdida principal bajaria de ${esc(nullable(currentWaste))} a ${esc(nullable(reducedWaste))} ${esc(highestWaste?.wasteUnitCode || "")}.</div></div>
      <div class="improve-card"><h4>Si ordenas mejor el calendario</h4><div class="plain-note">Reducir conflictos de recursos ayuda a que el lote cierre a tiempo y sin esperas innecesarias.</div></div>
    </div>
  `;
}

function renderMapDidactic() {
  const flow = currentFlow();
  const batch = currentBatch();
  if (!flow) {
    el("mapKpis").innerHTML = `<div class="empty">No hay proceso cargado todavia.</div>`;
    el("processMap").innerHTML = `<div class="empty">Carga un archivo para empezar.</div>`;
    el("processStory").innerHTML = "";
    el("sipocCard").innerHTML = "";
    el("alertList").innerHTML = "";
    return;
  }

  const narrative = processNarrative(flow, batch);
  const stages = stagesForFlow(flow.id);
  const waste = state.view.waste;
  const capacity = state.view.capacity;
  const plan = state.view.plan;
  const bottleneck = state.view.bottleneck;
  const finalSummary = state.view.waste?.stageSummaries?.slice(-1)[0];
  const totalHours = totalProcessHours(stages);
  const totalPeopleHours = totalOperatorHours(stages);

  renderKpis("mapKpis", [
    {
      label: "Entrada",
      value: batch ? `${fmt(batch.plannedQuantity)} ${batch.plannedUnitCode}` : "N/D",
      note: batchSourceLabel(batch),
    },
    {
      label: "Salida esperada",
      value: finalOutputLabel(),
      note: finalStageOutput()?.outputLotCode || productName(flow.productId),
    },
    {
      label: "Tiempo total",
      value: `${fmt(totalHours, 1)} h`,
      note: `${fmt(totalPeopleHours, 1)} horas-persona`,
    },
    {
      label: "Cuello de botella",
      value: bottleneck?.bottleneckStageName || "N/D",
      note: "Etapa que hoy limita la velocidad",
    },
  ]);

  el("heroTitle").textContent = `De ${narrative.from} a ${productName(flow.productId)}`;
  el("heroText").textContent = `Este proceso tiene ${narrative.stageCount} etapas. Ahora cada fase muestra que transforma, cuanto tarda, cuantas personas requiere y que materiales necesita.`;
  el("mapSummary").textContent = `${flow.name} | ${flow.versionLabel} | ${productName(flow.productId)}`;

  el("processMap").innerHTML = `
    <div class="process-map-flow">
      <article class="map-node">
        <h4>Entra</h4>
        <div><b>${esc(batchSourceLabel(batch))}</b></div>
        <div class="plain-note">${esc(batch ? `${fmt(batch.plannedQuantity)} ${batch.plannedUnitCode}` : "Sin lote")}</div>
      </article>
      ${stages.map((stage, index) => `
        <div class="map-arrow">&rarr;</div>
        <article class="map-node stage">
          <h4>${esc(index + 1)}. ${esc(stage.name)}</h4>
          <div class="plain-note">${esc(stage.stageType)} | ${esc(stageConversionLabel(stage, executionSummaryForStage(stage.id)))}</div>
          <div class="helper-line">${esc(stagePeopleLabel(stage))} | ${esc(nullable(durationHoursForStage(stage), " h", 1))}</div>
          <div class="helper-line">Materiales: ${esc(summarizeRequirements(stage.id))}</div>
        </article>
      `).join("")}
      <div class="map-arrow">&rarr;</div>
      <article class="map-node">
        <h4>Sale</h4>
        <div><b>${esc(productName(flow.productId))}</b></div>
        <div class="plain-note">${esc(finalSummary ? `${nullable(finalSummary.outputQuantity)} ${finalSummary.outputUnitCode || ""}` : "Salida final")}</div>
      </article>
    </div>
  `;

  el("processStory").innerHTML = `
    <div class="phase-grid">
      ${stages.map((stage) => `
        <article class="phase-card">
          <div class="trace-card-head">
            <h4>${esc(stage.sequence)}. ${esc(stage.name)}</h4>
            <span class="pill">${esc(stageConversionLabel(stage, executionSummaryForStage(stage.id)))}</span>
          </div>
          <div class="phase-meta">
            <div><b>Tiempo</b><span>${esc(nullable(durationHoursForStage(stage), " h", 1))}</span></div>
            <div><b>Personas</b><span>${esc(stagePeopleLabel(stage))}</span></div>
            <div><b>Horas-persona</b><span>${esc(nullable(operatorHoursForStage(stage), " h", 1))}</span></div>
            <div><b>Roles</b><span>${esc(stageRoles(stage))}</span></div>
          </div>
          <div class="helper-line"><b>Materiales:</b> ${esc(summarizeRequirements(stage.id))}</div>
          <div class="helper-line"><b>Soporte:</b> ${esc(stageResourcesSummary(stage))}</div>
        </article>
      `).join("")}
      <article class="phase-card emphasis">
        <h4>Lectura del flujo</h4>
        <div class="helper-line"><b>Producto final:</b> ${esc(productName(flow.productId))}</div>
        <div class="helper-line"><b>Capacidad diaria:</b> ${esc(nullable(capacity?.estimatedFlowCapacity))} ${esc(capacity?.bottleneck?.capacityUnitCode || "")}</div>
        <div class="helper-line"><b>Merma del lote:</b> ${esc(waste?.aggregateMode === "comparable_totals" ? nullable(waste.totalWaste) : joinMap(waste?.totalsByUnit?.waste || {}))}</div>
        <div class="helper-line"><b>Restriccion principal:</b> ${esc(bottleneck?.bottleneckStageName || "Sin restriccion visible")}</div>
      </article>
    </div>
  `;

  el("sipocCard").innerHTML = `
    <div class="sipoc-card">
      <div class="sipoc-row"><div class="sipoc-label">Proveedor</div><div>${esc(batch?.upstreamSupplierName || "Bodega de cafe pergamino")}</div></div>
      <div class="sipoc-row"><div class="sipoc-label">Insumo</div><div>${esc(batchSourceLabel(batch))}</div></div>
      <div class="sipoc-row"><div class="sipoc-label">Proceso</div><div>${esc(stages.map((stage) => stage.name).join(" -> "))}</div></div>
      <div class="sipoc-row"><div class="sipoc-label">Salida</div><div>${esc(`${productName(flow.productId)} | ${finalOutputLabel()}`)}</div></div>
      <div class="sipoc-row"><div class="sipoc-label">Cliente</div><div>Canal comercial / distribucion</div></div>
      <div class="sipoc-row"><div class="sipoc-label">Medida</div><div>Rendimiento del lote, personas por fase y capacidad diaria</div></div>
    </div>
  `;

  const alerts = [];
  if (!batch) alerts.push({ text: "El proceso existe, pero no tiene lote seleccionado para simular.", tone: "" });
  if (!getCalendars().length) alerts.push({ text: "Todavia no hay calendario cargado. La planeacion usa una lectura teorica.", tone: "" });
  if (plan && !plan.calendarCheck?.sufficientHours) alerts.push({ text: "Las horas disponibles del calendario no alcanzan para este lote.", tone: "" });
  if (plan && plan.calendarCheck?.competingBatchIds?.length) alerts.push({ text: "Hay lotes compitiendo por recursos compartidos en el calendario.", tone: "" });
  if (!alerts.length) alerts.push({ text: "La lectura base del proceso esta lista para revisarse.", tone: "good" });
  el("alertList").innerHTML = `<div class="alert-list">${alerts.map((item) => `<div class="alert-item ${item.tone}">${esc(item.text)}</div>`).join("")}</div>`;
}

function renderRouteDidactic() {
  const batch = currentBatch();
  if (!batch) {
    el("batchCard").innerHTML = `<div class="empty">Este proceso no tiene lote seleccionado.</div>`;
    el("wasteCard").innerHTML = `<div class="empty">Sin lote no hay merma ni trazabilidad.</div>`;
    el("traceJourney").innerHTML = `<div class="empty">Sin lote no se puede seguir la cadena.</div>`;
    el("recordCards").innerHTML = `<div class="empty">Sin lote no se muestran registros operativos.</div>`;
    el("traceTable").innerHTML = "";
    el("routeSummary").textContent = "Selecciona un lote para ver la ruta.";
    return;
  }

  const flowStages = stagesForFlow(batch.flowVersionId);
  const waste = state.view.waste;

  el("routeSummary").textContent = `Sigue ${batch.batchCode} desde que entra hasta que sale convertido en producto final.`;
  el("batchCard").innerHTML = `
    <div class="plain-list">
      <div class="batch-block"><b>Lote:</b> ${esc(batch.batchCode)}</div>
      <div class="batch-block"><b>Producto:</b> ${esc(productName(batch.productId))}</div>
      <div class="batch-block"><b>Cantidad planificada:</b> ${esc(fmt(batch.plannedQuantity))} ${esc(batch.plannedUnitCode)}</div>
      <div class="batch-block"><b>Origen:</b> ${esc(batchSourceLabel(batch))}</div>
      <div class="batch-block"><b>Salida esperada:</b> ${esc(finalOutputLabel())}</div>
    </div>
  `;

  el("wasteCard").innerHTML = waste ? `
    <div class="plain-list">
      <div class="batch-block"><b>Entrada total:</b> ${esc(waste.aggregateMode === "comparable_totals" ? nullable(waste.totalInput) : joinMap(waste.totalsByUnit.input))}</div>
      <div class="batch-block"><b>Salida util:</b> ${esc(waste.aggregateMode === "comparable_totals" ? nullable(waste.totalUseful) : joinMap(waste.totalsByUnit.output))}</div>
      <div class="batch-block"><b>Merma:</b> ${esc(waste.aggregateMode === "comparable_totals" ? nullable(waste.totalWaste) : joinMap(waste.totalsByUnit.waste))}</div>
      <div class="batch-block"><b>Rendimiento:</b> ${esc(waste.aggregateMode === "comparable_totals" ? pct(waste.totalYieldPct) : "Ver por etapa")}</div>
    </div>
  ` : `<div class="empty">Sin lectura de merma.</div>`;

  el("traceJourney").innerHTML = state.view.trace?.length ? `
    <div class="trace-journey">
      ${state.view.trace.map((item) => {
        const stage = stageForId(item.stageId);
        const summary = executionSummaryForStage(item.stageId);
        return `
          <article class="trace-card trace-card-rich">
            <div class="trace-card-head">
              <h4>${esc(item.stageName || item.stageId)}</h4>
              <span class="pill">Paso ${esc(item.sequence || stage?.sequence || "-")}</span>
            </div>
            <div class="trace-flow">
              <div class="trace-lot">
                <div class="trace-lot-label">Lote entrada</div>
                <div class="trace-lot-code">${esc(item.inputLotCode || "No registrado")}</div>
              </div>
              <div class="trace-arrow">&rarr;</div>
              <div class="trace-lot">
                <div class="trace-lot-label">Lote salida</div>
                <div class="trace-lot-code">${esc(item.outputLotCode || "No registrado")}</div>
              </div>
            </div>
            <div class="trace-metrics">
              <span class="trace-metric">Transforma: ${esc(stageConversionLabel(stage, summary))}</span>
              <span class="trace-metric">Entrada: ${esc(nullable(summary?.inputQuantity))} ${esc(summary?.inputUnitCode || "")}</span>
              <span class="trace-metric">Salida: ${esc(nullable(summary?.outputQuantity))} ${esc(summary?.outputUnitCode || "")}</span>
              <span class="trace-metric">Merma: ${esc(nullable(summary?.wasteQuantity))} ${esc(summary?.wasteUnitCode || "")}</span>
              <span class="trace-metric">Rendimiento: ${esc(summary ? pct(summary.yieldPct) : "N/D")}</span>
            </div>
            <div class="phase-meta compact">
              <div><b>Tiempo</b><span>${esc(nullable(durationHoursForStage(stage), " h", 1))}</span></div>
              <div><b>Personas</b><span>${esc(stagePeopleLabel(stage))}</span></div>
              <div><b>Horas-persona</b><span>${esc(nullable(operatorHoursForStage(stage), " h", 1))}</span></div>
              <div><b>Roles</b><span>${esc(stageRoles(stage))}</span></div>
            </div>
            <div class="helper-line"><b>Materiales:</b> ${esc(summarizeRequirements(stage?.id))}</div>
            <div class="helper-line"><b>Equipo y apoyo:</b> ${esc(stageResourcesSummary(stage))}</div>
          </article>
        `;
      }).join("")}
    </div>
  ` : `<div class="empty">Todavia no hay trazabilidad registrada para este lote.</div>`;

  el("recordCards").innerHTML = flowStages.length ? `
    <div class="record-grid">
      ${flowStages.map((stage) => {
        const trace = traceForStage(stage.id);
        const registered = Boolean(trace?.inputLotCode || trace?.outputLotCode);
        return `
          <article class="record-card">
            <h4>${esc(stage.sequence)}. ${esc(stage.name)}</h4>
            <div class="helper-line"><b>Responsable:</b> ${esc(stageRoles(stage))}</div>
            <div class="helper-line"><b>Personas:</b> ${esc(stagePeopleLabel(stage))} | <b>Tiempo:</b> ${esc(nullable(durationHoursForStage(stage), " h", 1))}</div>
            <div class="record-pills">
              ${(stage.requiredRecordNames || []).map((name) => `<span class="record-pill">${esc(name)}</span>`).join("") || '<span class="record-pill">Sin registro definido</span>'}
            </div>
            <div class="record-pills">
              ${(stage.controlItems || []).map((name) => `<span class="record-pill">${esc(name)}</span>`).join("") || '<span class="record-pill">Sin control definido</span>'}
            </div>
            <div class="helper-line"><b>Materiales y soporte:</b> ${esc(stageResourcesSummary(stage))}</div>
            <div class="plain-note">${registered ? "Ya existe movimiento de lote registrado en esta etapa." : "Aun no se observa movimiento de lote en esta etapa."}</div>
          </article>
        `;
      }).join("")}
    </div>
  ` : `<div class="empty">No hay etapas para mostrar registros.</div>`;

  el("traceTable").innerHTML = (state.view.trace || []).map((item) => {
    const summary = executionSummaryForStage(item.stageId);
    return `
      <tr>
        <td>${esc(item.stageName || item.stageId)}</td>
        <td>${esc(item.inputLotCode)}</td>
        <td>${esc(item.outputLotCode)}</td>
        <td>${esc(nullable(summary?.inputQuantity))} ${esc(summary?.inputUnitCode || "")}</td>
        <td>${esc(nullable(summary?.outputQuantity))} ${esc(summary?.outputUnitCode || "")}</td>
        <td>${esc(nullable(summary?.wasteQuantity))} ${esc(summary?.wasteUnitCode || "")}</td>
        <td>${esc(summary ? pct(summary.yieldPct) : "N/D")}</td>
      </tr>
    `;
  }).join("");
}

function renderCapacityDidactic() {
  const flow = currentFlow();
  const summary = state.view.capacity;
  const bottleneck = state.view.bottleneck;
  if (!flow || !summary) {
    el("capacityKpis").innerHTML = "";
    el("capacityCards").innerHTML = `<div class="empty">Selecciona un proceso para ver capacidad.</div>`;
    el("capacityLegend").innerHTML = "";
    return;
  }

  renderKpis("capacityKpis", [
    {
      label: "Capacidad diaria",
      value: `${nullable(summary.estimatedFlowCapacity)} ${summary.bottleneck?.capacityUnitCode || ""}`,
      note: "Capacidad del flujo completo",
    },
    {
      label: "Etapa mas lenta",
      value: bottleneck?.bottleneckStageName || "N/D",
      note: "La restriccion principal del sistema",
    },
    {
      label: "Personas del flujo",
      value: `${fmt(stagesForFlow(flow.id).reduce((sum, stage) => sum + num(stage.operatorCount), 0), 0)}`,
      note: "Personas requeridas por ciclo completo",
    },
    {
      label: "Tiempo acumulado",
      value: `${fmt(totalProcessHours(stagesForFlow(flow.id)), 1)} h`,
      note: `${fmt(totalOperatorHours(stagesForFlow(flow.id)), 1)} horas-persona`,
    },
  ]);

  el("capacitySummary").textContent = `${flow.name} | ${flow.versionLabel} | ${productName(flow.productId)}`;
  el("capacityCards").innerHTML = summary.byStage.map((item) => {
    const stage = stageForId(item.stageId);
    const signal = stageSignalFromRatio(item, bottleneck?.bottleneckStageId);
    return `
      <article class="capacity-card">
        <div class="trace-card-head">
          <h4>${esc(item.stageName)}</h4>
          <span class="signal ${signal.tone}">${esc(signal.label)}</span>
        </div>
        <div class="traffic-rail"><span class="traffic-fill ${signal.tone}" style="width:${Math.round(signal.ratio * 100)}%"></span></div>
        <div class="pill-row">
          <span class="pill">${esc(stageConversionLabel(stage, executionSummaryForStage(item.stageId)))}</span>
          <span class="pill">${esc(nullable(item.capacityByRun))} ${esc(item.capacityUnitCode)}</span>
          <span class="pill">${esc(nullable(item.stageDurationHours, " h", 1))}</span>
          <span class="pill">${esc(item.operatorCount)} persona(s)</span>
        </div>
        <div class="capacity-row">
          <div><b>Corridas posibles:</b> ${esc(nullable(item.availableRuns))}</div>
          <div><b>Capacidad por dia:</b> ${esc(nullable(item.estimatedCapacity))} ${esc(item.capacityUnitCode)}</div>
          <div><b>Capacidad declarada:</b> ${esc(nullable(item.declaredMaxCapacity))} ${esc(item.declaredMaxCapacityUnitCode || "")}</div>
          <div><b>Horas-persona:</b> ${esc(nullable(operatorHoursForStage(stage), " h", 1))}</div>
          <div><b>Area requerida:</b> ${esc(nullable(item.requiredAreaM2, " m2"))}</div>
          <div><b>Roles:</b> ${esc(stageRoles(stage))}</div>
          <div><b>Materiales:</b> ${esc(summarizeRequirements(item.stageId))}</div>
          <div><b>Soporte:</b> ${esc(stageResourcesSummary(stage))}</div>
        </div>
      </article>
    `;
  }).join("");

  el("capacityLegend").innerHTML = `
    <span class="legend-chip">Verde: etapa con margen</span>
    <span class="legend-chip">Amarillo: etapa exigida por tiempo o carga</span>
    <span class="legend-chip">Rojo: cuello de botella del flujo</span>
  `;

  const stageChart = currentStageChartData();
  el("bottleneckBoard").innerHTML = `
    <div class="bottle-stack">
      ${stageChart.map((item) => `
        <div class="bottle-line">
          <div class="bottle-head">
            <span>${esc(item.stageName)}</span>
            <span class="signal ${item.signal.tone}">${esc(item.signal.label)}</span>
          </div>
          <div class="traffic-rail large"><span class="traffic-fill ${item.signal.tone}" style="width:${Math.round(item.signal.ratio * 100)}%"></span></div>
        <div class="helper-line">${esc(nullable(item.estimatedCapacity))} ${esc(item.capacityUnitCode)} por dia</div>
        </div>
      `).join("")}
    </div>
  `;

  const maxCapacity = Math.max(...stageChart.map((item) => num(item.estimatedCapacity)), 1);
  el("capacityChart").innerHTML = `
    <div class="chart-stack">
      ${stageChart.map((item) => `
        <div class="chart-row">
          <div class="chart-label">${esc(item.stageName)}</div>
          <div class="chart-bar">
            <span class="chart-fill ${item.signal.tone}" style="width:${Math.max(12, (num(item.estimatedCapacity) / maxCapacity) * 100)}%"></span>
          </div>
          <div class="chart-value">${esc(nullable(item.estimatedCapacity))} ${esc(item.capacityUnitCode)}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function buildPlanChecklist(flowStages, batch, plan, bottleneck) {
  const requirementItems = state.view.requirements?.items || [];
  const packaging = unique(requirementItems.filter((item) => item.materialType === "packaging").map((item) => item.materialName));
  const criticalRecords = unique(flowStages.flatMap((stage) => stage.requiredRecordNames || []));
  const roleList = unique(flowStages.flatMap((stage) => stage.responsibleRoleNames || []));

  return unique([
    `${batchSourceLabel(batch)} disponible`,
    `${bottleneck?.bottleneckStageName || "Etapa limitante"} lista`,
    packaging.length ? `Empaques listos: ${packaging.join(", ")}` : "",
    criticalRecords.length ? `Registros listos: ${criticalRecords.slice(0, 3).join(", ")}` : "",
    roleList.length ? `Roles cubiertos: ${roleList.slice(0, 3).join(", ")}` : "",
    plan.calendarCheck?.competingBatchIds?.length ? `Resolver conflicto con lotes: ${plan.calendarCheck.competingBatchIds.join(", ")}` : "Sin conflicto fuerte de recursos compartidos",
    `Area minima disponible: ${nullable(plan.calendarCheck?.minimumAvailableAreaM2, " m2")}`,
  ]);
}

function renderPlanDidactic() {
  const flow = currentFlow();
  const batch = currentBatch();
  const plan = state.view.plan;
  const capacity = state.view.capacity;
  const bottleneck = state.view.bottleneck;

  if (!flow || !batch || !plan) {
    el("planKpis").innerHTML = "";
    el("planTimeline").innerHTML = `<div class="empty">Selecciona un lote para ver el plan.</div>`;
    el("planNotes").innerHTML = "";
    el("startChecklist").innerHTML = "";
    return;
  }

  const flowStages = stagesForFlow(flow.id);

  renderKpis("planKpis", [
    {
      label: "Lote",
      value: batch.batchCode,
      note: `${fmt(batch.plannedQuantity)} ${batch.plannedUnitCode}`,
    },
    {
      label: "Capacidad del flujo",
      value: `${nullable(capacity?.estimatedFlowCapacity)} ${capacity?.bottleneck?.capacityUnitCode || ""}`,
      note: "Capacidad estimada por dia",
    },
    {
      label: "Cuello de botella",
      value: bottleneck?.bottleneckStageName || "N/D",
      note: "Etapa que manda el ritmo",
    },
    {
      label: "Calendario",
      value: plan.calendarCheck?.sufficientHours ? "Viable" : "Revisar",
      note: `${fmt(plan.calendarCheck?.availableHours || 0)} h disponibles`,
    },
  ]);

  el("planTimeline").innerHTML = `<div class="timeline-stack">${plan.stagePlan.map((item) => {
    const stage = stageForId(item.stageId);
    return `
      <div class="timeline-item">
        <h4>${esc(item.stageName)}</h4>
        <div class="mini">Inicio: ${esc(item.startedAt)}</div>
        <div class="mini">Fin: ${esc(item.endedAt)}</div>
        <div class="mini">Duracion: ${esc(nullable(item.durationHours, " h", 1))}</div>
        <div class="helper-line"><b>Transforma:</b> ${esc(stageConversionLabel(stage, executionSummaryForStage(item.stageId)))}</div>
        <div class="helper-line"><b>Personas:</b> ${esc(stagePeopleLabel(stage))} | <b>Horas-persona:</b> ${esc(nullable(operatorHoursForStage(stage), " h", 1))}</div>
        <div class="helper-line"><b>Materiales:</b> ${esc(summarizeRequirements(item.stageId))}</div>
        <div class="helper-line"><b>Soporte:</b> ${esc(stageResourcesSummary(stage))}</div>
      </div>
    `;
  }).join("")}</div>`;

  el("planNotes").innerHTML = `
    <div class="plain-list">
      <div class="plan-note"><b>Lectura simple:</b> El lote ${esc(batch.batchCode)} sigue ${esc(plan.stagePlan.length)} pasos desde su entrada hasta el producto final.</div>
      <div class="plan-note"><b>Horas requeridas:</b> ${esc(nullable(plan.calendarCheck?.requiredHours))} h frente a ${esc(nullable(plan.calendarCheck?.availableHours))} h disponibles.</div>
      <div class="plan-note"><b>Area requerida:</b> ${esc(nullable(plan.calendarCheck?.peakRequiredAreaM2, " m2"))} frente a ${esc(nullable(plan.calendarCheck?.minimumAvailableAreaM2, " m2"))} disponibles.</div>
      <div class="plan-note"><b>Recursos compartidos:</b> ${esc((plan.calendarCheck?.competingBatchIds || []).join(", ") || "Sin conflictos registrados")}</div>
    </div>
  `;

  const checklistItems = buildPlanChecklist(flowStages, batch, plan, bottleneck);
  el("startChecklist").innerHTML = `<div class="check-grid">${checklistItems.map((item) => `
    <div class="check-item">
      <span class="check-bullet"></span>
      <div>${esc(item)}</div>
    </div>
  `).join("")}</div>`;
}

function renderNeedsDidactic() {
  const requirements = state.view.requirements;
  const warehouse = state.view.warehouse;
  if (!requirements) {
    el("requirementsTable").innerHTML = "";
    el("warehouseCard").innerHTML = `<div class="empty">Selecciona un lote para ver materiales y bodega.</div>`;
    return;
  }

  el("requirementsTable").innerHTML = requirements.items.map((item) => `
    <tr>
      <td>${esc(item.materialName)}</td>
      <td>${esc(item.materialType)}</td>
      <td>${esc(stageName(item.stageId))}</td>
      <td>${esc(nullable(item.netQuantity))}</td>
      <td>${esc(nullable(item.grossQuantity))}</td>
      <td>${esc(item.unitCode)}</td>
    </tr>
  `).join("");

  const byStage = stagesForFlow(state.flowId).map((stage) => ({
    stage,
    items: requirementsForStage(stage.id),
  })).filter((item) => item.items.length);

  el("warehouseCard").innerHTML = `
    <div class="plain-list">
      <div class="warehouse-block"><b>Zona sugerida:</b> ${esc(warehouse?.warehouseZone || "general")}</div>
      <div class="warehouse-block"><b>Area requerida:</b> ${esc(nullable(warehouse?.requiredAreaM2, " m2"))}</div>
      <div class="warehouse-block"><b>Volumen:</b> ${esc(nullable(warehouse?.requiredVolumeM3, " m3"))}</div>
      <div class="warehouse-block"><b>Posiciones:</b> ${esc(nullable(warehouse?.requiredPositions, "", 0))}</div>
    </div>
    <div class="needs-stage-list">
      ${byStage.map(({ stage, items }) => `
        <article class="needs-stage">
          <h4>${esc(stage.sequence)}. ${esc(stage.name)}</h4>
          <div class="helper-line"><b>Transforma:</b> ${esc(stageConversionLabel(stage, executionSummaryForStage(stage.id)))}</div>
          <div class="helper-line"><b>Materiales:</b> ${esc(items.map((item) => `${item.materialName} (${nullable(item.grossQuantity)} ${item.unitCode})`).join(" | "))}</div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderMasterPlanDidactic() {
  const rows = masterPlanRows();
  const conflicts = masterConflicts(rows);
  const strongConflicts = conflicts.filter((item) => item.conflict);
  const familyCounts = rows.reduce((acc, item) => {
    const familyKey = normalizeFamilyKey(item.family);
    acc[familyKey] = (acc[familyKey] || 0) + 1;
    return acc;
  }, {});
  const topFamilies = Object.entries(familyCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  renderKpis("masterKpis", [
    { label: "Lotes cargados", value: String(rows.length), note: "Portafolio visible en planta" },
    ...topFamilies.map(([familyKey, count]) => ({
      label: familyDisplayName(familyKey),
      value: String(count),
      note: `Lotes de ${familyDisplayName(familyKey).toLowerCase()}`,
    })),
  ]);

  el("masterPlanBoard").innerHTML = `
    <div class="master-grid">
      ${rows.map((row) => `
        <article class="master-card tone-${row.family}">
          <div class="master-top">
            <h4>${esc(row.label)}</h4>
              <span class="pill">${esc(row.start || "Sin fecha")} → ${esc(row.end || "Sin fecha")}</span>
          </div>
          <div class="helper-line"><b>Proceso:</b> ${esc(row.flow?.name || "Sin flujo")}</div>
          <div class="helper-line"><b>Etapas:</b> ${esc(row.stages.map((stage) => stage.name).join(" | "))}</div>
          <div class="helper-line"><b>Tiempo total:</b> ${esc(nullable(row.totalHours, " h", 1))}</div>
          <div class="helper-line"><b>Horas-persona:</b> ${esc(nullable(row.peopleHours, " h", 1))}</div>
            <div class="helper-line"><b>Empaque compartido:</b> ${esc(row.sharedPack ? "Si" : "No")}</div>
        </article>
      `).join("")}
    </div>
  `;

  el("masterConflictBoard").innerHTML = `
    <div class="plain-list">
      ${conflicts.map((item) => `
        <div class="conflict-card ${item.conflict ? "is-conflict" : "is-clear"}">
          <div class="trace-card-head">
            <h4>${esc(item.date)}</h4>
            <span class="signal ${item.conflict ? "red" : "green"}">${esc(item.conflict ? "Choque" : "Libre")}</span>
          </div>
          <div class="helper-line"><b>Lotes:</b> ${esc(item.items.map((row) => row.batch.batchCode).join(", "))}</div>
          <div class="helper-line"><b>Productos:</b> ${esc(item.items.map((row) => productName(row.batch.productId)).join(" | "))}</div>
          <div class="helper-line"><b>Lectura:</b> ${esc(item.conflict ? "Dos o mas lotes quieren usar recurso de empaque compartido." : "No se detecta choque fuerte en esta fecha.")}</div>
        </div>
      `).join("")}
      <div class="impact-card tone-generic">
        <div class="impact-title">Ejemplo de decision</div>
        <div class="impact-note">Si cafe, cacao y aceite cierran cerca de la misma fecha, la app marca el empaque compartido en rojo y sugiere mover uno de los lotes para evitar cola.</div>
        <div class="impact-value">${esc(String(strongConflicts.length))} conflicto(s) detectado(s)</div>
      </div>
    </div>
  `;
}

function renderImproveDidactic() {
  const waste = state.view.waste;
  const bottleneck = state.view.bottleneck;
  const stages = stagesForFlow(state.flowId);
  const highestWaste = [...(waste?.stageSummaries || [])].sort((a, b) => num(b.wasteQuantity) - num(a.wasteQuantity))[0];
  const longestStage = [...stages].sort((a, b) => durationHoursForStage(b) - durationHoursForStage(a))[0];
  const mostPeopleStage = [...stages].sort((a, b) => num(b.operatorCount) - num(a.operatorCount))[0];
  const competing = state.view.plan?.calendarCheck?.competingBatchIds?.length || 0;

  renderKpis("improveKpis", [
    {
      label: "Mayor merma",
      value: highestWaste ? stageName(highestWaste.stageId) : "N/D",
      note: highestWaste ? `${fmt(highestWaste.wasteQuantity)} ${highestWaste.wasteUnitCode || ""}` : "Sin dato",
    },
    {
      label: "Etapa mas lenta",
      value: longestStage?.name || "N/D",
      note: longestStage ? `${fmt(durationHoursForStage(longestStage), 1)} h` : "Sin dato",
    },
    {
      label: "Mas personas",
      value: mostPeopleStage?.name || "N/D",
      note: mostPeopleStage ? `${fmt(num(mostPeopleStage.operatorCount), 0)} persona(s)` : "Sin dato",
    },
    {
      label: "Conflictos",
      value: String(competing),
      note: "Lotes compitiendo por recursos",
    },
  ]);

  const actionsList = [
    bottleneck?.bottleneckStageName ? `Revisar como acelerar ${bottleneck.bottleneckStageName} sin subir merma.` : "Revisar la etapa limitante del flujo.",
    highestWaste ? `Analizar por que ${stageName(highestWaste.stageId)} concentra la mayor merma y que control podria reforzarse.` : "Registrar merma por etapa para comparar mejor.",
    mostPeopleStage ? `Revisar balance de personas en ${mostPeopleStage.name} para evitar espera o sobrecarga.` : "Medir personas reales por etapa.",
    competing ? "Separar la ventana de empaque o reorganizar lotes competidores." : "No hay conflicto fuerte de recursos hoy.",
  ];

  el("improveActions").innerHTML = `<div class="plain-list">${actionsList.map((item) => `
    <div class="improve-card">${esc(item)}</div>
  `).join("")}</div>`;

  const currentCapacity = num(state.view.capacity?.estimatedFlowCapacity);
  const improvedCapacity = currentCapacity * 1.15;
  const currentWaste = num(highestWaste?.wasteQuantity);
  const reducedWaste = currentWaste * 0.85;
  const currentPeopleHours = mostPeopleStage ? operatorHoursForStage(mostPeopleStage) : 0;
  const optimizedPeopleHours = currentPeopleHours * 0.9;
  el("improveScenarios").innerHTML = `
    <div class="plain-list">
      <div class="improve-card"><h4>Si mejoras 15% la etapa limitante</h4><div class="plain-note">El flujo podria pasar de ${esc(nullable(currentCapacity))} a ${esc(nullable(improvedCapacity))} ${esc(state.view.capacity?.bottleneck?.capacityUnitCode || "")} por dia.</div></div>
      <div class="improve-card"><h4>Si bajas 15% la mayor merma</h4><div class="plain-note">La perdida principal bajaria de ${esc(nullable(currentWaste))} a ${esc(nullable(reducedWaste))} ${esc(highestWaste?.wasteUnitCode || "")}.</div></div>
      <div class="improve-card"><h4>Si ordenas mejor personas y soporte</h4><div class="plain-note">La fase mas cargada podria bajar de ${esc(nullable(currentPeopleHours, " h", 1))} a ${esc(nullable(optimizedPeopleHours, " h", 1))} en horas-persona.</div></div>
    </div>
  `;
}

function conflictTone(value = "") {
  const normalized = normalizeText(value);
  if (normalized.includes("high") || normalized.includes("alto")) return "red";
  if (normalized.includes("medium") || normalized.includes("medio")) return "yellow";
  return "green";
}

function getDemoProducts() {
  const entries = getReferenceProductEntries();
  return entries.length
    ? entries
    : PRODUCT_ORDER.map((key) => [key, getReferenceProductsMap()[key]]).filter(([, product]) => Boolean(product));
}

function getCurrentProduct() {
  return getReferenceProductsMap()[state.productKey] || null;
}

function getRoleGroupFromStage(stage) {
  const role = normalizeText(stage.role);
  if (role.includes("empaque")) return "packing";
  if (role.includes("calidad")) return "quality";
  if (role.includes("tostador")) return "roasting";
  if (role.includes("destil")) return "extraction";
  if (role.includes("formul")) return "formulation";
  if (role.includes("chocolate")) return "chocolate";
  if (role.includes("supervis")) return "supervision";
  return "ops";
}

function getProductLotPrefix(product) {
  const family = normalizeFamilyKey(product.family);
  if (family === "coffee") return "CAF";
  if (family === "cacao") return "CHO";
  if (family === "oil") return "ACE";
  if (family === "cream") return "CRM";
  return "LOT";
}

function getSuggestedAssignments(stage) {
  const roleGroup = getRoleGroupFromStage(stage);
  const needed = Math.max(1, num(String(stage.people).split(" ")[0]) || 1);
  const matching = getReferencePersonnel().filter((person) => person.roleGroup === roleGroup);
  if (!matching.length) return [];
  return matching.slice(0, needed);
}

function loadTone(hours, target, extra) {
  if (hours > target + extra) return "red";
  if (hours > target) return "yellow";
  return hours > 0 ? "green" : "generic";
}

function getSeverityTone(sharePct, isLead) {
  if (isLead || sharePct >= 45) return "red";
  if (sharePct >= 25) return "yellow";
  return "green";
}

function parseHourValue(text = "") {
  const match = String(text || "").replace(",", ".").match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function parseCountValue(text = "") {
  const match = String(text || "").match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function parseConflictList(text = "") {
  return String(text || "")
    .split(/[\n,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferSharedEquipment(stage = {}) {
  const candidates = unique([
    stage.machine,
    stage.zone,
    stage.site,
    ...parseConflictList(stage.conflicts),
  ].filter(Boolean));
  return candidates
    .map((candidate) => findSharedResourceByName(candidate))
    .filter(Boolean)
    .map((item) => item.name);
}

function buildCapacityMatrixProductFromReference(productKey, product) {
  if (!product) return null;
  const normalizedFamily = normalizeFamilyKey(product.family);
  const stages = [...(product.stages || [])]
    .map((stage, index) => ({ ...stage, seq: num(stage.seq) || index + 1 }))
    .sort((a, b) => num(a.seq) - num(b.seq));
  const subflows = (product.subflows || []).length
    ? product.subflows
    : unique(stages.map((stage) => stage.subflow).filter(Boolean)).map((name) => ({ name, purpose: "", stages: [] }));
  const subprocesses = subflows.map((subflow, subflowIndex) => {
    const stageNames = new Set(subflow.stages || []);
    const relatedStages = stages.filter((stage) =>
      stage.subflow === subflow.name
      || stageNames.has(stage.name)
    );
    const totalHours = relatedStages.reduce((sum, stage) => sum + parseHourValue(stage.time), 0);
    return {
      code: `${productKey}-S${subflowIndex + 1}`,
      name: subflow.name || `Subproceso ${subflowIndex + 1}`,
      purpose: subflow.purpose || "",
      bottleneckCandidate: normalizeText(product.bottleneck).includes(normalizeText(subflow.name || "")),
      stages: relatedStages.map((stage, stageIndex) => {
        const people = Math.max(1, parseCountValue(stage.people) || parseCountValue(stage.peopleHours));
        const peopleHours = parseHourValue(stage.peopleHours);
        const durationHours = Math.max(0.5, parseHourValue(stage.time) || (peopleHours > 0 && people > 0 ? peopleHours / people : 1));
        const setupHours = 0;
        const cleanupHours = 0;
        const changeoverHours = 0;
        const inputMeasure = parseDemoQuantity(stage.inputQty || "");
        const outputMeasure = parseDemoQuantity(stage.outputQty || "");
        return {
          seq: num(stage.seq) || stageIndex + 1,
          stageName: stage.name || `Etapa ${stageIndex + 1}`,
          zone: stage.zone || stage.site || "Zona no definida",
          line: stage.line || "Linea no definida",
          mainEquipment: stage.machine || "Equipo no definido",
          sharedEquipment: inferSharedEquipment(stage),
          durationHours,
          setupHours,
          cleanupHours,
          changeoverHours,
          operatorsRequired: people,
          supervisorsRequired: stage.role ? 1 : 0,
          capacityPerRun: outputMeasure.amount || inputMeasure.amount || 1,
          capacityUnit: outputMeasure.unit || inputMeasure.unit || "unidad",
          outputPerRun: outputMeasure.amount || inputMeasure.amount || 1,
          outputUnit: outputMeasure.unit || inputMeasure.unit || "unidad",
          conflictReasons: parseConflictList(stage.conflicts),
        };
      }),
      totalHours,
    };
  }).filter((subflow) => subflow.stages.length);
  const resolvedSubprocesses = subprocesses.length
    ? subprocesses
    : [{
        code: `${productKey}-S1`,
        name: "Proceso principal",
        purpose: "Ruta principal del producto",
        bottleneckCandidate: true,
        totalHours: stages.reduce((sum, stage) => sum + parseHourValue(stage.time), 0),
        stages: stages.map((stage, index) => ({
          seq: num(stage.seq) || index + 1,
          stageName: stage.name || `Etapa ${index + 1}`,
          zone: stage.zone || stage.site || "Zona no definida",
          line: stage.line || "Linea no definida",
          mainEquipment: stage.machine || "Equipo no definido",
          sharedEquipment: inferSharedEquipment(stage),
          durationHours: Math.max(0.5, parseHourValue(stage.time) || 1),
          setupHours: 0,
          cleanupHours: 0,
          changeoverHours: 0,
          operatorsRequired: Math.max(1, parseCountValue(stage.people) || 1),
          supervisorsRequired: stage.role ? 1 : 0,
          capacityPerRun: parseDemoQuantity(stage.outputQty || stage.inputQty || "").amount || 1,
          capacityUnit: parseDemoQuantity(stage.outputQty || stage.inputQty || "").unit || "unidad",
          outputPerRun: parseDemoQuantity(stage.outputQty || stage.inputQty || "").amount || 1,
          outputUnit: parseDemoQuantity(stage.outputQty || stage.inputQty || "").unit || "unidad",
          conflictReasons: parseConflictList(stage.conflicts),
        })),
      }];
  const bottleneckSubprocess = resolvedSubprocesses.find((item) => item.bottleneckCandidate)
    || [...resolvedSubprocesses].sort((a, b) =>
      b.stages.reduce((sum, stage) => sum + num(stage.durationHours), 0)
      - a.stages.reduce((sum, stage) => sum + num(stage.durationHours), 0)
    )[0];
  if (bottleneckSubprocess) bottleneckSubprocess.bottleneckCandidate = true;
  return {
    productKey,
    productName: product.title || productKey,
    originOptions: product.origins || [],
    periodBase: {
      operatingDaysWeek: num(product.operatingDays?.week) || 5,
      hoursPerDay: 24,
      shiftsPerDay: 3,
      workMode: normalizedFamily === "generic" ? "ajustable" : "continuo",
    },
    subprocesses: resolvedSubprocesses,
  };
}

function getCapacityMatrixProduct(productKey) {
  const fixedMatrix = CAPACITY_MATRIX.products.find((item) => item.productKey === productKey);
  if (fixedMatrix) return fixedMatrix;
  return buildCapacityMatrixProductFromReference(productKey, getReferenceProductsMap()[productKey] || null);
}

function summarizeProductPlanInput(productKey) {
  const matrixProduct = getCapacityMatrixProduct(productKey);
  if (!matrixProduct) return null;
  const allStages = matrixProduct.subprocesses.flatMap((subprocess) => subprocess.stages);
  const allShared = unique(allStages.flatMap((stage) => stage.sharedEquipment || []).filter(Boolean));
  const bottleneckSubprocess = matrixProduct.subprocesses.find((subprocess) => subprocess.bottleneckCandidate)
    || [...matrixProduct.subprocesses].sort((a, b) =>
      b.stages.reduce((sum, stage) => sum + num(stage.durationHours), 0)
      - a.stages.reduce((sum, stage) => sum + num(stage.durationHours), 0)
    )[0];
  const bottleneckHours = bottleneckSubprocess
    ? bottleneckSubprocess.stages.reduce((sum, stage) => sum + num(stage.durationHours) + num(stage.setupHours) + num(stage.cleanupHours) + num(stage.changeoverHours), 0)
    : 0;
  const keyEquipment = unique((bottleneckSubprocess?.stages || []).map((stage) => stage.mainEquipment)).slice(0, 2);
  return {
    matrixProduct,
    allStages,
    allShared,
    bottleneckSubprocess,
    bottleneckHours,
    keyEquipment,
  };
}

function getSharedFamilies(item) {
  return unique((item?.usedBy || []).map((entry) => String(entry).split("-")[0]?.trim()).filter(Boolean));
}

function getSharedImpactProfile(item) {
  const families = getSharedFamilies(item);
  const familyCount = families.length;
  const baseHours = item.severity === "high" ? 14 : item.severity === "medium" ? 8 : 4;
  const impactHours = baseHours + Math.max(0, familyCount - 1) * 2;
  const capacityDrop = item.severity === "high" ? 30 : item.severity === "medium" ? 18 : 10;
  return {
    families,
    familyCount,
    impactHours,
    capacityDrop,
    severityLabel: item.severity === "high" ? "Alta" : item.severity === "medium" ? "Media" : "Baja",
  };
}

function getSharedDecision(item) {
  const name = normalizeText(item?.name || "");
  if (name.includes("secador")) {
    return {
      blocks: "Cafe y cacao cuando ambos buscan secado final en la misma ventana.",
      move: "Separar cafe y cacao por dia o por turno termico completo.",
      window: "Una familia por jornada de secado.",
    };
  }
  if (name.includes("sala termica")) {
    return {
      blocks: "Cafe, cacao y aceite si intentan usar calor seguro al mismo tiempo.",
      move: "Definir una sola familia termica por bloque y dejar limpieza entre cambios.",
      window: "Manana cafe o cacao; tarde aceite, nunca simultaneo.",
    };
  }
  if (name.includes("molienda")) {
    return {
      blocks: "Cafe y cacao por polvo, aroma y riesgo de contaminacion cruzada.",
      move: "Moler una sola familia por ventana y limpiar antes del siguiente producto.",
      window: "Secuencia cerrada por familia en la sala de molienda.",
    };
  }
  if (name.includes("empaque")) {
    return {
      blocks: "El cierre comercial de cafe, chocolate, aceite y crema.",
      move: "Priorizar primero el lote con entrega mas urgente y mover los otros a ventanas separadas.",
      window: "Una familia por bloque de empaque con cambio de formato entre lotes.",
    };
  }
  if (name.includes("extractos") || name.includes("cosmetica")) {
    return {
      blocks: "Aceite y crema cuando comparten ambiente sensible a olor y limpieza.",
      move: "Correr aceite y crema en jornadas separadas con sanitizacion intermedia.",
      window: "Bloques secuenciales, no paralelos, por sensibilidad sensorial.",
    };
  }
  if (name.includes("bodega")) {
    return {
      blocks: "Lotes intermedios de cafe, cacao y crema cuando el WIP crece sin liberar espacio.",
      move: "Liberar primero el lote mas antiguo y limitar acumulacion simultanea.",
      window: "Capacidad controlada por familia y por rotacion.",
    };
  }
  return {
    blocks: "Procesos que comparten recurso o zona sensible.",
    move: "Secuenciar por prioridad y limpiar entre familias.",
    window: "Una familia por ventana operativa.",
  };
}

function getDayActiveFamilies(item) {
  if (Array.isArray(item?.activeFamilies) && item.activeFamilies.length) {
    return item.activeFamilies.map((family) => ({
      field: family.key,
      key: family.key,
      label: family.label,
      activity: family.activity,
    }));
  }
  const legacyFields = ["coffee", "cacao", "oil", "cream"];
  return legacyFields
    .filter((field) => String(item?.[field] || "").trim())
    .map((field) => ({
      field,
      key: field,
      label: familyDisplayName(field),
      activity: String(item[field] || "").trim(),
    }));
}

function formatFamilyList(labels = []) {
  const clean = unique(labels.filter(Boolean));
  if (!clean.length) return "la familia activa";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} y ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} y ${clean[clean.length - 1]}`;
}

function getDaySlotStateSummary(item) {
  const slots = Array.isArray(item?.slotPlan) && item.slotPlan.length ? item.slotPlan : [];
  const moving = slots.filter((slot) => slot.state === "Mover");
  const adjusting = slots.filter((slot) => slot.state === "Ajustar");
  const running = slots.filter((slot) => slot.state === "Corre");
  return { slots, moving, adjusting, running };
}

function getWeeklyDayAction(item) {
  const shared = normalizeText(item?.shared || "");
  const { moving, adjusting, running, slots } = getDaySlotStateSummary(item);
  const movedLabels = formatFamilyList(moving.map((slot) => slot.label));
  const adjustedLabels = formatFamilyList(adjusting.map((slot) => slot.label));
  const runningLabels = formatFamilyList(running.map((slot) => slot.label));
  const dominantSlot = moving[0] || adjusting[0] || slots[0];
  const status = moving.length ? "Mover" : adjusting.length ? "Ajustar" : "Cabe";

  if (shared.includes("empaque")) {
    return {
      status,
      move: moving.length
        ? `Mover ${movedLabels} a la siguiente ventana de empaque y proteger primero ${runningLabels}.`
        : adjusting.length
          ? `Ajustar ${adjustedLabels} por secuencia de empaque y sanitizacion.`
          : `Mantener ${runningLabels} en la secuencia actual de empaque.`,
      window: moving.length
        ? `${movedLabels} pasa a reserva o al siguiente dia con empaque libre.`
        : "Correr una sola familia por ventana de empaque.",
      reserve: moving.length
        ? "Usar la reserva para familias no prioritarias de empaque."
        : "Reservar solo limpieza y cierre de formato.",
    };
  }
  if (shared.includes("secador")) {
    return {
      status,
      move: moving.length
        ? `Mover ${movedLabels} y dejar ${runningLabels} cerrar primero el secador.`
        : adjusting.length
          ? `Ajustar ${adjustedLabels} y descargar el secador antes de recibir otro lote.`
          : `Mantener ${runningLabels} en su ventana principal de secado.`,
      window: moving.length
        ? `${movedLabels} pasa al siguiente bloque termico o a ventana de fin de semana.`
        : "Una familia por cierre completo del secador.",
      reserve: "La reserva se usa para secado alterno y estabilizacion.",
    };
  }
  if (shared.includes("sala termica")) {
    return {
      status,
      move: moving.length
        ? `Mover ${movedLabels} fuera de la sala termica y separar ${runningLabels} por turnos.`
        : adjusting.length
          ? `Ajustar ${adjustedLabels} dentro del mismo dia, sin paralelo termico.`
          : `Mantener ${runningLabels} por turnos termicos separados.`,
      window: moving.length
        ? `${movedLabels} pasa a bloque nocturno o a la siguiente ventana termica libre.`
        : "Separar familias por turnos, no por paralelo.",
      reserve: "La reserva absorbe la tercera familia termica del dia.",
    };
  }
  if (shared.includes("bodega")) {
    return {
      status,
      move: moving.length
        ? `Mover ${movedLabels} y liberar primero el lote mas antiguo en bodega intermedia.`
        : adjusting.length
          ? `Ajustar ${adjustedLabels} por rotacion y capacidad de pallets.`
          : `Mantener ${runningLabels} con rotacion normal de WIP.`,
      window: moving.length
        ? `${movedLabels} pasa a la siguiente ventana de descarga o maduracion.`
        : "Rotacion por antiguedad del lote y liberacion de espacio.",
      reserve: "La reserva se usa para descargar WIP acumulado.",
    };
  }
  return {
    status,
    move: moving.length
      ? `Mover ${movedLabels} y proteger primero ${runningLabels || dominantSlot?.label || "la familia prioritaria"}.`
      : adjusting.length
        ? `Ajustar ${adjustedLabels} y validar limpieza entre cambios.`
        : `Mantener ${runningLabels || dominantSlot?.label || "la familia activa"} sin cambios.`,
    window: moving.length
      ? `${movedLabels} pasa al siguiente bloque libre del recurso comun.`
      : "Ventanas separadas por recurso comun.",
    reserve: moving.length
      ? `Reserva usada por ${movedLabels}.`
      : "Usar bloque de reserva solo si el conflicto persiste.",
  };
}

function buildWeeklySlots(item) {
  if (Array.isArray(item?.slotPlan) && item.slotPlan.length) {
    return item.slotPlan;
  }
  const activeFamilies = getDayActiveFamilies(item);
  return activeFamilies.map((entry, index) => ({
    slot: PLAN_SLOT_LABELS[Math.min(index, PLAN_SLOT_LABELS.length - 1)],
    ...entry,
    state: index === 0 ? "Corre" : index === 1 ? "Ajustar" : "Mover",
    shared: item?.shared || "Ventana operativa",
  }));
}

function getProductCommitment(productKey, product, dayPlan = []) {
  const weekly = parseDemoQuantity(product?.weeklyCapacity || "");
  const affectedDays = dayPlan.filter((item) => buildWeeklySlots(item).some((slot) => slot.key === productKey));
  const relatedSlots = affectedDays.flatMap((item) =>
    buildWeeklySlots(item)
      .filter((slot) => slot.key === productKey)
      .map((slot) => ({ ...slot, conflict: String(item.conflict || "Low") }))
  );
  const moveCount = relatedSlots.filter((slot) => slot.state === "Mover").length;
  const adjustCount = relatedSlots.filter((slot) => slot.state === "Ajustar").length;
  const high = relatedSlots.filter((slot) => slot.conflict === "High").length;
  const medium = relatedSlots.filter((slot) => slot.conflict === "Medium").length;
  const requiredHours = relatedSlots.reduce((sum, slot) => sum + num(slot.requiredHours), 0);
  const assignedHours = relatedSlots.reduce((sum, slot) => sum + num(slot.assignedHours), 0);
  const slotCoverage = requiredHours > 0 ? assignedHours / requiredHours : 1;
  const slotPenalty = Math.max(0, 1 - slotCoverage) * 0.45;
  const penalty = Math.min(0.7, moveCount * 0.18 + adjustCount * 0.08 + high * 0.04 + medium * 0.02 + slotPenalty);
  const committedAmount = weekly.amount === null ? null : weekly.amount * (1 - penalty);
  return {
    nominal: weekly,
    penaltyPct: penalty * 100,
    committedAmount,
    committedLabel: committedAmount === null ? "N/D" : `${fmt(committedAmount, committedAmount % 1 === 0 ? 0 : 1)} ${weekly.unit}`.trim(),
    moveCount,
    adjustCount,
    highCount: high,
    mediumCount: medium,
    slotCoveragePct: slotCoverage * 100,
    requiredHours,
    assignedHours,
  };
}

function getProductPeopleHours(product) {
  return (product?.stages || []).reduce((sum, stage) => sum + num(String(stage.peopleHours || "").replace(" h-persona", "")), 0);
}

function buildScenarioPersonnelSummary(scenarioData) {
  const activeDays = new Set((scenarioData.scenario.weekdays || []).filter(Boolean));
  const hourScale = scenarioData.totalHoursPerDay / 8;
  const dayLoadFactor = PLAN_WEEKDAYS.reduce((acc, day) => {
    const matchingRows = (scenarioData.plan || []).filter((item) => item.weekdayKey === day.key);
    const avgFamilies = matchingRows.length
      ? matchingRows.reduce((sum, item) => sum + getDayActiveFamilies(item).length, 0) / matchingRows.length
      : 0;
    acc[day.key] = avgFamilies > 0 ? Math.max(0.35, avgFamilies / Math.max(getDemoProducts().length, 1)) : 0;
    return acc;
  }, {});
  const personnel = getReferencePersonnel().map((person) => {
    const baseLoad = getReferencePersonnelLoad().find((item) => item.personCode === person.code) || {};
    const dayLoads = PLAN_WEEKDAYS.map((day) => {
      const raw = activeDays.has(day.key) ? num(baseLoad[day.key]) * hourScale * (dayLoadFactor[day.key] || 0) : 0;
      return [day.key, Math.round(raw * 10) / 10];
    });
    const maxDay = Math.max(...dayLoads.map(([, hours]) => hours), 0);
    const total = dayLoads.reduce((sum, [, hours]) => sum + hours, 0);
    return {
      person,
      dayLoads,
      maxDay,
      total,
      tone: loadTone(maxDay, person.targetHoursPerDay, person.maxExtraHours),
    };
  });
  const overloadCount = personnel.filter((item) => item.maxDay > item.person.targetHoursPerDay + item.person.maxExtraHours).length;
  const extraCount = personnel.filter((item) => item.maxDay > item.person.targetHoursPerDay && item.maxDay <= item.person.targetHoursPerDay + item.person.maxExtraHours).length;
  const overloadRate = personnel.length ? overloadCount / personnel.length : 0;
  const extraRate = personnel.length ? extraCount / personnel.length : 0;
  const availableHours = personnel.reduce((sum, item) => sum + (item.person.targetHoursPerDay + item.person.maxExtraHours) * scenarioData.workDays, 0);
  const plannedHours = personnel.reduce((sum, item) => sum + item.total, 0);
  return {
    personnel,
    overloadCount,
    extraCount,
    overloadRate,
    extraRate,
    availableHours,
    plannedHours,
  };
}

function getSelectedPlanProducts() {
  const selected = new Set(state.planScenario.selectedProducts || []);
  return getDemoProducts().filter(([key]) => selected.has(key));
}

function buildScenarioWindow(periodOverride = state.planScenario.period) {
  const scenario = state.planScenario;
  const periodCfg = PLAN_PERIOD_OPTIONS[periodOverride] || PLAN_PERIOD_OPTIONS.week;
  const selectedWeekdays = PLAN_WEEKDAYS.filter((day) => (scenario.weekdays || []).includes(day.key));
  const workDays = selectedWeekdays.length || 1;
  const plannedDays = workDays * periodCfg.multiplier;
  const workedHoursPerDay = Math.max(1, Number(scenario.baseHours) || 8);
  const extraHours = Math.max(0, Number(scenario.extraHours) || 0);
  const shifts = Math.max(1, Number(scenario.shifts) || 1);
  const totalHoursPerDay = (workedHoursPerDay + extraHours) * shifts;
  const hourFactor = totalHoursPerDay / 8;
  const dayFactor = plannedDays / 7;
  const projectionFactor = dayFactor * hourFactor;
  return {
    scenario,
    periodCfg,
    selectedWeekdays,
    workDays,
    plannedDays,
    workedHoursPerDay,
    extraHours,
    shifts,
    totalHoursPerDay,
    projectionFactor,
  };
}

function findSharedResourceByName(resourceName = "") {
  const normalized = normalizeText(resourceName);
  if (!normalized) return null;
  return getReferenceSharedResources().find((item) => {
    const itemName = normalizeText(item.name);
    return itemName.includes(normalized) || normalized.includes(itemName);
  }) || null;
}

function getActiveSharedResources(selectedKeys = []) {
  const activeFamilies = new Set(selectedKeys);
  return getReferenceSharedResources()
    .map((item) => {
      const filteredUsedBy = (item.usedBy || []).filter((entry) => {
        const family = normalizeFamilyKey(String(entry).split("-")[0] || "");
        const mappedKey = family;
        return activeFamilies.has(mappedKey);
      });
      return { ...item, usedBy: filteredUsedBy };
    })
    .filter((item) => item.usedBy.length > 0);
}

function buildScenarioProductRoute(productKey, product, dayIndex = 0, offset = 0) {
  const matrixInfo = summarizeProductPlanInput(productKey);
  const subprocesses = matrixInfo?.matrixProduct?.subprocesses || [];
  const route = subprocesses.length
    ? subprocesses
    : (product.subflows || []).map((subflow) => ({
        name: subflow.name,
        stages: (product.stages || [])
          .filter((stage) => stage.subflow === subflow.name)
          .map((stage) => ({
            name: stage.name,
            sharedEquipment: [],
            mainEquipment: stage.machine,
          })),
      }));
  if (!route.length) return null;
  const step = route[(dayIndex + offset) % route.length];
  const sharedCandidates = unique((step.stages || []).flatMap((stage) => stage.sharedEquipment || []).filter(Boolean));
  const primaryShared = sharedCandidates.map((name) => findSharedResourceByName(name)).find(Boolean) || null;
  const requiredHours = Math.max(0.5, (step.stages || []).reduce((sum, stage) =>
    sum
    + num(stage.durationHours)
    + num(stage.setupHours)
    + num(stage.cleanupHours)
    + num(stage.changeoverHours), 0));
  const peopleHours = Math.max(0.5, (step.stages || []).reduce((sum, stage) => {
    const stageHours = num(stage.durationHours) + num(stage.setupHours) + num(stage.cleanupHours) + num(stage.changeoverHours);
    const crew = num(stage.operatorsRequired) + num(stage.supervisorsRequired);
    return sum + stageHours * Math.max(crew, 1);
  }, 0));
  return {
    key: productKey,
    label: product.title || familyDisplayName(product.family) || productKey,
    subprocess: step.name,
    activity: (step.stages || []).map((stage) => stage.name).slice(0, 2).join(" / ") || step.name,
    sharedResource: primaryShared,
    priorityHours: requiredHours,
    requiredHours,
    peopleHours,
    matrixInfo,
  };
}

function buildScenarioSlotsForDay(routes, dominantResource, scenarioWindow) {
  const shifts = Math.max(1, num(scenarioWindow?.shifts) || 1);
  const baseHours = Math.max(1, num(scenarioWindow?.workedHoursPerDay) || 8);
  const extraHours = Math.max(0, num(scenarioWindow?.extraHours) || 0);
  const slotFrames = Array.from({ length: Math.min(shifts, PLAN_SLOT_LABELS.length) }, (_, index) => ({
    slot: PLAN_SLOT_LABELS[index],
    remainingHours: baseHours,
    sharedResources: new Set(),
  }));
  if (extraHours > 0 && slotFrames.length < PLAN_SLOT_LABELS.length) {
    slotFrames.push({
      slot: PLAN_SLOT_LABELS[slotFrames.length],
      remainingHours: extraHours * shifts,
      sharedResources: new Set(),
      isReserve: true,
    });
  }
  const dominantName = normalizeText(dominantResource?.name || "");
  const prioritized = [...routes].sort((a, b) => {
    const aDominant = normalizeText(a.sharedResource?.name || "") === dominantName ? 1 : 0;
    const bDominant = normalizeText(b.sharedResource?.name || "") === dominantName ? 1 : 0;
    return bDominant - aDominant || (b.priorityHours || 0) - (a.priorityHours || 0);
  });
  return prioritized.map((route) => {
    const sharedKey = normalizeText(route.sharedResource?.name || "");
    const requiredHours = Math.max(0.5, num(route.requiredHours) || num(route.priorityHours) || 1);
    const exactSlot = slotFrames.find((frame) =>
      frame.remainingHours >= requiredHours
      && (!sharedKey || !frame.sharedResources.has(sharedKey))
    );
    const partialSlot = slotFrames.find((frame) =>
      frame.remainingHours >= requiredHours * 0.45
      && (!sharedKey || !frame.sharedResources.has(sharedKey))
    );
    const assignedFrame = exactSlot || partialSlot || null;
    const state = exactSlot ? "Corre" : partialSlot ? "Ajustar" : "Mover";
    const slot = assignedFrame?.slot || PLAN_SLOT_LABELS[Math.min(slotFrames.length, PLAN_SLOT_LABELS.length - 1)] || "Reserva";
    const assignedHours = exactSlot
      ? requiredHours
      : partialSlot
        ? Math.max(0, partialSlot.remainingHours)
        : 0;
    if (assignedFrame) {
      assignedFrame.remainingHours = Math.max(0, assignedFrame.remainingHours - assignedHours);
      if (sharedKey) assignedFrame.sharedResources.add(sharedKey);
    }
    return {
      slot,
      key: route.key,
      label: route.label,
      activity: route.activity,
      state,
      shared: route.sharedResource?.name || "Ventana operativa",
      subprocess: route.subprocess,
      requiredHours,
      assignedHours,
      peopleHours: route.peopleHours || 0,
    };
  });
}

function buildScenarioPlanRows(selectedEntries, scenarioWindow) {
  if (!selectedEntries.length) return [];
  return Array.from({ length: scenarioWindow.plannedDays }, (_, index) => {
    const dayDef = scenarioWindow.selectedWeekdays[index % scenarioWindow.selectedWeekdays.length] || PLAN_WEEKDAYS[0];
    const cycle = Math.floor(index / Math.max(scenarioWindow.selectedWeekdays.length, 1)) + 1;
    const routes = selectedEntries
      .map(([key, product], productIndex) => buildScenarioProductRoute(key, product, index, productIndex))
      .filter(Boolean);
    const resourceBuckets = routes.reduce((acc, route) => {
      const bucketName = route.sharedResource?.name || "Ventana operativa";
      if (!acc[bucketName]) acc[bucketName] = { count: 0, resource: route.sharedResource };
      acc[bucketName].count += 1;
      return acc;
    }, {});
    const dominantBucket = Object.entries(resourceBuckets).sort((a, b) => {
      const severityA = a[1].resource?.severity === "high" ? 3 : a[1].resource?.severity === "medium" ? 2 : 1;
      const severityB = b[1].resource?.severity === "high" ? 3 : b[1].resource?.severity === "medium" ? 2 : 1;
      return b[1].count - a[1].count || severityB - severityA;
    })[0];
    const sharedResource = dominantBucket?.[1]?.resource || null;
    const sharedCount = dominantBucket?.[1]?.count || routes.length;
    const conflict = sharedCount >= 3 ? "High" : sharedCount === 2 ? "Medium" : "Low";
    const focus = sharedResource ? `Ventana de ${sharedResource.name}` : routes.map((route) => route.subprocess).slice(0, 2).join(" / ");
    const slotPlan = buildScenarioSlotsForDay(routes, sharedResource, scenarioWindow);
    const assignedHours = slotPlan.reduce((sum, slot) => sum + num(slot.assignedHours), 0);
    const requiredHours = slotPlan.reduce((sum, slot) => sum + num(slot.requiredHours), 0);
    const row = {
      day: scenarioWindow.periodCfg.multiplier > 1 ? `${dayDef.label} ${cycle}` : dayDef.label,
      weekdayKey: dayDef.key,
      focus,
      shared: sharedResource?.name || "Ventana operativa",
      conflict,
      why: sharedResource?.reason || (routes.length > 1
        ? "Varias familias comparten la misma ventana operativa y necesitan secuencia."
        : "Solo una familia activa en esta ventana."),
      slotPlan,
      activeFamilies: routes.map((route) => ({
        key: route.key,
        label: route.label,
        activity: route.activity,
      })),
      requiredHours,
      assignedHours,
      utilizationPct: requiredHours > 0 ? Math.min(100, (assignedHours / requiredHours) * 100) : 100,
    };
    return row;
  });
}

function buildPlanScenario() {
  const scenarioWindow = buildScenarioWindow();
  const selectedEntries = getSelectedPlanProducts();
  const selectedKeys = new Set(selectedEntries.map(([key]) => key));
  const plan = buildScenarioPlanRows(selectedEntries, scenarioWindow);
  const baseScenario = {
    ...scenarioWindow,
    selectedEntries,
    selectedKeys,
    plan,
  };
  return {
    ...baseScenario,
    personnelSummary: buildScenarioPersonnelSummary(baseScenario),
  };
}

function projectedCommitment(productKey, product, scenarioData) {
  const base = getProductCommitment(productKey, product, scenarioData.plan);
  const nominalAmount = base.nominal.amount === null ? null : base.nominal.amount * scenarioData.projectionFactor;
  const productPeopleHours = getProductPeopleHours(product);
  const scenarioRequiredHours = productPeopleHours * scenarioData.projectionFactor;
  const scenarioAvailableHours = Math.max(1, scenarioData.personnelSummary?.availableHours || 1);
  const staffingPenalty = Math.min(0.25, (scenarioData.personnelSummary?.overloadRate || 0) * 0.3 + (scenarioData.personnelSummary?.extraRate || 0) * 0.12);
  const laborCoverage = Math.min(1, scenarioAvailableHours / Math.max(scenarioRequiredHours, 1));
  const laborPenalty = Math.max(0, 1 - laborCoverage) * 0.35;
  const finalPenalty = Math.min(0.7, base.penaltyPct / 100 + staffingPenalty + laborPenalty);
  const committedAmount = nominalAmount === null ? null : nominalAmount * (1 - finalPenalty);
  const feasibility = committedAmount === null || nominalAmount === null || nominalAmount <= 0
    ? "N/D"
    : committedAmount / nominalAmount >= FEASIBILITY_THRESHOLDS.fit
      ? "Cabe"
      : committedAmount / nominalAmount >= FEASIBILITY_THRESHOLDS.adjust
        ? "Ajustar"
        : committedAmount / nominalAmount >= FEASIBILITY_THRESHOLDS.partial
          ? "Parcial"
          : "No cabe";
  const unit = base.nominal.unit || "";
  return {
    ...base,
    nominalProjected: nominalAmount,
    projectedLabel: nominalAmount === null ? "N/D" : `${fmt(nominalAmount, nominalAmount % 1 === 0 ? 0 : 1)} ${unit}`.trim(),
    committedProjected: committedAmount,
    committedProjectedLabel: committedAmount === null ? "N/D" : `${fmt(committedAmount, committedAmount % 1 === 0 ? 0 : 1)} ${unit}`.trim(),
    finalPenaltyPct: finalPenalty * 100,
    laborCoveragePct: laborCoverage * 100,
    feasibility,
    scenarioRequiredHours,
  };
}

function defaultProductDraft() {
  return {
    family: "generic",
    title: "",
    source: "",
    output: "",
    origins: [],
    operatingDays: { day: 1, week: 5, month: 20 },
    capacityByPeriod: { day: "", week: "", month: "" },
    weeklyCapacity: "",
    bottleneck: "",
    blockingReason: "",
    subflows: [],
    stages: [],
  };
}

function defaultSubflowDraft() {
  return {
    name: "",
    purpose: "",
    stages: [],
  };
}

function defaultStageDraft(sequence = 1) {
  return {
    seq: sequence,
    name: "",
    subflow: "",
    input: "",
    inputQty: "",
    output: "",
    outputQty: "",
    people: "",
    role: "",
    time: "",
    peopleHours: "",
    site: "",
    zone: "",
    line: "",
    machine: "",
    materials: "",
    controls: "",
    records: "",
    conflicts: "",
    reason: "",
  };
}

function createProductEditorDraft(productKey = state.productKey) {
  const source = productKey ? deepCopy(getReferenceProductsMap()[productKey] || defaultProductDraft()) : defaultProductDraft();
  return {
    key: productKey || "",
    family: normalizeFamilyKey(source.family || "generic"),
    title: source.title || "",
    source: source.source || "",
    output: source.output || "",
    origins: Array.isArray(source.origins) ? source.origins : [],
    operatingDays: {
      day: source.operatingDays?.day ?? 1,
      week: source.operatingDays?.week ?? 5,
      month: source.operatingDays?.month ?? 20,
    },
    capacityByPeriod: {
      day: source.capacityByPeriod?.day || "",
      week: source.capacityByPeriod?.week || "",
      month: source.capacityByPeriod?.month || "",
    },
    weeklyCapacity: source.weeklyCapacity || "",
    bottleneck: source.bottleneck || "",
    blockingReason: source.blockingReason || "",
    subflows: Array.isArray(source.subflows) && source.subflows.length ? source.subflows.map((item) => ({
      name: item.name || "",
      purpose: item.purpose || "",
      stages: Array.isArray(item.stages) ? item.stages : [],
    })) : [defaultSubflowDraft()],
    stages: Array.isArray(source.stages) && source.stages.length ? source.stages.map((item, index) => ({
      ...defaultStageDraft(index + 1),
      ...item,
      seq: num(item.seq) || index + 1,
    })) : [defaultStageDraft(1)],
  };
}

function ensureProductEditorDraft(force = false) {
  if (!state.productEditorDraft || force) {
    state.productEditorDraft = createProductEditorDraft();
  }
  if (!Array.isArray(state.productEditorDraft.origins)) state.productEditorDraft.origins = [];
  if (!Array.isArray(state.productEditorDraft.subflows) || !state.productEditorDraft.subflows.length) state.productEditorDraft.subflows = [defaultSubflowDraft()];
  if (!Array.isArray(state.productEditorDraft.stages) || !state.productEditorDraft.stages.length) state.productEditorDraft.stages = [defaultStageDraft(1)];
  return state.productEditorDraft;
}

function defaultSharedResourceDraft() {
  return {
    name: "",
    site: "",
    zone: "",
    line: "",
    usedBy: [],
    rule: "No simultaneo",
    reason: "",
    severity: "medium",
  };
}

function defaultPersonDraft() {
  return {
    code: "",
    name: "",
    roleGroup: "ops",
    workMode: "full",
    targetHoursPerDay: 8,
    maxExtraHours: 2,
    weeklyAvailability: "",
    zone: "",
  };
}

function serializeSubflows(subflows = []) {
  return subflows
    .map((subflow) => `${subflow.name || ""} | ${subflow.purpose || ""} | ${Array.isArray(subflow.stages) ? subflow.stages.join(", ") : ""}`)
    .join("\n");
}

function parseSubflows(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name = "", purpose = "", stages = ""] = line.split("|").map((item) => item.trim());
      return {
        name,
        purpose,
        stages: stages ? stages.split(",").map((item) => item.trim()).filter(Boolean) : [],
      };
    })
    .filter((item) => item.name);
}

function serializeStages(stages = []) {
  return stages
    .map((stage) => PRODUCT_EDITOR_STAGE_FIELDS.map((field) => String(stage[field] ?? "")).join(" | "))
    .join("\n");
}

function parseStages(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((item) => item.trim());
      const stage = {};
      PRODUCT_EDITOR_STAGE_FIELDS.forEach((field, index) => {
        stage[field] = parts[index] || "";
      });
      stage.seq = num(stage.seq) || 1;
      return stage;
    })
    .filter((stage) => stage.name);
}

function getEditableProductDraft() {
  return ensureProductEditorDraft();
}

function getEditableSharedResourceDraft() {
  const resource = getReferenceSharedResources().find((item) => item.name === state.sharedResourceName);
  return deepCopy(resource || defaultSharedResourceDraft());
}

function getEditablePersonDraft() {
  const person = getReferencePersonnel().find((item) => item.code === state.personnelCode);
  const load = getReferencePersonnelLoad().find((item) => item.personCode === state.personnelCode) || {};
  return {
    ...deepCopy(person || defaultPersonDraft()),
    load,
  };
}

function getProductEditorStepIndex(stepKey = state.productEditorStep) {
  return Math.max(0, PRODUCT_EDITOR_STEPS.findIndex((item) => item.key === stepKey));
}

function setProductEditorStep(stepKey) {
  if (!PRODUCT_EDITOR_STEPS.some((item) => item.key === stepKey)) return;
  state.productEditorStep = stepKey;
}

function renderProductEditor() {
  const entries = getDemoProducts();
  const draft = ensureProductEditorDraft();
  const currentKey = draft.key || state.productKey || "";
  const stepIndex = getProductEditorStepIndex();
  const activeStep = PRODUCT_EDITOR_STEPS[stepIndex] || PRODUCT_EDITOR_STEPS[0];
  const isStep = (key) => state.productEditorStep === key;
  el("productEditor").innerHTML = `
    <div class="editor-shell">
      <div class="editor-toolbar">
        <div class="field">
          <label>Producto editable</label>
          <select id="editorProductSelector">
            <option value="">Nuevo producto</option>
            ${entries.map(([key, product]) => `<option value="${esc(key)}" ${key === currentKey ? "selected" : ""}>${esc(product.title)} | ${esc(key)}</option>`).join("")}
          </select>
        </div>
        <div class="editor-actions">
          <button class="ghost-btn" type="button" data-editor-product-action="new">Nuevo</button>
          <button class="ghost-btn" type="button" data-editor-product-action="example">Cargar ejemplo base</button>
          <button class="ghost-btn" type="button" data-editor-product-action="save">Guardar producto</button>
          <button class="ghost-btn danger" type="button" data-editor-product-action="delete" ${currentKey ? "" : "disabled"}>Eliminar</button>
        </div>
      </div>
      <div class="module-banner banner-home">
        <h3>Plantilla del producto</h3>
        <p>Trabaja paso por paso. Guarda primero el producto y luego completa lo tecnico. Todo queda guardado en el navegador y alimenta recursos, plan y reporte.</p>
      </div>
      <div class="editor-stepper-shell">
        <div class="editor-stepper">
          ${PRODUCT_EDITOR_STEPS.map((step, index) => `
            <button
              class="editor-step-chip ${step.key === activeStep.key ? "is-active" : ""}"
              type="button"
              data-editor-product-action="set-step"
              data-step="${esc(step.key)}"
            >
              <span>${index + 1}</span>${esc(step.title)}
            </button>
          `).join("")}
        </div>
        <div class="editor-step-summary">
          <strong>Paso ${stepIndex + 1} de ${PRODUCT_EDITOR_STEPS.length}: ${esc(activeStep.title)}</strong>
          <p>${esc(activeStep.hint)}</p>
        </div>
      </div>
      <section class="editor-section ${isStep("base") ? "is-active-step" : "is-hidden-step"}">
        <div class="section-head compact">
          <h3>1. Datos base</h3>
          <p>Define nombre, familia, entrada, salida y cuello principal</p>
        </div>
        <div class="editor-grid three">
          <div class="field"><label>Clave interna</label><input data-editor-product-field="key" type="text" value="${esc(draft.key || "")}" placeholder="ej: chocolate_tabletas"></div>
          <div class="field"><label>Familia</label><select data-editor-product-field="family">
            ${FAMILY_OPTIONS.map((item) => `<option value="${esc(item.key)}" ${normalizeFamilyKey(draft.family) === item.key ? "selected" : ""}>${esc(item.label)}</option>`).join("")}
          </select></div>
          <div class="field"><label>Titulo comercial</label><input data-editor-product-field="title" type="text" value="${esc(draft.title)}" placeholder="ej: Chocolate en tabletas"></div>
          <div class="field"><label>Entrada principal</label><input data-editor-product-field="source" type="text" value="${esc(draft.source)}" placeholder="ej: Cacao en baba"></div>
          <div class="field"><label>Salida final</label><input data-editor-product-field="output" type="text" value="${esc(draft.output)}" placeholder="ej: Tabletas 80 g"></div>
          <div class="field"><label>Capacidad base semanal</label><input data-editor-product-field="weeklyCapacity" type="text" value="${esc(draft.weeklyCapacity)}" placeholder="4,800 tabletas / semana"></div>
          <div class="field"><label>Cuello principal</label><input data-editor-product-field="bottleneck" type="text" value="${esc(draft.bottleneck)}" placeholder="ej: Conchado"></div>
          <div class="field span-2"><label>Por que bloquea</label><input data-editor-product-field="blockingReason" type="text" value="${esc(draft.blockingReason)}" placeholder="ej: ocupa mas horas y retrasa el empaque"></div>
        </div>
      </section>
      <section class="editor-section ${isStep("capacity") ? "is-active-step" : "is-hidden-step"}">
        <div class="section-head compact">
          <h3>2. Capacidad visible</h3>
          <p>Registra capacidades y dias operativos base del producto</p>
        </div>
        <div class="editor-grid three">
          <div class="field"><label>Capacidad diaria</label><input data-editor-product-field="capacityByPeriod.day" type="text" value="${esc(draft.capacityByPeriod?.day || "")}"></div>
          <div class="field"><label>Capacidad semanal</label><input data-editor-product-field="capacityByPeriod.week" type="text" value="${esc(draft.capacityByPeriod?.week || "")}"></div>
          <div class="field"><label>Capacidad mensual</label><input data-editor-product-field="capacityByPeriod.month" type="text" value="${esc(draft.capacityByPeriod?.month || "")}"></div>
          <div class="field"><label>Dias operativos dia</label><input data-editor-product-field="operatingDays.day" type="number" min="1" value="${esc(String(draft.operatingDays?.day ?? 1))}"></div>
          <div class="field"><label>Dias operativos semana</label><input data-editor-product-field="operatingDays.week" type="number" min="1" value="${esc(String(draft.operatingDays?.week ?? 5))}"></div>
          <div class="field"><label>Dias operativos mes</label><input data-editor-product-field="operatingDays.month" type="number" min="1" value="${esc(String(draft.operatingDays?.month ?? 20))}"></div>
        </div>
      </section>
      <section class="editor-section ${isStep("origins") ? "is-active-step" : "is-hidden-step"}">
        <div class="section-head compact">
          <h3>3. Origenes permitidos</h3>
          <p>Registra desde donde puede entrar este producto al flujo</p>
        </div>
        <div class="repeater-stack">
          ${(draft.origins || []).map((origin, index) => `
            <div class="repeater-row">
              <input type="text" data-editor-product-list="origins" data-index="${index}" value="${esc(origin)}" placeholder="Origen permitido ${index + 1}">
              <button class="ghost-btn danger" type="button" data-editor-product-action="remove-origin" data-index="${index}">Quitar</button>
            </div>
          `).join("")}
          <button class="ghost-btn" type="button" data-editor-product-action="add-origin">Agregar origen</button>
        </div>
      </section>
      <section class="editor-section ${isStep("subflows") ? "is-active-step" : "is-hidden-step"}">
        <div class="section-head compact">
          <h3>4. Subprocesos</h3>
          <p>Organiza el producto por bloques grandes de trabajo</p>
        </div>
        <div class="repeater-stack">
          ${(draft.subflows || []).map((subflow, index) => `
            <article class="repeater-card">
              <div class="editor-grid three">
                <div class="field"><label>Nombre del subproceso</label><input type="text" data-editor-product-subflow-field="name" data-index="${index}" value="${esc(subflow.name || "")}"></div>
                <div class="field span-2"><label>Proposito</label><input type="text" data-editor-product-subflow-field="purpose" data-index="${index}" value="${esc(subflow.purpose || "")}"></div>
              </div>
              <div class="field">
                <label>Etapas que agrupa</label>
                <input type="text" data-editor-product-subflow-field="stages" data-index="${index}" value="${esc((subflow.stages || []).join(", "))}" placeholder="Etapa 1, Etapa 2, Etapa 3">
              </div>
              <div class="editor-inline-actions">
                <button class="ghost-btn danger" type="button" data-editor-product-action="remove-subflow" data-index="${index}">Quitar subproceso</button>
              </div>
            </article>
          `).join("")}
          <button class="ghost-btn" type="button" data-editor-product-action="add-subflow">Agregar subproceso</button>
        </div>
      </section>
      <section class="editor-section ${isStep("stages") ? "is-active-step" : "is-hidden-step"}">
        <div class="section-head compact">
          <h3>5. Etapas del proceso</h3>
          <p>Completa etapa por etapa para que luego funcionen trazabilidad, capacidad y plan</p>
        </div>
        <div class="repeater-stack">
          ${(draft.stages || []).map((stage, index) => `
            <article class="repeater-card">
              <div class="repeater-card-head">
                <strong>Etapa ${index + 1}</strong>
                <button class="ghost-btn danger" type="button" data-editor-product-action="remove-stage" data-index="${index}">Quitar</button>
              </div>
              <div class="editor-grid four">
                <div class="field"><label>Secuencia</label><input type="number" min="1" data-editor-product-stage-field="seq" data-index="${index}" value="${esc(String(stage.seq || index + 1))}"></div>
                <div class="field span-2"><label>Nombre</label><input type="text" data-editor-product-stage-field="name" data-index="${index}" value="${esc(stage.name || "")}"></div>
                <div class="field"><label>Subproceso</label><input type="text" data-editor-product-stage-field="subflow" data-index="${index}" value="${esc(stage.subflow || "")}"></div>
                <div class="field"><label>Entrada</label><input type="text" data-editor-product-stage-field="input" data-index="${index}" value="${esc(stage.input || "")}"></div>
                <div class="field"><label>Cantidad entrada</label><input type="text" data-editor-product-stage-field="inputQty" data-index="${index}" value="${esc(stage.inputQty || "")}"></div>
                <div class="field"><label>Salida</label><input type="text" data-editor-product-stage-field="output" data-index="${index}" value="${esc(stage.output || "")}"></div>
                <div class="field"><label>Cantidad salida</label><input type="text" data-editor-product-stage-field="outputQty" data-index="${index}" value="${esc(stage.outputQty || "")}"></div>
                <div class="field"><label>Personas</label><input type="text" data-editor-product-stage-field="people" data-index="${index}" value="${esc(stage.people || "")}"></div>
                <div class="field"><label>Rol</label><input type="text" data-editor-product-stage-field="role" data-index="${index}" value="${esc(stage.role || "")}"></div>
                <div class="field"><label>Tiempo</label><input type="text" data-editor-product-stage-field="time" data-index="${index}" value="${esc(stage.time || "")}" placeholder="8 h"></div>
                <div class="field"><label>Horas-persona</label><input type="text" data-editor-product-stage-field="peopleHours" data-index="${index}" value="${esc(stage.peopleHours || "")}" placeholder="16 h-persona"></div>
                <div class="field"><label>Sitio</label><input type="text" data-editor-product-stage-field="site" data-index="${index}" value="${esc(stage.site || "")}"></div>
                <div class="field"><label>Zona</label><input type="text" data-editor-product-stage-field="zone" data-index="${index}" value="${esc(stage.zone || "")}"></div>
                <div class="field"><label>Linea</label><input type="text" data-editor-product-stage-field="line" data-index="${index}" value="${esc(stage.line || "")}"></div>
                <div class="field"><label>Equipo</label><input type="text" data-editor-product-stage-field="machine" data-index="${index}" value="${esc(stage.machine || "")}"></div>
              </div>
              <div class="editor-grid two">
                <div class="field"><label>Materiales</label><textarea class="editor-textarea-sm" data-editor-product-stage-field="materials" data-index="${index}">${esc(stage.materials || "")}</textarea></div>
                <div class="field"><label>Controles</label><textarea class="editor-textarea-sm" data-editor-product-stage-field="controls" data-index="${index}">${esc(stage.controls || "")}</textarea></div>
                <div class="field"><label>Registros</label><textarea class="editor-textarea-sm" data-editor-product-stage-field="records" data-index="${index}">${esc(stage.records || "")}</textarea></div>
                <div class="field"><label>Conflictos</label><textarea class="editor-textarea-sm" data-editor-product-stage-field="conflicts" data-index="${index}">${esc(stage.conflicts || "")}</textarea></div>
              </div>
              <div class="field"><label>Motivo</label><textarea class="editor-textarea-sm" data-editor-product-stage-field="reason" data-index="${index}">${esc(stage.reason || "")}</textarea></div>
            </article>
          `).join("")}
          <button class="ghost-btn" type="button" data-editor-product-action="add-stage">Agregar etapa</button>
        </div>
      </section>
      <div class="editor-wizard-actions">
        <button class="ghost-btn" type="button" data-editor-product-action="prev-step" ${stepIndex === 0 ? "disabled" : ""}>Paso anterior</button>
        <button class="ghost-btn" type="button" data-editor-product-action="next-step" ${stepIndex === PRODUCT_EDITOR_STEPS.length - 1 ? "disabled" : ""}>Siguiente paso</button>
      </div>
    </div>
  `;
}

function renderSharedEditor() {
  const items = getReferenceSharedResources();
  const draft = getEditableSharedResourceDraft();
  el("sharedEditor").innerHTML = `
    <div class="editor-shell">
      <div class="editor-toolbar">
        <div class="field">
          <label>Recurso editable</label>
          <select id="editorSharedSelector">
            <option value="">Nuevo recurso</option>
            ${items.map((item) => `<option value="${esc(item.name)}" ${item.name === state.sharedResourceName ? "selected" : ""}>${esc(item.name)}</option>`).join("")}
          </select>
        </div>
        <div class="editor-actions">
          <button class="ghost-btn" type="button" data-editor-shared-action="new">Nuevo</button>
          <button class="ghost-btn" type="button" data-editor-shared-action="save">Guardar recurso</button>
          <button class="ghost-btn danger" type="button" data-editor-shared-action="delete" ${state.sharedResourceName ? "" : "disabled"}>Eliminar</button>
        </div>
      </div>
      <div class="editor-grid four">
        <div class="field"><label>Nombre</label><input id="editorSharedName" type="text" value="${esc(draft.name)}"></div>
        <div class="field"><label>Sitio</label><input id="editorSharedSite" type="text" value="${esc(draft.site)}"></div>
        <div class="field"><label>Zona</label><input id="editorSharedZone" type="text" value="${esc(draft.zone)}"></div>
        <div class="field"><label>Linea</label><input id="editorSharedLine" type="text" value="${esc(draft.line)}"></div>
        <div class="field"><label>Regla</label><input id="editorSharedRule" type="text" value="${esc(draft.rule)}"></div>
        <div class="field"><label>Severidad</label><select id="editorSharedSeverity"><option value="low" ${draft.severity === "low" ? "selected" : ""}>low</option><option value="medium" ${draft.severity === "medium" ? "selected" : ""}>medium</option><option value="high" ${draft.severity === "high" ? "selected" : ""}>high</option></select></div>
        <div class="field span-2"><label>Motivo</label><input id="editorSharedReason" type="text" value="${esc(draft.reason)}"></div>
      </div>
      <div class="field">
        <label>Usado por</label>
        <textarea id="editorSharedUsedBy" class="editor-textarea" placeholder="Una linea por uso">${esc((draft.usedBy || []).join("\n"))}</textarea>
      </div>
    </div>
  `;
}

function renderPlanDataEditor() {
  const person = getEditablePersonDraft();
  el("planDataBoard").innerHTML = `
    <div class="editor-shell">
      <div class="editor-toolbar">
        <div class="field">
          <label>Persona editable</label>
          <select id="editorPersonSelector">
            <option value="">Nueva persona</option>
            ${getReferencePersonnel().map((item) => `<option value="${esc(item.code)}" ${item.code === state.personnelCode ? "selected" : ""}>${esc(item.name)} | ${esc(item.code)}</option>`).join("")}
          </select>
        </div>
        <div class="editor-actions">
          <button class="ghost-btn" type="button" data-editor-person-action="new">Nuevo</button>
          <button class="ghost-btn" type="button" data-editor-person-action="save">Guardar persona</button>
          <button class="ghost-btn danger" type="button" data-editor-person-action="delete" ${state.personnelCode ? "" : "disabled"}>Eliminar</button>
        </div>
      </div>
      <div class="editor-grid four">
        <div class="field"><label>Codigo</label><input id="editorPersonCode" type="text" value="${esc(person.code || "")}"></div>
        <div class="field"><label>Nombre</label><input id="editorPersonName" type="text" value="${esc(person.name || "")}"></div>
        <div class="field"><label>Grupo de rol</label><input id="editorPersonRoleGroup" type="text" value="${esc(person.roleGroup || "ops")}"></div>
        <div class="field"><label>Modo</label><select id="editorPersonWorkMode"><option value="full" ${person.workMode === "full" ? "selected" : ""}>full</option><option value="split" ${person.workMode === "split" ? "selected" : ""}>split</option></select></div>
        <div class="field"><label>Horas objetivo</label><input id="editorPersonTargetHours" type="number" min="1" max="24" value="${esc(String(person.targetHoursPerDay ?? 8))}"></div>
        <div class="field"><label>Horas extra max.</label><input id="editorPersonExtraHours" type="number" min="0" max="12" value="${esc(String(person.maxExtraHours ?? 2))}"></div>
        <div class="field"><label>Disponibilidad</label><input id="editorPersonAvailability" type="text" value="${esc(person.weeklyAvailability || "")}"></div>
        <div class="field"><label>Zona</label><input id="editorPersonZone" type="text" value="${esc(person.zone || "")}"></div>
      </div>
      <div class="editor-grid seven">
        ${PLAN_WEEKDAYS.map((day) => `
          <div class="field">
            <label>${esc(day.short)}</label>
            <input id="editorPersonLoad-${esc(day.key)}" type="number" min="0" max="24" value="${esc(String(person.load?.[day.key] ?? 0))}">
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function feasibilityRank(value) {
  if (value === "No cabe") return 3;
  if (value === "Parcial") return 2;
  if (value === "Ajustar") return 1;
  return 0;
}

function feasibilityTone(value) {
  if (value === "No cabe") return "red";
  if (value === "Parcial" || value === "Ajustar") return "yellow";
  return "green";
}

function buildDayFeasibilityDecision(item, commitmentMap) {
  const { moving, adjusting, running } = getDaySlotStateSummary(item);
  const families = getDayActiveFamilies(item).map((family) => ({
    ...family,
    commitment: commitmentMap[family.key],
  }));
  const sorted = [...families].sort((a, b) =>
    feasibilityRank(b.commitment?.feasibility || "Cabe") - feasibilityRank(a.commitment?.feasibility || "Cabe")
  );
  const worst = sorted[0];
  const activeNames = families.map((family) => family.label);
  if (!worst?.commitment) {
    return {
      status: "Cabe",
      tone: "green",
      blockedProduct: "N/D",
      action: "Mantener la ventana actual.",
      moveTo: "Sin cambio sugerido.",
      expected: "La salida se sostiene con el escenario actual.",
    };
  }
  if (worst.commitment.feasibility === "No cabe") {
    const movedLabels = formatFamilyList(moving.map((slot) => slot.label));
    return {
      status: "No cabe",
      tone: "red",
      blockedProduct: worst.label,
      action: moving.length
        ? `Sacar ${movedLabels} de esta ventana y proteger primero ${formatFamilyList(running.map((slot) => slot.label)) || activeNames.filter((name) => name !== worst.label).join(" / ") || worst.label}.`
        : `Sacar ${worst.label} de esta ventana y proteger primero ${activeNames.filter((name) => name !== worst.label).join(" / ") || worst.label}.`,
      moveTo: item.day.includes("Viernes") || item.day.includes("Sabado") ? "Mover a domingo o ampliar turnos." : "Mover al siguiente bloque libre o a fin de semana.",
      expected: moving.length
        ? `${movedLabels} deja de castigar la salida comprometida del escenario.`
        : `${worst.label} deja de castigar la salida comprometida del escenario.`,
    };
  }
  if (worst.commitment.feasibility === "Parcial") {
    const movedLabels = formatFamilyList(moving.map((slot) => slot.label));
    const adjustedLabels = formatFamilyList(adjusting.map((slot) => slot.label));
    return {
      status: "Parcial",
      tone: "yellow",
      blockedProduct: worst.label,
      action: moving.length
        ? `Partir ${movedLabels} en una ventana adicional y ajustar ${adjustedLabels || worst.label} en ${item.day}.`
        : `Partir ${worst.label} en dos ventanas o reducir familias simultaneas en ${item.day}.`,
      moveTo: "Reservar una ventana extra o ampliar horas/turnos para esta familia.",
      expected: `${worst.label} recupera parte de su salida comprometida.`,
    };
  }
  if (worst.commitment.feasibility === "Ajustar") {
    const adjustedLabels = formatFamilyList(adjusting.map((slot) => slot.label));
    return {
      status: "Ajustar",
      tone: "yellow",
      blockedProduct: worst.label,
      action: adjustedLabels !== "la familia activa"
        ? `Mantener ${adjustedLabels} pero separar mejor el recurso comun y la limpieza entre familias.`
        : `Mantener ${worst.label} pero separar mejor el recurso comun y la limpieza entre familias.`,
      moveTo: "Ajustar turno o bloque termico sin mover toda la jornada.",
      expected: "La salida se sostiene con un ajuste operativo moderado.",
    };
  }
  return {
    status: "Cabe",
    tone: "green",
    blockedProduct: worst.label,
    action: "Mantener la secuencia actual.",
    moveTo: "Sin cambio sugerido.",
    expected: "La ventana se sostiene con el escenario actual.",
  };
}

function renderProductsReference() {
  const entries = getDemoProducts();
  const currentProduct = getCurrentProduct();
  const currentKey = entries.some(([key]) => key === state.productKey) ? state.productKey : "";
  const modeledNote = entries.length
    ? entries.map(([, product]) => product.title).slice(0, 4).join(", ")
    : "Sin productos cargados";

  renderKpis("productKpis", [
    { label: "Productos modelados", value: String(entries.length), note: modeledNote },
    { label: "Producto abierto", value: currentProduct?.title || "Ninguno abierto", note: currentProduct?.output || "Abre uno desde la lista de productos guardados" },
    { label: "Subprocesos", value: currentProduct ? String(currentProduct.subflows.length) : "0", note: currentProduct ? `${currentProduct.stages.length} etapas auditadas` : "Se llenan en la plantilla de Datos" },
    { label: "Bloqueo principal", value: currentProduct?.bottleneck || "Pendiente", note: currentProduct?.blockingReason || "Se calcula cuando el producto ya tiene etapas y capacidad base" },
  ]);

  el("productCatalog").innerHTML = `
    <div class="catalog-guide">
      <div class="catalog-helper">
        <strong>Flujo recomendado</strong>
        <p>Primero completa o guarda la plantilla de arriba. Luego selecciona aqui el producto que quieres revisar en detalle.</p>
      </div>
      <div class="product-catalog-grid">
      ${entries.map(([key, product]) => `
        <button class="product-card tone-${product.family} ${key === currentKey ? "is-active" : ""}" type="button" data-product-key="${esc(key)}">
          <div class="portfolio-head">
            <span class="pill">${esc(product.source)}</span>
            <span class="signal ${conflictTone(product.bottleneck)}">${esc(product.bottleneck)}</span>
          </div>
          <h4>${esc(product.title)}</h4>
          <div class="plain-note">${esc(product.output)}</div>
          <div class="chart-row compact">
            <span class="chart-label">Capacidad semanal</span>
            <div class="traffic-rail"><span class="chart-fill tone-${product.family}" style="width:${Math.min(100, 45 + product.stages.length * 4)}%"></span></div>
            <span class="chart-value">${esc(product.weeklyCapacity)}</span>
          </div>
          <div class="helper-line"><b>Subprocesos:</b> ${esc(product.subflows.map((item) => item.name).join(" | "))}</div>
        </button>
      `).join("")}
      </div>
    </div>
  `;

  const workspace = el("productWorkspace");
  const empty = el("productEmptyState");
  const subtabs = el("productSubtabs");

  if (!currentProduct) {
    el("productTitle").textContent = "3. Vista previa del producto";
    el("productSummary").textContent = "Guarda un producto nuevo o selecciona uno guardado para abrir su resumen, flujo, trazabilidad, recursos y capacidad.";
    workspace.classList.add("is-empty");
    empty.style.display = "block";
    subtabs.style.display = "none";
    document.querySelectorAll(".product-view").forEach((panel) => panel.classList.remove("is-active"));
    el("productOverview").innerHTML = "";
    el("productMap").innerHTML = "";
    el("productSubflows").innerHTML = "";
    el("productTrace").innerHTML = "";
    el("productAudit").innerHTML = "";
    el("productCapacity").innerHTML = "";
    return;
  }

  workspace.classList.remove("is-empty");
  empty.style.display = "none";
  subtabs.style.display = "flex";
  el("productTitle").textContent = `3. Vista previa: ${currentProduct.title}`;
  el("productSummary").textContent = `${currentProduct.source} -> ${currentProduct.output} | ${currentProduct.stages.length} etapas | ${currentProduct.subflows.length} subprocesos | ${currentProduct.weeklyCapacity}`;

  renderSelectedProductReference(currentProduct);
  activateProductView(state.productView);
}

function renderSelectedProductReferenceLegacy(product) {
  void product;
  return;
  const stageCount = product.stages.length;
  const totalHours = product.stages.reduce((sum, stage) => sum + num(String(stage.time).replace(" h", "")), 0);
  const totalPeopleHours = product.stages.reduce((sum, stage) => sum + num(String(stage.peopleHours).replace(" h-persona", "")), 0);
  const totalPeople = product.stages.reduce((sum, stage) => sum + num(String(stage.people).split(" ")[0]), 0);
  const coreMaterials = unique(product.stages.map((stage) => stage.materials));
  const coreZones = unique(product.stages.map((stage) => stage.zone));
  const coreMachines = unique(product.stages.map((stage) => stage.machine));

  el("productOverview").innerHTML = `
    <div class="overview-grid">
      <article class="impact-card tone-${product.family}">
        <div class="impact-title">Lectura rapida</div>
        <div class="impact-value">${esc(product.output)}</div>
        <div class="impact-note">Desde ${esc(product.source)} con ${esc(stageCount)} etapas y ${esc(product.subflows.length)} subprocesos.</div>
      </article>
      <article class="overview-card">
        <h4>Resumen operativo</h4>
        <div class="phase-meta compact">
          <div><b>Tiempo total</b><span>${esc(fmt(totalHours, 1))} h</span></div>
          <div><b>Horas-persona</b><span>${esc(fmt(totalPeopleHours, 1))} h-persona</span></div>
          <div><b>Capacidad semanal</b><span>${esc(product.weeklyCapacity)}</span></div>
          <div><b>Cuello principal</b><span>${esc(product.bottleneck)}</span></div>
        </div>
        <div class="helper-line"><b>Materiales clave:</b> ${esc(coreMaterials.slice(0, 4).join(" | "))}</div>
      </article>
      <article class="overview-card">
        <h4>Flujograma general</h4>
        <div class="flowgram">
          <div class="flowgram-node flow-start">${esc(product.source)}</div>
          ${product.subflows.map((flow) => `
            <div class="flowgram-arrow">→</div>
            <div class="flowgram-node tone-${product.family}">
              <span>${esc(flow.name)}</span>
              <small>${esc(flow.stages.length)} etapa(s)</small>
            </div>
          `).join("")}
          <div class="flowgram-arrow">→</div>
          <div class="flowgram-node flow-end">${esc(product.output)}</div>
        </div>
      </article>
      <article class="overview-card">
        <h4>Soporte del proceso</h4>
        <div class="helper-line"><b>Zonas:</b> ${esc(coreZones.join(" | "))}</div>
        <div class="helper-line"><b>Equipos:</b> ${esc(coreMachines.slice(0, 4).join(" | "))}</div>
        <div class="helper-line"><b>Bloquea:</b> ${esc(product.blockingReason)}</div>
      </article>
      <article class="overview-card">
        <h4>Origenes permitidos</h4>
        <div class="mini-flow-list">
          ${(product.origins || [product.source]).map((origin) => `<span>${esc(origin)}</span>`).join("")}
        </div>
        <div class="helper-line"><b>Idea:</b> este mapa permite arrancar el producto desde distintos puntos segun el insumo disponible.</div>
      </article>
    </div>
  `;

  el("productMap").innerHTML = `
    <div class="process-ribbon tone-${product.family}">
      ${product.subflows.map((flow) => `
        <article class="ribbon-block">
          <div class="ribbon-kicker">${esc(flow.name)}</div>
          <h4>${esc(flow.purpose)}</h4>
          <div class="ribbon-chain">${esc(flow.stages.join(" -> "))}</div>
        </article>
      `).join("")}
    </div>
    <div class="flow-lane">
      ${product.stages.map((stage, index) => `
        <div class="flow-lane-step tone-${product.family}">
          <div class="flow-lane-index">${esc(String(index + 1))}</div>
          <div class="flow-lane-name">${esc(stage.name)}</div>
          <div class="flow-lane-meta">${esc(stage.time)} | ${esc(stage.people)}</div>
        </div>
      `).join("")}
    </div>
    <div class="route-stage-stack">
      ${product.stages.map((stage) => `
        <article class="route-stage-card tone-${product.family}">
          <div class="trace-card-head">
            <h4>${esc(stage.seq)}. ${esc(stage.name)}</h4>
            <span class="pill">${esc(stage.subflow)}</span>
          </div>
          <div class="helper-line"><b>Transforma:</b> ${esc(stage.input)} (${esc(stage.inputQty)}) -> ${esc(stage.output)} (${esc(stage.outputQty)})</div>
          <div class="phase-meta compact">
            <div><b>Tiempo</b><span>${esc(stage.time)}</span></div>
            <div><b>Personas</b><span>${esc(stage.people)}</span></div>
            <div><b>Horas-persona</b><span>${esc(stage.peopleHours)}</span></div>
            <div><b>Rol</b><span>${esc(stage.role)}</span></div>
          </div>
          <div class="helper-line"><b>Sitio / zona / linea:</b> ${esc(stage.site)} | ${esc(stage.zone)} | ${esc(stage.line)}</div>
        </article>
      `).join("")}
    </div>
  `;

  el("productAudit").innerHTML = `
    <div class="audit-grid">
      ${product.stages.map((stage) => `
        <article class="audit-card">
          <div class="trace-card-head">
            <h4>${esc(stage.seq)}. ${esc(stage.name)}</h4>
            <span class="signal ${conflictTone(stage.conflicts)}">${esc(stage.conflicts.includes("No") ? "Controlar" : "Ok")}</span>
          </div>
          <div class="audit-list">
            <div><b>Maquina:</b> ${esc(stage.machine)}</div>
            <div><b>Materiales:</b> ${esc(stage.materials)}</div>
            <div><b>Equipo humano:</b> ${esc(getSuggestedAssignments(stage).map((person) => `${person.name} (${HUMAN_WORK_MODES[person.workMode]?.label || person.workMode})`).join(" | ") || "Por asignar")}</div>
            <div><b>Controles:</b> ${esc(stage.controls)}</div>
            <div><b>Registros:</b> ${esc(stage.records)}</div>
            <div><b>Conflicto:</b> ${esc(stage.conflicts)}</div>
            <div><b>Motivo:</b> ${esc(stage.reason)}</div>
          </div>
        </article>
      `).join("")}
    </div>
  `;

  const productInput = parseDemoQuantity(product.stages[0]?.inputQty || "");
  const productOutput = parseDemoQuantity(product.stages[product.stages.length - 1]?.outputQty || "");
  const productWasteSummary = getTraceWasteSummary(product.stages);
  const subflowModels = product.subflows.map((flow, flowIndex) => {
    const stages = product.stages.filter((stage) => stage.subflow === flow.name);
    const firstStage = stages[0];
    const lastStage = stages[stages.length - 1];
    const hours = stages.reduce((sum, stage) => sum + num(String(stage.time).replace(" h", "")), 0);
    const peopleHours = stages.reduce((sum, stage) => sum + num(String(stage.peopleHours).replace(" h-persona", "")), 0);
    const wasteSummary = getTraceWasteSummary(stages);
    return {
      flow,
      flowIndex,
      stages,
      firstStage,
      lastStage,
      hours,
      peopleHours,
      wasteSummary,
      sharePct: totalHours ? Math.round((hours / totalHours) * 100) : 0,
    };
  });
  const leadSubflow = [...subflowModels].sort((a, b) => b.hours - a.hours)[0];

  el("productSubflows").innerHTML = `
    <div class="subflow-overview-card tone-${product.family}">
      <div>
        <div class="impact-title">Arquitectura del producto</div>
        <div class="plain-note">Aqui ves como el proceso se divide en bloques grandes, cuanto transforma cada uno y donde se concentra la merma visible.</div>
      </div>
      <div class="subflow-overview-metrics">
        <span>${esc(String(product.subflows.length))} subprocesos</span>
        <span>${esc(String(product.stages.length))} etapas</span>
        <span>${esc(fmt(totalHours, 1))} h acumuladas</span>
      </div>
      <div class="subflow-overview-totals">
        <div class="subflow-total-card">
          <b>Entro al proceso</b>
          <span>${esc(formatParsedQuantity(productInput, productInput.amount !== null && productInput.amount % 1 !== 0 ? 2 : 0))}</span>
        </div>
        <div class="subflow-total-card">
          <b>Salio del proceso</b>
          <span>${esc(formatParsedQuantity(productOutput, productOutput.amount !== null && productOutput.amount % 1 !== 0 ? 2 : 0))}</span>
        </div>
        <div class="subflow-total-card is-waste">
          <b>Merma total visible</b>
          <span>${esc(productWasteSummary.label)}</span>
        </div>
      </div>
    </div>
    <div class="subflow-rail tone-${product.family}">
      ${subflowModels.map((item, index) => `
        <div class="subflow-rail-card tone-${getSeverityTone(item.sharePct, leadSubflow?.flow.name === item.flow.name)} ${leadSubflow?.flow.name === item.flow.name ? "is-lead" : ""}">
          <div class="ribbon-kicker">Subproceso ${esc(String(index + 1))}</div>
          <strong>${esc(item.flow.name)}</strong>
          <span>${esc(String(item.sharePct))}% del tiempo total</span>
        </div>
        ${index < subflowModels.length - 1 ? '<div class="subflow-rail-arrow">&rarr;</div>' : ""}
      `).join("")}
    </div>
    <div class="subflow-grid is-strong">
      ${subflowModels.map((item, index) => `
        <article class="subflow-card tone-${product.family} tone-${getSeverityTone(item.sharePct, leadSubflow?.flow.name === item.flow.name)} ${leadSubflow?.flow.name === item.flow.name ? "is-lead" : ""}">
          <div class="subflow-card-top">
            <div>
              <div class="ribbon-kicker">Subproceso ${esc(String(index + 1))}</div>
              <h4>${esc(item.flow.name)}</h4>
            </div>
            <span class="pill">${esc(String(item.stages.length))} fases</span>
          </div>
          <div class="plain-note">${esc(item.flow.purpose)}</div>
          <div class="subflow-impact-row">
            <div class="subflow-impact-card">
              <b>Peso en el proceso</b>
              <span>${esc(String(item.sharePct))}% del tiempo total</span>
            </div>
            <div class="subflow-impact-card ${leadSubflow?.flow.name === item.flow.name ? "is-critical" : ""}">
              <b>Semaforo</b>
              <span>${esc(
                getSeverityTone(item.sharePct, leadSubflow?.flow.name === item.flow.name) === "red"
                  ? "Cuello de botella"
                  : getSeverityTone(item.sharePct, leadSubflow?.flow.name === item.flow.name) === "yellow"
                    ? "Carga media"
                    : "Carga liviana"
              )}</span>
            </div>
            <div class="subflow-impact-card">
              <b>Merma visible</b>
              <span>${esc(item.wasteSummary.label)}</span>
            </div>
          </div>
          <div class="subflow-io">
            <div class="subflow-io-card">
              <b>Entra</b>
              <span>${esc(item.firstStage?.input || "N/D")}</span>
              <small>${esc(item.firstStage?.inputQty || "Sin cantidad")}</small>
            </div>
            <div class="subflow-io-arrow">&rarr;</div>
            <div class="subflow-io-card">
              <b>Sale</b>
              <span>${esc(item.lastStage?.output || "N/D")}</span>
              <small>${esc(item.lastStage?.outputQty || "Sin cantidad")}</small>
            </div>
          </div>
          <div class="subflow-progress">
            ${item.stages.map((stage) => `<span>${esc(String(stage.seq))}</span>`).join("")}
          </div>
          <div class="mini-flow-list is-steps">
            ${item.stages.map((stage, stageIndex) => `<span>${esc(stage.name)}${stageIndex < item.stages.length - 1 ? " ->" : ""}</span>`).join("")}
          </div>
          <div class="subflow-stat-grid">
            <div><b>Tiempo</b><span>${esc(fmt(item.hours, 1))} h</span></div>
            <div><b>Horas-persona</b><span>${esc(fmt(item.peopleHours, 1))} h-persona</span></div>
            <div><b>Zona principal</b><span>${esc(item.firstStage?.zone || "N/D")}</span></div>
            <div><b>Linea</b><span>${esc(item.firstStage?.line || "N/D")}</span></div>
          </div>
        </article>
      `).join("")}
    </div>
    <article class="subflow-reading-card">
      <div class="impact-title">Cuello de botella</div>
      <div class="impact-value">${esc(leadSubflow?.flow.name || "N/D")}</div>
      <div class="plain-note">${esc(
        leadSubflow
          ? `${leadSubflow.flow.name} es el cuello de botella porque concentra ${leadSubflow.sharePct}% del tiempo total del proceso (${fmt(leadSubflow.hours, 1)} h), acumula ${fmt(leadSubflow.peopleHours, 1)} horas-persona y depende del equipo ${leadSubflow.firstStage?.machine || "critico"}. Si este bloque se atrasa, desplaza el cierre de los subprocesos siguientes.`
          : "Sin lectura disponible."
      )}</div>
    </article>
  `;

  const lotPrefix = getProductLotPrefix(product);
  const traceWasteSummary = getTraceWasteSummary(product.stages);
  el("productTrace").innerHTML = `
    <div class="traceability-grid">
      <article class="trace-summary-card tone-${product.family}">
        <div class="impact-title">Mapa de trazabilidad por fases</div>
        <div class="plain-note">Sigue el lote desde el origen permitido hasta el producto terminado, viendo cuanto se pierde en cada fase y cuanto acumula el proceso.</div>
        <div class="mini-flow-list">
          ${(product.origins || [product.source]).map((origin, index) => `<span>${index === 0 ? "Origen principal:" : "Origen alterno:"} ${esc(origin)}</span>`).join("")}
        </div>
        <div class="trace-summary-metrics">
          <div class="trace-summary-chip"><b>Merma total visible</b><span>${esc(traceWasteSummary.label)}</span></div>
          <div class="trace-summary-chip"><b>Fases con cambio de unidad</b><span>${esc(String(traceWasteSummary.changedUnitStages))}</span></div>
        </div>
      </article>
      ${product.stages.map((stage, index) => {
        const inCode = `${lotPrefix}-${String(index + 1).padStart(2, "0")}-IN`;
        const outCode = `${lotPrefix}-${String(index + 1).padStart(2, "0")}-OUT`;
        const waste = getStageWaste(stage);
        return `
          <article class="trace-phase-card tone-${product.family}">
            <div class="trace-card-head">
              <h4>Fase ${esc(String(stage.seq))}: ${esc(stage.name)}</h4>
              <span class="pill">${esc(stage.subflow)}</span>
            </div>
            <div class="trace-lot-row">
              <div class="trace-lot-block">
                <b>Lote entra</b>
                <span>${esc(inCode)}</span>
                <small>${esc(stage.input)} | ${esc(stage.inputQty)}</small>
              </div>
              <div class="trace-lot-arrow">
                <div class="trace-arrow-line"></div>
                <div class="trace-arrow-label">Transforma</div>
                <div class="trace-waste-chip">Merma visible</div>
                <div class="trace-arrow-icon">&rarr;</div>
              </div>
              <div class="trace-lot-block">
                <b>Lote sale</b>
                <span>${esc(outCode)}</span>
                <small>${esc(stage.output)} | ${esc(stage.outputQty)}</small>
              </div>
            </div>
            <div class="trace-info-grid">
              <div class="trace-info-card">
                <b>Registro</b>
                <span>${esc(stage.records)}</span>
              </div>
              <div class="trace-info-card">
                <b>Control</b>
                <span>${esc(stage.controls)}</span>
              </div>
              <div class="trace-info-card">
                <b>Ubicacion</b>
                <span>${esc(stage.zone)}</span>
              </div>
            </div>
            <div class="helper-line"><b>Lectura:</b> esta fase transforma ${esc(stage.input)} en ${esc(stage.output)} y deja evidencia en ${esc(stage.records)}.</div>
          </article>
        `;
      }).join("")}
    </div>
  `;

  const bottleneckStage = product.stages.find((stage) => normalizeText(stage.name).includes(normalizeText(product.bottleneck)));
  const capacityPeriod = state.productCapacityPeriod || "week";
  const capacityScenario = buildScenarioWindow(capacityPeriod);
  const operatingDays = capacityScenario.plannedDays;
  const periodHours = capacityScenario.plannedDays * capacityScenario.totalHoursPerDay;
  const capacityBase = parseDemoQuantity(product.weeklyCapacity);
  const capacityUnit = parseDemoQuantity(product.capacityByPeriod?.[capacityPeriod] || product.weeklyCapacity).unit;
  const scenarioCapacityAmount = capacityBase.amount === null ? null : capacityBase.amount * capacityScenario.projectionFactor;
  const capacityLabel = scenarioCapacityAmount === null
    ? (product.capacityByPeriod?.[capacityPeriod] || product.weeklyCapacity)
    : formatCapacityOutput(scenarioCapacityAmount, capacityUnit);
  const capacitySubflowModels = product.subflows.map((flow) => {
    const stages = product.stages.filter((stage) => stage.subflow === flow.name);
    const totalBlockHours = stages.reduce((sum, stage) => sum + num(String(stage.time).replace(" h", "")), 0);
    const peopleHours = stages.reduce((sum, stage) => sum + num(String(stage.peopleHours).replace(" h-persona", "")), 0);
    const longestStage = [...stages].sort((a, b) => num(String(b.time).replace(" h", "")) - num(String(a.time).replace(" h", "")))[0];
    const outputParsed = parseDemoQuantity(stages[stages.length - 1]?.outputQty || "");
    const theoreticalRuns = totalBlockHours > 0 ? periodHours / totalBlockHours : 0;
    const estimatedOutput = outputParsed.amount !== null
      ? `${fmt(outputParsed.amount * theoreticalRuns, outputParsed.amount % 1 === 0 ? 0 : 1)} ${outputParsed.unit}`.trim()
      : "N/D";
    const tone = getSeverityTone(totalHours ? Math.round((totalBlockHours / totalHours) * 100) : 0, flow.name === leadSubflow?.flow.name);
    return {
      flow,
      stages,
      totalBlockHours,
      peopleHours,
      longestStage,
      outputParsed,
      theoreticalRuns,
      estimatedOutput,
      tone,
    };
  });

  el("productCapacity").innerHTML = `
    <div class="capacity-shell">
      <div class="impact-card tone-${product.family}">
        <div class="capacity-head-row">
          <div>
            <div class="impact-title">Capacidad ${esc(capacityPeriodLabel(capacityPeriod))} estimada</div>
            <div class="impact-value">${esc(capacityLabel)}</div>
            <div class="impact-note">Escenario base: ${esc(String(capacityScenario.plannedDays))} dia(s) | ${esc(fmt(capacityScenario.totalHoursPerDay, 0))} h por dia | ${esc(capacityScenario.shifts)} turno(s).</div>
          </div>
          <div class="capacity-periods">
            <button class="capacity-period-button ${capacityPeriod === "day" ? "is-active" : ""}" type="button" data-capacity-period="day">Diaria</button>
            <button class="capacity-period-button ${capacityPeriod === "week" ? "is-active" : ""}" type="button" data-capacity-period="week">Semanal</button>
            <button class="capacity-period-button ${capacityPeriod === "month" ? "is-active" : ""}" type="button" data-capacity-period="month">Mensual</button>
          </div>
        </div>
      </div>
      <div class="capacity-overview-grid">
        <div class="capacity-summary-card">
          <b>Dias operativos</b>
          <span>${esc(String(operatingDays))} dia(s)</span>
          <small>Base visible para la capacidad ${esc(capacityPeriodLabel(capacityPeriod))}</small>
        </div>
        <div class="capacity-summary-card">
          <b>Horas operativas</b>
          <span>${esc(fmt(periodHours, 0))} h</span>
          <small>Ventana total segun dias, turnos y extras del escenario</small>
        </div>
        <div class="capacity-summary-card is-critical">
          <b>Cuello de botella</b>
          <span>${esc(product.bottleneck)}</span>
          <small>${esc(product.blockingReason)}</small>
        </div>
        <div class="capacity-summary-card">
          <b>Equipo critico</b>
          <span>${esc(bottleneckStage?.machine || "Por definir")}</span>
          <small>${esc(bottleneckStage?.zone || "Sin zona")} | ${esc(bottleneckStage?.line || "Sin linea")}</small>
        </div>
      </div>
      <div class="capacity-flow-grid">
        ${capacitySubflowModels.map((item, index) => `
          <article class="capacity-flow-card tone-${item.tone}">
            <div class="trace-card-head">
              <h4>Subproceso ${esc(String(index + 1))}: ${esc(item.flow.name)}</h4>
              <span class="signal ${esc(item.tone)}">${esc(item.tone === "red" ? "Cuello" : item.tone === "yellow" ? "Exigido" : "Con margen")}</span>
            </div>
            <div class="capacity-bar-meta">
              <b>Carga del subproceso</b>
              <span>${esc(fmt((item.totalBlockHours / Math.max(totalHours, 1)) * 100, 0))}% del tiempo total</span>
            </div>
            <div class="capacity-bar">
              <div class="capacity-bar-fill tone-${item.tone}" style="width:${Math.max(18, Math.min(100, (item.totalBlockHours / Math.max(totalHours, 1)) * 100))}%"></div>
            </div>
            <div class="capacity-flow-stats">
              <div><b>Tiempo del bloque</b><span>${esc(fmt(item.totalBlockHours, 1))} h</span></div>
              <div><b>Horas-persona</b><span>${esc(fmt(item.peopleHours, 1))} h-persona</span></div>
              <div><b>Corridas teoricas</b><span>${esc(fmt(item.theoreticalRuns, 1))}</span></div>
              <div><b>Salida estimada</b><span>${esc(item.estimatedOutput)}</span></div>
              <div><b>Etapa critica</b><span>${esc(item.longestStage?.name || "N/D")}</span></div>
              <div><b>Equipo clave</b><span>${esc(item.longestStage?.machine || "N/D")}</span></div>
            </div>
            <div class="plain-note">${esc(
              item.tone === "red"
                ? `${item.flow.name} concentra la mayor carga del periodo y condiciona la salida ${capacityPeriodLabel(capacityPeriod)} del producto.`
                : item.tone === "yellow"
                  ? `${item.flow.name} requiere seguimiento porque absorbe una parte importante del tiempo disponible.`
                  : `${item.flow.name} tiene una carga mas liviana frente al resto del proceso.`
            )}</div>
          </article>
        `).join("")}
      </div>
      <div class="plain-list">
        <div class="plan-note"><b>Lectura operativa:</b> primero validas el cuello interno del producto y despues cruzas esta lectura con recursos compartidos de fabrica.</div>
        <div class="plan-note"><b>Personas movilizadas:</b> ${esc(String(totalPeople))} asignaciones acumuladas en las fases.</div>
      </div>
    </div>
  `;
}

function activateProductView(view) {
  state.productView = view;
  document.querySelectorAll(".subtab").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.productView === view);
  });
  document.querySelectorAll(".product-view").forEach((panel) => {
    panel.classList.toggle("is-active", panel.id === `productView-${view}`);
  });
}

function renderSelectedProductReference(product) {
  const stageCount = product.stages.length;
  const totalHours = product.stages.reduce((sum, stage) => sum + num(String(stage.time).replace(" h", "")), 0);
  const totalPeopleHours = product.stages.reduce((sum, stage) => sum + num(String(stage.peopleHours).replace(" h-persona", "")), 0);
  const totalPeople = product.stages.reduce((sum, stage) => sum + num(String(stage.people).split(" ")[0]), 0);
  const coreMaterials = unique(product.stages.map((stage) => stage.materials));
  const coreZones = unique(product.stages.map((stage) => stage.zone));
  const coreMachines = unique(product.stages.map((stage) => stage.machine));

  el("productOverview").innerHTML = `
    <div class="overview-grid">
      <article class="impact-card tone-${product.family}">
        <div class="impact-title">Lectura rapida</div>
        <div class="impact-value">${esc(product.output)}</div>
        <div class="impact-note">Desde ${esc(product.source)} con ${esc(stageCount)} etapas y ${esc(product.subflows.length)} subprocesos.</div>
      </article>
      <article class="overview-card">
        <h4>Resumen operativo</h4>
        <div class="phase-meta compact">
          <div><b>Tiempo total</b><span>${esc(fmt(totalHours, 1))} h</span></div>
          <div><b>Horas-persona</b><span>${esc(fmt(totalPeopleHours, 1))} h-persona</span></div>
          <div><b>Capacidad semanal</b><span>${esc(product.weeklyCapacity)}</span></div>
          <div><b>Cuello principal</b><span>${esc(product.bottleneck)}</span></div>
        </div>
        <div class="helper-line"><b>Materiales clave:</b> ${esc(coreMaterials.slice(0, 4).join(" | "))}</div>
      </article>
      <article class="overview-card">
        <h4>Flujograma general</h4>
        <div class="flowgram">
          <div class="flowgram-node flow-start">
            <small>Entrada</small>
            <span>${esc(product.source)}</span>
          </div>
          ${product.subflows.map((flow, index) => {
            const flowStages = product.stages.filter((stage) => stage.subflow === flow.name);
            const first = flowStages[0];
            const last = flowStages[flowStages.length - 1];
            const critical = flowStages.sort((a, b) => num(String(b.time).replace(" h", "")) - num(String(a.time).replace(" h", "")))[0];
            return `
            <div class="flowgram-step">
              <div class="flowgram-step-line"></div>
              <div class="flowgram-node tone-${product.family}">
                <small>Subproceso ${esc(String(index + 1))}</small>
                <span>${esc(flow.name)}</span>
                <small>${esc(`${flow.stages.length} etapa(s)`)} | ${esc(first?.input || "")} -> ${esc(last?.output || "")}</small>
                <small>Etapa critica: ${esc(critical?.name || "N/D")}</small>
              </div>
            </div>
          `;
          }).join("")}
          <div class="flowgram-step">
            <div class="flowgram-step-line"></div>
            <div class="flowgram-node flow-end">
              <small>Salida</small>
              <span>${esc(product.output)}</span>
            </div>
          </div>
        </div>
      </article>
      <article class="overview-card">
        <h4>Soporte del proceso</h4>
        <div class="helper-line"><b>Zonas:</b> ${esc(coreZones.join(" | "))}</div>
        <div class="helper-line"><b>Equipos:</b> ${esc(coreMachines.slice(0, 4).join(" | "))}</div>
        <div class="helper-line"><b>Bloquea:</b> ${esc(product.blockingReason)}</div>
      </article>
      <article class="overview-card">
        <h4>Origenes permitidos</h4>
        <div class="mini-flow-list">
          ${(product.origins || [product.source]).map((origin) => `<span>${esc(origin)}</span>`).join("")}
        </div>
        <div class="helper-line"><b>Idea:</b> este flujo puede arrancar desde distintos puntos si la planta recibe un insumo ya transformado.</div>
      </article>
    </div>
  `;

  el("productMap").innerHTML = `
    <div class="flow-poster tone-${product.family}">
      <div class="flow-poster-entry">
        <div class="flow-poster-kicker">Entra</div>
        <h4>${esc(product.source)}</h4>
        <div class="plain-note">${esc(product.stages[0]?.inputQty || "Sin cantidad base")}</div>
      </div>
      <div class="flow-poster-bridge">
        ${product.subflows.map((flow, index) => `
          <span>${esc(flow.name)}</span>${index < product.subflows.length - 1 ? '<b>&rarr;</b>' : ""}
        `).join("")}
      </div>
      <div class="flow-poster-exit">
        <div class="flow-poster-kicker">Sale</div>
        <h4>${esc(product.output)}</h4>
        <div class="plain-note">${esc(product.weeklyCapacity)}</div>
      </div>
    </div>
    <div class="process-ribbon tone-${product.family}">
      ${product.subflows.map((flow) => `
        <article class="ribbon-block">
          <div class="ribbon-kicker">${esc(flow.name)}</div>
          <h4>${esc(flow.purpose)}</h4>
          <div class="ribbon-chain">${esc(flow.stages.join(" -> "))}</div>
        </article>
      `).join("")}
    </div>
    <div class="subflow-diagram-stack">
      ${product.subflows.map((flow) => {
        const stages = product.stages.filter((stage) => stage.subflow === flow.name);
        return `
          <section class="subflow-diagram tone-${product.family}">
            <div class="subflow-diagram-head">
              <div>
                <div class="ribbon-kicker">${esc(flow.name)}</div>
                <h4>${esc(flow.purpose)}</h4>
              </div>
              <div class="subflow-stats">
                <span>${esc(String(stages.length))} etapa(s)</span>
                <span>${esc(fmt(stages.reduce((sum, stage) => sum + num(String(stage.time).replace(" h", "")), 0), 1))} h</span>
              </div>
            </div>
            <div class="subflow-stage-rail">
              ${stages.map((stage, index) => `
                <article class="subflow-stage-node">
                  <div class="subflow-stage-seq">${esc(String(stage.seq))}</div>
                  <h5>${esc(stage.name)}</h5>
                  <div class="subflow-stage-note">${esc(stage.input)} &rarr; ${esc(stage.output)}</div>
                  <div class="subflow-stage-meta">${esc(stage.time)} | ${esc(stage.people)}</div>
                </article>
                ${index < stages.length - 1 ? '<div class="subflow-stage-arrow">&rarr;</div>' : ""}
              `).join("")}
            </div>
          </section>
        `;
      }).join("")}
    </div>
    <div class="flow-lane">
      ${product.stages.map((stage, index) => `
        <div class="flow-lane-step tone-${product.family}">
          <div class="flow-lane-index">${esc(String(index + 1))}</div>
          <div class="flow-lane-name">${esc(stage.name)}</div>
          <div class="flow-lane-meta">${esc(stage.time)} | ${esc(stage.people)}</div>
        </div>
      `).join("")}
    </div>
    <div class="route-stage-stack">
      ${product.stages.map((stage) => `
        <article class="route-stage-card tone-${product.family}">
          <div class="trace-card-head">
            <h4>${esc(stage.seq)}. ${esc(stage.name)}</h4>
            <span class="pill">${esc(stage.subflow)}</span>
          </div>
          <div class="helper-line"><b>Transforma:</b> ${esc(stage.input)} (${esc(stage.inputQty)}) -> ${esc(stage.output)} (${esc(stage.outputQty)})</div>
          <div class="phase-meta compact">
            <div><b>Tiempo</b><span>${esc(stage.time)}</span></div>
            <div><b>Personas</b><span>${esc(stage.people)}</span></div>
            <div><b>Horas-persona</b><span>${esc(stage.peopleHours)}</span></div>
            <div><b>Rol</b><span>${esc(stage.role)}</span></div>
          </div>
          <div class="helper-line"><b>Sitio / zona / linea:</b> ${esc(stage.site)} | ${esc(stage.zone)} | ${esc(stage.line)}</div>
        </article>
      `).join("")}
    </div>
  `;

  el("productAudit").innerHTML = `
    <div class="audit-grid">
      ${product.stages.map((stage) => `
        <article class="audit-card">
          <div class="trace-card-head">
            <h4>${esc(stage.seq)}. ${esc(stage.name)}</h4>
            <span class="signal ${conflictTone(stage.conflicts)}">${esc(stage.conflicts.includes("No") ? "Controlar" : "Ok")}</span>
          </div>
          <div class="audit-list">
            <div><b>Maquina:</b> ${esc(stage.machine)}</div>
            <div><b>Materiales:</b> ${esc(stage.materials)}</div>
            <div><b>Equipo humano:</b> ${esc(getSuggestedAssignments(stage).map((person) => `${person.name} (${HUMAN_WORK_MODES[person.workMode]?.label || person.workMode})`).join(" | ") || "Por asignar")}</div>
            <div><b>Controles:</b> ${esc(stage.controls)}</div>
            <div><b>Registros:</b> ${esc(stage.records)}</div>
            <div><b>Conflicto:</b> ${esc(stage.conflicts)}</div>
            <div><b>Motivo:</b> ${esc(stage.reason)}</div>
          </div>
        </article>
      `).join("")}
    </div>
  `;

  const lotPrefix = getProductLotPrefix(product);
  const traceWasteSummary = getTraceWasteSummary(product.stages);
  const firstStage = product.stages[0];
  const lastStage = product.stages[product.stages.length - 1];
  el("productTrace").innerHTML = `
    <div class="traceability-grid">
      <article class="trace-summary-card tone-${product.family}">
        <div class="impact-title">Mapa de trazabilidad por fases</div>
        <div class="plain-note">La trazabilidad se centra en codigos de lote de entrada y salida, registros requeridos para auditoria y controles de calidad por cada fase.</div>
        <div class="mini-flow-list">
          ${(product.origins || [product.source]).map((origin, index) => `<span>${index === 0 ? "Origen principal:" : "Origen alterno:"} ${esc(origin)}</span>`).join("")}
        </div>
        <div class="trace-audit-strip">
          <span class="trace-audit-pill"><b>Lote base</b>${esc(`${lotPrefix}-01-IN`)}</span>
          <span class="trace-audit-pill"><b>Lote final</b>${esc(`${lotPrefix}-${String(product.stages.length).padStart(2, "0")}-OUT`)}</span>
          <span class="trace-audit-pill"><b>Fases auditables</b>${esc(String(product.stages.length))}</span>
          <span class="trace-audit-pill"><b>Cambio de unidad</b>${esc(traceWasteSummary.changedUnitStages ? `${traceWasteSummary.changedUnitStages} fase(s)` : "No aplica")}</span>
        </div>
      </article>
      ${product.stages.map((stage, index) => {
        const inCode = `${lotPrefix}-${String(index + 1).padStart(2, "0")}-IN`;
        const outCode = `${lotPrefix}-${String(index + 1).padStart(2, "0")}-OUT`;
        return `
          <article class="trace-phase-card tone-${product.family}">
            <div class="trace-card-head">
              <h4>Fase ${esc(String(stage.seq))}: ${esc(stage.name)}</h4>
              <span class="pill">${esc(stage.subflow)}</span>
            </div>
            <div class="trace-lot-row">
              <div class="trace-lot-block">
                <b>Lote entra</b>
                <span>${esc(inCode)}</span>
                <small>${esc(stage.input)}</small>
              </div>
              <div class="trace-lot-arrow">
                <div class="trace-arrow-label">Transforma</div>
                <div class="trace-transform-card">
                  <b>${esc(stage.name)}</b>
                  <span>${esc(stage.subflow)}</span>
                </div>
                <div class="trace-arrow-line"></div>
                <div class="trace-arrow-icon">&rarr;</div>
              </div>
              <div class="trace-lot-block">
                <b>Lote sale</b>
                <span>${esc(outCode)}</span>
                <small>${esc(stage.output)}</small>
              </div>
            </div>
            <div class="trace-info-grid">
              <div class="trace-info-card">
                <b>Registros</b>
                ${renderAuditList(stage.records)}
              </div>
              <div class="trace-info-card">
                <b>Controles de calidad</b>
                ${renderAuditList(stage.controls)}
              </div>
              <div class="trace-info-card">
                <b>Ubicacion</b>
                <span>${esc(stage.zone)}</span>
              </div>
            </div>
            <div class="helper-line"><b>Lectura:</b> esta fase transforma ${esc(stage.input)} en ${esc(stage.output)} y deja evidencia en ${esc(stage.records)}.</div>
          </article>
        `;
      }).join("")}
      <article class="trace-route-map-card tone-${product.family}">
        <div class="trace-card-head">
          <h4>Mapa visual de trazabilidad del producto</h4>
          <span class="pill">Ruta del lote</span>
        </div>
        <div class="plain-note">Este mapa resume el recorrido completo del lote desde el codigo inicial hasta el lote final y ayuda a revisar auditorias, certificacion y puntos de control.</div>
        <div class="trace-route-map">
          ${product.stages.map((stage, index) => {
            const inCode = `${lotPrefix}-${String(index + 1).padStart(2, "0")}-IN`;
            const outCode = `${lotPrefix}-${String(index + 1).padStart(2, "0")}-OUT`;
            const recordCount = splitAuditItems(stage.records).length;
            const controlCount = splitAuditItems(stage.controls).length;
            return `
              <div class="trace-route-step">
                <div class="trace-route-step-head">
                  <span class="trace-route-seq">${esc(String(stage.seq).padStart(2, "0"))}</span>
                  <b>Fase ${esc(String(stage.seq))}</b>
                  <span>${esc(stage.subflow)}</span>
                </div>
                <h5>${esc(stage.name)}</h5>
                <div class="trace-route-ledger">
                  <div class="trace-route-code-card">
                    <small>Lote entra</small>
                    <span>${esc(inCode)}</span>
                  </div>
                  <div class="trace-route-arrow">&rarr;</div>
                  <div class="trace-route-code-card">
                    <small>Lote sale</small>
                    <span>${esc(outCode)}</span>
                  </div>
                </div>
                <div class="trace-route-summary">
                  <span class="trace-route-chip">${esc(stage.zone)}</span>
                  <span class="trace-route-chip">${esc(`${recordCount} registro${recordCount === 1 ? "" : "s"}`)}</span>
                  <span class="trace-route-chip">${esc(`${controlCount} control${controlCount === 1 ? "" : "es"}`)}</span>
                </div>
              </div>
            `;
          }).join("")}
        </div>
      </article>
    </div>
  `;

  const subflowModels = product.subflows.map((flow, flowIndex) => {
    const stages = product.stages.filter((stage) => stage.subflow === flow.name);
    const firstStage = stages[0];
    const lastStage = stages[stages.length - 1];
    const hours = stages.reduce((sum, stage) => sum + num(String(stage.time).replace(" h", "")), 0);
    const peopleHours = stages.reduce((sum, stage) => sum + num(String(stage.peopleHours).replace(" h-persona", "")), 0);
    const wasteSummary = getTraceWasteSummary(stages);
    return {
      flow,
      flowIndex,
      stages,
      firstStage,
      lastStage,
      hours,
      peopleHours,
      wasteSummary,
      sharePct: totalHours ? Math.round((hours / totalHours) * 100) : 0,
    };
  });
  const leadSubflow = [...subflowModels].sort((a, b) => b.hours - a.hours)[0];
  const productInput = parseDemoQuantity(product.stages[0]?.inputQty || "");
  const productOutput = parseDemoQuantity(product.stages[product.stages.length - 1]?.outputQty || "");
  const productSubflowWasteSummary = getTraceWasteSummary(product.stages);
  const productSubflowWastePct = getWastePctLabel(product.stages);

  el("productSubflows").innerHTML = `
    <div class="subflow-overview-card tone-${product.family}">
      <div>
        <div class="impact-title">Arquitectura del producto</div>
        <div class="plain-note">Primero entiendes que bloque mueve mas tiempo, que transforma y que condiciona el cierre del producto.</div>
      </div>
      <div class="subflow-overview-metrics">
        <span>${esc(String(product.subflows.length))} subprocesos</span>
        <span>${esc(String(product.stages.length))} etapas</span>
        <span>${esc(fmt(totalHours, 1))} h acumuladas</span>
      </div>
      <div class="subflow-overview-totals">
        <div class="subflow-total-card">
          <b>Entro al proceso</b>
          <span>${esc(formatParsedQuantity(productInput, productInput.amount !== null && productInput.amount % 1 !== 0 ? 2 : 0))}</span>
        </div>
        <div class="subflow-total-card">
          <b>Salio del proceso</b>
          <span>${esc(formatParsedQuantity(productOutput, productOutput.amount !== null && productOutput.amount % 1 !== 0 ? 2 : 0))}</span>
        </div>
        <div class="subflow-total-card is-waste">
          <b>Merma total visible</b>
          <span>${esc(productSubflowWasteSummary.label)}${productSubflowWastePct ? ` | ${productSubflowWastePct}` : ""}</span>
        </div>
      </div>
    </div>
    <div class="subflow-rail tone-${product.family}">
      ${subflowModels.map((item, index) => `
        <div class="subflow-rail-card tone-${getSeverityTone(item.sharePct, leadSubflow?.flow.name === item.flow.name)} ${leadSubflow?.flow.name === item.flow.name ? "is-lead" : ""}">
          <div class="ribbon-kicker">Subproceso ${esc(String(index + 1))}</div>
          <strong>${esc(item.flow.name)}</strong>
          <span>${esc(String(item.sharePct))}% del tiempo</span>
        </div>
        ${index < subflowModels.length - 1 ? '<div class="subflow-rail-arrow">&rarr;</div>' : ""}
      `).join("")}
    </div>
    <div class="subflow-grid is-strong">
      ${subflowModels.map((item, index) => `
        <article class="subflow-card tone-${product.family} tone-${getSeverityTone(item.sharePct, leadSubflow?.flow.name === item.flow.name)} ${leadSubflow?.flow.name === item.flow.name ? "is-lead" : ""}">
          <div class="subflow-card-top">
            <div>
              <div class="ribbon-kicker">Subproceso ${esc(String(index + 1))}</div>
              <h4>${esc(item.flow.name)}</h4>
            </div>
            <span class="pill">${esc(String(item.stages.length))} fases</span>
          </div>
          <div class="plain-note">${esc(item.flow.purpose)}</div>
          <div class="subflow-impact-row">
            <div class="subflow-impact-card">
              <b>Peso en el proceso</b>
              <span>${esc(String(item.sharePct))}% del tiempo total</span>
            </div>
            <div class="subflow-impact-card ${leadSubflow?.flow.name === item.flow.name ? "is-critical" : ""}">
              <b>Semaforo</b>
              <span>${esc(
                getSeverityTone(item.sharePct, leadSubflow?.flow.name === item.flow.name) === "red"
                  ? "Cuello de botella"
                  : getSeverityTone(item.sharePct, leadSubflow?.flow.name === item.flow.name) === "yellow"
                    ? "Carga media"
                    : "Carga liviana"
              )}</span>
            </div>
            <div class="subflow-impact-card">
              <b>Merma visible</b>
              <span>${esc(item.wasteSummary.label)}${getWastePctLabel(item.stages) ? ` | ${getWastePctLabel(item.stages)}` : ""}</span>
            </div>
          </div>
          <div class="subflow-io">
            <div class="subflow-io-card">
              <b>Entra</b>
              <span>${esc(item.firstStage?.input || "N/D")}</span>
              <small>${esc(item.firstStage?.inputQty || "Sin cantidad")}</small>
            </div>
            <div class="subflow-io-arrow">&rarr;</div>
            <div class="subflow-io-card">
              <b>Sale</b>
              <span>${esc(item.lastStage?.output || "N/D")}</span>
              <small>${esc(item.lastStage?.outputQty || "Sin cantidad")}</small>
            </div>
          </div>
          <div class="subflow-progress">
            ${item.stages.map((stage) => `<span>${esc(String(stage.seq))}</span>`).join("")}
          </div>
          <div class="mini-flow-list is-steps">
            ${item.stages.map((stage, idx) => `<span>${esc(stage.name)}${idx < item.stages.length - 1 ? " ->" : ""}</span>`).join("")}
          </div>
          <div class="subflow-stat-grid">
            <div><b>Tiempo</b><span>${esc(fmt(item.hours, 1))} h</span></div>
            <div><b>Horas-persona</b><span>${esc(fmt(item.peopleHours, 1))} h-persona</span></div>
            <div><b>Zona principal</b><span>${esc(item.firstStage?.zone || "N/D")}</span></div>
            <div><b>Linea</b><span>${esc(item.firstStage?.line || "N/D")}</span></div>
          </div>
        </article>
      `).join("")}
    </div>
    <article class="subflow-reading-card">
      <div class="impact-title">Cuello de botella</div>
      <div class="impact-value">${esc(leadSubflow?.flow.name || "N/D")}</div>
      <div class="plain-note">${esc(leadSubflow ? `${leadSubflow.flow.name} es el cuello de botella porque concentra ${leadSubflow.sharePct}% del tiempo total del proceso (${fmt(leadSubflow.hours, 1)} h) y, si se atrasa, desplaza el cierre de los subprocesos siguientes.` : "Sin lectura disponible.")}</div>
    </article>
  `;

  const bottleneckStage = product.stages.find((stage) => normalizeText(stage.name).includes(normalizeText(product.bottleneck)));
  const capacityPeriod = state.productCapacityPeriod || "week";
  const operatingDays = num(product.operatingDays?.[capacityPeriod] ?? (capacityPeriod === "day" ? 1 : capacityPeriod === "month" ? 30 : 7));
  const periodHours = operatingDays * 24;
  const capacityLabel = product.capacityByPeriod?.[capacityPeriod] || product.weeklyCapacity;
  const capacitySubflowModels = product.subflows.map((flow) => {
    const stages = product.stages.filter((stage) => stage.subflow === flow.name);
    const totalBlockHours = stages.reduce((sum, stage) => sum + num(String(stage.time).replace(" h", "")), 0);
    const peopleHours = stages.reduce((sum, stage) => sum + num(String(stage.peopleHours).replace(" h-persona", "")), 0);
    const setupHours = stages.reduce((sum, stage) => sum + num(stage.setupHours || 0), 0);
    const cleanupHours = stages.reduce((sum, stage) => sum + num(stage.cleanupHours || 0), 0);
    const changeoverHours = stages.reduce((sum, stage) => sum + num(stage.changeoverHours || 0), 0);
    const blockedHours = setupHours + cleanupHours + changeoverHours;
    const longestStage = [...stages].sort((a, b) => num(String(b.time).replace(" h", "")) - num(String(a.time).replace(" h", "")))[0];
    const outputParsed = parseDemoQuantity(stages[stages.length - 1]?.outputQty || "");
    const theoreticalRuns = totalBlockHours > 0 ? periodHours / totalBlockHours : 0;
    const effectiveCycleHours = totalBlockHours + blockedHours;
    const realRuns = effectiveCycleHours > 0 ? periodHours / effectiveCycleHours : 0;
    const estimatedOutputAmount = outputParsed.amount !== null ? outputParsed.amount * theoreticalRuns : null;
    const realOutputAmount = outputParsed.amount !== null ? outputParsed.amount * realRuns : null;
    const lostOutputAmount = Number.isFinite(estimatedOutputAmount) && Number.isFinite(realOutputAmount)
      ? Math.max(0, estimatedOutputAmount - realOutputAmount)
      : null;
    const tone = getSeverityTone(totalHours ? Math.round((totalBlockHours / totalHours) * 100) : 0, flow.name === leadSubflow?.flow.name);
    return {
      flow,
      stages,
      totalBlockHours,
      peopleHours,
      setupHours,
      cleanupHours,
      changeoverHours,
      blockedHours,
      longestStage,
      theoreticalRuns,
      realRuns,
      estimatedOutputAmount,
      realOutputAmount,
      lostOutputAmount,
      outputUnit: outputParsed.unit,
      tone,
    };
  });
  el("productCapacity").innerHTML = `
    <div class="capacity-shell">
      <div class="impact-card tone-${product.family}">
        <div class="capacity-head-row">
          <div>
            <div class="impact-title">Capacidad ${esc(capacityPeriodLabel(capacityPeriod))} estimada</div>
            <div class="impact-value">${esc(capacityLabel)}</div>
            <div class="impact-note">Total del proceso: ${esc(fmt(totalHours, 1))} h de recorrido y ${esc(fmt(totalPeopleHours, 1))} horas-persona acumuladas.</div>
          </div>
          <div class="capacity-periods">
            <button class="capacity-period-button ${capacityPeriod === "day" ? "is-active" : ""}" type="button" data-capacity-period="day">Diaria</button>
            <button class="capacity-period-button ${capacityPeriod === "week" ? "is-active" : ""}" type="button" data-capacity-period="week">Semanal</button>
            <button class="capacity-period-button ${capacityPeriod === "month" ? "is-active" : ""}" type="button" data-capacity-period="month">Mensual</button>
          </div>
        </div>
      </div>
      <div class="capacity-overview-grid">
        <div class="capacity-summary-card">
          <b>Dias operativos</b>
          <span>${esc(String(operatingDays))} dia(s)</span>
          <small>Base visible para la capacidad ${esc(capacityPeriodLabel(capacityPeriod))}</small>
        </div>
        <div class="capacity-summary-card">
          <b>Horas operativas</b>
          <span>${esc(fmt(periodHours, 0))} h</span>
          <small>Ventana total del periodo seleccionado</small>
        </div>
        <div class="capacity-summary-card is-critical">
          <b>Cuello de botella</b>
          <span>${esc(product.bottleneck)}</span>
          <small>${esc(product.blockingReason)}</small>
        </div>
        <div class="capacity-summary-card">
          <b>Equipo critico</b>
          <span>${esc(bottleneckStage?.machine || "Por definir")}</span>
          <small>${esc(bottleneckStage?.zone || "Sin zona")} | ${esc(bottleneckStage?.line || "Sin linea")}</small>
        </div>
      </div>
      <div class="capacity-flow-grid">
        ${capacitySubflowModels.map((item, index) => `
          <article class="capacity-flow-card tone-${item.tone}">
            <div class="trace-card-head">
              <h4>Subproceso ${esc(String(index + 1))}: ${esc(item.flow.name)}</h4>
              <span class="signal ${esc(item.tone)}">${esc(item.tone === "red" ? "Cuello" : item.tone === "yellow" ? "Exigido" : "Con margen")}</span>
            </div>
            <div class="capacity-bar-meta">
              <b>Carga del subproceso</b>
              <span>${esc(fmt((item.totalBlockHours / Math.max(totalHours, 1)) * 100, 0))}% del tiempo total</span>
            </div>
            <div class="capacity-bar">
              <div class="capacity-bar-fill tone-${item.tone}" style="width:${Math.max(18, Math.min(100, (item.totalBlockHours / Math.max(totalHours, 1)) * 100))}%"></div>
            </div>
            <div class="capacity-flow-stats">
              <div><b>Tiempo del bloque</b><span>${esc(fmt(item.totalBlockHours, 1))} h</span></div>
              <div><b>Horas-persona</b><span>${esc(fmt(item.peopleHours, 1))} h-persona</span></div>
              <div><b>Corridas teoricas</b><span>${esc(fmt(item.theoreticalRuns, 1))}</span></div>
              <div><b>Salida estimada</b><span>${esc(formatCapacityOutput(item.estimatedOutputAmount, item.outputUnit))}</span></div>
              <div><b>Corridas ajustadas</b><span>${esc(fmt(item.realRuns, 1))}</span></div>
              <div><b>Salida ajustada</b><span>${esc(formatCapacityOutput(item.realOutputAmount, item.outputUnit))}</span></div>
              <div><b>Etapa critica</b><span>${esc(item.longestStage?.name || "N/D")}</span></div>
              <div><b>Equipo clave</b><span>${esc(item.longestStage?.machine || "N/D")}</span></div>
            </div>
            <div class="capacity-flow-losses">
              <span><b>Setup:</b> ${esc(fmt(item.setupHours, 1))} h</span>
              <span><b>Limpieza:</b> ${esc(fmt(item.cleanupHours, 1))} h</span>
              <span><b>Cambio:</b> ${esc(fmt(item.changeoverHours, 1))} h</span>
              <span><b>Ajuste operativo:</b> ${esc(formatCapacityOutput(item.lostOutputAmount, item.outputUnit))}</span>
            </div>
            <div class="plain-note">${esc(
              item.blockedHours > 0
                ? item.tone === "red"
                  ? `${item.flow.name} concentra la mayor carga del periodo y condiciona la salida ${capacityPeriodLabel(capacityPeriod)} del producto. La salida ajustada baja frente a la estimada por setup, limpieza y cambios del bloque.`
                  : item.tone === "yellow"
                    ? `${item.flow.name} requiere seguimiento porque absorbe una parte importante del tiempo disponible y reduce parte de su salida por tiempos no productivos.`
                    : `${item.flow.name} tiene una carga mas liviana frente al resto del proceso y pierde menos salida por tiempos no productivos.`
                : item.tone === "red"
                  ? `${item.flow.name} concentra la mayor carga del periodo y condiciona la salida ${capacityPeriodLabel(capacityPeriod)} del producto. Aun no hay descuentos operativos cargados para bajar esta salida estimada.`
                  : item.tone === "yellow"
                    ? `${item.flow.name} requiere seguimiento. Aun no hay descuentos operativos cargados, por eso la salida ajustada coincide con la estimada.`
                    : `${item.flow.name} tiene una carga mas liviana frente al resto del proceso. Como no hay descuentos operativos cargados, la salida ajustada coincide con la estimada.`
            )}</div>
          </article>
        `).join("")}
      </div>
      <div class="plain-list">
        <div class="plan-note"><b>Lectura operativa:</b> primero validas el cuello interno del producto y despues cruzas esta lectura con recursos compartidos de fabrica.</div>
        <div class="plan-note"><b>Personas movilizadas:</b> ${esc(String(totalPeople))} asignaciones acumuladas en las fases.</div>
      </div>
    </div>
  `;
}

function buildSharedReasonCards(items = []) {
  const activeNames = items.map((item) => normalizeText(item.name));
  const cards = [];
  if (activeNames.some((name) => name.includes("secador") || name.includes("termica"))) {
    cards.push({
      title: "Calor",
      body: "Los recursos termicos activos deben reservarse por una sola familia por ventana.",
      action: "Separar lotes termicos por turno y proteger la limpieza entre cambios.",
    });
  }
  if (activeNames.some((name) => name.includes("termica") || name.includes("tost"))) {
    cards.push({
      title: "Humo",
      body: "Tueste y tostado compiten por zonas que no deben compartir aire de proceso.",
      action: "Mover la segunda familia al siguiente turno o a una ventana de reserva.",
    });
  }
  if (activeNames.some((name) => name.includes("molienda") || name.includes("seca") || name.includes("secador"))) {
    cards.push({
      title: "Polvo",
      body: "La operacion seca activa exige cerrar una familia completa antes de abrir la siguiente.",
      action: "Concentrar molienda, trilla o descascarillado en bloques cerrados y no paralelos.",
    });
  }
  if (activeNames.some((name) => name.includes("extract") || name.includes("cosmet") || name.includes("bodega"))) {
    cards.push({
      title: "Olor y sensibilidad",
      body: "Los ambientes sensibles deben trabajar por familias secuenciales y con sanitizacion visible.",
      action: "Mover crema y extractos a bloques exclusivos cuando el recurso este bajo presion.",
    });
  }
  if (activeNames.some((name) => name.includes("empaque") || name.includes("bodega"))) {
    cards.push({
      title: "Capacidad",
      body: "El recurso compartido crea cola y obliga a elegir que familia cierra primero el periodo.",
      action: "Priorizar un solo cierre comercial por bloque y mandar el resto a reserva.",
    });
  }
  return cards.length
    ? cards
    : [{
      title: "Secuencia",
      body: "Las familias activas deben reservar una sola ventana por recurso compartido.",
      action: "Mover la familia no prioritaria a la siguiente ventana libre.",
    }];
}

function renderSharedResourcesReference() {
  const scenarioData = buildPlanScenario();
  const items = getActiveSharedResources(Array.from(scenarioData.selectedKeys));
  const profiles = items.map((item) => ({
    item,
    impact: getSharedImpactProfile(item),
    decision: getSharedDecision(item),
  }));
  const thermalFamilies = unique(
    items
      .filter((item) => normalizeText(item.name).includes("termica") || normalizeText(item.name).includes("secador"))
      .flatMap((item) => getSharedFamilies(item))
  );
  const packagingFamilies = unique(
    items
      .filter((item) => normalizeText(item.name).includes("empaque"))
      .flatMap((item) => getSharedFamilies(item))
  );
  renderKpis("sharedKpis", [
    { label: "Recursos compartidos", value: String(items.length), note: "Equipos, salas y zonas sensibles" },
    { label: "Criticos", value: String(items.filter((item) => item.severity === "high").length), note: "No deben correr al mismo tiempo" },
    { label: "Zona termica", value: `${thermalFamilies.length} familia(s)`, note: thermalFamilies.join(", ") || "Sin familias activas" },
    { label: "Empaque", value: `${packagingFamilies.length} familia(s)`, note: packagingFamilies.join(", ") || "Sin familias activas" },
  ]);

  el("sharedSummary").textContent = `La lectura se arma con ${scenarioData.selectedEntries.length} familia(s) activa(s) en el escenario actual y sugiere que mover primero, que producto se bloquea y que ventana conviene reservar.`;
  el("sharedBoard").innerHTML = `
    <div class="shared-grid">
      ${profiles.map(({ item, impact, decision }) => `
        <article class="shared-card tone-generic">
          <div class="trace-card-head">
            <h4>${esc(item.name)}</h4>
            <span class="signal ${conflictTone(item.severity)}">${esc(item.rule)}</span>
          </div>
          <div class="helper-line"><b>Sitio / zona / linea:</b> ${esc(item.site)} | ${esc(item.zone)} | ${esc(item.line)}</div>
          <div class="helper-line"><b>Usado por:</b> ${esc(item.usedBy.join(" | "))}</div>
          <div class="helper-line"><b>Motivo:</b> ${esc(item.reason)}</div>
          <div class="helper-line"><b>Bloquea a:</b> ${esc(decision.blocks)}</div>
          <div class="helper-line"><b>Mover a:</b> ${esc(decision.move)}</div>
          <div class="helper-line"><b>Ventana sugerida:</b> ${esc(decision.window)}</div>
          <div class="shared-metrics-row">
            <span class="legend-chip">Severidad ${esc(impact.severityLabel)}</span>
            <span class="legend-chip">${esc(String(impact.familyCount))} familia(s)</span>
            <span class="legend-chip">${esc(`${impact.impactHours} h afectadas`)}</span>
          </div>
        </article>
      `).join("")}
    </div>
  `;

  el("sharedTraffic").innerHTML = `
    <div class="bottle-stack">
      ${profiles.map(({ item, impact, decision }) => {
        const tone = conflictTone(item.severity);
        const width = tone === "red" ? 92 : tone === "yellow" ? 64 : 36;
        return `
          <div class="bottle-line">
            <div class="bottle-head">
              <span>${esc(item.name)}</span>
              <span class="signal ${tone}">${esc(item.rule)}</span>
            </div>
            <div class="traffic-rail large"><span class="traffic-fill ${tone}" style="width:${width}%"></span></div>
            <div class="chart-row compact">
              <span class="chart-label">Severidad estimada</span>
              <div class="chart-meta">${esc(`${impact.capacityDrop}% de caida potencial | ${impact.impactHours} h afectadas | ${impact.familyCount} familia(s) impactadas`)}</div>
            </div>
            <div class="helper-line"><b>Decision sugerida:</b> ${esc(decision.move)}</div>
          </div>
        `;
      }).join("")}
    </div>
  `;

  const reasonCards = buildSharedReasonCards(items);
  el("sharedReasons").innerHTML = `
    <div class="plain-list">
      ${reasonCards.map((card) => `
        <div class="improve-card"><b>${esc(card.title)}:</b> ${esc(card.body)} <span class="plain-note">Accion: ${esc(card.action)}</span></div>
      `).join("")}
    </div>
  `;
}

function renderMasterReference() {
  const scenarioData = buildPlanScenario();
  const plan = scenarioData.plan;
  const high = plan.filter((item) => item.conflict === "High").length;
  const medium = plan.filter((item) => item.conflict === "Medium").length;
  const productPlanInputs = scenarioData.selectedEntries.map(([key, product]) => {
    const matrixInfo = summarizeProductPlanInput(key);
    const commitment = projectedCommitment(key, product, scenarioData);
    return {
      key,
      product,
      matrixInfo,
      commitment,
    };
  });
  const commitmentMap = Object.fromEntries(productPlanInputs.map((item) => [item.key, item.commitment]));
  const sharedHotspots = unique(productPlanInputs.flatMap((item) => item.matrixInfo?.allShared || [])).length;
  el("masterScenarioBoard").innerHTML = `
    <div class="plan-sim-shell">
      <div class="plan-sim-grid compact">
        <div class="field">
          <label>Periodo de proyeccion</label>
          <select id="planPeriodSelect">
            ${Object.entries(PLAN_PERIOD_OPTIONS).map(([value, option]) => `<option value="${esc(value)}" ${scenarioData.scenario.period === value ? "selected" : ""}>${esc(option.label)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Horas trabajadas por turno</label>
          <select id="planHoursSelect">
            ${Array.from({ length: 12 }, (_, index) => index + 1).map((value) => `<option value="${esc(String(value))}" ${scenarioData.workedHoursPerDay === value ? "selected" : ""}>${esc(`${value} h`)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Horas extra</label>
          <select id="planExtraSelect">
            ${[0, 1, 2, 3, 4].map((value) => `<option value="${esc(String(value))}" ${scenarioData.extraHours === value ? "selected" : ""}>${esc(value === 0 ? "Sin extras" : `${value} h extra`)}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Turnos</label>
          <select id="planShiftCountSelect">
            ${[1, 2, 3].map((value) => `<option value="${esc(String(value))}" ${scenarioData.shifts === value ? "selected" : ""}>${esc(`${value} turno${value > 1 ? "s" : ""}`)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="plan-scenario-meta scenario-strip">
        <span class="legend-chip">${esc(`${scenarioData.selectedEntries.length} producto(s) activos`)}</span>
        <span class="legend-chip">${esc(`${fmt(scenarioData.totalHoursPerDay, 0)} h por dia`)}</span>
        <span class="legend-chip">${esc(`${scenarioData.plannedDays} dias en ${scenarioData.periodCfg.label.toLowerCase()}`)}</span>
      </div>
    </div>
    <div class="plan-config-grid">
      <div class="plan-days-card">
        <div class="trace-card-head slim">
          <h4>Dias trabajados</h4>
          <span class="pill">${esc(`${scenarioData.workDays} activos`)}</span>
        </div>
      <div class="plan-quick-row">
        <button class="btn btn-light btn-mini" type="button" id="planWeekdaysBtn">Lun-Vie</button>
        <button class="btn btn-light btn-mini" type="button" id="planAllDaysBtn">Lun-Dom</button>
      </div>
      <div class="plan-day-toggle-stack">
        <div class="plan-day-toggle-row weekday-row">
          ${PLAN_WEEKDAYS.slice(0, 5).map((day) => `
            <label class="plan-day-toggle ${(scenarioData.scenario.weekdays || []).includes(day.key) ? "is-on" : ""}">
              <input type="checkbox" class="plan-day-check" value="${esc(day.key)}" ${(scenarioData.scenario.weekdays || []).includes(day.key) ? "checked" : ""} />
              <span>${esc(day.short)}</span>
            </label>
          `).join("")}
        </div>
        <div class="plan-day-toggle-row weekend-row">
          ${PLAN_WEEKDAYS.slice(5).map((day) => `
          <label class="plan-day-toggle ${(scenarioData.scenario.weekdays || []).includes(day.key) ? "is-on" : ""}">
            <input type="checkbox" class="plan-day-check" value="${esc(day.key)}" ${(scenarioData.scenario.weekdays || []).includes(day.key) ? "checked" : ""} />
            <span>${esc(day.short)}</span>
          </label>
          `).join("")}
        </div>
      </div>
    </div>
      <div class="plan-filter-card">
        <div class="trace-card-head slim">
          <h4>Productos a simular</h4>
          <span class="pill">${esc(`${scenarioData.selectedEntries.length} activos`)}</span>
        </div>
        <div class="plan-product-toggle-row">
          ${getDemoProducts().map(([key, product]) => `
            <label class="plan-product-toggle tone-${product.family}">
              <input type="checkbox" class="plan-product-check" value="${esc(key)}" ${scenarioData.selectedKeys.has(key) ? "checked" : ""} />
              <span>${esc(product.title)}</span>
            </label>
          `).join("")}
        </div>
        <div class="helper-line compact"><b>Escenario:</b> ${esc(scenarioData.periodCfg.label)} | ${esc(String(scenarioData.plannedDays))} dias | ${esc(String(scenarioData.workedHoursPerDay))} h + ${esc(String(scenarioData.extraHours))} h extra | ${esc(String(scenarioData.shifts))} turno(s).</div>
      </div>
    </div>
  `;
  renderKpis("masterKpis", [
    { label: "Dias planificados", value: String(scenarioData.plannedDays), note: `${scenarioData.periodCfg.label} de fabrica` },
    { label: "Choques altos", value: String(high), note: "Requieren reprogramacion" },
    { label: "Productos activos", value: `${scenarioData.selectedEntries.length} familia(s)`, note: scenarioData.selectedEntries.map(([, product]) => product.title).join(", ") || "Sin productos" },
    { label: "Carga humana", value: `${scenarioData.personnelSummary.overloadCount} sin horas`, note: `${scenarioData.personnelSummary.extraCount} persona(s) en extra | ${fmt(scenarioData.totalHoursPerDay, 0)} h por dia` },
  ]);

  el("masterPlanBoard").innerHTML = `
    <div class="master-summary-grid refined">
      <article class="master-summary-card emphasis summary-lead">
        <div class="report-kicker">Lectura del escenario</div>
        <h4>Plan proyectado</h4>
        <p>Simula periodo, dias, jornada y productos activos para decidir que familia entra primero, que recurso reservar y que lote conviene mover.</p>
      </article>
      <article class="master-summary-card summary-stat">
        <div class="report-kicker">Riesgo visible</div>
        <div class="report-metric">${esc(String(high))}</div>
        <p>${esc(String(medium))} ajuste(s) medio(s) y ${esc(String(sharedHotspots))} recurso(s) sensibles.</p>
      </article>
      <article class="master-summary-card summary-rule">
        <div class="report-kicker">Regla de secuencia</div>
        <ol class="summary-rule-list">
          <li>Reservar recurso comun.</li>
          <li>Correr cuello interno.</li>
          <li>Cerrar empaque sin mezclar familias incompatibles.</li>
        </ol>
      </article>
    </div>
    <div class="plan-route-grid">
      ${productPlanInputs.map(({ key, product, matrixInfo, commitment }) => `
        <article class="plan-route-card tone-${product.family}">
          <div class="trace-card-head">
            <h4>${esc(product.title)}</h4>
            <span class="pill">${esc(commitment.feasibility === "N/D" ? commitment.projectedLabel : `${commitment.feasibility} | ${commitment.committedProjectedLabel}`)}</span>
          </div>
          <div class="master-route-kpis">
            <div><b>Cuello</b><span>${esc(matrixInfo?.bottleneckSubprocess?.name || product.bottleneck)}</span></div>
            <div><b>Recurso clave</b><span>${esc((matrixInfo?.keyEquipment || []).slice(0, 1).join(" | ") || "N/D")}</span></div>
            <div><b>Salida nominal</b><span>${esc(commitment.projectedLabel)}</span></div>
            <div><b>Salida comprometida</b><span>${esc(commitment.committedProjectedLabel)}</span></div>
          </div>
          <div class="plan-route-lines">
            <div><b>Ruta sugerida</b><span>${esc((matrixInfo?.matrixProduct.subprocesses || []).map((subprocess) => subprocess.name).join(" -> "))}</span></div>
            <div><b>Entrar por</b><span>${esc((matrixInfo?.matrixProduct.originOptions || []).slice(0, 2).join(" | "))}</span></div>
            <div><b>Tiempo del cuello</b><span>${esc(matrixInfo ? `${fmt(matrixInfo.bottleneckHours, 1)} h` : "N/D")}</span></div>
            <div><b>Compartidos sensibles</b><span>${esc((matrixInfo?.allShared || []).slice(0, 3).join(" | ") || "Sin cruces")}</span></div>
            <div><b>Cobertura humana</b><span>${esc(`${fmt(commitment.laborCoveragePct, 0)}%`)}</span></div>
            <div><b>Castigo del escenario</b><span>${esc(`${fmt(commitment.finalPenaltyPct, 0)}%`)}</span></div>
          </div>
        </article>
      `).join("")}
    </div>
    <div class="master-week-grid">
      ${plan.map((item) => {
        const action = getWeeklyDayAction(item);
        const feasibilityDecision = buildDayFeasibilityDecision(item, commitmentMap);
        const activeFamilies = getDayActiveFamilies(item);
        const slots = buildWeeklySlots(item);
        return `
        <article class="master-day-card">
          <div class="trace-card-head">
            <h4>${esc(item.day)}</h4>
            <span class="signal ${esc(feasibilityDecision.tone)}">${esc(feasibilityDecision.status)}</span>
          </div>
          <div class="helper-line compact"><b>Foco del dia:</b> ${esc(item.focus)}</div>
          <div class="master-day-meta">
            <div><b>Recurso comun</b><span>${esc(item.shared)}</span></div>
            <div><b>Producto comprometido</b><span>${esc(feasibilityDecision.blockedProduct)}</span></div>
          </div>
          <div class="helper-line compact"><b>Cobertura horaria:</b> ${esc(fmt(num(item.assignedHours), 1))} h asignadas de ${esc(fmt(num(item.requiredHours), 1))} h requeridas (${esc(fmt(num(item.utilizationPct), 0))}%).</div>
          <div class="weekly-slot-grid">
            ${slots.map((slot) => `
              <div class="weekly-slot-card tone-${slot.key} state-${normalizeText(slot.state)}">
                <b>${esc(slot.slot)}</b>
                <strong>${esc(slot.label)}</strong>
                <span>${esc(slot.activity)}</span>
                <small>${esc(slot.state)} | ${esc(fmt(num(slot.assignedHours), 1))}/${esc(fmt(num(slot.requiredHours), 1))} h</small>
              </div>
            `).join("")}
          </div>
          <div class="master-day-callout">
            <div><b>Que mover:</b> ${esc(feasibilityDecision.action)}</div>
            <div><b>Ventana sugerida:</b> ${esc(feasibilityDecision.moveTo)}</div>
          </div>
          <div class="master-chip-row">
            <span class="legend-chip">${esc(`${activeFamilies.length} familia(s) activas`)}</span>
            <span class="legend-chip">${esc(action.reserve)}</span>
          </div>
        </article>
      `;
      }).join("")}
    </div>
  `;

  el("masterConflictBoard").innerHTML = `
    <div class="master-decision-grid">
      ${plan.map((item) => {
        const feasibilityDecision = buildDayFeasibilityDecision(item, commitmentMap);
        return `
        <div class="conflict-card ${feasibilityDecision.tone === "red" ? "is-conflict" : feasibilityDecision.tone === "yellow" ? "is-watch" : "is-clear"}">
          <div class="trace-card-head">
            <h4>${esc(item.day)}</h4>
            <span class="signal ${esc(feasibilityDecision.tone)}">${esc(feasibilityDecision.status)}</span>
          </div>
          <div class="helper-line"><b>Que bloquea:</b> ${esc(item.shared)}</div>
          <div class="helper-line"><b>Por que:</b> ${esc(item.why)}</div>
          <div class="helper-line"><b>Producto afectado:</b> ${esc(feasibilityDecision.blockedProduct)}</div>
          <div class="helper-line"><b>Decision sugerida:</b> ${esc(feasibilityDecision.action)}</div>
          <div class="helper-line"><b>Ventana:</b> ${esc(feasibilityDecision.moveTo)}</div>
          <div class="helper-line"><b>Resultado esperado:</b> ${esc(feasibilityDecision.expected)}</div>
        </div>
      `;
      }).join("")}
    </div>
  `;

  el("masterOutputBoard").innerHTML = `
    <div class="master-output-grid">
      ${productPlanInputs.map(({ product, matrixInfo, commitment }) => `
        <div class="impact-card tone-${product.family} ${commitment.feasibility === "No cabe" ? "is-not-feasible" : commitment.feasibility === "Parcial" ? "is-partial" : commitment.feasibility === "Ajustar" ? "is-adjust" : "is-feasible"}">
          <div class="impact-title">${esc(product.title)} proyectado</div>
          <div class="impact-value">${esc(commitment.committedProjectedLabel)}</div>
          <div class="impact-note">${esc(product.blockingReason)}</div>
          <div class="impact-status-row">
            <span class="signal ${esc(commitment.feasibility === "No cabe" ? "red" : commitment.feasibility === "Parcial" ? "yellow" : commitment.feasibility === "Ajustar" ? "yellow" : "green")}">${esc(commitment.feasibility)}</span>
            <span class="legend-chip">${esc(`${fmt(commitment.finalPenaltyPct, 0)}% de castigo`)}</span>
          </div>
          <div class="phase-meta compact">
            <div><b>Salida nominal</b><span>${esc(commitment.projectedLabel)}</span></div>
            <div><b>Salida comprometida</b><span>${esc(commitment.committedProjectedLabel)}</span></div>
            <div><b>Caida estimada</b><span>${esc(`${fmt(commitment.finalPenaltyPct, 0)}%`)}</span></div>
            <div><b>Recurso a proteger</b><span>${esc((matrixInfo?.allShared || []).slice(0, 1).join(" | ") || "Cuello interno")}</span></div>
            <div><b>Factibilidad</b><span>${esc(commitment.feasibility)}</span></div>
            <div><b>Cobertura humana</b><span>${esc(`${fmt(commitment.laborCoveragePct, 0)}%`)}</span></div>
            <div><b>Cobertura de slots</b><span>${esc(`${fmt(commitment.slotCoveragePct || 0, 0)}%`)}</span></div>
            <div><b>Slots movidos</b><span>${esc(String(commitment.moveCount || 0))}</span></div>
            <div><b>Slots ajustados</b><span>${esc(String(commitment.adjustCount || 0))}</span></div>
          </div>
          <div class="helper-line"><b>Horas del escenario:</b> ${esc(fmt(commitment.assignedHours || 0, 1))} h asignadas de ${esc(fmt(commitment.requiredHours || 0, 1))} h requeridas para esta familia.</div>
          <div class="helper-line"><b>Secuencia recomendada:</b> ${esc(
            matrixInfo?.bottleneckSubprocess
              ? `preparar insumo -> correr ${matrixInfo.bottleneckSubprocess.name} -> cerrar en linea compartida`
              : "preparar -> transformar -> cerrar"
          )}</div>
          <div class="helper-line"><b>Lectura:</b> ${esc(commitment.feasibility === "Cabe"
            ? "El escenario sostiene esta familia sin castigo fuerte."
            : commitment.feasibility === "Ajustar"
              ? "La familia cabe con ajustes de ventana o protegiendo mejor el recurso comun."
              : commitment.feasibility === "Parcial"
                ? "Solo una parte de la salida se sostiene; hay que mover productos o ampliar jornada."
                : "El escenario no sostiene esta familia como esta planteado; requiere reprogramacion o mas capacidad.")}</div>
        </div>
      `).join("")}
    </div>
    <div class="improve-card"><b>Lectura clave:</b> la proyeccion mejora cuando primero reservas el recurso comun, luego corres el cuello interno de cada familia y al final validas si la carga humana sigue dentro de jornada o entra en horas extra.</div>
  `;

  el("masterPeopleBoard").innerHTML = `
    <div class="people-rules-grid">
      ${scenarioData.personnelSummary.personnel.map((entry) => {
        const { person, dayLoads, total, maxDay, tone } = entry;
        const target = person.targetHoursPerDay;
        const extra = person.maxExtraHours;
        const days = PLAN_WEEKDAYS.map((day) => [day.short, num(dayLoads.find(([key]) => key === day.key)?.[1])]);
        return `
          <article class="people-card tone-${tone}">
            <div class="trace-card-head">
              <h4>${esc(person.name)}</h4>
              <span class="signal ${tone}">${esc(HUMAN_WORK_MODES[person.workMode]?.label || person.workMode)}</span>
            </div>
            <div class="helper-line"><b>Rol:</b> ${esc(person.roleGroup)}</div>
            <div class="helper-line"><b>Meta diaria:</b> ${esc(String(target))} h | <b>Extra:</b> ${esc(String(extra))} h</div>
            <div class="helper-line"><b>Disponibilidad:</b> ${esc(person.weeklyAvailability)}</div>
            <div class="people-load-row">
              ${days.map(([label, hours]) => `
                <div class="people-load-chip ${loadTone(hours, target, extra)}">
                  <strong>${esc(label)}</strong>
                  <span>${esc(String(hours))} h</span>
                </div>
              `).join("")}
            </div>
            <div class="helper-line"><b>Total visible:</b> ${esc(String(total))} h | <b>Estado:</b> ${maxDay > target + extra ? "Sin horas disponibles" : maxDay > target ? "En horas extra" : "Dentro de jornada"}</div>
          </article>
        `;
      }).join("")}
      <article class="people-policy-card">
        <h4>Politica sugerida de carga</h4>
        <div class="plan-note"><b>Escenario actual:</b> ${esc(scenarioData.workDays)} dia(s) activos | ${esc(fmt(scenarioData.totalHoursPerDay, 0))} h por dia | ${esc(scenarioData.shifts)} turno(s).</div>
        <div class="plan-note"><b>Horas visibles:</b> ${esc(fmt(scenarioData.personnelSummary.plannedHours, 0))} h planificadas frente a ${esc(fmt(scenarioData.personnelSummary.availableHours, 0))} h objetivo + extra.</div>
        <div class="plan-note"><b>Personas en extra:</b> ${esc(String(scenarioData.personnelSummary.extraCount))} | <b>Sin horas:</b> ${esc(String(scenarioData.personnelSummary.overloadCount))}.</div>
        <div class="plan-note"><b>Edicion activa:</b> puedes ajustar personas, carga diaria y jornadas en este mismo bloque.</div>
      </article>
    </div>
  `;

  el("planPeriodSelect")?.addEventListener("change", async (event) => {
    state.planScenario.period = event.target.value;
    await saveReferenceFactoryData();
    renderMasterReference();
  });
  el("planHoursSelect")?.addEventListener("change", async (event) => {
    state.planScenario.baseHours = Number(event.target.value) || 8;
    await saveReferenceFactoryData();
    renderMasterReference();
  });
  el("planExtraSelect")?.addEventListener("change", async (event) => {
    state.planScenario.extraHours = Number(event.target.value) || 0;
    await saveReferenceFactoryData();
    renderMasterReference();
  });
  el("planShiftCountSelect")?.addEventListener("change", async (event) => {
    state.planScenario.shifts = Number(event.target.value) || 1;
    await saveReferenceFactoryData();
    renderMasterReference();
  });
  document.querySelectorAll(".plan-day-check").forEach((input) => {
    input.addEventListener("change", async () => {
      const selected = Array.from(document.querySelectorAll(".plan-day-check:checked")).map((node) => node.value);
      state.planScenario.weekdays = selected.length ? selected : ["monday"];
      await saveReferenceFactoryData();
      renderMasterReference();
    });
  });
  el("planWeekdaysBtn")?.addEventListener("click", async () => {
    state.planScenario.weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday"];
    await saveReferenceFactoryData();
    renderMasterReference();
  });
  el("planAllDaysBtn")?.addEventListener("click", async () => {
    state.planScenario.weekdays = PLAN_WEEKDAYS.map((day) => day.key);
    await saveReferenceFactoryData();
    renderMasterReference();
  });
  document.querySelectorAll(".plan-product-check").forEach((input) => {
    input.addEventListener("change", async () => {
      const selected = Array.from(document.querySelectorAll(".plan-product-check:checked")).map((node) => node.value);
      state.planScenario.selectedProducts = selected;
      await saveReferenceFactoryData();
      renderMasterReference();
    });
  });
}

function renderReportReference() {
  return renderCommercialReportReference();
}

function renderCommercialReportReference() {
  const scenarioData = buildPlanScenario();
  const selectedEntries = scenarioData.selectedEntries;
  if (!selectedEntries.length) {
    el("printFlowBoard").innerHTML = `<div class="empty">Selecciona al menos un producto en Plan para construir el reporte del escenario.</div>`;
    el("printExecutiveBoard").innerHTML = `<div class="empty">El reporte ejecutivo se activa cuando el escenario tiene productos seleccionados.</div>`;
    el("printPosterBoard").innerHTML = `<div class="empty">No hay productos activos para mostrar en el reporte.</div>`;
    return;
  }
  const products = selectedEntries.map(([, product]) => product);
  const selectedNames = products.map((product) => product.title);
  const productCommitments = Object.fromEntries(
    selectedEntries.map(([key, product]) => [key, projectedCommitment(key, product, scenarioData)])
  );
  const profile = getBusinessProfile();
  const totalStages = products.reduce((sum, product) => sum + product.stages.length, 0);
  const totalSubflows = products.reduce((sum, product) => sum + product.subflows.length, 0);
  const sharedResources = getActiveSharedResources(Array.from(scenarioData.selectedKeys));
  const sharedCritical = sharedResources.filter((item) => String(item.severity) === "high").length;
  const allRecords = unique(products.flatMap((product) => product.stages.flatMap((stage) => splitAuditItems(stage.records))));
  const allControls = unique(products.flatMap((product) => product.stages.flatMap((stage) => splitAuditItems(stage.controls))));
  const allMachines = unique(products.flatMap((product) => product.stages.map((stage) => stage.machine)));
  const allMaterials = unique(products.flatMap((product) => product.stages.map((stage) => stage.materials)));

  el("printFlowBoard").innerHTML = `
    <div class="report-cover-grid">
      <article class="report-cover-card report-cover-main">
        <div class="report-kicker">Ficha comercial del modulo</div>
        <h4>${esc(profile.organization || "Bionegocio por definir")}</h4>
        <p>Este reporte resume el escenario activo del modulo: procesos visibles, trazabilidad auditable, recursos compartidos y salida comprometida que despues alimenta Costos.</p>
        <div class="phase-meta compact">
          <div><b>Documento</b><span>${esc(profile.documentCode || "Sin codigo")}</span></div>
          <div><b>Responsable</b><span>${esc(profile.responsible || "Por definir")}</span></div>
          <div><b>Cargo</b><span>${esc(profile.responsibleRole || "Sin cargo")}</span></div>
          <div><b>Periodo</b><span>${esc(profile.period || "por lote")}</span></div>
        </div>
      </article>
      <article class="report-cover-card">
        <div class="report-kicker">Alcance visible</div>
        <div class="report-metric">${esc(String(products.length))} familias</div>
        <div class="helper-line"><b>Productos:</b> ${esc(products.map((product) => product.title).join(" | "))}</div>
        <div class="helper-line"><b>Subprocesos:</b> ${esc(String(totalSubflows))}</div>
        <div class="helper-line"><b>Etapas auditables:</b> ${esc(String(totalStages))}</div>
        <div class="helper-line"><b>Escenario:</b> ${esc(`${scenarioData.periodCfg.label} | ${scenarioData.plannedDays} dias | ${fmt(scenarioData.totalHoursPerDay, 0)} h por dia`)}</div>
      </article>
      <article class="report-cover-card">
        <div class="report-kicker">Riesgo de planta</div>
        <div class="report-metric">${esc(String(sharedCritical))} recursos criticos</div>
        <div class="helper-line"><b>Compartidos:</b> ${esc(sharedResources.map((item) => item.name).join(" | ") || "Sin cruces visibles")}</div>
        <div class="helper-line"><b>Lectura:</b> no mezclar familias incompatibles en ventanas paralelas.</div>
      </article>
    </div>
    <div class="value-chain-board">
      ${selectedEntries.map(([key, product]) => `
        <article class="value-chain-column tone-${product.family}">
          <div class="chain-head">${esc(product.title)}</div>
          <div class="chain-input">${esc(product.source)}</div>
          ${product.subflows.map((flow) => `<div class="chain-step">${esc(flow.name)}</div>`).join("")}
          <div class="chain-output">${esc(product.output)}</div>
          <div class="chain-footer">${esc(productCommitments[key]?.committedProjectedLabel || product.weeklyCapacity)} | Cuello: ${esc(product.bottleneck)}</div>
        </article>
      `).join("")}
    </div>
  `;

  el("printExecutiveBoard").innerHTML = `
    <div class="report-executive-grid wide">
      <article class="report-mini-card">
        <div class="report-kicker">Que puede validar gerencia</div>
        <ul class="report-bullet-list">
          <li>Flujo por producto</li>
          <li>Puntos criticos visibles</li>
          <li>Base para ordenar planta</li>
        </ul>
      </article>
      <article class="report-mini-card">
        <div class="report-kicker">Que puede validar auditoria</div>
        <ul class="report-bullet-list">
          <li>${esc(String(allRecords.length))} tipos de registros</li>
          <li>${esc(String(allControls.length))} controles mapeados</li>
          <li>Trazabilidad por fase</li>
        </ul>
      </article>
      <article class="report-mini-card">
        <div class="report-kicker">Que puede validar costos</div>
        <ul class="report-bullet-list">
          <li>${esc(String(allMachines.length))} equipos visibles</li>
          <li>Materiales base</li>
          <li>Horas-persona y uso de equipo</li>
        </ul>
      </article>
      <article class="report-mini-card">
        <div class="report-kicker">Uso recomendado</div>
        <ul class="report-bullet-list">
          <li>Validar diseno de proceso</li>
          <li>Revisar trazabilidad</li>
          <li>Ajustar reglas antes de operar</li>
        </ul>
      </article>
    </div>
    <div class="plain-list report-summary-list">
      <div class="plan-note"><b>Procesos visibles:</b> ${esc(selectedNames.join(", "))}</div>
      <div class="plan-note"><b>Conflictos fuertes:</b> ${esc(sharedResources.filter((item) => item.severity === "high").map((item) => item.name).join(", ") || "Sin conflictos fuertes en este escenario.")}</div>
      <div class="plan-note"><b>Escenario activo:</b> ${esc(`${scenarioData.periodCfg.label} | ${scenarioData.plannedDays} dias | ${fmt(scenarioData.totalHoursPerDay, 0)} h por dia | ${selectedNames.length} familia(s)`)}</div>
      <div class="plan-note"><b>Lo que bloquea:</b> cada familia tiene su cuello interno; a nivel de fabrica dominan los recursos compartidos visibles en el escenario activo.</div>
      <div class="plan-note"><b>Exportacion a costos:</b> documento, organizacion, responsable, materiales, horas-persona, equipos y salida util comparable.</div>
    </div>
  `;

  el("printPosterBoard").innerHTML = `
    <div class="report-costs-banner">
      <div>
        <div class="report-kicker">Materia prima para Costos</div>
        <h4>Datos que este modulo deja listos</h4>
      </div>
      <div class="phase-meta compact">
        <div><b>Materiales base</b><span>${esc(String(allMaterials.length))}</span></div>
        <div><b>Equipos visibles</b><span>${esc(String(allMachines.length))}</span></div>
        <div><b>Registros auditables</b><span>${esc(String(allRecords.length))}</span></div>
        <div><b>Controles de calidad</b><span>${esc(String(allControls.length))}</span></div>
      </div>
    </div>
    <div class="poster-grid">
      ${selectedEntries.map(([key, product]) => `
        <div class="poster-card tone-${product.family}">
          <div class="impact-title">${esc(product.title)}</div>
          <div class="report-chip-list">
            <span><b>Entrada</b>${esc(product.source)}</span>
            <span><b>Salida</b>${esc(product.output)}</span>
            <span><b>Cuello</b>${esc(product.bottleneck)}</span>
            <span><b>Comprometida</b>${esc(productCommitments[key]?.committedProjectedLabel || product.weeklyCapacity)}</span>
          </div>
          <ul class="report-bullet-list compact">
            <li><b>Registros:</b> ${esc(unique(product.stages.map((stage) => stage.records)).slice(0, 2).join(" | "))}</li>
            <li><b>Recursos:</b> ${esc(unique(product.stages.map((stage) => stage.zone)).slice(0, 2).join(" | "))}</li>
            <li><b>Exporta a costos:</b> materiales, horas-persona y equipos</li>
          </ul>
        </div>
      `).join("")}
      <div class="poster-card tone-generic">
        <div class="impact-title">Recursos compartidos</div>
        <ul class="report-bullet-list compact">
          <li>${esc(sharedResources.map((item) => item.name).join(" | ") || "Sin recursos compartidos visibles")}</li>
          <li><b>Regla:</b> no mezclar familias incompatibles en paralelo</li>
          <li><b>Impacto:</b> la salida baja cuando se cruza calor, humo, polvo, olor o empaque</li>
        </ul>
      </div>
      <div class="poster-card tone-generic">
        <div class="impact-title">Objetivo del software</div>
        <ul class="report-bullet-list compact">
          <li>Ver el flujo completo por producto</li>
          <li>Ordenar produccion sin choques de proceso</li>
          <li><b>Salida esperada:</b> portada comercial + ficha ejecutiva + base para Costos</li>
        </ul>
      </div>
    </div>
  `;
}

function renderAll() {
  ensureEditorSelections();
  renderBusinessProfile();
  renderSelectors();
  renderProductEditor();
  renderProductsReference();
  renderSharedEditor();
  renderSharedResourcesReference();
  renderPlanDataEditor();
  renderMasterReference();
  renderCommercialReportReference();
  activateTab(state.activeTab);
}

async function refreshAll() {
  await computeView();
  renderAll();
}

function bindTabs() {
  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });
  document.querySelectorAll("[data-tab-target]").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tabTarget));
  });
}

function bindSelectors() {
  el("flowSelector").addEventListener("change", async () => {
    state.flowId = el("flowSelector").value;
    state.batchId = "";
    await refreshAll();
  });

  el("batchSelector").addEventListener("change", async () => {
    state.batchId = el("batchSelector").value;
    await refreshAll();
  });
}

function bindProductCatalog() {
  el("productCatalog").addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-product-key]");
    if (!trigger) return;
    const nextKey = trigger.dataset.productKey;
    if (!getReferenceProductsMap()[nextKey]) return;
    state.productKey = nextKey;
    renderAll();
    showStatus(`Producto activo: ${getReferenceProductsMap()[nextKey].title}.`);
  });
}

async function saveProductEditorDraft() {
  const originalKey = state.productKey || "";
  const draft = ensureProductEditorDraft();
  const nextKey = normalizeText(draft.key || "").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (!nextKey || !draft.title) {
    showStatus("Para guardar el producto necesitas clave interna y titulo.", "warn");
    return;
  }
  draft.key = nextKey;
  draft.family = normalizeFamilyKey(draft.family || "");
  draft.origins = (draft.origins || []).map((item) => String(item || "").trim()).filter(Boolean);
  draft.subflows = (draft.subflows || []).map((item) => ({
    name: String(item.name || "").trim(),
    purpose: String(item.purpose || "").trim(),
    stages: String(Array.isArray(item.stages) ? item.stages.join(", ") : item.stages || "")
      .split(",")
      .map((stage) => stage.trim())
      .filter(Boolean),
  })).filter((item) => item.name);
  draft.stages = (draft.stages || [])
    .map((item, index) => {
      const stage = { ...defaultStageDraft(index + 1), ...item };
      stage.seq = num(stage.seq) || index + 1;
      PRODUCT_EDITOR_STAGE_FIELDS.forEach((field) => {
        if (field !== "seq") stage[field] = String(stage[field] ?? "").trim();
      });
      return stage;
    })
    .filter((stage) => stage.name);
  const persisted = {
    family: draft.family,
    title: draft.title.trim(),
    source: draft.source.trim(),
    output: draft.output.trim(),
    origins: draft.origins,
    operatingDays: draft.operatingDays,
    capacityByPeriod: draft.capacityByPeriod,
    weeklyCapacity: draft.weeklyCapacity.trim() || draft.capacityByPeriod.week,
    bottleneck: draft.bottleneck.trim(),
    blockingReason: draft.blockingReason.trim(),
    subflows: draft.subflows,
    stages: draft.stages,
  };
  const products = getReferenceProductsMap();
  if (originalKey && originalKey !== nextKey) delete products[originalKey];
  products[nextKey] = persisted;
  state.productKey = nextKey;
  state.productEditorDraft = createProductEditorDraft(nextKey);
  if (!state.planScenario.selectedProducts.includes(nextKey)) {
    state.planScenario.selectedProducts = [...state.planScenario.selectedProducts, nextKey];
  }
  await saveReferenceFactoryData();
  renderAll();
  showStatus(`Producto guardado: ${persisted.title}.`);
}

async function deleteCurrentProductEditor() {
  if (!state.productKey) return;
  const products = getReferenceProductsMap();
  const title = products[state.productKey]?.title || state.productKey;
  delete products[state.productKey];
  state.planScenario.selectedProducts = state.planScenario.selectedProducts.filter((key) => key !== state.productKey);
  state.productKey = getReferenceProductEntries()[0]?.[0] || "";
  state.productEditorDraft = createProductEditorDraft(state.productKey);
  await saveReferenceFactoryData();
  renderAll();
  showStatus(`Producto eliminado: ${title}.`);
}

function bindProductEditor() {
  const handleEditorMutation = (event) => {
    const selector = event.target.closest("#editorProductSelector");
    if (selector) {
      state.productKey = selector.value || "";
      state.productEditorDraft = createProductEditorDraft(state.productKey);
      renderAll();
      return;
    }
    const directField = event.target.dataset.editorProductField;
    if (directField) {
      const draft = ensureProductEditorDraft();
      if (directField.includes(".")) {
        const [group, field] = directField.split(".");
        draft[group][field] = event.target.type === "number" ? num(event.target.value) : event.target.value;
      } else {
        draft[directField] = event.target.value;
      }
      return;
    }
    const originInput = event.target.dataset.editorProductList === "origins";
    if (originInput) {
      ensureProductEditorDraft().origins[Number(event.target.dataset.index)] = event.target.value;
      return;
    }
    const subflowField = event.target.dataset.editorProductSubflowField;
    if (subflowField) {
      const idx = Number(event.target.dataset.index);
      if (subflowField === "stages") {
        ensureProductEditorDraft().subflows[idx].stages = String(event.target.value || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      } else {
        ensureProductEditorDraft().subflows[idx][subflowField] = event.target.value;
      }
      return;
    }
    const stageField = event.target.dataset.editorProductStageField;
    if (stageField) {
      const idx = Number(event.target.dataset.index);
      ensureProductEditorDraft().stages[idx][stageField] = event.target.type === "number" ? num(event.target.value) : event.target.value;
    }
  };
  el("productEditor").addEventListener("change", handleEditorMutation);
  el("productEditor").addEventListener("input", handleEditorMutation);
  el("productEditor").addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-editor-product-action]");
    if (!trigger) return;
    const action = trigger.dataset.editorProductAction;
    if (action === "new") {
      state.productKey = "";
      state.productEditorDraft = createProductEditorDraft("");
      setProductEditorStep("base");
      renderAll();
      showStatus("Formulario listo para crear un nuevo producto.");
      return;
    }
    if (action === "example") {
      const firstKey = getReferenceProductEntries()[0]?.[0] || "coffee";
      state.productKey = firstKey;
      state.productEditorDraft = createProductEditorDraft(firstKey);
      setProductEditorStep("base");
      renderAll();
      showStatus("Se cargo una plantilla base para acelerar el ingreso.");
      return;
    }
    if (action === "set-step") {
      setProductEditorStep(trigger.dataset.step || "base");
      renderProductEditor();
      return;
    }
    if (action === "prev-step") {
      const prev = PRODUCT_EDITOR_STEPS[Math.max(0, getProductEditorStepIndex() - 1)];
      setProductEditorStep(prev.key);
      renderProductEditor();
      return;
    }
    if (action === "next-step") {
      const next = PRODUCT_EDITOR_STEPS[Math.min(PRODUCT_EDITOR_STEPS.length - 1, getProductEditorStepIndex() + 1)];
      setProductEditorStep(next.key);
      renderProductEditor();
      return;
    }
    if (action === "add-origin") {
      ensureProductEditorDraft().origins.push("");
      renderProductEditor();
      return;
    }
    if (action === "remove-origin") {
      ensureProductEditorDraft().origins.splice(Number(trigger.dataset.index), 1);
      renderProductEditor();
      return;
    }
    if (action === "add-subflow") {
      ensureProductEditorDraft().subflows.push(defaultSubflowDraft());
      renderProductEditor();
      return;
    }
    if (action === "remove-subflow") {
      ensureProductEditorDraft().subflows.splice(Number(trigger.dataset.index), 1);
      renderProductEditor();
      return;
    }
    if (action === "add-stage") {
      const stages = ensureProductEditorDraft().stages;
      stages.push(defaultStageDraft(stages.length + 1));
      renderProductEditor();
      return;
    }
    if (action === "remove-stage") {
      const stages = ensureProductEditorDraft().stages;
      stages.splice(Number(trigger.dataset.index), 1);
      stages.forEach((stage, index) => { stage.seq = index + 1; });
      renderProductEditor();
      return;
    }
    if (action === "save") {
      await saveProductEditorDraft();
      return;
    }
    if (action === "delete") {
      await deleteCurrentProductEditor();
    }
  });
}

function collectSharedResourceFromEditor() {
  return {
    name: el("editorSharedName")?.value?.trim() || "",
    site: el("editorSharedSite")?.value?.trim() || "",
    zone: el("editorSharedZone")?.value?.trim() || "",
    line: el("editorSharedLine")?.value?.trim() || "",
    usedBy: String(el("editorSharedUsedBy")?.value || "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean),
    rule: el("editorSharedRule")?.value?.trim() || "",
    reason: el("editorSharedReason")?.value?.trim() || "",
    severity: el("editorSharedSeverity")?.value || "medium",
  };
}

async function saveSharedResourceEditor() {
  const originalName = state.sharedResourceName || "";
  const draft = collectSharedResourceFromEditor();
  if (!draft.name) {
    showStatus("El recurso compartido necesita un nombre.", "warn");
    return;
  }
  const items = getReferenceSharedResources();
  const index = items.findIndex((item) => item.name === originalName || item.name === draft.name);
  if (index >= 0) items[index] = draft;
  else items.push(draft);
  state.sharedResourceName = draft.name;
  await saveReferenceFactoryData();
  renderAll();
  showStatus(`Recurso guardado: ${draft.name}.`);
}

async function deleteSharedResourceEditor() {
  if (!state.sharedResourceName) return;
  const items = getReferenceSharedResources();
  const index = items.findIndex((item) => item.name === state.sharedResourceName);
  if (index < 0) return;
  const [removed] = items.splice(index, 1);
  state.sharedResourceName = items[0]?.name || "";
  await saveReferenceFactoryData();
  renderAll();
  showStatus(`Recurso eliminado: ${removed.name}.`);
}

function bindSharedEditor() {
  el("sharedEditor").addEventListener("change", (event) => {
    const selector = event.target.closest("#editorSharedSelector");
    if (!selector) return;
    state.sharedResourceName = selector.value || "";
    renderAll();
  });
  el("sharedEditor").addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-editor-shared-action]");
    if (!trigger) return;
    const action = trigger.dataset.editorSharedAction;
    if (action === "new") {
      state.sharedResourceName = "";
      renderAll();
      return;
    }
    if (action === "save") {
      await saveSharedResourceEditor();
      return;
    }
    if (action === "delete") {
      await deleteSharedResourceEditor();
    }
  });
}

function collectPersonFromEditor() {
  const code = el("editorPersonCode")?.value?.trim() || "";
  return {
    person: {
      code,
      name: el("editorPersonName")?.value?.trim() || "",
      roleGroup: el("editorPersonRoleGroup")?.value?.trim() || "ops",
      workMode: el("editorPersonWorkMode")?.value || "full",
      targetHoursPerDay: num(el("editorPersonTargetHours")?.value || 8) || 8,
      maxExtraHours: num(el("editorPersonExtraHours")?.value || 2) || 2,
      weeklyAvailability: el("editorPersonAvailability")?.value?.trim() || "",
      zone: el("editorPersonZone")?.value?.trim() || "",
    },
    load: PLAN_WEEKDAYS.reduce((acc, day) => {
      acc[day.key] = num(el(`editorPersonLoad-${day.key}`)?.value || 0);
      return acc;
    }, { personCode: code }),
  };
}

async function savePersonEditor() {
  const originalCode = state.personnelCode || "";
  const { person, load } = collectPersonFromEditor();
  if (!person.code || !person.name) {
    showStatus("La persona necesita codigo y nombre.", "warn");
    return;
  }
  const people = getReferencePersonnel();
  const loads = getReferencePersonnelLoad();
  const personIndex = people.findIndex((item) => item.code === originalCode || item.code === person.code);
  if (personIndex >= 0) people[personIndex] = person;
  else people.push(person);
  const loadIndex = loads.findIndex((item) => item.personCode === originalCode || item.personCode === person.code);
  if (loadIndex >= 0) loads[loadIndex] = load;
  else loads.push(load);
  state.personnelCode = person.code;
  await saveReferenceFactoryData();
  renderAll();
  showStatus(`Persona guardada: ${person.name}.`);
}

async function deletePersonEditor() {
  if (!state.personnelCode) return;
  const people = getReferencePersonnel();
  const loads = getReferencePersonnelLoad();
  const personIndex = people.findIndex((item) => item.code === state.personnelCode);
  if (personIndex < 0) return;
  const [removed] = people.splice(personIndex, 1);
  const loadIndex = loads.findIndex((item) => item.personCode === state.personnelCode);
  if (loadIndex >= 0) loads.splice(loadIndex, 1);
  state.personnelCode = people[0]?.code || "";
  await saveReferenceFactoryData();
  renderAll();
  showStatus(`Persona eliminada: ${removed.name}.`);
}

function bindPlanDataEditor() {
  el("planDataBoard").addEventListener("change", (event) => {
    const selector = event.target.closest("#editorPersonSelector");
    if (!selector) return;
    state.personnelCode = selector.value || "";
    renderAll();
  });
  el("planDataBoard").addEventListener("click", async (event) => {
    const trigger = event.target.closest("[data-editor-person-action]");
    if (!trigger) return;
    const action = trigger.dataset.editorPersonAction;
    if (action === "new") {
      state.personnelCode = "";
      renderAll();
      return;
    }
    if (action === "save") {
      await savePersonEditor();
      return;
    }
    if (action === "delete") {
      await deletePersonEditor();
    }
  });
}

function bindBusinessProfile() {
  ["bizOperationType", "bizPeriod"].forEach((id) => {
    el(id)?.addEventListener("change", async () => {
      await saveBusinessProfile();
      renderBusinessProfile();
      showStatus("Datos del bionegocio actualizados.");
    });
  });

  ["bizDocumentCode", "bizOrganization", "bizResponsible", "bizResponsibleRole", "bizNotes"].forEach((id) => {
    const node = el(id);
    if (!node) return;
    node.addEventListener("blur", async () => {
      await saveBusinessProfile();
      renderBusinessProfile();
      showStatus("Datos del bionegocio actualizados.");
    });
  });
}

function bindProductViews() {
  el("productSubtabs").addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-product-view]");
    if (!trigger) return;
    activateProductView(trigger.dataset.productView);
  });

  el("productCapacity").addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-capacity-period]");
    if (!trigger) return;
    state.productCapacityPeriod = trigger.dataset.capacityPeriod;
    const product = getCurrentProduct();
    if (!product) return;
    renderSelectedProductReference(product);
    activateProductView("capacity");
    showStatus(`Capacidad ${capacityPeriodLabel(state.productCapacityPeriod)} lista para revisar.`);
  });
}

function bindActions() {
  el("btnReload").addEventListener("click", async () => {
    await loadModuleData();
    await refreshAll();
    showStatus("Modulo recargado.");
  });

  el("btnImport").addEventListener("click", async () => {
    try {
      const raw = canUseDesktopBridge()
        ? await actions.loadDesktopFile()
        : await pickJsonFileFromBrowser();
      const data = JSON.parse(raw);
      await actions.service.save(data);
      await loadModuleData();
      await syncDesktopStore();
      await refreshAll();
      showStatus("Archivo cargado correctamente.");
    } catch (error) {
      showStatus(String(error?.message || error || "No fue posible cargar el archivo."), "error");
    }
  });

  el("btnExport").addEventListener("click", async () => {
    try {
      const contents = JSON.stringify(await actions.service.load(), null, 2);
      if (canUseDesktopBridge()) {
        await actions.saveDesktopFile(contents, "procesos_capacidad_planeacion_didactico");
      } else {
        downloadJsonFromBrowser(contents, "procesos_capacidad_planeacion_didactico");
      }
      showStatus("Archivo exportado correctamente.");
    } catch (error) {
      showStatus(String(error?.message || error || "No fue posible exportar el archivo."), "error");
    }
  });

  if (el("btnPrint")) {
    el("btnPrint").addEventListener("click", async () => {
      try {
        if (canUseDesktopBridge()) {
          const html = await buildPrintableProcessDocument();
          const savedPath = await actions.exportPdfA4(html, buildProcessPdfSuggestedName());
          showStatus(`PDF exportado correctamente en: ${savedPath}`);
          return;
        }
        openBrowserPrintAsPdf();
        showStatus("Se abrio la vista de impresion. Elige Guardar como PDF en tu navegador.");
      } catch (error) {
        showStatus(String(error?.message || error || "No fue posible exportar el PDF."), "error");
      }
    });
  }

  el("btnExportCosts").addEventListener("click", async () => {
    try {
      if (!state.batchId) {
        showStatus("Selecciona un lote antes de exportar a costos.", "warn");
        return;
      }
      const payload = buildOptionalCostIntegrationPayload(await actions.service.load(), { batchId: state.batchId });
      const contents = JSON.stringify(payload, null, 2);
      if (canUseDesktopBridge()) {
        await actions.exportCostIntegration(contents, "integracion_procesos_costos");
      } else {
        downloadJsonFromBrowser(contents, "integracion_procesos_costos");
      }
      showStatus("Paquete listo para importarse o completarse en Costos.");
    } catch (error) {
      showStatus(String(error?.message || error || "No fue posible exportar a costos."), "error");
    }
  });
}

async function init() {
  applyBranding();
  bindTabs();
  bindSelectors();
  bindBusinessProfile();
  bindProductCatalog();
  bindProductEditor();
  bindSharedEditor();
  bindProductViews();
  bindPlanDataEditor();
  bindActions();
  await loadModuleData();
  await refreshAll();
  showStatus("Modulo listo para registrar procesos, recursos, plan y reporte.");
}

init().catch((error) => {
  console.error(error);
  showStatus(String(error?.message || error || "No fue posible iniciar el modulo."), "error");
});

