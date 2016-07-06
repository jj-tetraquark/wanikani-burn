// ==UserScript==
// @name        Wanikani Burn Reviews
// @namespace   wkburnreviewnew
// @description Adds a space on the main page that reviews random burned items. This is a maintained fork of the original script by Samuel Harbord
// @exclude		*.wanikani.com
// @include     *.wanikani.com/dashboard*
// @version     2.1.2
// @author      Jonny Dark
// @grant       none

/* This script is licensed under the Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) license
*  Details: http://creativecommons.org/licenses/by-nc/4.0/ */


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

BRData = { Radicals: [], Kanji: [], Vocab: [] };
BRConfig = { RadicalsEnabled: true, KanjiEnabled: true, VocabEnabled: true };

// TODO - Should be able to make this non global and constructed via a function
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
            //TODO - user synonyms should be concatenated at fetch time
            return (this.Item.usyn !== null) ? this.Item.meaning.concat(this.Item.usyn) : this.Item.meaning;
        }
        else {
            if (BRQuestion.IsKanji()) {
                var importantReading = BRQuestion.Item.important_reading;
                return BRQuestion.Item[importantReading];
            }
            else {
                return BRQuestion.Item.kana;
            }
        }
    },

    Started    : function() { return this.progress > 0; },
    IsComplete : function() { return (this.IsRadical() && this.Started()) || this.progress === 2; },
    Restart    : function() { this.progress = 0; },
    Skip       : function() { this.progress = 2; },
    NextPart   : function() {
        this.progress++;
        this.askingFor = this.IsAskingForMeaning() ? READING : MEANING;
    },

    DependingOnTypeUse : function (ifRadical, ifKanji, ifVocab) {
        return this.IsRadical() ? ifRadical : this.IsKanji() ? ifKanji : ifVocab;
    },

    //TODO - This method can probably be removed if I can stop this from being global
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

function importWanaKana() {
    $("head").append('<script src="https://rawgit.com/WaniKani/WanaKana/master/lib/wanakana.min.js" type="text/javascript"></script>');
}

function getApiKeyThen(callback) {

    // First check if the API key is in local storage.
    var api_key = localStorage.getItem('apiKey');
    if (typeof api_key !== 'string' || api_key.length !== 32) {

        // We don't have the API key.  Fetch it from the /account page.
        console.log('Fetching api_key');
        $.get('/account')
            .done(function(page) {
                if (typeof page !== 'string') return callback(null);

                // Extract the API key.
                api_key = $(page).find('#api-button').parent().find('input').attr('value');
                if (typeof api_key == 'string' && api_key.length == 32) {
                    // Store the updated user info.
                    localStorage.setItem('apiKey', api_key);
                }
            });
    }
    return callback(api_key);
}

function addBurnReviewStylesThen(callback) {
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
                if (link.type == "text/css")
                {
                    BRLog("Adding " + link.outerHTML + " to document head");
                    $("head").append(link);
                }
            }
            appendAdditionalCSS();
            callback();
        });
}

function appendAdditionalCSS() {
    BRLog("Adding additional CSS");
    $(getHackyCSS()).appendTo($("head"));
    $(getBurnReviewStylesheet()).appendTo($("head"));
}

// This is for dumping CSS that hasn't made it in to the main file yet
function getHackyCSS() {
    var strFadeIn =
    "<style type=\"text/css\">" +
    "</style>";
    return strFadeIn;
}

function getBurnReviewStylesheet() {
    // TODO - add a version query string to help prevent caching
    var cssFile = "https://rawgit.com/jonnydark/wanikani-burn/unstable/BurnReviews.css"; //TODO - remember to update this when you merge to master
    return '<link rel="stylesheet" type="text/css" href="' + cssFile + '">';
}

function injectWidgetHtmlWrapper() {
        $(".low-percentage.kotoba-table-list.dashboard-sub-section").parent().wrap('<div class="col" style="float: left"></div>');
        $("<br />" + getSection() + "<!-- span4 -->").insertAfter($(".low-percentage.kotoba-table-list.dashboard-sub-section").parent());
        setLanguage();
}

function getSection() {
    var strSection =
        '<div class="span4">'                                                                                                                                       +
            '<section class="burn-reviews kotoba-table-list dashboard-sub-section" style="z-index: 2; position: relative">'                                         +
                '<h3 class="small-caps">'                                                                                                                           +
                    '<span class="br-en">BURN REVIEWS</span>'                                                                                                       +
                    '<span class="br-jp">焦げた復習</span>'                                                                                                         +
                '</h3>'                                                                                                                                             +
                '<div id="loadingBR" align="center" style="position: relative; background-color: #d4d4d4; margin-top: 0px; padding-top: 42px; height: 99px"></div>' +
                '<div class="see-more" style="margin-top: -1px">'                                                                                                   +
                    '<a href="javascript:void(0)" id="new-item" class="small-caps">'                                                                                +
                        '<span class="br-en">NEW ITEM</span>'                                                                                                       +
                        '<span class="br-jp">新しい項目</span>'                                                                                                     +
                    '</a>'                                                                                                                                          +
                '</div>'                                                                                                                                            +
            '</section>'                                                                                                                                            +
        '</div>';
    return strSection;
}

function constructBurnReviewHtml() {

    BRLog("Constructing Burn Review HTML");
    $("#user-response").attr("disabled", false).val("").focus();

    $("body").prepend('<div id="dim-overlay" style="position: fixed; background-color: black; opacity: 0.75; width: 100%; height: 100%; z-index: 1; margin-top: -122px; padding-bottom: 122px; display: none"></div>');
    BRLog("Overlay applied");

    //TODO - Strip out the inline css - should be able to put everything together in one generated stylesheet. Inline CSS is for styles that change.
    var strReview =
       '<div class="answer-exception-form" id="answer-exception" align="center">'                                                                                                                                                +
           '<span>Answer goes here</span>'                                                                                                                                                                                       +
        '</div>'                                                                                                                                                                                                                 +
        '<div id="br-question">'                                                                                                                                                                                                 +
            '<div class="item-toggle-buttons">'                                                                                                                                                                                  +
                '<div class="brbir' + ((BRConfig.RadicalsEnabled) ? ' on' : '') +'">'                                                                                                                                            +
                    '<span lang="ja">部</span>'                                                                                                                                                                                  +
                '</div>'                                                                                                                                                                                                         +
                '<div class="brbik' + ((BRConfig.KanjiEnabled) ? ' on' : '') +'" style="padding-top: 1px !important">'                                                                                                           +
                    '<span lang="ja">漢</span>'                                                                                                                                                                                  +
                '</div>'                                                                                                                                                                                                         +
                '<div class="brbiv' + ((BRConfig.VocabEnabled) ? ' on' : '') +'">'                                                                                                                                               +
                    '<span lang="ja">語</span>'                                                                                                                                                                                  +
                '</div>'                                                                                                                                                                                                         +
            '</div>'                                                                                                                                                                                                             +
            '<div class="left-side-action-buttons" margin-top: 70px; z-index: 11">'                                                                                                                                              +
                '<div class="brbsl">'                                                                                                                                                                                            +
                    '<span class="br-en" lang="ja">Load</span>'                                                                                                                                                                  +
                    '<span class="br-jp" lang="ja">ロード</span>'                                                                                                                                                                +
                '</div>'                                                                                                                                                                                                         +
                '<div class="brbss' + ((localStorage.getItem('BRStartButton') !== null) ? ' on' : '') +'">'                                                                                                                      +
                    '<span lang="ja" class="br-en">Start Button</span>'                                                                                                                                                          +
                    '<span lang="ja" class="br-jp">開始<br />ボタン</span>'                                                                                                                                                      +
                '</div>'                                                                                                                                                                                                         +
            '</div>'                                                                                                                                                                                                             +
            '<div class="right-side-toggle-buttons">'                                                                                                                                                                            +
                '<div class="toggle-language-button">'                                                                                                                                                                           +
                    '<span lang="ja" class="br-en">日本語</span>'                                                                                                                                                                +
                    '<span lang="ja" class="br-jp">English</span>'                                                                                                                                                               +
                '</div>'                                                                                                                                                                                                         +
                '<div class="resize-button">'                                                                                                                                                                                    +
                    '<span lang="ja" class="br-en" style="margin-top: 3px; font-size: inherit">Resize</span>'                                                                                                                    +
                    '<span lang="ja" class="br-jp" style="margin-top: 4px; font-size: 10px">拡大する</span>'                                                                                                                     +
                '</div>'                                                                                                                                                                                                         +
                '</div>'                                                                                                                                                                                                         +
                '<div class="brk">' /*TODO - Rename this class */                                                                                                                                                                +
                    '<span class="bri" lang="ja">' + BRQuestion.Item.character +'</span>'  /*TODO - Rename this class too */                                                                                                     +
                '</div>'                                                                                                                                                                                                         +
                '<div id="question-type"><h1 id="question-type-text" align="center">' + getReviewTypeText() +'</h1></div>'                                                                                                       +
                '<div id="answer-form">'                                                                                                                                                                                         +
                    '<form onSubmit="return false">'                                                                                                                                                                             +
                        '<fieldset style="padding: 0px 0px 0px 0px; margin: 0px 0px 0px 0px">'                                                                                                                                   +
                            '<input autocapitalize="off" autocomplete="off" autocorrect="off" id="user-response" name="user-response" placeholder="Your Response" type="text" style="height: 35px; margin-bottom: 0px"></input>' +
                            '<button id="answer-button" style="width: 0px; height: 34px; padding: 0px 20px 0px 5px; top: 0px; right: 0px" ><i class="icon-chevron-right"></i></button>'                                          +
                        '</fieldset>'                                                                                                                                                                                            +
                    '</form>'                                                                                                                                                                                                    +
                '</div>'                                                                                                                                                                                                         +
            '</div>'                                                                                                                                                                                                             +
        '</div>';

    BRLog(strReview);
    $(strReview).insertAfter($(".burn-reviews.kotoba-table-list.dashboard-sub-section h3"));
    setLanguage();
}

function rand(low, high) {
    return Math.floor(Math.random()*(high + 1)) + low;
}

function enableKanaInput() {
    wanakana.bind(document.getElementById('user-response'));
}

function disableKanaInput() {
    wanakana.unbind(document.getElementById('user-response'));
}

function newQuestion() {

    BRLog("Getting burn review");

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
        itemTypeArray = itemTypeArray.concat(new Array(BRData.Radicals.length).fill(RADICAL));
    }
    if (BRConfig.KanjiEnabled) {
        itemTypeArray = itemTypeArray.concat(new Array(BRData.Kanji.length).fill(KANJI));
    }
    if (BRConfig.VocabEnabled) {
        itemTypeArray = itemTypeArray.concat(new Array(BRData.Vocab.length).fill(VOCAB));
    }
    BRQuestion.itemType = itemTypeArray[rand(0, itemTypeArray.length)];

    var dataBank = [BRData.Radicals, BRData.Kanji, BRData.Vocab][BRQuestion.itemType];
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
        $(".bri").html(BRQuestion.Item.character);
        setItemFontSize();
    }

    // TODO - this should probably done just with adding and removing classes
    var bg = BRQuestion.DependingOnTypeUse(LITEBLUE, PINK, PURPLE);
    var bgi = "linear-gradient(to bottom, ";

    bgi += BRQuestion.DependingOnTypeUse("#0af, #0093dd", "#f0a, #dd0093", "#a0f, #9300dd");
    $(".brk").css({"background-color": bg, "background-image": bgi });
}

function setItemFontSize() {
    var itemLength = BRQuestion.Item.character.length;
    var fontSize = 48;
    switch(itemLength) {
        case 4:
            fontSize = 38;
            break;
        case 5:
            fontSize = 28;
            break;
        case 6:
            fontSize = 24;
            break;
        default:
            fontSize = 48;
            break;
    }
    $(".bri").css("font-size", fontSize + "px");
}

function skipItem() {
   	BRQuestion.Skip();
    newQuestion();
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

function ItemIsBurned(item) {
    return item.user_specific ? item.user_specific.burned : false;
}

function fetchAndCacheBurnedRadicalsThen(callback) {
    fetchAndCacheBurnedItemsThen(callback, "radicals", "Radicals", "burnedRadicals",
        function(radical) {
            return { character : getRadicalCharacter(radical),
                     meaning   : radical.meaning.split(", "),
                     usyn      : radical.user_specific ? radical.user_specific.user_synonyms : null
            };
        });
}

function fetchAndCacheBurnedKanjiThen(callback) {
    fetchAndCacheBurnedItemsThen(callback, "kanji", "Kanji", "burnedKanji",
        function(kanji) {
            return { character         : kanji.character,
                     meaning           : kanji.meaning.split(", "),
                     onyomi            : kanji.onyomi ? kanji.onyomi.split(", ") : null,
                     kunyomi           : kanji.kunyomi ? kanji.kunyomi.split(", ") : null,
                     important_reading : kanji.important_reading,
                     usyn              : kanji.user_specific ? kanji.user_specific.user_synonyms : null
            };
        });
}

function fetchAndCacheBurnedVocabThen(callback) {
    fetchAndCacheBurnedItemsThen(callback, "vocabulary", "Vocab", "burnedVocab",
        function(vocab) {
            return { character : vocab.character,
                     meaning   : vocab.meaning.split(", "),
                     kana      : vocab.kana.split(", "),
                     usyn      : vocab.user_specific ? vocab.user_specific.user_synonyms : null
            };
        });
}

function fetchAndCacheBurnedItemsThen(callback, requestedResource, type, storageKey, mapFunction) {
    $.ajax({url:"https://www.wanikani.com/api/user/" + apiKey + "/" + requestedResource, dataType:"json"})
        .done(function(response) {
            // vocabulary for some reason has everything in a child called general, kanji and radicals do not
            var requestData = response.requested_information.general ?
                                response.requested_information.general : response.requested_information;
            var burnedItems = requestData.filter(ItemIsBurned);
            BRData[type] = burnedItems.map(mapFunction);

            localStorage.setItem(storageKey, JSON.stringify(BRData[type]));
            callback();
        })
        .fail(function() {
            BRLog("Request to WaniKani API failed. Catastrophic failure ermagerd D:", ERROR);
        });
}

function maybeGetBurnedItemsThen(callback, storageKey, type, fetchFunction) {
    var RawBRData = localStorage.getItem(storageKey);
    if (RawBRData !== null) {
        try {
            BRData[type] = JSON.parse(RawBRData);
            if (BRData[type].length > 0) {
                return callback();
            }
            BRLog("No burned " + type + " in cache. Refectching...", WARNING);
        }
        catch(e) {
            BRLog("Could not parse cached radical data. Refetching...", WARNING);
        }
    }
    return fetchFunction(callback);
}


function maybeGetBurnedRadicalsThen(callback) {
    displayRadicalLoadingMessage();
    maybeGetBurnedItemsThen(callback, "burnedRadicals", "Radicals", fetchAndCacheBurnedRadicalsThen);
}

function maybeGetBurnedKanjiThen(callback) {
    displayKanjiLoadingMessage();
    maybeGetBurnedItemsThen(callback, "burnedKanji", "Kanji", fetchAndCacheBurnedKanjiThen);
}

function maybeGetBurnedVocabThen(callback) {
    displayVocabLoadingMessage();
    maybeGetBurnedItemsThen(callback, "burnedVocab", "Vocab", fetchAndCacheBurnedVocabThen);
}

function getBurnReviewDataThen(callback) {
    BRLog("Getting WaniKana data");

    maybeGetBurnedRadicalsThen(function() {
        maybeGetBurnedKanjiThen(function() {
            maybeGetBurnedVocabThen(function() {

                BRLog("Data items { RadicalData: " + BRData.Radicals.length +
                                 "; KanjiData: " + BRData.Kanji.length +
                                 "; VocabData: " + BRData.Vocab.length + "}");
                callback();
            });
        });
    });

}

function clearBurnedItemData() {
    localStorage.removeItem("burnedRadicals");
    localStorage.removeItem("burnedKanji");
    localStorage.removeItem("burnedVocab");
    BRData.Radicals = [];
    BRData.Kanji    = [];
    BRData.Vocab    = [];
}

function confirmRes() {
    $(".answer-exception-form").css({"display": "block", "opacity": "0", "-webkit-transform": "translateY(20px)", "-moz-transform": "translateY(20px)"}).removeClass("animated fadeInUp");
    $(".answer-exception-form").addClass("animated fadeInUp");

    var itemTypeForUrl = BRQuestion.DependingOnTypeUse("radicals/", "kanji/", "vocabulary/");
    var resurrectionUrl = "https://www.wanikani.com/retired/" + itemTypeForUrl + BRQuestion.Item.character + "?resurrect=true";
    var resurrectionLink = '<a href="' + resurrectionUrl + '" target="_blank" class="btn btn-mini resurrect-btn" data-method="put" rel="nofollow">';

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

    document.getElementById("answer-button").onclick = submitBRAnswer;
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
        $(this).toggleClass("on");
        switchBRLang();
    });
}

//TODO - break this out in to seperate functions for each of the buttons
function bindResizeButtonClickEvent() {
    $('.right-side-toggle-buttons div').click(function() {
        $(this).toggleClass("on");
        if ($(this).hasClass("on")) {
            if ($("#dim-overlay").css("display") == "none") {
                $("#dim-overlay").css("display", "block").addClass("fadeIn");
                $(".burn-reviews.kotoba-table-list.dashboard-sub-section").css({"-webkit-transition": "1s ease-in-out",
                    "-moz-transition": "1s ease-in-out",
                    "-o-transition": "1s ease-in-out",
                    "transition": "1s ease-in-out"}
                    ).css("transform", "scaleX(2)scaleY(2)").one('transitionend webkitTransitionEnd',function() {
                        $("#dim-overlay").removeClass("fadeIn");
                        if (queueBRAnim) {
                            queueBRAnim = false;
                            allowQueueBRAnim = false;
                            $(".resize-button").trigger("click");
                        } else  {
                            allowQueueBRAnim = true;
                        }
                    });
            } else if (!queueBRAnim && allowQueueBRAnim) {
                queueBRAnim = true;
            }
        }
        else {
            if (!$("#dim-overlay").hasClass("fadeIn")) {
                $("#dim-overlay").addClass("fadeOut");
                $(".burn-reviews.kotoba-table-list.dashboard-sub-section").one('transitionend webkitTransitionEnd', function() {
                    $("#dim-overlay").removeClass("fadeOut").css("display", "none");
                    if (queueBRAnim) {
                        queueBRAnim = false;
                        allowQueueBRAnim = false;
                        $(".resize-button").trigger("click");
                    }
                    else {
                        allowQueueBRAnim = true;
                    }
                });
                $(".burn-reviews.kotoba-table-list.dashboard-sub-section").css("transform", "scaleX(1)scaleY(1)");
            } else if (!queueBRAnim && allowQueueBRAnim) {
                queueBRAnim = true;
            }
        }
    });
}

function bindLoadButtonClickEvent() {
    $(".brbsl").click(function() {
        $("#dim-overlay").remove();
        $(".burn-reviews").parent().remove();
        BRQuestion.Reset();
        queueBRAnim = false;
        allowQueueBRAnim = true;
        $(getSection()).insertAfter($(".low-percentage.kotoba-table-list.dashboard-sub-section").parent().next());
        displayStartMessage();
        clearBurnedItemData();
        initBurnReviews();
    });
}

function bindStartButtonToggleButtonClickEvent() {
    $(".brbss").click(function() {
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
    bindItemToggleButtonClickEvent('.brbiv', "BRVocabEnabled", "VocabEnabled", BRQuestion.IsVocab.bind(BRQuestion));
}

function bindKanjiToggleButtonClickEvent() {
    bindItemToggleButtonClickEvent('.brbik', "BRKanjiEnabled", "KanjiEnabled", BRQuestion.IsKanji.bind(BRQuestion));
}

function bindRadicalsToggleButtonClickEvent() {
    bindItemToggleButtonClickEvent('.brbir', "BRRadicalsEnabled", "RadicalsEnabled", BRQuestion.IsRadical.bind(BRQuestion));
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

function bindDimOverlayClickEvent() {
    $("#dim-overlay").click(function () {
        $(".resize-button").removeClass("on");
        if (!$(this).hasClass("fadeIn")) {
            $(this).addClass("fadeOut");
            $(".burn-reviews.kotoba-table-list.dashboard-sub-section").one('transitionend webkitTransitionEnd', function() {
                $("#dim-overlay").removeClass("fadeOut").css("display", "none");
                if (queueBRAnim) {
                    queueBRAnim = false;
                    allowQueueBRAnim = false;
					$(".brk").trigger("click");
                }
                else {
                    allowQueueBRAnim = true;
                }
            });
            $(".burn-reviews.kotoba-table-list.dashboard-sub-section").css("transform", "scaleX(1)scaleY(1)");
        } else if (!queueBRAnim && allowQueueBRAnim) {
            queueBRAnim = true;
        }
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

//TODO - Refactor this
function checkBurnReviewAnswer() {
    var response = $("#user-response").val().toLowerCase().trim();
    var match = false;
    var answers = BRQuestion.GetAnswers();

    $("#user-response").attr("disabled", true);

    for (var a = 0; a < answers.length; a++) {
        if (response == answers[a]) match = true;
    }

    if (((BRQuestion.IsAskingForMeaning() && isAsciiPresent(response)) || (!isAsciiPresent(response) && BRQuestion.IsAskingForReading())) && response !== "") {

        if (!match && BRQuestion.IsKanji() && BRQuestion.IsAskingForReading() && ((BRQuestion.Item.important_reading == "onyomi" &&
       		compareKunyomiReading(response, BRQuestion.Item.kunyomi)) || (BRQuestion.Item.important_reading == "kunyomi" && response == BRQuestion.Item.onyomi))) {

            var incorrectReadingText = '<div class="br-en">Oops! You entered the wrong reading.</div>' +
                                       '<div class="br-jp">おっと、異なる読みを入力してしまった。</div>';
       		$(".answer-exception-form span").html(incorrectReadingText);
            setLanguage();

            $(".answer-exception-form").css({"display": "block"}).addClass("animated fadeInUp").delay(5000).queue(function(){
    			$(this).addClass("fadeOut").dequeue().delay(800).queue(function(){
                    $(this).removeClass("fadeOut").css("display", "none").dequeue();
                });
			});
            $("#user-response").attr("disabled", false);

        }
        else {

            if (match) {
                $("#answer-form fieldset").removeClass("incorrect");
                $("#answer-form fieldset").addClass("correct");
                BRQuestion.NextPart(); // TODO - this should sit in newQuestion but needs some reshuffling
            } else {
                $("#answer-form fieldset").removeClass("correct");
                $("#answer-form fieldset").addClass("incorrect");

                // concat in to string of comma-separated answers
                var answerList = answers.join(", ");
                var resurrectButton = '<a href="#" class="btn btn-mini resurrect-btn">';

                var answerTextEng = '<div class="br-en">The answer was:<br />' + answerList + '<br />' + resurrectButton + 'Resurrect</a> this item?</div>';
                var answerTextJp  = '<div class="br-jp">解答は<br />「' + answerList + '」であった。<br />この項目を' + resurrectButton + '復活</a>したいか？</div>';
                $('.answer-exception-form span').html(answerTextEng + answerTextJp);
                setLanguage();

                $(".answer-exception-form").css({"display": "block"}).addClass("animated fadeInUp");
                $('.resurrect-btn').on('click', confirmRes);
            }

            BRQuestion.SetAnswered(true);

    	}
    } else {
        $("#user-response").attr("disabled", false);
    }
}

function compareKunyomiReading(input, reading) {
    var match = false;

    if (input == reading || input == reading.toString().substring(0, reading.indexOf(".")) || input == reading.toString().replace("*", input.substring(reading.indexOf(".") + 1)).replace(".", "")) match = true;

    return match;
}

function submitBRAnswer() {
    if (!BRQuestion.IsAnswered()) {
        checkBurnReviewAnswer();
    }
    else {
        newQuestion();
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

function main() {

    importWanaKana();
    getApiKeyThen(function(key) {

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

        injectWidgetHtmlWrapper();

        displayStartMessage();
        bindStartButtonClickEvent();

        document.addEventListener('keydown', function(event) {
            if(event.keyCode == 13) { //Enter
                if (BRQuestion.IsAnswered()) {
                    newQuestion();
                }
            }
         });

        if (localStorage.getItem("BRStartButton") === null) $("#loadingBR a").click();
    });
}

if (document.readyState === 'complete')
    main();
else
    window.addEventListener("load", main, false);

// ==/UserScript==
