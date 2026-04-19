# Política de soporte por versión

## Base recomendada

- `matriz`
  Soporte continuo y desarrollo.
- `cliente estable`
  Soporte comercial sobre una versión liberada.
- `cliente desfasado`
  Se atiende primero con actualización controlada.

## Regla práctica

- una versión liberada debe tener:
  - instalador
  - branding del cliente
  - licencia del cliente
  - nota de entrega
  - manifiesto del canal

## Niveles de soporte

- `interno`
  Para matriz y construcción del producto.
- `comercial`
  Para clientes con vigencia activa.
- `limitado`
  Para clientes fuera de ventana de actualización.

## Qué se corrige

- error funcional reproducible
- falla de guardado o carga
- problema de impresión
- problema de branding o edición
- incidencia técnica registrada en diagnóstico

## Qué se recomienda antes de corregir

1. pedir archivo JSON del costeo
2. pedir archivo de marca si aplica
3. pedir versión instalada
4. pedir exportación de diagnóstico
5. reproducir el caso en matriz

## Criterio comercial

- si el error afecta a todos los clientes, se corrige en matriz y luego se libera nueva versión general
- si el ajuste es exclusivo de un cliente, se libera por su canal sin tocar los demás paquetes
