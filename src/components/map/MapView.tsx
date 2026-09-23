import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import type { Map as MLMap, MapMouseEvent, MapGeoJSONFeature } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJsonGeometry } from "@/lib/nextbillion/types";

export type MapMarker = {
  id: string;
  lat: number;
  lng: number;
  color: string;
  kind: "site" | "competitor" | "poi";
  title: string;
  subtitle?: string;
  detail?: string;
};

export type MapPolygon = {
  id: string;
  geometry: GeoJsonGeometry;
  color: string;
  opacity: number;
};

type Props = {
  center: { lat: number; lng: number } | null;
  markers: MapMarker[];
  polygons: MapPolygon[];
  fitKey?: string;
  pickMode?: boolean;
  onPick?: (at: { lat: number; lng: number }) => void;
};

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      maxzoom: 19,
      attribution: "© OpenStreetMap contributors · routing & places: NextBillion.ai",
    },
  },
  layers: [
    { id: "canvas", type: "background", paint: { "background-color": "#0d1014" } },
    {
      id: "basemap",
      type: "raster",
      source: "basemap",
      paint: {
        "raster-opacity": 0.34,
        "raster-saturation": -0.85,
        "raster-contrast": -0.15,
        "raster-brightness-max": 0.6,
      },
    },
  ],
};

export default function MapView({ center, markers, polygons, fitKey, pickMode, onPick }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);
  const pickRef = useRef<{ pickMode: boolean; onPick?: (at: { lat: number; lng: number }) => void }>({
    pickMode: false,
  });
  pickRef.current = { pickMode: !!pickMode, onPick };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [center?.lng ?? 88.3639, center?.lat ?? 22.5726],
      zoom: 12,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(new maplibregl.ScaleControl({ unit: "metric" }), "bottom-left");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource("polygons", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "polygon-fill",
        type: "fill",
        source: "polygons",
        paint: { "fill-color": ["get", "color"], "fill-opacity": ["get", "opacity"] },
      });
      map.addLayer({
        id: "polygon-line",
        type: "line",
        source: "polygons",
        paint: { "line-color": ["get", "color"], "line-width": 1.2, "line-opacity": 0.9 },
      });

      map.addSource("markers", { type: "geojson", data: emptyFC() });
      map.addLayer({
        id: "marker-halo",
        type: "circle",
        source: "markers",
        filter: ["==", ["get", "kind"], "site"],
        paint: {
          "circle-radius": 13,
          "circle-color": ["get", "color"],
          "circle-opacity": 0.2,
        },
      });
      map.addLayer({
        id: "marker-circle",
        type: "circle",
        source: "markers",
        paint: {
          "circle-radius": ["case", ["==", ["get", "kind"], "site"], 7, ["==", ["get", "kind"], "competitor"], 5.5, 4],
          "circle-color": ["get", "color"],
          "circle-stroke-width": ["case", ["==", ["get", "kind"], "site"], 2, 1],
          "circle-stroke-color": "#11151c",
        },
      });

      map.on("click", "marker-circle", (e: MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
        const f = e.features?.[0];
        if (!f) return;
        const p = f.properties as Record<string, string>;
        const coords = (f.geometry as { coordinates: [number, number] }).coordinates;
        new maplibregl.Popup({ offset: 12, closeButton: true })
          .setLngLat(coords)
          .setHTML(
            `<div style="min-width:180px">
               <div style="font-size:12px;font-weight:600;margin-bottom:2px">${escapeHtml(p["title"] ?? "")}</div>
               ${p["subtitle"] ? `<div style="font-size:11px;opacity:.7;margin-bottom:6px">${escapeHtml(p["subtitle"])}</div>` : ""}
               ${p["detail"] ? `<div style="font-size:11px;font-family:ui-monospace,monospace;opacity:.9">${escapeHtml(p["detail"])}</div>` : ""}
             </div>`,
          )
          .addTo(map);
      });
      map.on("mouseenter", "marker-circle", () => (map.getCanvas().style.cursor = "pointer"));
      map.on("mouseleave", "marker-circle", () => (map.getCanvas().style.cursor = ""));

      readyRef.current = true;
      sync(map, markers, polygons);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    sync(map, markers, polygons);
  }, [markers, polygons]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !center) return;
    map.easeTo({ center: [center.lng, center.lat], zoom: Math.max(map.getZoom(), 12.5), duration: 700 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  return <div ref={containerRef} className="h-full w-full" />;
}

function emptyFC() {
  return { type: "FeatureCollection", features: [] } as never;
}

function sync(map: MLMap, markers: MapMarker[], polygons: MapPolygon[]) {
  const mSrc = map.getSource("markers") as maplibregl.GeoJSONSource | undefined;
  const pSrc = map.getSource("polygons") as maplibregl.GeoJSONSource | undefined;
  mSrc?.setData({
    type: "FeatureCollection",
    features: markers.map((m) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [m.lng, m.lat] },
      properties: {
        kind: m.kind,
        color: m.color,
        title: m.title,
        subtitle: m.subtitle ?? "",
        detail: m.detail ?? "",
      },
    })),
  } as never);
  pSrc?.setData({
    type: "FeatureCollection",
    features: polygons.map((p) => ({
      type: "Feature",
      geometry: p.geometry,
      properties: { color: p.color, opacity: p.opacity },
    })),
  } as never);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}
