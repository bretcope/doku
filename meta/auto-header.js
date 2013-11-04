// For each page which does not begin with an H1 header, this plugin automatically adds one with the title of the original source file.

module.exports = function (dok)
{
	dok.on('page', function (page)
	{
		if (page.blocks.length === 0 || page.blocks[0].type !== 'md' || page.blocks[0].value[0] !== '#')
		{
			page.blocks.unshift(
			{
				type: 'md',
				value: '# ' + page.file.name
			});
		}
	});
};