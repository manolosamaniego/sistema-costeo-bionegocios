# Ediciones Matriz y Operativa

## Objetivo

Separar la edición interna de administración de la edición que usa el cliente final o una sucursal.

## Edición Matriz

Usa esta edición para:

- soporte técnico
- cambio de branding
- exportar marca
- cargar marca
- pruebas internas
- preparación de clientes nuevos

## Edición Operativa

Usa esta edición para:

- cliente final
- sucursales
- uso diario de costeo
- operación normal sin acceso a configuración institucional

## Diferencia práctica

### Matriz

- sí permite activar modo administrador
- sí muestra el módulo de identidad institucional
- sí permite exportar y cargar branding

### Operativa

- no permite activar modo administrador
- no muestra identidad institucional
- no muestra exportar ni cargar branding
- si alguien intenta abrir ese acceso, la app lo bloquea

## Cómo cambiar la edición

### Matriz

```powershell
npm run edition:matriz
```

### Operativa

```powershell
npm run edition:operativa
```

## Flujo recomendado

### Para soporte y parametrización

```powershell
npm run edition:matriz
npm run tauri dev
```

### Para compilar instalador del cliente

```powershell
npm run edition:operativa
npm run tauri build
```

## Regla clave

No entregar al cliente una compilación en edición matriz.
La edición matriz debe quedarse solo para Jungle Lab y administración central.
