# Licencias y canales

## Objetivo

Esta base separa tres cosas:

- qué instalación es matriz
- qué instalación pertenece a un cliente
- qué canal de actualización le corresponde a cada una

## Estructura

- `config/licencias/licencia.matriz.js`
  Licencia interna de la matriz.
- `src/license-config.js`
  Licencia activa que usa la app al compilar.
- `clientes/<cliente>/licencia.<version>.json`
  Archivo de licencia por cliente.
- `manifestUrl`
  URL pública del canal que esa instalación debe consultar.
- `updates/matriz/manifest.json`
  Canal de actualización de la matriz.
- `updates/clientes/<cliente>/manifest.json`
  Canal de actualización de cada cliente.

## Regla operativa

- La matriz puede cambiar marca, preparar releases y dar soporte.
- La edición operativa usa licencia de cliente y no debe exponer personalización institucional.
- Cada cliente puede tener su propio canal sin afectar a los demás.

## Scripts

### Activar licencia matriz

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\activar-licencia-cliente.ps1 -Mode matriz
```

### Activar licencia de cliente

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\activar-licencia-cliente.ps1 -Mode cliente -LicenseFile .\clientes\aliados\licencia.1.0.0.json
```

### Generar licencia de cliente

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\generar-licencia-cliente.ps1 -ClientId aliados -ClientName "Fundacion Aliados" -Version 1.0.0 -SupportUntil 2027-04-19
```

### Publicar manifiesto de actualización

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publicar-manifiesto-actualizacion.ps1 -Mode cliente -ClientId aliados -ClientName "Fundacion Aliados" -Version 1.0.0 -SupportUntil 2027-04-19
```

## Uso recomendado

1. trabajar siempre en matriz
2. generar o actualizar licencia del cliente
3. preparar entrega operativa
4. publicar o actualizar el manifiesto del canal
5. entregar instalador y branding del cliente
