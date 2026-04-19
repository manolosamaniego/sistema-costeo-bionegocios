# Versionado y entregas

## Objetivo

Mantener control de qué versión tiene cada cliente y qué cambió en cada entrega.

## Formato recomendado

- `1.0.0`
  Primera versión comercial estable.
- `1.0.1`
  Corrección menor sin cambiar la estructura principal.
- `1.1.0`
  Mejora funcional importante.
- `2.0.0`
  Cambio mayor de producto o arquitectura.

## Regla práctica

### Cambia tercer número

Cuando corriges errores pequeños.

Ejemplo:

- `1.0.0` a `1.0.1`

### Cambia segundo número

Cuando agregas funciones nuevas compatibles con lo anterior.

Ejemplo:

- `1.0.1` a `1.1.0`

### Cambia primer número

Cuando hay cambio fuerte de estructura o producto.

Ejemplo:

- `1.1.0` a `2.0.0`

## Entrega por cliente

Cada entrega debe registrar:

- cliente
- versión entregada
- fecha
- instalador enviado
- branding aplicado
- observaciones

## Instaladores

Rutas base actuales:

- `src-tauri\\target\\release\\bundle\\nsis`
- `src-tauri\\target\\release\\bundle\\msi`

## Recomendación

Guardar una nota breve por cada release dentro de `releases/`.

