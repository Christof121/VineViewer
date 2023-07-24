// ==UserScript==
// @name         Amazon Vine viewer
// @namespace    http://tampermonkey.net/
// @version      0.9.1
// @description  Hervorheben von bereits vorhandenen Produkten bei Amazon Vine
// @author       Christof
// @match        *://www.amazon.de/vine/*
// @match        *://amazon.de/vine/*
// @match        *://www.amazon.de/-/en/vine/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    var debug = false;
    var redirectMinTime = 5;
    var redirectMaxTime = 30;
    var url;
    var allData;
    let redirectTimeout;

    'use strict';
    // CSS für die grüne Leiste
    var greenBarCSS = `
  /* position: fixed; */
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  background-color: green;
  color: white;
  font-weight: bold;
  z-index: 9999; /* erhöhter z-index für die grüne Leiste */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-left: 10px;
  padding-right: 10px;
  `;

    // CSS für den Schalter
    var toggleSwitchCSS = `
    height: 13px !important;
    width: 13px !important;
    vertical-align: middle !important;
    position: static !important;
    bottom: 0 !important;
    margin-left: 10px;

`;

    // CSS für den Schalter
    var ScanPageInputCSS = `
    height: 100% !important;
    width: 60px !important;
    vertical-align: middle !important;
    position: static !important;
    bottom: 0 !important;
    margin-left: 10px;

`;

    // CSS für den Button zum Löschen der Daten
    var deleteButtonCSS = `
    height: 20px;
    line-height: 20px;
    padding: 0 10px;
    background-color: transparent;
    border: none;
    color: white;
    cursor: pointer;
    `;

    // CSS für den Button zum Löschen der Daten
    var updateButtonCSS = `
    height: 20px;
    line-height: 20px;
    padding: 0 10px;
    background-color: transparent;
    border: none;
    color: white;
    cursor: pointer;
    `;

    // CSS für die hervorgehobenen Produkte
    var highlightedProductCSS = `
    background-color: lightgreen !important;
    border: 1px solid black;
    `;

    // CSS für das hinzugefügte Datumselement
    var dateElementCSS = `
    display: inline-flex;
    justify-content: center;
    height: auto;
    width: 90%;
    `;

    // CSS für das hinzugefügte Favorite Icon
    var favElementCSS = `
    display: inline-flex;
    justify-content: center;
    height: auto;
    font-size: 3vh;
    width: 10%
    `;

    var favElementCSShighlighted = `
    color: yellow;
    `;

    //Einstellungen der IndexedDB
    const dbName = "VineData";
    const dbVersion = 1;
    const objectStoreName = "Products";

    // Verbindungsaufbau zur Datenbank

    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = function(event) {
        console.log("Fehler beim Öffnen der Datenbank");
    };

    request.onsuccess = function(event) {
        console.log("Verbindung zur Datenbank hergestellt");
        main();
    };

    // Falls neue Version von Datenbank vorhanden
    request.onupgradeneeded = function(event) {
        const db = event.target.result;
        const objectStore = db.createObjectStore(objectStoreName, { keyPath: "ID" });
        console.log("Problem mit der Datenbank");
    };



    // Funktion zum Erstellen der grünen Leiste
    async function createGreenBar() {
        var greenBar = document.createElement('div');
        greenBar.setAttribute('id', 'green-bar');
        greenBar.style.cssText = greenBarCSS;

        var toggleDiv = document.createElement('div');
        toggleDiv.style.display = 'flex';
        toggleDiv.style.alignItems = 'center';

        var toggleSwitch = document.createElement('input');
        toggleSwitch.setAttribute('type', 'checkbox');
        toggleSwitch.style.cssText = toggleSwitchCSS;
        toggleSwitch.addEventListener('change', function() {
            toggleHighlightVisibility(this.checked);
            saveHighlightVisibility(this.checked);
        });

        var toggleLabel = document.createElement('label');
        toggleLabel.textContent = 'Ausblenden';
        toggleLabel.style.marginLeft = '5px';
        toggleLabel.style.userSelect = 'none';

        toggleDiv.appendChild(toggleSwitch);
        toggleDiv.appendChild(toggleLabel);

        var toggleScanSwitch = document.createElement('input');
        toggleScanSwitch.setAttribute('type', 'checkbox');
        toggleScanSwitch.style.cssText = toggleSwitchCSS;
        toggleScanSwitch.addEventListener('change', function() {
            toggleScanVisibility(this.checked);
            saveScanVisibility(this.checked);
        });

        var toggleScanLabel = document.createElement('label');
        toggleScanLabel.textContent = 'Nur Sichtbares Cachen';
        toggleScanLabel.style.marginLeft = '5px';
        toggleScanLabel.style.userSelect = 'none';

        toggleDiv.appendChild(toggleScanSwitch);
        toggleDiv.appendChild(toggleScanLabel);

        var ScanPageInput = document.createElement('input');
        if(localStorage.getItem('scanToPage') != undefined){
            var scanToPage = localStorage.getItem('scanToPage');
        }else{
            scanToPage = getMaxPage();
        }
        if(localStorage.getItem("autoScan")=="true"){
            ScanPageInput.setAttribute('disabled' , 'true');
        }
        ScanPageInput.setAttribute('type', 'number');
        ScanPageInput.setAttribute('maxlength', '3');
        ScanPageInput.style.cssText = ScanPageInputCSS;
        ScanPageInput.value = scanToPage;
        ScanPageInput.addEventListener('change', function() {
            console.log("Input");
            var valid = checkScanPageInput(this.value);
            if(!valid){
                this.value = getMaxPage();
            }
        });

        var scanButton = document.createElement('button');
        var buttonText = "Start Scan";
        if(localStorage.getItem("autoScan")=="true"){
            buttonText = "Stop Scan";
        }
        scanButton.textContent = buttonText;
        scanButton.style.marginLeft = '10px';
        scanButton.addEventListener('click', function() {
            AutoScanStart(ScanPageInput.value);
        });
        toggleDiv.appendChild(ScanPageInput);
        toggleDiv.appendChild(scanButton);

        var titleDiv = document.createElement('div');
        titleDiv.style.display = 'flex';
        titleDiv.style.alignItems = 'center';

        var title = document.createElement('span');
        title.textContent = 'Amazon Vine viewer';
        title.style.marginRight = '10px';

        titleDiv.appendChild(title);

        var buttonDiv = document.createElement('div');
        buttonDiv.style.display = 'flex';
        buttonDiv.style.alignItems = 'center';

        var versionButton = document.createElement('a');
        versionButton.textContent = 'Version: ' + GM_info?.script?.version + ' update?';
        versionButton.style.cssText = updateButtonCSS;
        versionButton.href = 'https://greasyfork.org/de/scripts/471094-amazon-vine-viewer';
        versionButton.target = '_blank';


        var deleteButton = document.createElement('button');
        var cachedProductsCount = allData.length;
        deleteButton.textContent = cachedProductsCount + ' Daten löschen';
        deleteButton.style.cssText = deleteButtonCSS;
        deleteButton.addEventListener('click', function() {
            var confirmation = confirm('Möchten Sie wirklich alle Daten löschen?');
            if (confirmation) {
                clearCachedData();
            }
        });

        buttonDiv.appendChild(versionButton);
        buttonDiv.appendChild(deleteButton);

        greenBar.appendChild(toggleDiv);
        greenBar.appendChild(titleDiv);
        greenBar.appendChild(buttonDiv);

        document.body.prepend(greenBar);

        var highlightVisibility = getHighlightVisibility();
        toggleSwitch.checked = highlightVisibility;
        toggleHighlightVisibility(highlightVisibility);

        var scanVisibility = getScanVisibility();
        toggleScanSwitch.checked = scanVisibility;
    }

    function checkScanPageInput(value) {
        var maxPage = getMaxPage();
        if(value > maxPage){
            console.log("Eingabe fehlerhaft");
            return false;
        }
        return true;
        console.log("Eingabe: " + value);
    }

    // Funktion zum Ein- oder Ausblenden der hervorgehobenen Divs
    function toggleHighlightVisibility(checked) {
        var highlightedDivs = document.getElementsByClassName('highlighted');

        for (var i = 0; i < highlightedDivs.length; i++) {
            var div = highlightedDivs[i];
            div.style.display = checked ? 'none' : 'block';
        }
    }

    function toggleScanVisibility(checked) {
        //var highlightedDivs = document.getElementsByClassName('highlighted');

        //for (var i = 0; i < highlightedDivs.length; i++) {
        //  var div = highlightedDivs[i];
        //div.style.display = checked ? 'none' : 'block';
        //}
    }

    // Funktion zum Speichern der Auswahl des Schalters
    function saveHighlightVisibility(checked) {
        localStorage.setItem('highlightVisibility', checked);
    }

    // Funktion zum Abrufen der Auswahl des Schalters
    function getHighlightVisibility() {
        var highlightVisibility = localStorage.getItem('highlightVisibility');
        return highlightVisibility === 'true'; // Konvertiere den Wert in einen booleschen Wert
    }

    function saveScanVisibility(checked) {
        localStorage.setItem('scanVisibility', checked);
    }

    // Funktion zum Abrufen der Auswahl des Schalters
    function getScanVisibility() {
        var scanVisibility = localStorage.getItem('scanVisibility');
        return scanVisibility === 'true'; // Konvertiere den Wert in einen booleschen Wert
    }

    // Funktion zum Löschen der gespeicherten Daten
    function clearCachedData() {
        localStorage.removeItem('cachedProductIDs');

        const request = indexedDB.open(dbName, dbVersion);

        request.onerror = function(event) {
            console.log("Fehler beim Öffnen der Datenbank");
        };

        request.onsuccess = function(event) {
            const db = event.target.result;

            const transaction = db.transaction([objectStoreName], "readwrite");
            const objectStore = transaction.objectStore(objectStoreName);

            const clearRequest = objectStore.clear();

            clearRequest.onsuccess = function(event) {
                console.log("Datenbankinhalt gelöscht");
            };

            clearRequest.onerror = function(event) {
                console.log("Fehler beim Löschen des Datenbankinhalts");
            };
        };




        location.reload(); // Seite neu laden, um die Änderungen anzuzeigen
    }

    // Funktion zum Hervorheben der gecachten Produkte und Anzeigen des Datums
    async function highlightCachedProducts() {
        var productTiles = document.getElementsByClassName('vvp-item-tile');
        var cachedProductIDs = await getCachedProductIDs();
        for (var i = 0; i < productTiles.length; i++) {
            var productTile = productTiles[i];
            var productID = getProductID(productTile);
            //if(await checkForIDInDatabase(productID)){
            if(cachedProductIDs.includes(productID)){
                const productInfo = allData.find(data => data.ID === productID);
                //if (cachedProductIDs.includes(productID)) {
                productTile.classList.add('highlighted');
                productTile.style.backgroundColor = 'lightgreen';

                var date = productInfo.Datum;
                //var date = await getSavedDate(productID);
                addDateElement(productTile, date);
            }
        }
    }

    // Funktion zum Hinzufügen des Datums zu einem Produkt-Tile
    function addDateElement(productTile, date) {
        var dateElement = document.createElement('div');
        dateElement.classList.add('highlightCachedProducts');
        dateElement.textContent = date;
        dateElement.style.cssText = dateElementCSS;

        var contentContainer = productTile.querySelector('.vvp-item-tile-content');
        contentContainer.insertBefore(dateElement, contentContainer.firstChild);
    }

    // Funktion zum Scannen und Zwischenspeichern der sichtbaren Produkte
    function scanAndCacheVisibleProducts() {
        var productTiles = document.getElementsByClassName('vvp-item-tile');
        var visibleProductIDs = [];
        var visibleProductTitles = [];
        var visibleProductImages = [];
        var visibleProductButtons = [];

        for (var i = 0; i < productTiles.length; i++) {
            var productTile = productTiles[i];

            if (isElementVisible(productTile)) {
                var productID = getProductID(productTile);
                visibleProductIDs.push(productID);

                var contentContainer = productTile.querySelector('.vvp-item-tile-content');
                var imageElement = contentContainer.querySelector('img');
                var nameElement = contentContainer.querySelector('a span span.a-truncate-full');

                visibleProductTitles.push(nameElement.textContent);
                visibleProductImages.push(imageElement.getAttribute('src'));

                var buttonContainer = productTile.querySelector('span.a-button-inner');
                var buttonContent = buttonContainer.innerHTML;

                visibleProductButtons.push(buttonContent);
            }
        }

        cacheProducts(visibleProductIDs, visibleProductTitles, visibleProductImages, visibleProductButtons);
    }



    function AutoScanStart(scanToPage) {
        if(debug == true){console.log("Cur: " + getCurrentPage())};
        if(debug == true){console.log("Max: " + getMaxPage())};

        var currentPage = getCurrentPage();
        if(localStorage.getItem("autoScan")=="false"){
            localStorage.setItem("autoScan", "true");
            localStorage.setItem("potLuck", "false");
            localStorage.setItem("lastChance", "false");
            localStorage.setItem("startByPageOne", "false");
            localStorage.setItem("firstRedirect", "true");
            localStorage.setItem('scanToPage', scanToPage);
            checkForAutoScan();
        }else{
            clearTimeout(redirectTimeout);
            localStorage.setItem("autoScan", "false");
            console.log("Auto Scan abgebrochen");
            url = "";
            redirectTimeout = setTimeout(redirectNextPage, 100, url);
        }
    }

    function checkForAutoScan() {
        if(localStorage.getItem("autoScan")=="true"){
            var rand = random(redirectMinTime * 1000, redirectMaxTime * 1000);
            console.log("AutoScan aktiv!");
            var currentPage = getCurrentPage();
            //var maxPage = getMaxPage();
            var maxPage = localStorage.getItem("scanToPage")
            var nextPage = getCurrentPage() + 1;
            //var scanToPage = localStorage.getItem("scanToPage");
            //Alle Produkte auf der aktuellen Seite speichern
            if(localStorage.getItem("firstRedirect")=="false") {
                scanAndCacheAllProducts();
            }

            // Prüfen auf welche Seite als nächstes weitergeleitet werden soll
            if(localStorage.getItem("potLuck")=="false"){
                localStorage.setItem("potLuck", "true");
                localStorage.setItem("firstRedirect", "false");
                console.log("Next Page in: " + rand);
                url = "https://www.amazon.de/vine/vine-items?queue=potluck";
                redirectTimeout = setTimeout(redirectNextPage, rand, url);
            } else if (localStorage.getItem("lastChance")=="false") {
                localStorage.setItem("lastChance", "true");
                localStorage.setItem("firstRedirect", "false");
                console.log("Next Page in: " + rand);
                url = "https://www.amazon.de/vine/vine-items?queue=last_chance";
                redirectTimeout = setTimeout(redirectNextPage, rand, url);
            } else if (localStorage.getItem("startByPageOne")=="false") {
                //Weiterleitung auf Page 1
                console.log("Redirecting to Page 1 in: " + rand);
                localStorage.setItem("startByPageOne", "true");
                localStorage.setItem("firstRedirect", "false");
                url = "https://www.amazon.de/vine/vine-items?queue=encore&pn=&cn=&page=1";
                redirectTimeout = setTimeout(redirectNextPage, rand, url);
            } else {
                console.log("NextPage: " + nextPage);
                console.log("Current Page: " + currentPage);
                if(currentPage >= maxPage) {
                    console.log("Auto Scan Abgeschlossen!");
                    localStorage.setItem("autoScan", "false");
                    localStorage.removeItem('scanToPage');
                    url = "";
                    redirectTimeout = setTimeout(redirectNextPage, 1000, url);
                    return
                }else{
                    localStorage.setItem("firstRedirect", "false");
                    console.log("Next Page in: " + rand);
                    url = "https://www.amazon.de/vine/vine-items?queue=encore&pn=&cn=&page=" + nextPage;
                    redirectTimeout = setTimeout(redirectNextPage, rand, url);
                }
            }
        }
    }

    function random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function redirectNextPage(nextPage){
        location.replace(url);
        console.log("Redirect");
        console.log("Next Page: " + nextPage);
    }

    function scanAndCacheAllProducts() {
        console.log("Alle produkte werden gescannt");
        var productTiles = document.getElementsByClassName('vvp-item-tile');
        var ProductIDs = [];
        var ProductTitles = [];
        var ProductImages = [];
        var ProductButtons = [];
        for (var i = 0; i < productTiles.length; i++) {
            var productTile = productTiles[i];

            var productID = getProductID(productTile);
            ProductIDs.push(productID);

            var contentContainer = productTile.querySelector('.vvp-item-tile-content');
            var imageElement = contentContainer.querySelector('img');
            var nameElement = contentContainer.querySelector('a span span.a-truncate-full');

            ProductTitles.push(nameElement.textContent);
            ProductImages.push(imageElement.getAttribute('src'));

            var buttonContainer = productTile.querySelector('span.a-button-inner');
            var buttonContent = buttonContainer.innerHTML;

            ProductButtons.push(buttonContent);
        }
        cacheProducts(ProductIDs, ProductTitles, ProductImages, ProductButtons);
    }

    function saveCurrentPage() {
        var pagination = document.querySelector('.a-pagination');
        if(pagination != null) {
            var currentPageElement = pagination.querySelector('.a-selected a');
            var currentPage = parseInt(currentPageElement.textContent.trim());
            localStorage.setItem("currentPage", currentPage);
            if(debug){console.log('Current Page Saved:', currentPage);}
        }
    }

    function getCurrentPage() {
        return parseFloat(localStorage.getItem("currentPage"));
    }

    function saveMaxPage(){
        var pagination = document.querySelector('.a-pagination');
        if(pagination != null) {
            var currentPage = getCurrentPage();
            if(debug == true){console.log("Max Pages Element: " + pagination.lastChild.previousSibling.lastChild);}

            var maxPage = parseInt(pagination.lastChild.previousSibling.lastChild.textContent.trim());

            localStorage.setItem("maxPage", maxPage);
            if(debug == true){console.log('Max Page:', maxPage);}
        }
    }

    function getMaxPage() {
        return parseFloat(localStorage.getItem("maxPage"));
    }

    // Gibt das gespeicherte Datum für eine Produkt-ID zurück
    async function getSavedDate(productID) {
        //return localStorage.getItem(productID);

        //var ProductData = await getCachedProductIDInfo();
        //var date = ProductData.Datum;

        var date = await getCachedProductIDInfo(productID);
        return date.Datum;
    }



    // Funktion zum Speichern der Produkt-IDs im Cache
    async function cacheProducts(productIDs, titles, images, buttons) {
        var cachedProductIDs = await getCachedProductIDs();
        var productCacheLength = await getProductCacheLength();
        if(debug == true){console.log("Cache: " + productCacheLength)};
        for(var x = 0; x<= productCacheLength; x++){
        }
        productIDs.forEach(async function(productID, index) {
            const findid = await checkForIDInDatabase(productID);
            if(findid == false){
                if(debug == true){console.log("Produkt hinzuügen")}
                //######################################################################################################################################################
                // Alter Local Storage speicher -> Führt ab ca. 5.000 Einträgen zu Fehlern
                //var currentDate = new Date().toString();
                var currentDate = new Date().toLocaleString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                //var fomdate = Date(date).toLocaleString(undefined, options));;
                //cachedProductIDs.push(productID);
                //localStorage.setItem('title_' + productID, titles[index]);
                //localStorage.setItem('image_' + productID, images[index]);
                //localStorage.setItem('button_' + productID, buttons[index]);
                //localStorage.setItem('date_' + productID, currentDate);

                //if(debug == true){console.log('[W] Gespeichertes Bild für Produkt ' + productID + ':', images[index]);}
                //if(debug == true){console.log('[W] Gespeicherter Titel für Produkt ' + productID + ':', titles[index]);}
                //if(debug == true){console.log('[W] Gespeicherter Button für Produkt ' + productID + ':', buttons[index]);}
                //if(debug == true){console.log('[W] Gespeichertes Datum für Produkt ' + productID + ':', currentDate);}

                //######################################################################################################################################################
                // Neuer Speicher nutzt IndexedDB
                const request = indexedDB.open(dbName, dbVersion);
                request.onerror = function(event) {
                    console.log("Fehler beim Öffnen der Datenbank ID:1");
                };
                request.onsuccess = function(event) {
                    const db = event.target.result;
                    var rand = random(1, 10000);
                    const data = {
                        ID: productID,
                        Titel: titles[index],
                        BildURL: images[index],
                        Button: buttons[index],
                        Datum: currentDate,
                        Favorit: false
                    };

                    const transaction = db.transaction([objectStoreName], "readwrite");
                    const objectStore = transaction.objectStore(objectStoreName);

                    const addRequest = objectStore.add(data);

                    addRequest.onsuccess = function(event) {
                        if(debug == true){console.log("Daten hinzugefügt")};
                    };

                    addRequest.onerror = function(event) {
                        console.log("Fehler beim Hinzufügen der Daten");
                    };
                };



            }else{
                if(debug == true){console.log("Produkt bereits vorhanden")};
            }
        });

        localStorage.setItem('cachedProductIDs', JSON.stringify(cachedProductIDs));
    }

    function checkIfIDExists(idToCheck) {
        return new Promise((resolve, reject) => {

            const request = indexedDB.open(dbName, dbVersion);

            request.onerror = function(event) {
                console.log("Fehler beim Öffnen der Datenbank");
                reject(new Error("Fehler beim Öffnen der Datenbank"));
            };

            request.onsuccess = function(event) {
                const db = event.target.result;

                const transaction = db.transaction([objectStoreName], "readonly");
                const objectStore = transaction.objectStore(objectStoreName);

                const getRequest = objectStore.get(idToCheck);

                getRequest.onsuccess = function(event) {
                    const result = event.target.result;
                    resolve(!!result); // Resolve mit true, wenn die ID vorhanden ist, andernfalls false
                };

                getRequest.onerror = function(event) {
                    console.log("Fehler beim Abrufen der Daten");
                    reject(new Error("Fehler beim Abrufen der Daten"));
                };
            };
        });
    }


    function getAllDataFromDatabase() {
        return new Promise((resolve, reject) => {
            const cachedProductIDs = localStorage.getItem('cachedProductIDs');

            const request = indexedDB.open(dbName, dbVersion);

            request.onerror = function(event) {
                console.log("Fehler beim Öffnen der Datenbank ID:2");
                reject([]);
            };

            request.onsuccess = function(event) {
                const db = event.target.result;

                const transaction = db.transaction([objectStoreName], "readonly");
                const objectStore = transaction.objectStore(objectStoreName);

                const getRequest = objectStore.getAll();

                getRequest.onsuccess = function(event) {
                    const allData = event.target.result;
                    const titles = allData.map(item => item.ID);
                    resolve(allData);
                };

                getRequest.onerror = function(event) {
                    console.log("Fehler beim Abrufen der Daten ID:2");
                    reject([]);
                };
            };

            //console.log("Local Speicher:");
            //console.log(cachedProductIDs ? JSON.parse(cachedProductIDs) : []);
            //return cachedProductIDs ? JSON.parse(cachedProductIDs) : [];
        });
    }

    async function getCachedProductIDInfo(id) {
        try {
            const allData = await getAllDataFromDatabase();
            const productInfo = allData.find(item => item.ID === id);
            if(debug){console.log("Produktinformationen für ID", id, ":", productInfo)};
            return productInfo;
        } catch (error) {
            console.error("Fehler beim Abrufen der Produktinformationen:", error);
            throw error;
        }
    }

    async function getCachedProductIDs() {
        // Verwendung:
        return new Promise((resolve, reject) => {
            //getProductIDsFromDatabase()
            getAllDataFromDatabase()
                .then(allData => {
                var productIDs = allData.map(item => item.ID);
                resolve(productIDs);
            })
                .catch(error => {
                console.error("Fehler beim Abrufen der Datenbank-IDs:", error);
                reject(error);
            });
        });
    }


    async function getProductCacheLength() {
        return new Promise((resolve, reject) => {
            //getProductIDsFromDatabase()
            getCachedProductIDs()
                .then(productIDs => {
                if(debug == true){console.log("Produkte in der Datenbank: " + productIDs.length)};
                resolve(productIDs.length);
            })
                .catch(error => {
                console.error("Fehler beim Abrufen der Datenbank-IDs:", error);
                reject(error);
            });
        });
    }

    async function checkForIDInDatabase(productID) {
        return new Promise((resolve, reject) => {
            checkIfIDExists(productID)
                .then(idExists => {
                if (idExists) {
                    if(debug == true){console.log("Die ID existiert in der Datenbank")};
                    resolve(true);
                } else {
                    if(debug == true){console.log("Die ID existiert nicht in der Datenbank")};
                    resolve(false);
                }
            })
                .catch(error => {
                console.error("Fehler beim Überprüfen der ID in der Datenbank:", error);
                reject(error);
            });
        });
    }

    // Funktion zum Abrufen der Produkt-ID eines Tiles
    function getProductID(tile) {
        return tile.getAttribute('data-recommendation-id');
    }

    // Funktion zum Überprüfen, ob ein Element im sichtbaren Bereich ist
    function isElementVisible(element) {
        var rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight)
        );
    }

    // Funktion zum Erstellen des Popups
    async function createPopup() {
        var popup = document.createElement('div');
        popup.setAttribute('id', 'vine-viewer-popup');
        popup.style.position = 'fixed';
        popup.style.top = '50%';
        popup.style.left = '50%';
        popup.style.transform = 'translate(-50%, -50%)';
        popup.style.width = '75%';
        popup.style.height = '75%';
        popup.style.backgroundColor = 'white';
        popup.style.boxShadow = '0px 0px 50px 10px rgba(0, 0, 0, 0.9)';
        popup.style.border = '1px solid black';
        popup.style.padding = '10px';
        popup.style.zIndex = '999';

        var closeButton = document.createElement('div');
        closeButton.textContent = 'X';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '5px';
        closeButton.style.right = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.addEventListener('click', function() {
            document.body.removeChild(popup);
        });

        popup.appendChild(closeButton);

        var searchContainer = document.createElement('div');
        searchContainer.style.height = '50px';
        searchContainer.style.marginBottom = '10px';

        var searchTitel = document.createElement('span');
        searchTitel.style.height = '30px';
        searchTitel.style.width = '50px';
        searchTitel.style.padding = '5px';
        searchTitel.style.fontWeight = 'bold';
        searchTitel.textContent = 'Filter: ';

        searchContainer.appendChild(searchTitel);

        var searchInput = document.createElement('input');
        searchInput.setAttribute('type', 'text');
        searchInput.style.height = '30px';
        searchInput.style.width = '500px';
        searchInput.style.padding = '5px';
        searchInput.addEventListener('input', function(event) {
            var searchQuery = event.target.value.toLowerCase();
            var productContainers = popup.getElementsByClassName('product-container');
            for (var i = 0; i < productContainers.length; i++) {
                var productContainer = productContainers[i];
                var titleElement = productContainer.querySelector('.product-title');
                var title = titleElement.textContent.toLowerCase();

                if (title.includes(searchQuery)) {
                    productContainer.style.display = 'flex';
                } else {
                    productContainer.style.display = 'none';
                }
            }
        });
        searchContainer.appendChild(searchInput);
        popup.appendChild(searchContainer);

        var productListContainer = document.createElement('div');
        productListContainer.style.overflow = 'auto';
        productListContainer.style.height = 'calc(100% - 60px)';

        // Anzeigen der gespeicherten Daten aus dem Cache
        var cachedProductIDs = await getCachedProductIDs();
        var productCacheLength = await getProductCacheLength();
        //cachedProductIDs.forEach(function(productID) {
        for (var x = 0 ; x <= (productCacheLength - 1); x++) {
            var productID = cachedProductIDs[x];
            var title = allData[x].Titel;
            var image = allData[x].BildURL;
            var buttonContent = allData[x].Button;
            var date = allData[x].Datum;
            if(debug == true){console.log((x+1) + " - Titel: " + title)};
            //var title = localStorage.getItem('title_' + productID);
            //var image = localStorage.getItem('image_' + productID);
            //var buttonContent = localStorage.getItem('button_' + productID);
            //var date = formatDate(localStorage.getItem('date_' + productID));
            //var date = formatDate(getSavedDate(productID));

            if (title && image && buttonContent) {
                var productContainer = document.createElement('div');
                productContainer.classList.add('product-container');
                productContainer.style.display = 'flex';
                productContainer.style.alignItems = 'center';
                productContainer.style.marginBottom = '10px';
                productContainer.style.marginRight = '10px';

                var imageElement = document.createElement('img');
                imageElement.src = image;
                imageElement.style.width = '100px';
                imageElement.style.height = '100px';
                imageElement.style.objectFit = 'cover';
                imageElement.style.marginRight = '10px';

                var dateElement = document.createElement('div');
                //dateElement.textContent = date.replace(',', '\n');
                dateElement.textContent = date;
                dateElement.style.marginRight = '10px';

                var titleElement = document.createElement('span');
                titleElement.classList.add('product-title');
                titleElement.textContent = title;
                titleElement.style.flex = '1';

                var buttonContainer = document.createElement('span');
                buttonContainer.style.display = 'flex';
                buttonContainer.style.alignItems = 'center';
                buttonContainer.classList.add('a-button');
                buttonContainer.classList.add('a-button-primary');
                buttonContainer.classList.add('vvp-details-btn');

                var buttonSpan = document.createElement('span');
                buttonSpan.innerHTML = buttonContent;
                buttonSpan.style.width = '125px';
                buttonSpan.style.textAlign = 'right';
                buttonSpan.classList.add('a-button-inner');

                buttonContainer.appendChild(buttonSpan);

                productContainer.appendChild(imageElement);
                productContainer.appendChild(dateElement);
                productContainer.appendChild(titleElement);
                productContainer.appendChild(buttonContainer);
                productListContainer.insertBefore(productContainer, productListContainer.firstChild);
                //productListContainer.appendChild(productContainer);
            }
            //});
        }

        popup.appendChild(productListContainer);
        document.body.appendChild(popup);
    }

    // Funktion zum Filtern der Produkte basierend auf der Sucheingabe
    function filterProducts(searchText) {
        var productsContainer = document.getElementById('product-list');

        if (!productsContainer) return;

        var productContainers = productsContainer.querySelectorAll('div');
        var searchTerm = searchText.toLowerCase();

        productContainers.forEach(function(container) {
            var titleElement = container.querySelector('span');
            var title = titleElement.textContent.toLowerCase();

            if (title.includes(searchTerm)) {
                container.style.display = 'flex';
            } else {
                container.style.display = 'none';
            }
        });
    }

    // Funktion zum Öffnen des Popups bei Klick auf "Amazon Vine viewer"
    function openPopup() {
        var greenBar = document.getElementById('green-bar');
        var vineViewerText = greenBar.querySelector('span');

        var link = document.createElement('a');
        link.textContent = vineViewerText.textContent;
        link.href = '#';
        link.style.color = 'blue';
        link.style.textDecoration = 'underline';
        link.addEventListener('click', function() {
            createPopup();
        });

        vineViewerText.textContent = '';
        vineViewerText.appendChild(link);
    }

    // Hauptfunktion
    async function main() {
        if(debug){console.log("[INi] - Amazon Vine Viewer")};
        var nextPage;
        var currentPage;
        var maxPage;
        var rand;
        await saveCurrentPage();
        if(debug){console.log("[INi] - Aktuelle Seite gespeichert")};
        await saveMaxPage();
        if(debug){console.log("[INi] - Maximale Seite gespeichert")};
        try{
            allData = await getAllDataFromDatabase();
        } catch (error) {
            console.log("Fehler beim abrufen der Datenbank");
        }
        if(debug){console.log("[INi] - Alle Daten abgefragt")};
        await createGreenBar();
        if(debug){console.log("[INi] - Tool Bar Initialisiert")};
        //highlightAllProducts();
        await highlightCachedProducts();
        if(debug){console.log("[INi] - Cached Produkte hervorgehoben")};
        await checkForAutoScan();
        if(debug){console.log("[INi] - Auto Scan überprüft")};
        var highlightVisibility = getHighlightVisibility();
        if(debug){console.log("[INi] - Status Sichtbarkeit abgefragt")};
        await toggleHighlightVisibility(highlightVisibility);
        if(debug){console.log("[INi] - Sichtbarkeit an / aus")};
        if(localStorage.getItem("autoScan") == "false"){
            if(await getScanVisibility()){
                await scanAndCacheVisibleProducts();
            }else{
                await scanAndCacheAllProducts();
            }
        }else{
            if(debug){console.log("Auto Scan aktiv, Überspringen des automatischen Scans")};
        }
        if(debug){console.log("[INi] - Speichern aller Sichtbaren / nicht Sichtbaren Produkte")};
        await openPopup();
        if(debug){console.log("[INi] - Popup Initialisiert")};
        window.addEventListener('scroll', function(event){
            if(localStorage.getItem("autoScan") == "false"){
                scanAndCacheVisibleProducts();
            }
        });
        //getCachedProductIDs();
        window.addEventListener('keydown', function(event) {
            console.log("Key Event");
            const key = event.key; // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"
            switch (event.key) {
                case "ArrowLeft":
                    // Left pressed
                    currentPage = getCurrentPage();
                    maxPage = getMaxPage();
                    nextPage = getCurrentPage() - 1;
                    rand = 100;
                    if(nextPage != 0) {
                        console.log("Left");
                        console.log("Weiterleitung auf " + nextPage);
                        url = "https://www.amazon.de/vine/vine-items?queue=encore&pn=&cn=&page=" + nextPage;
                        redirectTimeout = setTimeout(redirectNextPage, rand, url);
                    }

                    break;
                case "ArrowRight":
                    // Right pressed
                    currentPage = getCurrentPage();
                    maxPage = getMaxPage();
                    nextPage = getCurrentPage() + 1;
                    rand = 100;
                    if(nextPage <= maxPage) {
                        console.log("Right");
                        console.log("Weiterleitung auf " + nextPage);
                        url = "https://www.amazon.de/vine/vine-items?queue=encore&pn=&cn=&page=" + nextPage;
                        redirectTimeout = setTimeout(redirectNextPage, rand, url);
                    }
                    break;

            }
        });

        //window.addEventListener("DOMContentLoaded", AutoScan());
    }

    //main();

})();
