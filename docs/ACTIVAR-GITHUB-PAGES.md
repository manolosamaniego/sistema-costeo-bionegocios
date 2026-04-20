# Activar GitHub Pages

## Objetivo

Publicar los manifiestos `manifest.json` y las notas de entrega en una URL publica estable para que la app pueda consultar actualizaciones desde GitHub Pages.

## Que ya queda listo en este proyecto

- Workflow automatico en `.github/workflows/pages.yml`
- Generacion de la carpeta `public/`
- Publicacion de:
  - `updates/`
  - `releases/.../NOTA-DE-ENTREGA.md`
  - `index.html`

## URL esperada

Cuando el repositorio exista en GitHub, la base publica normalmente sera:

`https://TU-USUARIO.github.io/sistema-costeo-bionegocios`

Ejemplos:

- `https://TU-USUARIO.github.io/sistema-costeo-bionegocios/updates/matriz/manifest.json`
- `https://TU-USUARIO.github.io/sistema-costeo-bionegocios/updates/clientes/aliados/manifest.json`

## Pasos en GitHub

1. Crea o abre el repositorio `sistema-costeo-bionegocios` en GitHub.
2. Sube todo el proyecto a la rama `main`.
3. Entra a `Settings`.
4. Abre `Pages`.
5. En `Build and deployment`, elige `GitHub Actions`.
6. Haz un nuevo `push` a `main` o ejecuta manualmente el workflow `Publicar GitHub Pages`.
7. Espera a que el workflow termine en verde.
8. Copia la URL final publicada.

## Luego de publicar

Con la URL real activa, usa la misma base en manifiestos y licencias.

### Publicar manifiesto matriz

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publicar-manifiesto-actualizacion.ps1 -Mode matriz -Version 1.0.0 -PublicBaseUrl "https://TU-USUARIO.github.io/sistema-costeo-bionegocios"
```

### Publicar manifiesto cliente

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publicar-manifiesto-actualizacion.ps1 -Mode cliente -ClientId aliados -ClientName "Fundacion Aliados" -Version 1.0.0 -SupportUntil 2027-04-19 -PublicBaseUrl "https://TU-USUARIO.github.io/sistema-costeo-bionegocios"
```

### Generar licencia cliente

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generar-licencia-cliente.ps1 -ClientId aliados -ClientName "Fundacion Aliados" -Version 1.0.0 -SupportUntil 2027-04-19 -PublicBaseUrl "https://TU-USUARIO.github.io/sistema-costeo-bionegocios"
```

## Validacion rapida

Abre en el navegador:

- `/updates/matriz/manifest.json`
- `/updates/clientes/aliados/manifest.json`

Si ambas rutas responden, GitHub Pages quedo listo.

## Resultado esperado

Con GitHub Pages activo:

- la carpeta publica se despliega sola desde `main`
- puedes usar una URL estable para actualizaciones
- los canales de matriz y clientes quedan listos para soporte y distribucion
