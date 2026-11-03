<!-- s:68d1688157 -->
Sustituye las filas hechas a mano por componentes: `<Table>` con navegación por teclado y ordenación, `<List>` con desplazamiento virtualizado y gráficos dibujados con bloques de un octavo y puntos de cuadrante.

<!-- s:05c3784661 -->
Una tabla ordenable

<!-- s:7c978a7876 -->
Las columnas son un array de objetos. Una columna sin `width` comparte el espacio restante según `grow`, `value` es lo que se compara al ordenar y `render` dibuja la celda.

<!-- s:d77f425e4a -->
Con el foco en la tabla, `↑` `↓` mueven el resaltado, `s` cambia cíclicamente la columna de ordenación, `S` invierte el sentido y `Enter` llama a `onSelect`. Las tablas largas solo dibujan las filas visibles.

<!-- s:0d24a40c2e -->
Un gráfico encima de la tabla

<!-- s:146f64e4f0 -->
`<Sparkline>` llena su caja con los puntos más recientes. `<BarChart>` alinea las etiquetas y los valores por ti.

<!-- s:62ad31a083 -->
La caja del gráfico tiene una altura fija, por lo que cambiar de gráfico nunca mueve la tabla ni vuelve a codificar sus filas.

<!-- s:335111e821 -->
Más componentes

<!-- s:ff2d92e2d3 -->
`<List>`, `<Tree>`, `<Tabs>`, `<Select>`, `<Input>`, `<Modal>`, `<Toaster>`, `<CommandPalette>`, `<ProgressBar>`, `<LineChart>` y otros componentes se documentan en [Componentes](/docs/components-data).
