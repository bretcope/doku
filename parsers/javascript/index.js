var Esprima = require('esprima');

/* ========================================================================================================
 * Private Members Declaration << no methods >>
 * ===================================================================================================== */

// code

/* ========================================================================================================
 * Public Members Declaration << no methods >>
 * ===================================================================================================== */

Object.defineProperty(JavaScript.prototype, 'extensions', { get: function () { return [ 'js' ]; } });
Object.defineProperty(JavaScript.prototype, 'language', { get: function () { return 'javascript'; } });

/* ========================================================================================================
 * Public Methods << Keep in alphabetical order >>
 * ===================================================================================================== */

module.exports = JavaScript;

function JavaScript ()
{
	//
}

JavaScript.prototype.parse = function (src)
{
	var tree = Esprima.parse(src, { range: true, comment: true, tolerant: true });
	return tree.comments;
};

/* ========================================================================================================
 * Private Methods << Keep in alphabetical order >>
 * ===================================================================================================== */

// code

/* ========================================================================================================
 * Initialization
 * ===================================================================================================== */

// If function calls need to be made to initialize the module, put those calls here.
