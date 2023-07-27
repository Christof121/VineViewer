// ==UserScript==
// @name         Amazon Vine viewer
// @namespace    http://tampermonkey.net/
// @version      0.9.1
// @description  Hervorheben von bereits vorhandenen Produkten bei Amazon Vine
// @author       Christof
// @match        *://www.amazon.de/vine/*
// @match        *://amazon.de/vine/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function() {
    'use strict';
    var debug = false;
    var redirectMinTime = 2;
    var redirectMaxTime = 5;
    var url;
    let redirectTimeout;
    var addDate;
    var openList = false;
    var popupDefaultCount = 25;

    //Menü Elements
    const id = [
        //[ID,Label]
        ["colorHighlight","Highlight Farbe","color"],
        ["toggleHighlight","Ausblenden","checkbox"],
        ["toggleScan","Nur Sichtbares Cachen","checkbox"],
        ["toggleDate","Datum anzeigen","checkbox"],
        ["toggleRecom","Empfehlungen ausblenden","checkbox"],
        ["toggleFooter","Footer ausblenden","checkbox"]
    ];

    // CSS UI Button
    var uiSettingCSS = `
    position: fixed;
    left: 10px;
    bottom: 10px;
    z-index: 9999;
    width: 30px;
    height: 30px;
    background-color: #232f3e;
    border: black 2px solid;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    opacity: 1;
    transition: opacity 0.2s;
    `;

    var uiListCSS = `
    position: fixed;
    left: 10px;
    bottom: 50px;
    z-index: 9999;
    width: 30px;
    height: 30px;
    background-color: #232f3e;
    border: black 2px solid;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    opacity: 1;
    transition: bottom 0.2s;
    `

    var uiButtonContentCSS = `
    font-size: 1.75vh;
    `

    var settingPopupCSS = `
    display: flex;
    position: fixed;
    left: 10px;
    bottom: 10px;
    width: 30px;
    height: 30px;
    z-index: 9999;
    border: black 2px solid;
    border-radius: 10px;
    background-color: #232f3e;
    transition: width 0.2s, height 0.2s;
    color: white;
    `

    var settingPopupContentCSS = `
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: opacity 0.2s;
    `

    var settingPopupCloseButton = `
    width: 10px;
    height: 10px;
    position: absolute;
    right: 2px;
    top: 2px;
    cursor: pointer;
    `

    var titleDivCSS = `
    width: 100%;
    height: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-weight: bold;
    `

    var titleDivContentCSS = `
    transform: scale(1);
    transition: transform 0.5s;
    `

    var settingPopupItemListCSS = `
    width: 100%;
    height: auto;
    `

    var settingPopupItemCSS = `
    width: 100%;
    height: 25px;
    display: flex;
    `

    var settingPopupItemLeftCSS = `
    height: 100%;
    width: 15%;
    display: flex;
    justify-content: center;
    align-items: center;
    /* border-right: 1px solid black; */
    `

    var settingPopupItemRightCSS = `
    height: 100%;
    width: 85%;
    display: flex;
    align-items: center;
    `

    var settingFooterCSS = `
    width: 100%;
    /* background-color: white; */
    height: 25px;
    position: absolute;
    bottom: 0px;
    justify-content: center;
    display: flex;
    `
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
    justify-content: center;
    height: 0px;
    margin: 0;
    width: 90%;
    display: flex;
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

    // Falls neue Version von Datenbank vorhanden
    request.onupgradeneeded = function(event) {
        const db = event.target.result;
        const objectStore = db.createObjectStore(objectStoreName, { keyPath: "ID" });
    };

    // Laden der Einstellungen
    async function loadSettings(){
        for(var x = 0; x < id.length; x++){
            var ItemUID = id[x][0];
            var value = getToggleStatus(ItemUID);
            switch (ItemUID) {
                case "toggleScan":
                    break;
                case "toggleDate":
                    addDate = value;
                    break;
                case "toggleRecom":
                    toggleRecommendations(value)
                    break;
                case "toggleFooter":
                    toggleFooter(value);
                    break;
            }
        }
        popupDefaultCount = parseInt(localStorage.getItem("popupDefaultCount"));
    }

    // Funktion zum Erstellen der grünen Leiste
    async function createUI(){
        var uiIMGurl = "https://m.media-amazon.com/images/G/01/vine/website/vine_logo_title._CB1556578328_.png";

        var addSettingsUIButton = document.createElement('div');
        addSettingsUIButton.setAttribute('id', 'ui-button');
        addSettingsUIButton.style.cssText = uiSettingCSS;
        addSettingsUIButton.addEventListener('click', function() {
            //addSettingsUIButton.style.display = "none";
            var settingPopup = document.getElementById('ui-setting');
            var settingPopupContent = document.getElementById('ui-setting-content');
            var uiList = document.getElementById('ui-list');
            settingPopupContent.hidden = false;
            setTimeout(() => {
                settingPopupContent.style.opacity = "1";
            },200);
            //            settingPopupContent.style.opacity = "1";
            settingPopup.style.display = "flex";
            settingPopup.style.width = "250px";
            settingPopup.style.height = "300px";
            uiList.style.bottom = "320px";
            addSettingsUIButton.style.opacity = "0";
            addSettingsUIButton.style.cursor = "default";

        });

        var addUIIMG = document.createElement('img');
        addUIIMG.setAttribute('src' , uiIMGurl);

        var addButtonContent = document.createElement('span');
        addButtonContent.textContent = '⚙️';
        addButtonContent.style.cssText = uiButtonContentCSS;

        //addSettingsUIButton.appendChild(addUIIMG);
        addSettingsUIButton.appendChild(addButtonContent);
        document.body.prepend(addSettingsUIButton);
        createsettingPopup();



        var addListButton = document.createElement("div");
        addListButton.setAttribute('id', 'ui-list');
        addListButton.style.cssText = uiListCSS;

        addListButton.addEventListener('click', function() {
            createPopup();
        });

        var addListButtonContent = document.createElement('span');
        addListButtonContent.textContent = '📋';
        addListButtonContent.style.cssText = uiButtonContentCSS;

        addListButton.appendChild(addListButtonContent);
        document.body.prepend(addListButton);

    }

    async function createsettingPopup(){

        var settingPopup = document.createElement('div');
        settingPopup.setAttribute('id', 'ui-setting');
        settingPopup.style.cssText = settingPopupCSS;

        var settingPopupContent = document.createElement('div');
        settingPopupContent.setAttribute('id', 'ui-setting-content');
        settingPopupContent.style.cssText = settingPopupContentCSS;
        settingPopupContent.hidden = true;

        var closeButton = document.createElement('div');
        closeButton.style.cssText = settingPopupCloseButton;

        var closeButtonContent = document.createElement('span');
        closeButtonContent.textContent = 'X';
        closeButtonContent.addEventListener('click', function() {
            // Close Setting Popup
            var uiList = document.getElementById('ui-list');
            settingPopupContent.style.opacity = "0";
            //settingPopup.style.display = "none";
            setTimeout(() => {
                var uiButton = document.getElementById('ui-button');
                uiList.style.bottom = "50px";
                settingPopup.style.width = "30px";
                settingPopup.style.height = "30px";
                uiButton.style.opacity = "1";
                uiButton.style.cursor = "pointer";
                settingPopupContent.hidden = true;
            }, 150);
            //uiButton.style.display = "flex";

            // ID ui-setting-content hide

        });

        var titleDiv = document.createElement("div");
        titleDiv.style.cssText = titleDivCSS;

        var titleDivContent = document.createElement("span");
        titleDivContent.style.cssText = titleDivContentCSS;
        titleDivContent.textContent = "VineViewer Einstellungen"

        var itemsDiv = document.createElement("div");
        itemsDiv.style.cssText = settingPopupItemListCSS

        //var itemDiv = document.createElement("div");
        //itemDiv.style.cssText = settingPopupItemCSS

        //var itemLeftDiv = document.createElement("div");
        //itemLeftDiv.style.cssText = settingPopupItemLeftCSS

        ////Checkbox Ausblenden
        //var toggleSwitch = document.createElement('input');
        //toggleSwitch.setAttribute('type', 'checkbox');
        //toggleSwitch.setAttribute('id', 'togglehide');
        //toggleSwitch.style.bottom = "0px"
        //if(await getHighlightVisibility()){
        //    toggleSwitch.setAttribute('checked', 'true');
        //}
        //toggleSwitch.addEventListener('change', function() {
        //    toggleHighlightVisibility(this.checked);
        //    saveHighlightVisibility(this.checked);
        //});
        //
        //var itemRightDiv = document.createElement("div");
        //itemRightDiv.style.cssText = settingPopupItemRightCSS
        //
        ////Label Ausblenden
        //var toggleLabel = document.createElement('label');
        //toggleLabel.textContent = 'Ausblenden';
        //toggleLabel.setAttribute('for', 'togglehide');
        //
        //
        //// Toggle Nur sichtbares Cachen
        //var toggleScanSwitch = document.createElement('input');
        //toggleScanSwitch.setAttribute('type', 'checkbox');
        //toggleScanSwitch.style.cssText = toggleSwitchCSS;
        //if(await getScanVisibility()){
        //    toggleSwitch.setAttribute('checked', 'true');
        //}
        //toggleScanSwitch.addEventListener('change', function() {
        //    toggleScanVisibility(this.checked);
        //    saveScanVisibility(this.checked);
        //});
        //
        //var toggleScanLabel = document.createElement('label');
        //toggleScanLabel.textContent = 'Nur Sichtbares Cachen';
        //toggleScanLabel.style.marginLeft = '5px';
        //toggleScanLabel.style.userSelect = 'none';

        async function addItem(ItemID){
            var ItemUID = id[ItemID][0];
            var titel = id[ItemID][1];
            var type = id[ItemID][2];
            var itemDiv = document.createElement("div");
            itemDiv.style.cssText = settingPopupItemCSS;

            var itemLeftDiv = document.createElement("div");
            itemLeftDiv.style.cssText = settingPopupItemLeftCSS;

            var itemRightDiv = document.createElement("div");
            itemRightDiv.style.cssText = settingPopupItemRightCSS;

            // Erstellen der Checkbox
            var toggleSwitch = document.createElement('input');
            toggleSwitch.setAttribute('type', type);
            toggleSwitch.setAttribute('id', ItemUID);
            toggleSwitch.style.bottom = "0px";
            toggleSwitch.setAttribute('value', "#FFFFFF");
            if(await getToggleStatus(ItemUID) && type == "checkbox"){
                toggleSwitch.setAttribute('checked', 'true');
            }else if(type == "color"){
                var value = await getColorStatus(ItemUID);
                toggleSwitch.setAttribute('value', value);
                toggleSwitch.style.width = "22px";
                toggleSwitch.style.height = "22px";
            }
            toggleSwitch.addEventListener('change', function() {
                switch(type){
                    case "checkbox":
                        settingsClickEvent(ItemUID, this.checked);
                        saveToggleStatus(ItemUID, this.checked);
                        break;
                    case "color":
                        settingsClickEvent(ItemUID, this.value);
                        saveColorStatus(ItemUID, this.value);
                        break;

                }
            });

            // Erstellen des Labels
            var toggleLabel = document.createElement('label');
            toggleLabel.textContent = titel;
            toggleLabel.setAttribute('for', ItemUID);

            itemLeftDiv.appendChild(toggleSwitch);
            itemRightDiv.appendChild(toggleLabel);
            itemDiv.appendChild(itemLeftDiv);
            itemDiv.appendChild(itemRightDiv);
            return itemDiv;
        }

        for(var x = 0 ; x < id.length; x++){
            var Item = await addItem(x);
            itemsDiv.appendChild(Item);
        }


        closeButton.appendChild(closeButtonContent);
        titleDiv.appendChild(titleDivContent);
        settingPopupContent.appendChild(titleDiv);

        // Hinzufügen der Hide Toggle
        //itemLeftDiv.appendChild(toggleSwitch);
        //itemDiv.appendChild(itemLeftDiv);
        //itemRightDiv.appendChild(toggleLabel);
        //itemDiv.appendChild(itemRightDiv);

        // hinzufügen des Scan Toggles
        //itemLeftDiv.appendChild(toggleScanSwitch);
        //itemDiv.appendChild(itemLeftDiv);
        //itemRightDiv.appendChild(toggleScanLabel);
        //itemDiv.appendChild(itemRightDiv);
        //itemsDiv.appendChild(itemDiv);

        var buttonDeleteDataDiv = document.createElement('div');
        //buttonDeleteDiv.style.

        var buttonDeleteData = document.createElement('button');
        var cachedProductsCount = await getProductCacheLength();
        buttonDeleteData.textContent = cachedProductsCount + ' Daten löschen';
        buttonDeleteData.style.margin = "13px";
        buttonDeleteData.addEventListener('click', function() {
            var confirmation = confirm('Möchten Sie wirklich alle Daten löschen?');
            if (confirmation) {
                clearCachedData();
            }
        });

        buttonDeleteDataDiv.appendChild(buttonDeleteData);
        itemsDiv.appendChild(buttonDeleteDataDiv);

        var settingFooter = document.createElement("div");
        settingFooter.style.cssText = settingFooterCSS;

        var footerVersionLink = document.createElement("a");
        footerVersionLink.textContent = 'Version: ' + GM_info?.script?.version;
        footerVersionLink.href = 'https://greasyfork.org/de/scripts/471094-amazon-vine-viewer';
        footerVersionLink.target = "_blank"
        footerVersionLink.style.textDecoration = "none"
        footerVersionLink.style.color = "inherit"

        settingFooter.appendChild(footerVersionLink);

        settingPopupContent.appendChild(itemsDiv);
        settingPopupContent.appendChild(closeButton);
        settingPopupContent.appendChild(settingFooter);
        settingPopup.appendChild(settingPopupContent);
        document.body.prepend(settingPopup);
    }


    async function createGreenBar() {
        var greenBar = document.createElement('div');
        greenBar.setAttribute('id', 'green-bar');
        greenBar.style.cssText = greenBarCSS;

        var toggleDiv = document.createElement('div');
        toggleDiv.style.display = 'flex';
        toggleDiv.style.alignItems = 'center';

        //        var toggleSwitch = document.createElement('input');
        //        toggleSwitch.setAttribute('type', 'checkbox');
        //        toggleSwitch.style.cssText = toggleSwitchCSS;
        //        toggleSwitch.addEventListener('change', function() {
        //            //toggleHighlightVisibility(this.checked);
        //            //saveHighlightVisibility(this.checked);
        //        });
        //
        //        var toggleLabel = document.createElement('label');
        //        toggleLabel.textContent = 'Ausblenden';
        //        toggleLabel.style.marginLeft = '5px';
        //        toggleLabel.style.userSelect = 'none';
        //
        //        //toggleDiv.appendChild(toggleSwitch);
        //        //toggleDiv.appendChild(toggleLabel);
        //
        //        var toggleScanSwitch = document.createElement('input');
        //        toggleScanSwitch.setAttribute('type', 'checkbox');
        //        toggleScanSwitch.style.cssText = toggleSwitchCSS;
        //        toggleScanSwitch.addEventListener('change', function() {
        //            //toggleScanVisibility(this.checked);
        //            //saveScanVisibility(this.checked);
        //        });
        //
        //        var toggleScanLabel = document.createElement('label');
        //        toggleScanLabel.textContent = 'Nur Sichtbares Cachen';
        //        toggleScanLabel.style.marginLeft = '5px';
        //        toggleScanLabel.style.userSelect = 'none';
        //
        //        toggleDiv.appendChild(toggleScanSwitch);
        //        toggleDiv.appendChild(toggleScanLabel);
        //
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

        //var versionButton = document.createElement('a');
        //versionButton.textContent = 'Version: ' + GM_info?.script?.version + ' update?';
        //versionButton.style.cssText = updateButtonCSS;
        //versionButton.href = 'https://greasyfork.org/de/scripts/471094-amazon-vine-viewer';
        //versionButton.target = '_blank';


        //var deleteButton = document.createElement('button');
        ////var ids = getCachedProductIDs();
        //var cachedProductsCount = await getProductCacheLength();
        //deleteButton.textContent = cachedProductsCount + ' Daten löschen';
        //deleteButton.style.cssText = deleteButtonCSS;
        //deleteButton.addEventListener('click', function() {
        //    var confirmation = confirm('Möchten Sie wirklich alle Daten löschen?');
        //    if (confirmation) {
        //        clearCachedData();
        //    }
        //});

        //buttonDiv.appendChild(versionButton);
        //buttonDiv.appendChild(deleteButton);

        greenBar.appendChild(toggleDiv);
        greenBar.appendChild(titleDiv);
        greenBar.appendChild(buttonDiv);

        document.body.prepend(greenBar);

        var highlightVisibility = getToggleStatus("toggleHighlight");
        //        toggleSwitch.checked = highlightVisibility;
        toggleHighlightVisibility(highlightVisibility);

        var scanVisibility = getToggleStatus("toggleScan");
        //        toggleScanSwitch.checked = scanVisibility;
    }

    async function settingsClickEvent(ItemUID, value){
        switch (ItemUID){
            case "colorHighlight":
                highlightCachedProducts();
                break;
            case "toggleHighlight":
                toggleHighlightVisibility(value);
                break;
            case "toggleDate":
                toggleDate(value);
                break;
            case "toggleRecom":
                toggleRecommendations(value);
                break;
            case "toggleFooter":
                toggleFooter(value);
                break;
        }
    }


    function toggleDate(value) {
        const dateElements = document.querySelectorAll('[id="p-date"]');
        dateElements.forEach(function(element){
            if(value){
                element.style.display = "flex";
            }else{
                element.style.display = "none";
            }
        });
    }

    function toggleRecommendations(value) {
        const recom = document.getElementById('rhf');
        recom.hidden = value;
    }

    function toggleFooter(value){
        const footer = document.getElementById('navFooter');
        footer.hidden = value;
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

    // Funktion zum Abfragen des Toggle Status
    function saveToggleStatus(ItemUID, value){
        localStorage.setItem(ItemUID, value);
    }

    function getToggleStatus(ItemUID){
        const toggleStatus = localStorage.getItem(ItemUID);
        return toggleStatus === 'true';
    }

    // Funktion zum Abfragen des Toggle Status
    function saveColorStatus(ItemUID, value){
        localStorage.setItem(ItemUID, value);
    }

    function getColorStatus(ItemUID){
        const value = localStorage.getItem(ItemUID);
        return value;
    }

    //##################################### OLD CODE #####################################
    // Funktion??
    function toggleScanVisibility(checked) {
        //var highlightedDivs = document.getElementsByClassName('highlighted');

        //for (var i = 0; i < highlightedDivs.length; i++) {
        //  var div = highlightedDivs[i];
        //div.style.display = checked ? 'none' : 'block';
        //}
    }

    // Funktion zum Abrufen der Auswahl des Schalters
    //function getHighlightVisibility() {
    //    var highlightVisibility = localStorage.getItem('highlightVisibility');
    //    return highlightVisibility === 'true'; // Konvertiere den Wert in einen booleschen Wert
    //}

    //function saveScanVisibility(checked) {
    //    localStorage.setItem('scanVisibility', checked);
    //}

    // Funktion zum Abrufen der Auswahl des Schalters
    //function getScanVisibility() {
    //    var scanVisibility = localStorage.getItem('scanVisibility');
    //    return scanVisibility === 'true'; // Konvertiere den Wert in einen booleschen Wert
    //}
    //####################################################################################

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
            var color = await getColorStatus("colorHighlight");
            if(await checkForIDInDatabase(productID)){
                //if (cachedProductIDs.includes(productID)) {
                productTile.classList.add('highlighted');
                productTile.style.backgroundColor = color;
                var dateDiv = productTile.querySelector('#p-date');
                if(!dateDiv){
                    var date = await getSavedDate(productID);
                    addDateElement(productTile, date);
                }
            }
        }
    }

    // Funktion zum Hinzufügen des Datums zu einem Produkt-Tile
    async function addDateElement(productTile, date) {
        var dateElement = document.createElement('div');
        dateElement.setAttribute("id", "p-date");
        dateElement.hidden = addDate;
        dateElement.classList.add('highlightCachedProducts');
        dateElement.textContent = date;
        dateElement.style.cssText = dateElementCSS;
        if(await getToggleStatus("toggleDate")){
            dateElement.style.display = "flex";
        } else {
            dateElement.style.display = "none";
        }
        dateElement.hidden = "true";

        var contentContainer = productTile.querySelector('.vvp-item-tile-content');
        contentContainer.insertBefore(dateElement, contentContainer.firstChild);
    }

    // Funktion zum Scannen und Zwischenspeichern der sichtbaren Produkte
    function scanAndCacheVisibleProducts() {
        var productTiles = document.getElementsByClassName('vvp-item-tile');
        var visibleProductIDs = [];
        var visibleProductTitles = [];
        var visibleProductLinks = [];
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
                var linkElement = contentContainer.querySelector('a');

                visibleProductTitles.push(nameElement.textContent);
                visibleProductLinks.push(linkElement.href);
                visibleProductImages.push(imageElement.getAttribute('src'));

                var buttonContainer = productTile.querySelector('span.a-button-inner');
                var buttonContent = buttonContainer.innerHTML;

                visibleProductButtons.push(buttonContent);
            }
        }
        cacheProducts(visibleProductIDs, visibleProductTitles, visibleProductLinks, visibleProductImages, visibleProductButtons);
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
                    redirectTimeout = setTimeout(redirectNextPage, rand, url);
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
        var productTiles = document.getElementsByClassName('vvp-item-tile');
        var ProductIDs = [];
        var ProductTitles = [];
        var ProductLinks = [];
        var ProductImages = [];
        var ProductButtons = [];
        for (var i = 0; i < productTiles.length; i++) {
            var productTile = productTiles[i];

            var productID = getProductID(productTile);
            ProductIDs.push(productID);

            var contentContainer = productTile.querySelector('.vvp-item-tile-content');
            var imageElement = contentContainer.querySelector('img');
            var nameElement = contentContainer.querySelector('a span span.a-truncate-full');
            var linkElement = contentContainer.querySelector('a');

            ProductTitles.push(nameElement.textContent);
            ProductLinks.push(linkElement.href);
            ProductImages.push(imageElement.getAttribute('src'));

            var buttonContainer = productTile.querySelector('span.a-button-inner');
            var buttonContent = buttonContainer.innerHTML;

            ProductButtons.push(buttonContent);
        }
        cacheProducts(ProductIDs, ProductTitles, ProductLinks,ProductImages, ProductButtons);
    }

    function saveCurrentPage() {
        var pagination = document.querySelector('.a-pagination');
        if(pagination != null) {
            var currentPageElement = pagination.querySelector('.a-selected a');
            var currentPage = parseInt(currentPageElement.textContent.trim());
            localStorage.setItem("currentPage", currentPage);
            if(debug == true){console.log('Current Page Saved:', currentPage);}
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
    async function cacheProducts(productIDs, titles, links, images, buttons) {
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
                        Link: links[index],
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
        if(!openList){
            // Anzeigen der gespeicherten Daten aus dem Cache
            var cachedProductIDs = getCachedProductIDs();
            var productCacheLength = await getProductCacheLength();
            var allData = await getAllDataFromDatabase();
            //Start Bereich angeben // Start bei 0
            var startCount = 0;
            var popupPageCurrent = 1;
            var popupPageMax;
            //List End
            //productCacheLength
            var stopCount = (startCount + popupDefaultCount);

            if(stopCount >= productCacheLength){
                stopCount = productCacheLength;
            }
            popupPageMax = Math.ceil(productCacheLength / popupDefaultCount);
            // popupDefaultCount -> Anzahl die Pro anzeigen angezeigt werden soll

            openList = true;
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
            popup.style.borderRadius = "15px";

            var closeButton = document.createElement('div');
            closeButton.textContent = 'X';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '5px';
            closeButton.style.right = '10px';
            closeButton.style.cursor = 'pointer';
            closeButton.addEventListener('click', function() {
                document.body.removeChild(popup);
                openList = false;
            });

            popup.appendChild(closeButton);

            var searchContainer = document.createElement('div');
            searchContainer.style.height = '35px';

            var searchTitel = document.createElement('span');
            searchTitel.style.height = '30px';
            searchTitel.style.width = '50px';
            searchTitel.style.padding = '5px';
            searchTitel.style.fontWeight = 'bold';
            searchTitel.textContent = 'Filter: ';

            searchContainer.appendChild(searchTitel);

            var searchInput = document.createElement('input');
            searchInput.setAttribute('type', 'text');
            searchInput.setAttribute('id', 'popup-search-input');
            searchInput.style.height = '30px';
            searchInput.style.width = '500px';
            searchInput.style.padding = '5px';
            searchInput.addEventListener('input', function(event) {
                searchItems();
            });
            searchContainer.appendChild(searchInput);
            popup.appendChild(searchContainer);

            var productCountContainer = document.createElement('div');
            productCountContainer.style.marginBottom = "5px";
            productCountContainer.style.paddingLeft = "5px";

            var popupNavigationContent = document.createElement('div');
            popupNavigationContent.style.display = "flex";
            popupNavigationContent.style.justifyContent = "center";
            popupNavigationContent.style.alignItems = "center";

            var productCount = document.createElement('span');
            productCount.textContent = (startCount + 1) + " - " + stopCount + " / " + productCacheLength;
            productCount.style.marginRight = "10px";

            var productCountSelect = document.createElement('select');
            productCountSelect.addEventListener('change', function(event) {
                popupDefaultCount = parseInt(event.target.value);
                localStorage.setItem("popupDefaultCount", popupDefaultCount);
                var popupPage = document.getElementById('popup-page');
                popupPageMax = Math.ceil(productCacheLength / popupDefaultCount);
                popupPageCurrent = 1;
                startCount = 0;
                stopCount = (startCount + popupDefaultCount);
                popupPage.textContent = popupPageCurrent + "/" + popupPageMax;
                productCount.textContent = (startCount + 1) + " - " + stopCount + " / " + productCacheLength;
                removeItemList();
                buttonBack.disabled = true;
                buttonNext.disabled = false;
                addItemList(startCount, stopCount);
            });

            const options = [
                [25,"25"],
                [50,"50"],
                [100,"100"],
                [250,"250"]
            ];
            for(var o = 0; o <= (options.length -1); o++){
                var option = document.createElement("option");
                option.value = options[o][0];
                option.text = options[o][1];
                if(option.value == popupDefaultCount){
                    option.selected = true;
                }
                productCountSelect.appendChild(option);
            }

            popupNavigationContent.appendChild(productCount);
            popupNavigationContent.appendChild(productCountSelect);

            var productCountButtons = document.createElement('div');
            productCountButtons.style.display = "flex";
            productCountButtons.style.justifyContent = "center";
            productCountButtons.style.alignItems = "center";
            productCountButtons.style.margin = "5px";

            var currentPage = document.createElement('div');
            currentPage.textContent = popupPageCurrent + "/" + popupPageMax;
            currentPage.setAttribute("id","popup-page");
            currentPage.style.margin = "0px 10px";

            var buttonBack = document.createElement('button');
            buttonBack.disabled = true;
            //buttonBack.setAttribute("id","popup-button-back");
            buttonBack.textContent = "<";
            buttonBack.addEventListener('click', function(event) {
                removeItemList();
                startCount = (startCount - popupDefaultCount);
                stopCount = ((startCount + (popupDefaultCount * 2)) - popupDefaultCount);
                popupPageCurrent = popupPageCurrent - 1;
                if(startCount <= 0){
                    startCount = 0;
                    buttonBack.disabled = true;
                }
                buttonNext.disabled = false;
                productCount.textContent = (startCount + 1) + " - " + stopCount + " / " + productCacheLength;
                currentPage.textContent = popupPageCurrent + "/" + popupPageMax;
                addItemList(startCount, stopCount);
                searchItems();
            });

            var buttonNext = document.createElement('button');
            buttonNext.textContent = ">";
            if(stopCount >= productCacheLength){
                buttonNext.disabled = true;
            }
            buttonNext.addEventListener('click', function(event) {
                removeItemList();
                startCount = (startCount + popupDefaultCount);
                stopCount = (stopCount + popupDefaultCount);
                popupPageCurrent = popupPageCurrent + 1;
                if(stopCount >= productCacheLength){
                    stopCount = productCacheLength;
                    buttonNext.disabled = true;
                }
                buttonBack.disabled = false;
                productCount.textContent = (startCount + 1) + " - " + stopCount + " / " + productCacheLength;
                currentPage.textContent = popupPageCurrent + "/" + popupPageMax;
                addItemList(startCount, stopCount)
                searchItems();
            });

            productCountButtons.appendChild(buttonBack);
            productCountButtons.appendChild(currentPage);
            productCountButtons.appendChild(buttonNext);

            productCountContainer.appendChild(popupNavigationContent);
            productCountContainer.appendChild(productCountButtons);
            popup.appendChild(productCountContainer);

            var productListContainer = document.createElement('div');
            productListContainer.style.overflow = 'auto';
            productListContainer.style.height = 'calc(100% - 80px)';
            productListContainer.style.padding = "5px";

            //cachedProductIDs.forEach(function(productID) {
            // List Start
            //productCacheLength
            function addItemList(startCount, stopCount){
                for (startCount; startCount <= (stopCount - 1); startCount++) {
                    var productID = cachedProductIDs[startCount];
                    var title = allData[startCount].Titel;
                    var link = allData[startCount].Link;
                    var image = allData[startCount].BildURL;
                    var buttonContent = allData[startCount].Button;
                    var date = allData[startCount].Datum;
                    if(debug == true){console.log((startCount+1) + " - Titel: " + title)};
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
                        dateElement.style.width = '100px';
                        dateElement.style.textAlign = 'center';


                        var titleElement = document.createElement('a');
                        titleElement.classList.add('product-title');
                        titleElement.textContent = title;
                        titleElement.href = link;
                        titleElement.target = "_blank";
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
            }
            function removeItemList() {
                var elementsToRemove = document.querySelectorAll('.product-container');
                for (var i = 0; i < elementsToRemove.length; i++) {
                    var element = elementsToRemove[i];
                    element.parentNode.removeChild(element);
                }
            }
            function searchItems() {
                var searchInput = document.getElementById('popup-search-input');
                var searchQuery = searchInput.value.toLowerCase();
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
            }
            addItemList(startCount,stopCount);
            //popup.appendChild(productListContainer);
            document.body.appendChild(popup);
        }
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
        var debug;
        var nextPage;
        var currentPage;
        var maxPage;
        var rand;
        loadSettings();
        saveCurrentPage();
        saveMaxPage();
        await createUI();
        //await createGreenBar();
        //highlightAllProducts();
        await highlightCachedProducts();
        checkForAutoScan();
        var highlightVisibility = getToggleStatus("toggleHighlight");
        toggleHighlightVisibility(highlightVisibility);
        if(getToggleStatus("toggleScan")){
            scanAndCacheVisibleProducts();
        }else{
            scanAndCacheAllProducts();
        }
        window.addEventListener('scroll', scanAndCacheVisibleProducts);
        //await openPopup();
        //getCachedProductIDs();
        window.addEventListener('keydown', function(event) {
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

    main();

})();
