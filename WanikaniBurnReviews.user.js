// ==UserScript==
// @name        Wanikani Burn Reviews
// @namespace   wkburnreviewnew
// @description Adds a space on the main page that reviews random burned items. This is a maintained fork of the original script by Samuel Harbord
// @version     2.2.6
// @author      Jonny Dark
// @license     Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0); http://creativecommons.org/licenses/by-nc/4.0/
// @include     http://www.wanikani.com/
// @include     https://www.wanikani.com/
// @include     http://www.wanikani.com/dashboard
// @include     https://www.wanikani.com/dashboard
// @require     https://greasyfork.org/scripts/19781-wanakana/code/WanaKana.js?version=126349
// @grant       none
// @require 		http://code.jquery.com/jquery-1.12.4.min.js

// Use site jquery and other variables
// Todo fix this properly to work with Greasmonkey
try {
    localStorage = unsafeWindow.localStorage;
    window = unsafeWindow;
}
catch {}

// CONSTANTS
var RADICAL   = 0;
var KANJI     = 1;
var VOCAB     = 2;

var UNDEFINED = -1;
var MEANING   = 0;
var READING   = 1;

var DEBUG   = 7;
var WARNING = 8;
var ERROR   = 9;

var LITEBLUE = "#00a0f1";
var PINK     = "#f100a0";
var PURPLE   = "#a000f1";


// Globals....ewww
var BRLoggingEnabled = (localStorage.getItem("BRLoggingEnabled") == "true");

BRData = { radical: [], kanji: [], vocabulary: [] };
BRRef = { radical: [], kanji: [], vocabulary: [] };
BRConfig = { RadicalsEnabled: true, KanjiEnabled: true, VocabEnabled: true };

BRQuestion = {
    Item      : {},
    askingFor : UNDEFINED,
    itemType  : UNDEFINED,
    progress  : 0,
    answered  : false,

    IsRadical : function() { return this.itemType === RADICAL; },
    IsKanji   : function() { return this.itemType === KANJI; },
    IsVocab   : function() { return this.itemType === VOCAB; },

    IsAskingForMeaning: function() { return this.askingFor === MEANING || this.IsRadical(); },
    IsAskingForReading: function() { return this.askingFor === READING; },

    IsAnswered : function() { return this.answered; },
    SetAnswered: function(answered) { this.answered = answered; },

    GetAnswers : function() {
        if (this.IsAskingForMeaning()) {
            return this.Item.meaning;
        }
        else {
            if (BRQuestion.IsKanji()) {
                var importantReading = BRQuestion.Item.important_reading;
                return [importantReading];
            }
            else {
                return [BRQuestion.Item.kana];
            }
        }
    },

    Started    : function() { return this.progress > 0; },
    IsComplete : function() { return (this.IsRadical() && this.Started()) || this.progress >= 2; },
    Restart    : function() { this.progress = 0; },
    Skip       : function() { this.progress = 2; },
    NextPart   : function() {
        this.progress++;
        this.askingFor = this.IsAskingForMeaning() ? READING : MEANING;
    },

    DependingOnTypeUse : function (ifRadical, ifKanji, ifVocab) {
        return this.IsRadical() ? ifRadical : this.IsKanji() ? ifKanji : ifVocab;
    },

    Reset : function() {
        this.askingFor = UNDEFINED;
        this.itemType  = UNDEFINED;
        this.Item      = {};
        this.progress  = 0;
        this.answered  = false;
    }
};

function BRLog(logdata, level) {
    level = (typeof level == "undefined") ? DEBUG : level;
    if (!BRLoggingEnabled && level < WARNING) return;
    if (!console) return;

    var logmethod = console.log.bind(console);
    if (typeof level !== "undefined" && level !== DEBUG) {
        logmethod = (level == WARNING ? console.warn.bind(console) :
            level == ERROR ? console.error.bind(console) :
            logmethod);
    }

    logmethod("WKBurnReview: " + logdata);
    if (typeof logdata != "string") {
        logmethod(logdata);
    }
}

window.BREnableLogging = function() {
    BRLoggingEnabled = true;
    localStorage.setItem("BRLoggingEnabled", true);
};

window.BRDisableLogging = function() {
    BRLoggingEnabled = false;
    localStorage.removeItem("BRLoggingEnabled");
};

function getApiKeyThen(callback) {
    // First check if the API key is in local storage.
    var api_key = localStorage.getItem('apiKey');
    if (typeof api_key === 'string' && api_key.length === 32) {
        return callback(api_key);
    }
    else {
        // We don't have the API key.  Fetch it from the /settings/personal_access_tokens page.
        $.get('https://www.wanikani.com/settings/personal_access_tokens')
            .done(function(page) {
                if (typeof page !== 'string') return callback(null);

                // Extract the API key. (This is pretty hacky)
                api_key = $(page).find("code")[0].firstChild.data;
                if (typeof api_key == 'string' && api_key.length == 36) {
                    // Store the updated user info.
                    localStorage.setItem('apiKey', api_key);
                }
                else {
                    BRLog("Failed to get API key :( instead got: '" + api_key + "'", ERROR);
                }
                return callback(api_key);
            });

    }
}

function addBurnReviewStylesThen(callback) {

    if (stylesAlreadyAdded()) {
        BRLog("Styles already added, don't need to add again");
        return callback();
    }

    BRLog("Getting the review page stylesheet...");
    $.ajax({url:"https://www.wanikani.com/review", dataType:"html"}).done(
        function(data) {
            BRLog("Got the review page document. Extracting styles");
            var parser = new DOMParser();
            var reviewsdoc = parser.parseFromString(data, "text/html");
            var links = reviewsdoc.head.getElementsByTagName("link");
            for (var i = 0; i < links.length; i++)
            {
                var link = links[i];
                if (link.href.endsWith(".css"))
                {
                    BRLog("Adding " + link.outerHTML + " to document head");
                    $("head").append(link);
                }
            }
            appendExternalBurnReviewStylesheetThen(callback);
        });
}

function stylesAlreadyAdded() {
    return $('#burnReviewStyles').length > 0;
}

function appendExternalBurnReviewStylesheetThen(callback) {
    BRLog("Adding additional CSS");
    // TODO - tie query string to release version
    var cssFile = "https://cdn.rawgit.com/jonnydark/wanikani-burn/master/BurnReviews.css?v=2.2";

    $.get(cssFile, function(content) {

        $('head').append('<style id="burnReviewStyles"></style>');
        $('#burnReviewStyles').text(content);

        callback();
    });
}

// This is for dumping CSS that must be present before loading main stylesheet
function appendPriorityCSS() {
    var priorityStyles =
        '<style type="text/css">'                                                                                         +
        '.burn-review-container { float:left;}'                                                                           +
        '#loadingBR { position: relative; background-color: #d4d4d4; margin-top: 0px; padding-top: 42px; height: 99px; }' +
        '#dim-overlay { position: fixed; background-color: black; opacity: 0.75; width: 100%; height: 100%; z-index: 1; margin-top: -122px; padding-bottom: 122px; display: none; }' +
        '</style>';
    $(priorityStyles).appendTo($("head"));
}

function injectWidgetHtmlWrapper() {
    $(".low-percentage.kotoba-table-list.dashboard-sub-section").parent().wrap('<div class="col burn-review-container"></div>');
    $("<br />" + wrapperHTML() + "<!-- span4 -->").insertAfter($(".low-percentage.kotoba-table-list.dashboard-sub-section"));
    setLanguage();
}

function wrapperHTML() {
    var html =
        '<div class="">'                                                                                                    +
        '<section class="burn-reviews kotoba-table-list dashboard-sub-section one-second-transition" style="z-index: 2; position: relative">' +
        '<h3 class="small-caps">'                                                                                                         +
        '<span class="br-en">BURN REVIEWS</span>'                                                                                     +
        '<span class="br-jp">焦げた復習</span>'                                                                                       +
        '</h3>'                                                                                                                           +
        '<div id="loadingBR" align="center" style=""></div>'                                                                              +
        '<div class="see-more" style="margin-top: -1px">'                                                                                 +
        '<a href="javascript:void(0)" id="new-item" class="small-caps">'                                                              +
        '<span class="br-en">NEW ITEM</span>'                                                                                     +
        '<span class="br-jp">新しい項目</span>'                                                                                   +
        '</a>'                                                                                                                        +
        '</div>'                                                                                                                          +
        '</section>'                                                                                                                          +
        '</div>';
    return html;
}

function constructBurnReviewHtml() {

    BRLog("Constructing Burn Review HTML");
    $("#user-response").attr("disabled", false).val("").focus();

    $("body").prepend('<div id="dim-overlay"></div>');
    BRLog("Overlay applied");

    var strReview =
        '<div class="answer-exception-form" id="answer-exception" align="center">'                                                                                                       +
        '<span>Answer goes here</span>'                                                                                                                                              +
        '</div>'                                                                                                                                                                        +
        '<div id="question" class="br-question">'                                                                                                                                       +
        '<div class="item-toggle-buttons">'                                                                                                                                         +
        '<div class="radicals-toggle' + ((BRConfig.RadicalsEnabled) ? ' on' : '') +'">'                                                                                         +
        '<span lang="ja">部</span>'                                                                                                                                         +
        '</div>'                                                                                                                                                                +
        '<div class="kanji-toggle' + ((BRConfig.KanjiEnabled) ? ' on' : '') +'" style="padding-top: 1px">'                                                                      +
        '<span lang="ja">漢</span>'                                                                                                                                         +
        '</div>'                                                                                                                                                                +
        '<div class="vocab-toggle' + ((BRConfig.VocabEnabled) ? ' on' : '') +'">'                                                                                               +
        '<span lang="ja">語</span>'                                                                                                                                         +
        '</div>'                                                                                                                                                                +
        '</div>'                                                                                                                                                                    +
        '<div class="left-side-action-buttons">'                                                                                                                                    +
        '<div class="load-button">'                                                                                                                                             +
        '<span class="br-en" lang="ja">Load</span>'                                                                                                                         +
        '<span class="br-jp" lang="ja">ロード</span>'                                                                                                                       +
        '</div>'                                                                                                                                                                +
        '<div class="start-button-toggle' + ((localStorage.getItem('BRStartButton') !== null) ? ' on' : '') +'">'                                                               +
        '<span lang="ja" class="br-en">Start Button</span>'                                                                                                                 +
        '<span lang="ja" class="br-jp">開始<br />ボタン</span>'                                                                                                             +
        '</div>'                                                                                                                                                                +
        '</div>'                                                                                                                                                                    +
        '<div class="right-side-toggle-buttons">'                                                                                                                                   +
        '<div class="toggle-language-button">'                                                                                                                                  +
        '<span lang="ja" class="br-en">日本語</span>'                                                                                                                       +
        '<span lang="ja" class="br-jp">English</span>'                                                                                                                      +
        '</div>'                                                                                                                                                                +
        '<div class="resize-button">'                                                                                                                                           +
        '<span lang="ja" class="br-en">Resize</span>'                                                                                                                       +
        '<span lang="ja" class="br-jp">拡大する</span>'                                                                                                                     +
        '</div>'                                                                                                                                                                +
        '</div>'                                                                                                                                                                +
        '<div class="review-item-container">'                                                                                                                                   +
        '<span class="review-item" lang="ja">' + BRQuestion.Item.character +'</span>'                                                                                       +
        '</div>'                                                                                                                                                                +
        '<div id="question-type"><h1 id="question-type-text" align="center">' + getReviewTypeText() +'</h1></div>'                                                              +
        '<div id="answer-form" tabindex="10">'                                                                                                                                  +
        '<form onSubmit="return false">'                                                                                                                                    +
        '<fieldset>'                                                                                                                                                    +
        '<input autocapitalize="off" autocomplete="off" autocorrect="off" id="user-response" name="user-response" placeholder="Your Response" type="text"></input>' +
        '<button id="answer-button" type="button"><i class="icon-chevron-right"></i></button>'                                                                      +
        '</fieldset>'                                                                                                                                                   +
        '</form>'                                                                                                                                                           +
        '</div>'                                                                                                                                                                +
        '</div>'                                                                                                                                                                    +
        '</div>';

    BRLog(strReview);
    $(strReview).insertAfter($(".burn-reviews.kotoba-table-list.dashboard-sub-section h3"));
    setLanguage();
}

function rand(low, high) {
    return Math.floor(Math.random()*(high + 1)) + low;
}

function enableKanaInput() {
    if (document.getElementById('user-response')){
        wanakana.bind(document.getElementById('user-response'));
    }
}

function disableKanaInput() {
    if (document.getElementById('user-response')){
        wanakana.unbind(document.getElementById('user-response'));
    }
}

function nextQuestion() {

    BRLog("Getting burn review");

    BRQuestion.NextPart();
    BRQuestion.SetAnswered(false);

    $("#user-response").attr("disabled", false).val("").focus();
    $(".answer-exception-form").css("display", "none");

    if (BRQuestion.IsComplete()) {
        newBRItem();
        updateBRItem(true);
    }

    configureInputForEnglishOrJapanese();
    $("#question-type-text").html(getReviewTypeText());
    setLanguage(); //TODO See if there's a way to bind this to jquery.html();

    document.getElementById('user-response').value = "";
    $("#answer-form fieldset").removeClass("correct").removeClass("incorrect");

}

function getReviewTypeText() {
    var reviewTypeTextEng;
    var reviewTypeTextJp;

    if (BRQuestion.IsAskingForMeaning()) {
        reviewTypeTextEng = "Meaning";
        reviewTypeTextJp  = "意味";
    }
    else {
        if (BRQuestion.Item.important_reading == "onyomi") {
            reviewTypeTextEng = "onyomi";
            reviewTypeTextJp  = "音";
        }
        else {
            reviewTypeTextEng = "kunyomi";
            reviewTypeTextJp  = "訓";
        }
        reviewTypeTextEng += " Reading";
        reviewTypeTextJp  += "読み";
    }
    return '<span class="br-en">' + reviewTypeTextEng + '</span><span class="br-jp">' + reviewTypeTextJp + '</span>';
}

function setLanguage() {
    var langToHide = BRLangJP ? ".br-en" : ".br-jp";
    $(langToHide).addClass("br-hide");
}

function newBRItem() {
    BRLog("Getting new burn item");

    // Need to get a weighted Random
    var itemTypeArray = [];
    if (BRConfig.RadicalsEnabled) {
        itemTypeArray = itemTypeArray.concat(new Array(BRData.radical.length).fill(RADICAL));
    }
    if (BRConfig.KanjiEnabled) {
        itemTypeArray = itemTypeArray.concat(new Array(BRData.kanji.length).fill(KANJI));
    }
    if (BRConfig.VocabEnabled) {
        itemTypeArray = itemTypeArray.concat(new Array(BRData.vocabulary.length).fill(VOCAB));
    }
    BRQuestion.itemType = itemTypeArray[rand(0, itemTypeArray.length)];

    var dataBank = [BRData.radical, BRData.kanji, BRData.vocabulary][BRQuestion.itemType];
    BRQuestion.ItemIndex = rand(0, dataBank.length - 1);

    BRQuestion.Item = dataBank[BRQuestion.ItemIndex];

    BRQuestion.askingFor = BRQuestion.IsRadical() ? MEANING : rand(MEANING, READING);

    BRQuestion.Restart();

    BRLog("Burn item type: " + BRQuestion.itemType);
    BRLog("Burn item: " + BRQuestion.Item);

}

function updateBRItem(updateText) {

    BRLog("Updating Burn review item");
    if (updateText) {
        $(".review-item").html(BRQuestion.Item.character);
        setItemFontSize();
    }

    var bg = BRQuestion.DependingOnTypeUse(LITEBLUE, PINK, PURPLE);
    var bgi = "linear-gradient(to bottom, ";

    bgi += BRQuestion.DependingOnTypeUse("#0af, #0093dd", "#f0a, #dd0093", "#a0f, #9300dd");
    $(".review-item-container").css({"background-color": bg, "background-image": bgi });
}

function setItemFontSize() {
    var itemLength = BRQuestion.Item.character.length;
    var fontSize = 48;
    switch(itemLength) {
        case 1:
        case 2:
        case 3:
            fontSize = 48;
            break;
        case 4:
            fontSize = 38;
            break;
        case 5:
            fontSize = 28;
            break;
        default:
            fontSize = 24;
            break;
    }
    $(".review-item").css("font-size", fontSize + "px");
}

function skipItem() {
    BRQuestion.Skip();
    nextQuestion();
    return false;
}

function displayStartMessage() {
    var text = BRLangJP ? "開始" : "Start";
    $("#loadingBR").html('<a lang="ja" href="javascript:void(0)" style="font-size: 52px; color: #434343; text-decoration: none">' + text + '</a>');
}

function bindStartButtonClickEvent() {
    $("#loadingBR a").click(function() {
        startWaniKaniBurnReviews();
    });
}

function displayLoadingMessage(color, english, japanese) {
    $("#loadingBR").html('<h3 style="color:' + color + '">' + (BRLangJP ? japanese : english)  + '</h3>');
}

function displayRadicalLoadingMessage() {
    displayLoadingMessage(LITEBLUE, "Retrieving radical data...", "部首データを検索中…");
}

function displayKanjiLoadingMessage() {
    displayLoadingMessage(PINK,"Retrieving kanji data...", "漢字データを検索中…");
}

function displayVocabLoadingMessage() {
    displayLoadingMessage(PURPLE,"Retrieving vocabulary data...", "単語データを検索中…");
}


function getRadicalCharacter(radical) {
    return radical.character ? radical.character :
        "<img class=\"radical-question\" src=\"" + radical.image + "\" />";
}

function itemIsBurned(item) {
    return item.user_specific ? item.user_specific.burned : false;
}

function getMeaning(item) {
    var usyn = item.user_specific ? item.user_specific.user_synonyms : null;
    var meaning = item.meaning.split(', ');
    return usyn !== null ? meaning.concat(usyn) : meaning;
}

function radicalMap(radical) {
    return {
        id: radical.id,
        character: radical.data.characters,
        image: (radical.data.character_images.length > 0) ? radical.data.character_images[0].url:null,
        meaning: radical.data.meanings.map(function(meaning){return meaning.meaning}),
    }
}

function kanjiMap(kanji) {
    return {
        id: kanji.id,
        character: kanji.data.characters,
        meaning: kanji.data.meanings.map(function(meaning){return meaning.meaning}),
        onyomi: getKanjiReading(kanji, "onyomi"),
        kunyomi: getKanjiReading(kanji, "kunyomi"),
        important_reading: getKanjiReading(kanji, "primary"),
    }
}

function getKanjiReading(kanji, readingType) {
    var reading;
    if (readingType === "primary"){
        reading = kanji.data.readings.filter(reading => reading.primary);
    }
    else {
        reading = kanji.data.readings.filter(reading => reading.type === readingType);
    }
    if (reading.length > 0) {
        return reading[0]["reading"];
    }
    return null;
}

function vocabularyMap(vocabulary) {
    return {
        id: vocabulary.id,
        character: vocabulary.data.characters,
        meaning: vocabulary.data.meanings.map(function(meaning){return meaning.meaning}),
        kana: vocabulary.data.readings[0]["reading"],
    }
}

function fetchAndCacheBurnedItemsThen(callback, storageKey) {
    var nextUrl = "https://api.wanikani.com/v2/assignments?burned=true";

    while(nextUrl) {
        $.ajax(
            {
                url: nextUrl,
                headers: {
                    "Wanikani-Revision": "20170710",
                    "Authorization": "Bearer " + apiKey,
                },
                dataType:"json",
                async: false,
            }
        ).done(function(response) {
            var burnedItems = response.data;
            burnedItems.forEach(item => {
                BRRef[item.data.subject_type].push(item);
            });
            nextUrl = response.pages.next_url;
        }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
            BRLog("Request to WaniKani API failed (" + nextUrl + ").\nERROR: " +
                errorThrown + "\nCatastrophic failure ermagerd D:", ERROR);
            nextUrl = null;
        });
    }
    fetchAndCacheSubjects("radical", "RADICAL", radicalMap, BRRef["radical"]);
    fetchAndCacheSubjects("kanji", "KANJI", kanjiMap, BRRef["kanji"]);
    fetchAndCacheSubjects("vocabulary", "VOCABULARY", vocabularyMap, BRRef["vocabulary"]);
    localStorage.setItem(storageKey, JSON.stringify(BRData));
    callback();
}

function fetchAndCacheSubjects(type, storageKey, mapFunction, assignment_items) {
    var ids = assignment_items.map(function(item){return item.data.subject_id;});
    var nextUrl = "https://api.wanikani.com/v2/subjects?types=" + type + "&ids=" + ids.join(",");
    var mappedData = [];
    while (nextUrl) {
        $.ajax(
            {
                url:nextUrl,
                headers: {
                    "Wanikani-Revision": "20170710",
                    "Authorization": "Bearer " + apiKey,
                },
                dataType:"json",
                async: false, // Can't be async or the next call will not have a url yet
            }
        ).done(function(response) {
            if (response.data) {
                var data = response.data.map(mapFunction);
                data = data.map(function(data_item) {
                    data_item["assignment"] = assignment_items.filter(item => item.data.subject_id == data_item.id)[0];
                    return data_item;
                });
                mappedData = mappedData.concat(data);
            }
            nextUrl = response.pages.next_url;
        }).fail(function(XMLHttpRequest, textStatus, errorThrown) {
            BRLog("Request to WaniKani API failed (" + nextUrl + ").\nERROR: " +
                errorThrown + "\nCatastrophic failure ermagerd D:", ERROR);
            nextUrl = null;
        });
    }
    BRData[type] = mappedData;
    localStorage.setItem(storageKey, JSON.stringify(mappedData));
}

function maybeGetBurnedItemsThen(callback, storageKey, fetchFunction) {
    var RawBRData = localStorage.getItem(storageKey);
    if (RawBRData !== null) {
        try {
            BRData = JSON.parse(RawBRData);
            if (BRData.length > 0) {
                return callback();
            }
            BRLog("No burned " + type + " in cache. Refectching...", WARNING);
        }
        catch(e) {
            BRLog("Could not parse cached data. Refetching...", WARNING);
        }
    }
    return fetchFunction(callback, storageKey);
}

function getBurnReviewDataThen(callback) {
    BRLog("Getting WaniKana data");

    maybeGetBurnedItemsThen( function() {
        BRLog("Data items { RadicalData: " + BRData.radical.length +
            "; KanjiData: " + BRData.kanji.length +
            "; VocabData: " + BRData.vocabulary.length + "}");
        callback();
    }, "BRDATA", fetchAndCacheBurnedItemsThen);

}

function clearBurnedItemData() {
    localStorage.removeItem("burnedRadicals");
    localStorage.removeItem("burnedKanji");
    localStorage.removeItem("burnedVocab");
    BRData.radical = [];
    BRData.kanji    = [];
    BRData.vocabulary    = [];
}

function confirmResurrection() {
    $(".answer-exception-form").css({"display": "block", "opacity": "0", "-webkit-transform": "translateY(20px)", "-moz-transform": "translateY(20px)"}).removeClass("animated fadeInUp");
    $(".answer-exception-form").addClass("animated fadeInUp");

    var itemTypeForUrl = BRQuestion.DependingOnTypeUse("radicals/", "kanji/", "vocabulary/");
    var resurrectionUrl = "https://www.wanikani.com/assignments/" + BRQuestion.Item.id + "/resurrect";
    var resurrectionLink = '<a id="resurrect_prompt" class="btn btn-mini resurrect-btn" rel="nofollow" data-method="put" href="' + resurrectionUrl + '">';

    var resurrectEng = '<div class="br-en">Are you sure you want to ' + resurrectionLink + 'Resurrect</a> the ' +
        BRQuestion.DependingOnTypeUse("radical", "kanji item", "vocabulary item") + ' "' + BRQuestion.Item.character + '"?</div>';

    var resurrectJp  = '<div class="br-jp">' + BRQuestion.DependingOnTypeUse("部首", "漢字", "単語") + "「" + BRQuestion.Item.character  + "」を" +
        resurrectionLink + '復活</a>する<br />本当によろしいですか？</div>';

    $(".answer-exception-form span").html(resurrectEng + resurrectJp);
    setLanguage();

    document.getElementById("answer-exception").onclick = "return false";
    return false;
}

function initBurnReviews() {

    BRLog("Initialising the Burn Review widget");

    var loadStylesAndConstructWidget = function() {
        useCache = false;
        $("#loadingBR").remove();
        addBurnReviewStylesThen(constructBurnReviewWidget);
    };
    getBurnReviewDataThen(loadStylesAndConstructWidget);

}

function constructBurnReviewWidget() {

    BRLog("Getting new burn review item");
    newBRItem();

    BRLog("Adding burn review section");
    constructBurnReviewHtml();

    $("#answer-button").click(function() {
        submitBRAnswer();
    });
    updateBRItem(false);
    configureInputForEnglishOrJapanese();

    bindMouseClickEvents();

}

function configureInputForEnglishOrJapanese() {
    if (BRQuestion.IsAskingForMeaning()) {
        disableKanaInput();
        $("#user-response").removeAttr("lang").attr("placeholder","Your Response");
        $("#question-type").addClass("meaning");
        $("#question-type").removeClass("reading");
    } else {
        enableKanaInput();
        $("#user-response").attr({lang:"ja",placeholder:"答え"});
        $("#question-type").addClass("reading");
        $("#question-type").removeClass("meaning");
    }
}

function bindMouseClickEvents() {

    bindQuestionTypeToggleButtonClickEvents();

    bindLoadButtonClickEvent();

    bindStartButtonToggleButtonClickEvent();

    bindLanguageToggleButtonClickEvent();

    bindResizeButtonClickEvent();

    bindDimOverlayClickEvent();

    bindNewItemButtonClickEvent();
}

function bindNewItemButtonClickEvent() {
    document.getElementById("new-item").onclick = skipItem;
}

function bindLanguageToggleButtonClickEvent() {
    $('.toggle-language-button').click(function() {
        switchBRLang();
    });
}

function resizeWidget() {
    if (!resizeWidget.complete) return;

    resizeWidget.complete = false;
    $('.resize-button').toggleClass("on");
    $(".burn-reviews.kotoba-table-list.dashboard-sub-section").toggleClass("scale-up");
    $("#dim-overlay").fadeToggle({
        duration: 1000,
        complete: function() { resizeWidget.complete = true; }
    });
}
resizeWidget.complete = true;

function bindResizeButtonClickEvent() {
    $('.resize-button').click(function() {
        resizeWidget();
    });
}

function bindDimOverlayClickEvent() {
    $("#dim-overlay").click(function () {
        $('.resize-button').trigger("click");
    });
}


function bindLoadButtonClickEvent() {
    $(".load-button").click(function() {
        $("#dim-overlay").remove();
        $(".burn-reviews").parent().remove();
        BRQuestion.Reset();
        queueBRAnim = false;
        allowQueueBRAnim = true;
        injectWidgetHtmlWrapper();
        displayStartMessage();
        clearBurnedItemData();
        initBurnReviews();
    });
}

function bindStartButtonToggleButtonClickEvent() {
    $(".start-button-toggle").click(function() {
        $(this).toggleClass("on");
        if ($(this).hasClass("on")) {
            localStorage.setItem("BRStartButton", true);
        }
        else {
            localStorage.removeItem("BRStartButton");
        }
    });
}

function bindQuestionTypeToggleButtonClickEvents() {
    bindRadicalsToggleButtonClickEvent();
    bindKanjiToggleButtonClickEvent();
    bindVocabToggleButtonClickEvent();
}

function bindVocabToggleButtonClickEvent() {
    bindItemToggleButtonClickEvent('.vocab-toggle', "BRVocabEnabled", "VocabEnabled", BRQuestion.IsVocab.bind(BRQuestion));
}

function bindKanjiToggleButtonClickEvent() {
    bindItemToggleButtonClickEvent('.kanji-toggle', "BRKanjiEnabled", "KanjiEnabled", BRQuestion.IsKanji.bind(BRQuestion));
}

function bindRadicalsToggleButtonClickEvent() {
    bindItemToggleButtonClickEvent('.radicals-toggle', "BRRadicalsEnabled", "RadicalsEnabled", BRQuestion.IsRadical.bind(BRQuestion));
}

function bindItemToggleButtonClickEvent(cssClass, storageKey, configKey, currentQuestionIsType) {
    $('.item-toggle-buttons ' + cssClass).click(function() {
        if ($(this).hasClass("on")) {
            // Don't let last button be disabled
            if ($('.item-toggle-buttons .on').length == 1) return;

            localStorage.setItem(storageKey, false);
            BRConfig[configKey] = false;
            if (currentQuestionIsType()) {
                skipItem();
            }
        }
        else {
            localStorage.removeItem(storageKey);
            BRConfig[configKey] = true;
        }
        $(this).toggleClass("on");
    });
}

function switchBRLang() {
    if (!BRLangJP) {
        localStorage.setItem("BRLangJP", true);
    }
    else {
        localStorage.removeItem("BRLangJP");
    }
    BRLangJP = !BRLangJP;

    $('.br-en,.br-jp').toggleClass('br-hide');
}

function checkBurnReviewAnswer() {
    BRLog("Checking answer");
    var response = $("#user-response").val().trim();
    response = BRQuestion.IsAskingForReading() ? addTerminalN(response) : response;
    var answers = BRQuestion.GetAnswers();
    var answerIsCorrect = isAnswerCorrect(response, answers);

    $("#answer-form").focus(); // fix for FF to stop focus being trapped
    $("#user-response").attr("disabled", true);

    if (responseIsValid(response)) {
        if (isIncorrectReading(response, answerIsCorrect)) {
            shakeAnswerForm();
            displayIncorrectReadingMessage();
            $("#user-response").attr("disabled", false).focus();
        }
        else {
            if (answerIsCorrect) {
                onCorrectAnswer(response);
            } else {
                onIncorrectAnswer(response);
            }
            BRQuestion.SetAnswered(true);
        }
    } else {
        shakeAnswerForm();
        $("#user-response").attr("disabled", false).focus();
    }
}

function addTerminalN(str = '') {
    return /n/i.test(str.slice(-1)) ? `${str.slice(0, -1)}ん` : str;
}

function isAnswerCorrect(response, answers) {
    for (var a = 0; a < answers.length; a++) {
        if (response.toLocaleLowerCase() === answers[a].toLocaleLowerCase()) {
            return true;
        }
    }
    return false;
}

function shakeAnswerForm() {
    $('#answer-form').addClass('shake')
        .delay(1000)
        .queue(function(next) {
            $(this).removeClass('shake');
            next();
        });
}

function setInputValue(text) {
    $("#user-response").val(text);
}

function onCorrectAnswer(answer) {
    $("#answer-form fieldset").removeClass("incorrect").addClass("correct");
    setInputValue(answer);
}

function onIncorrectAnswer(answer) {
    $("#answer-form fieldset").removeClass("correct").addClass("incorrect");
    setInputValue(answer);
    displayIncorrectAnswerMessage();
}

function responseIsValid(response) {
    return ((BRQuestion.IsAskingForMeaning() && isAsciiPresent(response)) ||
        (!isAsciiPresent(response) && BRQuestion.IsAskingForReading())) && response !== "";
}

function displayIncorrectAnswerMessage() {
    // concat in to string of comma-separated answers
    var answerList = BRQuestion.GetAnswers();//.join(", ");
    var resurrectButton = '<a href="#" class="btn btn-mini resurrect-btn">';

    var answerTextEng = '<div class="br-en">The answer was:<br />"' + answerList + '"<br />' + resurrectButton + 'Resurrect</a> this item?</div>';
    var answerTextJp  = '<div class="br-jp">解答は<br />「' + answerList + '」であった。<br />この項目を' + resurrectButton + '復活</a>したいか？</div>';
    $('.answer-exception-form span').html(answerTextEng + answerTextJp);
    setLanguage();

    $(".answer-exception-form").css({"display": "block"}).addClass("animated fadeInUp");
    $('.resurrect-btn').on('click', confirmResurrection);
}

function isIncorrectReading(response, answerIsCorrect) {
    return (!answerIsCorrect && BRQuestion.IsKanji() && BRQuestion.IsAskingForReading() && ((BRQuestion.Item.important_reading == "onyomi" &&
        compareKunyomiReading(response, BRQuestion.Item.kunyomi)) || (BRQuestion.Item.important_reading == "kunyomi" && response == BRQuestion.Item.onyomi)));
}

function displayIncorrectReadingMessage() {
    var incorrectReadingText = '<div class="br-en">Oops! You entered the wrong reading.</div>' +
        '<div class="br-jp">おっと、異なる読みを入力してしまった。</div>';
    $(".answer-exception-form span").html(incorrectReadingText);
    setLanguage();

    $(".answer-exception-form").css({"display": "block"}).addClass("animated fadeInUp").delay(5000).queue(function(){
        $(this).addClass("fadeOut").dequeue().delay(800).queue(function(){
            $(this).removeClass("fadeOut").css("display", "none").dequeue();
        });
    });
}

function compareKunyomiReading(input, reading) {
    return (input == reading || input == reading.toString().substring(0, reading.indexOf(".")) || input == reading.toString().replace("*", input.substring(reading.indexOf(".") + 1)).replace(".", ""));
}

function submitBRAnswer() {
    if (!BRQuestion.IsAnswered()) {
        checkBurnReviewAnswer();
    }
    else {
        nextQuestion();
    }
}

function isAsciiPresent(e){
    return (BRQuestion.IsAskingForMeaning()) ? !/[^a-z \-0-9]/i.test(e) : /[^ぁ-ー0-9 ]/.test(e);
}

function startWaniKaniBurnReviews() {
    if (!useCache) {
        clearBurnedItemData();
    }
    BRLog("Loading...");

    var checkReady = setInterval(function() {
        BRLog("Checking for wanakana...");
        if (wanakana !== undefined) {
            clearInterval(checkReady);
            initBurnReviews();
        }
    }, 250);
}

function pageIsDashboard() {
    return $('title').text().search("Dashboard") > 0;
}

function main() {

    if (!pageIsDashboard()) {
        BRLog("Script not running on dashboard, exiting...");
        return;
    }


    getApiKeyThen(function(key) {

        if (key === null) {
            BRLog("Couldn't fetch API key. It's all gone Pete Tong. Cannot continue ;__;", ERROR);
            return;
        }

        apiKey = key; //global
        BRLog("Running!");

        useCache            =  !(localStorage.getItem("burnedRadicals") === null || localStorage.getItem("burnedKanji") === null || localStorage.getItem("burnedVocab") === null);
        BRIsChrome          =  (navigator.userAgent.toLowerCase().indexOf('chrome') > -1);
        BRQuestion.Reset();
        queueBRAnim              =  false;
        allowQueueBRAnim         =  true;
        BRLangJP                 =  (localStorage.getItem("BRLangJP") == "true");
        BRConfig.RadicalsEnabled =  (localStorage.getItem("BRRadicalsEnabled") != "false");
        BRConfig.KanjiEnabled    =  (localStorage.getItem("BRKanjiEnabled") != "false");
        BRConfig.VocabEnabled    =  (localStorage.getItem("BRVocabEnabled") != "false");


        String.prototype.trim = function() {
            return(this.replace(/^ +/,'').replace(/ +$/,''));
        };

        appendPriorityCSS();
        injectWidgetHtmlWrapper();

        displayStartMessage();
        bindStartButtonClickEvent();

        function submitOnEnterPress(event) {
            const isEnterKey = event.keyCode == 13;
            const isNotWkSearchInput = !event.target.matches('#query.search-query');
            if(isNotWkSearchInput && isEnterKey) {
                BRLog("User pressed Enter");
                submitBRAnswer();
            }
        }

        $(document).unbind('keypress', submitOnEnterPress).bind('keypress', submitOnEnterPress);

        if (localStorage.getItem("BRStartButton") === null)
        {
            startWaniKaniBurnReviews();
        }
    });
}

if (document.readyState === 'complete')
    main();
else
    window.addEventListener("load", main, false);

// ==/UserScript==
