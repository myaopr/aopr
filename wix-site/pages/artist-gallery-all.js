import wixData from 'wix-data';
import wixLocation from 'wix-location';
import { artistsEditPageLinkField, artistGalleryCollectionName, defaultArtistImageUrl } from 'public/constants';
import { artistGalleryDefaultFilter, getArtistMemberInfo, showSpinner, stopSpinner } from 'public/aopr-utils';

/**
 * @typedef {import('public/aopr-utils.js').ArtistMemberInfo} ArtistMemberInfo
 */

let debounceTimer;
let lastSearchValue;
/** @type {ArtistMemberInfo} */
let memberInfo;

$w.onReady(function () {
    $w("#pageTitle").scrollTo();
    showHideItemIcons();
    $w('#dataset').setFilter(artistGalleryDefaultFilter);
});

export function addButton_click(event) {
    const name =  (memberInfo.name || '').trim();
    if (name) {
        const member = memberInfo.member;
        const profilePhoto = member.profile.profilePhoto;
        const artistPhoto = profilePhoto ? profilePhoto.url : defaultArtistImageUrl;
        const toInsert = {
            name,
            email: member.loginEmail || '',
            artistPhoto,
            hidden: true,
        };
        showSpinner({message: 'Creating your gallery'});
        wixData.insert(artistGalleryCollectionName, toInsert).then(
            item => {
                wixLocation.to(item[artistsEditPageLinkField]);
            },
            err => {
                console.error(`Failed trying to insert new artist: ${JSON.stringify(toInsert)}`, err);
                stopSpinner({message: 'Unable to create your gallery', timeout: 3000});
            }
        );
    } else {
        console.error('Cannot insert new artist for a member without a nickname');
    }
}

export function clearSearchButton_click(event) {
    $w('#searchInput').value = '';
    filter('');
}

export function dataset_ready() {
    getArtistMemberInfo().then(mi => {
        memberInfo = mi;
        if (memberInfo.defaultFilter !== artistGalleryDefaultFilter) {
            // reset the filter to the one attached to the Member
            $w('#dataset').setFilter(memberInfo.defaultFilter);
            // Must pretend to trigger search to get updated filter to take effect. Don't know why
            lastSearchValue = undefined; // ensures no match
            searchInput_keyPress(null); 
        } 
        memberInfo.canAdd ? $w('#addButton').expand() : $w('#addButton').collapse();
        filter('');
    });
}

export function searchInput_keyPress(event) {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
    }

    debounceTimer = setTimeout(() => {
    	filter($w("#searchInput").value);
    }, 200);
}

function filter(searchValue) {
    if (lastSearchValue !== searchValue) {
        let dataFilter = memberInfo.defaultFilter;
        if (searchValue) {
            $w("#clearSearchButton").show();
            dataFilter = dataFilter.contains('name', searchValue);
        } else {
            $w("#clearSearchButton").hide();
        }
        $w("#dataset").setFilter(dataFilter)
			.then(_ => {
				const itemCount = $w("#dataset").getTotalCount();
                // console.log(`After filter the count is ${itemCount}`);
                if (itemCount) {
                    $w('#noItemsText').collapse();
                    $w('#artistGalleryRepeater').expand();
                    const pageCount = $w("#dataset").getTotalPageCount();
                    if (pageCount > 1) {
                        $w('#paginationBar').expand();
                        $w('#searchBox').expand(); // show search if there is ever a page count > 1
                    } else {
                        $w('#paginationBar').collapse();
                    }
                } else {
                    noArtists();
                }
			});
        lastSearchValue = searchValue;
    }
}

function noArtists() {
    $w('#paginationBar').collapse(); 
    $w('#noItemsText').expand();
    $w('#artistGalleryRepeater').collapse();
}

function showHideItemIcons() {
    $w('#artistGalleryRepeater').onItemReady(($wInRepeater, itemData) => {
    const {blocked, hidden} = itemData;
    blocked ? $wInRepeater('#blocked').expand() : $wInRepeater('#blocked').collapse() 
    hidden ? $wInRepeater('#hidden').expand() : $wInRepeater('#hidden').collapse() 
  })
}
