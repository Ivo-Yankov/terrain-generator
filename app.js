var express = require('express');
var fs = require('fs');
var app = express();
var Cell = require('./custom_modules/ServerCell.js');
var Grid = require('./custom_modules/ServerHexGrid.js');
// var Generator = require('./custom_modules/TerrainGenerator.js');

var dist = 'dist';
var src = 'src';
 
app.use(express.static('public'));

app.get('/', function (req, res) {
	Grid.init({
		cellSize: 11
	});

	Grid.generate({
		size: 10
	});

	console.log("CELLS:");
	console.log(Grid.cells);

	// Generator({grid: Grid}).generate_terrain();

	fs.readFile('./public/index.html', 'utf8', function(err, text){
		res.send(text);
	});
});
 
app.listen(3000);