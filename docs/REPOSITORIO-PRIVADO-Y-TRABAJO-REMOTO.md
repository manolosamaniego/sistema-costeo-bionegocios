# Repositorio privado y trabajo remoto

## Objetivo

Mover la matriz del producto a un repositorio privado para que el soporte, las mejoras y las nuevas versiones no dependan de una sola laptop.

## Qué se debe subir al repositorio

Sí debe ir:

- `src/`
- `src-tauri/`
- `docs/`
- `clientes/`
- `incidencias/`
- `releases/` solo con notas y documentación
- `README.md`
- `CHANGELOG.md`
- `package.json`
- `package-lock.json`
- `dev-server.mjs`
- `.gitignore`

## Qué no se debe subir

No debe ir:

- `node_modules/`
- `src-tauri/target/`
- instaladores `.exe` y `.msi`
- archivos temporales
- respaldos operativos del cliente sin control

## Proveedor recomendado

Usa un repositorio privado.

Opciones recomendadas:

- GitHub privado
- GitLab privado
- servidor privado empresarial

## Nombre sugerido del repositorio

`sistema-costeo-bionegocios`

Si luego cambias la marca comercial, el repositorio puede seguir igual por ahora. No bloquea el trabajo.

## Flujo de trabajo recomendado

### Equipo principal

La laptop actual sigue siendo el equipo de desarrollo principal.

### Copia remota

El repositorio privado se convierte en la matriz oficial.

### Equipo alterno

Si viajas o cambias de equipo:

1. clonas el repositorio
2. instalas dependencias
3. ejecutas la app
4. reproduces el problema
5. corriges
6. compilas el instalador

## Comandos base

### Inicializar git local

```powershell
git init
git branch -M main
git add .
git commit -m "Base matriz 1.0.0"
```

### Conectar con repositorio remoto

```powershell
git remote add origin URL_DEL_REPOSITORIO
git push -u origin main
```

## Flujo de soporte desde viaje

Cuando un cliente reporte una falla:

1. recibes captura y JSON
2. abres tu copia local del repositorio
3. reproduces el error
4. corriges el código
5. haces commit
6. compilas instalador
7. entregas nueva versión

## Recomendación operativa

Mantén dos carpetas separadas:

- `matriz`
  código y documentación
- `entregas`
  instaladores y paquetes enviados

Así la matriz no se ensucia con archivos compilados y entregas antiguas.

## Regla clave

Nunca trabajar directamente sobre una copia enviada a un cliente.
Siempre volver a la matriz.

