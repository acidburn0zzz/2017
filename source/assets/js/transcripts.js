(function () {

	function transcriptListIntoDropdown() {
		Array.prototype.forEach.call(document.querySelectorAll('.transcript-navigation'), function (list) {
			// find the transcript navigation list
			var transcriptNavigation = document.querySelector('.transcript-navigation');
				var list = transcriptNavigation.getElementsByTagName('ul')[0];
				// console.log(list);
				list.classList.add('transcript-navigation-list');
			// turn the navigation list into a select input
			// create an empty select
			var select = document.createElement('select');
				select.classList.add('transcript-navigation-select');
				select.setAttribute('id','transcript-select')

			// get the list item
			var listItems = list.getElementsByTagName('li');
			// console.log(listItems);

			Array.prototype.forEach.call(listItems, function (listItem) {
				// for each list item:
				// - add the list item to the select
				var option = document.createElement('option');
				// - get the a href
				listItemURL = listItem.childNodes[0].href;
				// console.log(listItemURL);
				// - apply the href to the opt value
				option.value = listItemURL;
				// console.log(option.value);
				// - get the text
				listItemText = listItem.childNodes[0].text;
				// console.log(listItemText);
				// - apply the text to the opt text
				option.text = listItemText;
				// console.log(option.text);
				// add option to select
				select.add(option);
			});
			// add select to the page
			list.parentNode.insertBefore(select, list);
			// add linking functionality to select
			select.setAttribute('onchange','window.location.href=this.value');
			// remove list from page (as select has replaced functionality)
			list.parentNode.removeChild(list);
		});
	}

	transcriptListIntoDropdown();
})();