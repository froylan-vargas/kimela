# Feature: Create new qimela form

## Inputs

- Nombre de la qimela (open text - required > 8 chars menor a 40 chars)
- Deporte (sport dropdown - required)
- Liga (league dropdown - required) (puedes decidir si guardarla o no en la tabla de qimela para evitar traversing, tu decides)
- Evento (event dropdown - required)
- Las preguntas de 'Rule' que tengan el mismo session_format que el session_format del evento (open text - number scalar values - 0 to 5 is valid - required)

---

## Test Cases — QA

### TC-01: Crear qimela — validaciones de nombre

| #   | Acción                                                | Resultado esperado                                    |
| --- | ----------------------------------------------------- | ----------------------------------------------------- |
| 1.1 | Enviar formulario con nombre vacío                    | Error: "El nombre debe tener al menos 8 caracteres"   |
| 1.2 | Enviar formulario con nombre de 7 caracteres          | Error: "El nombre debe tener al menos 8 caracteres"   |
| 1.3 | Enviar formulario con nombre de 8 caracteres exactos  | Formulario válido en ese campo                        |
| 1.4 | Enviar formulario con nombre de 40 caracteres exactos | Formulario válido en ese campo                        |
| 1.5 | Enviar formulario con nombre de 41 caracteres         | Error: "El nombre no puede superar los 40 caracteres" |

---

### TC-02: Crear qimela — selección de deporte y evento

| #   | Acción                                                  | Resultado esperado                                                           |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 2.1 | Abrir el dropdown de evento sin seleccionar deporte     | Dropdown de evento deshabilitado                                             |
| 2.2 | Seleccionar un deporte                                  | Dropdown de evento se habilita y carga eventos UPCOMING y ACTIVE del deporte |
| 2.3 | Eventos UPCOMING aparecen en el dropdown                | Etiqueta "(Próximo)" visible junto al nombre del evento                      |
| 2.4 | Eventos ACTIVE aparecen en el dropdown                  | Etiqueta "(En curso)" visible junto al nombre del evento                     |
| 2.5 | Cambiar de deporte después de haber seleccionado evento | Evento y etapas se resetean                                                  |
| 2.6 | Enviar formulario sin seleccionar evento                | Error: "Selecciona un evento"                                                |

---

### TC-03: Crear qimela — etapas a cubrir (covered stages)

| #            | Acción                                                                | Resultado esperado                                                          |
| ------------ | --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 3.1 - passed | Abrir select de etapas sin evento seleccionado                        | Select deshabilitado                                                        |
| 3.2          | Seleccionar evento UPCOMING con fases de temporada regular y playoffs | Las 3 opciones disponibles: Temporada regular, Playoffs, Temporada completa |
| 3.3          | Seleccionar evento cuya temporada regular ya está completada          | Opción "Temporada regular" no aparece; solo Playoffs y/o Temporada completa |
| 3.4 - passed | Seleccionar evento con solo temporada regular disponible              | Solo aparece "Temporada regular"                                            |
| 3.5          | Seleccionar evento con todos los stages completados                   | Mensaje "No hay etapas disponibles" en el select                            |
| 3.6          | Cambiar de evento después de haber seleccionado etapas                | Etapas se resetean                                                          |
| 3.7          | Enviar formulario sin seleccionar etapas                              | Error: "Selecciona las etapas a cubrir"                                     |

---

### TC-04: Crear qimela — reglas de puntuación

| #            | Acción                                                                    | Resultado esperado                                            |
| ------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 4.1 - passed | Seleccionar deporte — reglas aparecen según el session_format del deporte | Solo reglas compatibles con el formato de sesión son visibles |
| 4.2 - passed | Enviar formulario con alguna regla vacía                                  | Error: "Ingresa un valor para cada regla"                     |
| 4.3 - passed | Ingresar valor menor al mínimo permitido en una regla                     | Error sobre rango de reglas                                   |
| 4.4 - passed | Ingresar valor mayor al máximo permitido en una regla                     | Error sobre rango de reglas                                   |
| 4.5 - passed | Ingresar valores válidos en todas las reglas                              | Formulario válido en esos campos                              |

---

### TC-05: Crear qimela — submit y redirección

| #   | Acción                                                            | Resultado esperado                                |
| --- | ----------------------------------------------------------------- | ------------------------------------------------- |
| 5.1 | Enviar formulario correctamente completado                        | Qimela creada; usuario redirigido a `/qimela/:id` |
| 5.2 | Página de detalle muestra el nombre de la qimela recién creada    | Nombre correcto visible como título               |
| 5.3 | Página de detalle muestra badge de estado "Próxima"               | Badge visible si la startPhase está en UPCOMING   |
| 5.4 | Crear qimela cuya startPhase ya está ACTIVE                       | Badge de estado muestra "En curso" directamente   |
| 5.5 | Botón "Crear qimela" muestra "Creando qimela..." durante el envío | Feedback visual durante la petición               |

---

### TC-06: Editar qimela — permisos

| #   | Acción                                                      | Resultado esperado            |
| --- | ----------------------------------------------------------- | ----------------------------- |
| 6.1 | Usuario creador visita la página de detalle                 | Sección de edición visible    |
| 6.2 | Usuario suscriptor (no creador) visita la página de detalle | Sección de edición NO visible |
| 6.3 | Usuario no autenticado intenta hacer PATCH /qimelas/:id     | 401 Unauthorized              |
| 6.4 | Usuario autenticado pero no creador hace PATCH /qimelas/:id | 403 Forbidden                 |

---

### TC-07: Editar qimela — según estado

| #   | Acción                                                        | Resultado esperado                                                              |
| --- | ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 7.1 | Qimela en UPCOMING — campo nombre                             | Editable                                                                        |
| 7.2 | Qimela en UPCOMING — select de etapas                         | Las 3 opciones disponibles                                                      |
| 7.3 | Qimela en ACTIVE — campo nombre                               | Editable                                                                        |
| 7.4 | Qimela en ACTIVE con etapas = REGULAR_SEASON                  | Select muestra "Temporada regular" y "Temporada completa"; puede cambiar a FULL |
| 7.5 | Qimela en ACTIVE con etapas = PLAYOFFS o FULL                 | Select deshabilitado; no puede cambiar                                          |
| 7.6 | Qimela en COMPLETED — campo nombre                            | Deshabilitado                                                                   |
| 7.7 | Qimela en COMPLETED — select de etapas                        | Deshabilitado                                                                   |
| 7.8 | Qimela en COMPLETED — botón "Guardar cambios"                 | Deshabilitado                                                                   |
| 7.9 | Intentar hacer PATCH /qimelas/:id en qimela COMPLETED vía API | 422 Unprocessable Entity                                                        |

---

### TC-08: Editar qimela — comportamiento del formulario

| #   | Acción                                                              | Resultado esperado                                        |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------- |
| 8.1 | No modificar ningún campo y presionar "Guardar cambios"             | Botón deshabilitado (sin cambios detectados)              |
| 8.2 | Cambiar solo el nombre y guardar                                    | Nombre actualizado en la página sin navegación            |
| 8.3 | Cambiar etapas de REGULAR_SEASON a FULL en qimela ACTIVE y guardar  | Badge y select reflejan "Temporada completa" tras guardar |
| 8.4 | Intentar cambiar REGULAR_SEASON a PLAYOFFS en qimela ACTIVE vía API | 422 Unprocessable Entity                                  |
| 8.5 | Error de red al guardar                                             | Mensaje de error inline visible bajo el formulario        |
| 8.6 | Nombre menor a 8 caracteres al guardar                              | API rechaza con 400; error visible                        |

---

### TC-09: Flujo de estados de la qimela (admin + creator)

| #   | Acción                                                | Resultado esperado                           |
| --- | ----------------------------------------------------- | -------------------------------------------- |
| 9.1 | Admin activa la fase de inicio de una qimela UPCOMING | Qimela cambia a ACTIVE automáticamente       |
| 9.2 | Admin completa la fase de fin de una qimela ACTIVE    | Qimela cambia a COMPLETED automáticamente    |
| 9.3 | Creator crea qimela cuya startPhase ya está ACTIVE    | Qimela se crea en estado ACTIVE directamente |

---

### TC-10: Admin — activar fase

| #    | Acción                                                           | Resultado esperado                            |
| ---- | ---------------------------------------------------------------- | --------------------------------------------- |
| 10.1 | Admin hace clic en "Iniciar" en una fase UPCOMING                | Fase pasa a ACTIVE; badge cambia a "En curso" |
| 10.2 | Admin hace PATCH `.../activate` en fase ya ACTIVE vía API        | 422 Unprocessable Entity                      |
| 10.3 | Admin hace PATCH `.../activate` en fase COMPLETED vía API        | 422 Unprocessable Entity                      |
| 10.4 | Activar fase que es `startPhaseId` de una qimela UPCOMING        | Esa qimela pasa a ACTIVE en cascada           |
| 10.5 | Activar fase que NO es `startPhaseId` de ninguna qimela          | Ninguna qimela cambia de estado               |
| 10.6 | Activar fase que es `startPhaseId` de múltiples qimelas UPCOMING | Todas esas qimelas pasan a ACTIVE             |
| 10.7 | Botón "Iniciar" no aparece en fases ACTIVE o COMPLETED           | Solo visible en fases UPCOMING                |
| 10.8 | Usuario no admin hace PATCH `.../activate` vía API               | 403 Forbidden                                 |

---

### TC-11: Admin — completar fase

| #     | Acción                                                                           | Resultado esperado                                 |
| ----- | -------------------------------------------------------------------------------- | -------------------------------------------------- |
| 11.1  | Fase con sesiones SCHEDULED — botón "Completar" deshabilitado                    | Tooltip "Hay partidos pendientes" visible          |
| 11.2  | Fase con sesiones LIVE — botón "Completar" deshabilitado                         | Tooltip "Hay partidos pendientes" visible          |
| 11.3  | Fase con todas las sesiones COMPLETED o CANCELLED — botón "Completar" habilitado | Admin puede completar la fase                      |
| 11.4  | Fase con sesiones POSTPONED y sin SCHEDULED/LIVE — botón "Completar" habilitado  | POSTPONED no bloquea el botón                      |
| 11.5  | Admin hace clic en "Completar" en fase ACTIVE sin sesiones pendientes            | Fase pasa a COMPLETED; badge cambia a "Completada" |
| 11.6  | Completar fase que es `endPhaseId` de una qimela ACTIVE                          | Esa qimela pasa a COMPLETED en cascada             |
| 11.7  | Completar fase que NO es `endPhaseId` de ninguna qimela                          | Ninguna qimela cambia de estado                    |
| 11.8  | Admin hace PATCH `.../complete` en fase UPCOMING vía API                         | 422 Unprocessable Entity                           |
| 11.9  | Admin hace PATCH `.../complete` en fase con sesiones SCHEDULED vía API           | 422 Unprocessable Entity                           |
| 11.10 | Botón "Completar" no aparece en fases UPCOMING o COMPLETED                       | Solo visible en fases ACTIVE                       |
| 11.11 | Usuario no admin hace PATCH `.../complete` vía API                               | 403 Forbidden                                      |

---

### TC-12: Admin — badges de estado en lista de fases

| #    | Acción                                               | Resultado esperado                        |
| ---- | ---------------------------------------------------- | ----------------------------------------- |
| 12.1 | Fase con status UPCOMING                             | Badge gris con texto "Próxima"            |
| 12.2 | Fase con status ACTIVE                               | Badge verde con texto "En curso"          |
| 12.3 | Fase con status COMPLETED                            | Badge oscuro/muted con texto "Completada" |
| 12.4 | Cache del frontend se actualiza al activar/completar | Badge cambia sin recargar la página       |

---

### TC-13: Header dropdown — filtrado de qimelas

| #    | Acción                                      | Resultado esperado                          |
| ---- | ------------------------------------------- | ------------------------------------------- |
| 13.1 | Usuario tiene qimelas en estado UPCOMING    | Aparecen en el dropdown                     |
| 13.2 | Usuario tiene qimelas en estado ACTIVE      | Aparecen en el dropdown                     |
| 13.3 | Usuario tiene qimelas en estado COMPLETED   | NO aparecen en el dropdown                  |
| 13.4 | Usuario no tiene qimelas UPCOMING ni ACTIVE | Dropdown vacío                              |
| 13.5 | Qimela pasa de ACTIVE a COMPLETED           | Desaparece del dropdown en la próxima carga |

---

### TC-14: API — `GET /qimelas/:id`

| #    | Acción                               | Resultado esperado                                                                         |
| ---- | ------------------------------------ | ------------------------------------------------------------------------------------------ |
| 14.1 | Obtener qimela existente             | 200 con `id`, `name`, `status`, `coveredStages`, `startPhaseId`, `endPhaseId`, `creatorId` |
| 14.2 | Obtener qimela con id inexistente    | 404 Not Found                                                                              |
| 14.3 | Obtener qimela con id que no es UUID | 400 Bad Request                                                                            |
| 14.4 | Request sin autenticación            | 401 Unauthorized                                                                           |

---

### TC-15: API — `POST /qimelas`

| #     | Acción                                                                                            | Resultado esperado                                                                      |
| ----- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 15.1  | Crear qimela con evento UPCOMING y `coveredStages = REGULAR_SEASON`                               | 201; `startPhaseId` = primera fase REGULAR_SEASON; `endPhaseId` = última REGULAR_SEASON |
| 15.2  | Crear qimela con evento UPCOMING y `coveredStages = PLAYOFFS`                                     | 201; startPhase y endPhase apuntan a fases PLAYOFFS                                     |
| 15.3  | Crear qimela con evento UPCOMING y `coveredStages = FULL`                                         | 201; startPhase = primera entre RS+PO, endPhase = última entre RS+PO                    |
| 15.4  | Crear qimela con evento ACTIVE y `coveredStages = REGULAR_SEASON`                                 | 201; startPhase = primera RS después de la fase actual                                  |
| 15.5  | Crear qimela con evento ACTIVE, temporada regular ya completada, `coveredStages = REGULAR_SEASON` | 422 Unprocessable Entity                                                                |
| 15.6  | Crear qimela con evento sin fases del tipo solicitado                                             | 422 Unprocessable Entity                                                                |
| 15.7  | Crear qimela sin campo `coveredStages`                                                            | 400 Bad Request                                                                         |
| 15.8  | Crear qimela con `coveredStages` inválido                                                         | 400 Bad Request                                                                         |
| 15.9  | Crear qimela con startPhase ACTIVE                                                                | Qimela creada con status ACTIVE                                                         |
| 15.10 | Crear qimela con startPhase UPCOMING                                                              | Qimela creada con status UPCOMING                                                       |

---

### TC-16: API — `PATCH /qimelas/:id`

| #     | Acción                                                            | Resultado esperado                                   |
| ----- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| 16.1  | Actualizar nombre en qimela UPCOMING                              | 200 con nombre actualizado                           |
| 16.2  | Actualizar `coveredStages` en qimela UPCOMING                     | 200; `startPhaseId` y `endPhaseId` re-resueltos      |
| 16.3  | Actualizar nombre en qimela ACTIVE                                | 200 con nombre actualizado                           |
| 16.4  | Cambiar `coveredStages` de REGULAR_SEASON a FULL en qimela ACTIVE | 200; `endPhaseId` apunta al último phase de playoffs |
| 16.5  | Cambiar `coveredStages` a PLAYOFFS en qimela ACTIVE               | 422 Unprocessable Entity                             |
| 16.6  | Cambiar `coveredStages` de FULL a REGULAR_SEASON en qimela ACTIVE | 422 Unprocessable Entity                             |
| 16.7  | Actualizar cualquier campo en qimela COMPLETED                    | 422 Unprocessable Entity                             |
| 16.8  | Actualizar qimela de otro usuario                                 | 403 Forbidden                                        |
| 16.9  | Actualizar qimela inexistente                                     | 404 Not Found                                        |
| 16.10 | Enviar nombre de 7 caracteres                                     | 400 Bad Request                                      |
| 16.11 | Enviar nombre de 41 caracteres                                    | 400 Bad Request                                      |
| 16.12 | Enviar body vacío `{}`                                            | 200; no se modifica nada                             |
