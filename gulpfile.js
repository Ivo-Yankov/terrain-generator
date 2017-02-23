var gulp = require('gulp');
var fs = require('fs');
var $ = require('gulp-load-plugins')();
var del = require('del');
var runSequence = require('run-sequence');
var path = require('path');
var spawn = require('child_process').spawn;
var node;

var pkg = require('./package.json');

var dist = 'public/dist';
var src = 'public/src';

/**
 * $ gulp server
 * description: launch the server. If there's a server already running, kill it.
 */
gulp.task('server', function() {
    if (node) node.kill();
    node = spawn('node', ['app.js'], {stdio: 'inherit'});
    node.on('close', function (code) {
        if (code === 8) {
            gulp.log('Error detected, waiting for changes...');
        }
    });
});

/**
 * $ gulp
 * description: start the development environment
 */
gulp.task('default', function() {
    gulp.run('server');

    gulp.watch(['*.js', 'custom_modules/*.*', 'custom_modules/**/*.*'], function() {
    	gulp.run('server');
    });

    gulp.watch(['public/src/**/*.*'], function() {
        gulp.run('hex');
    });
});

gulp.task('hex', function() {
	gulp.src([src+'/vg.js', src+'/**/*.js', '!src/grids/Hex.js', '!src/grids/HexGrid.js'])
		.pipe($.plumber({errorHandler: handleErrors}))
		.pipe($.sourcemaps.init())
		.pipe($.concat('hex-grid.min.js'))
		.pipe($.uglify())
		.pipe($.sourcemaps.write('.'))
		.pipe(gulp.dest(dist))    

});

// clean up if an error goes unhandled.
process.on('exit', function() {
    if (node) gulp.run('default');
});

gulp.task('serveprod', function() {
  connect.server({
    root: '/',
    port: process.env.PORT || 3000,
    livereload: false
  });
});


/*----------------------------------------------------------------------
	HELPERS
*/

function handleErrors() {
	var args = Array.prototype.slice.call(arguments);
	// Send error to notification center with gulp-notify
	$.notify.onError({
		title: 'Build error',
		message: '<%= error%>',
		showStack: true
	}).apply(this, args);

	// Keep gulp from hanging on this task
	this.emit('end');
}
