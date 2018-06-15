'use strict'

const cookieParser    = require('cookie-parser');
const bodyParser      = require('body-parser');
const params          = require('./params');
const express         = require('express');
const mysql           = require('mysql');

let app = express();

app.use(cookieParser());
app.use(bodyParser.json());

require('./authentication')(app);
require('./routes')(app);

const connection = mysql.createConnection(
{
  host          : params.database.host,
  user          : params.database.user,
  password      : params.database.password,
  database      : params.database.database,
  insecureAuth  : true
});

app.use((req, res, next) =>
{
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

app.set('connection', connection);

app.listen(3000, () => 
{
  console.log('Server has started port 3000');
});
