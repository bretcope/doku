var MIN_REPEAT_LENGTH = 5;

module.exports = function (dok)
{
	dok.on('comment', function (comment, extension)
	{
		if (extension !== 'js' || comment.type !== 'block')
			return;
		
		var lines = comment.value.split(/\r?\n/g);
		
		if (lines.length < 3)
			return;
		
		var startColumn = comment.linePrefix.length;
		
		if (!lineRepeats(lines[0]) || !lineRepeats(trimToStartColumn(lines[lines.length - 1], startColumn)))
			return;
		
		var i;
		var header = null;
		var lastNotEmpty = -1;
		for (i = 1; i < lines.length - 1; i++)
		{
			lines[i] = trimToStartColumn(lines[i], startColumn);
			if (lines[i].trim() !== '')
			{
				lastNotEmpty = i;
				
				if (header === null)
				{
					header = i;
					if (lines[i][0] !== '#')
						lines[i] = (i > 1 ? '## ' : '### ') + lines[i];
				}
			}
		}
		
		comment.value = lines.slice(header, lastNotEmpty + 1).join('\n');
		comment.isCode = false;
	});
};

function trimToStartColumn (str, col)
{
	var reg = new RegExp('^\\s{0,' + col + '}( \\* )?');
	return str.replace(reg, '');
}

function lineRepeats (line)
{
	line = line.trim();
	
	if (line.length < MIN_REPEAT_LENGTH)
		return false;
	
	var c = line[0];
	for (var i = 1; i < line.length; i++)
	{
		if (line[i] !== c)
			return false;
	}
	
	return true;
}