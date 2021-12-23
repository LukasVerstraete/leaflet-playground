#Projection problem
We developed a web application using react and leaflet to show SVG images in a leaflet container. This application should be able to do the following thing.

- Show the SVG map
- Draw in the leaflet container
- Display text in the leaflet container
- Switch to Google Maps where the locations should match very closely
- Toggle layers of the SVG according to a legend provided
- Take into account the projection of the map

Most of these thing would be fine on their own but combining them causes a list of problemd. Mainly concerning the drawings.

When not using projection we get the following results:
- Drawings work fine, as you would expect.
- Text also gets typed and displays fine
- The SVG displays fine
- Google Maps is not accurate enough on maps which require projection to be precise

As soon as we use the projection provided though, the following happens:
- Depending on how heavily projected the map is, drawings would morph.
- Text would also morph
- Google maps would very accurately (within a few km) display when switching from the SVG
- The SVG map would jitter when zooming. It would drag the image to a side only to correct itself afterwards

So far we have managed to solve a couple of issues, namely the following:
- The zoom issue when projecting the map (only as a POC so far)
- The text morph. Although the text still scales according to the projection and it would still flip at certain spots

What we cannot figure out how to fix however, is the drawings. When projecting a map and then drawing, the drawings use latlng for its points and distance for its radius when drawing a circle. We use Leaflet.Draw to make these drawings but there is no support for drawings in a projected leaflet container.

A possible solution we saw, is not using any projection in the leaflet container, just providing a CRS and projecting the current location of the leaflet center to get a location usable for Google Maps. Since we have no GIS experts, however, this is a daunting task. We agree that in theory this would be possible, but we do not know how to go about this.