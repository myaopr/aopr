// The code in this file will load on every page of your site
import wixMembers from 'wix-members';
import wixLocation from 'wix-location';
import wixStorage from 'wix-storage';
import { viewMode } from 'wix-window';

$w.onReady(function () {
	wixMembers.authentication.onLogin(event => {
		// console.warn(`*** New Login`, event);
		/** Because existing page is not notified upon login */
		// console.warn('*** Reloading Current Browser Page');
    	wixLocation.to(wixLocation.url); // nav to current page refreshes the browser
	})
setPageInfo();

});

/** Set and maintain the information about the page, specifically the current and previous page relative URLs
 * Stores page information is session storage under the "pageInfo" key.
 * @see getBackLink method in aopr-utils.js
 */
function setPageInfo() {
	const pi = wixStorage.session.getItem('pageInfo');
	/** @type {{current?: string, previous?: string}} */
	let pageInfo;
	try {
		pageInfo = JSON.parse(pi || '{}');
	}
	catch {
		pageInfo = {};
	}
	pageInfo.previous = pageInfo.current;
	const baseLen = wixLocation.baseUrl.length; 
	// strip off the base URL, leaving the relative path for router navigation
	// because we want to navigate, not reload the page.
	const curUrl = wixLocation.url.toString().substring(baseLen);
	pageInfo.current = curUrl;
	// console.warn(pageInfo);
	wixStorage.session.setItem('pageInfo', JSON.stringify(pageInfo));
}
