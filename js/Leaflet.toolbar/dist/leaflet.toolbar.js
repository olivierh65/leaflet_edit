!function(t,o,i){"use strict";t.L.Toolbar2=(L.Layer||L.Class).extend({statics:{baseClass:"leaflet-toolbar"},options:{className:"",filter:function(){return!0},actions:[]},initialize:function(t){L.setOptions(this,t),this._toolbar_type=this.constructor._toolbar_class_id},addTo:function(t){return this._arguments=[].slice.call(arguments),t.addLayer(this),this},onAdd:function(t){var o=t._toolbars[this._toolbar_type];0===this._calculateDepth()&&(o&&t.removeLayer(o),t._toolbars[this._toolbar_type]=this)},onRemove:function(t){0===this._calculateDepth()&&delete t._toolbars[this._toolbar_type]},appendToContainer:function(t){var o,i,e,n,s=this.constructor.baseClass+"-"+this._calculateDepth()+" "+this.options.className;for(this._container=t,this._ul=L.DomUtil.create("ul",s,t),this._disabledEvents=["click","mousemove","dblclick","mousedown","mouseup","touchstart"],i=0,n=this._disabledEvents.length;i<n;i++)L.DomEvent.on(this._ul,this._disabledEvents[i],L.DomEvent.stopPropagation);for(o=0,e=this.options.actions.length;o<e;o++)(new(this._getActionConstructor(this.options.actions[o])))._createIcon(this,this._ul,this._arguments)},_getActionConstructor:function(t){var o=this._arguments,i=this;return t.extend({initialize:function(){t.prototype.initialize.apply(this,o)},enable:function(o){i._active&&i._active.disable(),i._active=this,t.prototype.enable.call(this,o)}})},_hide:function(){this._ul.style.display="none"},_show:function(){this._ul.style.display="block"},_calculateDepth:function(){for(var t=0,o=this.parentToolbar;o;)t+=1,o=o.parentToolbar;return t}}),L.Evented||L.Toolbar2.include(L.Mixin.Events),L.toolbar={};var e=0;L.Toolbar2.extend=function(t){var o=L.extend({},t.statics,{_toolbar_class_id:e});return e+=1,L.extend(t,{statics:o}),L.Class.extend.call(this,t)},L.Map.addInitHook(function(){this._toolbars={}}),L.Toolbar2.Action=L.Handler.extend({statics:{baseClass:"leaflet-toolbar-icon"},options:{toolbarIcon:{html:"",className:"",tooltip:""},subToolbar:new L.Toolbar2},initialize:function(t){var o=L.Toolbar2.Action.prototype.options.toolbarIcon;L.setOptions(this,t),this.options.toolbarIcon=L.extend({},o,this.options.toolbarIcon)},enable:function(t){t&&L.DomEvent.preventDefault(t),this._enabled||(this._enabled=!0,this.addHooks&&this.addHooks())},disable:function(){this._enabled&&(this._enabled=!1,this.removeHooks&&this.removeHooks())},_createIcon:function(t,o,i){var e=this.options.toolbarIcon;this.toolbar=t,this._icon=L.DomUtil.create("li","",o),this._link=L.DomUtil.create("a","",this._icon),this._link.innerHTML=e.html,this._link.setAttribute("href","#"),this._link.setAttribute("title",e.tooltip),L.DomUtil.addClass(this._link,this.constructor.baseClass),e.className&&L.DomUtil.addClass(this._link,e.className),L.DomEvent.on(this._link,"click",this.enable,this),this._addSubToolbar(t,this._icon,i)},_addSubToolbar:function(t,o,i){var e=this.options.subToolbar,n=this.addHooks,s=this.removeHooks;e.parentToolbar=t,e.options.actions.length>0&&((i=[].slice.call(i)).push(this),e.addTo.apply(e,i),e.appendToContainer(o),this.addHooks=function(t){"function"==typeof n&&n.call(this,t),e._show()},this.removeHooks=function(t){"function"==typeof s&&s.call(this,t),e._hide()})}}),L.toolbarAction=function(t){return new L.Toolbar2.Action(t)},L.Toolbar2.Action.extendOptions=function(t){return this.extend({options:t})},L.Toolbar2.Control=L.Toolbar2.extend({statics:{baseClass:"leaflet-control-toolbar "+L.Toolbar2.baseClass},initialize:function(t){L.Toolbar2.prototype.initialize.call(this,t),this._control=new L.Control.Toolbar(this.options)},onAdd:function(t){this._control.addTo(t),L.Toolbar2.prototype.onAdd.call(this,t),this.appendToContainer(this._control.getContainer())},onRemove:function(t){L.Toolbar2.prototype.onRemove.call(this,t),this._control.remove?this._control.remove():this._control.removeFrom(t)}}),L.Control.Toolbar=L.Control.extend({onAdd:function(){return L.DomUtil.create("div","")}}),L.toolbar.control=function(t){return new L.Toolbar2.Control(t)},L.Toolbar2.Popup=L.Toolbar2.extend({statics:{baseClass:"leaflet-popup-toolbar "+L.Toolbar2.baseClass},options:{anchor:[0,0]},initialize:function(t,o){L.Toolbar2.prototype.initialize.call(this,o),this._marker=new L.Marker(t,{icon:new L.DivIcon({className:this.options.className,iconAnchor:[0,0]})})},onAdd:function(t){this._map=t,this._marker.addTo(t),L.Toolbar2.prototype.onAdd.call(this,t),this.appendToContainer(this._marker._icon),this._setStyles()},onRemove:function(t){t.removeLayer(this._marker),L.Toolbar2.prototype.onRemove.call(this,t),delete this._map},setLatLng:function(t){return this._marker.setLatLng(t),this},_setStyles:function(){for(var t,o,i,e=this._container,n=this._ul,s=L.point(this.options.anchor),a=n.querySelectorAll(".leaflet-toolbar-icon"),l=[],r=0,c=0,h=a.length;c<h;c++)a[c].parentNode.parentNode===n&&(l.push(parseInt(L.DomUtil.getStyle(a[c],"height"),10)),r+=Math.ceil(parseFloat(L.DomUtil.getStyle(a[c],"width"))),r+=Math.ceil(parseFloat(L.DomUtil.getStyle(a[c],"border-right-width"))));n.style.width=r+"px",this._tipContainer=L.DomUtil.create("div","leaflet-toolbar-tip-container",e),this._tipContainer.style.width=r+Math.ceil(parseFloat(L.DomUtil.getStyle(n,"border-left-width")))+"px",this._tip=L.DomUtil.create("div","leaflet-toolbar-tip",this._tipContainer),t=Math.max.apply(void 0,l),n.style.height=t+"px",o=parseInt(L.DomUtil.getStyle(this._tip,"width"),10),i=new L.Point(r/2,t+1.414*o),e.style.marginLeft=s.x-i.x+"px",e.style.marginTop=s.y-i.y+"px"}}),L.toolbar.popup=function(t){return new L.Toolbar2.Popup(t)}}(window,document);