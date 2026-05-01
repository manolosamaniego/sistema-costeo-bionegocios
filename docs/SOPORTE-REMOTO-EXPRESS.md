# Soporte Remoto Express

## Objetivo

Atender una incidencia real aunque no estés en tu laptop principal, sin improvisar y sin tocar la edición del cliente.

## Qué debe enviarte el cliente

- Captura del error o del resultado inesperado.
- Archivo JSON del costeo.
- Versión visible de la app.
- Archivo de marca si aplica.
- Explicación breve de qué estaba haciendo.

## Ruta corta de trabajo

1. Traer la matriz actualizada.
2. Verificar que la laptop alterna tenga el entorno listo.
3. Reproducir el caso con el mismo JSON.
4. Corregir solo en la matriz.
5. Probar otra vez con el mismo caso.
6. Compilar la nueva versión.
7. Preparar la entrega del cliente.
8. Publicar el manifiesto del canal.
9. Entregar instalador y cerrar la incidencia.

## Comandos mínimos

### 1. Actualizar la matriz

```powershell
cd C:\Proyectos\sistema-costeo-bionegocios
npm run support:update
```

### 2. Verificar entorno

```powershell
npm run support:check
```

### 3. Abrir la matriz para reproducir

```powershell
npm run tauri dev
```

### 4. Compilar versión corregida

```powershell
npm run tauri build
```

## Preparar una entrega de cliente

Ejemplo para Aliados:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\preparar-entrega-cliente.ps1 -ClientId aliados -BrandingFile .\clientes\aliados\branding.1.0.12.json -Version 1.0.12
```

## Publicar actualización

### Canal matriz

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publicar-manifiesto-actualizacion.ps1 -Mode matriz -Version 1.0.12 -SupportUntil 2099-12-31 -InstallerUrl "https://..."
```

### Canal cliente

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publicar-manifiesto-actualizacion.ps1 -Mode cliente -ClientId aliados -ClientName "Fundacion Aliados" -Version 1.0.12 -SupportUntil 2027-04-19 -InstallerUrl "https://..." -ReleaseNotesUrl "https://..."
```

## Qué revisar antes de entregar

- La incidencia queda registrada.
- El error se reproduce con el JSON original.
- La corrección funciona con el mismo JSON.
- La versión compilada abre correctamente.
- El instalador correcto existe.
- El manifiesto del canal responde.
- El cliente recibe una nota corta de qué cambió.

## Regla clave

Nunca se corrige sobre la copia del cliente.

Siempre:

- la matriz se actualiza primero
- el ajuste se hace en la matriz
- la compilación sale de la matriz
- el cliente recibe una versión compilada
