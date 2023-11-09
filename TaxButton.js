// ==UserScript==
// @name         Vine Viewer Tax View
// @namespace    http://tampermonkey.net/
// @version      1
// @description  Erweiterung der Produkt Übersicht von Amazon Vine
// @author       Christof
// @match        *://www.amazon.de/vine/*
// @match        *://amazon.de/vine/*
// @match        *://www.amazon.de/-/en/vine/*
// @license      MIT
// @grant         GM.xmlHttpRequest
// @grant         GM.openInTab
// @grant       unsafeWindow
// @connect greasyfork.org
// ==/UserScript==

(async function() {
    'use strict';
    var tiles = document.querySelectorAll(".vvp-item-tile");
    var count = tiles.length;
    var encodedURL;
    tiles.forEach(function(element){
            //https://www.amazon.de/vine/api/recommendations/[recommandationID]/item/[ASIN]
        var recommandationId = element.getAttribute("data-recommendation-id");
        var asinElement = element.querySelector("div > span > span > input");
        var asin = asinElement.getAttribute("data-asin");
        //div > span > span > input data-asin
        //console.log(recommandationId);
        //console.log(asin);
        var url = "https://www.amazon.de/vine/api/recommendations/" + recommandationId + "/item/" + asin
        encodedURL = url.replace(/#/g, '%23');
        var taxButton = document.createElement('button');
        taxButton.textContent = "Tax";
        taxButton.setAttribute("data-apiUrl", encodedURL);

        element.appendChild(taxButton);

        taxButton.addEventListener("click", function(event) {
            var apiUrl = taxButton.getAttribute("data-apiUrl");

            apiRequest(apiUrl).then(taxValue => {
                console.log("Tax Value:", taxValue);
                taxButton.textContent = taxValue + "€";
            }).catch(err => {
                console.error("Fehler:", err);
            });
        });

    });

    async function apiRequest(url) {
        try {
            const response = await new Promise((res, rej) => {
                GM.xmlHttpRequest({
                    url: url,
                    onload: res,
                    onerror: rej,
                });
            });

            const data = JSON.parse(response.responseText);
            return data.result.taxValue;
        } catch (error) {
            console.error("Fehler bei der API-Anfrage:", error);
            throw error;
        }
    }

})();
