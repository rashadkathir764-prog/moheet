import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Check } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by Vite's asset bundling
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerIcon2xPng from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';

// Apply once at module load — safe, idempotent
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIconPng,
  iconRetinaUrl: markerIcon2xPng,
  shadowUrl: markerShadowPng,
});

// ── Tile provider configuration ──────────────────────────────────────────────
// CartoCDN is primary: faster CDN, more permissive CORS, no subdomains needed
// OpenStreetMap is fallback in case CartoCDN tiles fail
const TILE_PROVIDERS = {
  carto: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 20,
  },
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: '',
    maxZoom: 19,
  },
} as const;

const IS_DEV = import.meta.env.DEV;
const log = (...args: unknown[]) => IS_DEV && console.log('[MapModal]', ...args);
const warn = (...args: unknown[]) => IS_DEV && console.warn('[MapModal]', ...args);

// ── Helper: force LTR on every pane Leaflet creates ──────────────────────────
// `body { direction: rtl }` propagates via CSS inheritance and mis-positions tiles.
// We must override each pane element individually (CSS !important handles the rest
// via StoreLayout.css, but this JS pass runs immediately after map creation).
const forceLtrOnAllPanes = (map: L.Map) => {
  const paneNames = [
    'mapPane', 'tilePane', 'shadowPane', 'overlayPane',
    'markerPane', 'tooltipPane', 'popupPane',
  ];
  paneNames.forEach((name) => {
    const pane = map.getPane(name);
    if (pane) pane.style.setProperty('direction', 'ltr', 'important');
  });
  // Also set on the container itself
  const container = map.getContainer();
  container.style.setProperty('direction', 'ltr', 'important');
};

interface MapModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLocation: (lat: number, lng: number, address: string) => void;
  initialLat?: number;
  initialLng?: number;
}

const DEFAULT_LAT = 15.3694;
const DEFAULT_LNG = 44.191;

export const MapModal: React.FC<MapModalProps> = ({
  isOpen,
  onClose,
  onSaveLocation,
  initialLat,
  initialLng,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tileErrorCountRef = useRef(0);
  const fallbackAppliedRef = useRef(false);

  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number }>({
    lat: initialLat || DEFAULT_LAT,
    lng: initialLng || DEFAULT_LNG,
  });
  const [formattedAddress, setFormattedAddress] = useState('');
  const [reverseGeocoding, setReverseGeocoding] = useState(false);
  const [mapError, setMapError] = useState(false);

  // ── Reverse geocode via Nominatim ─────────────────────────────────────────
  const reverseGeocode = async (lat: number, lng: number) => {
    setReverseGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'ar' } }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setFormattedAddress(data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } catch (e) {
      warn('Nominatim error:', e);
      setFormattedAddress(`تعذر استخراج العنوان. تم حفظ الإحداثيات: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setReverseGeocoding(false);
    }
  };

  // ── Destroy map cleanly ───────────────────────────────────────────────────
  const destroyMap = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
      tileLayerRef.current = null;
    }
    tileErrorCountRef.current = 0;
    fallbackAppliedRef.current = false;
  };

  // ── Add a tile layer (primary or fallback) ────────────────────────────────
  const addTileLayer = (map: L.Map, provider: keyof typeof TILE_PROVIDERS) => {
    const cfg = TILE_PROVIDERS[provider];
    log(`Adding tile layer: ${provider}`, cfg.url);

    const layer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
      subdomains: cfg.subdomains || 'abc',
    });

    layer.on('tileload', (e) => {
      log(`tile loaded [${provider}]`, (e as L.TileEvent).coords);
    });

    layer.on('tileerror', (e) => {
      warn(`tile error [${provider}]`, (e as L.TileErrorEvent).coords, e);
      tileErrorCountRef.current += 1;

      // After 3 errors on CartoCDN → switch to OSM fallback
      if (provider === 'carto' && tileErrorCountRef.current >= 3 && !fallbackAppliedRef.current) {
        fallbackAppliedRef.current = true;
        warn('Switching to OSM fallback');
        layer.remove();
        tileErrorCountRef.current = 0;
        addTileLayer(map, 'osm');
      }
    });

    layer.addTo(map);
    tileLayerRef.current = layer;
    return layer;
  };

  // ── Initialize Leaflet map ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      destroyMap();
      return;
    }

    const centerLat = initialLat || DEFAULT_LAT;
    const centerLng = initialLng || DEFAULT_LNG;

    // Delay past framer-motion transition (200ms) + one render tick
    timerRef.current = setTimeout(() => {
      setSelectedCoords({ lat: centerLat, lng: centerLng });

      const container = mapContainerRef.current;
      if (!container || mapRef.current) return;

      log('Initializing map at', centerLat, centerLng);
      log('Container size:', container.offsetWidth, 'x', container.offsetHeight);

      try {
        const map = L.map(container, {
          center: [centerLat, centerLng],
          zoom: 15,
          zoomControl: true,
        });

        // ── Critical: override RTL inheritance on every pane immediately ──
        forceLtrOnAllPanes(map);

        // Primary tile layer: CartoCDN Voyager (colorful street map)
        addTileLayer(map, 'carto');

        const marker = L.marker([centerLat, centerLng], { draggable: true }).addTo(map);

        const handleNewPosition = (lat: number, lng: number) => {
          setSelectedCoords({ lat, lng });
          reverseGeocode(lat, lng);
        };

        map.on('click', (e: L.LeafletMouseEvent) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          handleNewPosition(lat, lng);
        });

        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          handleNewPosition(pos.lat, pos.lng);
        });

        mapRef.current = map;
        markerRef.current = marker;

        // Force size recalculation — Leaflet may have read 0 before layout settled
        map.invalidateSize();
        setTimeout(() => {
          map.invalidateSize();
          // Re-apply LTR after any internal DOM mutations by Leaflet
          forceLtrOnAllPanes(map);
          log('invalidateSize done, container:', container.offsetWidth, 'x', container.offsetHeight);
        }, 200);

        handleNewPosition(centerLat, centerLng);
        setMapError(false);
      } catch (err) {
        warn('Leaflet init error:', err);
        setMapError(true);
      }
    }, 350);

    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialLat, initialLng]);

  // Cleanup on unmount
  useEffect(() => {
    return () => destroyMap();
  }, []);

  const handleSave = () => {
    onSaveLocation(selectedCoords.lat, selectedCoords.lng, formattedAddress);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="location-modal-backdrop" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="location-modal-card"
          style={{
            maxWidth: '620px',
            height: '560px',
            display: 'flex',
            flexDirection: 'column',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="location-modal-header" style={{ flexShrink: 0 }}>
            <h3>تحديد الموقع بدقة على الخريطة</h3>
            <button className="location-modal-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* ── Body ── */}
          <div
            className="location-modal-body"
            style={{
              padding: 0,
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            {mapError ? (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: 1,
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <MapPin size={48} style={{ color: 'var(--color-error)', marginBottom: '16px' }} />
                <h4 style={{ color: 'var(--color-text-primary)', marginBottom: '8px', fontSize: '18px' }}>
                  تعذر تحميل الخريطة
                </h4>
                <p style={{ fontSize: '14px' }}>
                  تعذر تحميل الخريطة، يمكنك إدخال العنوان يدوياً في الخانات المتاحة.
                </p>
                <button
                  onClick={onClose}
                  style={{
                    marginTop: '20px',
                    padding: '10px 24px',
                    background: 'var(--color-primary-dark)',
                    color: '#FFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  الرجوع للإدخال اليدوي
                </button>
              </div>
            ) : (
              <>
                {/* Hint bar */}
                <div
                  style={{
                    padding: '8px 16px',
                    background: 'var(--color-surface-2)',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    textAlign: 'center',
                    flexShrink: 0,
                    direction: 'rtl',
                  }}
                >
                  انقر على الخريطة أو اسحب العلامة لتحديد موقعك بدقة
                </div>

                {/*
                  Map container:
                  - Explicit pixel height so Leaflet reads a non-zero size on init
                  - direction: ltr inline (belt-and-suspenders alongside the CSS rules)
                  - position: relative required by Leaflet
                */}
                <div
                  ref={mapContainerRef}
                  style={{
                    width: '100%',
                    height: '365px',
                    flexShrink: 0,
                    direction: 'ltr',
                    position: 'relative',
                    zIndex: 0,
                    background: '#e8e8e8',
                  }}
                />

                {/* Info & Save */}
                <div
                  style={{
                    padding: '14px 20px',
                    background: 'var(--color-surface-2)',
                    borderTop: '1px solid var(--color-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <MapPin
                      size={18}
                      style={{ color: 'var(--color-accent)', flexShrink: 0, marginTop: '2px' }}
                    />
                    <div
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-text-primary)',
                        flex: 1,
                        minHeight: '34px',
                        direction: 'rtl',
                      }}
                    >
                      {reverseGeocoding ? (
                        <span style={{ color: 'var(--color-text-secondary)' }}>
                          جاري استخراج العنوان...
                        </span>
                      ) : (
                        formattedAddress || 'انقر على الخريطة لتحديد موقعك بدقة'
                      )}
                    </div>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '11px',
                      color: 'var(--color-text-secondary)',
                      lineHeight: 1.5,
                      direction: 'rtl',
                    }}
                  >
                    قد تُستخدم خدمة خارجية لتحويل الإحداثيات إلى عنوان.
                  </p>

                  <div style={{ display: 'flex', gap: '10px', direction: 'rtl' }}>
                    <button
                      type="button"
                      onClick={onClose}
                      className="address-form-btn-cancel"
                      style={{ flex: 1, padding: '11px' }}
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      className="address-form-btn-submit"
                      style={{
                        flex: 2,
                        padding: '11px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                      }}
                      disabled={reverseGeocoding}
                    >
                      <Check size={18} />
                      <span>تأكيد هذا الموقع</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
