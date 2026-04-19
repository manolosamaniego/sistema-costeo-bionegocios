# Actualizar cliente

## Objetivo

Tener un proceso simple y repetible para entregar una nueva versión a un cliente sin improvisación.

## Flujo recomendado

### 1. Cambiar a edición operativa

```powershell
npm run edition:operativa
```

### 2. Compilar

```powershell
npm run tauri build
```

### 3. Preparar release

```powershell
npm run release:prepare
```

## Qué genera el proceso

Una carpeta de release dentro de:

`releases\<version>\`

Con:

- instalador `.exe`
- instalador `.msi`
- nota de entrega

## Qué enviar al cliente

Enviar preferiblemente:

- instalador `.exe`
- nota corta de cambios
- indicación de actualización

## Texto sugerido para enviar

Se adjunta la versión actualizada de la app. Esta actualización corrige o mejora el comportamiento reportado. Antes de instalar, cierre la aplicación. Sus archivos de costeo y la identidad institucional deben mantenerse sin cambios.

## Verificación después de instalar

Pedir al cliente que confirme:

- la app abre
- puede cargar un JSON anterior
- puede guardar un nuevo JSON
- el branding se mantiene
- el informe imprime correctamente

