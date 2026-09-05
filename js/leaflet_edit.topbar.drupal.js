/**
 * @file
 * Barre de menu classique pour Leaflet Map Editor.
 *
 * Affiche uniquement les thèmes (Dessin | Édition | Fichiers | Carte),
 * chaque thème déroulant ses fonctions au clic / au survol.
 * La barre est insérée DANS le conteneur de la carte, collée en haut :
 * elle reste donc visible et fonctionnelle en mode plein écran
 * (le fullscreen Leaflet ne fait que passer ce conteneur en fullscreen).
 *
 * Fonctionnement :
 * - Un tap simple sur une trace la SÉLECTIONNE (surlignage + tooltip).
 * - Les entrées de menu agissent sur la couche sélectionnée en
 *   construisant un faux événement { relatedTarget, latlng } compatible
 *   avec les callbacks existants (saveEntity, exportGPX, simplify, ...).
 * - Le contextmenu est conservé mais réduit aux actions purement
 *   contextuelles (coordonnées, couper au point exact).
 * - Chaque entrée est filtrée par les permissions exposées
 *   dans drupalSettings[mapid].leaflet_edit.permissions.
 */

(function ($, Drupal, drupalSettings) {
  "use strict";

  /**
   * Retourne la couche actuellement sélectionnée, ou null.
   */
  function leafletEditGetSelected() {
    try {
      if (
        map &&
        map.lMap &&
        map.lMap.leafletEdit &&
        map.lMap.leafletEdit._selectedLayer
      ) {
        return map.lMap.leafletEdit._selectedLayer;
      }
    } catch (e) {}
    return null;
  }

  /**
   * Sélectionne une couche : surlignage + mémorisation + refresh menu.
   */
  function leafletEditSelect(layer) {
    var prev = leafletEditGetSelected();
    if (prev && prev !== layer) {
      try {
        unselect_feature(prev);
      } catch (e) {}
    }
    if (layer) {
      try {
        select_feature(layer);
      } catch (e) {}
      map.lMap.leafletEdit._selectedLayer = layer;
      console.log(
        "[leaflet_edit] topbar : sélection couche",
        layer._leaflet_id
      );
    } else if (map && map.lMap && map.lMap.leafletEdit) {
      map.lMap.leafletEdit._selectedLayer = null;
      console.log("[leaflet_edit] topbar : sélection effacée");
    }
    leafletEditTopbarRefresh();
  }

  /**
   * Construit un pseudo-événement compatible avec les callbacks existants
   * (saveEntity, exportGPX, simplify, cutLine, deleteLay, editLayer...).
   */
  function leafletEditFakeEvent(layer) {
    var latlng = null;
    try {
      latlng = layer.getBounds ? layer.getBounds().getCenter() : map.lMap.getCenter();
    } catch (e) {
      latlng = map.lMap.getCenter();
    }
    return { relatedTarget: layer, latlng: latlng, sourceTarget: layer };
  }

  /**
   * Exécute une action sur la couche sélectionnée, avec garde-fous.
   *
   * @param {string} actionName
   *   Nom pour les logs.
   * @param {Function} fn
   *   Callback existant (ex: saveEntity).
   * @param {bool} needSelection
   *   TRUE si l'action exige une couche sélectionnée.
   */
  function leafletEditRunAction(actionName, fn, needSelection) {
    var layer = leafletEditGetSelected();
    if (needSelection && !layer) {
      console.warn("[leaflet_edit] topbar : action '" + actionName + "' sans sélection");
      try {
        map.lMap.notification.warning(
          "Sélection",
          "Touchez d'abord une trace sur la carte."
        );
      } catch (e) {}
      return;
    }
    console.log(
      "[leaflet_edit] topbar : action '" +
        actionName +
        "' couche=" +
        (layer ? layer._leaflet_id : "(aucune)")
    );
    try {
      fn(layer ? leafletEditFakeEvent(layer) : {});
    } catch (e) {
      console.error("[leaflet_edit] topbar : erreur action '" + actionName + "'", e);
    }
    leafletEditTopbarRefresh();
  }

  /**
   * Retourne TRUE si une couche est en cours d'édition (poignées Geoman).
   */
  function leafletEditIsEditing() {
    try {
      return !!(map && map.lMap && map.lMap.leafletEdit && map.lMap.leafletEdit._editingLayer);
    } catch (e) {}
    return false;
  }

  /**
   * Valide l'édition en cours : désactive les poignées, marque la couche
   * comme modifiée (sauvegardable via Fichiers > Sauver).
   */
  function leafletEditFinishEdit() {
    var layer = null;
    try {
      layer = map.lMap.leafletEdit._editingLayer;
    } catch (e) {}
    if (!layer) {
      return;
    }
    console.log("[leaflet_edit] topbar : valider édition couche", layer._leaflet_id);
    try {
      finEditLayer({ relatedTarget: layer });
    } catch (e) {
      console.error("[leaflet_edit] topbar : fin édition impossible", e);
    }
    try {
      setUpdated(layer);
    } catch (e) {}
    try {
      map.lMap.leafletEdit._editingLayer = null;
    } catch (e) {}
    leafletEditTopbarRefresh();
  }

  /**
   * Annule l'édition en cours : restaure la géométrie d'origine.
   */
  function leafletEditCancelEdit() {
    var layer = null;
    var orig = null;
    try {
      layer = map.lMap.leafletEdit._editingLayer;
      orig = map.lMap.leafletEdit._editingOrig;
    } catch (e) {}
    if (!layer) {
      return;
    }
    console.log("[leaflet_edit] topbar : annuler édition couche", layer._leaflet_id);
    try {
      if (orig) {
        layer.setLatLngs(orig);
      }
    } catch (e) {}
    try {
      finEditLayer({ relatedTarget: layer });
    } catch (e) {
      console.error("[leaflet_edit] topbar : fin édition impossible", e);
    }
    try {
      map.lMap.leafletEdit._editingLayer = null;
      map.lMap.leafletEdit._editingOrig = null;
    } catch (e) {}
    leafletEditTopbarRefresh();
  }

  /**
   * Quitte le mode édition sans valider ni restaurer (sortie simple).
   * La géométrie à l'écran est conservée, rien n'est marqué comme modifié.
   */
  function leafletEditQuitEdit() {
    var layer = null;
    try {
      layer = map.lMap.leafletEdit._editingLayer;
    } catch (e) {}
    if (!layer) {
      return;
    }
    console.log("[leaflet_edit] topbar : quitter édition couche", layer._leaflet_id);
    try {
      finEditLayer({ relatedTarget: layer });
    } catch (e) {
      console.error("[leaflet_edit] topbar : fin édition impossible", e);
    }
    try {
      map.lMap.leafletEdit._editingLayer = null;
      map.lMap.leafletEdit._editingOrig = null;
    } catch (e) {}
    leafletEditTopbarRefresh();
  }
  /**
   * Ferme tous les menus déroulants ouverts.
   */
  function leafletEditCloseAllMenus(bar) {
    if (!bar) {
      return;
    }
    bar.querySelectorAll(".leaflet-edit-topbar-menu.open").forEach(function (m) {
      m.classList.remove("open");
      var btn = m.querySelector(":scope > .leaflet-edit-topbar-menubtn");
      if (btn) {
        btn.setAttribute("aria-expanded", "false");
      }
    });
  }

  /**
   * Active/désactive les entrées selon sélection + état modifié.
   */
  function leafletEditTopbarRefresh() {
    var bar = document.querySelector(".leaflet-edit-topbar");
    if (!bar) {
      return;
    }
    var layer = leafletEditGetSelected();
    var editing = leafletEditIsEditing();
    var updated = false;
    try {
      updated = layer ? isUpdated(layer) : anyUpdated().length > 0;
    } catch (e) {}
    bar.querySelectorAll("[data-le-action]").forEach(function (item) {
      var needSel = item.getAttribute("data-need-selection") === "1";
      var needUpd = item.getAttribute("data-need-updated") === "1";
      var needEdit = item.getAttribute("data-need-editing") === "1";
      var hideEdit = item.getAttribute("data-hide-editing") === "1";
      var disabled = false;
      if (needSel && !layer) {
        disabled = true;
      }
      if (needUpd && !updated) {
        disabled = true;
      }
      if (needEdit && !editing) {
        disabled = true;
      }
      if (disabled) {
        item.setAttribute("aria-disabled", "true");
        item.classList.add("is-disabled");
      } else {
        item.removeAttribute("aria-disabled");
        item.classList.remove("is-disabled");
      }
      // "Modifier" devient inutile pendant l'édition ; les 3 actions
      // de sortie n'ont de sens que pendant l'édition.
      if (hideEdit || needEdit) {
        item.style.display = (hideEdit && editing) || (needEdit && !editing) ? "none" : "";
      }
    });
    var label = bar.querySelector(".leaflet-edit-topbar-selection");
    if (label) {
      var name = "";
      try {
        if (leafletEditIsEditing()) {
          name = "Édition en cours";
          try {
            var el = map.lMap.leafletEdit._editingLayer;
            var eo = (el && (el.defaultOptions || el.options)) || {};
            var ele = eo.leafletEdit || {};
            var ename = ele.description || ele.filename || "";
            if (ename) {
              name += " : " + ename;
            }
          } catch (e2) {}
          label.textContent = name;
        } else if (layer) {
          var opts = layer.defaultOptions || layer.options || {};
          var le = opts.leafletEdit || {};
          name = le.description || le.filename || ("Trace " + (le.fid || ""));
          label.textContent = name ? "Sélection : " + name : "Aucune trace sélectionnée";
        } else {
          label.textContent = "Aucune trace sélectionnée";
        }
      } catch (e) {}
    }
  }

  /**
   * Bascule le panneau des couches (fonds + traces).
   */
  function leafletEditTogglePanel() {
    try {
      var ctrl = map.lMap.leafletEdit.LAYGROUP_CONTROL;
      if (!ctrl) {
        return;
      }
      var container = ctrl.getContainer ? ctrl.getContainer() : null;
      // panelLayers n'expose pas de toggle : on replie/déplie via la classe.
      if (container) {
        container.classList.toggle("leaflet-edit-panel-hidden");
        console.log("[leaflet_edit] topbar : toggle panneau couches");
      }
    } catch (e) {
      console.error("[leaflet_edit] topbar : toggle panneau impossible", e);
    }
  }

  /**
   * Démarre/arrête le dessin Geoman.
   */
  function leafletEditToggleDraw(shape) {
    try {
      var pm = map.lMap.pm;
      if (!pm) {
        return;
      }
      // Coupe tout mode en cours avant d'en lancer un autre.
      if (pm.globalDrawModeEnabled && pm.globalDrawModeEnabled()) {
        pm.disableDraw();
      }
      var current = pm.globalDrawModeEnabled
        ? pm.globalDrawModeEnabled()
        : false;
      if (!current) {
        pm.enableDraw(shape || "Line", { allowSelfIntersection: true });
        console.log("[leaflet_edit] topbar : dessin '" + (shape || "Line") + "' ON");
      } else {
        pm.disableDraw();
        console.log("[leaflet_edit] topbar : dessin OFF");
      }
    } catch (e) {
      console.error("[leaflet_edit] topbar : dessin impossible", e);
    }
  }

  /**
   * Active/désactive le suivi GPS.
   */
  function leafletEditToggleLocate(item) {
    try {
      if (map.lMap._leafletEditLocating) {
        map.lMap.stopLocate();
        map.lMap._leafletEditLocating = false;
        item.classList.remove("is-active");
        console.log("[leaflet_edit] topbar : GPS OFF");
      } else {
        map.lMap.locate({ setView: true, watch: true, enableHighAccuracy: true });
        map.lMap._leafletEditLocating = true;
        item.classList.add("is-active");
        console.log("[leaflet_edit] topbar : GPS ON (suivi)");
      }
    } catch (e) {
      console.error("[leaflet_edit] topbar : GPS impossible", e);
    }
  }

  /**
   * Construit la barre de menu. Appelée depuis leaflet_edit.init une fois
   * la carte et les permissions connues.
   *
   * La barre est insérée comme PREMIER ENFANT du conteneur de la carte
   * (position absolute, collée en haut) : en plein écran Leaflet, c'est
   * ce conteneur qui passe en fullscreen, donc le menu reste visible.
   *
   * @param {string} mapid
   *   L'ID DOM de la carte.
   * @param {object} editSettings
   *   drupalSettings[mapid].leaflet_edit (permissions, endpoints...).
   */
  function leafletEditBuildTopbar(mapid, editSettings) {
    var container = document.getElementById(mapid);
    if (!container) {
      console.warn("[leaflet_edit] topbar : conteneur #" + mapid + " introuvable");
      return;
    }
    if (container.querySelector(":scope > .leaflet-edit-topbar")) {
      return; // Déjà construite (rebuild AJAX...).
    }
    var perms = (editSettings && editSettings.permissions) || {};
    console.log("[leaflet_edit] topbar : construction, permissions =", perms);

    var bar = L.DomUtil.create("div", "leaflet-edit-topbar", container);
    // Premier enfant => collé en haut de la carte, au-dessus des tuiles.
    container.insertBefore(bar, container.firstChild);

    // Empêcher la carte de capter les interactions sur le menu.
    L.DomEvent.disableClickPropagation(bar);
    L.DomEvent.disableScrollPropagation(bar);

    // Clic ailleurs sur la carte => fermer les déroulants.
    try {
      map.lMap.on("click", function () {
        leafletEditCloseAllMenus(bar);
      });
    } catch (e) {}
    // Touche Échap => fermer les déroulants.
    bar.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape") {
        leafletEditCloseAllMenus(bar);
      }
    });

    /**
     * Crée un menu déroulant (thème).
     */
    function addMenu(title) {
      var m = L.DomUtil.create("div", "leaflet-edit-topbar-menu", bar);
      var btn = L.DomUtil.create("button", "leaflet-edit-topbar-menubtn", m);
      btn.type = "button";
      btn.setAttribute("aria-haspopup", "true");
      btn.setAttribute("aria-expanded", "false");
      var label = L.DomUtil.create("span", "", btn);
      label.textContent = title;
      var caret = L.DomUtil.create("span", "leaflet-edit-topbar-caret", btn);
      caret.textContent = "▾";
      caret.setAttribute("aria-hidden", "true");
      var list = L.DomUtil.create("ul", "leaflet-edit-topbar-dropdown", m);
      list.setAttribute("role", "menu");

      function toggle(ev) {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        var wasOpen = m.classList.contains("open");
        leafletEditCloseAllMenus(bar);
        if (!wasOpen) {
          m.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
        }
      }
      btn.addEventListener("click", toggle);
      // Ouverture au survol sur desktop (pointer fin), tap sur mobile.
      // Un délai de grâce à la sortie évite la fermeture intempestive
      // quand la souris traverse le (petit) espace bouton => liste.
      var closeTimer = null;
      var hoverable = function () {
        return window.matchMedia && window.matchMedia("(hover: hover)").matches;
      };
      m.addEventListener("mouseenter", function () {
        if (hoverable()) {
          if (closeTimer) {
            clearTimeout(closeTimer);
            closeTimer = null;
          }
          leafletEditCloseAllMenus(bar);
          m.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
      m.addEventListener("mouseleave", function () {
        if (hoverable()) {
          if (closeTimer) {
            clearTimeout(closeTimer);
          }
          closeTimer = setTimeout(function () {
            m.classList.remove("open");
            btn.setAttribute("aria-expanded", "false");
            closeTimer = null;
          }, 250);
        }
      });
      return list;
    }

    /**
     * Ajoute une entrée dans un menu déroulant.
     * Retourne null si la permission manque (entrée masquée).
     */
    function addItem(list, opts) {
      if (opts.perm && !perms[opts.perm]) {
        return null;
      }
      var li = L.DomUtil.create("li", "leaflet-edit-topbar-item", list);
      li.setAttribute("role", "menuitem");
      li.setAttribute("tabindex", "0");
      li.setAttribute("data-le-action", opts.action);
      li.setAttribute("data-need-selection", opts.needSelection ? "1" : "0");
      li.setAttribute("data-need-updated", opts.needUpdated ? "1" : "0");
      li.setAttribute("data-need-editing", opts.needEditing ? "1" : "0");
      li.setAttribute("data-hide-editing", opts.hideWhenEditing ? "1" : "0");
      li.title = opts.title || opts.label;
      var icon = L.DomUtil.create("i", opts.icon + " leaflet-edit-topbar-icon", li);
      icon.setAttribute("aria-hidden", "true");
      var label = L.DomUtil.create("span", "leaflet-edit-topbar-label", li);
      label.textContent = opts.label;

      function activate(ev) {
        if (ev) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        if (li.getAttribute("aria-disabled") === "true") {
          return; // Entrée grisée : sans effet.
        }
        leafletEditCloseAllMenus(bar);
        opts.onClick(li);
      }
      li.addEventListener("click", activate);
      li.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") {
          activate(ev);
        }
      });
      return li;
    }

    // --- Menu Dessin (permission edit) ---
    var mDraw = addMenu("Dessin");
    addItem(mDraw, {
      action: "draw-marker", label: "Point", title: "Dessiner un point",
      icon: "fa-solid fa-location-dot", perm: "edit",
      onClick: function () { leafletEditToggleDraw("Marker"); },
    });
    addItem(mDraw, {
      action: "draw-line", label: "Ligne", title: "Dessiner une ligne",
      icon: "fa-solid fa-pen", perm: "edit",
      onClick: function () { leafletEditToggleDraw("Line"); },
    });
    addItem(mDraw, {
      action: "draw-polygon", label: "Zone", title: "Dessiner une zone",
      icon: "fa-solid fa-draw-polygon", perm: "edit",
      onClick: function () { leafletEditToggleDraw("Polygon"); },
    });

    // --- Menu Édition (sélection requise) ---
    var mEdit = addMenu("Édition");
    addItem(mEdit, {
      action: "edit", label: "Modifier", title: "Modifier la trace sélectionnée",
      icon: "fa-regular fa-pen-to-square", perm: "edit", needSelection: true,
      hideWhenEditing: true,
      onClick: function () {
        leafletEditRunAction("edit", editLayer, true);
        // Mémorise la couche éditée + sa géométrie d'origine pour
        // Valider / Annuler / Quitter.
        try {
          var sel = leafletEditGetSelected();
          if (sel) {
            map.lMap.leafletEdit._editingLayer = sel;
            try {
              map.lMap.leafletEdit._editingOrig = sel.getLatLngs
                ? JSON.parse(JSON.stringify(sel.getLatLngs()))
                : null;
            } catch (e2) {
              map.lMap.leafletEdit._editingOrig = null;
            }
          }
        } catch (e) {}
        leafletEditTopbarRefresh();
      },
    });
    addItem(mEdit, {
      action: "finish-edit", label: "Valider", title: "Valider les modifications (la trace devient sauvegardable)",
      icon: "fa-solid fa-check", perm: "edit", needEditing: true,
      onClick: function () { leafletEditFinishEdit(); },
    });
    addItem(mEdit, {
      action: "cancel-edit", label: "Annuler", title: "Annuler les modifications (restaure la géométrie d'origine)",
      icon: "fa-solid fa-xmark", perm: "edit", needEditing: true,
      onClick: function () { leafletEditCancelEdit(); },
    });
    addItem(mEdit, {
      action: "quit-edit", label: "Quitter l'édition", title: "Sortir du mode édition sans valider ni restaurer",
      icon: "fa-solid fa-right-from-bracket", perm: "edit", needEditing: true,
      onClick: function () { leafletEditQuitEdit(); },
    });
    addItem(mEdit, {
      action: "cut", label: "Couper", title: "Couper la trace au centre",
      icon: "fa-regular fa-scissors", perm: "edit", needSelection: true,
      onClick: function () { leafletEditRunAction("cut", cutLine, true); },
    });
    addItem(mEdit, {
      action: "simplify", label: "Simplifier", title: "Simplifier la trace",
      icon: "fa-solid fa-minimize", perm: "edit", needSelection: true,
      onClick: function () { leafletEditRunAction("simplify", simplify, true); },
    });
    addItem(mEdit, {
      action: "delete", label: "Supprimer", title: "Supprimer la trace",
      icon: "fa-regular fa-eraser", perm: "edit", needSelection: true,
      onClick: function () { leafletEditRunAction("delete", deleteLay, true); },
    });

    // --- Menu Fichiers ---
    var mFiles = addMenu("Fichiers");
    addItem(mFiles, {
      action: "save", label: "Sauver", title: "Sauvegarder la trace modifiée",
      icon: "fa-regular fa-floppy-disk", perm: "save",
      needSelection: true, needUpdated: true,
      onClick: function () { leafletEditRunAction("save", saveEntity, true); },
    });
    addItem(mFiles, {
      action: "export", label: "Exporter GPX", title: "Exporter la trace en GPX",
      icon: "fa-solid fa-file-export", perm: "exportGPX", needSelection: true,
      onClick: function () { leafletEditRunAction("export", exportGPX, true); },
    });
    addItem(mFiles, {
      action: "import", label: "Importer GPX", title: "Importer un fichier GPX",
      icon: "fa-solid fa-file-import", perm: "importGPX",
      onClick: function () {
        console.log("[leaflet_edit] topbar : action 'import'");
        try {
          readLocalFile({}, "le_import", "GPX");
        } catch (e) {
          console.error("[leaflet_edit] topbar : import impossible", e);
        }
      },
    });

    // --- Menu Carte (toujours visible) ---
    var mMap = addMenu("Carte");
    addItem(mMap, {
      action: "layers", label: "Couches", title: "Afficher / masquer les couches",
      icon: "fa-solid fa-layer-group",
      onClick: function () { leafletEditTogglePanel(); },
    });
    addItem(mMap, {
      action: "gps", label: "GPS", title: "Suivi GPS",
      icon: "fa-solid fa-location-crosshairs",
      onClick: function (li) { leafletEditToggleLocate(li); },
    });
    addItem(mMap, {
      action: "fullscreen", label: "Plein écran", title: "Plein écran",
      icon: "fa-solid fa-expand",
      onClick: function () {
        try {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else if (container.requestFullscreen) {
            container.requestFullscreen();
          }
          console.log("[leaflet_edit] topbar : toggle plein écran");
        } catch (e) {}
      },
    });

    // Pastille de sélection courante (à droite de la barre).
    var sel = L.DomUtil.create("div", "leaflet-edit-topbar-selection", bar);
    sel.textContent = "Aucune trace sélectionnée";

    // Masquer les menus vides (aucune permission).
    bar.querySelectorAll(".leaflet-edit-topbar-menu").forEach(function (m) {
      if (!m.querySelector("li")) {
        m.style.display = "none";
      }
    });

    leafletEditTopbarRefresh();
    console.log("[leaflet_edit] topbar : prête (menu classique, dans la carte)");
  }

  /**
   * Branche la sélection au tap sur chaque couche chargée.
   * Appelée depuis processLoadedData() via hook (non-intrusif).
   */
  function leafletEditHookLayerTap(layer) {
    try {
      layer.on("click", function (e) {
        // Tap simple = sélection (remplace le double-clic desktop).
        var target = (e && e.sourceTarget) || layer;
        leafletEditSelect(target);
      });
    } catch (e) {}
  }

  // Exposition globale (les autres fichiers JS ne sont pas des modules).
  window.leafletEditBuildTopbar = leafletEditBuildTopbar;
  window.leafletEditHookLayerTap = leafletEditHookLayerTap;
  window.leafletEditTopbarRefresh = leafletEditTopbarRefresh;
  window.leafletEditGetSelected = leafletEditGetSelected;
})(jQuery, Drupal, drupalSettings);
