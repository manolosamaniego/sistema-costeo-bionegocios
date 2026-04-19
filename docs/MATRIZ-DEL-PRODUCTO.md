# Matriz del producto

## Objetivo

Definir cómo se administra la fuente maestra del producto para que el soporte, las correcciones y las nuevas versiones no dependan de una sola laptop.

## Qué es la matriz

La matriz es la fuente oficial del producto. Desde aquí se:

- corrige código
- generan nuevas versiones
- preparan instaladores
- guardan documentos técnicos
- organizan clientes
- registran incidencias

## Qué debe vivir en la matriz

- código fuente
- historial de cambios
- documentación técnica
- branding por cliente
- notas de entrega
- control de versiones

## Qué no debe ser la matriz

- una sola laptop sin respaldo
- una carpeta aislada sin historial
- una versión final enviada por WhatsApp o correo

## Recomendación operativa

La matriz debe pasar a un repositorio privado central.

Opciones recomendadas:

- GitHub privado
- GitLab privado
- servidor privado de la empresa

## Estructura mínima local

- `src/`
- `src-tauri/`
- `docs/`
- `clientes/`
- `incidencias/`
- `releases/`
- `CHANGELOG.md`

## Regla de operación

Toda corrección se hace en la matriz primero.

Luego:

1. se prueba
2. se registra
3. se compila
4. se entrega

