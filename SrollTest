// ==UserScript==
// @name         Vine Viewer Preload test
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
    // Holen Sie sich den Link aus productInfo.Link
    var url = "https://www.amazon.de/vine/vine-items?queue=encore&pn=&cn=";
    var page = 2;
    var nextPage;
    var maxPage;
    var allowPreload = true;
    var loadAllActive = false;
    await startup();
    for(var x = 0; x < 0; x++){
        await preload();
    }
    function startup(){
        getMaxPage();
        addSearchBar();
        addLoadAll();
    };

    var container = document.getElementById('vvp-items-grid'); // Ändern Sie dies entsprechend Ihrer HTML-Struktur
    var distanceToBottom = 800; // Der Abstand in Pixeln, bei dem die nächste Seite geladen wird
    var loading = false; // Eine Variable, um den Ladezustand zu überwachen

    window.addEventListener('scroll', function() {
        if (!loading && allowPreload) {
            var containerRect = container.getBoundingClientRect();
            var windowHeight = window.innerHeight || document.documentElement.clientHeight;
            var distanceFromBottom = containerRect.bottom - windowHeight;

            if (distanceFromBottom < distanceToBottom) {
                console.log("Scrolling");
                loading = true; // Setzen Sie den Ladezustand auf true, um Mehrfachladungen zu verhindern
                // Laden Sie die nächste Seite hier (z.B., rufen Sie die preload-Funktion auf)
                if(page <= maxPage){
                    preload().then(function() {
                        loading = false; // Setzen Sie den Ladezustand zurück, wenn das Laden abgeschlossen ist
                        page++;
                    });
                }
            }
        }
    });


    // Your code here...
    function preload(){// Führen Sie eine GM.xmlHttpRequest aus, um die Seite aufzurufen
        return new Promise(function(resolve, reject) {
            if(allowPreload){
                var itemsurl = url + "&page=" + page;
                console.log(itemsurl);
                GM.xmlHttpRequest({
                    method: "GET",
                    url: itemsurl,
                    onload: function(response) {
                        if (response.status === 200) {
                            // Die Seite wurde erfolgreich abgerufen
                            var parser = new DOMParser();
                            var doc = parser.parseFromString(response.responseText, "text/html");

                            // Finden Sie das Element mit der Klasse 'a-price' und lesen Sie den Text
                            var itemsContainer = doc.querySelector('#vvp-items-grid');
                            if (itemsContainer) {
                                console.log("Produkte: ", itemsContainer);

                                // Finden Sie das Zielfeld auf der Hauptseite
                                var targetDiv = document.getElementById('vvp-items-grid');
                                if (targetDiv) {
                                    // Durchlaufen Sie jedes <div> mit der Klasse 'vvp-item-tile' innerhalb von itemsContainer
                                    var divs = itemsContainer.querySelectorAll('div.vvp-item-tile');
                                    var preloadmarker = document.createElement('span');
                                    preloadmarker.id = "preloadmarker-nextpage";
                                    preloadmarker.hidden = true;
                                    nextPage = page + 1;
                                    preloadmarker.textContent = nextPage;
                                    targetDiv.appendChild(preloadmarker);
                                    divs.forEach(function(div) {
                                        // Hier können Sie auf jedes <div> mit der Klasse 'vvp-item-tile' zugreifen und damit arbeiten

                                        // Kopieren und an das Zielfeld auf der Hauptseite anhängen
                                        targetDiv.appendChild(div.cloneNode(true));
                                    });
                                    var tiles = document.querySelectorAll(".vvp-item-tile");
                                    var count = tiles.length;
                                    var displayCount = document.querySelector("#vvp-items-grid-container > p > strong");
                                    displayCount.textContent = "1 - " + count;
                                    //search();
                                    resolve();
                                } else {
                                    console.log("Zielfeld mit ID 'vvp-items-grid' auf der Hauptseite wurde nicht gefunden.");
                                    resolve();
                                }
                            } else {
                                console.log("Das Element mit der Klasse 'a-price' wurde nicht gefunden.");
                                resolve();
                            }
                        } else {
                            console.log("Fehler beim Abrufen der Seite. Statuscode:", response.status);
                            resolve();
                        }
                    }
                });
            }
        });
    }

    // Funktion zum Speichern der maximalen Seite
    function getMaxPage(){
        // Elelement, welche die höchste Seitenzhl enthält
        var pagination = document.querySelector('.a-pagination');
        if(pagination != null) {

            // Seitenzahl aus dem Element laden
            maxPage = parseInt(pagination.lastChild.previousSibling.lastChild.textContent.trim());
            // Speichern der Seitenzahl in den lokalen Speicher
            localStorage.setItem("maxPage", maxPage);
            console.log('Max Page:', maxPage);
            document.querySelector(".a-pagination").remove();
        }
    }

    function addSearchBar(){
        var searchBarParent = document.getElementById("vvp-items-button-container");

        var searchBarContainer = document.createElement('span');
        searchBarContainer.style.margin = "0.385em";

        var searchBarInput = document.createElement('input');
        searchBarInput.type = "text";
        searchBarInput. placeholder = "Suche"

        var searchBarButton = document.createElement('button');
        searchBarButton.textContent = "Suche";
        searchBarButton.type = "submit";

        searchBarParent.appendChild(searchBarContainer);

        searchBarContainer.appendChild(searchBarInput);
        searchBarContainer.appendChild(searchBarButton);

        searchBarInput.addEventListener("keyup", function(event) {
            if (event.keyCode === 13) {
                // Wenn die Enter-Taste gedrückt wurde, Button klicken
                search();
            }
        });

        searchBarInput.addEventListener("change", function(event) {
            search();
        });

        function search() {
            var filterData = [];
            var filter = searchBarInput.value.toLowerCase();

            var tiles = document.querySelectorAll(".vvp-item-tile");
            var count = tiles.length;
            console.log("Anzahl der Elemente: " + count);

            if(filter == ""){
                allowPreload = true;
            }else{
                allowPreload = false;
            }
            console.log("Preload: " + allowPreload);

            for (var sc = 0; sc <= (count - 1); sc++){
                var titel = tiles[sc].querySelector('.a-truncate-full').textContent;
                if (titel.toLowerCase().includes(filter.toLowerCase())) {
                    tiles[sc].hidden = false;
                }else{
                    tiles[sc].hidden = true;
                }
            }
        }

    }

    function addLoadAll(){
        var ButtonParent = document.getElementById("vvp-items-button-container");

        var LoadButtonContainer = document.createElement('span');
        LoadButtonContainer.style.margin = "0.385em";

        if(maxPage != undefined){
            var LoadButton = document.createElement('button');
            LoadButton.textContent = maxPage + " Seiten Laden";
        }
        ButtonParent.appendChild(LoadButtonContainer);

        if(maxPage != undefined){
            LoadButtonContainer.appendChild(LoadButton);

            LoadButton.addEventListener("click", function(event) {
                if(loadAllActive){
                    x = 999999;
                }else{
                    loadAll();
                }
            });
        }

        async function loadAll(){
            loadAllActive = true;
            //maxPage = 15;
            for(x = page; x <= maxPage;x++){ //maxPage
                LoadButton.textContent = "Lade " + x + "/" + maxPage;
                console.log("Lade Seite: " + page);
                console.log("For Counter: " + x);
                await preload().then(function() {
                    loading = false; // Setzen Sie den Ladezustand zurück, wenn das Laden abgeschlossen ist
                    page++;
                });
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
            if(x == maxPage + 1){
                LoadButton.textContent = "Alles geladen";
            }else{
                LoadButton.textContent = "Laden abgebrochen";
            }
            LoadButton.disabled = true;
        }
    }



})();
