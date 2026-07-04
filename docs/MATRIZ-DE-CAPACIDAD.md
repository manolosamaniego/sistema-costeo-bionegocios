# Matriz de Capacidad

Base de trabajo para pasar de `Proceso` y `Capacidad` a `Plan Semanal`.

## Objetivo

La matriz de capacidad define, por producto, subproceso y etapa:

- equipo principal
- equipo compartido
- zona y linea
- tiempo operativo
- setup
- limpieza
- cambio de formato
- personas requeridas
- supervisión requerida
- capacidad por corrida
- salida por corrida
- conflictos previsibles

Con esto, despues el plan semanal puede responder:

- cuanto se puede producir de verdad
- que bloquea a que
- que proceso conviene correr primero
- que equipo o zona compartida genera conflicto
- donde se agota antes la capacidad humana

## Archivo fuente

- `src/modulo-procesos-capacidad-planeacion/capacity-matrix.js`

## Estructura minima

Cada producto incluye:

- `productKey`
- `productName`
- `originOptions`
- `periodBase`
- `subprocesses`

Cada subproceso incluye:

- `code`
- `name`
- `purpose`
- `bottleneckCandidate`
- `stages`

Cada etapa incluye:

- `seq`
- `stageName`
- `zone`
- `line`
- `mainEquipment`
- `sharedEquipment`
- `durationHours`
- `setupHours`
- `cleanupHours`
- `changeoverHours`
- `operatorsRequired`
- `supervisorsRequired`
- `capacityPerRun`
- `capacityUnit`
- `outputPerRun`
- `outputUnit`
- `conflictReasons`

## Regla de lectura

La matriz separa tres cosas:

1. Capacidad teorica
   Sale del tiempo bruto disponible y la salida por corrida.

2. Restriccion operativa
   Sale de setup, limpieza, cambio, personas y conflictos compartidos.

3. Cuello de botella real
   Lo define la etapa o subproceso con menor salida util del periodo.

## Productos incluidos

- Cafe tostado molido 250 g
- Chocolate en tabletas
- Aceite esencial 30 ml
- Crema cosmetica en frascos

## Siguiente uso

La siguiente fase debe usar esta matriz para construir:

- capacidad teorica vs capacidad real
- capacidad humana
- capacidad por recurso compartido
- plan semanal por secuencia adecuada
- alertas de conflicto por zona, linea o equipo
