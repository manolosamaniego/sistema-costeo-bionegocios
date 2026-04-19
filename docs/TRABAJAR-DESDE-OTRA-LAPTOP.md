# Trabajar desde otra laptop

## Objetivo

Poder abrir la matriz, reproducir errores, corregir y compilar una nueva versión desde otra laptop cuando estés de viaje o fuera de tu equipo principal.

## Requisitos de la laptop alterna

- Git
- Node.js
- npm
- Rust
- Visual Studio Build Tools para Windows

## Ruta recomendada

Usa una carpeta simple, por ejemplo:

`C:\Proyectos`

## Preparación rápida

### Opción guiada con script

Abre PowerShell y ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-otra-laptop.ps1
```

Ese script:

- crea la carpeta base
- clona el repositorio
- instala dependencias
- verifica herramientas

## Preparación manual

```powershell
git clone https://gitlab.com/manolo.samaniego-group/sistema-costeo-bionegocios.git C:\Proyectos\sistema-costeo-bionegocios
cd C:\Proyectos\sistema-costeo-bionegocios
npm install
```

## Abrir la app en desarrollo

```powershell
cd C:\Proyectos\sistema-costeo-bionegocios
npm run tauri dev
```

## Compilar una corrección

```powershell
cd C:\Proyectos\sistema-costeo-bionegocios
npm run tauri build
```

O con script:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\compilar-release.ps1
```

## Uso real en soporte

Cuando el cliente reporte un error:

1. recibes captura y JSON
2. abres la matriz en la laptop alterna
3. reproduces el caso
4. corriges
5. pruebas
6. compilas instalador
7. envías la nueva versión

## Regla operativa

No trabajar sobre una copia suelta del cliente.
Siempre trabajar sobre el repositorio clonado desde la matriz.

