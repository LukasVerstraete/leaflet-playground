import { svgOverlay } from './svgOverlay.js';
import {
    performanceTestAsync,
    performanceTest,
    loadSvg,
    testFN,
    offscreenRender,
    loadSvgElement
} from './performanceSvg.js';

const crsResolutions = [
    8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1,
    0.5, 0.1
];


var LatLngBoundsProto = L.LatLngBounds.prototype;

L.LatLngBounds = function(corner1, corner2) {
    if (!corner1) { return; }

	var latlngs = corner2 ? [corner1, corner2] : corner1;
    this._setCorners(latlngs);

	for (var i = 0, len = latlngs.length; i < len; i++) {
        this.extend(latlngs[i]);
	}
}

L.LatLngBounds.prototype = {...LatLngBoundsProto};

L.LatLngBounds.prototype._setCorners = function(latlngs) {
    this._corner1 = latlngs[0];
    this._corner2 = latlngs.length > 2 ? latlngs[2] : latlngs[1];
}

var toLatLngBounds = function (a, b) {
	if (a instanceof L.LatLngBounds) {

		return a;
	}
	return new L.LatLngBounds(a, b);
}


L.Rectangle.prototype._boundsToLatLngs = function(latLngBounds) {
    latLngBounds = toLatLngBounds(latLngBounds);

    const {_corner1} = latLngBounds;

    const latlngs = [
        latLngBounds.getSouthWest(),
        latLngBounds.getNorthWest(),
        latLngBounds.getNorthEast(),
        latLngBounds.getSouthEast()
    ];

    const indexCorner1 = latlngs.findIndex(latlng => {
        return latlng.lat === _corner1.lat && latlng.lng === _corner1.lng;
    });

    if (indexCorner1 === -1) return latlngs;

    const sortedLatLngs = [];
    let placeIndex = 0;
    for(let i = indexCorner1; i < indexCorner1 + latlngs.length; i++) {
        sortedLatLngs[placeIndex++] = latlngs[i % latlngs.length];
    }

    return sortedLatLngs;
}

L.Rectangle.prototype.initialize = function(latLngBounds, options) {
    L.Polygon.prototype.initialize.call(this, this._boundsToLatLngs(latLngBounds), options);
}

L.Rectangle.prototype.setBounds = function(latLngBounds) {
    return this.setLatLngs(this._boundsToLatLngs(latLngBounds));
}

L.Rectangle.prototype._projectLatlngs = function (latlngs, result, projectedBounds) {
    const {_corner1, _corner2} = this._bounds;

    const point1 = this._map.latLngToLayerPoint(_corner1);
    const point3 = this._map.latLngToLayerPoint(_corner2);

    const point2 = new L.Point(point3.x, point1.y);
    const point4 = new L.Point(point1.x, point3.y);

    projectedBounds.extend(point1);
    projectedBounds.extend(point2);
    projectedBounds.extend(point3);
    projectedBounds.extend(point4);

    result.push([point1, point2, point3, point4]);
}

L.Polyline.prototype._setLatLngs = function (latlngs) {
    this._bounds = new L.LatLngBounds(latlngs);
    this._latlngs = this._convertLatLngs(latlngs);
}

L.Edit.Rectangle.prototype._getCorners = function () {
    const corners = this._shape._boundsToLatLngs(this._shape._bounds);
    const point1 = this._map.latLngToLayerPoint(corners[0]);
    const point3 = this._map.latLngToLayerPoint(corners[2]);

    const point2 = new L.Point(point3.x, point1.y);
    const point4 = new L.Point(point1.x, point3.y);
    const coord2 = this._map.layerPointToLatLng(point2);
    const coord4 = this._map.layerPointToLatLng(point4);

    return [
        corners[0],
        coord2,
        corners[2],
        coord4
    ];
};

L.Edit.Rectangle.prototype._getPoints = function() {
    const corners = this._shape._boundsToLatLngs(this._shape._bounds);
    const point1 = this._map.options.crs.project(corners[0]);
    const point3 = this._map.options.crs.project(corners[2]);

    const point2 = new L.Point(point3.x, point1.y);
    const point4 = new L.Point(point1.x, point3.y);

    return [point1, point2, point3, point4];
};

L.Edit.Rectangle.prototype._getCenter = function () {
    const centerPoint = this._getCenterPoint();

    return this._map.layerPointToLatLng(centerPoint);
};

L.Edit.Rectangle.prototype._getCenterPoint = function () {
    const {_corner1, _corner2} = this._shape._bounds;
    const point1 = this._map.latLngToLayerPoint(_corner1);
    const point3 = this._map.latLngToLayerPoint(_corner2);

    const minX = Math.min(point1.x, point3.x);
    const maxX = Math.max(point1.x, point3.x);
    const minY = Math.min(point1.y, point3.y);
    const maxY = Math.max(point1.y, point3.y);

    const x = ((maxX - minX) / 2) + minX;
    const y = ((maxY - minY) / 2) + minY;

    return new L.Point(x, y);
};

L.Edit.Rectangle.prototype._createMoveMarker = function () {
    this._moveMarker = this._createMarker(this._getCenter(), this.options.moveIcon);
}

L.Edit.Rectangle.prototype._createResizeMarker = function () {
    const latlngs = this._getCorners();

    this._resizeMarkers = [];

    for (var i = 0; i < latlngs.length; i++) {
        this._resizeMarkers.push(this._createMarker(latlngs[i], this.options.resizeIcon));
        this._resizeMarkers[i]._cornerIndex = i;
    }
}

L.Edit.Rectangle.prototype._move = function (newCenter) {

    const centerPoint = this._getCenterPoint();
    let newCenterPoint = this._map.latLngToLayerPoint(newCenter);

    const xOffset = newCenterPoint.x - centerPoint.x;
    const yOffset = newCenterPoint.y - centerPoint.y;
    const offsetPoint = new L.Point(xOffset, yOffset);

    const {_corner1, _corner2} = this._shape._bounds;

    const point1 = this._map.latLngToLayerPoint(_corner1);
    const point3 = this._map.latLngToLayerPoint(_corner2);

    const newPoint1 = point1.add(offsetPoint);
    const newPoint3 = point3.add(offsetPoint);

    const minX = Math.min(newPoint1.x, newPoint3.x);
    const maxX = Math.max(newPoint1.x, newPoint3.x);
    const minY = Math.min(newPoint1.y, newPoint3.y);
    const maxY = Math.max(newPoint1.y, newPoint3.y);

    const x = ((maxX - minX) / 2) + minX;
    const y = ((maxY - minY) / 2) + minY;

    newCenterPoint = new L.Point(x, y);
    newCenter = this._map.layerPointToLatLng(newCenterPoint);

    const coord1 = this._map.layerPointToLatLng(newPoint1);
    const coord3 = this._map.layerPointToLatLng(newPoint3);

    this._shape.setBounds(new L.LatLngBounds(coord1, coord3));
    this._repositionCornerMarkers();

    this._map.fire(L.Draw.Event.EDITMOVE, {layer: this._shape});
}

L.Edit.Rectangle.prototype._onMarkerDragEnd = function (e) {
    var marker = e.target,
        bounds, center;

    if (marker === this._moveMarker) {

        marker.setLatLng(this._getCenter());
    }

    this._toggleCornerMarkers(1);

    this._repositionCornerMarkers();

    L.Edit.SimpleShape.prototype._onMarkerDragEnd.call(this, e);
},

L.Edit.Rectangle.prototype._resize = function (latlng) {
    this._shape.setBounds(new L.LatLngBounds(latlng, this._oppositeCorner));

    this._moveMarker.setLatLng(this._getCenter());

    this._map.fire(L.Draw.Event.EDITRESIZE, {layer: this._shape});
}

L.Edit.PolyVerticesEdit.prototype._createMiddleMarker = function (marker1, marker2) {
    var latlng = this._getMiddleLatLng(marker1, marker2),
        marker = this._createMarker(latlng),
        onClick,
        onDragStart,
        onDragEnd;

    marker1._middleRight = marker2._middleLeft = marker;

    onDragStart = function () {
    };

    const onDrag = function(event) {
        const oldPoint = this._map.latLngToLayerPoint(marker._oldLatLng ? marker._oldLatLng : event.oldLatLng);
        const point = this._map.latLngToLayerPoint(event.latlng);

        const offsetX = point.x - oldPoint.x;
        const offsetY = point.y - oldPoint.y;

        const offsetPoint = new L.Point(offsetX, offsetY);

        const coords = this._latlngs;

        const newCoords = coords.map(coord => {
            return this._map.layerPointToLatLng(this._map.latLngToLayerPoint(coord).add(offsetPoint));
        });

        this._latlngs = newCoords;
        this._poly.setLatLngs(newCoords);
        this._markers.forEach((m, index) => m.setLatLng(newCoords[index]));
        marker._oldLatLng = event.latlng;
    }

    onDragEnd = function () {
        this.updateMarkers();
    };
    console.log('adding listeners');
    marker
        .on('dragstart', onDragStart, this)
        .on('drag', onDrag, this)
        .on('dragend', onDragEnd, this)
        .on('touchmove', onDragStart, this);



    this._markerGroup.addLayer(marker);
}

L.Edit.PolyVerticesEdit.prototype._defaultShape = function() {
    return L.Polyline.isFlat ? L.Polyline.isFlat(this._latlngs) ? this._latlngs : this._latlngs[0] : this._latlngs;
}

L.Edit.PolyVerticesEdit.prototype.updateMarker = function() {
    this._markerGroup.clearLayers();
	this._initMarkers();
}

L.Edit.PolyVerticesEdit.prototype._initMarkers = function () {
    if (!this._markerGroup) {
        this._markerGroup = new L.LayerGroup();
    }
    this._markers = [];

    var latlngs = this._defaultShape(),
        i, j, len, marker;

    for (i = 0, len = latlngs.length; i < len; i++) {

        marker = this._createMarker(latlngs[i], i);
        marker.on('click', this._onMarkerClick, this);
        marker.on('contextmenu', this._onContextMenu, this);
        this._markers.push(marker);
    }

    var markerLeft, markerRight;

    for (i = 0, j = len - 1; i < len; j = i++) {
        if (i === 0 && !(L.Polygon && (this._poly instanceof L.Polygon))) {
            continue;
        }

        markerLeft = this._markers[j];
        markerRight = this._markers[i];

        console.log('middle marker', this._middleMarker);
        if (this._middleMarker) {
            this._markerGroup.addLayer(this._middleMarker);
            markerLeft._middleRight = this._middleMarker;
            markerRight._middleLeft = this._middleMarker;
        } else {
            this._createMiddleMarker(markerLeft, markerRight);
            this._updatePrevNext(markerLeft, markerRight);
        }
    }
}

const projBounds = L.bounds([-624.8002276396273, -524.3640295814912], [565.910762176858, 283.0062602881261]);




const earthDist = L.CRS.Earth.distance;
L.CRS.Earth.distance = () => {};

const rusImage = './klimaat-stromingen.svg';
// const rusImage = 'RUS.svg';
const csrRusland = new L.Proj.CRS(
    'EPSG:2400',
    '+proj=lcc +lat_1=40 +lat_2=70 +lat_0=55 +lon_0=92 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    {
        resolutions: crsResolutions,
        bounds: projBounds
    }
);





L.CRS.Earth.distance = earthDist;
csrRusland.distance = (lat, lng) => {return L.CRS.Earth.distance(lat, lng)}


const rusParams = {
    image: rusImage,
    crs: csrRusland,
    bounds: {
        corner: [47.128307,-16.886511],
        oppositeCorner: [21.564454,134.369712]
    }
}
var corner1 = L.latLng(47.128307,-16.886511),
corner2 = L.latLng(21.564454,134.369712),
bounds = L.latLngBounds(corner1, corner2);
const unprojbounds = bounds;

const map = L.map('map', {
    crs: rusParams.crs,
    drawControl: {edit: true}
});
const rusBounds = L.bounds(
    csrRusland.project(unprojbounds.getSouthEast()),
    csrRusland.project(unprojbounds.getNorthWest())
);

// const test = svgOverlay(rusParams.image, rusBounds).addTo(map);
// const test = L.Proj.ImageOverlay(undefined, rusBounds).addTo(map);


map.setView(map.unproject(projBounds.getCenter()), 1);
// const result = await fetch(rusImage);
// test.setInnerHtml(await result.text());

map.on('load', () => {
    map.setView(projBounds.getCenter());
});


var circle = L.circle([50.7223593985963,23.022141771511077], {
    color: 'red',
    fillColor: '#f03',
    fillOpacity: 0.5,
    radius: 600000
});

circle.addTo(map);

map.on('click', (event) => {
    console.log('map: ', `${event.latlng.lat},${event.latlng.lng}`);
    navigator.clipboard.writeText(`${event.latlng.lat},${event.latlng.lng}`);
});

map.on(L.Draw.Event.CREATED, (e) => {
    const {layer} = e;
    layer.editing.enable();

    map.addLayer(layer);
 });

 const checkbox = document.getElementById("checkbox");
 checkbox.addEventListener('change', (e) => {
    document.getElementById('L1').style.display = e.target.checked ? 'unset' : 'none';
 });


const loadBtn = document.getElementById('load-btn');
loadBtn.addEventListener('click', loadImage);


async function loadImage() {
    // const dataUrl = await performanceTestAsync(loadSvg, rusImage);
    // console.log(dataUrl);
    const result = await performanceTestAsync(testFN, rusImage);
    new L.Proj.ImageOverlay(result, rusBounds).addTo(map);

    // const {svgText, width, height} = await loadSvgElement(rusImage);
    // const newHeight = height / width * 2500;
    // console.log(width, 2500, height, newHeight)
    // const url = await offscreenRender(svgText, 2500, newHeight);
    // new L.Proj.ImageOverlay(url, rusBounds).addTo(map);
}



// const test = svgOverlay(rusParams.image, rusBounds).addTo(map);
// const result = await fetch(rusImage);
// test.setInnerHtml(await result.text());