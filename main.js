// ==UserScript==
// @name         List Rework Vine Viewer
// @namespace    http://tampermonkey.net/
// @version      1.0
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

(function() {
    'use strict';
    //####################################################################

    //                              Settings

    //####################################################################

    // Debug Modus
    // Beim Debug wird die Version automatisch auf 0.0 gesetzt
    // true = Debug ausgabe in der Konsole des Brwosers
    // false = Keine Ausgabe
    var debug = false;

    // Angabe der Zeit die beim Auto Scan mindestens mit der Weiterleitung gewartet werden soll
    var redirectMinTime = 2; // Angabe in Sekunden

    // Angabe der Zeit die beim Auto Scan maximal mit der Weiterleitung gewartet werden soll
    var redirectMaxTime = 5; // Angabe in Sekunden

    // Angabe der Zeit wie lange die Meldung eines Updates angezeigt werden soll
    var updateMessageDuration = 15; // Angabe in Sekunden


    //####################################################################

    //                    Dont change anything below this

    //####################################################################
    var url;
    var allData;
    let redirectTimeout;
    var addDate;
    var openList = false;
    var popupDefaultCount;
    //##################################################
    // Der Wert darf nicht unter 24 Stunden gesetzt werden!
    // Vorgabe von Greasy Fork!
    var updateCheckInterval = 24; // Angabe in Stunden
    //##################################################
    var updateerror;
    var scriptURL = "https://greasyfork.org/de/scripts/471094";
    var lastUpdateCheck;

    //Einstellungen der IndexedDB
    const dbName = "VineData";
    const dbVersion = 1;
    const objectStoreName = "Products";

    // Einstellungs Menü Optionen
    const id = [
        // Aktuell nur color und checkbox als Type unterstützt
        //[ID,Label,Type]
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
    transition: opacity 0.2s, bottom 0.2s ease 0s;
    `;

    // CSS UI List Button
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

    //CSS Settings Menu
    var settingPopupCSS = `
    position: fixed;
    left: 10px;
    bottom: 10px;
    width: 30px;
    height: 30px;
    z-index: 9999;
    border: black 2px solid;
    border-radius: 10px;
    background-color: #232f3e;
    transition: width 0.2s, height 0.2s, bottom 0.2s ease 0s;;
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
    //Css Update Message Div
    var updateMessageDivCSS = `
    display: none;
    align-items: center;
    justify-content: center;
    position: fixed;
    left: 10px;
    bottom: 10px;
    width: auto;
    height: 0px;
    z-index: 9999;
    border: black 2px solid;
    border-radius: 10px;
    background-color: red;
    opacity: 0;
    transition: height 0.2s, opacity 0.2s;
    color: white;
    `
    var updateMessageContentCSS = `
    padding: 0 10px;
    `

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
    //CSS Fav Element
    var favCSS = `
    float: right;
    display: flex;
    margin: 0;
    color: white;
    height: 0;
    font-size: 25px;
    text-shadow: -1px 0 black, 0 1px black, 1px 0 black, 0 -1px black;
    cursor: pointer;
    `

    // CSS für das hinzugefügte Favorite Icon
    var favElementCSS = `
    display: inline-flex;
    justify-content: center;
    height: auto;
    font-size: 3vh;
    width: 10%
    `;

    // CSS für die Favoriten
    var favElementCSShighlighted = `
    color: yellow;
    `;

    var popupCSS = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 75%;
    height: 75%;
    background-color: white;
    box-shadow: rgba(0, 0, 0, 0.9) 0px 0px 50px 10px;
    border: 1px solid black;
    padding: 10px;
    z-index: 999;
    border-radius: 15px;
    `;

    var popupInnerCSS = `
    width: 100%;
    height: 100%;
    `;

    var popupBackgroundDivCSS = `
    width: 100%;
    height: 100%;
    position: fixed;
    top: 0;
    z-index: 999;
    `;

    var popupTopContainerCSS = `
    width: 100%;
    height: 100px;
    `;

    var popupTopContainerItemCSS = `
    padding-right: 5px;
    `;

    var popupContentContainerCSS = `
    width: 100%;
    height: calc(100% - 110px);
    background-color: lime;
    overflow-y: auto;
    `;

    // Funktion Aufrufen um eine verbindung mti der Datenbank herzustellen
    window.addEventListener("DOMContentLoaded", connectDatabase());

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
        //localStorage.getItem("popupDefaultCount")
        if(localStorage.getItem("popupDefaultCount") == null){
            popupDefaultCount = 25;
            localStorage.setItem("popupDefaultCount", popupDefaultCount)
            console.log("Default Wert für Popup Count nicht gesetzt. Setze auf Standart Wert: " + popupDefaultCount);
        }else{
            popupDefaultCount = parseInt(localStorage.getItem("popupDefaultCount"));
        }
        var updateAvailable = localStorage.getItem("updateAvailable");
        if(updateAvailable == null){
            //localStorage.setItem("updateAvailable", false);
            updateAvailable = false;
        }
        if(localStorage.getItem("autoScan") == null){
            localStorage.setItem("autoScan", false)
            console.log("Default Wert für AutoScan nicht gesetzt. Wert auf Deafult gesetzt: " + false);
        }else{
            popupDefaultCount = parseInt(localStorage.getItem("popupDefaultCount"));
        }
        if(localStorage.getItem("lastUpdateCheck") == null){
            localStorage.setItem("lastUpdateCheck",Date());
            lastUpdateCheck = new Date();
        }else{
            lastUpdateCheck = localStorage.getItem("lastUpdateCheck");
        }

    }

    // Überprüft ob ein Update verfügbar ist. Der Check wird Standartmäßig nur alle 24 Stunden durchgeführt.
    async function checkUpdate(){
        if(debug){console.log("Prüfe auf Updates")};
        // Wert aus Speicher in ein Datum Objekt konvertieren
        var lastUpdateCheckObj = new Date(lastUpdateCheck)
        // Errechnung der verbleibenen Zeit zwischen jetzt und letzer Prüfung
        var lastUpdateCheckDiff = ((new Date() - lastUpdateCheckObj) / (1000 * 60 * 60));
        // Konvertieren des Datums in ein lesbares Format
        var lastUpdateCheckLog = new Date(lastUpdateCheck).toLocaleString('de-DE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        if(debug){console.log("Letzte Überprüfung auf Updates: " + lastUpdateCheckLog);};
        // Überprüfen ob Timeout zwischen den Überprüfungen abgelaufen ist
        if(updateCheckInterval <= lastUpdateCheckDiff || localStorage.getItem("newVersion") == null){
            // Setzte das Datum der letzten Überprüfung auf jetzt
            localStorage.setItem("lastUpdateCheck",Date());
            try{
                // Abfrage der Version
                var version = await getVersion();
                // Überprüfung ob die Installierte Verion die gleiche Version auf GreasyFork ist
                if(GM_info?.script?.version != version){
                    if(debug){console.log("Version " + version + " verfügbar");};
                    // Lokal Speichern das ein Update verfügbar ist
                    localStorage.setItem("updateAvailable", true);
                    localStorage.setItem("newVersion", version);
                    return true;
                }else{
                    // Lokal Speichern das kein Update verfügbar ist
                    console.log("Aktuellste Version installiert");
                    localStorage.setItem("updateAvailable", false);
                    return false;
                }
            } catch (error) {
                // Ausgabe des Fehlers bei der Abfrage des Updates
                updateerror = error;
                console.log("Es gab einen Fehler bei der Versions Abfrage");
                console.log("Fehler: " + error);
                return "error";
            }
        }else{
            if(debug){
                console.log("Intervall zu gering. Prüfen auf Updates erfolgen nur 1x am Tag.");
            }
            // Angabe wann das nächste Update durchgeführt werden kann
            var nextUpdateCheck = new Date(lastUpdateCheckObj.getTime() + (updateCheckInterval * 60 * 60 * 1000));
            var nextUpdateCheckLog = new Date(nextUpdateCheck).toLocaleString('de-DE', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            if(debug){console.log("Nächste Überprüfung Erfolgt: " + nextUpdateCheckLog);};
            return "intervall"
        }
    }

    // Abfrage der Version von Greasyfork
    async function getVersion(){
        return new Promise((res, rej) => {
            GM.xmlHttpRequest({
                url: `https://greasyfork.org/scripts/471094.json`,
                onload: response => {
                    const data = JSON.parse(response.responseText)
                    // Wenn Debug aktiv wird der Wert auf 0.0 gesetzt, um die Update Funktion zu testen
                    if(debug){
                        return "0.0"
                    } else {
                        return res(data["version"])
                    };
                },
                onerror: err => {
                    return rej(err)
                }
            })
        })
    }

    // Erzeugen der Updatemeldung
    async function updateMessage() {
        var msg;

        // Update Div erstellen
        var updateMessageDiv = document.createElement('div');
        updateMessageDiv.style.cssText = updateMessageDivCSS;
        updateMessageDiv.setAttribute('id', 'ui-update');
        updateMessageDiv.hidden = true;

        // Content Div des Update Divs erstellen
        var updateMessageContent = document.createElement('div');
        updateMessageContent.style.cssText = updateMessageContentCSS;

        // Content Div dem Update Div als Child hinzufügen
        updateMessageDiv.appendChild(updateMessageContent);

        // Abfrage einer neuer Version
        switch(await checkUpdate()) {
                // Update verfügbar
            case true:
                var version = localStorage.getItem("newVersion");
                msg = "Version " + version + " verfügbar";
                message(msg);
                updateMessageContent.addEventListener('click', function() {
                    window.open(scriptURL, "_blank");
                });
                break;
                // Kein Update verfügbar
            case false:
                break;
                // Intervall noch nicht abgelaufen
            case "intervall":
                version = localStorage.getItem("newVersion");
                // Installierte Verion weicht von neuer Version ab
                if(GM_info?.script?.version != version){
                    if(debug){console.log("Neue Version vorhanden, intervall nicht abgelaufen, lade aus Local");};
                    // Erzeugung der Meldung
                    msg = "Version " + version + " verfügbar";
                    message(msg);
                    updateMessageContent.addEventListener('click', function() {
                        window.open(scriptURL, "_blank");
                    });
                }
                break;
                // Fehler bei der Abfrage
            case "error":
                msg = "Fehler Überprüfen von Updates";
                message(msg);
                updateMessageContent.addEventListener('click', function() {
                    alert("Error: " + updateerror);
                });
                break;
        }

        // Ein / Ausblenden der Nachricht
        function message(msg){
            // Setzten des Textes
            updateMessageContent.textContent = msg

            // Hinzufügen des Elementes zur Seite
            document.body.prepend(updateMessageDiv);

            // Verzögerung bevor die Nachricht
            setTimeout(() => {
                // Nachricht aktivieren mit Flex
                updateMessageDiv.style.display = "flex";
                // Anzeigen der Nachricht mit einer kurzen verzögerung
                setTimeout(() => {
                    var uiSetting = document.getElementById('ui-setting');
                    var uiButton = document.getElementById('ui-button');
                    var uiList = document.getElementById('ui-list');
                    var uiUpdate = document.getElementById('ui-update');
                    uiList.style.bottom = "90px";
                    uiButton.style.bottom = "50px";
                    uiSetting.style.bottom = "50px";
                    updateMessageDiv.hidden = false;
                    //updateMessageDiv.style.display = "flex";
                    updateMessageDiv.style.cursor = "pointer";
                    updateMessageDiv.style.height = "30px";
                    updateMessageDiv.style.opacity = "1";
                }, 200);
            }, 100);

            //Meldung ausblenden nach x Sekunden | Dauer der Einblendungen kann in den Einstellungen geändert werden
            setTimeout(() => {
                var uiSetting = document.getElementById('ui-setting');
                var uiButton = document.getElementById('ui-button');
                var uiList = document.getElementById('ui-list');
                var uiUpdate = document.getElementById('ui-update');
                uiList.style.bottom = "50px";
                uiButton.style.bottom = "10px";
                uiSetting.style.bottom = "10px";
                updateMessageDiv.hidden = true;
                updateMessageDiv.style.height = "0px";
                updateMessageDiv.style.opacity = "0";
                // 200ms (Zeit Animation) Warten bis die Nachricht ausgeblendet wird
                setTimeout(() => {
                    updateMessageDiv.style.display = "none";
                }, 200);
            }, (updateMessageDuration * 1000));
        }
    }

    // Funktion wird nach dem vollständigen Laden der Seite aufgerufen
    function connectDatabase(){
        // Verbindungsaufbau zur Datenbank
        const request = indexedDB.open(dbName, dbVersion);

        // Fehler Verbindung Datenbank
        request.onerror = function(event) {
            console.log("Fehler beim Öffnen der Datenbank");
        };

        // Verbindung erfolgreich
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
    }


    // Funktion zum Erstellen des UI
    async function createUI(){
        // Logo anstelle des Zahnrades
        var uiIMGurl = "https://m.media-amazon.com/images/G/01/vine/website/vine_logo_title._CB1556578328_.png";

        // Erstellung des Buttons der Einstellungen
        var addSettingsUIButton = document.createElement('div');
        addSettingsUIButton.setAttribute('id', 'ui-button');
        addSettingsUIButton.style.cssText = uiSettingCSS;
        // Click Event Einstellungs Button
        addSettingsUIButton.addEventListener('click', function() {
            // Erfassen der Elemente
            var settingPopup = document.getElementById('ui-setting');
            var settingPopupContent = document.getElementById('ui-setting-content');
            var uiList = document.getElementById('ui-list');
            // Standartmäßige Elemente Einblenden
            settingPopup.hidden = false;
            settingPopupContent.hidden = false;
            //addSettingsUIButton.hidden = true; // Deaktiviert -> Überarbeitung UI
            // Inhalt der Einstellungen erst Anzeigen nach der Animation
            setTimeout(() => {
                settingPopupContent.style.opacity = "1";
            },200); // 200ms Animationszeit
            // CSS Werte Höhe / Breite Einstellungsfenster
            settingPopup.style.display = "flex";
            settingPopup.style.width = "250px";
            settingPopup.style.height = "300px";
            // Button für die Liste der Produkte (Wert = höhe Einstellungsfenster + 20px)
            uiList.style.bottom = "320px";
            addSettingsUIButton.style.opacity = "0";
            addSettingsUIButton.style.cursor = "default";

        });

        // Erstellen des Bild Elementes
        var addUIIMG = document.createElement('img');
        addUIIMG.setAttribute('src' , uiIMGurl);

        // Inhalt des Einstellungsbuttons erstellen
        var addButtonContent = document.createElement('span');
        addButtonContent.textContent = '⚙️';
        addButtonContent.style.cssText = uiButtonContentCSS;

        // Hinzufügen des Einstellung Buttons zur Website
        //addSettingsUIButton.appendChild(addUIIMG); // Hinzufügen des Vine Logos -> Deaktiviert, überarbeitung??
        addSettingsUIButton.appendChild(addButtonContent);
        document.body.prepend(addSettingsUIButton);

        // Aufrufen der Funktion zum erstellen des Inhaltes des Einstellungsfensters
        createsettingPopup();

        // Erstellen des Elementes für die Produktliste
        var addListButton = document.createElement("div");
        addListButton.setAttribute('id', 'ui-list');
        addListButton.style.cssText = uiListCSS;

        // Click Event der Produktliste
        addListButton.addEventListener('click', function() {
            // Funktion aufrufen zum erstellen der Produktliste
            createPopup();
        });

        // Inhalt des Produktlisten Buttons erstellen
        var addListButtonContent = document.createElement('span');
        addListButtonContent.textContent = '📋';
        addListButtonContent.style.cssText = uiButtonContentCSS;

        // Hinzufügen des Produktlisten Buttons zur Website
        addListButton.appendChild(addListButtonContent);
        document.body.prepend(addListButton);
    }

    // Erstellen des Einstellungen Menüs
    async function createsettingPopup(){

        // Div Element der Einstellungen öffnen
        var settingPopup = document.createElement('div');
        settingPopup.setAttribute('id', 'ui-setting');
        settingPopup.style.cssText = settingPopupCSS;
        settingPopup.hidden = true; // Einstellungen beim laden der Seite verstecken

        // Div für den Inhalt erstellen
        var settingPopupContent = document.createElement('div');
        settingPopupContent.setAttribute('id', 'ui-setting-content');
        settingPopupContent.style.cssText = settingPopupContentCSS;
        settingPopupContent.hidden = true;

        // Div für den Schließen Button erstellen
        var closeButton = document.createElement('div');
        closeButton.style.cssText = settingPopupCloseButton;

        // Inhalt des Schließen Buttons erstellen
        var closeButtonContent = document.createElement('span');
        closeButtonContent.textContent = 'X';
        closeButtonContent.addEventListener('click', function() {
            // Close Setting Popup
            var uiList = document.getElementById('ui-list');
            settingPopupContent.style.opacity = "0";
            // rücksetzten der Werte nach ablaufn der Animation
            setTimeout(() => {
                var uiButton = document.getElementById('ui-button');
                uiList.style.bottom = "50px";
                settingPopup.style.width = "30px";
                settingPopup.style.height = "30px";
                uiButton.style.opacity = "1";
                uiButton.style.cursor = "pointer";
                settingPopupContent.hidden = true;
                settingPopup.hidden = true;
            }, 150); // 150ms -> Animationszeit Opacity
        });

        // Titel Div erstellen
        var titleDiv = document.createElement("div");
        titleDiv.style.cssText = titleDivCSS;

        // Titel Inhalt erstellen
        var titleDivContent = document.createElement("span");
        titleDivContent.style.cssText = titleDivContentCSS;
        titleDivContent.textContent = "VineViewer Einstellungen"

        // Div für den Einstellungsbereich erstellen
        var itemsDiv = document.createElement("div");
        itemsDiv.style.cssText = settingPopupItemListCSS

        // Funktion zum erstellen der Einstellungen
        async function addItem(ItemID){
            // Laden der Einstellungsoptionen aus der Liste (Einstellungsbereich)
            var ItemUID = id[ItemID][0];
            var titel = id[ItemID][1];
            var type = id[ItemID][2];

            // Erstellung des Containers für die Einstellungen
            var itemDiv = document.createElement("div");
            itemDiv.style.cssText = settingPopupItemCSS;

            // Linke Spalte der Einstellungen für den Input
            var itemLeftDiv = document.createElement("div");
            itemLeftDiv.style.cssText = settingPopupItemLeftCSS;

            // Rechte Spalte der Einstellungen für die Bezeichnung
            var itemRightDiv = document.createElement("div");
            itemRightDiv.style.cssText = settingPopupItemRightCSS;

            // Erstellung der Inputs
            var toggleSwitch = document.createElement('input');
            // type geladen aus der Liste
            toggleSwitch.setAttribute('type', type);
            toggleSwitch.setAttribute('id', ItemUID);
            toggleSwitch.style.bottom = "0px";
            toggleSwitch.setAttribute('value', "#FFFFFF");
            // Status auf Gespeicherten Wert setzten
            if(await getToggleStatus(ItemUID) && type == "checkbox"){
                toggleSwitch.setAttribute('checked', 'true');
            }else if(type == "color"){
                var value = await getColorStatus(ItemUID);
                toggleSwitch.setAttribute('value', value);
                // Sonder CSS Einstellungen für Color Input
                toggleSwitch.style.width = "22px";
                toggleSwitch.style.height = "22px";
            }
            // Event Listener für äderungen in den Einstellungen
            toggleSwitch.addEventListener('change', function() {
                switch(type){
                    case "checkbox":
                        // Aufrufen und weitergabe des Status
                        settingsClickEvent(ItemUID, this.checked);
                        // Speichern des neuen Wertes
                        saveToggleStatus(ItemUID, this.checked);
                        break;
                    case "color":
                        // Aufrufen und weitergabe des Wertes
                        settingsClickEvent(ItemUID, this.value);
                        // Speichern des neuen Wertes
                        saveColorStatus(ItemUID, this.value);
                        break;

                }
            });

            // Beschreibung der Einstellungsoption hinzufügen
            var toggleLabel = document.createElement('label');
            toggleLabel.textContent = titel;
            toggleLabel.setAttribute('for', ItemUID);

            // Input und Label dem rechten / linken Div hinzufügen
            itemLeftDiv.appendChild(toggleSwitch);
            itemRightDiv.appendChild(toggleLabel);

            // Linke / Rechte Seite dem Einstellungsdiv hinzufügen
            itemDiv.appendChild(itemLeftDiv);
            itemDiv.appendChild(itemRightDiv);

            // Gibt ein Einstellungselement zurück
            return itemDiv;
        }

        // Ausführen für jeden Einstrag in der Liste
        for(var x = 0 ; x < id.length; x++){
            // Erzeugen der Option
            var Item = await addItem(x);
            // hinzufügen der Option ins Einstellungsfenster
            itemsDiv.appendChild(Item);
        }

        // Elemente dem Einstellungsfenster hinzufügen
        closeButton.appendChild(closeButtonContent);
        titleDiv.appendChild(titleDivContent);
        settingPopupContent.appendChild(titleDiv);

        // Container Alle Daten löschen Button erstellen
        var buttonDeleteDataDiv = document.createElement('div');

        // Button Daten löschen erstellen
        var buttonDeleteData = document.createElement('button');
        // Aufrufen der Funktion zur Angabe der Daten in der Datenbank
        var cachedProductsCount = await getProductCacheLength();
        buttonDeleteData.textContent = cachedProductsCount + ' Daten löschen';
        buttonDeleteData.style.margin = "13px";
        // Click Event für den Delete Button
        buttonDeleteData.addEventListener('click', function() {
            // Sicherheitsabfrage ob wirklich alle Daten gelöscht werden sollen
            var confirmation = confirm('Möchten Sie wirklich alle Daten löschen?');
            if (confirmation) {
                // Wenn auf OK gedrückt Funktion aufrufen um Daten zu löschen
                clearCachedData();
            }
        });

        // Delete Button dem Container hinzufügen
        buttonDeleteDataDiv.appendChild(buttonDeleteData);

        // Hinzufügen des Containers in die Einstellungsübersicht
        itemsDiv.appendChild(buttonDeleteDataDiv);

        // Erstellen des Footer Containers
        var settingFooter = document.createElement("div");
        settingFooter.style.cssText = settingFooterCSS;

        // Erstellung der Footer Verlinkung
        var footerVersionLink = document.createElement("a");
        footerVersionLink.textContent = 'Version: ' + GM_info?.script?.version;
        footerVersionLink.href = scriptURL;
        footerVersionLink.target = "_blank"
        footerVersionLink.style.textDecoration = "none"
        footerVersionLink.style.color = "inherit"

        // Footer Verlinkung dem Footer Container hinzufügen
        settingFooter.appendChild(footerVersionLink);

        // Erstellung des Einstellungen Fensters
        settingPopupContent.appendChild(itemsDiv);
        settingPopupContent.appendChild(closeButton);
        settingPopupContent.appendChild(settingFooter);
        // Inhalt dem Einstellungs Container hinzufügen
        settingPopup.appendChild(settingPopupContent);
        // Einstellungsfenster der Website hinzufügen
        document.body.prepend(settingPopup);
    }

    // Auswertung der Click Events der Einstellungsoptionen || Umbau auf for schleife (id länge?)
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

    // Funktion zum anzeigen / Ausblenden des Datums
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

    // Funktion zum ausblenden / anzeigen der Amazon Empfehlen (nähe Footer)
    function toggleRecommendations(value) {
        const recom = document.getElementById('rhf');
        recom.hidden = value;
    }

    // Funktion zum ausblenden des Footers
    function toggleFooter(value){
        const footer = document.getElementById('navFooter');
        footer.hidden = value;
    }

    // Überprüfen ob der Wert des Auto Scan valide ist -> Aktuell keine Verwendung, Funktion wird ggf. später wieder hinzugefügt
    function checkScanPageInput(value) {
        var maxPage = getMaxPage();
        if(value > maxPage){
            console.log("Eingabe fehlerhaft");
            return false;
        }
        return true;
        console.log("Eingabe: " + value);
    }

    // Funktion zum ein / ausblenden der Hintergrundfarbe der Produkte
    function toggleHighlightVisibility(checked) {
        var highlightedDivs = document.getElementsByClassName('highlighted');

        for (var i = 0; i < highlightedDivs.length; i++) {
            var div = highlightedDivs[i];
            div.style.display = checked ? 'none' : 'block';
        }
    }

    // Funktion zum Speichern des Toggle Status der Einstellungen
    function saveToggleStatus(ItemUID, value){
        localStorage.setItem(ItemUID, value);
    }

    // Funktion zum Abfragen der Einstellungen aus dem Lokalen Speicher
    function getToggleStatus(ItemUID){
        const toggleStatus = localStorage.getItem(ItemUID);
        return toggleStatus === 'true';
    }

    // Funktion zum Speichern der Farbe im Einstellungsmenü
    function saveColorStatus(ItemUID, value){
        localStorage.setItem(ItemUID, value);
    }

    // Funktion zum Abrufen der Farbe im Einstellungsmenü aus dem Lokalen Speicher
    function getColorStatus(ItemUID){
        const value = localStorage.getItem(ItemUID);
        return value;
    }

    // Funktion zum Löschen der gespeicherten Daten
    function clearCachedData() {
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
                localStorage.removeItem('cachedProductIDs');
            };

            clearRequest.onerror = function(event) {
                console.log("Fehler beim Löschen des Datenbankinhalts");
            };
        };

        // Nach dem löschen der Daten Seite neu laden
        location.reload();
    }

    // Funktion zum Hervorheben der gecachten Produkte und Anzeigen des Datums
    async function highlightCachedProducts() { // umbennenung zu processCachedProducts()?
        // Ale Produkt Tiles der Seite erfassen
        var productTiles = document.getElementsByClassName('vvp-item-tile');
        // Aufrufen der Funktion um die IDs aus der Datenbank zu ziehen
        var cachedProductIDs = await getCachedProductIDs(); // Benötigt überarbeitung. Cache soll beim hinzufügen von Daten zur Datenbank auch im Cache ergänz werden.
        // Jedes Produkt Tile auf der Seite durchlaufen
        for (var i = 0; i < productTiles.length; i++) {
            var productTile = productTiles[i];
            var productID = getProductID(productTile);
            // Aufrufen der Funktion zum abfragen der Farbe aus dem Local Storage
            var color = await getColorStatus("colorHighlight");
            var isFav;
            // Prüfen ob die ID der Product Tile im Cache vorhanden ist
            if(cachedProductIDs.includes(productID)){
                // Prüfen ob das Produkt in der Datenbank vorhanden ist
                const productInfo = allData.find(data => data.ID === productID);
                // Class "highlighted" dem Product Tile hinzufügen
                productTile.classList.add('highlighted');
                // ändern der Hintergrundfarbe der Produkte im Cache
                productTile.style.backgroundColor = color;
                // Prüfen ob ein Element mit der Class vorhanden ist
                var dateDiv = productTile.querySelector('#p-date');
                if(!dateDiv){
                    // Wenn Element nicht vorhanden
                    var date = productInfo.Datum;
                    // Funktion zum hinzufügen des Datums aufrufen
                    addDateElement(productTile, date);
                }

            }
            // Funktion aufrufen zum hinzufügen des Favoriten Zeichens
            addFavElement(productTile, productID);
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
        // Prüfen ob das Datum versteckt oder angezeigt werden soll
        if(await getToggleStatus("toggleDate")){
            dateElement.style.display = "flex";
        } else {
            dateElement.style.display = "none";
        }

        // Datums Element wird an erster stelle dem Content Tile hinzugefügt
        var contentContainer = productTile.querySelector('.vvp-item-tile-content');
        contentContainer.insertBefore(dateElement, contentContainer.firstChild);
    }

    // Funktion zum hinzufügen des Favoriten Elements
    async function addFavElement(productTile, productID){
        // Setzen des Standart Wertes
        var isFav = false;

        // Abfrage der Product IDs aus der Datenbank
        var cachedProductIDs = await getCachedProductIDs(); // Beim laden der Seite einmaliges aufrufen von getCachedProductIDs bzgl. Permormance??
        // Auslesen des Favoriten Wertes
        if(cachedProductIDs.includes(productID)){
            const productInfo = allData.find(data => data.ID === productID);
            isFav = productInfo.Favorit;
        }

        // Erstellen des Favoriten Elements
        var favElement = document.createElement('div');

        favElement.setAttribute("id", "p-fav");
        favElement.style.cssText = favCSS;
        favElement.textContent = "★";
        // Bei Favoriten den Stern in Gelb
        if(isFav){
            favElement.style.color = "#ffe143"; // "#ffe143" = Gelb
        }

        // Event Handler beim Clicken auf den Stern
        favElement.addEventListener('click', async function() {
            // Verbindung mit der Datenbank herstellen
            const request = indexedDB.open(dbName, dbVersion);

            request.onerror = function(event) {
                console.log("Fehler beim Öffnen der Datenbank ID: FAV");
            };

            request.onsuccess = function(event) {
                const db = event.target.result;

                const transaction = db.transaction([objectStoreName], "readwrite");
                const objectStore = transaction.objectStore(objectStoreName);
                // Suchen der Product ID in der Datenbank
                const getRequest = objectStore.get(productID);
                getRequest.onsuccess = function(event) {
                    const data = event.target.result;
                    if (data) {                                                                 // Beim scannen des sichtbaren Bereiches kommt es hier zu einem fehler, da die ID die sich halb im sichtfeld befindet, noch nicht in der Datenbank eingetragen ist
                        // Neuen Wert für den Favoriten der Datenbank hinzufügen                // Abhilfe könnte schaffen das Produkt dann zur Datenbank hinzuzufügen und als Favorit zu setzten, auch wenn es außerhalb dessichtbaren bereiches ist
                        data.Favorit = !isFav;
                        const updateRequest = objectStore.put(data);
                        updateRequest.onsuccess = function(event) {
                            if(debug){console.log(`Favorit-Wert für ID ${productID} wurde erfolgreich aktualisiert.`)};
                            // Visuelle Elemente Updaten
                            isFav = !isFav;
                            if(isFav){
                                favElement.style.color = "#ffe143";
                            }else{
                                favElement.style.color = "white";
                            }
                            // Aktualisieren der Daten
                            allData = getAllDataFromDatabase();
                        };
                        updateRequest.onerror = function(event) {
                            console.log(`Fehler beim Aktualisieren des Favorit-Werts für ID ${productID}.`);
                        };
                    } else {
                        // Product ID wurde nicht in der Datenbank gefunden
                        console.log(`Datensatz mit ID ${productID} wurde nicht gefunden.`);
                    }
                };

                getRequest.onerror = function(event) {
                    console.log(`Fehler beim Abrufen des Datensatzes mit ID ${productID}.`);
                };
            };
        });
        // Hinzufügen des Favoriten Elementes zur roduct Tile
        var contentContainer = productTile;
        contentContainer.insertBefore(favElement, contentContainer.firstChild);
    }

    // Funktion zum Scannen und Zwischenspeichern der Produkte im vollständigem Sichtbereich
    function scanAndCacheVisibleProducts() { // Zusammenfügen mit scanAndCacheAllProducts()? Teils doppelter Code
        var productTiles = document.getElementsByClassName('vvp-item-tile');
        var visibleProductIDs = [];
        var visibleProductTitles = [];
        var visibleProductLinks = [];
        var visibleProductImages = [];
        var visibleProductButtons = [];
        // Durchlaufen aller Product Tiles der Seite
        for (var i = 0; i < productTiles.length; i++) {
            var productTile = productTiles[i];
            // Aufrufen der Funktion ob sich das Tile im sichtfeld befindet
            if (isElementVisible(productTile)) {
                // Aufrufen der Funktion zum abfragen der Produt ID aus dem Product Tile
                var productID = getProductID(productTile);
                // Speichern der Product ID im Array der sichtbaren product IDs
                visibleProductIDs.push(productID);
                // Abrufen der Daten aus dem Product Tile
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
        // Aufrufen der Funktion um die Daten in die Datenbank zu speichern
        cacheProducts(visibleProductIDs, visibleProductTitles, visibleProductLinks, visibleProductImages, visibleProductButtons);
    }

    // Hier setzen wir einen Konsolen-Listener


    //Auto Scan per Befehlszeile starten -> autoscan(5) -> Scannt bis Seite 5
    window.autoscan = function(value) {
        // Rückgabe in der Konsole das der Befehl erkannt wurde
        console.log('Autoscan gestartet mit Wert:', value);
        // Aufrufen der Funktion zum Automatischen Scannen, weitergabe des Wertes, bis zu welcher Seite gescannt werden soll
        AutoScanStart(value);
    };

    // Funktion zum Starten des Automatischen Scans. Variablen und Listen werden vorbereitet
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

    // Funktion zum überprüfen und Steuern des Auto Scans
    function checkForAutoScan() {
        // Prüfen ob ein AutoScan aktiv ist
        if(localStorage.getItem("autoScan")=="true"){
            // generieren der Wartezeit der Weiterleitung, basierend auf den Werten der Einstellungen
            var rand = random(redirectMinTime * 1000, redirectMaxTime * 1000);
            console.log("AutoScan aktiv!");
            // Funktion aufruen um den aktuellen Wert der Seite azufragen
            var currentPage = getCurrentPage();
            var maxPage = localStorage.getItem("scanToPage")
            var nextPage = getCurrentPage() + 1;

            // Speichert alle Produckte der Seite, nachdem das erste mal weitergeleitet wurde
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
                // Aktuelle Seite hat den Wert der zu scannenden Seiten erreicht oder den Wert der maximal vorhandenen Seiten überschritten
                // Auto Scan abgeschlossen
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
            // redirectTimeout = setTimeout(redirectNextPage, rand, url); würde hier merh sinn ergeben??
        }
    }

    // Funktion zum erstellen eines zufälligen Wertes zwischen einem Min und Max Wert
    function random(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Funktion zum weiterleiten auf eine andere Seite
    function redirectNextPage(nextPage){
        location.replace(url);
        console.log("Redirect");
        console.log("Next Page: " + nextPage);
    }

    // Funktion zum Scannen aler produkte, auch außerhalb des sichtbereiches -> Zusammenlegen mit scanAndCacheAllVisibleProdut?
    function scanAndCacheAllProducts() {
        // Erfassen der product Tiles
        var productTiles = document.getElementsByClassName('vvp-item-tile');
        var ProductIDs = [];
        var ProductTitles = [];
        var ProductLinks = [];
        var ProductImages = [];
        var ProductButtons = [];

        // Durchlaufen aller Erfassten Product Tiles
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
        // Aufrufen der Funktion sum speichern der Daten in die Datenbank
        cacheProducts(ProductIDs, ProductTitles, ProductLinks,ProductImages, ProductButtons);
    }

    // Funktion zum speichern der aktuellen Seite in den Lokalen Speicher
    function saveCurrentPage() {
        var pagination = document.querySelector('.a-pagination');
        if(pagination != null) {
            var currentPageElement = pagination.querySelector('.a-selected a');
            var currentPage = parseInt(currentPageElement.textContent.trim());
            localStorage.setItem("currentPage", currentPage);
            if(debug){console.log('Current Page Saved:', currentPage);}
        }
    }

    // Funktion zur Abfrage der aktuellen Seite aus dem lokalen Speicher
    function getCurrentPage() {
        return parseFloat(localStorage.getItem("currentPage"));
    }

    // Funktion zum Speichern der maximalen Seite
    function saveMaxPage(){
        // Elelement, welche die höchste Seitenzhl enthält
        var pagination = document.querySelector('.a-pagination');
        if(pagination != null) {
            if(debug == true){console.log("Max Pages Element: " + pagination.lastChild.previousSibling.lastChild);}

            // Seitenzahl aus dem Element laden
            var maxPage = parseInt(pagination.lastChild.previousSibling.lastChild.textContent.trim());
            // Speichern der Seitenzahl in den lokalen Speicher
            localStorage.setItem("maxPage", maxPage);
            if(debug == true){console.log('Max Page:', maxPage);}
        }
    }

    // Funktion zum auslesen der Maximalen Seite aus dem Lokalen Speicher
    function getMaxPage() {
        return parseFloat(localStorage.getItem("maxPage"));
    }

    // Gibt das gespeicherte Datum für eine Produkt-ID zurück
    async function getSavedDate(productID) {
        var data = await getCachedProductIDInfo(productID);
        return data.Datum;
    }

    // Funktion zum Speichern der Produkt-IDs in die Datenbank
    async function cacheProducts(productIDs, titles, links, images, buttons) {
        var cachedProductIDs = await getCachedProductIDs();
        var productCacheLength = await getProductCacheLength();
        if(debug == true){console.log("Cache: " + productCacheLength)};
        // Für jedes Produkt auf der Seite durchlaufen
        productIDs.forEach(async function(productID, index) {
            // Prüfen ob die ID bereits in der Datenbank vorhanden ist
            const findid = await checkForIDInDatabase(productID);
            if(findid == false){
                // ID nicht in der Datenbank
                if(debug == true){console.log("Produkt hinzuügen")}
                // Datum in ein Lesbares Format konvertieren
                var currentDate = new Date().toLocaleString('de-DE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
                // Verbindung zur Datenbank herstellen
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
                    // Daten in dei Datenbank schreiben
                    const addRequest = objectStore.add(data);
                    // Hinzufügen der Daten erfolgreich
                    addRequest.onsuccess = function(event) {
                        if(debug == true){console.log("Daten hinzugefügt")};
                    };
                    // Fehler beim hinzufügen der Daten
                    addRequest.onerror = function(event) {
                        console.log("Fehler beim Hinzufügen der Daten");
                    };
                };
            }else{
                // Produkt bereits in der Datenbank vorhanden
                if(debug == true){console.log("Produkt bereits vorhanden")};
            }
        });
        // Hinzufügen der neu hinzugefügten IDs in den lokal cache
        localStorage.setItem('cachedProductIDs', JSON.stringify(cachedProductIDs)); // Sinnvoll ?? -> onsuccess mehr sinn?? nicht alle daten auf einmal sondern nur die erfolgreichen
    }

    // Überprüfen ob die ID bereits in der Datenbank vorhanden ist
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
                // Datenbank filtern nach der ID
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

    // Alled Daten in der Datenbank abrufen
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
        });
    }

    // Funktion gibt Informationen einer bestimmten Produkt ID zurück
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

    // Funktion gibt alle Product IDs die in der Datenbank gespeichert sind zurück
    async function getCachedProductIDs() {
        return new Promise((resolve, reject) => {
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

    // Funktion gibt die anzahl der in der Eingetragenen IDS in der Datenbank zurück
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

    // Funktion überprüft ob die Podukt ID bereits in der Datenbank ist | gibt true / false zurück
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
            openList = 1;
            var page = 1;
            var startCount = 0;
            var stopCount = startCount + popupDefaultCount;
            var productCacheLength = await getProductCacheLength();



            var popupBackgroundDiv = document.createElement('div');
            popupBackgroundDiv.setAttribute("id","popup-background-div");
            popupBackgroundDiv.style.cssText = popupBackgroundDivCSS;
            popupBackgroundDiv.addEventListener('click', function(event) {
                closePopup();
            })

            var popup = document.createElement('div');
            popup.setAttribute('id', 'vine-viewer-popup');
            popup.style.cssText = popupCSS;

            var popupInner = document.createElement('div');
            popupInner.setAttribute('id', 'popup-inner');
            popupInner.style.cssText = popupInnerCSS;
            popup.appendChild(popupInner);

            // Erstellen des schließen Buttons
            var closeButton = document.createElement('div');
            closeButton.textContent = 'X';
            closeButton.style.position = 'absolute';
            closeButton.style.top = '5px';
            closeButton.style.right = '10px';
            closeButton.style.cursor = 'pointer';
            closeButton.addEventListener('click', function() {
                closePopup();
            });

            var popupTopContainer = document.createElement('div');
            popupTopContainer.setAttribute('id', 'popupTopContainer');
            popupTopContainer.style.cssText = popupTopContainerCSS;

            var popupTopContainerNav = document.createElement('div');
            popupTopContainerNav.setAttribute('id', 'popupTopContainerNav');

            popupTopContainer.appendChild(popupTopContainerNav);

            const navoptions = [
                ["all", "Alle Produkte"],
                ["favs", "Favoriten"]
            ]

            for(var no = 0; no <= (navoptions.length -1); no++){
                var navigationoption = document.createElement('span');
                navigationoption.style.cssText = popupTopContainerItemCSS;
                navigationoption.textContent = navoptions[no][1] + " |";
                navigationoption.setAttribute('id', navoptions[no][0]);
                if(no == 0){
                    navigationoption.style.fontWeight = 'bold';
                };
                navigationoption.addEventListener('click', async function(event) {
                    var clickedItemId = event.target.id;
                    var spanElements = document.querySelectorAll("#popupTopContainerNav span");
                    spanElements.forEach(function(span) {
                        span.style.fontWeight = 'normal';
                    });
                    event.target.style.fontWeight = 'bold';
                });
                popupTopContainerNav.appendChild(navigationoption);
            };

            var popupTopContainerSearch = document.createElement('div');
            popupTopContainerSearch.setAttribute('id', 'popupTopContainerSearch');

            var searchTitel = document.createElement('span');
            searchTitel.style.height = '30px';
            searchTitel.style.width = '50px';
            searchTitel.style.padding = '5px';
            searchTitel.style.fontWeight = 'bold';
            searchTitel.textContent = 'Filter: ';

            popupTopContainerSearch.appendChild(searchTitel);

            // Erstellen der Suche
            var searchInput = document.createElement('input');
            searchInput.setAttribute('type', 'text');
            searchInput.setAttribute('id', 'popup-search-input');
            searchInput.style.height = '30px';
            searchInput.style.width = '500px';
            searchInput.style.padding = '5px';
            searchInput.addEventListener('input', function(event) {
                // Such Funktion
            });

            var searchButton = document.createElement('button');
            searchButton.textContent = "Suchen";
            searchButton.addEventListener('click', function(event) {
                var type = "titel";
                var filter = searchInput.value.toLowerCase();
//                filterItems(type, filter);
                updatePopup();
            });

            popupTopContainerSearch.appendChild(searchInput);
            popupTopContainerSearch.appendChild(searchButton);
            popupTopContainer.appendChild(popupTopContainerSearch);

            // Navigation
            var popupTopContainerItems = document.createElement('div');
            popupTopContainerItems.setAttribute('id', 'popup-top-items');

            popupTopContainer.appendChild(popupTopContainerItems);

            var popupContainerItemsSpan = document.createElement('span');
            popupContainerItemsSpan.textContent = "xx - xx / XXX";

            popupTopContainerItems.appendChild(popupContainerItemsSpan);

            // Angabe der Optionen der Produkt Anzahl Auswahl
            const options = [
                [25,"25"],
                [50,"50"],
                [100,"100"],
                [250,"250"]
            ];

            var popupTopContainerProductCountSelect = document.createElement('select');

            popupTopContainerItems.appendChild(popupTopContainerProductCountSelect);

            for(var o = 0; o <= (options.length -1); o++){
                var option = document.createElement("option");
                option.value = options[o][0];
                option.text = options[o][1];
                if(option.value == popupDefaultCount){
                    option.selected = true;
                }
                popupTopContainerProductCountSelect.appendChild(option);
            }


            var popupTopContainerPages = document.createElement('div');
            popupTopContainerPages.setAttribute('id', 'popup-top-pages');

            popupTopContainer.appendChild(popupTopContainerPages);

            var popupButtonBack = document.createElement('button');
            popupButtonBack.textContent = "<";
            popupButtonBack.addEventListener('click', function(event) {
                page--;
                updatePopup();
            });

            popupTopContainerPages.appendChild(popupButtonBack);

            var popupDisplayPages = document.createElement('span');
            popupDisplayPages.setAttribute('id', 'popup-top-pages-display');
            popupDisplayPages.textContent = " - / - ";

            popupTopContainerPages.appendChild(popupDisplayPages);

            var popupButtonNext = document.createElement('button');
            popupButtonNext.textContent = ">";
            popupButtonNext.addEventListener('click', function(event) {
                page++;
                updatePopup();
            });

            popupTopContainerPages.appendChild(popupButtonNext);

            // Beginn Popup Content
            var popupContentContainer = document.createElement('div');
            popupContentContainer.style.cssText = popupContentContainerCSS;


            function addItemList(data, page){
                var cacheLength = data.length;
                try{
                    console.log("Länge: " + cacheLength);
                    if(cacheLength == 0){
                        console.log("Keine Produkte mit den Suchkreterien");
                        return;
                    }
                    startCount = (page * popupDefaultCount) - popupDefaultCount;
                    stopCount = startCount + popupDefaultCount;
                    if(stopCount >= productCacheLength){
                        stopCount = productCacheLength;
                    }


                    for(var x = startCount; x <= (stopCount - 1); x++){
                        var Item = document.createElement('p');
                        Item.setAttribute('id', 'product-container');
                        Item.textContent = "[" + x + "] " + data[x].Titel;
                        popupContentContainer.appendChild(Item);

                    }

                    var pageMax = Math.ceil(productCacheLength / popupDefaultCount);
                    var pageDisplay = document.getElementById("popup-top-pages-display");
                    pageDisplay.textContent = page + " / " + pageMax;

                }catch(error){
                    console.log("Error: " + error);
                    return;
                }


            }

            function updatePopup(){
                var data = [];
                // Get Search Input
                var searchInput = document.getElementById('popup-search-input');
                var searchQuery = searchInput.value.toLowerCase();
                removeItemList();
                addItemList(allData, page);
            }

            function removeItemList() {
                var elementsToRemove = document.querySelectorAll('#product-container');
                for (var i = 0; i < elementsToRemove.length; i++) {
                    var element = elementsToRemove[i];
                    element.parentNode.removeChild(element);
                }
            }




            document.body.appendChild(popupBackgroundDiv);

            popupInner.appendChild(closeButton);
            popupInner.appendChild(popupTopContainer);
            popupInner.appendChild(popupContentContainer);
            document.body.appendChild(popup);
        }

        function closePopup(){
            document.body.removeChild(popup);
            document.body.removeChild(popupBackgroundDiv);
            openList = false;
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

    // Main Funktion, wird aufgerufen nachdem eine Verbindung zur Datenbank hergestellt wurde
    // Steuert den Ablauf des Scriptes, an welcher Reihenolge die Funktionen geladen werden.
    async function main() {
        if(debug){console.log("[INI] - Amazon Vine Viewer")};
        var nextPage;
        var currentPage;
        var maxPage;
        var rand;
        checkForAutoScan();
        loadSettings();
        await saveCurrentPage();
        if(debug){console.log("[INI] - Aktuelle Seite gespeichert")};
        await saveMaxPage();
        if(debug){console.log("[INI] - Maximale Seite gespeichert")};
        try{
            allData = await getAllDataFromDatabase();
            if(debug){console.log("[INI] - Alle Daten abgefragt")};
        } catch (error) {
            console.log("Fehler beim abrufen der Datenbank");
        }
        await createUI();
        if(debug){console.log("[INI] - Overlay geladen")};
        await updateMessage();
        if(debug){console.log("[INI] - Prüfen auf Updates")};
        await highlightCachedProducts();
        if(debug){console.log("[INI] - Cached Produkte hervorgehoben")};
        await checkForAutoScan();
        if(debug){console.log("[INI] - Auto Scan überprüft")};
        var highlightVisibility = getToggleStatus("toggleHighlight");
        await toggleHighlightVisibility(highlightVisibility);
        if(debug){console.log("[INI] - Sichtbarkeit an / aus")};
        if(getToggleStatus("toggleScan")){
            scanAndCacheVisibleProducts();
            if(debug){console.log("[INI] - Sichtbare Produkte Scannen")};
        }else{
            await scanAndCacheAllProducts();
            if(debug){console.log("[INI] - Alle Produkte Scannen")};
        }
        createPopup();
        window.addEventListener('scroll', function(event){
            if(localStorage.getItem("autoScan") == "false"){
                scanAndCacheVisibleProducts();
            }
        });
        window.addEventListener("keydown", function(event) {
        if (event.keyCode === 27 || event.key === "Escape") {
            if(openList === 1){
                var popup = document.getElementById('vine-viewer-popup');
                var popupBackgroundDiv = document.getElementById('popup-background-div');
                document.body.removeChild(popup);
                document.body.removeChild(popupBackgroundDiv);
                openList = false;
            }
        }
        });
    }
})();
