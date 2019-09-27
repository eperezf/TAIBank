 Conexión básica
 ===============

 Muestra que la API está funcionando de forma correcta

 **URL:** `/api/v1`

 **Método:** `GET`

 Respuestas
 ----------

 **Código:** `200 OK`

**Contenido:**

```json

{"status": "OK", "message": "API TAIBank v1"}

```

Listado de usuarios
===============

Muestra la lista de usuarios

**URL:** `/api/v1/users`

**Método:** `GET`

Respuestas
----------

**Código:** `200 OK`

**Contenido:**

```json
{
  "error": false,
  "data": [
    {
      "id_user": 17,
      "first_name": "Cristóbal Andrés",
      "last_name": "Jaraquemada Vergara",
      "address": "Carlos Sabat 6336, Vitacura",
      "phone_number": 776545
    },
    ...
  ]  
}
```

Datos de usuario
===============

Muestra los datos específicos de un usuario

**URL:** `/api/v1/user/:id`

**Parámetros de URL:** `id=[integer]`  donde `id` es el ID de la cuenta

**Método:** `GET`

Respuesta Correcta
----------

**Condición:** Si el usuario existe.

**Código:** `200 OK`

**Contenido:**

```json
{
  "error": false,
  "data": {
    "id_user": 17,
    "first_name": "Cristóbal Andrés",
    "last_name": "Jaraquemada Vergara",
    "address": "Carlos Sabat 6336, Vitacura",
    "phone_number": 776545
  }
}
```

Respuesta incorrecta
----------

**Condición:** Si no existe el usuario.

**Código:** `404 Not Found`

**Contenido:**

```json
{
  "error": true,
  "message": "User does not exist"
}
```
