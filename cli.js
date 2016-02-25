#!/usr/bin/env node

'use strict';

/**
 * Dependencies
 */

const tempfile = require('tempfile');
const shuffle = require('array-shuffle');
const isIterm = require('is-iterm');
const spawn = require('child_process').spawn;
const each = require('each-series');
const join = require('path').join;
const open = require('opn');
const got = require('got');
const fs = require('fs');

const imgcat = join(__dirname, 'node_modules', '.bin', 'imgcat');


/**
 * npm install + gifs
 */

let args = process.argv.slice(2);
let ps = npm(args);
let gif;

if (isInstall(args)) {
	findImages()
		.then(displayImages)
		.catch(errorHandler);

	ps.on('exit', function (code) {
		if (gif) {
			gif.kill();
		}

		process.exit(code);
	});
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
			api_key: 'dc6zaTOxFJmzC'
		}
	});
}

function showImage (url, done) {
	if (!isIterm) {
		open(url);
		done();
		return;
	}

	let path = tempfile();
	let image = fs.createWriteStream(path);

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
	let images = res.body.data.map(function (image) {
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
