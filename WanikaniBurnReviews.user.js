// ==UserScript==
// @name        Wanikani Burn Reviews - bugfix
// @namespace   wkburnreviewnew
// @description Adds a space on the main page that reviews random burned items. This is a maintained fork of the original script by Samuel Harbord
// @exclude		*.wanikani.com
// @include     *.wanikani.com/dashboard*
// @version     2.0.1
// @author      Jonny Dark
// @grant       none

/* This script is licensed under the Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0) license
*  Details: http://creativecommons.org/licenses/by-nc/4.0/ */

//IMPORTANT: IF THIS IS THE FIRST TIME YOU'VE USED THE SCRIPT AND HAVE NEVER UPDATED THEN YOU NEED TO PUT YOUR API KEY BETWEEN THE DOUBLE QUOTES ON THE LINE BELOW.
apiKey = "API KEY HERE";


// CONSTANTS
var RADICAL = 0;
var KANJI   = 1;
var VOCAB   = 2;

var MEANING = 0;
var READING = 1;

var DEBUG   = 7;
var WARNING = 8;
var ERROR   = 9;

// Globals....ewww
var BRLoggingEnabled = (localStorage.getItem("BRLoggingEnabled") == "true");

function BRLog(logdata, level) {
    if (localStorage.getItem("BRLoggingEnabled") != "true") return;
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

function BREnableLogging() {
    BRLoggingEnabled = true;
    localStorage.setItem("BRLoggingEnabled", true);
}

function BRDisableLogging() {
    BRLoggingEnabled = false;
    localStorage.removeItem("BRLoggingEnabled");
}

$("head").append('<script src="https://rawgit.com/WaniKani/WanaKana/master/lib/wanakana.min.js" type="text/javascript"></script>');

function getSection() {
    var strSection = '<div class="span4">\
		<section class="burn-reviews kotoba-table-list dashboard-sub-section" style="z-index: 2; position: relative">\
			<h3 class="small-caps">' + ((!BRLangJP) ? "BURN REVIEWS" : "焦げた復習") + '</h3>\
			<div id="loadingBR" align="center" style="position: relative; background-color: #d4d4d4; margin-top: 0px; padding-top: 42px; height: 99px"></div>\
			<div class="see-more" style="margin-top: -1px">\
				<a href="javascript:void(0)" id="new-item" class="small-caps">' + ((!BRLangJP) ? "NEW ITEM" : "新しい項目") + '</a>\
    		</div>\
    	</section>\
	</div>';
    return strSection;
}

function getFadeCSS() {
    var strFadeIn = '<style type="text/css">\
	.fadeIn {\
        -webkit-animation: fadein 1s;\
                animation: fadein 1s;\
    }\
    @keyframes fadein {\
        from { opacity: 0; }\
        to   { opacity: 0.9; }\
    }\
    @-webkit-keyframes fadein {\
        from { opacity: 0; }\
        to   { opacity: 0.9; }\
    }\
	.fadeOut {\
        -webkit-animation: fadeout 1s;\
                animation: fadeout 1s;\
    }\
    @keyframes fadeout {\
        from { opacity: 0.9; }\
        to   { opacity: 0; }\
    }\
    @-webkit-keyframes fadeout {\
        from { opacity: 0.9; }\
        to   { opacity: 0; }\
    }\
    </style>';
    return strFadeIn;
}

function getButtonCSS() {
    var strButtons = '<style type="text/css">\
    				.brbi div, .brbt div, .brbs div {\
    					background-color: rgb(67, 67, 67);\
						background-image: linear-gradient(to bottom, rgb(85, 85, 85), rgb(67, 67, 67));\
    					color: rgb(98, 98, 98);\
					}\
					.brbi span, .brbtj span {\
						margin-top: 5px\
					}\
                    .brbir.on {\
                    	background-color: #00a0f1; background-image: linear-gradient(to bottom, #0af, #0093dd);\
					}\
    				.brbik.on {\
                    	background-color: #f100a0; background-image: linear-gradient(to bottom, #f0a, #dd0093);\
					}\
					.brbiv.on {\
                    	background-color: #a000f1; background-image: linear-gradient(to bottom, #a0f, #9300dd);\
					}\
					.brbt .on, .brbss.on, .brbsl:hover {\
						background-color: #80c100; background-image: linear-gradient(to bottom, #8c0, #73ad00);\
`					}\
					</style>';
    return strButtons;
}

function appendAdditionalCSS() {
    $(getFadeCSS()).appendTo($("head"));
    $(getButtonCSS()).appendTo($("head"));
    $('<style type="text/css"> .radical-question { height:100%; margin-top:-10px; }</style>').appendTo($("head"));
}

function rand(low, high) {
    return Math.floor(Math.random()*(high+1)) + low;
}


function getBurnReview(firstReview) {

    BRLog("Getting " + (firstReview ? "first" : "") + " burn review");

    curBRAnswered = false;

    $("#user-response").attr("disabled", false).val("").focus();

    if (!firstReview) {

        $(".answer-exception-form").css("display", "none");

        if ((curBRItemType == 0 && curBRProgress > 0) || curBRProgress == 2) {
            newBRItem();
            updateBRItem(true);
        }

        if (curBRItemType > 0 && (curBRProgress < 1 || $("#answer-form fieldset").hasClass("correct"))) {
            if (curBRType == 0) {
                curBRType = 1;
                wanakana.bind(document.getElementById('user-response'));
                $("#user-response").attr({lang:"ja",placeholder:"答え"});
                $("#question-type").removeClass("meaning").addClass("reading");
            } else {
                curBRType = 0;
                wanakana.unbind(document.getElementById('user-response'));
                $("#user-response").removeAttr("lang").attr("placeholder","Your Response");
                $("#question-type").removeClass("reading").addClass("meaning");
            }
        }  else if (curBRItemType == 0) {
            wanakana.unbind(document.getElementById('user-response'));
            $("#user-response").removeAttr("lang").attr("placeholder","Your Response");
            $("#question-type").removeClass("reading").addClass("meaning");
        }
        if (!BRLangJP) document.getElementById("question-type-text").innerHTML = (curBRType == 0) ? "Meaning" : ((curBRItemType == 1) ? ((BRKanjiData[curBRItem]["important_reading"] == "onyomi") ? "Onyomi Reading" : "Kunyomi Reading") : "Reading");
        else document.getElementById("question-type-text").innerHTML = (curBRType == 0) ? "意味" : ((curBRItemType == 1) ? ((BRKanjiData[curBRItem]["important_reading"] == "onyomi") ? "音読み" : "訓読み") : "読み");


        document.getElementById('user-response').value = "";
        $("#answer-form fieldset").removeClass("correct").removeClass("incorrect");

    } else {

        document.getElementById("new-item").onclick = skipItem;

        $("body").prepend('<div id="dim-overlay" style="position: fixed; background-color: black; opacity: 0.75; width: 100%; height: 100%; z-index: 1; margin-top: -122px; padding-bottom: 122px; display: none"></div>');
        BRLog("Overlay applied");

        newBRItem();
        BRLog("Got new item");

        var characterText = (curBRItemType == 0) ? BRRadicalData[curBRItem]["character"] : ((curBRItemType == 1) ? BRKanjiData[curBRItem]["character"] : BRVocabData[curBRItem]["character"]);
        var reviewTypeText;
        if (!BRLangJP) reviewTypeText = ((curBRType < 1) ? "Meaning" : (curBRItemType == 0) ? BRRadicalData[curBRItem]["character"] :
                       ((curBRItemType == 1) ? BRKanjiData[curBRItem]["important_reading"].substring(0, 1).toUpperCase() + BRKanjiData[curBRItem]["important_reading"].substring(1) + " Reading" : "Reading"));
        else reviewTypeText = (curBRType < 1) ? "意味" : (curBRItemType == 0) ? BRRadicalData[curBRItem]["character"] :
                              ((curBRItemType == 1) ? ((BRKanjiData[curBRItem]["important_reading"] == "onyomi") ? "音" : "訓") : "") + "読み";

        strReview = '<div class="answer-exception-form" id="answer-exception" align="center" style="position: absolute; width: 310px; margin-top: 78px; margin-left: 30px; top: initial; bottom: initial; left: initial; display: none"><span>Answer goes here</span></div>\
							<div id="question" style="position: relative; background-color: #d4d4d4; margin-top: -2px; padding-left: 30px; padding-right: 30px; height: 142px">\
							<div class="brbi" style="width: 30px; height: 32px; position: absolute; margin-top: 0px; margin-left: -30px; z-index: 11">\
                                <div class="brbir' + ((BRRadicalsEnabled) ? ' on' : '') + '"><span lang="ja">部</span></div>\
								<div class="brbik' + ((BRKanjiEnabled) ? ' on' : '') + '" style="padding-top: 1px !important"><span lang="ja">漢</span></div>\
                                <div class="brbiv' + ((BRVocabularyEnabled) ? ' on' : '') + '"><span lang="ja">語</span></div>\
                            </div>\
							<div class="brbs" style="width: 15px; height: 70px; position: absolute; margin-top: 70px; margin-left: -30px; z-index: 11">\
								<div class="brbsl" style="height: 35px"><span lang="ja" style="font-size: 10px; ' + ((!BRLangJP) ? 'margin: 5px 0 0 0">Load' : 'margin: 2px 0 0 0">ロード') + '</span></div>\
								<div class="brbss' + ((localStorage.getItem("BRStartButton") !== null) ? ' on' : '') + '" style="height: 35px !important"><span lang="ja" style="margin-top: 2px' + ((!BRLangJP) ? '; font-size: 10px; line-height: 0.9">Start Button' :
                                	'margin-top: 2px; font-size: 11px !important; line-height: 1.1; margin-left: -1px">開始\rボタン') + '</span></div>\
							</div>\
							<div class="brbt" style="width: 30px; position: absolute; margin-left: 310px; z-index: 11">\
								<div class="brbtj' + ((BRLangJP) ? ' on' : '') + '"><span lang="ja" style="margin-top: 4px">日本語</span></div>\
								<div class="brbtr"><span lang="ja" style="' + ((!BRLangJP) ? 'margin-top: 3px; font-size: inherit">Resize' : 'margin-top: 4px; font-size: 10px">拡大する') + '</span></div>\
                            </div>\
                            <div class="brk"><span class="bri" lang="ja">' + characterText + '</span></div>\
							<div id="question-type" style="margin: 0px 0px 0px 0px; height: 33px"><h1 id="question-type-text" align="center" style="margin: -5px 0px 0px 0px; text-shadow: none">' + reviewTypeText + '</h1></div>\
                            <div id="answer-form"><form onSubmit="return false"><fieldset style="padding: 0px 0px 0px 0px; margin: 0px 0px 0px 0px">\
                                <input autocapitalize="off" autocomplete="off" autocorrect="off" id="user-response" name="user-response" placeholder="Your Response" type="text" style="height: 35px; margin-bottom: 0px"></input>\
                                <button id="answer-button" style="width: 0px; height: 34px; padding: 0px 20px 0px 5px; top: 0px; right: 0px" ><i class="icon-chevron-right"></i></button>\
                            </fieldset></form></div>\
                    	</div>\
                    </div>';

	BRLog(strReview);
    	return strReview;
    }
}

function newBRItem() {
    BRLog("Getting new burn item");

    if (BRRadicalsEnabled) {
        if (BRKanjiEnabled) {
            if (BRVocabularyEnabled) {
                curBRItem = rand(1, BRRadicalData.length + BRKanjiData.length + BRVocabData.length - 1);
                curBRItemType = (curBRItem < BRRadicalData.length) ? 0 : ((curBRItem < BRRadicalData.length + BRKanjiData.length) ? 1 : 2);
            } else {
                curBRItem = rand(1, BRRadicalData.length + BRKanjiData.length - 1);
                curBRItemType = (curBRItem < BRRadicalData.length) ? 0 : 1;
            }
        } else {
            if (BRVocabularyEnabled) {
                curBRItem = rand(1, BRRadicalData.length + BRVocabData.length - 1);
                curBRItemType = (curBRItem < BRRadicalData.length) ? 0 : 2;
            } else {
            	curBRItem = rand(1, BRRadicalData.length - 1);
                curBRItemType = 0;
            }
        }
    } else if (BRKanjiEnabled) {
        if (BRVocabularyEnabled) {
            curBRItem = rand(1, BRKanjiData.length + BRVocabData.length - 1);
            curBRItemType = (curBRItem < BRKanjiData.length) ? 1 : 2;
        } else {
            curBRItem = rand(1, BRKanjiData.length - 1);
            curBRItemType = 1;
        }
    } else {
        curBRItem = rand(1, BRVocabData.length - 1);
        curBRItemType = 2;
    }
    if (curBRItemType == 0) curBRType = 0;
    else {
       	curBRType = rand(0, 1);

        if (curBRItemType == 1) {
            if (BRRadicalsEnabled) curBRItem -= BRRadicalData.length;
        } else if (curBRItemType == 2) {
            if (BRRadicalsEnabled) {
                if (BRKanjiEnabled) curBRItem -= (BRRadicalData.length + BRKanjiData.length);
                else curBRItem -= (BRRadicalData.length);
            } else if (BRKanjiEnabled) curBRItem -= BRKanjiData.length;
        }
    }

    curBRProgress = 0;

    BRLog("Burn item type: " + curBRItemType);
    BRLog("Burn item: " + curBRItem);

}

function updateBRItem(updateText) {

    BRLog("Updating Burn review item");
    if (updateText) $(".bri").html(((curBRItemType == 0) ? BRRadicalData[curBRItem]["character"] : (curBRItemType == 1) ? BRKanjiData[curBRItem]["character"] : BRVocabData[curBRItem]["character"]));
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

    var bg = (curBRItemType == 0) ? "#00a0f1" : ((curBRItemType == 1) ? "#f100a0" : "#a000f1");
    var bgi = "linear-gradient(to bottom, ";

    bgi += (curBRItemType == 0) ? "#0af, #0093dd" : ((curBRItemType == 1) ? "#f0a, #dd0093" : "#a0f, #9300dd");
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

//TODO - these functions are quite wet, should be able to dry them out
function fetchAndCacheBurnedRadicalsThen(callback) {
    $.ajax({url:"https://www.wanikani.com/api/user/" + apiKey + "/radicals", dataType:"json"})
        .done(function(response) {
            var burnedRadicalData = response.requested_information.filter(ItemIsBurned);
            BRRadicalData = burnedRadicalData.map(function(radical) {
                return { character : getRadicalCharacter(radical),
                         meaning   : radical.meaning.split(", "),
                         usyn      : radical.user_specific ? radical.user_specific.user_synonyms : null
                };
            });

            localStorage.setItem("burnedRadicals", JSON.stringify(BRRadicalData));
            callback();
        })
        .fail(function() {
            BRLog("Request to WaniKani API failed. Catastrophic failure ermagerd D:", ERROR);
        });
}

function fetchAndCacheBurnedKanjiThen(callback) {
    $.ajax({url:"https://www.wanikani.com/api/user/" + apiKey + "/kanji", dataType:"json"})
        .done(function(response) {
            var burnedKanjiData = response.requested_information.filter(ItemIsBurned);
            BRKanjiData = burnedKanjiData.map(function(kanji) {
                return { character         : kanji.character,
                         meaning           : kanji.meaning.split(", "),
                         onyomi            : kanji.onyomi ? kanji.onyomi.split(", ") : null,
                         kunyomi           : kanji.kunyomi ? kanji.kunyomi.split(", ") : null,
                         important_reading : kanji.important_reading,
                         usyn              : kanji.user_specific ? kanji.user_specific.user_synonyms : null
                };
            });

            localStorage.setItem("burnedKanji", JSON.stringify(BRKanjiData));
            callback();
        })
        .fail(function() {
            BRLog("Request to WaniKani API failed. Catastrophic failure ermagerd D:", ERROR);
        });
}

function fetchAndCacheBurnedVocabThen(callback) {
    $.ajax({url:"https://www.wanikani.com/api/user/" + apiKey + "/vocabulary", dataType:"json"})
        .done(function(response) {
            var burnedVocabData = response.requested_information.general.filter(ItemIsBurned);
            BRVocabData = burnedVocabData.map(function(vocab) {
                return { character : vocab.character,
                         meaning   : vocab.meaning.split(", "),
                         kana      : vocab.kana.split(", "),
                         usyn      : vocab.user_specific ? vocab.user_specific.user_synonyms : null
                };
            });

            localStorage.setItem("burnedVocab", JSON.stringify(BRVocabData));
            callback();
        })
        .fail(function() {
            BRLog("Request to WaniKani API failed. Catastrophic failure ermagerd D:", ERROR);
        });
}

function maybeGetBurnedRadicalsThen(callback) {
    displayRadicalLoadingMessage();

    var RawBRRadicalData = localStorage.getItem("burnedRadicals");
    if (RawBRRadicalData !== null) {
        try {
            BRRadicalData = JSON.parse(RawBRRadicalData);
            if (BRRadicalData.length > 0) {
                return callback();
            }
            BRLog("No burned radicals in cache. Refetching", WARNING);
        }
        catch(e) {
            BRLog("Could not parse cached radical data. Refetching", WARNING);
        }
    }
    return fetchAndCacheBurnedRadicalsThen(callback);
}

function maybeGetBurnedKanjiThen(callback) {
    displayKanjiLoadingMessage();

    var RawBRKanjiData = localStorage.getItem("burnedKanji");
    if (RawBRKanjiData !== null) {
        try {
            BRKanjiData = JSON.parse(RawBRKanjiData);
            if (BRKanjiData.length > 0) {
                return callback();
            }
        }
        catch(e) {
            BRLog("Could not parse cached kanji data. Refetching", WARNING);
        }
    }
    return fetchAndCacheBurnedKanjiThen(callback);
}

function maybeGetBurnedVocabThen(callback) {
    displayVocabLoadingMessage();

    var RawBRVocabData = localStorage.getItem("burnedVocab");
    if (RawBRVocabData !== null) {
        try {
            BRVocabData = JSON.parse(RawBRVocabData);
            if (BRVocabData.length > 0) {
                return callback();
            }
        }
        catch(e) {
            BRLog("Could not parse cached vocab data. Refetching", WARNING);
        }
    }
    return fetchAndCacheBurnedVocabThen(callback);
}

function getBRWKData() {
    BRLog("Getting WaniKana data");

    maybeGetBurnedRadicalsThen(function() {
        maybeGetBurnedKanjiThen(function() {
            maybeGetBurnedVocabThen(function() {

                BRLog("Data items { RadicalData: " + BRRadicalData.length +
                                 "; KanjiData: " + BRKanjiData.length +
                                 "; VocabData: " + BRVocabData.length + "}");

                initBurnReviews();
            })
        })
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
    if (!BRLangJP)
    	$(".answer-exception-form span").html('Are you sure you want to <a href="https://www.wanikani.com/retired/' +
            ((curBRItemType == 0) ? 'radicals/' + BRRadicalData[curBRItem]["character"] : ((curBRItemType == 1) ? 'kanji/' + BRKanjiData[curBRItem]["character"] :
            'vocabulary/' +  BRVocabData[curBRItem]["character"])) + '?resurrect=true" target="_blank" class="btn btn-mini resurrect-btn" data-method="put" rel="nofollow">Resurrect</a> the ' +
    		((curBRItemType == 1) ? 'kanji item "' + BRKanjiData[curBRItem]["character"] : 'vocabulary item "' + BRVocabData[curBRItem]["character"]) + '"?');
   	else
        $(".answer-exception-form span").html(((curBRItemType == 0) ? '部首「' : ((curBRItemType == 1) ? '漢字「' + BRKanjiData[curBRItem]["character"] : '単語「' + BRVocabData[curBRItem]["character"]))  + '」を' +
            '<a href="https://www.wanikani.com/retired/' +　((curBRItemType == 0) ? 'radicals/' + BRRadicalData[curBRItem]["character"] : ((curBRItemType == 1) ? 'kanji/' + BRKanjiData[curBRItem]["character"] :
        	'vocabulary/' +  BRVocabData[curBRItem]["character"])) + '?resurrect=true" target="_blank" class="btn btn-mini resurrect-btn" data-method="put" rel="nofollow">復活</a>する<br />本当によろしいですか？');

    document.getElementById("answer-exception").onclick = "return false";
    return false;
}

function appendReviewsStyleSheets() {
    BRLog("Getting the review page stylesheet...")
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
        });
}


function initBurnReviews() {

     BRLog("Data items { RadicalData: " + Object.keys(BRRadicalData).length +
                         "; KanjiData: " + Object.keys(BRKanjiData).length +
                         "; VocabData: " + Object.keys(BRVocabData).length + "}");


    BRLog("Initialising the Burn Review widget");

    useCache = false;
    $("#loadingBR").remove();

    // Get the stylesheet from the reviews page and append it to the head
    appendReviewsStyleSheets();

    //Undo conflicting CSS from above import
    BRLog("Undoing conflicting CSS");
    $("head").append('<style type="text/css">.srs { width: 236px } menu, ol, ul { padding: 0 }</style>');
    appendAdditionalCSS();
    $("ul").css("padding-left", "0px");

    BRLog("Adding burn review section");
    if ($(getBurnReview(true)).insertAfter($(".burn-reviews.kotoba-table-list.dashboard-sub-section h3")).length) { //TODO: remove this logging condition
        BRLog("Successfully added question section");
    }
    else {
        BRLog("Did not add question section!", ERROR);
    }

    document.getElementById("answer-button").onclick = submitBRAnswer;
    updateBRItem(false);
    if (curBRType == 0) {
        wanakana.unbind(document.getElementById('user-response'));
        $("#user-response").removeAttr("lang").attr("placeholder","Your Response");
        $("#question-type").addClass("meaning");
    } else {
        wanakana.bind(document.getElementById('user-response'));
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
                    if (curBRItemType == 0) skipItem();
                } else if ($(this).attr("class") == "brbik on") {
                    localStorage.setItem("BRKanjiEnabled", false);
                    BRKanjiEnabled = false;
                    if (curBRItemType == 1) skipItem();
                } else if ($(this).attr("class") == "brbiv on") {
                    localStorage.setItem("BRVocabularyEnabled", false);
                    BRVocabularyEnabled = false;
                    if (curBRItemType == 2) skipItem();
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
        curBRItem = -1;
        curBRType = -1;
        curBRItemType = -1;
        curBRProgress = 0;
        curBRAnswered = false;
        queueBRAnim = false;
        allowQueueBRAnim = true;
        BRRadicalData = "";
        BRKanjiData = "";
        BRVocabData = {};
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
    $(".brbi div span, .brbs div span, .brbt div span").css({"-ms-writing-mode": "tb-rl", "-webkit-writing-mode": "vertical-rl", "-moz-writing-mode": "vertical-rl", "-ms-writing-mode": "vertical-rl", "writing-mode": "vertical-rl",
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

    if ($("#question").length === 1) {
        BRLog("Question display : " + $("#question").css("display"));
        BRLog("Question visible : " + $("#question").css("visible"));
        BRLog("Question height  : " + $("#question").height());
        BRLog("Question position: " + $("#question").css("position"));
        BRLog("Question location: " + JSON.stringify($("#question").position()));
        BRLog("Question parent  : " + $('#question').parent()[0].outerHTML.split($('#question').html())[0]);
    }
    else {
        BRLog("Question box not present in DOM!", ERROR);
    }

}

function switchBRLang() {

    BRLangJP = !BRLangJP;

    if (BRLangJP) {
        document.getElementById("question-type-text").innerHTML = (curBRType == 0) ? "意味" : document.getElementById("question-type-text").innerHTML.replace("Reading", "読み").replace("Onyomi ", "音").replace("Kunyomi ", "訓");
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
                    $(".answer-exception-form span").html(((curBRItemType == 0) ? '部首「' : ((curBRItemType == 1) ? '漢字「' + BRKanjiData[curBRItem]["character"] : '単語「' + BRVocabData[curBRItem]["character"]))  + '」を' +
                    '<a href="https://www.wanikani.com/retired/' +　((curBRItemType == 0) ? 'radicals/' + BRRadicalData[curBRItem]["character"] : ((curBRItemType == 1) ? 'kanji/' + BRKanjiData[curBRItem]["character"] :
                    'vocabulary/' +  BRVocabData[curBRItem]["character"])) + '?resurrect=true" target="_blank" class="btn btn-mini resurrect-btn" data-method="put" rel="nofollow">復活</a>する<br />本当によろしいですか？');
                else {
                    var txtPrev = $(".answer-exception-form span").html().toString();
                    $(".answer-exception-form span").html('解答は<br />「' + txtPrev.substring(txtPrev.indexOf('"') + 1, txtPrev.indexOf('"', txtPrev.indexOf('"') + 1)) + '」であった。<br />この項目を<a href="#"' +
                    ' class="btn btn-mini resurrect-btn">復活</a>したいか？');
                	document.getElementById("answer-exception").getElementsByTagName("span")[0].getElementsByTagName("a")[0].onclick = confirmRes;
                }
            }
        }
    } else {
        document.getElementById("question-type-text").innerHTML = (curBRType == 0) ? "Meaning" : document.getElementById("question-type-text").innerHTML.replace("読み", "Reading").replace("音", "Onyomi ").replace("訓", "Kunyomi ");
        $(".burn-reviews.kotoba-table-list.dashboard-sub-section h3").html("BURN REVIEWS");
        $("#new-item").html("NEW ITEM");
        $(".brbsl span").css("margin", "5px 0 0 -1px").html("Load");
        $(".brbss span").css({"line-height": "0.9", "margin-left": "1px"}).html("Start Button");
        $(".brbtr span").css({"font-size": "inherit", "margin-top": "3px"}).html("Resize");
        if ($("#answer-exception").css("display") !== "none") {
            if (!$("#answer-exception").hasClass("fadeOut") && !curBRAnswered) $(".answer-exception-form span").html("Oops! You entered the wrong reading.");
            else {
               if ($(".answer-exception-form span").html().toString().indexOf("る本") > 1)
                    $(".answer-exception-form span").html('Are you sure you want to <a href="https://www.wanikani.com/retired/' +
                    ((curBRItemType == 0) ? 'radicals/' + BRRadicalData[curBRItem]["character"] : ((curBRItemType == 1) ? 'kanji/' + BRKanjiData[curBRItem]["character"] :
                    'vocabulary/' +  BRVocabData[curBRItem]["character"])) + '?resurrect=true" target="_blank" class="btn btn-mini resurrect-btn" data-method="put" rel="nofollow">Resurrect</a> the ' +
                    ((curBRItemType == 1) ? 'kanji item "' + BRKanjiData[curBRItem]["character"] : 'vocabulary item "' + BRVocabData[curBRItem]["character"]) + '"?');
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

    if (curBRType == MEANING)
    {
        var dataBank = [BRRadicalData, BRKanjiData, BRVocabData][curBRItemType];
        answers = dataBank[curBRItem]["meaning"];
    }
    else
    {
        if (curBRItemType == KANJI)
        {
            var importantReading = BRKanjiData[curBRItem]["important_reading"];
            answers = BRKanjiData[curBRItem][importantReading];
        }
        else
        {
            answers = BRVocabData[curBRItem]["kana"];
        }
    }

    if (curBRType == MEANING) {
        if (curBRItemType == 0 && BRRadicalData[curBRItem]["usyn"] !== "null") answers = answers.concat(BRRadicalData[curBRItem]["usyn"]);
        else if (curBRItemType == 1 && BRKanjiData[curBRItem]["usyn"] !== "null") answers = answers.concat(BRKanjiData[curBRItem]["usyn"]);
        else if (BRVocabData[curBRItem]["usyn"] !== "null") answers = answers.concat(BRVocabData[curBRItem]["usyn"]);
    }

    if (answers instanceof Array) {
        for (var a = 0; a < Object.keys(answers).length; a++) {
            if (response == answers[a]) match = true;
        }
    } else if (response == answers) match = true;

    if (((curBRType == 0 && isAsciiPresent(response)) || (!isAsciiPresent(response) && curBRType == 1)) && response !== "") {

        //alert(((BRKanjiData[curBRItem]["important_reading"] == "onyomi") ? BRKanjiData[curBRItem]["kunyomi"] : BRKanjiData[curBRItem]["onyomi"]));

        if (!match && curBRItemType == 1 && curBRType == 1 && ((BRKanjiData[curBRItem]["important_reading"] == "onyomi" &&
       		compareKunyomiReading(response, BRKanjiData[curBRItem]["kunyomi"]) == true) || (BRKanjiData[curBRItem]["important_reading"] == "kunyomi" && response == BRKanjiData[curBRItem]["onyomi"]))) {

       		if (!BRLangJP) $(".answer-exception-form span").html("Oops! You entered the wrong reading.");
            else $(".answer-exception-form span").html("おっと、異なる読みを入力してしまった。");
            $(".answer-exception-form").css({"display": "block"}).addClass("animated fadeInUp").delay(5000).queue(function(){
    			$(this).addClass("fadeOut").dequeue().delay(800).queue(function(){
                    $(this).removeClass("fadeOut").css("display", "none").dequeue();
                });
			});
            $("#user-response").attr("disabled", false);

        } else {

            //alert(evaluate(((curBRType == 0) ? "meaning" : "reading"),$("#user-response").val()).join(","));

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
        //$("#answer-form").effect( "shake", {}, 100 );
        $("#user-response").attr("disabled", false);
    }
}

function compareKunyomiReading(input, reading) {
    var match = false;

    //alert(input + " " + reading + " " + reading.toString().substring(0, reading.indexOf(".")));

          if (input == reading || input == reading.toString().substring(0, reading.indexOf(".")) || input == reading.toString().replace("*", input.substring(reading.indexOf(".") + 1)).replace(".", "")) match = true;

    return match;
}

function submitBRAnswer() {
    if (!curBRAnswered) checkBurnReviewAnswer();
    else getBurnReview(false);
}

function evaluate(e,t){
     var n,r,i,s,o,u,a,f,l,c,h;
     i=[];
     u=[];
     s=((curBRItemType == 1) ? BRKanjiData[curBRItem]["character"] : BRVocabData[curBRItem]["character"]);
     n=!1;
     l=!1;
     f=!1;
     o=!1;
     t=$.trim(t);
     e==="reading"&&(t=t.replace("n","ん"));
     $("#user-response").val(t);
     if(e==="reading"){
         s.kan?(s.emph==="onyomi"?(i=s.on,u=s.kun):(i=s.kun,u=s.on), o=checkIfOtherKanjiReading(t,u,i)):s.voc&&(i=s.kana);
         i.length>1&&(f=!0);
         for(a in i)
             r=i[a];
         t===r&&(l=!0,n=!0);
     } else {
         i=$.merge(s.en,s.syn);
         i.length>1&&(f=!0);
         t=stringFormat(t);
         for(a in i)
             r=i[a];
         r=stringFormat(r);
         h=levenshteinDistance(r,t);
         c=distanceTolerance(r);
         h<=c&&(l=!0);
         h===0&&(n=!0);
     } return {passed:l,accurate:n,multipleAnswers:f,exception:o};
}

function checkIfOtherKanjiReading(e,t,n){
    var r,i,s;
    s=!1;
    for(i in t)r=t[i];
    e===r.replace(/\..*/,"")&&(s=!0);
    for(i in n)
        r=n[i];
    e===r&&(s=!1);
    return s;
}

function isAsciiPresent(e){
    return (curBRType == 0) ? !/[^a-z \-0-9]/i.test(e) : /[^ぁ-ー0-9 ]/.test(e);
    //e=e[e.length-1]==="n"?e.slice(0,-1):e;
}

function stringFormat(e){
    return e=e.toLowerCase().replace("-"," ").replace(".","").replace("'","");
    e.substr(-1)==="s"&&(e=e.slice(0,-1)),e;
}

function distanceTolerance(e){
    switch(e.length){
        case 1:case 2:case 3:return 0;
        case 4:case 5:return 1;
        case 6:case 7:return 2;
        default:return 2+Math.floor(e.length/7)*1;
    }
}

document.addEventListener('keydown', function(event) {
    if(event.keyCode == 13) { //Enter
        if (curBRAnswered) getBurnReview(false);
	}
 });

cancelExecution = false;

if (localStorage.getItem("apiKey") !== null && localStorage.getItem("apiKey").length == 32) apiKey = localStorage.getItem("apiKey");
else if (apiKey.length == 32) localStorage.setItem("apiKey", apiKey);
else {
    cancelExecution = true;
    alert("Please enter your API key near the top of the WanaKani Burn Reviews userscript.");
}

if (!cancelExecution) {

    BREnableLogging();
    BRLog("Running!");

    useCache = (localStorage.getItem("burnedRadicals") == null || localStorage.getItem("burnedKanji") == null || localStorage.getItem("burnedVocab") == null) ? false : true;
	BRIsChrome = (navigator.userAgent.toLowerCase().indexOf('chrome') > -1);
    curBRItem = -1;
    curBRType = -1;
    curBRItemType = -1;
    curBRProgress = 0;
    curBRAnswered = false;
    queueBRAnim = false;
    allowQueueBRAnim = true;
    BRLangJP = (localStorage.getItem("BRLangJP") == null) ? false : true;
    BRRadicalsEnabled = (localStorage.getItem("BRRadicalsEnabled") !== null) ? false : true;
    BRKanjiEnabled = (localStorage.getItem("BRKanjiEnabled") !== null) ? false : true;
    BRVocabularyEnabled = (localStorage.getItem("BRVocabularyEnabled") !== null) ? false : true;
    BRRadicalData = "";
    BRKanjiData = "";
    BRVocabData = {};

    String.prototype.trim = function() {
        return(this.replace(/^ +/,'').replace(/ +$/,''));
    }

    $(".low-percentage.kotoba-table-list.dashboard-sub-section").parent().wrap('<div class="col" style="float: left"></div>');
    $("<br />" + getSection() + "<!-- span4 -->").insertAfter($(".low-percentage.kotoba-table-list.dashboard-sub-section").parent());

    if (!BRLangJP) $("#loadingBR").html('<a lang="ja" href="javascript:void(0)" style="font-size: 52px; color: #434343; text-decoration: none">Start</a>');
    else $("#loadingBR").html('<a lang="ja" href="javascript:void(0)" style="font-size: 52px; color: #434343; text-decoration: none">開始</a>');
    $("#loadingBR a").click( function() {

        BRLog("Loading...");
        if (!useCache) clearBurnedItemData();

        var checkReady = setInterval(function() {
            BRLog("Checking for wanikana...");
            if (wanakana !== undefined) {
                clearInterval(checkReady);
                getBRWKData();
            }
        }, 250);

        String.prototype.trim = function() {
            return(this.replace(/^ +/,'').replace(/ +$/,''));
        }

    });

    if (localStorage.getItem("BRStartButton") == null) $("#loadingBR a").click();

}
// ==/UserScript==
