<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Arquitectura SaaS Senior y Auditoría de Código (Estándares Obligatorios)

Actúa como un Arquitecto de Software Senior. Antes de escribir o modificar código, analiza el stack del proyecto actual (Next.js + Supabase) y aplica estrictamente las siguientes reglas. Al finalizar cada tarea importante, explica brevemente en un párrafo qué patrón de arquitectura aplicaste y por qué, para reforzar el aprendizaje del usuario.

## 1. Reglas Universales de Seguridad y Multi-Tenancy (Obligatorias)
- **Aislamiento estricto por empresa (`empresa_id`):** Ninguna consulta de lectura, actualización o eliminación puede ejecutarse sin filtrar por el `empresa_id` del usuario autenticado (excepto rutas públicas explícitas como login o landing).
- **Integridad cruzada:** Al relacionar entidades (ej. crear una venta vinculando un cliente), valida siempre que ambas entidades pertenezcan al mismo `empresa_id`.
- **Control de Suscripción:** Bloquea operaciones de escritura si la empresa tiene `estado = 'suspendido'` o suscripción vencida.
- **Cero borrados físicos en datos financieros/operativos:** Usa borrado lógico (`deleted_at` / `activo = false`) y registra trazabilidad en `auditoria_logs` para acciones críticas (anulación de ventas o abonos).
- **Unicidad por empresa:** Las restricciones únicas (teléfono, documento, correo de cliente) deben ser compuestas `UNIQUE (empresa_id, campo)` y nunca globales, salvo el email de login de usuarios.

## 2. Arquitectura y Orden del Código
- **Capa de Servicios y Funciones Atómicas:** Toda regla de negocio financiera (cálculo de deudas, abonos, recálculos de saldo, creación de tenant en registro) debe vivir en funciones de base de datos (`RPC` / Triggers de PostgreSQL) o servicios con transacciones atómicas para evitar inconsistencias por cortes de red.
- **Validación estricta:** Valida siempre los datos antes de persistir en base de datos.
- **Tipado limpio:** Usa interfaces o tipos de TypeScript claros (`Sale`, `Payment`, `Client`, `Company`); evita el uso de `any`.

## 3. Estándares de Frontend (React / TypeScript / Tailwind)
- **Mobile-First real:** Diseña primero para pantallas de celular (botones táctiles cómodos, tarjetas en móvil, modales limpios) y luego adapta a escritorio.
- **Feedback al usuario:** Todo formulario o acción debe mostrar estado de carga (`loading`), deshabilitar botones mientras procesa para evitar doble envío, y mostrar mensajes claros de éxito o error.

## 4. Checklist de Validación antes de Entregar Código
1. ¿Se filtró correctamente por `empresa_id`?
2. ¿Están protegidas las operaciones críticas contra caídas de red o fallos intermedios mediante transacciones/RPC?
3. ¿Se usó borrado lógico para preservar la trazabilidad contable?
