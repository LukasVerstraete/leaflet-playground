export var SVGOverlay = L.Proj.ImageOverlay.extend({
    _initImage: function() {
        var el = this._image = L.DomUtil.create("svg", 'leaflet-image-layer ' + (this._zoomAnimated ? 'leaflet-zoom-animated' : ''));

        // L.DomUtil.addClass(el, 'leaflet-image-layer');
        // if (this._zoomAnimated) { L.DomUtil.addClass(el, 'leaflet-zoom-animated'); }
        // if (this.options.className) { L.DomUtil.addClass(el, this.options.className); }

        el.onselectstart = L.Util.falseFn;
        el.onmousemove = L.Util.falseFn;
        console.log(this);
    },

    setInnerHtml: function(svgString) {
        this._image.innerHTML = svgString;
    }
});

export function svgOverlay(image, bounds, options) {
    return new SVGOverlay(image, bounds, options);
}