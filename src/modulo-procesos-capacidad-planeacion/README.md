# Modulo de Procesos, Capacidad y Planeacion

Base tecnica inicial del modulo independiente de procesos.

## Alcance de esta fase

- modelo de datos versionado en JSON
- catalogos base y seed inicial
- migracion y normalizacion de payload
- validaciones base de reglas de negocio
- servicios de capacidad, formula, trazabilidad y bodega
- repositorios desacoplados
- punto opcional de exportacion hacia costos

## Principios aplicados

- no depende del modulo de costos
- no toca el `state` del costeo actual
- usa `ES modules` simples, consistentes con el repo
- evita dependencias nuevas
- deja la integracion con costos solo como publicacion opcional de datos

## Archivos clave

- `schema.js`
- `seed.js`
- `migrations.js`
- `validation.js`
- `repositories.js`
- `services.js`
- `integration-costos.js`
