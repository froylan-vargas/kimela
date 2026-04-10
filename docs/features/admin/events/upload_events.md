# Feature: Upload events

Utilizando el archivo mock-event-detail.html, implementa el diseño propuesto para la página de administración de eventos.

## Importante

- No requiero el estadio
- La hora no es opcional, es realmente importante ya que el usuario podrá hacer sus picks hasta 20 minutos antes de que comience la sesión.
- No quiero que muestres en la ui el formato del .csv al cargarlo, si no cumple con el formato requerido, devuelve bad request.
- La nota que pones en la ui es exactamente lo que quiero: Si ya existen partidos cargados, la nueva carga reemplazará todos los existentes en esta fase, pero no quiero esa nota en la ui, no des info para el formato del .csv, habrá un formato interno.
- En el grid de partidos cargados agrega las imágenes de los contendientes.
- Necesito que el diseño sea responsivo y que se pueda ver en cualquier pantalla.
