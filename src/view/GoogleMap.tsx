import { Wrapper, Status } from "@googlemaps/react-wrapper";
import { memo, useEffect, useState } from "react";

const API_KEY = 'AIzaSyCrF84lWLiQ6A2oo9oEMDORmx0Atdzra4U';

export type GoogleMapProps = {
  addresses?: string[];
}

export const GoogleMap = memo(function GoogleMap(props: GoogleMapProps) {
  return (
    <Wrapper
      apiKey={API_KEY}
      render={(status) => {
        switch (status) {
          case Status.LOADING:
            return <div>loading map...</div>;
          case Status.FAILURE:
            return <div>couldn't load map!</div>;
          case Status.SUCCESS:
            return <GoogleMapInner {...props} />;
        }
      }}
    />
  )
})

const GoogleMapInner = memo(function GoogleMapInner(props: GoogleMapProps) {
  const { addresses } = props;

  const [div, setDiv] = useState<HTMLDivElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // set up map from div
  useEffect(() => {
    if (!div) { return; }
    setMap(new google.maps.Map(div, {
      // center: { lat: -34.397, lng: 150.644 },
      // zoom: 8,
      disableDefaultUI: true,
    }));
  }, [div]);

  // manage address markers
  useEffect(() => {
    if (!map) { return; }
    if (!addresses) { return; }

    let invalidated = false;

    const markers: google.maps.Marker[] = [];
    addresses.forEach(address => {
      geocodeCached(address, (results, status) => {
        if (invalidated) { return; }
        if (status === google.maps.GeocoderStatus.OK) {
          markers.push(new google.maps.Marker({
            position: results![0].geometry.location,
            map: map
          }));
          const bounds = new google.maps.LatLngBounds();
          markers.forEach(marker => bounds.extend(marker.getPosition()!));
          if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
            const extendPoint1 = new google.maps.LatLng(bounds.getNorthEast().lat() + 0.01, bounds.getNorthEast().lng() + 0.01);
            const extendPoint2 = new google.maps.LatLng(bounds.getNorthEast().lat() - 0.01, bounds.getNorthEast().lng() - 0.01);
            bounds.extend(extendPoint1);
            bounds.extend(extendPoint2);
         }
          map.fitBounds(bounds);
        }
      });
    });

    return () => {
      invalidated = true;
      markers.forEach(marker => marker.setMap(null));
    };
  }, [map, addresses]);

  return <div ref={setDiv} style={{width: 300, height: 300}} />;
});

// TODO: this will just fill up; should we use TTL?
const _cache: {[address: string]: google.maps.GeocoderResult[]} = {};
export function geocodeCached(address: string, callback: (result: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => void): void {
  if (_cache[address]) {
    callback(_cache[address], google.maps.GeocoderStatus.OK);
  } else {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      _cache[address] = results!;
      callback(results, status);
    });
  }
}
