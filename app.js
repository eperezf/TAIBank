/*jshint esversion: 6 */

/* API TAIBank
 * © 2019 Eduardo Pérez
 * eduperez@alumnos.uai.cl
*/

// Definimos variables y requerimientos
var mysql = require('mysql');
const express = require('express');
var bodyParser = require('body-parser');
const app = express();
const port = 3000;
var sql;

// Haremos uso de body parser para JSON.
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

function connect(){
  sql = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: 'TAIBank'
  });
  sql.on('error', connect());
}

// Nos conectamos a la DB
sql.connect(function(err) {
  if (err) throw err;
  console.log("Conectado a la DB");
});

// Escuchar en el puerto por defecto (3000)
app.listen(port, () => console.log(`TAIBank funcionando en el puerto ${port}!`));

// Index
app.get('/api/v1/', function (req, res){
  res.status(200).send({
    status: 'OK',
    message: 'API TAIBank v1'
  });
});

// Obtener listado de usuarios
app.get('/api/v1/users', function(req, res){
  sql.query('SELECT id_user, first_name, last_name, address, phone_number FROM users', function (error, results, fields) {
    if (error) throw error;
    return res.status(200).send({ error: false, data: results});
  });
});

// Obtener datos específicos de usuario
app.get('/api/v1/user/:id', function (req, res) {
  let id_user = req.params.id;
  if (!id_user) {
    return res.status(400).send({ error: true, message: 'Please provide id_user' });
  }
  sql.query('SELECT id_user, first_name, last_name, address, phone_number FROM users where id_user=?', id_user, function (error, results, fields) {
    if (error) throw error;
    if (!results[0]) {
      return res.status(404).send({error: true, message: "User does not exist"});
    }
    else {
      return res.send({ error: false, data: results[0]});
    }
  });
});

// Crear nuevo usuario
app.post('/api/v1/user', function (req, res) {
  let first_name = req.body.first_name;
  let last_name = req.body.last_name;
  let address = req.body.address;
  let phone_number = req.body.phone_number;
  let pin = req.body.pin;
  let conf_pin = req.body.conf_pin;

  var hasNumber = new RegExp('\\d');
  var hasLetter = new RegExp('[^\\d]');
  if (hasLetter.test(phone_number)) {
    return res.status(400).send({ error:true, message: 'Phone number must only have numbers' });
  }
  if (hasLetter.test(pin)) {
    return res.status(400).send({ error:true, message: 'PIN must only have numbers' });
  }
  if (hasNumber.test(first_name) || hasNumber.test(last_name)) {
    return res.status(400).send({ error:true, message: 'Names must only contain letters' });
  }
  if (conf_pin != pin){
    return res.status(400).send({ error:true, message: 'PIN Number does not match' });
  }
  if (!first_name || !last_name || !address || !phone_number || !pin || !conf_pin) {
    return res.status(400).send({ error:true, message: 'One or more items are missing' });
  }
  sql.query(
    "INSERT INTO users SET ? ", {first_name: first_name, last_name: last_name, address: address, phone_number: phone_number, pin: pin}, function (error, results, fields) {
      if (error) throw error;
      let id_user = results.insertId;
      return res.status(200).send({ error: false, id_user: id_user, message: 'New user has been created successfully.' });
    });
});

// Crear nueva tarjeta
app.post('/api/v1/card', function(req, res){
  let id_user = req.body.id_user;
  let pin = req.body.pin;
  sql.query('SELECT id_user, first_name, last_name, address, phone_number, pin FROM users where id_user=?', id_user, function (error, results, fields) {
    if (!results[0]){
      return res.status(404).send({error: true, message: "ID does not exist"});
    }
    else if (pin != results[0].pin){
        return res.status(403).send({error: true, message: "PIN does not match"});
    }
    else {
      sql.query("INSERT INTO debit_card SET ? ", {id_user: id_user, balance: 0}, function (error, results, fields) {
        if (error) throw error;
        let id_debit_card = results.insertId;
        return res.status(200).send({ error: false, id_debit_card: id_debit_card, message: 'New card has been created.'});
      });
    }
  });
});

// Depositar a una tarjeta
app.post('/api/v1/card/deposit', function (req, res){
  let id_debit_card = req.body.id_debit_card;
  let pin = req.body.pin;
  let amount = req.body.amount;
  let balance = 0;
  if (!id_debit_card) {
    return res.status(400).send({ error: true, message: 'Missing Body key: id_debit_card'});
  }
  else if (!pin){
    return res.status(400).send({ error: true, message: 'Missing Body key: pin'});
  }
  else if (!amount){
    return res.status(400).send({ error: true, message: 'Missing Body key: amount'});
  }
  else {
    sql.query("SELECT d.id_debit_card, d.balance, u.id_user, u.pin FROM debit_card as d LEFT JOIN users as u ON d.id_user = u.id_user WHERE d.id_debit_card = ?", id_debit_card, function (error, results, fields){
      if (error) throw error;
      if(!results){
        return res.status(404).send({ error: true, message: 'ID does not exist'});
      }
      else if (results[0].pin != pin){
        return res.status(403).send({ error: true, message: 'PIN does not match'});
      }
      else {
        balance = results[0].balance;
        let newBalance = parseInt(balance) + parseInt(amount);
        sql.query("UPDATE debit_card SET balance = ? WHERE id_debit_card = ?", [newBalance, id_debit_card], function (error,results,fields){
          if (error) throw error;
          var date = new Date();
          sql.query("INSERT INTO debit_transaction SET ?", {amount: amount, to_card: id_debit_card, date: date.toISOString().slice(0, 19).replace('T', ' '), type: 1}, function(error, results, fields){
            if (error) throw error;
            console.log("TRANSACTION RECORDED");
          });
          return res.status(200).send({ error: false, data: {old_balance: balance, new_balance: newBalance}, message: 'Deposit successful'});
        });
      }
    });
  }
});

// Realizar un giro
app.post('/api/v1/card/withdraw', function (req, res){
  let id_debit_card = req.body.id_debit_card;
  let pin = req.body.pin;
  let amount = req.body.amount;
  let balance = 0;
  if (!id_debit_card) {
    return res.status(400).send({ error: true, message: 'Missing Body key: id_debit_card'});
  }
  else if (!pin){
    return res.status(400).send({ error: true, message: 'Missing Body key: pin'});
  }
  else if (!amount){
    return res.status(400).send({ error: true, message: 'Missing Body key: amount'});
  }
  else {
    sql.query("SELECT d.id_debit_card, d.balance, u.id_user, u.pin FROM debit_card as d LEFT JOIN users as u ON d.id_user = u.id_user WHERE d.id_debit_card = ?", id_debit_card, function (error, results, fields){
      if (error) throw error;
      if(!results){
        return res.status(404).send({ error: true, message: 'ID does not exist'});
      }
      else if (results[0].pin != pin){
        return res.status(403).send({ error: true, message: 'PIN does not match'});
      }
      else {
        balance = results[0].balance;
        if (balance < amount) {
          return res.status(200).send({ error: true, message: 'Insufficient funds.'});
        }
        else {
          let newBalance = parseInt(balance) - parseInt(amount);
          sql.query("UPDATE debit_card SET balance = ? WHERE id_debit_card = ?", [newBalance, id_debit_card], function (error,results,fields){
            if (error) throw error;
            var date = new Date();
            sql.query("INSERT INTO debit_transaction SET ?", {amount: amount, from_card: id_debit_card, date: date.toISOString().slice(0, 19).replace('T', ' '), type: 2}, function(error, results, fields){
              if (error) throw error;
              console.log("TRANSACTION RECORDED");
            });
            return res.status(200).send({ error: false, data: {old_balance: balance, new_balance: newBalance}, message: 'Withdraw successful'});
          });
        }
      }
    });
  }
});

// Ver tarjetas de un usuario
app.get('/api/v1/user/:id/cards', function (req,res){
  let id_user = req.params.id;
    sql.query('SELECT id_user, pin FROM users where id_user=?', id_user, function (error, results, fields) {
      if (!results) {
        return res.send({ error: true, message: 'User does not exist'});
      }
      else {
        sql.query('SELECT id_debit_card, balance FROM debit_card WHERE id_user=?', id_user, function(error, results, fields){
          return res.send({ error: false, data: results});
        });
      }
    });
});

// Ver una tarjeta en específico
app.get('/api/v1/card/:id', function (req,res){
  let id_debit_card = req.params.id;
  sql.query('SELECT * FROM debit_card WHERE id_debit_card=?', id_debit_card, function(error,result,fields){
    if (!result[0]) {
      return res.send({ error: true, message: 'Card does not exist'});
    }
    else {
      return res.send({ error: false, data: result[0]});
    }
  });
});

// Realizar una transferencia
app.post('/api/v1/card/transfer', function (req,res){
  let from_id_debit_card = req.body.from_id_debit_card;
  let to_id_debit_card = req.body.to_id_debit_card;
  let pin = req.body.pin;
  let amount = req.body.amount;
  let comment = req.body.comment;
  let origin_card;
  let destination_card;
  var user_data;
  let balance = 0;
  var date = new Date();

  if(!comment){
    comment = null;
  }

  if (!from_id_debit_card){
    return res.status(400).send({ error: true, message: 'Missing Body key: from_id_debit_card'});
  }
  else if (!to_id_debit_card){
    return res.status(400).send({ error: true, message: 'Missing Body key: to_id_debit_card'});
  }
  else if (!pin){
    return res.status(400).send({ error: true, message: 'Missing Body key: pin'});
  }
  else if (!amount){
    return res.status(400).send({ error: true, message: 'Missing Body key: amount'});
  }
  else if (from_id_debit_card == to_id_debit_card){
    return res.status(400).send({ error: true, message: 'You can\'t transfer to the same account'});
  }
  else {
    sql.query('SELECT * FROM debit_card WHERE id_debit_card=?', from_id_debit_card, function(error,result,fields){
      if (!result[0]) {
        return res.status(404).send({ error: true, message: 'Origin card does not exist'});
      }
      else {
        origin_card = result[0];
        if (amount > origin_card.balance){
          return res.status(200).send({ error: true, message: 'Insufficient funds'});
        }
        else {
          sql.query('SELECT * FROM debit_card WHERE id_debit_card=?', to_id_debit_card, function(error,result,fields){
            if (!result[0]) {
              return res.status(404).send({ error: true, message: 'Destination card does not exist'});
            }
            else {
              destination_card = result[0];
              sql.query('SELECT * FROM users WHERE id_user=?', origin_card.id_user, function(error,result,fields){
                user_data = result[0];
                if (user_data.PIN != pin) {
                  return res.status(403).send({ error: true, message: 'PIN does not match'});
                }
                else {
                  origin_card.newBalance = parseInt(origin_card.balance) - parseInt(amount);
                  destination_card.newBalance = parseInt(destination_card.balance) + parseInt(amount);
                  sql.query("UPDATE debit_card SET balance = ? WHERE id_debit_card = ?", [origin_card.newBalance, from_id_debit_card], function (error,results,fields){
                    if (error) throw error;
                  });
                  sql.query("UPDATE debit_card SET balance = ? WHERE id_debit_card = ?", [destination_card.newBalance, to_id_debit_card], function (error,results,fields){
                    if (error) throw error;
                  });
                  sql.query("INSERT INTO debit_transaction SET ?", {amount: amount, from_card: from_id_debit_card, to_card: to_id_debit_card, date: date.toISOString().slice(0, 19).replace('T', ' '), comment: comment, type: 0}, function(error, results, fields){
                    if (error) throw error;
                  });
                  return res.status(200).send({ error: false, message: 'Transaction successful'});
                }
              });
            }
          });
        }
      }
    });
  }
});

// Ver historial de transacciones
app.get('/api/v1/history', function(req,res){
  return res.status(200).send({ error: false, message: 'Temporarily not available'});
});

connect();
