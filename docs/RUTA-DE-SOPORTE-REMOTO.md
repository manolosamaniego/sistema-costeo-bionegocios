# Ruta de soporte remoto

## Objetivo

Atender una incidencia real aunque estés de viaje y no tengas tu laptop principal.

## Escenario base

El cliente te reporta:

- una falla
- un cálculo dudoso
- un cambio nuevo que necesita la app

Tu trabajo será:

1. traer la matriz
2. reproducir el caso
3. corregir
4. compilar
5. subir cambios
6. publicar el canal actualizado
7. entregar la nueva versión

## Paso 1. Preparar la laptop alterna

Solo la primera vez:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-otra-laptop.ps1
```

## Paso 2. Traer la última matriz

Cada vez que vayas a trabajar:

```powershell
cd C:\Proyectos\sistema-costeo-bionegocios
npm run support:update
```

## Paso 3. Verificar entorno

```powershell
npm run support:check
```

## Paso 4. Reproducir el caso

Solicita al cliente:

- captura del problema
- archivo JSON del costeo
- archivo de marca si aplica
- diagnóstico exportado desde la app

Luego abre la matriz:

```powershell
npm run tauri dev
```

## Paso 5. Corregir en código

La corrección siempre se hace en la matriz, no sobre la edición del cliente.

## Paso 6. Guardar el cambio en GitLab

```powershell
git status
git add .
git commit -m "Corrige incidencia de cliente"
git push origin main
```

## Paso 7. Compilar nueva versión

```powershell
npm run tauri build
```

## Paso 8. Preparar entrega del cliente

Ejemplo para Aliados:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\preparar-entrega-cliente.ps1 -ClientId aliados -BrandingFile .\clientes\aliados\branding.1.0.0.json
```

## Paso 9. Publicar el manifiesto del canal

Ejemplo:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publicar-manifiesto-actualizacion.ps1 -Mode cliente -ClientId aliados -ClientName "Fundacion Aliados" -Version 1.0.0 -SupportUntil 2027-04-19
```

Si ya tienes URL pública del instalador o de la nota:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publicar-manifiesto-actualizacion.ps1 -Mode cliente -ClientId aliados -ClientName "Fundacion Aliados" -Version 1.0.0 -SupportUntil 2027-04-19 -InstallerUrl "https://..." -ReleaseNotesUrl "https://..."
```

## Paso 10. Confirmar publicación web

Revisa:

- el pipeline de GitLab Pages
- la URL del manifiesto
- la nota de entrega

## Paso 11. Entregar al cliente

Puedes entregar:

- instalador `setup.exe`
- instalador `.msi` si aplica
- nota de entrega
- indicación de que use `Verificar actualización`

## Regla clave

La matriz siempre manda.

Eso significa:

- la corrección nace en la matriz
- GitLab guarda la historia
- el cliente recibe una versión compilada
- el branding y los archivos JSON permanecen separados del código
