# BOX · pendientes y cosas a comprobar

Lo que no se sabe va marcado en la web (`[teléfono]`, «número por confirmar», «Horario por confirmar»), nunca inventado.
Al confirmarlo: cambiar `datos.json` (y `datos/prendas.json` para las prendas) y ejecutar `node construir.mjs`.

## Hay que pedírselo a BOX antes de publicar
- **Teléfono y WhatsApp.** No hay ninguno publicado (ni en Instagram, ni en Facebook, ni en directorios). Sin él, el botón de WhatsApp y «Mandar por WhatsApp» de la caja solo enseñan un aviso. Va en `datos.json`: `telefono` (como se lee) y `telefono_tel` (+34…).
- **Número de la calle.** Solo consta «rúa do Hórreo, Carballo». Un post de marzo de 2023 dice «Box y Joyería Manuel María, C/Hórreo 9», pero era un evento de las dos tiendas. ¿El 9 es BOX?
- **Horario.** No está en ningún sitio. La caja usa un horario SUPUESTO, marcado en pantalla: lunes a viernes de 10:00 a 13:30 y de 17:00 a 20:30, sábado de 10:00 a 14:00 y domingo cerrado. El 24 de diciembre, hasta las 14:00 (lo dicen ellas: cierran «a las 2»).
- **Festivos supuestos** (cerrado en el calendario): 1 y 6 de enero, 1 y 17 de mayo, 25 de julio, 15 de agosto, 12 de octubre, 1 de noviembre, y 6, 8 y 25 de diciembre. Faltan Semana Santa y las fiestas locales de Carballo.
- **Titular, NIF y correo**, para el aviso legal y la privacidad (hoy dicen PENDIENTE).
- **Quién posa.** Casi todas las fotos de 2021–2026 son de la misma mujer probándose la ropa en la tienda. ¿Es la dueña? Hace falta su permiso por escrito para poner su cara en la web; si no, se cambian por fotos de prenda, escaparate y detalle.
- **Rebajas.** Los tres precios (trench Ferrache 78 €, antes 155,90 €; chaquetón Van Dos 161 €, antes 230 €; chaqueta Surkana 97 €, antes 139 €) son de enero y febrero de 2026. La web avisa «por confirmar si siguen». Actualizarlos o quitarlos en `datos/prendas.json`.
- **Precios en general.** BOX solo publica precio en rebajas. ¿Quiere enseñarlo siempre, solo en rebajas o nunca? Hoy: «Precio en tienda» salvo las tres rebajas.
- **Tallas.** No se sabe qué tallas trabaja. La caja ofrece «Aún no lo sé / XS–XL / Otra» con el aviso «tallas supuestas». ¿Hace arreglos?
- **Reservar para probar.** ¿Le encaja apartar hasta tres prendas para probárselas? ¿Cuánto tiempo las guarda? ¿Quiere también «te la preparo para ver en casa» o envío? Hoy solo propone prueba en tienda.
- **Ocupación del probador.** En la caja es inventada (estable por día) y está marcada como simulación: no se envía ni se guarda nada.
- **El rótulo.** El logo está redibujado de las fotos. Pedir el archivo al rotulista o medir las letras.
- **Nombre.** En la pared pone BOX y en redes «Box Horreo». ¿Cómo quiere llamarse en Google y en la web? La web usa BOX con la calle debajo.
- **Marcas.** Salen Ferrache, Van Dos y Surkana (en las rebajas) y Mimí Mua en otros posts. ¿Siguen? ¿Puede la web nombrarlas o poner su logo?
- **El Mercadillo BOX.** Solo consta el sello. La web dice «De vez en cuando sacamos el Mercadillo BOX. Cuando lo hay, lo contamos en Instagram». ¿Cada cuánto? ¿Dónde?
- **Bonos.** En redes salieron adheridas a los Bonos Activa Comercio de la Xunta y al bono de Carballo. ¿Siguen? Si sí, merece una línea en «Dónde estamos».
- **Fotos.** Casi todas son de móvil. Una sesión de un día en la tienda (escaparate desde la calle, el probador, la pared del rótulo y 10–12 looks) subiría mucho la web. La de la lámpara de araña es de hacia 2017: ¿sigue así la tienda?
- **Ficha de Google.** No tiene. Darla de alta a la vez que la web; es lo que más visitas le daría en Carballo.
- **Dominio.** boxhorreo.es o boxcarballo.es (sin comprobar si están libres).
- **Vecinas.** En la misma calle está BeCool (Hórreo 14), a la que también se le ha propuesto web, y en Carballo A Saia da Carolina. Esta web no repite nada de las suyas; ojo al enseñarlas a la vez.

## Antes de publicar en su dominio
- Quitar el `noindex` de todas las páginas.
- Borrar el mando de maqueta (receta en el README).
- Quitar los avisos de «simulación» cuando haya motor de reservas de verdad.
