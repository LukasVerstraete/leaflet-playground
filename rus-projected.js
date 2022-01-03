import { svgOverlay } from "./svgOverlay.js";

const crsResolutions = [
    8192, 4096, 2048, 1024, 512, 256, 128, 64, 32, 16, 8, 4, 2, 1,
    0.5, 0.1
];


var LatLngBoundsProto = L.LatLngBounds.prototype;

L.LatLngBounds = function(corner1, corner2) {
    // console.log(corner1, corner2);
    if (!corner1) { return; }
    
	var latlngs = corner2 ? [corner1, corner2] : corner1;
    this._setCorners(latlngs);
    
	for (var i = 0, len = latlngs.length; i < len; i++) {
        this.extend(latlngs[i]);
	}
}

L.LatLngBounds.prototype = {...LatLngBoundsProto};

L.LatLngBounds.prototype._setCorners = function(latlngs) {
    // console.log('latlngs', latlngs);
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
    // console.log(latLngBounds, [latLngBounds.getSouthWest(),
    //     latLngBounds.getNorthWest(),
    //     latLngBounds.getNorthEast(),
    //     latLngBounds.getSouthEast()]);

    // const point1 = latLngBounds._corner1;

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

    // console.log(point1, point2, point3, point4);
    
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

    // const [point1, _, point3, __] = this._getPoints();

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

    // Reset move marker position to the center
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

// L.Edit.PolyVerticesEdit.prototype._defaultShape = function () {
//     if (!L.Polyline.isFlat) {
//         return this._latlngs;
//     }
//     return L.Polyline.isFlat(this._latlngs) ? this._latlngs : this._latlngs[0];
// }

// L.Edit.PolyVerticesEdit.prototype._onMarkerDrag = function (event) {
//     // console.log(this._poly);
//     var marker = event.target;
//     var poly = this._poly;

//     var oldOrigLatLng = L.LatLngUtil.cloneLatLng(marker._origLatLng);
//     L.extend(marker._origLatLng, marker._latlng);


//     if (poly.options.poly) {
//         var tooltip = poly._map._editTooltip; // Access the tooltip

//         // If we don't allow intersections and the polygon intersects
//         if (!poly.options.poly.allowIntersection && poly.intersects()) {
//             L.extend(marker._origLatLng, oldOrigLatLng);
//             marker.setLatLng(oldOrigLatLng);
//             var originalColor = poly.options.color;
//             poly.setStyle({color: this.options.drawError.color});
//             if (tooltip) {
//                 tooltip.updateContent({
//                     text: L.drawLocal.draw.handlers.polyline.error
//                 });
//             }

//             // Reset everything back to normal after a second
//             setTimeout(function () {
//                 poly.setStyle({color: originalColor});
//                 if (tooltip) {
//                     tooltip.updateContent({
//                         text: L.drawLocal.edit.handlers.edit.tooltip.text,
//                         subtext: L.drawLocal.edit.handlers.edit.tooltip.subtext
//                     });
//                 }
//             }, 1000);
//         }
//     }

//     // console.log(marker._middleLeft, marker._middleRight);

//     if (marker._middleLeft) {
//         marker._middleLeft.setLatLng(this._getMiddleLatLng(marker._prev, marker));
//     }
//     if (marker._middleRight) {
//         marker._middleRight.setLatLng(this._getMiddleLatLng(marker, marker._next));
//     }

//     //refresh the bounds when draging
//     this._poly._bounds._southWest = L.latLng(Infinity, Infinity);
//     this._poly._bounds._northEast = L.latLng(-Infinity, -Infinity);
//     var latlngs = this._poly.getLatLngs();
//     this._poly._convertLatLngs(latlngs, true);
//     this._poly.redraw();
//     this._poly.fire('editdrag');
// }

// L.MarkerDrag.prototype._onDrag = function (e) {
//     console.log(e);
//     var marker = this._marker,
//         shadow = marker._shadow,
//         iconPos = DomUtil.getPosition(marker._icon),
//         latlng = marker._map.layerPointToLatLng(iconPos);

//     // update shadow position
//     if (shadow) {
//         DomUtil.setPosition(shadow, iconPos);
//     }

//     marker._latlng = latlng;
//     e.latlng = latlng;
//     e.oldLatLng = this._oldLatLng;

//     // @event drag: Event
//     // Fired repeatedly while the user drags the marker.
//     marker
//         .fire('move', e)
//         .fire('drag', e);
// };

L.Edit.PolyVerticesEdit.prototype._createMiddleMarker = function (marker1, marker2) {

    // console.log();
    var latlng = this._getMiddleLatLng(marker1, marker2),
        marker = this._createMarker(latlng),
        onClick,
        onDragStart,
        onDragEnd;

    // marker.setOpacity(0.6);

    marker1._middleRight = marker2._middleLeft = marker;

    onDragStart = function () {
        // marker.off('touchmove', onDragStart, this);
        // var i = marker2._index;

        // marker._index = i;

        // marker
        //     .off('click', onClick, this)
        //     .on('click', this._onMarkerClick, this);

        // latlng.lat = marker.getLatLng().lat;
        // latlng.lng = marker.getLatLng().lng;
        // this._spliceLatLngs(i, 0, latlng);
        // this._markers.splice(i, 0, marker);

        // marker.setOpacity(1);

        // this._updateIndexes(i, 1);
        // marker2._index++;
        // // this._updatePrevNext(marker1, marker);
        // // this._updatePrevNext(marker, marker2);

        // this._poly.fire('editstart');
    };

    const onDrag = function(event) {
        // console.log(event);
        // console.log(this);

        console.log(marker._oldLatLng);
        const oldPoint = this._map.latLngToLayerPoint(marker._oldLatLng ? marker._oldLatLng : event.oldLatLng);
        const point = this._map.latLngToLayerPoint(event.latlng);
        // console.log(oldPoint);

        const offsetX = point.x - oldPoint.x;
        const offsetY = point.y - oldPoint.y;

        const offsetPoint = new L.Point(offsetX, offsetY);
        // console.log(offsetPoint);

        const coords = this._latlngs;

        // const points = coords.map(coord => {
        //     return this._map.latLngToLayerPoint(coord);
        // });

        // console.log(points);

        const newCoords = coords.map(coord => {
            return this._map.layerPointToLatLng(this._map.latLngToLayerPoint(coord).add(offsetPoint));
        });

        this._latlngs = newCoords;
        this._poly.setLatLngs(newCoords);
        this._markers.forEach((m, index) => m.setLatLng(newCoords[index]));
        marker._oldLatLng = event.latlng;
        // this.updateMarkers();
    }

    onDragEnd = function () {
        this.updateMarkers();
        // marker.off('dragstart', onDragStart, this);
        // marker.off('dragend', onDragEnd, this);
        // marker.off('touchmove', onDragStart, this);

        // this._createMiddleMarker(marker1, marker);
        // this._createMiddleMarker(marker, marker2);
    };

    // onClick = function () {
    //     onDragStart.call(this);
    //     onDragEnd.call(this);
    //     this._fireEdit();
    // };
    console.log('adding listeners');
    marker
        // .on('click', onClick, this)
        .on('dragstart', onDragStart, this)
        .on('drag', onDrag, this)
        .on('dragend', onDragEnd, this)
        .on('touchmove', onDragStart, this);


    
    this._markerGroup.addLayer(marker);
}

L.Edit.PolyVerticesEdit.prototype._defaultShape = function() {
    return L.Polyline.isFlat ? L.Polyline.isFlat(this._latlngs) ? this._latlngs : this._latlngs[0] : this._latlngs;
}

let abc = false;

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

        // if () {
            // abc = true;
        // }
    }
}

const projBounds = L.bounds([-624.8002276396273, -524.3640295814912], [565.910762176858, 283.0062602881261]);




const earthDist = L.CRS.Earth.distance;
L.CRS.Earth.distance = () => {};

const rusImage = './RUS.svg';
const csrRusland = new L.Proj.CRS(
    'EPSG:2400',
    '+proj=lcc +lat_1=40 +lat_2=70 +lat_0=55 +lon_0=92 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs',
    {
        resolutions: crsResolutions,
        bounds: projBounds
    }
);

L.CRS.Earth.distance = earthDist;

// csrRusland.distance = undefined;
// console.log('crs', csrRusland);
csrRusland.distance = (lat, lng) => {return L.CRS.Earth.distance(lat, lng)} 
// console.log('crs', csrRusland.distance, L.CRS.Earth.distance);


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
    // bounds: projBounds
});

// const featureGroup = L.featureGroup();
// map.addLayer(featureGroup);

// const drawControl = L.Control.Draw({
//     edit: {
//         featureGroup
//     }
// });
// map.addControl(drawControl);

// _reset: function () {
//     // defined in child classes
//     this._project();
//     this._update();
// }




// const rusBounds = L.bounds(
//     map.project(rusParams.bounds.corner),
//     map.project(rusParams.bounds.oppositeCorner)
// );
const rusBounds = L.bounds(
    csrRusland.project(unprojbounds.getSouthEast()),
    csrRusland.project(unprojbounds.getNorthWest())
);

// const imgLayer = L.imageOverlay(rusParams.image, unprojbounds).addTo(map);
const test = svgOverlay(rusParams.image, rusBounds).addTo(map);

// const imageLayer = L.Proj.imageOverlay(rusParams.image, rusBounds, { interactive: true }).addTo(map);
// map.fitBounds(projBounds);

map.setView(map.unproject(projBounds.getCenter()), 1);
var result = await fetch('./RUS.svg');
test.setInnerHtml(await result.text());

// const unProjCorner = rusParams.bounds.corner;
// const projCorner = map.project(rusParams.bounds.corner);
// const unProjOppositeCorner = rusParams.bounds.oppositeCorner;
// const projOppositeCorner = map.project(rusParams.bounds.oppositeCorner);
// console.log("-------------------");
// console.log("corner", unProjCorner);
// console.log("opposite", unProjOppositeCorner);
// console.log("projected corner", projCorner);
// console.log("projected opposite", projOppositeCorner);
// console.log("reverse corner", map.unproject(projCorner));
// console.log("reverse opposite", map.unproject(projOppositeCorner));
// console.log("-------------------");

map.on('load', () => {
    map.setView(projBounds.getCenter());
});

map.on('zoom', () => {
    // console.log({
    //     zoom: map.getZoom(),
    //     bounds: map.getBounds(),
    //     center: map.getBounds().getCenter()
    // });
});

// imageLayer.on('click', (event) => {
//     console.log('image: ', `${event.latlng.lat},${event.latlng.lng}`);
//     // navigator.clipboard.writeText(`${event.latlng.lat},${event.latlng.lng}`);
// });

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
    // featureGroup.addLayer(e.layer);
    const {layer} = e;
    layer.editing.enable();

    map.addLayer(layer);
 });

 const cb = document.getElementById("checkbox");
 cb.addEventListener('change', (e) => {
    //  console.log(test._image);
    // console.log(e.target.checked);
    document.getElementById('L1').style.display = e.target.checked ? 'unset' : 'none';
 });