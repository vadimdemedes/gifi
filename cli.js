#!/usr/bin/env node

'use strict';

/**
 * Dependencies
 */

var tempfile = require('tempfile');
var shuffle = require('array-shuffle');
var isIterm = require('is-iterm');
var spawn = require('cross-spawn-async');
var each = require('each-series');
var join = require('path').join;
var open = require('opn');
var got = require('got');
var fs = require('fs');
var giffyBreak = require('giffy-break');

var imgcat = join(__dirname, 'node_modules', '.bin', 'imgcat');

var API_KEY = 'dc6zaTOxFJmzC';


/**
 * npm install + gifs
 */

var args = process.argv.slice(2);
var ps = npm(args);
var gif;

if (isInstall(args)) {
	if (isIterm) {
		findImages()
			.then(displayImages)
			.catch(errorHandler);

		ps.on('exit', function (code) {
			if (gif) {
				gif.kill();
			}

			process.exit(code);
		});
	} else {
		var promise = new Promise(function (resolve, reject) {
			ps.on('exit', function (code) {
				(code === 0 ? resolve : reject)(code);
			});
		});

		giffyBreak(promise, API_KEY, {
			interval: 3000,
			startMessage: 'Running <code>$ npm ' + args.join(' ') + '</code>'
		})
			.then(open)
			.catch(errorHandler);
	}
}

function isInstall (args) {
	return args[0] === 'i' || args[0] === 'install';
}

function npm (args) {
	return spawn('npm', args, {
		cwd: process.cwd(),
		stdio: isInstall(args) ? 'ignore' : 'inherit'
	});
}

function findImages () {
	return got('http://api.giphy.com/v1/gifs/trending', {
		json: true,
		query: {
			api_key: API_KEY
		}
	});
}

function showImage (url, done) {
	var path = tempfile();
	var image = fs.createWriteStream(path);

	image.on('finish', function () {
		gif = spawn(imgcat, [path], {
			cwd: process.cwd()
		});

		gif.stdout.on('data', function (data) {
			process.stdout.write(data);
		});

		done();
	});

	got.stream(url).pipe(image);
}

function displayImages (res) {
	var images = res.body.data
		.filter(function (image) {
			return image.images.original.height <= 400;
		})
		.map(function (image) {
			return image.images.original.url;
		});

	each(shuffle(images), function (url, i, done) {
		showImage(url, function () {
			setTimeout(done, 5000);
		});
	});
}

function errorHandler (err) {
	console.error(err.stack);
	process.exit(1);
}
