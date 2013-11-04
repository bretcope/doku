//# Doku

var Events = require('events');
var FileSystem = require('fs');
var FsExtra = require('fs-extra');
var Highlight = require('highlight.js');
var Jade = require('jade');
var Path = require('path');
var Markdown = require('markdown').markdown;
var Util = require('util');

/* ========================================================================================================
 * 
 * Doku Class
 * 
 * ===================================================================================================== */

var _parsers = null;

module.exports = Doku;

Util.inherits(Doku, Events.EventEmitter);

function Doku(options)
{
	if (!(this instanceof Doku))
		return new Doku(options);

	/* ========================================================================================================
	 * Private Members
	 * <!---(no methods)-->
	 * ===================================================================================================== */
	
	var _this = this;
	var _options = options || {};
	var _themeRoot;
	var _renderPage;

	/* ========================================================================================================
	 * Public Members
	 * (no methods)
	 * ===================================================================================================== */

	/* ========================================================================================================
	 * Public Methods
	 * Keep in alphabetical order
	 * ===================================================================================================== */
	
	this.generate = function ()
	{
		var dir = _readDirectory('.');
		
		//clear output directory
		//TODO: might not actually want to delete the entire directory every time?
		if (FileSystem.existsSync(_options.output))
		{
			if (FileSystem.statSync(_options.output).isDirectory())
			{
				FsExtra.removeSync(_options.output);
			}
			else
			{
				throw new Error('Output directory specified already exists and is not a directory.');
			}
		}
		
		var templateFile = Path.join(_options.theme, 'page.jade');
		_renderPage = Jade.compile(FileSystem.readFileSync(templateFile), { filename: templateFile });
		
		//generate documentation
		_generateDirectory(dir);
		
		//copy theme files
		if (FileSystem.existsSync(_options.output))
		{
			FsExtra.copySync(_options.theme, _themeRoot);
		}
	};

	/* ========================================================================================================
	 * Private Methods - Keep in alphabetical order
	 * ===================================================================================================== */
	
	function _branchHasFiles (dirObj)
	{
		if (dirObj.files.length > 0)
			return true;
		
		if (dirObj.subDirectories.length > 0)
		{
			for (var i in dirObj.subDirectories)
			{
				if (_branchHasFiles(dirObj.subDirectories[i]))
					return true;
			}
		}
		
		return false;
	}
	
	function _formatFile(fileObj, blocks)
	{
		var cssRoot = Path.relative(Path.join(_options.output, fileObj.path), _themeRoot);
		
		var html = [];
		var lang = _parsers[fileObj.extension].language;
		
		var b;
		for (var i = 0; i < blocks.length; i++)
		{
			b = blocks[i];
			switch (b.type)
			{
				case 'md':
					html.push(Markdown.toHTML(b.value));
					break;
				case 'code':
					html.push('<pre><code>');
					if (Highlight.LANGUAGES[lang])
						html.push(Highlight.highlight(lang, b.value).value);
					else
						html.push(Highlight.highlightAuto(b.value).value);
					html.push('</code></pre>');
					break;
				case 'html':
					html.push(b.value);
					break;
			}
		}
		
		var model =
		{
			title: fileObj.name,
			body: html.join(''),
			css: [ Path.join(cssRoot, 'docco.css') ]
		};
		
		return _renderPage(model);
	}
	
	function _generateDirectory (dirObj)
	{
		var path = Path.join(_options.output, dirObj.path);
		if (_branchHasFiles(dirObj))
		
		if (dirObj.files.length > 0)
		{
			FsExtra.mkdirsSync(path);
			
			var i, f, raw, blocks, html;
			for (i in dirObj.files)
			{
				f = dirObj.files[i];
				raw = FileSystem.readFileSync(Path.join(_options.include, f.path, f.name), { encoding: 'utf8' });
				blocks = _generateFileBlocks(f, raw);
				html = _formatFile(f, blocks);
				FileSystem.writeFileSync(Path.join(path, f.name + '.html'), html)
			}
		}
		
		for (i in dirObj.subDirectories)
		{
			_generateDirectory(dirObj.subDirectories[i]);
		}
	}
	
	function _generateFileBlocks (fileObj, raw)
	{
		var i, c;
		var comments = _parsers[fileObj.extension].parse(raw);
		
		var blocks = [];
		
		for (i = 0; i < comments.length; i++)
		{
			c = comments[i];
			c.type = c.type.toLowerCase();
			c.includeCode = true;
			c.expandCode = null;
			c.linePrefix = _linePrefix(c, raw);
			c.isCode = c.type !== 'line' || c.linePrefix.trim() !== '';
			
			_this.emit('comment', c, fileObj.extension);
			
			if (c.isCode || !c.value)
				continue;
			
			delete c.isCode;
			
			blocks.push({ comment: c });
		}
		
		//make sure code before the first comment doesn't get lost 
		if (blocks.length === 0 || blocks[0].comment.range[0] !== 0)
			blocks.unshift({ comment: null });
		
		var finalBlocks = [];
		
		var b, start, end, next;
		for (i = 0; i < blocks.length; i++)
		{
			b = blocks[i];
			next = blocks[i + 1] ? blocks[i + 1].comment : null;
			
			start = b.comment === null ? 0 : b.comment.range[1];
			end = next ? next.range[0] : raw.length;
			
			b.code = { value: raw.substring(start, end) };
			
			_this.emit('code', b.code, b.comment, fileObj.extension);
			
			if (b.comment)
				finalBlocks.push({ type: 'md', value: b.comment.value });
			
			if ((!b.comment || b.comment.includeCode) && b.code.value)
				finalBlocks.push({ type: 'code', value: b.code.value });
		}
		
		var page = { original: raw, blocks: finalBlocks, extension: fileObj.extension };
		_this.emit('page', page);
		
		return page.blocks;
	}
	
 	function _init ()
	{
		//load parser modules if not already loaded
		if (!_parsers)
			loadParsers();
		
		//normalize options
		if (!_options.include)
			_options.include = './';
		
		if (!_options.excludes)
			_options.excludes = [];
		
		if (!_options.output)
			_options.output = './docs';
		
		if (_options.recursive !== false)
			_options.recursive = true;
		
		_options.include = Path.resolve(process.cwd(), _options.include);
		_options.output = Path.resolve(_options.include, _options.output);
		
		if (_options.include === _options.output)
			throw new Error("Cannot output documentation into the same directory as the input directory.");
		
		var e;
		for (var i in _options.excludes)
		{
			e = _options.excludes[i];
			
			if (e.path)
				e.path = Path.resolve(_options.include, e.path);
		}
		
		_themeRoot = Path.join(_options.output, '.theme');
		
		var themeName = _options.theme ? _options.theme : 'linear';
		_options.theme = Path.join(__dirname, '..', 'themes', themeName);
		
		if (!FileSystem.existsSync(_options.theme))
			throw new Error('"' + themeName + '" does not exist.');
	}
	
	function _linePrefix (comment, raw)
	{
		var br = /[\r\n]/;
		var lineStart = comment.range[0];
		do
		{
			lineStart--;
		}
		while (lineStart > -1 && !br.test(raw[lineStart]));
		
		return raw.substring(lineStart + 1, comment.range[0]);
	}
	
	function _readDirectory (path)
	{
		var absolute = Path.join(_options.include, path);
		var directory = { path: path, files: [], subDirectories: [] };
		
		if (absolute === _options.output)
			return directory;
		
		var i, e;
		
		//gather the relevant excludes
		var excludes = [];
		for (i in _options.excludes)
		{
			e = _options.excludes[i];
			if (!e.path || e.path === absolute)
				excludes.push(e);
		}
		
		var files = FileSystem.readdirSync(absolute);
		var f, ext, stats;
		for (i in files)
		{
			f = files[i];
			
			if (f[0] === '.') //skip files/directories starting with a period (hidden)
				continue;
			
			if (excludes.some(function (e)
							{
								return ((e.pattern instanceof RegExp) && e.pattern.test(f)) || e.pattern === f;
							}))
			{
				continue;
			}
			
			stats = FileSystem.statSync(Path.join(absolute, f));
			
			if (stats.isDirectory())
			{
				if (_options.recursive)
				{
					directory.subDirectories.push(_readDirectory(Path.join(path, f)));
				}
			}
			else
			{
				ext = /\.([^.]+?)$/.exec(f);
				if (!ext)
					continue;
				
				ext = ext[1].toLowerCase();
				if (_parsers[ext])
				{
					//we actually care about this file
					directory.files.push(
					{
						name: f,
						path: path,
						extension: ext
					});
				}
			}
		}
		
		return directory;
	}
	
	/* ========================================================================================================
	 * Initialization
	 * ===================================================================================================== */
	
	Events.EventEmitter.call(this);
	_init();
}

/* ========================================================================================================
 * 
 * Module Utility Functions
 * 
 * ===================================================================================================== */

function loadParsers ()
{
	var i;
	var parserPath = Path.join(__dirname, '..', 'parsers');
	
	//load all parsers
	var files = FileSystem.readdirSync(parserPath);
	_parsers = {};
	
	var stats, parser, f;
	for (i in files)
	{
		f = Path.join(parserPath, files[i]);
		stats = FileSystem.statSync(f);
		if (stats.isDirectory())
		{
			parser = new (require(f))();
			for (var e in parser.extensions)
			{
				_parsers[parser.extensions[e]] = parser;
			}
		}
	}
}

/* ========================================================================================================
 * 
 * Auto Generation (if called from the command line)
 * 
 * ===================================================================================================== */

if (!module.parent)
{
	var options = 
	{
		excludes:
		[
			{
				path: null,
				pattern: 'node_modules' //can also be a regular expression
			}
		]
	};
	var doku = new Doku(options);
	doku.generate();
}
