waitTime = 1500;
pollTime = 500;

var iframeId = 'collaborateSidebar';
var root, _user, _uid, _token, curApp;

Firebase.enableLogging();
root = new Firebase('https://groupwork.firebaseio.com/');

//set up listerners for the url changing
lastlocation = "";
function hrefchange() {
    if (window.location.href != lastlocation) {
        lastlocation = window.location.href;

        //loginWebsite
        if (lastlocation.indexOf("https://groupwork.firebaseapp.com/") === 0)
            setTimeout(function() {onLoginSite()}, waitTime);

        //rest of the websites need auth beforehand
        else if (_user !== undefined) {
            
            if (lastlocation.indexOf("https://www.facebook.com/groups") === 0)
                setTimeout(function() {onFbGroup()}, waitTime);

            else if (window.location.href.indexOf("https://www.dropbox.com/") === 0)
                setTimeout(function() {onDbGroup()}, waitTime);

            else if (window.location.href.indexOf("https://github.com/") === 0)
                setTimeout(function() {onGhGroup()}, waitTime);

            else (removeSidebar());

        } else lastlocation = "";
    }
    setTimeout(function() {hrefchange()}, pollTime);
}; 
hrefchange();

//get our keys from the storage, super unsecure >.<
chrome.storage.sync.get(['collaborateFirebaseKey','collaborateUID'], function(items) {
    if (items.collaborateFirebaseKey !== undefined) _token = items.collaborateFirebaseKey;
    if (items.collaborateUID !== undefined) _uid = items.collaborateUID;
    
    if (_uid === undefined || _token === undefined) {
        chrome.storage.onChanged.addListener(function(changes, area) {
            if (area === "sync") {
                if (changes.collaborateFirebaseKey !== undefined) {
                    _token = changes.collaborateFirebaseKey.newValue;
                    authenticate();
                } if (changes.collaborateUID !== undefined) {
                    _uid = changes.collaborateUID.newValue;
                    authenticate();
                }
            }
        });
    } else authenticate()
})

//authenticate on firebase
function authenticate() {
    if (_token === undefined || _uid === undefined) return;
    root.auth(_token, function(){
        root.child('users').child(_uid).on('value', function(data) {
            _user = data.val();
        })
    })
}

//grab the keys and put em into storage
function onLoginSite() {
    $('.custom').prop('disabled', true).text('Extention Installed');
    
    if ($('.customFB').text() !== 'Signed In') {
        $('.customFB').prop('disabled', false);
        
        //set up an observer for when they sign in
        var observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'firebaseToken') {
                //let the firebase key be stored for data retrival
                chrome.storage.sync.set({
                    'collaborateFirebaseKey': $('.customFB').attr('firebaseToken'),
                    'collaborateUID': $('.customFB').attr('uid')
                });
                observer.disconnect();
            }
          });    
        });
        observer.observe(document.querySelector('.customFB'), {attributes: true}); 
    } else {
        //let the firebase key be stored for data retrival
        chrome.storage.sync.set({
            'collaborateFirebaseKey': $('.customFB').attr('firebaseToken'),
            'collaborateUID': $('.customFB').attr('uid')
        });
    }
}

//find which group im in and render the sidebar
function onFbGroup() {
    curApp = 'fb';
    groupID = $($('[tabindex=1]').children()[1]).attr('data-uid');

    if (groupID === undefined)
        return setTimeout(function() {onFbGroup()}, waitTime);

    makeSidebar(groupID);
}

function onDbGroup() {
    curApp = 'db';
    if (window.location.href.indexOf("https://www.dropbox.com/sh") === 0) {
        root.child('externalURL').child(curApp).child(window.location.pathname.split('/')[2]).once('value', function(data) {
            groupID = data.val();
            if (groupID != null) return makeSidebar(groupID, null, null, window.location.href);
            else return makeSidebar(null, "choose a group to share this folder with", true, window.location.href);
        });
    } else if ($('#global_token_share_button').length > 0) {
        $('#global_token_share_button').get(0).click();     
        function hammerShare() {
            if ($('[name="shmodel_path"]').length > 0) {
                sharePath = $('[name="shmodel_path"]').val();
                shareUrl = "https://www.dropbox.com" + sharePath;
                $('#share-link-modal').find('.db-modal-x').get(0).click();
                root.child('externalURL').child(curApp).child(sharePath.split('/')[2]).once('value', function(data) {
                    groupID = data.val();
                    if (groupID != null) return makeSidebar(groupID, null, null);
                    else return makeSidebar(null, "choose a group to share this folder with", true, shareUrl);
                });
            } else {setTimeout(function() {hammerShare()},200)};
        } hammerShare();
    } else return makeSidebar(null, "please navigate to a shareable dropbox folder", false, null);
}

function onGhGroup() {
    curApp = 'gh';
    if (window.location.href.indexOf("https://github.com/orgs") === 0) {
        root.child('externalURL').child(curApp).child(window.location.pathname.split('/')[2]).once('value', function(data) {
            groupID = data.val();
            if (groupID != null) return makeSidebar(groupID, null, null, window.location.href);
            else return makeSidebar(null, "Which facebook group does this Org Belong to?", true, window.location.href);
        });
    } else return makeSidebar(null, "Only github org pages are currently supported", false, null);
}

//set up the sidebar
function makeSidebar(groupID, infoText, allowShare, shareUrl) {

    if ($('#'+iframeId).length) $('#'+iframeId).width(50);
    else {
        //height of top bar, or width in your case
        var width = '50px';

        //resolve html tag, which is more dominant than <body>
        var html;
        if (document.documentElement) {html = $(document.documentElement); //just drop $ wrapper if no jQuery
        } else if (document.getElementsByTagName('html') && document.getElementsByTagName('html')[0]) {
            html = $(document.getElementsByTagName('html')[0]);
        } else if ($('html').length > -1) {html = $('html');
        } else {throw 'no html tag retrieved. wtf?';}

        //position
        if (html.css('position') === 'static') {html.css('position', 'relative');}

        //left offset
        var currentLeft = html.css('top');
        if (currentLeft === 'auto') {currentLeft = 0;} else {
          currentLeft = parseFloat($('html').css('left'));
        }
        html.css('left', currentLeft + parseFloat(width) + 'px');

        if (document.getElementById(iframeId)) {
          $(document.getElementById(iframeId)).remove();
        }
        
        html.append(
          '<iframe id="'+iframeId+'" scrolling="no" frameborder="0" allowtransparency="true" '+
            'style="position: fixed; height: 100%;border:none;z-index: 2147483647; top: 0px;'+
                   'width: '+width+';right: 0px;left: 0px; transition: width 1s ease 0;box-shadow: 2px 2px 10px 1px black;">'+
          '</iframe>'
        );

        $('#'+iframeId).contents().find('body').html(
          '<style type="text/css">\
            html {background-color: rgba(52, 73, 94, 0.96)}\
            html,body {width: 100%;height:100%;\
              z-index: 2147483647;\
              margin: 0;\
            }\
            .bar {margin:0; padding:0; height: 100%; width: 50px; right: 0; position: absolute; list-style-type: none; box-shadow: 0px 2px 10px 1px black;}\
            .list {margin:0; padding:0; height: 100%; width: 200px; position: absolute; right: 50px; list-style-type: none; overflow: scroll;}\
            li {padding: 1.5px 8px; margin-bottom: 20px;}\
            .bar li img {width: 35px; height: 35px; cursor: pointer; -webkit-filter: drop-shadow(1px 1px 1px black); opacity: 0.2}\
            .bar li.alive img {opacity: 0.6;}\
            .bar li img:hover {opacity: 0.8;}\
            .bar li.menu {background-color: rgba(52, 73, 94, 1)}\
            .bar li.menu img {opacity: 1}\
            .bar li img.curApp {opacity: 1; cursor: default;}\
            .list li.current {cursor: default; color: white; background-color: rgba(52, 73, 94, 1); font-weight: 500; border-bottom: 1px solid black; border-top: 1px solid black;}\
            .list li {cursor: pointer; color: rgba(255,255,255,0.70);font-family: "Helvetica Neue",Helvetica,Arial,sans-serif;padding: 10px;margin: 0;font-size: 13px;font-weight: 200;text-transform: uppercase;cursor: pointer;border-bottom: 1px solid rgba(0,0,0,0.15);}\
            .list li:hover {color: white; background-color: rgba(52, 73, 94, 1);}\
            .list li.instructions {cursor: default; color: white; background-color: rgba(52, 73, 94, 1); font-weight: 500; border-bottom: 1px solid black; border-top: 1px solid black; position: fixed; width: 180px; font-size: medium; box-shadow: -7px 3px 15px 3px black;}\
          </style><ul class="list"></ul><ul class="bar"></ul>');

        $('#'+iframeId).contents().find('ul.bar').html(
            '<li id="menuLogo" class="menu"><img src="'+chrome.extension.getURL('src/img/menuLogo.png')+'"/>\
            <li id="fbLogo"><img src="'+chrome.extension.getURL('src/img/fbLogo.png')+'"/>\
            <li id="dbLogo"><img src="'+chrome.extension.getURL('src/img/dbLogo.png')+'"/>\
            <li id="ghLogo"><img src="'+chrome.extension.getURL('src/img/ghLogo.png')+'"/>'
        ).on('click', '#menuLogo', function() {$('#'+iframeId).width(300 - $('#'+iframeId).width());}
        ).on('click', '#fbLogo,#dbLogo,#ghLogo', function() {
            if ($(this).attr('goTo') !== undefined) window.location = $(this).attr('goTo');
        });

        $('#'+iframeId).contents().find('#fbLogo').attr('goTo', "https://www.facebook.com");
        $('#'+iframeId).contents().find('#dbLogo').attr('goTo', "https://www.dropbox.com");
        $('#'+iframeId).contents().find('#ghLogo').attr('goTo', "https://github.com");
    }

    $('#'+iframeId).contents().find('ul.bar').off('click', ('#' + curApp + 'Logo')).find('#' + curApp + 'Logo img').addClass('curApp');

    if (groupID) {
        root.child('groups').child(groupID).on('value', function(group) {
            $('#'+iframeId).contents().find('#fbLogo').attr('goTo', (group.val().fbUrl || "https://www.facebook.com"))
            $('#'+iframeId).contents().find('#dbLogo').attr('goTo', (group.val().dbUrl || "https://www.dropbox.com"))
            $('#'+iframeId).contents().find('#ghLogo').attr('goTo', (group.val().ghUrl || "https://github.com"))

            if (group.val().fbUrl !== undefined) $('#'+iframeId).contents().find('#fbLogo').addClass('alive');
            if (group.val().dbUrl !== undefined) $('#'+iframeId).contents().find('#dbLogo').addClass('alive');
            if (group.val().ghUrl !== undefined) $('#'+iframeId).contents().find('#ghLogo').addClass('alive');            

            root.child('users').child(_uid).child('groups').on('value', function(group) {
                $('#'+iframeId).contents().find('ul.list').html(makeListHtml(group.val(), groupID)).on('click', 'li', function() {
                    root.child('groups').child($(this).attr('data')).once('value', function(newGroup) {
                        if (newGroup.val()[curApp + 'Url'] !== undefined) window.location = newGroup.val()[curApp + 'Url'];
                        else window.location = newGroup.val()['fbUrl'];
                    });
                }).find('.current').prependTo($('#'+iframeId).contents().find('ul.list'));
            });
        })
    } else if (allowShare === false) {
        $('#'+iframeId).contents().find('ul.list').html(makeListHtml({}, undefined)).find('.instructions').text(infoText);
    } else {
        root.child('users').child(_uid).child('groups').on('value', function(group) {
            $('#'+iframeId).contents().find('ul.list').html(makeListHtml(group.val(), undefined)).on('click', 'li', function() {
                console.log(shareUrl);
                if (shareUrl === null || shareUrl === undefined) return;
                root.child('groups').child($(this).attr('data')).child(curApp + 'Url').set(shareUrl);
                var temp = document.createElement('a'); temp.href = shareUrl;
                root.child('externalURL').child(curApp).child(temp.pathname.split('/')[2]).set($(this).attr('data'));
                window.location = shareUrl;
            }).find('.instructions').text(infoText);
        });
    }
}

function removeSidebar() {
    if ($('#'+iframeId).length) $('#'+iframeId).width(0);
}

function makeListHtml(list, current) {
    console.log(list);
    html = ((current !== undefined)? '' : '<li class="instructions"><li style="height:50px">');
    for (item in list)
        html += '<li data="' + item + '"' + ((item === current)? 'class="current" ' : '') + '>' + list[item];
    return html;
}