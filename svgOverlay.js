export var SVGOverlay = L.Proj.ImageOverlay.extend({
    _initImage: function() {
        var el = this._image = L.DomUtil.create(
            'svg',
            'leaflet-image-layer ' + (this._zoomAnimated ? 'leaflet-zoom-animated' : '')
        );
        el.onselectstart = L.Util.falseFn;
        el.onmousemove = L.Util.falseFn;
    },

    setInnerHtml: function(svgString) {
        this._image.innerHTML = svgString;
    }
});

export function svgOverlay(image, bounds, options) {
    return new SVGOverlay(image, bounds, options);
}