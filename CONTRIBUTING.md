# Contribuir (guía de estilo del proyecto)

Este es un proyecto personal, pero estas reglas existen para que tú mismo
(o alguien más) pueda retomarlo en seis meses sin tener que releer todo
el código primero.

## Regla no negociable: `domain/` no sabe que existe React

Todo lo que sea una regla de negocio o un cálculo va en `src/domain/`,
como función pura: mismos argumentos, mismo resultado, siempre. Nunca
`new Date()` sin recibir la fecha como parámetro, nunca `import` de
React, Dexie o Supabase. Esto es lo que permite que 104 tests corran en
menos de 4 segundos sin levantar nada.

Si estás escribiendo un cálculo dentro de un componente `.tsx`, esa es la
señal de que debería estar en `domain/`.

## Estructura de carpetas

```
src/
  domain/       lógica pura, con sus tests al lado (*.test.ts)
  data/         Dexie (local), Supabase (nube), sincronización, backup
  features/     una carpeta por pantalla/funcionalidad
  components/ui/ piezas reutilizables entre pantallas
  app/          router, layout, tema
  lib/          utilidades chicas sin categoría propia (fechas de UI, etc.)
```

Una función nueva de cálculo entra en `domain/<tema>/`. Un componente
nuevo de una sola pantalla entra en `features/<pantalla>/`. Algo
reutilizable en 3+ pantallas entra en `components/ui/`.

## Antes de un commit

```bash
npm run typecheck
npm run typecheck:e2e   # si tocaste algo en e2e/
npm run lint
npm run test
npm run build
```

Los cuatro deben pasar limpios. No hay excepciones informales tipo "ya lo
arreglo después" — el `CHANGELOG.md` de este proyecto documenta más de
un caso real donde correr esto encontró un bug (o un test mal escrito)
antes de que llegara a producción.

## Agregar una función de dominio nueva

1. Escribe la función en `domain/<tema>/archivo.ts`, con su comentario
   explicando el *por qué*, no solo el qué.
2. Escribe `archivo.test.ts` al lado, con al menos: el caso normal, un
   caso borde (fecha límite, valor cero, lista vacía), y si aplica, un
   caso que cruce mes/año.
3. Corre `npm run test` antes de conectarla a cualquier componente.

## Mensajes de commit

Sin formato estricto tipo Conventional Commits — pero sí describe **qué
cambió**, no "arreglos" o "cambios varios". Si arreglaste un bug que
encontraste corriendo los tests, dilo — es información útil para el
`CHANGELOG.md`.

## Ramas

Para un proyecto de una persona, trabajar directo en `main` está bien
siempre que cada commit pase la lista de arriba. Si quieres probar algo
grande sin comprometerte, usa una rama y ábrele un PR a ti mismo — el CI
correrá igual.
