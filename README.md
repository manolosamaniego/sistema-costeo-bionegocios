# Sistema Comercial de Costeo para Bionegocios

Aplicación de escritorio construida con Tauri para costeo, análisis comercial, auditoría e informe ejecutivo para bionegocios.

## Estado actual

- Versión matriz: `1.0.0`
- Plataforma objetivo actual: `Windows x64`
- Instalador generado por Tauri: `NSIS` y `MSI`
- Modo de uso principal: escritorio local con guardado/carga de archivos JSON

## Estructura del proyecto

- `src/index.html`
  Interfaz principal y lógica del producto.
- `src-tauri/src/lib.rs`
  Comandos nativos de escritorio para guardar, cargar, branding y archivos locales.
- `dev-server.mjs`
  Servidor local para desarrollo.
- `docs/`
  Documentación operativa, soporte, versionado y ruta de crecimiento.
- `clientes/`
  Configuración y referencias por cliente.
- `incidencias/`
  Registro y plantilla de soporte.
- `releases/`
  Control documental de entregas e instaladores.

## Comandos de trabajo

Desde `C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios`

### Desarrollo

```powershell
npm install
npm run edition:matriz
npm run tauri dev
```

### Compilar instalador

```powershell
npm run edition:operativa
npm run tauri build
```

### Preparar carpeta de release

```powershell
npm run release:prepare
```

### Preparar entrega para cliente operativo

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\preparar-entrega-cliente.ps1 -ClientId aliados -BrandingFile .\clientes\aliados\branding.1.0.0.json
```

### Generar licencia de cliente

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generar-licencia-cliente.ps1 -ClientId aliados -ClientName "Fundacion Aliados" -Version 1.0.0 -SupportUntil 2027-04-19
```

### Publicar manifiesto de actualización

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publicar-manifiesto-actualizacion.ps1 -Mode cliente -ClientId aliados -ClientName "Fundacion Aliados" -Version 1.0.0 -SupportUntil 2027-04-19
```

Opcional:

- `-InstallerUrl` si el instalador quedará publicado en una URL directa
- `-ReleaseNotesUrl` si la nota se servirá fuera del repositorio
- `-PublicBaseUrl` si cambias la base remota del canal

### Verificar laptop de soporte

```powershell
npm run support:check
```

### Traer la última matriz en otra laptop

```powershell
npm run support:update
```

### Cambiar edición del producto

```powershell
npm run edition:matriz
npm run edition:operativa
```

Usa:

- `matriz` para la edición de administración, soporte y marca
- `operativa` para la edición de cliente o sucursal sin acceso de personalización

## Rutas clave

### Código fuente principal

`C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios`

### Instaladores compilados

- `C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\src-tauri\target\release\bundle\nsis`
- `C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\src-tauri\target\release\bundle\msi`

## Branding y administración

- La edición operativa oculta la personalización de marca por defecto.
- El modo administrador se activa con:
  - doble clic sobre el título del encabezado, o
  - doble clic sobre el logo del encabezado, o
  - `Ctrl + Shift + A`
- Código actual de administrador:
  - `SR-ADMIN-2026`

Nota:
Ese código es provisional. En la siguiente etapa conviene moverlo a una política por cliente o licencia.

## Licencia y canal activo

- La app puede compilarse con licencia de matriz o licencia por cliente.
- Cada cliente puede tener su propio archivo `licencia.<version>.json`.
- Cada canal puede publicar su propio `manifest.json` para controlar actualizaciones.
- La app ya puede consultar el canal remoto desde el botón `Verificar actualización`.
- La entrega operativa de cliente usa:
  - branding del cliente
  - licencia del cliente
  - edición operativa bloqueada

## Flujo recomendado de soporte

Cuando un cliente reporte una falla, solicitar:

- captura del error
- archivo JSON del costeo
- versión de la app
- archivo de marca, si aplica
- archivo exportado desde `Exportar diagnóstico`
- descripción breve de lo que intentó hacer

Luego:

1. reproducir el caso con la matriz
2. corregir en código
3. generar nueva versión
4. registrar incidencia y cambio
5. entregar instalador actualizado

## Siguiente evolución recomendada

- repositorio privado central
- control de versiones por cliente
- actualizaciones centralizadas
- registro de errores
- edición matriz y edición operativa separadas

Revisa:

- [Matriz del producto](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\MATRIZ-DEL-PRODUCTO.md)
- [Flujo de soporte](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\FLUJO-DE-SOPORTE.md)
- [Versionado y entregas](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\VERSIONADO-Y-ENTREGAS.md)
- [Trabajo desde otra laptop](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\TRABAJAR-DESDE-OTRA-LAPTOP.md)
- [Checklist de laptop de viaje](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\CHECKLIST-LAPTOP-DE-VIAJE.md)
- [Ediciones Matriz y Operativa](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\EDICIONES-MATRIZ-Y-OPERATIVA.md)
- [Mecanismo de actualización](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\MECANISMO-DE-ACTUALIZACION.md)
- [Actualizar cliente](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\ACTUALIZAR-CLIENTE.md)
- [Diagnóstico y soporte remoto](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\DIAGNOSTICO-Y-SOPORTE-REMOTO.md)
- [Licencias y canales](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\LICENCIAS-Y-CANALES.md)
- [Política de soporte por versión](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\POLITICA-DE-SOPORTE-POR-VERSION.md)
- [Activar GitLab Pages](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\ACTIVAR-GITLAB-PAGES.md)
- [Ruta de soporte remoto](C:\Users\Usuario\Documents\Proyectos\App de Costos\sistema-costeo-bionegocios\docs\RUTA-DE-SOPORTE-REMOTO.md)
