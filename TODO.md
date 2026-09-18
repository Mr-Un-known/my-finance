# TODO

## Las 17 fases del roadmap original están completas
Ver CHANGELOG.md para el detalle de cada una.

## Mejoras opcionales para más adelante (no bloquean nada de lo actual)
- [ ] Sincronización en tiempo real multi-dispositivo (hoy es manual,
      bajo demanda, desde Ajustes → Nube)
- [ ] Filtros de la lista de Movimientos por categoría/método/rango de
      fechas (hoy solo hay búsqueda por texto)
- [ ] Metas de ahorro, patrimonio, múltiples cuentas/tarjetas — el modelo
      de datos ya está diseñado para soportarlo sin romper nada existente
- [ ] Tests E2E de la Edge Function de notificaciones (hoy se prueba con
      el `curl` de docs/NOTIFICATIONS.md)
- [ ] Ejecutar los tests E2E en un entorno con acceso a
      `cdn.playwright.dev` para confirmarlos localmente antes del primer
      push (en GitHub Actions correrán sin problema)

## Notas técnicas para quien retome este proyecto
- `node_modules` debe vivir en disco local durante el desarrollo, no en
  un mount de red — ver docs/CONTEXT.md si no tiene sentido de otra forma.
- Antes de sumar/agrupar transacciones por quincena, pasarlas por
  `withResolvedQuincena()` (`domain/quincena/resolve.ts`).
- Cualquier cálculo nuevo va en `domain/`, con tests al lado — ver
  CONTRIBUTING.md.
