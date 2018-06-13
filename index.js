'use strict';

const express = require('express');
let app = express();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
//var morgan = require('morgan');

//app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

require('./authentication')(app);
require('./routes')(app);

app.listen(8080, function() {
  console.log('Server has started port 8080');
});
