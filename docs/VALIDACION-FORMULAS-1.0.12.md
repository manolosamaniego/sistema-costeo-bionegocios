# Validación de fórmulas 1.0.12

Este documento resume una validación puntual de fórmulas clave del Sistema Comercial de Costeo para Bionegocios. La intención es dejar evidencia técnica y auditable de que las reglas principales del costeo responden como se espera en casos de prueba controlados.

## Casos validados

### 1. Participación visible en costos directos

Entradas:
- Materia prima: `280,00`
- Mano de obra directa 1: `5,64`
- Mano de obra directa 2: `3,76`

Total del rubro:
- `289,40`

Participación esperada:
- `96,75%`
- `1,95%`
- `1,30%`

Resultado:
- la lógica visible cierra en `100,00%`
- la distribución coincide con la regla usada por la app para redondeo visible

### 2. Certificación orgánico por porcentaje del producto

Entradas:
- costo anual: `1.200,00`
- forma de reparto: `% del producto`
- base de este costeo: `25`
- base anual total: `100`

Fórmulas:
- costo por punto porcentual = `1.200 / 100 = 12`
- costo asignado = `1.200 x (25 / 100) = 300`

Resultado esperado y obtenido:
- costo asignado: `300,00`

### 3. Certificación HACCP por lotes

Entradas:
- costo anual: `900,00`
- forma de reparto: `lotes del periodo`
- base de este costeo: `2`
- base anual total: `60`

Fórmulas:
- costo por lote = `900 / 60 = 15`
- costo asignado = `900 x (2 / 60) = 30`

Resultado esperado y obtenido:
- costo asignado: `30,00`

### 4. Transformación física con merma

Entradas:
- entrada total: `4,00 Kg`
- salida A: `3` presentaciones de `1,00 Kg`
- salida B: `1` presentación de `0,60 Kg`

Fórmulas:
- salida útil total = `3,00 + 0,60 = 3,60 Kg`
- merma = `4,00 - 3,60 = 0,40 Kg`
- rendimiento = `3,60 / 4,00 = 90,00%`
- merma porcentual = `0,40 / 4,00 = 10,00%`

Participación física visible:
- salida A: `83,33%`
- salida B: `16,67%`

Resultado:
- la merma y el rendimiento se comportan correctamente
- la participación visible cierra en `100,00%`

### 5. Punto de equilibrio de la salida principal

Entradas:
- costo total del proceso: `800,00`
- costos fijos totales: `300,00`
- participación de la salida principal: `80%`
- cantidad de salida principal: `4`
- precio usado sin IVA: `150,00`
- margen mayorista: `10%`

Fórmulas:
- costo fijo de la salida principal = `300 x 0,80 = 240`
- costo variable total = `800 - 300 = 500`
- costo variable de la salida principal = `500 x 0,80 = 400`
- costo variable unitario = `400 / 4 = 100`
- costo unitario total = `(800 x 0,80) / 4 = 160`
- margen de contribución = `150 - 100 = 50`
- punto de equilibrio en unidades = `240 / 50 = 4,80`
- punto de equilibrio en ventas = `4,80 x 150 = 720`
- precio mayorista sugerido = `160 x 1,10 = 176`

Resultado esperado y obtenido:
- costo variable unitario: `100,00`
- costo unitario total: `160,00`
- margen de contribución: `50,00`
- punto de equilibrio: `4,80 unidades`
- punto de equilibrio en ventas: `720,00`
- mayorista sugerido: `176,00`

## Conclusión

Las fórmulas validadas en esta revisión responden correctamente en cinco áreas críticas:
- participación porcentual visible por rubro
- reparto de certificaciones
- transformación con merma
- rendimiento del proceso
- punto de equilibrio y decisión comercial

## Reproducibilidad

Script utilizado:
- [scripts/validar-formulas.mjs](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\scripts\validar-formulas.mjs)

Ejecución sugerida:

```powershell
node .\scripts\validar-formulas.mjs
```
