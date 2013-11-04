//# Meta Documenter
//This file will invoke Doku on itself to generate documentation in the `/docs` folder.
//It also provides an example for how plugins might be architected and used with Doku.
//The other files in this directory (`/meta`) are plugins which are used by this file. However, these plugins may eventually be relocated into their own npm modules if I feel they are general enough.

//General Require Statements
var Doku = require('../');
var Path = require('path');

// Gather plugins.
var autoHeader = require('./auto-header.js');
var commentComments = require('./comment-comments.js');
var headerBlocks = require('./header-blocks.js');

//Instantiate a Doku object
var options = 
{
	include: Path.join(__dirname, '..'),
	excludes:
	[
		{
			path: null,
			pattern: 'node_modules' //can be a string or regular expression
		}
	]
};

var dok = new Doku(options);

//Register plugins
autoHeader(dok);
commentComments(dok);
headerBlocks(dok);

//Run Doku
dok.generate();
