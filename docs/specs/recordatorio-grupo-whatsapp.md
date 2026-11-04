# SPEC: Recordatorio al grupo de WhatsApp del salón

| | |
|---|---|
| **Estado** | Implementada (MVP) |
| **Persona principal** | Laura, maestra (opera); Sofía, coordinadora (mide). Ver [ICP](../ICP.md) |
| **Roles con acceso** | ADMIN y TEACHER, cada uno limitado a sus salones (RBAC) |

## Problema

Los papás no entran a la web por su cuenta: viven en el grupo de WhatsApp del salón. Hoy, para que firmen una autorización, la maestra tiene que revisar quién falta, redactar un mensaje y pegar el enlace a mano. Por eso los recordatorios llegan tarde o nunca, y el día del evento faltan firmas.

## Solución

En el reporte de cada autorización, cada salón tiene un botón **"Recordar en WhatsApp"**. Al tocarlo se abre WhatsApp (la app en el celular o WhatsApp Web en la computadora) con un mensaje ya redactado para pegar en el grupo del salón:

```
📋 Recordatorio 3°A
Faltan 4 de 25 autorizaciones para *Visita al Museo de Historia Natural* (8 nov 2026, 9:00 a.m.).
Fecha límite: 5 nov 2026, 11:59 p.m.
Autoricen aquí desde su celular: https://<escuela>.vercel.app/family
Si ya respondieron, ¡gracias! 🙌
```

- **No usa la API de WhatsApp**: usa un enlace `https://api.whatsapp.com/send?text=…`. No hay costo, no requiere aprobación de Meta y la maestra elige el grupo y envía el mensaje ella misma.
- **Privacidad**: el mensaje solo dice **cuántos** faltan, nunca nombres de alumnos ni de tutores, porque el grupo es visible para todas las familias del salón.
- **Medición**: cada recordatorio queda registrado (quién, cuándo, cuántos faltaban), y el reporte muestra cuántos alumnos respondieron después del último recordatorio.

## Historias de usuario

1. Como **maestra**, quiero mandar un recordatorio a mi grupo en un toque, para que los papás que faltan firmen sin que yo redacte nada.
2. Como **coordinadora**, quiero ver cuándo se recordó a cada salón y si funcionó, para saber dónde insistir.
3. Como **tutor**, quiero recibir en el grupo un enlace que me lleve directo a autorizar.

## Alcance

**Incluye**
- Botón "Recordar en WhatsApp" por salón en `/requests/[id]`, visible solo si la solicitud está **abierta** y hay alumnos **pendientes** en ese salón.
- Mensaje con salón, pendientes/total, título, fecha del evento, fecha límite y enlace a `/family`.
- Registro `GroupReminder` (solicitud, salón, quién envió, pendientes al momento, fecha).
- En el reporte: "Último recordatorio: fecha, quién, N pendientes → M respondieron después".

**No incluye**
- Envío automático (no hay API de WhatsApp).
- Saber si el mensaje realmente se envió en WhatsApp: se registra al tocar el botón.
- Recordatorios individuales por tutor ni por correo o SMS.

## Criterios de aceptación

1. **Visibilidad por rol**: el botón aparece para ADMIN y para la TEACHER del salón; no existe para GUARDIAN ni PICKUP (se les redirige a su inicio). Una maestra de otro salón no ve el reporte (404) y la acción la rechaza.
2. **Solo cuando aplica**: el botón no aparece si la solicitud está en borrador o cerrada, ni si el salón tiene 0 pendientes.
3. **Mensaje correcto**: el texto incluye el nombre del salón, "Faltan N de T" con N = alumnos en estado *Pendiente* (sin contar *Conflicto*), el título, la fecha del evento, la fecha límite y la URL `BASE_URL/family`.
4. **Sin datos personales**: el mensaje no contiene nombres de alumnos ni de tutores ni teléfonos.
5. **Abre WhatsApp**: al tocar el botón se navega a `https://api.whatsapp.com/send?text=<mensaje codificado>`; en el celular abre la app de WhatsApp para elegir el grupo.
6. **Registro**: cada toque crea un `GroupReminder` con solicitud, salón, usuario y número de pendientes en ese momento.
7. **Seguimiento visible**: el reporte muestra, por salón, la fecha y quién mandó el último recordatorio, cuántos faltaban y cuántos alumnos respondieron después.
8. **El enlace funciona**: un tutor sin sesión que abre el enlace llega al login y, al entrar, a su panel con la autorización pendiente.

## Métricas de éxito

| Métrica | Definición | Línea base (papel) | Meta a 60 días |
|---|---|---|---|
| **Tasa de firma a tiempo** (principal) | % de alumnos con respuesta antes de la fecha límite, por solicitud | ~70 % | **≥ 95 %** |
| **Alumnos sin respuesta el día del evento** | Alumnos pendientes al cierre, por solicitud | 10–20 | **≤ 2** |
| **Conversión del recordatorio** | % de los pendientes al momento del recordatorio que responden en las 24 h siguientes | — | **≥ 50 %** |
| **Adopción por maestras** | % de solicitudes abiertas donde cada salón con pendientes recibió al menos un recordatorio | — | **≥ 80 %** |
| **Tiempo de la maestra** | Minutos por recordatorio (redactar y enviar) | ~10 min | **< 1 min** |

**Cómo se mide:** las métricas 1 a 4 salen de `PermissionResponse.respondedAt` y `GroupReminder` (con `pendingCount` y `createdAt`). La 5 se mide con una encuesta rápida a las maestras.

**Señal de alerta:** si la conversión del recordatorio es menor al 20 %, revisar el texto del mensaje y la hora de envío, y considerar recordatorios individuales.

## Diseño técnico

- **Modelo**: `GroupReminder { requestId, classroomId, sentById, pendingCount, createdAt }`.
- **Permiso RBAC**: `requests:remind` → ADMIN, TEACHER. El salón se valida con `classroomScope`.
- **Acción**: `remindClassroom(requestId, classroomId)` recalcula los pendientes en el servidor, registra el recordatorio y redirige a `api.whatsapp.com/send` (no a `wa.me`, cuya redirección corrompe los emojis).
- **Texto**: en `src/lib/strings.ts` (`t.reminder.message`), y la URL se arma con `whatsappShareUrl()` en `src/lib/reminders.ts`.
