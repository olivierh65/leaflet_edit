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
                    childButton.addEventListener('click', () => {
                        item.command();
                        collapseContainer(container, mainButton);
                    });
                })

                mainButton.addEventListener('click', function(){
                    toggleContainer(container, mainButton, button);
                })
            } 
            else {
                mainButton.addEventListener('click', function(){
                    (!button.ignoreActiveState) ? mainButton.classList.toggle('activeButton') : '';
                    button.command();
                })
            }
        })

        L.DomEvent.disableClickPropagation(toolBar);

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

// Replie le sous-menu d'un groupe (utilisé après sélection d'une action).
function collapseContainer(container, mainButton){
    container.childNodes.forEach((child, index) => {
        if(index!==0) child.classList.add('hidden');
    });
    if (mainButton) {
        mainButton.setAttribute('aria-expanded', 'false');
        mainButton.classList.remove('activeButton');
    }
}

// Déplie/replie le sous-menu d'un groupe.
function toggleContainer(container, mainButton, button){
    container.childNodes.forEach((child, index) => {
        if(index!==0) child.classList.toggle('hidden');
    });

    const isAriaExpanded = JSON.parse(mainButton.getAttribute("aria-expanded"));
    mainButton.setAttribute('aria-expanded', !isAriaExpanded);

    (!button.ignoreActiveState) ? mainButton.classList.toggle('activeButton') : '';
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