import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './mapView.css';
import { statusColors } from './mapViewData';

const MapView = ({ shipments = [] }) => {
  const safeShipments = shipments || [];
  const normalizeStatus = (status) => String(status || 'on-time').toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="map-container">
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        {/* Dark map tiles from CartoDB */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
        />

        {/* Shipment routes & markers */}
        {safeShipments.map((shipment) => {
          const normalizedStatus = normalizeStatus(shipment.status);
          const color = statusColors[normalizedStatus] || '#3b82f6';
          const route = shipment.route || [];

          return (
            <React.Fragment key={shipment.id}>
              {/* Route line */}
              {route.length >= 2 && (
                <Polyline
                  positions={route.map(p => [p.lat, p.lng])}
                  pathOptions={{
                    color,
                    weight: 2,
                    opacity: 0.6,
                    dashArray: normalizedStatus === 'delayed' ? '5, 8' : null,
                  }}
                />
              )}

              {/* Waypoint markers */}
              {route.map((point, idx) => (
                <CircleMarker
                  key={`${shipment.id}-${idx}`}
                  center={[point.lat, point.lng]}
                  radius={idx === 0 || idx === route.length - 1 ? 8 : 5}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: idx === 0 || idx === route.length - 1 ? 0.9 : 0.6,
                    color: 'white',
                    weight: 1.5,
                  }}
                >
                  <Tooltip permanent={false} direction="top">
                    <span style={{ fontSize: '12px' }}>
                      <strong>{point.name}</strong><br />
                      {idx === 0 ? '🟢 Origin' : idx === route.length - 1 ? '🏁 Destination' : '⚓ Transit'}
                    </span>
                  </Tooltip>
                  <Popup>
                    <div style={{ minWidth: '160px' }}>
                      <strong style={{ fontSize: '13px' }}>{shipment.trackingNumber}</strong>
                      <br />
                      <span style={{ color: color, fontSize: '11px', fontWeight: 600 }}>
                        {normalizedStatus.toUpperCase()}
                      </span>
                      <br />
                      <span style={{ fontSize: '11px' }}>
                        {shipment.origin} → {shipment.destination}
                      </span>
                      <br />
                      <span style={{ fontSize: '11px' }}>Risk: {shipment.riskLevel}%</span>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </React.Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default MapView;
