# Modulo de Procesos, Capacidad y Planeacion - Fase 2

## Objetivo

Dejar una base tecnica de bajo riesgo para un modulo independiente de procesos, capacidad y planeacion.

## Decisiones

- El modulo vive aislado en `src/modulo-procesos-capacidad-planeacion/`.
- La persistencia base es JSON versionado, no base de datos.
- La migracion se resuelve por `schemaVersion`.
- La integracion con costos no es obligatoria: solo existe como exportacion opcional de materiales, lotes y merma.

## Entidades incluidas

- productos
- lineas de produccion
- versiones de flujo
- etapas de proceso
- recursos
- equipos
- materiales
- formula maestra operativa
- lotes
- ejecuciones de etapa
- calendario
- requerimientos de bodega

## Reglas cubiertas

- cada etapa exige lote de entrada y lote de salida en ejecucion
- cada etapa mide entrada, salida util, merma y rendimiento
- se validan unidades compatibles
- soporta procesos de horas y procesos de varios dias
- funciona sin costos
- la integracion con costos queda desacoplada
