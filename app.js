var express = require('express');
var fs = require('fs');
var app = express();
var Cell = require('./custom_modules/ServerCell.js');
var Grid = require('./custom_modules/ServerHexGrid.js');
var Generator = require('./custom_modules/TerrainGenerator.js');
var url = require('url');
// var bodyParser = require('body-parser')

// app.use(bodyParser.urlencoded({ extended: false })); 


var dist = 'dist';
var src = 'src';
 
app.get('/generate-map', function (req, res) {
	Grid.init();	
	var url_parts = url.parse(req.url, true);
	var query = url_parts.query

	Grid.generate({size: parseInt(query.size) || 60});

	Generator({
		grid: Grid,
		seed: query.seed,
		res: res
	});
});

app.get('/', function (req, res) {
	fs.readFile('./public/index.html', 'utf8', function(err, text) {
		res.send(text);
	});
});

app.use(express.static('public'));
 
app.listen(3000);