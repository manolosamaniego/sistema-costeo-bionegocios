# Entrega a cliente operativo

Este flujo sirve para preparar una entrega comercial lista para cliente final, sin exponer funciones de matriz.

## Qué hace

El script:

- activa edición operativa
- compila instaladores
- copia `.exe` y `.msi`
- copia el branding del cliente
- genera una nota de entrega
- guarda todo en una carpeta ordenada por versión y cliente

## Comando

Desde la raíz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\preparar-entrega-cliente.ps1 -ClientId aliados -BrandingFile .\clientes\aliados\branding.1.0.0.json
```

## Resultado esperado

La entrega queda en una ruta como esta:

`releases\1.0.0\aliados\paquete`

Dentro verás:

- instalador `.exe`
- instalador `.msi`
- branding del cliente
- nota de entrega

## Regla comercial

La entrega a cliente debe salir en edición operativa.

La edición matriz se conserva solo para:

- Smart Reality
- soporte
- correcciones
- branding institucional
- nuevas versiones
