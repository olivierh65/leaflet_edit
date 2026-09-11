L.Control.cascadeButtons = L.Control.extend({
    options: {
        position: 'bottomright',
        direction: 'horizontal',
        className: ''
    },

    initialize: function(buttons, options){
        L.Util.setOptions(this, options);
        this._buttons = buttons;
    },

    onAdd: function (map){
        const className = (this.options.className) ? this.options.className : 'leaflet-control-cascadeButtons';
        const directionClass = this.buildDirection(this.options.direction);
        // Conserve TOUJOURS la classe de base (flex horizontal) + la classe
        // metier (businessBar) + la direction : sans la classe de base, le
        // conteneur retombe en bloc vertical (float/clear Leaflet).
        const toolBar = L.DomUtil.create('div', `leaflet-control-cascadeButtons ${className} ${directionClass}`);

        this._buttons.forEach((button)=>{

            const directionClass = this.buildDirection(this.getOposite(this.options.direction));
            const container = L.DomUtil.create('div', `${directionClass}`);
            toolBar.append(container);

            // L'icone peut etre une classe CSS (ex "fa-solid ...") ou un
            // contenu HTML/texte (ex emoji). On distingue les deux cas :
            // une icone contenant un espace ou commencant par "fa" est une
            // classe, sinon c'est un contenu a afficher dans le bouton.
            const mainButton = L.DomUtil.create('button', 'cascade-main-btn');
            mainButton.setAttribute("type", "button");
            mainButton.setAttribute("aria-expanded", "false");
            mainButton.setAttribute("title", button.title !== undefined ? button.title : '');
            setButtonIcon(mainButton, button.icon);
            container.append(mainButton);

            if(button.items && button.items.length>0){

                button.items.forEach((item)=>{
                    const childButton = L.DomUtil.create('button','cascade-sub-btn hidden');
                    childButton.setAttribute("type", "button");
                    childButton.setAttribute("aria-expanded", "false");
                    childButton.setAttribute("title", item.title !== undefined ? item.title : '');
                    setButtonIcon(childButton, item.icon);
                    container.append(childButton);
                    // Après exécution de l'action, referme le sous-menu.
                    // (click conservé tel quel : certaines actions comme
                    // l'import de fichier exigent un geste click natif.)
                    childButton.addEventListener('click', () => {
                        item.command();
                        collapseContainer(container, mainButton);
                    });
                })

                bindCascadeMainButton(mainButton, container, button);
            }
            else {
                mainButton.addEventListener('click', function(){
                    (!button.ignoreActiveState) ? mainButton.classList.toggle('activeButton') : '';
                    button.command();
                })
            }
        })

        L.DomEvent.disableClickPropagation(toolBar);
        try {
            if (typeof L.DomEvent.disableScrollPropagation === 'function') {
                L.DomEvent.disableScrollPropagation(toolBar);
            }
        } catch (errScroll) {}
        // Les gestes tactiles sur la barre ne doivent pas traverser vers la
        // carte (pan/zoom intempestif quand on ouvre un menu sur mobile).
        try {
            if (toolBar.addEventListener) {
                toolBar.addEventListener('touchstart', function (ev) {
                    try { ev.stopPropagation(); } catch (eStop) {}
                }, { passive: true });
            }
        } catch (errTouch) {}
        // Refermeture auto : tap carte / déplacement / zoom / Échap / tap
        // hors barre (indispensable sur mobile : sinon un sous-menu reste
        // bloqué ouvert et masque la carte).
        wireCascadeDismiss(map, toolBar);

        return toolBar;
    },

    buildDirection: function(direction){

        if(direction === "vertical"){
            if((this.options.position).includes('left')){
                if(this.options.position.includes('bottom')) direction = direction + ' col-reverse'
            }
            if((this.options.position).includes('right')){
                if(this.options.position.includes('bottom')) direction = direction + ' col-reverse'
                direction = direction + ' right';
            }
        }
        else if(direction === "horizontal"){
            if((this.options.position).includes('top')){
                if(this.options.position.includes('right')) direction = direction + ' row-reverse';
            }
            if((this.options.position).includes('bottom')){
                if(this.options.position.includes('right')) direction = direction + ' row-reverse';
                direction = direction + ' bottom'
            }
        }

        return direction
    },

    getOposite: function(direction){
        return (direction === "vertical") ? "horizontal" : "vertical"
    }
})

L.cascadeButtons = function(buttons, options){
    return new L.Control.cascadeButtons(buttons, options);
}

// Parcourt les seuls enfants ELEMENTS d'un conteneur.
// (Robuste vieux navigateurs : pas de NodeList.forEach, pas de noeuds
// texte ; .children est supporté partout, y compris Samsung Internet.)
function eachElementChild(container, fn){
    try {
        if (!container || typeof fn !== 'function') {
            return;
        }
        var kids = container.children || [];
        for (var i = 0; i < kids.length; i++) {
            fn(kids[i], i);
        }
    } catch (err) {}
}

// Replie le sous-menu d'un groupe (utilisé après sélection d'une action).
function collapseContainer(container, mainButton){
    eachElementChild(container, function (child, index) {
        if (index !== 0 && child.classList) {
            child.classList.add('hidden');
        }
    });
    if (mainButton) {
        mainButton.setAttribute('aria-expanded', 'false');
        if (mainButton.classList) {
            mainButton.classList.remove('activeButton');
        }
    }
}

// Déplie/replie le sous-menu d'un groupe. À l'ouverture, referme les
// autres groupes éventuellement ouverts (barre métier : un seul menu
// déplié à la fois : Fichier / Edition / Outils).
function toggleContainer(container, mainButton, button){
    var willOpen = !mainButton || mainButton.getAttribute('aria-expanded') !== 'true';
    if (willOpen) {
        collapseSiblingContainers(container);
    }
    eachElementChild(container, function (child, index) {
        if (index !== 0 && child.classList) {
            child.classList.toggle('hidden');
        }
    });

    if (mainButton) {
        var expanded = mainButton.getAttribute('aria-expanded') === 'true';
        mainButton.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        if (button && !button.ignoreActiveState && mainButton.classList) {
            mainButton.classList.toggle('activeButton');
        }
    }
}

// Referme tous les groupes frères d'un conteneur (même barre d'outils).
function collapseSiblingContainers(container){
    try {
        if (!container || !container.parentNode) {
            return;
        }
        Array.prototype.forEach.call(container.parentNode.childNodes, function (sibling) {
            if (sibling === container || !sibling.querySelector) {
                return;
            }
            var sibMain = sibling.querySelector(".cascade-main-btn");
            if (!sibMain || sibMain.getAttribute("aria-expanded") !== "true") {
                return;
            }
            eachElementChild(sibling, function (child, index) {
                if (index !== 0 && child.classList) {
                    child.classList.add("hidden");
                }
            });
            sibMain.setAttribute("aria-expanded", "false");
            if (sibMain.classList) {
                sibMain.classList.remove("activeButton");
            }
        });
    } catch (err) {}
}

// Referme TOUS les groupes ouverts d'une barre (ou du document).
function collapseAllCascadeMenus(scope){
    try {
        var root = scope || (typeof document !== 'undefined' ? document : null);
        if (!root || !root.querySelectorAll) {
            return;
        }
        var mains = root.querySelectorAll('.cascade-main-btn[aria-expanded="true"]');
        Array.prototype.forEach.call(mains, function (main) {
            try {
                if (main.parentNode) {
                    eachElementChild(main.parentNode, function (child, index) {
                        if (index !== 0 && child.classList) {
                            child.classList.add('hidden');
                        }
                    });
                }
                main.setAttribute('aria-expanded', 'false');
                if (main.classList) {
                    main.classList.remove('activeButton');
                }
            } catch (eInner) {}
        });
    } catch (err) {}
}

// Branche un bouton principal : tactile (touchend immédiat) + souris.
// Le touchend neutralise le click synthétique qui suit (~300 ms sur les
// vieux navigateurs) pour éviter le double bascule ouvrir -> refermer
// constaté sur Android (Chrome / Samsung Internet).
function bindCascadeMainButton(mainButton, container, button){
    var suppressClick = false;
    function onActivate(){
        toggleContainer(container, mainButton, button);
    }
    try {
        mainButton.addEventListener('touchend', function (ev) {
            try { ev.preventDefault(); } catch (ePrev) {}
            try { ev.stopPropagation(); } catch (eStop) {}
            suppressClick = true;
            onActivate();
            setTimeout(function () { suppressClick = false; }, 600);
        }, { passive: false });
    } catch (errTouch) {}
    mainButton.addEventListener('click', function (ev) {
        if (suppressClick) {
            suppressClick = false;
            return;
        }
        onActivate();
    });
}

// Refermeture automatique des sous-menus : interaction carte (tap, pan,
// zoom), tap hors barre, Échap. Branché une fois par barre.
function wireCascadeDismiss(map, toolBar){
    try {
        if (!toolBar || toolBar._cascadeDismissWired) {
            return;
        }
        toolBar._cascadeDismissWired = true;
        var collapseAll = function () { collapseAllCascadeMenus(toolBar); };
        if (map && typeof map.on === 'function') {
            map.on('movestart zoomstart dragstart click', collapseAll);
        }
        if (typeof document !== 'undefined' && document.addEventListener) {
            var onOutsideDown = function (ev) {
                try {
                    if (toolBar.contains && ev.target && toolBar.contains(ev.target)) {
                        return;
                    }
                    collapseAllCascadeMenus(toolBar);
                } catch (eOut) {}
            };
            if (typeof window !== 'undefined' && typeof window.PointerEvent !== 'undefined') {
                document.addEventListener('pointerdown', onOutsideDown, { passive: true });
            } else {
                // Repli navigateurs sans PointerEvent (vieux Samsung Internet).
                document.addEventListener('touchstart', onOutsideDown, { passive: true });
                document.addEventListener('mousedown', onOutsideDown);
            }
            document.addEventListener('keydown', function (ev) {
                try {
                    var key = ev.key || ev.keyCode;
                    if (key === 'Escape' || key === 'Esc' || ev.keyCode === 27) {
                        collapseAllCascadeMenus(toolBar);
                    }
                } catch (eKey) {}
            });
        }
    } catch (err) {}
}

// Applique l'icone d'un bouton : SVG/HTML inline (commence par "<"),
// classe CSS (ex "fa-solid fa-save"), ou texte brut (emoji, lettre).
// Sans icone : pastille "•".
function setButtonIcon(btn, icon){
    btn.innerHTML = '';
    if (!icon) {
        btn.textContent = '•';
        return;
    }
    var str = String(icon).trim();
    // Contenu HTML/SVG inline : commence par "<".
    // (Teste en premier : un SVG contient des espaces, ce qui fausserait
    // le test "classe CSS" ci-dessous.)
    if (str.charAt(0) === '<') {
        btn.innerHTML = str;
        return;
    }
    // Classe(s) CSS : contient un espace ("fa-solid fa-save") ou
    // ressemble a une classe d'icone connue.
    if (/\s/.test(str) || /^(fa|fas|far|fal|fab|fad|glyphicon|icon|mdi)-?/i.test(str)) {
        const span = L.DomUtil.create('span', str, btn);
        span.setAttribute('aria-hidden', 'true');
        return;
    }
    // Sinon : texte brut (emoji, lettre...).
    btn.textContent = str;
}
