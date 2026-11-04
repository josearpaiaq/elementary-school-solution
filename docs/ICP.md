# ICP y user persona

## Problema de origen

Sofía coordina una primaria de 300 alumnos. Los padres usan WhatsApp (hay un grupo por salón), pero no descargan apps nuevas. Las autorizaciones para salidas, vacunas y eventos se envían en papel, se pierden en las mochilas y el día del evento faltan firmas. Tampoco existe un registro confiable de quién puede recoger a cada niño, así que las maestras no saben qué hacer cuando llega una persona distinta. Calificaciones y tareas quedan fuera porque ya las maneja otro sistema.

## ICP (perfil de cliente ideal)

| Dimensión | Descripción |
|---|---|
| **Tipo de organización** | Primarias privadas o particulares incorporadas en México, de 150 a 600 alumnos, de 6 a 24 grupos |
| **Ubicación** | Zonas urbanas y semiurbanas (CDMX, Edomex, Puebla, Querétaro, Guadalajara, Monterrey) |
| **Situación actual** | Se comunican con las familias por grupos de WhatsApp por salón y circulares en papel. No tienen app escolar o intentaron una y los padres no la adoptaron (menos del 30 % de descargas) |
| **Sistema existente** | Ya usan otra plataforma para calificaciones y tareas, y no quieren reemplazarla |
| **Disparador de compra** | Un incidente: un niño que casi se entrega a una persona no autorizada, una salida cancelada por falta de firmas, o una auditoría de protección civil o de la SEP que pide evidencia de las autorizaciones |
| **Quién compra** | La dirección aprueba; la **coordinación académica o administrativa** elige la herramienta y la opera |
| **Presupuesto** | Bajo: de $1,500 a $4,000 MXN al mes por escuela. Prefieren pagar por escuela, no por alumno |
| **Criterio de éxito para ellos** | Cero papeles perdidos, 100 % de firmas antes del evento y un protocolo claro en la puerta de salida |

**Fuera del ICP:** escuelas con más de 1,000 alumnos que ya tienen un ERP escolar con app adoptada; escuelas públicas sin una persona que pueda operar la herramienta; secundarias y prepas, donde el alumno sale solo.

## User persona principal: Sofía, la coordinadora

> "No necesito otra app que nadie va a abrir. Necesito saber, el día de la salida, quién sí puede subir al camión."

| | |
|---|---|
| **Nombre** | Sofía Ramírez (inventado) |
| **Edad** | 41 años |
| **Rol** | Coordinadora académica de primaria, 9 años en la escuela |
| **Escuela** | Primaria particular de 300 alumnos, 12 grupos (1° a 6°, A y B), 14 docentes |
| **Tecnología** | Usa su celular todo el día: WhatsApp, Google Drive, Excel. Se siente cómoda con herramientas web sencillas, no con configuraciones técnicas |
| **Tiempo** | Atiende a los padres en la entrada de 7:30 a 8:00 y en la salida de 13:30 a 14:30. El resto del día está en juntas, planeación y atención de incidencias |

**Lo que intenta lograr (jobs to be done)**
1. Que todas las autorizaciones de una salida estén firmadas **antes** de la fecha límite, sin perseguir papeles.
2. Saber en tiempo real quién falta, por salón, para pedirle a cada maestra que recuerde en su grupo.
3. Que cualquier maestra en la puerta sepa, sin dudar, si puede entregar a un niño a la persona que llegó.
4. Tener evidencia (quién firmó, cuándo) si un padre o una autoridad lo pide.

**Frustraciones**
- Imprime de 300 a 600 hojas por salida y regresa menos del 70 % firmado.
- El día del evento hay entre 10 y 20 niños sin firma y hay que llamar a los padres uno por uno.
- La lista de "personas autorizadas" es una hoja de Excel desactualizada que nadie consulta en la puerta.
- Ya probaron una app escolar: los papás no la descargaron y la escuela pagó un año sin usarla.

**Lo que la convence**
- Que los papás no tengan que instalar nada: un enlace que abren desde el celular.
- Que las maestras puedan recordar desde el **grupo de WhatsApp que ya existe**.
- Ver un número claro: "faltan 4 de 25 en 3°A".
- Que se pueda empezar el mismo día importando un Excel o CSV.

## Personas secundarias

### Laura, maestra de 3°A
- 29 años; tiene 25 alumnos y administra el grupo de WhatsApp de su salón.
- Necesita: saber quién falta de firmar sin revisar mochilas, y un protocolo claro en la salida.
- Dolor: es la que recibe los reclamos del papá cuyo hijo no fue a la salida "porque nadie le avisó".

### Mariana, mamá de dos (1°B y 4°A)
- 36 años; trabaja medio tiempo y revisa WhatsApp entre pendientes.
- Necesita: autorizar en menos de un minuto desde el celular, y dar de alta a la abuela para recoger a los niños.
- Dolor: los papeles se pierden en la mochila y se entera de la salida un día antes.

## Implicaciones para el producto

1. **El canal es el grupo de WhatsApp del salón**, no una app nueva. Todo lo que hace el padre se abre desde un enlace. → Motiva la funcionalidad [Recordatorio al grupo de WhatsApp](specs/recordatorio-grupo-whatsapp.md).
2. **La maestra es quien mueve al grupo**: necesita saber cuántos faltan y una forma de recordar en un toque.
3. **La coordinadora necesita números por salón**, no listas largas.
4. **La privacidad importa**: los mensajes en grupos no deben exponer nombres de niños ni quién no ha firmado.
