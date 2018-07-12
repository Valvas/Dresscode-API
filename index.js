'use strict'

const cookieParser    = require('cookie-parser');
const bodyParser      = require('body-parser');
const params          = require('./params');
const express         = require('express');
const mysql           = require('mysql');

const functions       = require('./functions');

let app = express();

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json({ limit: '5mb' }));

app.use((req, res, next) =>
{
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

require('./authentication')(app);
require('./routes')(app);

const pool  = mysql.createPool(
{
  connectionLimit : 10,
  host            : params.database.host,
  user            : params.database.user,
  password        : params.database.password,
  database        : params.database.database,
  insecureAuth    : true
});

app.set('pool', pool);

pool.getConnection((error, connection) =>
{
  if(error)
  {
    console.log(error.message);
    process.exit(1);
  }

  else
  {
    functions.insertColorsInDatabase(params.colors, connection, (error) =>
    {
      error != null ? process.exit(1) :

      functions.insertTypesInDatabase(params.types, connection, (error) =>
      {
        error != null ? process.exit(1) :

        app.listen(3000, () =>
        {
          connection.release();

          console.log('Server has started port 3000');
        });
      });
    });
  }
});
