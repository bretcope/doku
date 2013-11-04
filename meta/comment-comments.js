//This plugin allows comments themselves to have comments so that certain parts of a comment can be treated as markdown, and other parts can be ignored entirely.
//A block comment can be defined using double angled brackets `\<< like this >>`
//A single line comment can be achieved using `\//` like in C-style languages.
//If you actually wanted a `\<<` or `\//` to show up in your comments, escape them with a backslash like `\\\<<` or `\\\//`. However, backslashes which do not precede a `\<<` or `\//` have no special meaning. In other words, typing one \ character will render exactly one \ - there is no need to escape them.
//If this concept of comments inside other comments is not clear, <<this won't show up in the docs output>>looking at the source code for this file may be helpful. //neither will this

ESCAPE_CHAR = '\\';

module.exports = function (dok)
{
	dok.on('comment', function (comment)
	{
		//setup regexes
		var open = /<<|\/{2}/g;
		var close = />>/g;
		var lineEnd = /[\n\r]|$/g;
		
		var c = comment.value;
		
		//handle block comments first
		var oi;
		var ci = 0;
		var removals = [];
		
		while (oi = findNextUnescaped(open, c, ci, removals))
		{
			if (c[oi] === '<')
			{
				ci = findNextUnescaped(close, c, oi);
				
				if (!ci)
				{
					//if there is no closing token, the rest of the comment is removed
					c = remove(c, oi, c.length);
					break;
				}
				
				c = remove(c, oi, ci + 2);
			}
			else
			{
				lineEnd.lastIndex = oi;
				ci = lineEnd.exec(c).index;
				c = remove(c, oi, ci);
			}
		}
		
		comment.value = processRemovals(c, removals);
	});
	
	function findNextUnescaped (reg, str, start, removals)
	{
		reg.lastIndex = start;
		var match, escapes, rm;
		while (match = reg.exec(str))
		{
			escapes = 0;
			for (var i = match.index - 1; i >= 0 && str[i] === ESCAPE_CHAR; i--)
			{
				escapes++;
			}
			
			//we need to remove the escape character unless we were looking for a close token
			if (removals)
			{
				rm = escapes - Math.floor(escapes / 2);
				removals.push([match.index - rm, match.index]);
			}
			
			if (escapes % 2 === 1)
			{
				continue;
			}
			
			return match.index;
		}
		
		return null;
	}
	
	function processRemovals (str, removals)
	{
		var start, end;
		for (var i = removals.length - 1; i > -1; i--)
		{
			start = removals[i][0];
			end = removals[i][1];
			str = str.substr(0, start) + str.substr(end);
		}
		
		return str;
	}
	
	function remove (str, start, end)
	{
		if (!end)
			end = str.length;
		
		return str.substr(0, start) + str.substr(end);
	}
};