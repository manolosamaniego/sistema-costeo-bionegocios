# Changelog

## 1.0.11 - 2026-04-23

- El generador PDF A4 ahora espera el archivo final antes de validar la salida, evitando falsos errores cuando el navegador tarda un poco en escribir el PDF.
- El informe temporal se abre como URL local valida y el error tecnico devuelve mas detalle si el motor de PDF falla.

## 1.0.10 - 2026-04-23

- El encabezado del informe alinea mejor el logo institucional con el bloque del titulo.
- La firma del informe y de la identidad interna elimina remanentes de Smart Reality y consolida Jungle Lab S.A.S.

## 1.0.9 - 2026-04-23

- El informe PDF incrusta el logo institucional antes de generar el archivo A4, evitando rutas rotas en el PDF final.
- El boton de salida se renombra a PDF porque ahora genera directamente el archivo.

## 1.0.8 - 2026-04-23

- El boton Imprimir / PDF ahora genera un PDF A4 directo desde la app de escritorio, sin depender del tamano de papel del controlador de impresora.
- Se mantiene el informe en una sola hoja A4 para archivo ejecutivo.

## 1.0.7 - 2026-04-22

- Ajuste final del lienzo de impresion para que el informe ocupe mejor una hoja A4.
- Fijacion del informe al area imprimible completa sin agregar controles visibles.

## 1.0.6 - 2026-04-22

- Eliminacion del boton Vista A4.
- Ajuste del informe imprimible para salir en una sola hoja A4 real.
- Correccion de escala para que el informe ocupe mejor la hoja sin generar segunda pagina.

## 1.0.5 - 2026-04-22

- Corrección del informe imprimible para que el resumen ejecutivo cierre en una sola hoja A4.
- Nueva vista previa A4 antes de imprimir para revisar el informe sin abrir el diálogo de impresión.
- Ajuste compacto de conclusiones, lectura de mercado y firma Jungle Lab para evitar saltos a segunda página.

## 1.0.4 - 2026-04-22

- Refuerzo del boton Verificar actualizacion con estado visible en pantalla.
- Enlace manual de respaldo cuando el sistema no abre automaticamente el instalador.
- Bloqueo temporal del boton mientras consulta para evitar dobles clics o acciones silenciosas.

## 1.0.3 - 2026-04-22

- Corrección del flujo de actualización para abrir el instalador con el navegador del sistema desde la app de escritorio.
- Mensaje de respaldo con enlace visible si el sistema no permite abrir la descarga automáticamente.
- Registro técnico del error cuando la apertura externa falla.

## 1.0.2 - 2026-04-21

- Mejora visual de la firma Jungle Lab en la cabecera.
- Ajuste de impresión A4 para que el informe use mejor el espacio de la hoja.
- Pie de informe alineado a la derecha con estilo ejecutivo.

## 1.0.1 - 2026-04-20

- Cambio de marca técnica a Jungle Lab S.A.S.
- Nuevo sello visual bajo el bloque de actualización.
- Nuevo icono institucional para la app de escritorio.
- Mejora del verificador remoto para abrir instaladores con rutas relativas.

## 1.0.0 - 2026-04-18

- Migración del HTML comercial a aplicación de escritorio con Tauri.
- Guardado nativo de costeos en JSON con ruta elegida por el cliente.
- Carga nativa de archivos JSON de costeo.
- Exportación e importación de branding institucional.
- Persistencia local de branding fuera del navegador.
- Soporte para selección nativa de logo.
- Control de modo administrador para edición de marca.
- Instaladores `NSIS` y `MSI` compilados para Windows.
- Base documental de matriz, soporte, clientes, incidencias y releases.
