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

// Globals....ewww
var BRLoggingEnabled = (localStorage.getItem("BRLoggingEnabled") == "true");

BRData = { Radicals: [], Kanji: [], Vocab: [] };

// TODO - Should be able to make this non global and constructed via a function
BRQuestion = {
    Type     : UNDEFINED, // TODO - rename to AskingFor
    ItemType : UNDEFINED,
    Item     : {},

    IsRadical : function() { return this.ItemType === RADICAL; },
    IsKanji   : function() { return this.ItemType === KANJI; },
    IsVocab   : function() { return this.ItemType === VOCAB; },

    IsAskingForMeaning: function() { return this.Type === MEANING; },
    IsAskingForReading: function() { return this.Type === READING; },

    //TODO - This method can probably be removed if I can stop this from being global
    Reset : function() {
                this.Type     = UNDEFINED;
                this.ItemType = UNDEFINED;
                this.Item     = {};
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

$("head").append('<script src="https://rawgit.com/WaniKani/WanaKana/master/lib/wanakana.min.js" type="text/javascript"></script>');

function getSection() {
    var strSection =
        "<div class=\"span4\">"                                                                                                                                           +
            "<section class=\"burn-reviews kotoba-table-list dashboard-sub-section\" style=\"z-index: 2; position: relative\">"                                           +
                "<h3 class=\"small-caps\">"                                                                                                                               +
                    ((!BRLangJP) ? "BURN REVIEWS" : "焦げた復習")                                                                                                         +
                "</h3>"                                                                                                                                                   +
                "<div id=\"loadingBR\" align=\"center\" style=\"position: relative; background-color: #d4d4d4; margin-top: 0px; padding-top: 42px; height: 99px\"></div>" +
                "<div class=\"see-more\" style=\"margin-top: -1px\">"                                                                                                     +
                    "<a href=\"javascript:void(0)\" id=\"new-item\" class=\"small-caps\">"                                                                                +
                        ((!BRLangJP) ? "NEW ITEM" : "新しい項目")                                                                                                         +
                    "</a>"                                                                                                                                                +
                "</div>"                                                                                                                                                  +
            "</section>"                                                                                                                                                  +
        "</div>";
    return strSection;
}

function getFadeCSS() {
    var strFadeIn =
    "<style type=\"text/css\">"          +
	".fadeIn {"                          +
        "-webkit-animation: fadein 1s;"  +
                "animation: fadein 1s;"  +
    "}"                                  +
    "@keyframes fadein {"                +
        "from { opacity: 0; }"           +
        "to   { opacity: 0.9; }"         +
    "}"                                  +
    "@-webkit-keyframes fadein {"        +
        "from { opacity: 0; }"           +
        "to   { opacity: 0.9; }"         +
    "}"                                  +
	".fadeOut {"                         +
        "-webkit-animation: fadeout 1s;" +
                "animation: fadeout 1s;" +
    "}"                                  +
    "@keyframes fadeout {"               +
        "from { opacity: 0.9; }"         +
        "to   { opacity: 0; }"           +
    "}"                                  +
    "@-webkit-keyframes fadeout {"       +
        "from { opacity: 0.9; }"         +
        "to   { opacity: 0; }"           +
    "}"                                  +
    "</style>";
    return strFadeIn;
}

function getButtonCSS() {
    var strButtons =
        "<style type=\"text/css\">"                                                                       +
            ".brbi div, .brbt div, .brbs div {"                                                           +
                "background-color: rgb(67, 67, 67);"                                                      +
                "background-image: linear-gradient(to bottom, rgb(85, 85, 85), rgb(67, 67, 67));"         +
                "color: rgb(98, 98, 98);"                                                                 +
            "}"                                                                                           +
            ".brbi span, .brbtj span {"                                                                   +
                "margin-top: 5px"                                                                         +
            "}"                                                                                           +
            ".brbir.on {"                                                                                 +
                "background-color: #00a0f1; background-image: linear-gradient(to bottom, #0af, #0093dd);" +
            "}"                                                                                           +
            ".brbik.on {"                                                                                 +
                "background-color: #f100a0; background-image: linear-gradient(to bottom, #f0a, #dd0093);" +
            "}"                                                                                           +
            ".brbiv.on {"                                                                                 +
                "background-color: #a000f1; background-image: linear-gradient(to bottom, #a0f, #9300dd);" +
            "}"                                                                                           +
            ".brbt .on, .brbss.on, .brbsl:hover {"                                                        +
                "background-color: #80c100; background-image: linear-gradient(to bottom, #8c0, #73ad00);" +
            "}"                                                                                           +
        "</style>";
    return strButtons;
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


function appendAdditionalCSS() {
    BRLog("Undoing conflicting CSS");
    $("head").append('<style type="text/css">.srs { width: 236px } menu, ol, ul { padding: 0 } p { margin: 0 0 10px }</style>');
    $(getFadeCSS()).appendTo($("head"));
    $(getButtonCSS()).appendTo($("head"));
    $('<style type="text/css"> .radical-question { height:100%; margin-top:-10px; }</style>').appendTo($("head"));
    $("ul").css("padding-left", "0px");
}

function rand(low, high) {
    return Math.floor(Math.random()*(high+1)) + low;
}

function enableKanaInput() {
    wanakana.bind(document.getElementById('user-response'));
}

function disableKanaInput() {
    wanakana.unbind(document.getElementById('user-response'));
}

function getBurnReview(firstReview) {

    BRLog("Getting " + (firstReview ? "first" : "") + " burn review");

    curBRAnswered = false;

    $("#user-response").attr("disabled", false).val("").focus();

    if (!firstReview) {

        $(".answer-exception-form").css("display", "none");

        if ((BRQuestion.IsRadical() && curBRProgress > 0) || curBRProgress == 2) {
            newBRItem();
            updateBRItem(true);
        }

        if (!BRQuestion.IsRadical() && (curBRProgress < 1 || $("#answer-form fieldset").hasClass("correct"))) {
            if (BRQuestion.IsAskingForMeaning()) {
                BRQuestion.Type = READING;
                enableKanaInput()
                $("#user-response").attr({lang:"ja",placeholder:"答え"});
                $("#question-type").removeClass("meaning").addClass("reading");
            }
            else {
                BRQuestion.Type = MEANING;
                disableKanaInput();
                $("#user-response").removeAttr("lang").attr("placeholder","Your Response");
                $("#question-type").removeClass("reading").addClass("meaning");
            }
        }
        else if (BRQuestion.IsRadical()) {
            disableKanaInput();
            $("#user-response").removeAttr("lang").attr("placeholder","Your Response");
            $("#question-type").removeClass("reading").addClass("meaning");
        }
        if (!BRLangJP) {
            document.getElementById("question-type-text").innerHTML = (BRQuestion.IsAskingForMeaning()) ? "Meaning" :
                ((BRQuestion.IsKanji()) ? ((BRQuestion.Item.important_reading == "onyomi") ? "Onyomi Reading" : "Kunyomi Reading") : "Reading");
        }
        else {
            document.getElementById("question-type-text").innerHTML = (BRQuestion.IsAskingForMeaning()) ? "意味" :
                ((BRQuestion.IsKanji()) ? ((BRQuestion.Item.important_reading == "onyomi") ? "音読み" : "訓読み") : "読み");
        }


        document.getElementById('user-response').value = "";
        $("#answer-form fieldset").removeClass("correct").removeClass("incorrect");

    }
    else {

        document.getElementById("new-item").onclick = skipItem;

        $("body").prepend('<div id="dim-overlay" style="position: fixed; background-color: black; opacity: 0.75; width: 100%; height: 100%; z-index: 1; margin-top: -122px; padding-bottom: 122px; display: none"></div>');
        BRLog("Overlay applied");

        newBRItem();
        BRLog("Got new item");

        var characterText = BRQuestion.Item.character;
        var reviewTypeText;
        if (!BRLangJP) {
            reviewTypeText = (BRQuestion.IsAskingForMeaning() ? "Meaning" : BRQuestion.IsRadical() ? BRQuestion.Item.character : // TODO - I don't think this needs to check if it's a radical
                       (BRQuestion.IsKanji() ? BRQuestion.Item.important_reading.substring(0, 1).toUpperCase() + BRQuestion.Item.important_reading.substring(1) + " Reading" : "Reading")); //TODO - use css text-transform: capitalize
        }
        else { // TODO - Remove the fact this is a repeated conditional
            reviewTypeText = BRQuestion.IsAskingForMeaning() ? "意味" : BRQuestion.IsRadical() ? BRQuestion.Item.character :
                              (BRQuestion.IsKanji() ? (BRQuestion.Item.important_reading == "onyomi" ? "音" : "訓") : "") + "読み";
        }

        var strReview =
            "<div class=\"answer-exception-form\" id=\"answer-exception\" align=\"center\" style=\"position: absolute; width: 310px; margin-top: 78px; margin-left: 30px; top: initial; bottom: initial; left: initial; display: none\">"            +
                "<span>Answer goes here</span></div>"                                                                                                                                                                                                +
                    "<div id=\"question\" style=\"position: relative; background-color: #d4d4d4; margin-top: -2px; padding-left: 30px; padding-right: 30px; height: 142px\">"                                                                        +
                        "<div class=\"brbi\" style=\"width: 30px; height: 32px; position: absolute; margin-top: 0px; margin-left: -30px; z-index: 11\">"                                                                                             +
                            "<div class=\"brbir" + ((BRRadicalsEnabled) ? ' on' : '') + "\">"                                                                                                                                                        +
                               "<span lang=\"ja\">部</span>"                                                                                                                                                                                         +
                            "</div>"                                                                                                                                                                                                                 +
                            "<div class=\"brbik" + ((BRKanjiEnabled) ? ' on' : '') + "\" style=\"padding-top: 1px !important\">"                                                                                                                     +
                                "<span lang=\"ja\">漢</span>"                                                                                                                                                                                        +
                            "</div>"                                                                                                                                                                                                                 +
                        "<div class=\"brbiv" + ((BRVocabularyEnabled) ? ' on' : '') + "\">"                                                                                                                                                          +
                            "<span lang=\"ja\">語</span>"                                                                                                                                                                                            +
                        "</div>"                                                                                                                                                                                                                     +
                    "</div>"                                                                                                                                                                                                                         +
                    "<div class=\"brbs\" style=\"width: 15px; height: 70px; position: absolute; margin-top: 70px; margin-left: -30px; z-index: 11\">"                                                                                                +
                        "<div class=\"brbsl\" style=\"height: 35px\">"                                                                                                                                                                               +
                            "<span lang=\"ja\" style=\"font-size: 10px; " + ((!BRLangJP) ? 'margin: 5px 0 0 0\">Load' : 'margin: 2px 0 0 0\">ロード') + "</span>"                                                                                    +
                        "</div>"                                                                                                                                                                                                                     +
                        "<div class=\"brbss" + ((localStorage.getItem("BRStartButton") !== null) ? ' on' : '') + "\" style=\"height: 35px !important\">"                                                                                             +
                            "<span lang=\"ja\" style=\"margin-top: 2px"                                                                                                                                                                              +
                            ((!BRLangJP) ? '; font-size: 10px; line-height: 0.9\">Start Button' : 'font-size: 11px !important; line-height: 1.1; margin-left: -1px\">開始\rボタン')                                                                  +
                            "</span>"                                                                                                                                                                                                                +
                        "</div>"                                                                                                                                                                                                                     +
                    "</div>"                                                                                                                                                                                                                         +
                    "<div class=\"brbt\" style=\"width: 30px; position: absolute; margin-left: 310px; z-index: 11\">"                                                                                                                                +
                        "<div class=\"brbtj" + ((BRLangJP) ? ' on' : '') + "\"><span lang=\"ja\" style=\"margin-top: 4px\">日本語</span></div>"                                                                                                      +
                        "<div class=\"brbtr\">"                                                                                                                                                                                                      +
                            "<span lang=\"ja\" style=\"" + ((!BRLangJP) ? 'margin-top: 3px; font-size: inherit\">Resize' : 'margin-top: 4px; font-size: 10px\">拡大する') + "</span>"                                                                +
                        "</div>"                                                                                                                                                                                                                     +
                    "</div>"                                                                                                                                                                                                                         +
                    "<div class=\"brk\">"                                                                                                                                                                                                            +
                        "<span class=\"bri\" lang=\"ja\">" + characterText + "</span>"                                                                                                                                                               +
                        "</div>"                                                                                                                                                                                                                     +
                    "<div id=\"question-type\" style=\"margin: 0px 0px 0px 0px; height: 33px\"><h1 id=\"question-type-text\" align=\"center\" style=\"margin: -5px 0px 0px 0px; text-shadow: none\">" + reviewTypeText + "</h1></div>"               +
                    "<div id=\"answer-form\">"                                                                                                                                                                                                       +
                        "<form onSubmit=\"return false\">"                                                                                                                                                                                           +
                            "<fieldset style=\"padding: 0px 0px 0px 0px; margin: 0px 0px 0px 0px\">"                                                                                                                                                 +
                                "<input autocapitalize=\"off\" autocomplete=\"off\" autocorrect=\"off\" id=\"user-response\" name=\"user-response\" placeholder=\"Your Response\" type=\"text\" style=\"height: 35px; margin-bottom: 0px\"></input>" +
                                "<button id=\"answer-button\" style=\"width: 0px; height: 34px; padding: 0px 20px 0px 5px; top: 0px; right: 0px\" ><i class=\"icon-chevron-right\"></i></button>"                                                    +
                            "</fieldset>"                                                                                                                                                                                                            +
                        "</form>"                                                                                                                                                                                                                    +
                    "</div>"                                                                                                                                                                                                                         +
                "</div>"                                                                                                                                                                                                                             +
            "</div>";

        BRLog(strReview);
    	return strReview;
    }
}

function newBRItem() {
    BRLog("Getting new burn item");

    // Need to get a weighted Random
    var itemTypeArray = [];
    if (BRRadicalsEnabled) {
        itemTypeArray = itemTypeArray.concat(new Array(BRData.Radicals.length).fill(RADICAL));
    }
    if (BRKanjiEnabled) {
        itemTypeArray = itemTypeArray.concat(new Array(BRData.Kanji.length).fill(KANJI));
    }
    if (BRVocabularyEnabled) {
        itemTypeArray = itemTypeArray.concat(new Array(BRData.Vocab.length).fill(VOCAB));
    }

    BRQuestion.ItemType = itemTypeArray[rand(0, itemTypeArray.length)];

    var dataBank = [BRData.Radicals, BRData.Kanji, BRData.Vocab][BRQuestion.ItemType];
    BRQuestion.ItemIndex = rand(0, dataBank.length - 1);

    BRQuestion.Item = dataBank[BRQuestion.ItemIndex];

    BRQuestion.Type = BRQuestion.IsRadical() ? MEANING : rand(MEANING, READING);

    curBRProgress = 0;

    BRLog("Burn item type: " + BRQuestion.ItemType);
    BRLog("Burn item: " + BRQuestion.Item);

}

function updateBRItem(updateText) {

    BRLog("Updating Burn review item");
    if (updateText) $(".bri").html(BRQuestion.Item.character);
    if ($(".bri").html().length > 3) {
        switch($(".bri").html().length) {
            case 4:
                $(".bri").css("font-size", "38px");
                break;
            case 5:
                $(".bri").css("font-size", "28px");
                break;
            case 6:
            	$(".bri").css("font-size", "24px");
                break;
            default:
                $(".bri").css("font-size", "inherit");
        }
    } else $(".bri").css("font-size", "48px");

    var bg = BRQuestion.IsRadical() ? "#00a0f1" : (BRQuestion.IsKanji() ? "#f100a0" : "#a000f1"); // TODO - these colours are standard. Should be written to consts, or better, done with CSS
    var bgi = "linear-gradient(to bottom, ";

    bgi += (BRQuestion.IsRadical() ? "#0af, #0093dd" : BRQuestion.IsKanji() ? "#f0a, #dd0093" : "#a0f, #9300dd");
    $(".brk").css({"background-color": bg,
                   "background-image": bgi,
                   "background-repeat": "repeat-x",
                   "height": "39px",
                   "padding-top": "28px",
                   "padding-bottom": "3px",
                   "margin-top": "0px",
                   "margin-left": "0px",
                   "text-align": "center"});

}

function skipItem() {
   	curBRProgress = 2;
    getBurnReview(false);
    return false;
}

function displayLoadingMessage(color, english, japanese) {
    $("#loadingBR").html('<h3 style="color:' + color + '">' + (BRLangJP ? japanese : english)  + '</h3>');
}

function displayRadicalLoadingMessage() {
    displayLoadingMessage("#00a0f1", "Retrieving radical data...", "部首データを検索中…");
}

function displayKanjiLoadingMessage() {
    displayLoadingMessage("#f100a0","Retrieving kanji data...", "漢字データを検索中…");
}

function displayVocabLoadingMessage() {
    displayLoadingMessage("#a000f1","Retrieving vocabulary data...", "単語データを検索中…");
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

function getBRWKData() {
    BRLog("Getting WaniKana data");

    maybeGetBurnedRadicalsThen(function() {
        maybeGetBurnedKanjiThen(function() {
            maybeGetBurnedVocabThen(function() {

                BRLog("Data items { RadicalData: " + BRData.Radicals.length +
                                 "; KanjiData: " + BRData.Kanji.length +
                                 "; VocabData: " + BRData.Vocab.length + "}");

                initBurnReviews();
            });
        });
    });

}

function clearBurnedItemData() {
    localStorage.removeItem("burnedRadicals");
    localStorage.removeItem("burnedKanji");
    localStorage.removeItem("burnedVocab");
}

function confirmRes() {
    $(".answer-exception-form").css({"display": "block", "opacity": "0", "-webkit-transform": "translateY(20px)", "-moz-transform": "translateY(20px)"}).removeClass("animated fadeInUp");
    $(".answer-exception-form span").html("");
    $(".answer-exception-form").addClass("animated fadeInUp");

    var itemTypeForUrl = BRQuestion.IsRadical() ? "radicals/" : BRQuestion.IsKanji() ? "kanji/" : "vocabulary/"; // TODO - this is a common pattern. Make it a function
    var resurrectionUrl = "https://www.wanikani.com/retired/" + itemTypeForUrl + BRQuestion.Item.character + "?resurrect=true";
    if (!BRLangJP) {
    	$(".answer-exception-form span").html("Are you sure you want to <a href=\"" + resurrectionUrl + "\" target=\"_blank\" class=\"btn btn-mini resurrect-btn\" data-method=\"put\" rel=\"nofollow\">Resurrect</a> the " +
            (BRQuestion.IsRadical() ? "radical " : BRQuestion.IsKanji() ? "kanji item " : "vocabulary item \"") + BRQuestion.Item.character + "\"?");
    }
   	else {
        $(".answer-exception-form span").html((BRQuestion.IsRadical() ? "部首「" : BRQuestion.IsKanji() ? "漢字「" : "単語「" ) + BRQuestion.Item.character  + "」を" +
            "<a href=\""+ resurrectionUrl + "\" target=\"_blank\" class=\"btn btn-mini resurrect-btn\" data-method=\"put\" rel=\"nofollow\">復活</a>する<br />本当によろしいですか？");
    }
    document.getElementById("answer-exception").onclick = "return false";
    return false;
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
            //Undo conflicting CSS from above import
            appendAdditionalCSS();
            callback();
        });
}


function initBurnReviews() {

    BRLog("Initialising the Burn Review widget");

    useCache = false;
    $("#loadingBR").remove();

    // Get the stylesheet from the reviews page and append it to the head
    addBurnReviewStylesThen(fuckingMonstrosityThatNeedsToBeRefactoredOrSoHelpMeGod);

}

function fuckingMonstrosityThatNeedsToBeRefactoredOrSoHelpMeGod() {

    BRLog("Adding burn review section");
    $(getBurnReview(true)).insertAfter($(".burn-reviews.kotoba-table-list.dashboard-sub-section h3"));

    document.getElementById("answer-button").onclick = submitBRAnswer;
    updateBRItem(false);
    if (BRQuestion.IsAskingForMeaning()) {
        disableKanaInput();
        $("#user-response").removeAttr("lang").attr("placeholder","Your Response");
        $("#question-type").addClass("meaning");
    } else {
        enableKanaInput();
        $("#user-response").attr({lang:"ja",placeholder:"答え"});
        $("#question-type").addClass("reading");
    }
    $(".brbi div, .brbs div, .brbt div").css({"background-repeat": "repeat-x", "color": "#fff", "padding": "0px 5px 0px 5px", "width": "20px", "vertical-align": "middle",
                       "font-size": "14px"}).mouseover(function() {
        $(this).css("text-shadow", "0 0 0.2em #fff");
    }).mouseout(function() {
        $(this).css("text-shadow", "");
    });
    $('.brbi div').css({"height": "23px"}).click(function() {
        var cancel = false;
        if ($(this).hasClass("on")) {
            if ((BRRadicalsEnabled && BRKanjiEnabled) || (BRRadicalsEnabled && BRVocabularyEnabled) || (BRKanjiEnabled && BRVocabularyEnabled)) {
                if ($(this).attr("class") == "brbir on") {
                    localStorage.setItem("BRRadicalsEnabled", false);
                    BRRadicalsEnabled = false;
                    if (BRQuestion.IsRadical()) skipItem();
                } else if ($(this).attr("class") == "brbik on") {
                    localStorage.setItem("BRKanjiEnabled", false);
                    BRKanjiEnabled = false;
                    if (BRQuestion.IsKanji()) skipItem();
                } else if ($(this).attr("class") == "brbiv on") {
                    localStorage.setItem("BRVocabularyEnabled", false);
                    BRVocabularyEnabled = false;
                    if (BRQuestion.IsVocab()) skipItem();
                }
            } else cancel = true;
        } else {
            if ($(this).attr("class") == "brbir") {
                localStorage.removeItem("BRRadicalsEnabled");
                BRRadicalsEnabled = true;
            } else if ($(this).attr("class") == "brbik") {
                localStorage.removeItem("BRKanjiEnabled");
                BRKanjiEnabled = true;
            } else if ($(this).attr("class") == "brbiv") {
                localStorage.removeItem("BRVocabularyEnabled");
                BRVocabularyEnabled = true;
            }
        }
        if (!cancel) $(this).toggleClass("on");
    });
    $(".brbs div").css("padding: 2.5px 5px !important");
    $(".brbsl").click(function() {
        $("#dim-overlay").remove();
        $(".burn-reviews").parent().remove();
        BRQuestion.Reset();
        curBRProgress = 0;
        curBRAnswered = false;
        queueBRAnim = false;
        allowQueueBRAnim = true;
        BRData.Radicals = [];
        BRData.Kanji = [];
        BRData.Vocab = [];
        $(getSection()).insertAfter($(".low-percentage.kotoba-table-list.dashboard-sub-section").parent().next());
        if (!BRLangJP) $("#loadingBR").html('<a lang="ja" href="javascript:void(0)" style="font-size: 52px; color: #434343; text-decoration: none">Start</a>');
   		else $("#loadingBR").html('<a lang="ja" href="javascript:void(0)" style="font-size: 52px; color: #434343; text-decoration: none">開始</a>');
        clearBurnedItemData();
        getBRWKData();
    });
    $(".brbss").click(function() {
        $(this).toggleClass("on");
        if ($(this).hasClass("on")) localStorage.setItem("BRStartButton", true);
        else localStorage.removeItem("BRStartButton");
    });
    $('.brbt div').css({"height": "50px", "padding": "2px 5px"}).click(function() {
        $(this).toggleClass("on");
        if ($(this).children(".brbt div span").html() == "日本語") {
            if (!BRLangJP) localStorage.setItem("BRLangJP", true);
            else localStorage.removeItem("BRLangJP");
            switchBRLang();
        } else {
            if ($(this).hasClass("on")) {
                if ($("#dim-overlay").css("display") == "none") {
                    if (BRLangJP) $(".brbtr span").html("縮小する");
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
                            $(".brbtr").trigger("click");
                        } else allowQueueBRAnim = true;
                    });
           		 } else if (!queueBRAnim && allowQueueBRAnim) queueBRAnim = true;
            } else {
        		if (!$("#dim-overlay").hasClass("fadeIn")) {
                    if (BRLangJP) $(".brbtr span").html("拡大する");
                    $("#dim-overlay").addClass("fadeOut");
                    $(".burn-reviews.kotoba-table-list.dashboard-sub-section").one('transitionend webkitTransitionEnd', function() {
                        $("#dim-overlay").removeClass("fadeOut").css("display", "none");
                        if (queueBRAnim) {
                            queueBRAnim = false;
                            allowQueueBRAnim = false;
                            $(".brbtr").trigger("click");
                        } else allowQueueBRAnim = true;
                    });
                    $(".burn-reviews.kotoba-table-list.dashboard-sub-section").css("transform", "scaleX(1)scaleY(1)");
            	} else if (!queueBRAnim && allowQueueBRAnim) queueBRAnim = true;
            }
        }
    });
    $(".brbtr").css({"height": "49px"});
    $(".brbi div span, .brbs div span, .brbt div span").css({"-ms-writing-mode": "tb-rl", "-webkit-writing-mode": "vertical-rl", "-moz-writing-mode": "vertical-rl", "writing-mode": "vertical-rl",
                           "-webkit-touch-callout": "none", "-webkit-user-select": "none", "-khtml-user-select": "none", "-moz-user-select": "none", "-ms-user-select": "none", "user-select": "none", "cursor":"default"});
    $(".bri").css({"color": "#ffffff",
                   "font-size": "48px",
                   "text-shadow": "0 1px 0 rgba(0,0,0,0.2)"});
    $("#dim-overlay").click(function () {
        $(".brbtr").removeClass("on");
        if (BRLangJP) $(".brbtr span").html("拡大する");
        if (!$(this).hasClass("fadeIn")) {
            $(this).addClass("fadeOut");
            $(".burn-reviews.kotoba-table-list.dashboard-sub-section").one('transitionend webkitTransitionEnd', function() {
                $("#dim-overlay").removeClass("fadeOut").css("display", "none");
                if (queueBRAnim) {
                    queueBRAnim = false;
                    allowQueueBRAnim = false;
					$(".brk").trigger("click");
                } else allowQueueBRAnim = true;
            });
            $(".burn-reviews.kotoba-table-list.dashboard-sub-section").css("transform", "scaleX(1)scaleY(1)");
        } else if (!queueBRAnim && allowQueueBRAnim) queueBRAnim = true;
    });

    $(".answer-exception-form span").css({"background-color": "rgba(162, 162, 162, 0.75)", "box-shadow": "3px 3px 0 rgba(225, 225, 225, 0.75)"});

}

function switchBRLang() {

    BRLangJP = !BRLangJP;

    var itemTypeForUrl = BRQuestion.IsRadical() ? "radicals/" : BRQuestion.IsKanji() ? "kanji/" : "vocabulary/"; // TODO - this is a common pattern. Make it a function
    var resurrectionUrl = "https://www.wanikani.com/retired/" + itemTypeForUrl + BRQuestion.Item.character + "?resurrect=true";

    if (BRLangJP) {
        document.getElementById("question-type-text").innerHTML = (BRQuestion.IsAskingForMeaning()) ? "意味" : document.getElementById("question-type-text").innerHTML.replace("Reading", "読み").replace("Onyomi ", "音").replace("Kunyomi ", "訓");
        $(".burn-reviews.kotoba-table-list.dashboard-sub-section h3").html("焦げた復習");
        $("#new-item").html("新しい項目");
        $(".brbsl span").css("margin", "2px 0 0 0").html("ロード");
        $(".brbss span").css({"line-height": "1.1", "margin-left": "-1px"}).html("開始\rボタン");
        $(".brbtr span").css("margin-top", "4px");
        if (!$(".brbtr").hasClass("on")) $(".brbtr span").css("font-size", "10px").html("拡大する");
        else $(".brbtr span").css("font-size", "10px").html("縮小する");
        if ($("#answer-exception").css("display") !== "none") {
            if (!$("#answer-exception").hasClass("fadeOut") && !curBRAnswered) $(".answer-exception-form span").html("おっと、異なる読みを入力してしまった。");
            else {
                 if ($(".answer-exception-form span").html().toString().substring(0, 1) == "A")

                    $(".answer-exception-form span").html((BRQuestion.IsRadical() ? "部首「" : BRQuestion.IsKanji() ? "漢字「" : "単語「" ) + BRQuestion.Item.character  + "」を" +
                        "<a href=\""+ resurrectionUrl + "\" target=\"_blank\" class=\"btn btn-mini resurrect-btn\" data-method=\"put\" rel=\"nofollow\">復活</a>する<br />本当によろしいですか？");
                else {
                    var txtPrev = $(".answer-exception-form span").html().toString();
                    $(".answer-exception-form span").html('解答は<br />「' + txtPrev.substring(txtPrev.indexOf('"') + 1, txtPrev.indexOf('"', txtPrev.indexOf('"') + 1)) + '」であった。<br />この項目を<a href="#"' +
                    ' class="btn btn-mini resurrect-btn">復活</a>したいか？');
                	document.getElementById("answer-exception").getElementsByTagName("span")[0].getElementsByTagName("a")[0].onclick = confirmRes;
                }
            }
        }
    } else {
        document.getElementById("question-type-text").innerHTML = (BRQuestion.IsAskingForMeaning()) ? "Meaning" : document.getElementById("question-type-text").innerHTML.replace("読み", "Reading").replace("音", "Onyomi ").replace("訓", "Kunyomi ");
        $(".burn-reviews.kotoba-table-list.dashboard-sub-section h3").html("BURN REVIEWS");
        $("#new-item").html("NEW ITEM");
        $(".brbsl span").css("margin", "5px 0 0 -1px").html("Load");
        $(".brbss span").css({"line-height": "0.9", "margin-left": "1px"}).html("Start Button");
        $(".brbtr span").css({"font-size": "inherit", "margin-top": "3px"}).html("Resize");
        if ($("#answer-exception").css("display") !== "none") {
            if (!$("#answer-exception").hasClass("fadeOut") && !curBRAnswered) $(".answer-exception-form span").html("Oops! You entered the wrong reading.");
            else {
               if ($(".answer-exception-form span").html().toString().indexOf("る本") > 1) {

                    $(".answer-exception-form span").html("Are you sure you want to <a href=\"" + resurrectionUrl +
                        "\" target=\"_blank\" class=\"btn btn-mini resurrect-btn\" data-method=\"put\" rel=\"nofollow\">Resurrect</a> the " +
                        (BRQuestion.IsRadical() ? "radical " : BRQuestion.IsKanji() ? "kanji item " : "vocabulary item \"") + BRQuestion.Item.character + "\"?");
               }
                else {
                    var txtPrev = $(".answer-exception-form span").html().toString();
                    $(".answer-exception-form span").html('The answer was:<br />"' + txtPrev.substring(txtPrev.indexOf('「') + 1, txtPrev.indexOf('」')) + '"<br /><a href="#"' +
                    ' class="btn btn-mini resurrect-btn">Resurrect</a> this item?');
                    document.getElementById("answer-exception").getElementsByTagName("span")[0].getElementsByTagName("a")[0].onclick = confirmRes;
                }
            }
        }
    }
}

function checkBurnReviewAnswer() {
    var response = $("#user-response").val().toLowerCase().trim();
    var match = false;
    var answers;

    $("#user-response").attr("disabled", true);

    if (BRQuestion.IsAskingForMeaning())
    {
        answers = BRQuestion.Item.meaning;
    }
    else
    {
        if (BRQuestion.IsKanji())
        {
            var importantReading = BRQuestion.Item.important_reading;
            answers = BRQuestion.Item[importantReading];
        }
        else
        {
            answers = BRQuestion.Item.kana;
        }
    }

    if (BRQuestion.IsAskingForMeaning() && BRQuestion.Item.usyn !== null) {
            answers = answers.concat(BRQuestion.Item.usyn);
    }

    for (var a = 0; a < answers.length; a++) {
        if (response == answers[a]) match = true;
    }

    if (((BRQuestion.IsAskingForMeaning() && isAsciiPresent(response)) || (!isAsciiPresent(response) && BRQuestion.IsAskingForReading())) && response !== "") {

        if (!match && BRQuestion.IsKanji() && BRQuestion.IsAskingForReading() && ((BRQuestion.Item.important_reading == "onyomi" &&
       		compareKunyomiReading(response, BRQuestion.Item.kunyomi)) || (BRQuestion.Item.important_reading == "kunyomi" && response == BRQuestion.Item.onyomi))) {

       		if (!BRLangJP) $(".answer-exception-form span").html("Oops! You entered the wrong reading.");
            else $(".answer-exception-form span").html("おっと、異なる読みを入力してしまった。");
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
                curBRProgress++;
            } else {
                $("#answer-form fieldset").removeClass("correct");
                $("#answer-form fieldset").addClass("incorrect");
                if (!BRLangJP)
                	$(".answer-exception-form span").html('The answer was:<br />"' + ((answers instanceof Array) ? answers.join(", ") : answers) + '"<br /><a href="#"' +
                    ' class="btn btn-mini resurrect-btn">Resurrect</a> this item?');
                else
                    $(".answer-exception-form span").html('解答は<br />「' + ((answers instanceof Array) ? answers.join(", ") : answers) + '」であった。<br />この項目を<a href="#"' +
                    ' class="btn btn-mini resurrect-btn">復活</a>したいか？');
                $(".answer-exception-form").css({"display": "block"}).addClass("animated fadeInUp");
                document.getElementById("answer-exception").getElementsByTagName("span")[0].getElementsByTagName("a")[0].onclick = confirmRes;
            }

            curBRAnswered = true;

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
    if (!curBRAnswered) checkBurnReviewAnswer();
    else getBurnReview(false);
}

function isAsciiPresent(e){
    return (BRQuestion.IsAskingForMeaning()) ? !/[^a-z \-0-9]/i.test(e) : /[^ぁ-ー0-9 ]/.test(e);
}

function main() {

    getApiKeyThen(function(key) {

        apiKey = key;
        BRLog("Running!");

        useCache            =  !(localStorage.getItem("burnedRadicals") === null || localStorage.getItem("burnedKanji") === null || localStorage.getItem("burnedVocab") === null);
        BRIsChrome          =  (navigator.userAgent.toLowerCase().indexOf('chrome') > -1);
        BRQuestion.Reset();
        curBRProgress       =  0;
        curBRAnswered       =  false;
        queueBRAnim         =  false;
        allowQueueBRAnim    =  true;
        BRLangJP            =  (localStorage.getItem("BRLangJP") == "true");
        BRRadicalsEnabled   =  (localStorage.getItem("BRRadicalsEnabled") != "false");
        BRKanjiEnabled      =  (localStorage.getItem("BRKanjiEnabled") != "false");
        BRVocabularyEnabled =  (localStorage.getItem("BRVocabularyEnabled") != "false");


        String.prototype.trim = function() {
            return(this.replace(/^ +/,'').replace(/ +$/,''));
        };

        $(".low-percentage.kotoba-table-list.dashboard-sub-section").parent().wrap('<div class="col" style="float: left"></div>');
        $("<br />" + getSection() + "<!-- span4 -->").insertAfter($(".low-percentage.kotoba-table-list.dashboard-sub-section").parent());

        if (!BRLangJP) $("#loadingBR").html('<a lang="ja" href="javascript:void(0)" style="font-size: 52px; color: #434343; text-decoration: none">Start</a>');
        else $("#loadingBR").html('<a lang="ja" href="javascript:void(0)" style="font-size: 52px; color: #434343; text-decoration: none">開始</a>');

        $("#loadingBR a").click( function() {

            if (!useCache) clearBurnedItemData();
            BRLog("Loading...");

            var checkReady = setInterval(function() {
                BRLog("Checking for wanakana...");
                if (wanakana !== undefined) {
                    clearInterval(checkReady);
                    getBRWKData();
                }
            }, 250);

        });

        document.addEventListener('keydown', function(event) {
            if(event.keyCode == 13) { //Enter
                if (curBRAnswered) getBurnReview(false);
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
