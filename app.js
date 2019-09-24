/*jshint esversion: 6 */

var mysql = require('mysql');
const express = require('express');
var bodyParser = require('body-parser');
const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

var sql = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root",
  database: 'TAIBank'
});

sql.connect(function(err) {
  if (err) throw err;
  console.log("Conectado a la DB");
});

app.get('/api/v1/', function (req, res){
  res.status(200).send({
    status: 'OK',
    message: 'API TAIBank v1'
  });
});



app.listen(port, () => console.log(`Example app listening on port ${port}!`));

app.get('/api/v1/users', function(req, res){
  sql.query('SELECT id_user, first_name, last_name, address, phone_number FROM users', function (error, results, fields) {
    if (error) throw error;
    return res.send({ error: false, data: results, message: 'User list' });
  });
});

app.get('/api/v1/user/:id', function (req, res) {
  let user_id = req.params.id;
  if (!user_id) {
    return res.status(400).send({ error: true, message: 'Please provide user_id' });
  }
  sql.query('SELECT id_user, first_name, last_name, address, phone_number FROM users where id_user=?', user_id, function (error, results, fields) {
    if (error) throw error;
    return res.send({ error: false, data: results[0], message: 'users list.' });
  });
});

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
      return res.send({ error: false, data: results, message: 'New user has been created successfully.' });
    });
});
