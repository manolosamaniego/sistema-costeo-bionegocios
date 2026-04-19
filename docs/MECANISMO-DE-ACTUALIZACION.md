# Mecanismo de actualización

## Objetivo

Definir cómo publicar correcciones y mejoras del producto sin perder control sobre versiones, branding y soporte.

## Modelo recomendado actual

### Fase 1: actualización híbrida controlada

Esta es la fase actual recomendada.

Combina dos cosas:

1. una publicación remota del `manifest.json` por canal
2. una entrega controlada del instalador cuando la versión cambia

Consiste en:

1. corregir en la matriz
2. registrar cambio
3. compilar nuevo instalador
4. preparar carpeta de release
5. publicar o actualizar el manifiesto del canal
6. entregar instalador al cliente o cargar su URL pública

## Por qué empezar así

- es más estable
- reduce riesgo técnico
- te permite vender ya
- permite revisar versiones por internet sin depender todavía de auto-update binario
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
6. actualizar licencia del cliente si aplica
7. publicar `updates/matriz/manifest.json` o `updates/clientes/<cliente>/manifest.json`
8. documentar versión
9. entregar al cliente o activar enlace de descarga

## Qué lleva una actualización

- instalador `.exe`
- opcionalmente instalador `.msi`
- nota de cambios
- `manifestUrl`
- `releaseNotesUrl`
- `installerUrl` si la descarga quedará pública
- versión entregada
- fecha
- observación de compatibilidad

## Regla de compatibilidad

No cambiar estructura de datos sin control de versión.

Si cambias algo grande:

- sube el número mayor o menor según impacto
- documenta la diferencia
- prueba carga de JSON anterior

## Cómo consulta la app

- cada instalación lleva una `license-config`
- esa licencia define `updateChannel` y `manifestUrl`
- la app consulta el `manifest.json` remoto desde el botón `Verificar actualización`
- si la versión remota es mayor, muestra el canal, la versión publicada y el enlace disponible
- si el manifiesto no trae `installerUrl`, la app igual informa que existe una versión nueva y remite a soporte o a la nota de entrega

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
