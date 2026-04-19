# Mecanismo de actualización

## Objetivo

Definir cómo publicar correcciones y mejoras del producto sin perder control sobre versiones, branding y soporte.

## Modelo recomendado actual

### Fase 1: actualización manual controlada

Esta es la fase actual recomendada.

Consiste en:

1. corregir en la matriz
2. registrar cambio
3. compilar nuevo instalador
4. preparar carpeta de release
5. entregar instalador al cliente
6. indicar si debe reinstalar o reemplazar su versión

## Por qué empezar así

- es más estable
- reduce riesgo técnico
- te permite vender ya
- no depende todavía de servidor de updates
- mantiene control total por cliente

## Qué se mantiene después de actualizar

La app ya fue diseñada para que branding y archivos de costeo no dependan del instalador original.

Eso permite que:

- el cliente actualice la app
- mantenga su identidad institucional
- conserve sus archivos JSON

## Flujo oficial de actualización

1. recibir solicitud o detectar mejora
2. corregir en matriz
3. subir cambio al repositorio
4. compilar release
5. preparar carpeta de entrega
6. documentar versión
7. entregar al cliente

## Qué lleva una actualización

- instalador `.exe`
- opcionalmente instalador `.msi`
- nota de cambios
- versión entregada
- fecha
- observación de compatibilidad

## Regla de compatibilidad

No cambiar estructura de datos sin control de versión.

Si cambias algo grande:

- sube el número mayor o menor según impacto
- documenta la diferencia
- prueba carga de JSON anterior

## Ruta futura

### Fase 2: actualización centralizada

Cuando quieras escalar, puedes añadir:

- servidor de releases
- manifiesto de versión
- verificación automática de updates
- descarga de nueva versión desde la app

### Fase 3: actualización automática

Más adelante se puede implementar:

- auto-update de Tauri
- publicación firmada
- canal estable y canal interno

## Recomendación

No saltar todavía a auto-update.
Primero consolidar:

- matriz
- releases
- soporte
- clientes
- branding

