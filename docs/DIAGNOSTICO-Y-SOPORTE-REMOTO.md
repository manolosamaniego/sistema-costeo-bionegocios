# Diagnóstico y soporte remoto

Este documento deja listo el mecanismo para dar soporte cuando estés de viaje o cuando un cliente reporte un problema desde otra laptop.

## Qué quedó implementado

- La app registra eventos técnicos importantes en un log local.
- La edición matriz muestra dos botones extra:
  - `Exportar diagnóstico`
  - `Limpiar diagnóstico`
- El log guarda eventos como:
  - activación o rechazo del modo administrador
  - exportación e importación de costeos
  - exportación e importación de marca
  - selección de logo
  - solicitud de impresión
  - errores globales de ventana
  - promesas no controladas

## Dónde vive el diagnóstico

La app guarda el archivo técnico dentro de la carpeta local de datos de la aplicación.

No hace falta que el cliente lo busque manualmente.

Cuando necesites revisarlo:

1. abrir la edición matriz
2. entrar al modo administrador
3. usar `Exportar diagnóstico`
4. elegir una carpeta y guardar el archivo `.log`

## Flujo recomendado de soporte

Cuando un cliente reporte una falla, pedir estos 4 elementos:

1. captura o foto del problema
2. archivo JSON del costeo
3. archivo de marca, si aplica
4. archivo exportado desde `Exportar diagnóstico`

Con eso puedes:

1. abrir la matriz en otra laptop
2. cargar el JSON del costeo
3. cargar la marca del cliente
4. revisar el log técnico
5. reproducir el caso
6. corregir la base matriz
7. compilar una nueva versión

## Cuándo limpiar el diagnóstico

Usa `Limpiar diagnóstico` solo cuando:

- ya cerraste un caso de soporte
- quieres empezar una nueva revisión sin mezclar eventos anteriores

No conviene limpiarlo antes de exportarlo si el caso todavía está en análisis.

## Qué hacer si estás de viaje

En otra laptop:

1. clonar el repositorio privado
2. activar edición matriz
3. ejecutar la app en desarrollo o compilar una nueva versión
4. cargar el costeo y la marca reportados por el cliente
5. revisar el diagnóstico exportado

## Reglas de operación

- La edición operativa no debe usarse para cambiar identidad institucional.
- La exportación de diagnóstico está pensada para soporte interno.
- El cliente final solo necesita usar la app, guardar su costeo y compartir el archivo cuando se le pida soporte.
